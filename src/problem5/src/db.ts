import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

/**
 * Opens (and initialises) the SQLite database.
 * Uses Node's built-in `node:sqlite` driver: zero native build steps,
 * standard SQLite file format.
 */
export function openDb(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS swaps (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      from_token   TEXT    NOT NULL,
      to_token     TEXT    NOT NULL,
      amount_from  REAL    NOT NULL CHECK (amount_from > 0),
      amount_to    REAL    CHECK (amount_to IS NULL OR amount_to >= 0),
      rate         REAL    CHECK (rate IS NULL OR rate > 0),
      created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_swaps_from_to ON swaps (from_token, to_token);
    CREATE INDEX IF NOT EXISTS idx_swaps_created_at ON swaps (created_at);
  `);
  return db;
}
