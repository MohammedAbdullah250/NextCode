import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = openDatabase(config.databasePath);
const app = createApp({ db, clientDir: path.resolve(here, '../../client/dist') });

app.listen(config.port, () => {
  console.log(`FreshTrack API running on http://localhost:${config.port}`);
});
