import type { Db } from './db.js';
import type { CreateSwapInput, ListFilters, SwapRecord, UpdateSwapInput } from './types.js';

interface SwapRow {
  id: number;
  from_token: string;
  to_token: string;
  amount_from: number;
  amount_to: number | null;
  rate: number | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: SwapRow): SwapRecord {
  return { ...row };
}

export function createSwap(db: Db, input: CreateSwapInput): SwapRecord {
  const result = db
    .prepare(
      `INSERT INTO swaps (from_token, to_token, amount_from, amount_to, rate)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.from_token, input.to_token, input.amount_from, input.amount_to ?? null, input.rate ?? null);
  return getSwapById(db, Number(result.lastInsertRowid))!;
}

export function getSwapById(db: Db, id: number): SwapRecord | null {
  const row = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id) as SwapRow | undefined;
  return row ? toRecord(row) : null;
}

export function listSwaps(db: Db, filters: ListFilters): { data: SwapRecord[]; total: number } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.from) {
    where.push('from_token = ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('to_token = ?');
    params.push(filters.to);
  }
  if (filters.created_after) {
    where.push('created_at >= ?');
    params.push(filters.created_after);
  }
  if (filters.created_before) {
    where.push('created_at <= ?');
    params.push(filters.created_before);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM swaps ${whereSql}`).get(...params) as {
      count: number;
    }
  ).count;

  const rows = db
    .prepare(`SELECT * FROM swaps ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, filters.limit, filters.offset) as unknown as SwapRow[];
  return { data: rows.map(toRecord), total };
}

export function updateSwap(db: Db, id: number, patch: UpdateSwapInput): SwapRecord | null {
  const existing = getSwapById(db, id);
  if (!existing) return null;

  const merged = {
    from_token: patch.from_token ?? existing.from_token,
    to_token: patch.to_token ?? existing.to_token,
    amount_from: patch.amount_from ?? existing.amount_from,
    amount_to: patch.amount_to !== undefined ? patch.amount_to : existing.amount_to,
    rate: patch.rate !== undefined ? patch.rate : existing.rate,
  };
  if (merged.from_token === merged.to_token) {
    throw new Error('from_token and to_token must differ');
  }
  db.prepare(
    `UPDATE swaps
     SET from_token = ?, to_token = ?, amount_from = ?, amount_to = ?, rate = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  ).run(
    merged.from_token,
    merged.to_token,
    merged.amount_from,
    merged.amount_to,
    merged.rate,
    id,
  );
  return getSwapById(db, id);
}

export function deleteSwap(db: Db, id: number): boolean {
  const result = db.prepare('DELETE FROM swaps WHERE id = ?').run(id);
  return result.changes > 0;
}
