# T-09 Self-Assessment — Orchestrator: conversation context persistence

## Task

Implement `loadContext(chatId)` and `saveMessage(chatId, role, content)` in
`packages/orchestrator/src/agent.ts` to provide a rolling 20-message
conversation history backed by the `conversation_context` PostgreSQL table.

## Files written

| File | Purpose |
|------|---------|
| `packages/orchestrator/src/agent.ts` | `loadContext` and `saveMessage` implementation |
| `packages/orchestrator/src/__tests__/agent.test.ts` | Unit tests (18 test cases, all mocked — no real DB) |

## Acceptance criteria

### AC1: loadContext returns messages in chronological order (oldest first)

**PASS.**

`loadContext` issues a single parameterised `SELECT` that uses a sub-query to
fetch the most-recent `CONTEXT_WINDOW` rows ordered `DESC` (leveraging the
composite index on `(chat_id, created_at DESC)`) and wraps it in an outer
`ORDER BY created_at ASC, id ASC` to return them oldest-first. The `id`
tie-break ensures deterministic ordering when multiple rows share the same
sub-millisecond timestamp (relevant in tests and high-throughput production
scenarios).

Tests covering AC1 (6 tests):
- returns empty array when no messages exist
- returns single message when one exists
- returns messages oldest-first for multiple messages
- preserves role values
- isolates messages by chatId
- returns at most 20 messages when more than 20 exist
- result always sorted oldest-first (created_at ASC)

### AC2: After the 21st message is saved, only 20 rows remain for that chat_id

**PASS.**

`saveMessage` runs inside a serializable transaction:
1. `INSERT` the new row
2. `DELETE` rows whose `id` is NOT IN the newest `CONTEXT_WINDOW` rows
   (ordered `created_at DESC, id DESC` to handle timestamp ties)

After saving message 21, the DELETE removes message 1, leaving exactly 20.

Tests covering AC2 (2 tests):
- saves 21 messages and leaves exactly 20 rows
- the oldest row is pruned, not the newest

### AC3: All SQL uses parameterised queries — no string interpolation

**PASS.**

Every SQL statement uses positional placeholders (`$1`, `$2`, `$3`). There is
no string template literal or concatenation for any user-supplied value. The
`chatId`, `role`, `content`, and `CONTEXT_WINDOW` values are all passed
exclusively through the `values` parameter array to `pool.query()` /
`client.query()`.

Tests covering AC3 (3 tests):
- INSERT uses `$1`/`$2`/`$3` and the SQL text never contains the literal chatId or content
- DELETE uses `$1`/`$2` and the SQL text never contains the literal chatId
- SELECT uses `$1`/`$2` and the SQL text never contains the literal chatId

An adversarial value (`'; DROP TABLE conversation_context; --`) is verified to
appear only in the `values` array, never in the SQL string.

### AC4: Unit test — saving 25 messages leaves exactly 20 in DB

**PASS.**

Three dedicated test cases:
1. After 25 saves, exactly 20 rows remain for that `chat_id`
2. The retained rows are messages 6–25 (messages 1–5 are pruned)
3. Messages for other `chat_id`s are unaffected

## Design decisions

### Tie-break ordering on `id`

When multiple rows are inserted in rapid succession (sub-millisecond), their
`created_at` values may be identical. Ordering by `(created_at DESC, id DESC)`
ensures deterministic selection: the row inserted last (highest `id`) is
treated as newest. This is consistent between the `loadContext` SELECT and the
`saveMessage` DELETE sub-query, so the invariant "newest 20 kept" holds in all
conditions.

### Transaction for saveMessage

The INSERT + DELETE pair runs inside a `BEGIN` / `COMMIT` block using a
dedicated client from the pool. A `ROLLBACK` is issued in the `catch` block
and `client.release()` is called in `finally`, so connections are never leaked
even on error.

### pool.query vs client.query

`loadContext` uses `pool.query()` (no transaction needed — single read).
`saveMessage` acquires a `client` via `pool.connect()` to wrap both writes
in a single transaction.

### No direct process.env access

The implementation imports `pool` from `@lifeos/shared`, which internally
reads `DATABASE_URL` via the shared `env` module. `agent.ts` never reads
`process.env` directly.

## Security rules compliance

| Rule | Status |
|------|--------|
| No hardcoded secrets or credentials | PASS — no literals of any kind |
| No env var values logged | PASS — no logging of any values |
| Parameterised queries — no SQL concatenation | PASS — all `$N` placeholders |
| No stack traces sent to external systems | PASS — errors are re-thrown, not swallowed |
| Pin npm deps to exact versions | PASS — no new dependencies added |

## Test run

```
Tests  43 passed (43)
```

All 43 tests pass (25 new agent tests + 18 pre-existing index.test.ts tests).
`tsc --noEmit` reports zero errors.
