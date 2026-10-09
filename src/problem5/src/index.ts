import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT ?? 4000);
const dbPath =
  process.env.DB_PATH ?? fileURLToPath(new URL('./data/swaps.db', import.meta.url));

const db = openDb(dbPath);
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`swap server listening on http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
