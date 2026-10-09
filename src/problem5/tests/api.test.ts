import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { openDb, type Db } from '../src/db.js';
import type { SwapRecord } from '../src/types.js';

let server: Server;
let db: Db;
let baseUrl: string;
let dbDir: string;

test.before(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'swaps-test-'));
  db = openDb(join(dbDir, 'test.db'));
  const app = createApp(db);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
  db.close();
  rmSync(dbDir, { recursive: true, force: true });
});

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? null : JSON.parse(text) };
}

test('POST /api/swaps creates a record and returns 201', async () => {
  const { status, body } = await api('POST', '/api/swaps', {
    from_token: 'eth',
    to_token: 'btc',
    amount_from: 1.5,
    amount_to: 0.05,
    rate: 0.033,
  });
  assert.equal(status, 201);
  const swap = body as SwapRecord;
  assert.equal(swap.from_token, 'ETH'); // normalised to uppercase
  assert.equal(swap.to_token, 'BTC');
  assert.equal(swap.amount_from, 1.5);
  assert.equal(swap.amount_to, 0.05);
  assert.equal(swap.rate, 0.033);
  assert.ok(swap.id >= 1);
  assert.ok(swap.created_at);
  assert.ok(swap.updated_at);
});

test('POST /api/swaps rejects invalid payloads with 400 + details', async () => {
  const cases: unknown[] = [
    {},
    { from_token: 'ETH' },
    { from_token: 'ETH', to_token: 'BTC', amount_from: -1 },
    { from_token: 'ETH', to_token: 'ETH', amount_from: 1 },
    { from_token: 'X', to_token: 'BTC', amount_from: 1 },
    { from_token: 'ETH', to_token: 'BTC', amount_from: 'ten' },
  ];
  for (const payload of cases) {
    const { status, body } = await api('POST', '/api/swaps', payload);
    assert.equal(status, 400, `payload ${JSON.stringify(payload)}`);
    const err = (body as { error: { code: string; details?: string[] } }).error;
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(err.details) && err.details.length > 0);
  }
});

test('GET /api/swaps/:id returns the record, 404 for missing', async () => {
  const created = (
    await api('POST', '/api/swaps', { from_token: 'SWTH', to_token: 'USD', amount_from: 100 })
  ).body as SwapRecord;

  const found = await api('GET', `/api/swaps/${created.id}`);
  assert.equal(found.status, 200);
  assert.deepEqual(found.body, created);

  const missing = await api('GET', '/api/swaps/999999');
  assert.equal(missing.status, 404);

  const badId = await api('GET', '/api/swaps/abc');
  assert.equal(badId.status, 400);
});

test('GET /api/swaps supports filters and pagination', async () => {
  // Fixture set isolated from other tests by token pair.
  for (let i = 0; i < 5; i += 1) {
    await api('POST', '/api/swaps', { from_token: 'AAA', to_token: 'BBB', amount_from: i + 1 });
  }
  await api('POST', '/api/swaps', { from_token: 'CCC', to_token: 'DDD', amount_from: 7 });

  const filtered = await api('GET', '/api/swaps?from=aaa&to=BBB');
  assert.equal(filtered.status, 200);
  const payload = filtered.body as { data: SwapRecord[]; meta: { total: number; limit: number; offset: number } };
  assert.equal(payload.meta.total, 5);
  assert.equal(payload.data.length, 5);
  assert.ok(payload.data.every((s) => s.from_token === 'AAA' && s.to_token === 'BBB'));

  const paged = await api('GET', '/api/swaps?from=AAA&limit=2&offset=2');
  const page = paged.body as { data: SwapRecord[]; meta: { total: number } };
  assert.equal(page.meta.total, 5);
  assert.equal(page.data.length, 2);

  const bad = await api('GET', '/api/swaps?limit=1000');
  assert.equal(bad.status, 400);
});

test('GET /api/swaps filters by created_after / created_before', async () => {
  const before = await api('GET', '/api/swaps?created_before=2000-01-01');
  assert.equal(before.status, 200);
  assert.equal((before.body as { meta: { total: number } }).meta.total, 0);

  const after = await api('GET', '/api/swaps?created_after=2000-01-01');
  assert.ok((after.body as { meta: { total: number } }).meta.total > 0);

  const bad = await api('GET', '/api/swaps?created_after=not-a-date');
  assert.equal(bad.status, 400);
});

test('PATCH /api/swaps/:id updates fields and bumps updated_at', async () => {
  const created = (
    await api('POST', '/api/swaps', { from_token: 'ETH', to_token: 'USD', amount_from: 2 })
  ).body as SwapRecord;

  const updated = await api('PATCH', `/api/swaps/${created.id}`, { amount_from: 3, rate: 2500 });
  assert.equal(updated.status, 200);
  const swap = updated.body as SwapRecord;
  assert.equal(swap.amount_from, 3);
  assert.equal(swap.rate, 2500);
  assert.equal(swap.to_token, 'USD'); // untouched

  const invalid = await api('PATCH', `/api/swaps/${created.id}`, { amount_from: -5 });
  assert.equal(invalid.status, 400);

  const missing = await api('PATCH', '/api/swaps/999999', { amount_from: 1 });
  assert.equal(missing.status, 404);
});

test('DELETE /api/swaps/:id removes the record (204, then 404)', async () => {
  const created = (
    await api('POST', '/api/swaps', { from_token: 'DEL', to_token: 'ME', amount_from: 1 })
  ).body as SwapRecord;

  const del = await api('DELETE', `/api/swaps/${created.id}`);
  assert.equal(del.status, 204);
  assert.equal(del.body, null);

  const gone = await api('GET', `/api/swaps/${created.id}`);
  assert.equal(gone.status, 404);

  const delAgain = await api('DELETE', `/api/swaps/${created.id}`);
  assert.equal(delAgain.status, 404);
});

test('malformed JSON body returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/swaps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'BAD_JSON');
});

test('persistence: data survives a database reopen', async () => {
  const created = (
    await api('POST', '/api/swaps', { from_token: 'PERSIST', to_token: 'ME', amount_from: 42 })
  ).body as SwapRecord;
  db.close();

  db = openDb(join(dbDir, 'test.db'));
  const row = db.prepare('SELECT * FROM swaps WHERE id = ?').get(created.id) as
    | { from_token: string; amount_from: number }
    | undefined;
  assert.ok(row);
  assert.equal(row.from_token, 'PERSIST');
  assert.equal(row.amount_from, 42);
});
