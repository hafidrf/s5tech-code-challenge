# Problem 5 — A Crude Server

CRUD REST API for **swap records**, built with **ExpressJS + TypeScript** and persisted to **SQLite** (via Node's built-in `node:sqlite` driver — no native compilation needed).

## Requirements covered

| Requirement | Where |
| --- | --- |
| Create a resource | `POST /api/swaps` |
| List resources with basic filters | `GET /api/swaps` (token pair, date range, pagination) |
| Get details of a resource | `GET /api/swaps/:id` |
| Update resource details | `PATCH /api/swaps/:id` |
| Delete a resource | `DELETE /api/swaps/:id` |
| Simple database for persistence | SQLite file (WAL mode), created automatically |
| README with configuration & run steps | this file |

## Prerequisites

- Node.js **>= 22.5** (needed for the built-in `node:sqlite` module)
- npm

## Setup

```bash
cd src/problem5
npm install
```

## Configuration (environment variables)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port |
| `DB_PATH` | `src/data/swaps.db` | SQLite file path (use `:memory:` for an ephemeral DB) |

See [`.env.example`](.env.example) — load it with `node --env-file=.env dist/index.js` (no dotenv dependency needed on Node >= 20.6).

## Run

```bash
npm run dev     # development, auto-reload via tsx
npm run build   # compile TypeScript to dist/
npm start       # run the compiled server (run build first)
```

Health check: `GET http://localhost:4000/health` → `{ "status": "ok" }`

## Test

```bash
npm run typecheck   # tsc --noEmit
npm test            # node --test (starts the real server on an ephemeral port)
```

## API contract

Errors always have the shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": ["amount_from must be a positive number"] } }
```

Codes: `VALIDATION_ERROR` (400), `BAD_JSON` (400), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

### `POST /api/swaps` — create

```json
{
  "from_token": "ETH",     // required, 2-12 char ticker, case-insensitive (stored uppercase)
  "to_token": "BTC",       // required, must differ from from_token
  "amount_from": 1.5,      // required, number > 0
  "amount_to": 0.05,       // optional, number >= 0 (resulting amount, if known)
  "rate": 0.033            // optional, number > 0
}
```

Returns `201` with the created record (server-generated `id`, `created_at`, `updated_at`).

### `GET /api/swaps` — list with filters

Query parameters (all optional):

| Param | Meaning |
| --- | --- |
| `from` | filter by source token ticker |
| `to` | filter by destination token ticker |
| `created_after` | ISO-8601 date/datetime lower bound (inclusive) |
| `created_before` | ISO-8601 date/datetime upper bound (inclusive) |
| `limit` | page size, 1–100, default 20 |
| `offset` | rows to skip, default 0 |

Response:

```json
{
  "data": [ { "id": 1, "from_token": "ETH", "to_token": "BTC", "amount_from": 1.5, "amount_to": 0.05, "rate": 0.033, "created_at": "2026-10-09T12:00:00.000Z", "updated_at": "2026-10-09T12:00:00.000Z" } ],
  "meta": { "total": 1, "limit": 20, "offset": 0 }
}
```

### `GET /api/swaps/:id`

`200` with the record, or `404` `{ "error": { "code": "NOT_FOUND", ... } }`. Non-integer ids → `400`.

### `PATCH /api/swaps/:id`

Partial update: any subset of the create fields (`amount_to`/`rate` may be set back to `null`). Bumps `updated_at`. `404` when the id does not exist.

### `DELETE /api/swaps/:id`

`204` on success, `404` when it does not exist.

## Design notes / assumptions

- **Resource model**: the brief says "a resource" without specifying one; modelled as currency **swap records** so the API is concrete and integrates with Problem 2 (the swap form).
- **Database**: `node:sqlite` keeps `npm install` free of native build steps. SQL is standard SQLite; porting to `better-sqlite3` or Postgres is a driver swap plus placeholder-syntax tweak.
- **Validation**: hand-rolled, centralised in `src/validation.ts` — the field set is small, so a schema library would be dead weight.
- **Security**: request body size capped at 100 KB, `x-powered-by` disabled, CORS enabled (the Vite dev server runs on another origin), stack traces are never sent to clients (unknown errors log server-side and return a generic 500).
- **Auth**: not implemented — not required by the brief.
