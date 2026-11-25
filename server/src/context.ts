import type { DB } from './db.js';

export interface AppContext {
  db: DB;
  today: () => string;
  warningDays: number;
}
