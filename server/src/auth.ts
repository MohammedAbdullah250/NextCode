import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import type { DB } from './db.js';
import { HttpError } from './errors.js';

export const ROLES = ['employee', 'manager', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const COOKIE = 'freshtrack_session';
const MS_PER_HOUR = 3_600_000;

export function setSessionCookie(res: Response, user: AuthUser): void {
  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: config.sessionHours * MS_PER_HOUR,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: config.isProduction });
}

export function requireAuth(db: DB): RequestHandler {
  const findUser = db.prepare<[number], AuthUser>(
    'SELECT id, username, role FROM users WHERE id = ? AND active = 1',
  );
  return (req, _res, next) => {
    const token: unknown = req.cookies?.[COOKIE];
    if (typeof token !== 'string') throw new HttpError(401, 'Please log in to continue.');
    let userId: number;
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      userId = Number(payload.sub);
    } catch {
      throw new HttpError(401, 'Your session has expired. Please log in again.');
    }
    const user = findUser.get(userId);
    if (!user) throw new HttpError(401, 'Your account is not active. Please log in again.');
    req.user = user;
    next();
  };
}

export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do this.');
    }
    next();
  };
}
