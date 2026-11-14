import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../auth.js';
import type { AppContext } from '../context.js';
import { HttpError } from '../errors.js';
import { credentialsSchema } from './auth.js';

const role = z.enum(ROLES, { error: 'Choose a role.' });
const createSchema = credentialsSchema.extend({ role });
const updateSchema = z.object({
  role: role.optional(),
  active: z.boolean().optional(),
  password: credentialsSchema.shape.password.optional(),
});
const idSchema = z.coerce.number().int().positive();

interface UserRow {
  id: number;
  username: string;
  role: (typeof ROLES)[number];
  active: number;
  createdAt: string;
}

// US-08: administrators manage accounts and their roles.
export function userRoutes({ db }: AppContext): Router {
  const router = Router();
  const list = db.prepare<[], UserRow>(
    'SELECT id, username, role, active, created_at AS createdAt FROM users ORDER BY username',
  );
  const byId = db.prepare<[number], UserRow>(
    'SELECT id, username, role, active, created_at AS createdAt FROM users WHERE id = ?',
  );
  const byName = db.prepare<[string], { id: number }>('SELECT id FROM users WHERE username = ?');
  const activeAdmins = db.prepare<[], { n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1",
  );

  const toUser = (r: UserRow) => ({ ...r, active: r.active === 1 });

  router.get('/', (_req, res) => {
    res.json({ users: list.all().map(toUser) });
  });

  router.post('/', (req, res) => {
    const { username, password, role } = createSchema.parse(req.body);
    if (byName.get(username)) throw new HttpError(409, 'That username is already taken.');
    const result = db
      .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, bcrypt.hashSync(password, 10), role);
    res.status(201).json({ user: toUser(byId.get(Number(result.lastInsertRowid))!) });
  });

  router.patch('/:id', (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = updateSchema.parse(req.body);
    const target = byId.get(id);
    if (!target) throw new HttpError(404, 'User not found.');

    const removesAdmin =
      target.role === 'admin' &&
      target.active === 1 &&
      ((input.role && input.role !== 'admin') || input.active === false);
    if (removesAdmin && id === req.user!.id) {
      throw new HttpError(400, 'You cannot remove your own administrator access.');
    }
    if (removesAdmin && activeAdmins.get()!.n <= 1) {
      throw new HttpError(400, 'FreshTrack needs at least one active administrator.');
    }

    if (input.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(input.role, id);
    if (input.active !== undefined) {
      db.prepare('UPDATE users SET active = ? WHERE id = ?').run(input.active ? 1 : 0, id);
    }
    if (input.password) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(input.password, 10), id);
    }
    res.json({ user: toUser(byId.get(id)!) });
  });

  return router;
}
