import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { requireAuth, requireRole } from './auth.js';
import { config } from './config.js';
import type { AppContext } from './context.js';
import { todayISO } from './dates.js';
import type { DB } from './db.js';
import { JSON_BODY_LIMIT } from './limits.js';
import { errorHandler, HttpError } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { productRoutes } from './routes/products.js';
import { reportRoutes } from './routes/reports.js';
import { userRoutes } from './routes/users.js';

interface AppOptions {
  db: DB;
  today?: () => string;
  warningDays?: number;
  clientDir?: string;
}

export function createApp({ db, today = () => todayISO(), warningDays = config.expiryWarningDays, clientDir }: AppOptions) {
  const ctx: AppContext = { db, today, warningDays };
  const app = express();
  const requireSession = requireAuth(db);

  app.disable('x-powered-by');
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });

  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(ctx));
  app.use('/api/products', requireSession, productRoutes(ctx));
  app.use('/api/reports', requireSession, requireRole('manager', 'admin'), reportRoutes(ctx));
  app.use('/api/users', requireSession, requireRole('admin'), userRoutes(ctx));
  app.use('/api', () => {
    throw new HttpError(404, 'Not found.');
  });

  if (clientDir && fs.existsSync(path.join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
