import type { DB } from './db.js';

export interface AppContext {
  db: DB;
  /** Returns today's date as YYYY-MM-DD. Injected so tests can fix the date. */
  today: () => string;
  warningDays: number;
}
