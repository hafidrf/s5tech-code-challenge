# Problem 6 — Architecture: Live Top-10 Scoreboard Module

Specification for a module on the **API service** (backend application server), written for a backend engineering team to implement.

## 1. Scope & requirements mapping

| Software requirement (brief) | Spec section |
| --- | --- |
| Website has a scoreboard showing the top 10 user scores | §2, §3.2 |
| Live updates of the scoreboard | §3.3 |
| A user action dispatches an API call to update the score | §3.1 |
| Prevent malicious users from increasing scores without authorisation | §4 |

The action itself is out of scope (black box: "user completes an action").

## 2. Module overview

```
scoreboard-service
├── POST /api/scores/increment   # called by the app server when an action completes
├── GET  /api/scores/top         # top-10 snapshot (fallback / initial load)
└── WS   /scores/live            # server-push channel for live updates
```

- **Source of truth**: `users(id, score, updated_at)` in Postgres.
- **Read model**: top-10 kept in Redis (`ZSET leaderboard`, score = aggregate score) as a hot cache; Postgres remains authoritative.
- **Push layer**: WebSocket (or SSE) connections subscribe to leaderboard changes.

## 3. Functional design

### 3.1 Score increment — `POST /api/scores/increment`

Request (JSON):

```json
{
  "user_id": "usr_123",
  "action_id": "act_9f2c...",     // opaque identifier of the completed action
  "client_ts": "2026-10-09T12:00:00Z"
}
```

Processing:

1. **Authenticate** the request (see §4) → derive `user_id` from the credential, never from the body alone.
2. **Idempotency**: `action_id` is unique per user. Insert into `score_events(user_id, action_id, points, created_at)` with `UNIQUE (user_id, action_id)`. Duplicate → return `200` with the original result, no double count.
3. **Atomic update**: single transaction:
   `UPDATE users SET score = score + :points, updated_at = now() WHERE id = :user_id` then `ZINCRBY leaderboard :points user_id`.
4. Respond `200 { "user_id", "new_score", "rank" }`.
5. **Fan-out** (post-commit, at-least-once via outbox table or queue): recompute top 10 and publish `scoreboard.updated` (see §3.3).

### 3.2 Top-10 read — `GET /api/scores/top`

- `ZRANGE leaderboard 0 9 WITHSCORES REV` (O(log N + 10)); on cache miss, rebuild from Postgres `ORDER BY score DESC, id ASC LIMIT 10` (deterministic tie-break).
- Response: `200 [ { "rank": 1, "user_id", "display_name", "score" }, ... ]`, cache headers or ETag so reconnecting clients skip unchanged payloads.

### 3.3 Live updates — `WS /scores/live`

- Client connects; server sends the current top 10 immediately (snapshot), then a diff event whenever the top-10 membership or ordering changes:
  ```json
  { "type": "scoreboard.updated", "top": [ /* same shape as GET /top */ ] }
  ```
- Fan-out rule: **only publish when the top-10 view actually changes** (member entered/left/reordered) — a burst of score updates is batched (e.g. 250 ms window) into one event.
- Transport choice: WebSocket with heartbeat every 30 s; SSE noted as a simpler alternative if clients are browser-only and unidirectional push is enough.
- Clients that cannot hold a socket fall back to polling `GET /api/scores/top` with ETag (e.g. every 15 s, jittered).

## 4. Security (unauthorised score inflation)

1. **Authentication**: every increment requires a valid session/JWT; `user_id` comes from the verified token.
2. **Server-side validation**: the API service recomputes the points for `action_id` from its own records (the client never submits a point value). Unknown/expired `action_id` → `422`.
3. **Idempotency** (`UNIQUE(user_id, action_id)`) stops replay/double-spend of the same action.
4. **Rate limiting**: per-user token bucket (e.g. max N increments/minute) → `429`; anomalous patterns flagged for review.
5. **Auditability**: every accepted change is a row in `score_events` (who, what, when, points, resulting score) — enables detection rules ("score delta outlier") and manual replay.
6. **Transport**: TLS only; WebSocket connections authenticated during the handshake (token in `Sec-WebSocket-Protocol` or short-lived ticket).

## 5. Diagram — execution flow (Mermaid)

```mermaid
sequenceDiagram
    participant U as User/Client
    participant App as App Server
    participant API as Scoreboard API
    participant DB as Postgres (source of truth)
    participant R as Redis ZSET (read model)
    participant CH as WS Channel (fan-out)

    U->>App: completes action
    App->>API: POST /api/scores/increment (user JWT, action_id)
    API->>API: verify JWT, rate-limit, recompute points for action_id
    API->>DB: BEGIN; INSERT score_events (UNIQUE user_id, action_id)
    alt duplicate action_id
        API-->>App: 200 (idempotent, original result)
    else first time
        API->>DB: UPDATE users SET score = score + points
        API->>R: ZINCRBY leaderboard points user_id
        API-->>App: 200 { new_score, rank }
        API->>DB: COMMIT
        API->>CH: publish scoreboard.updated (batched, only if top-10 changed)
        CH-->>U: WS push { type: scoreboard.updated, top: [...] }
    end
    Note over U,CH: Initial load / reconnect fallback
    U->>API: GET /api/scores/top (ETag)
    API->>R: ZREVRANGE 0 9 WITHSCORES
    alt cache miss
        API->>DB: SELECT ... ORDER BY score DESC LIMIT 10
        API->>R: repopulate
    end
    API-->>U: 200 top-10 (+ ETag)
```

## 6. Data model (initial)

```sql
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  score      BIGINT NOT NULL DEFAULT 0 CHECK (score >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE score_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  action_id  TEXT NOT NULL,
  points     INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_id)     -- idempotency key
);
```

## 7. Trade-offs

| Decision | Why | Cost |
| --- | --- | --- |
| Redis ZSET read model | O(log N) updates, O(log N + 10) reads; natural fit for leaderboards | cache/src-of-truth skew window (ms), one more moving part |
| Postgres as source of truth | durability, audit joins, easy rebuild | writes go through the DB first — increment latency ~1 tx |
| Push only on top-10 change, batched | keeps sockets quiet during score floods | clients see updates ~batch-window late (250 ms — fine for a scoreboard) |
| Idempotency via unique event row | exactly-once scoring without distributed locks | one extra insert per action |

## 8. Improvements (as requested by the brief)

- **Shard the fan-out** (Redis pub/sub shards / NATS) once concurrent viewers exceed a single node's WS capacity.
- **Per-region leaderboards** + global merge if the product goes multi-region; the module boundary (increment/read/push) stays identical.
- **Anomaly scoring**: stream `score_events` into a small rules engine (z-score per action type) to auto-flag probable abuse instead of only rate-limiting.
- **Negative scores**: `CHECK (score >= 0)` assumes scores never decrease; if refunds/penalties arrive later, replace with a ledger-based balance and revisit the ZSET invariant.
- **Tie-breaking**: rank by `(score DESC, achieved_at ASC)` — requires storing the timestamp of the score change in the ZSET member value (`member = userId:achievedAtUnixMs`) since Redis ranks on score only.
- **Testing**: property test for the ranking rule + chaos test (kill Redis, verify Postgres rebuild path).
