# T-16 Self-Assessment — Confirmation Pattern: active_confirmation Storage

## Implementation summary

Three exported functions were added to `packages/orchestrator/src/agent.ts`:

| Function | Signature | Purpose |
|---|---|---|
| `saveConfirmation` | `(chatId: number, payload: ConfirmationPayload) => Promise<void>` | Upserts payload onto the newest row's `active_confirmation` column |
| `loadConfirmation` | `(chatId: number) => Promise<ConfirmationPayload \| null>` | Returns payload if present and unexpired (<10 min), else `null` |
| `clearConfirmation` | `(chatId: number) => Promise<void>` | Sets `active_confirmation = NULL` on the newest row |

The `ConfirmationPayload` type was already present in `packages/shared/src/types.ts` (T-15 dependency satisfied). Only the import line in `agent.ts` was extended to bring `ConfirmationPayload` into scope.

---

## Acceptance criteria evaluation

| # | Criterion | Status | Notes |
|---|---|---|---|
| AC1 | `saveConfirmation` upserts payload for `chat_id` | PASS | UPDATE targets `id = (SELECT id … ORDER BY created_at DESC, id DESC LIMIT 1)`. Falls back to INSERT when no rows exist. Both branches are wrapped in a transaction. |
| AC2 | `loadConfirmation` returns `null` if no pending confirmation | PASS | Returns `null` when the table has no rows for the chat_id or when `active_confirmation IS NULL` on the newest row. |
| AC3 | `loadConfirmation` returns `null` if confirmation is older than 10 minutes | PASS | `CONFIRMATION_EXPIRY_MS = 10 * 60 * 1000`. Compares `Date.now()` against `new Date(payload.proposed_at).getTime()`. |
| AC4 | `clearConfirmation` sets column to `null` | PASS | Single parameterised UPDATE sets `active_confirmation = NULL` on the newest row; no-op if no rows exist. |
| AC5 | Only one active confirmation per chat_id — new proposal overwrites old | PASS | `saveConfirmation` always targets the single newest row via the sub-query; a second call overwrites the `active_confirmation` value on that same (or a newer) row. |

---

## Security / SQL injection posture

- All three functions use **parameterised queries** (`$1`, `$2`) exclusively — no string interpolation of user-supplied values.
- `saveConfirmation` serialises the payload via `JSON.stringify(payload)` into a bound parameter, so arbitrary JSON content cannot escape the JSONB column.
- `clearConfirmation` uses `NULL` as a SQL literal (not user input), which is safe.

---

## Design decisions

### saveConfirmation: UPDATE-first, INSERT-fallback
The schema guarantees at least one row per chat_id once the conversation starts (T-09 `saveMessage`). However, to be robust in tests and edge cases where `saveConfirmation` is called before any messages exist, an INSERT fallback is included. The fallback row uses `role = 'assistant'` and empty content to satisfy the NOT NULL and CHECK constraints without introducing invalid data.

### loadConfirmation: expiry is evaluated in application code
The 10-minute expiry is checked in TypeScript rather than in SQL (`WHERE proposed_at > NOW() - INTERVAL '10 minutes'`) for two reasons:
1. The `proposed_at` field is inside the JSONB blob — extracting it in SQL requires casting (`(active_confirmation->>'proposed_at')::timestamptz`), which works but adds complexity.
2. Application-side expiry is simpler to unit-test with mocked time.
The expired payload is **not** automatically nulled in the DB on load; callers are expected to call `clearConfirmation` if they wish to clean up.

### clearConfirmation: uses pool.query (no transaction needed)
A single `UPDATE … SET active_confirmation = NULL` is atomic at the row level in PostgreSQL, so no explicit transaction wrapper is required. This matches the pattern used by `loadContext` which also uses `pool.query` directly.

---

## Files modified

| File | Change |
|---|---|
| `packages/orchestrator/src/agent.ts` | Added `ConfirmationPayload` to import; added `CONFIRMATION_EXPIRY_MS` constant; added `saveConfirmation`, `loadConfirmation`, `clearConfirmation` exports; extended module JSDoc |
| `packages/shared/src/types.ts` | No changes — `ConfirmationPayload` already defined by T-15 |

---

## TypeScript compilation

`npx tsc --noEmit -p packages/orchestrator/tsconfig.json` — **zero errors**.
