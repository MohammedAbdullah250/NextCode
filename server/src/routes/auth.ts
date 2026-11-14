import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { clearSessionCookie, requireAuth, setSessionCookie, type AuthUser } from '../auth.js';
import type { AppContext } from '../context.js';
import { HttpError } from '../errors.js';

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(40, 'Username must be at most 40 characters.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores only.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(200, 'Password is too long.'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.'),
  password: z.string().min(1, 'Enter your password.'),
});

export function authRoutes({ db }: AppContext): Router {
  const router = Router();
  const countUsers = db.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM users');
  const findByUsername = db.prepare<
    [string],
    AuthUser & { password_hash: string; active: number }
  >('SELECT id, username, role, password_hash, active FROM users WHERE username = ?');
  const insertAdmin = db.prepare<[string, string]>(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
  );

  // The first person to open a fresh install creates the administrator account.
  router.get('/setup-status', (_req, res) => {
    res.json({ needsSetup: countUsers.get()!.n === 0 });
  });

  router.post('/setup', (req, res) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = db.transaction(() => {
      if (countUsers.get()!.n > 0) throw new HttpError(409, 'FreshTrack has already been set up.');
      const result = insertAdmin.run(username, bcrypt.hashSync(password, 10));
      return { id: Number(result.lastInsertRowid), username, role: 'admin' as const };
    })();
    setSessionCookie(res, user);
    res.status(201).json({ user });
  });

  router.post('/login', (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const row = findByUsername.get(username);
    // Same message for unknown user and wrong password so usernames can't be guessed.
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      throw new HttpError(401, 'Incorrect username or password.');
    }
    if (!row.active) throw new HttpError(403, 'This account has been deactivated. Contact your administrator.');
    const user: AuthUser = { id: row.id, username: row.username, role: row.role };
    setSessionCookie(res, user);
    res.json({ user });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
