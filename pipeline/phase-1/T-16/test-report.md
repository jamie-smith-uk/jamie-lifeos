# T-16 Test Report — Confirmation Pattern: active_confirmation Storage

**Task:** T-16  
**Epic:** EP-02  
**Date:** 2026-04-20  
**Verdict:** PASS

---

## Summary

35 tests written and run for T-16. All 35 pass. No regressions in the broader
test suite (307 total tests, all passing).

**Test file:** `packages/orchestrator/src/__tests__/agent-t16.test.ts`

---

## Acceptance Criteria Coverage

| # | Criterion | Tests | Result |
|---|-----------|-------|--------|
| AC1 | `saveConfirmation` upserts payload for `chat_id` | 9 | PASS |
| AC2 | `loadConfirmation` returns `null` if no pending confirmation | 6 | PASS |
| AC3 | `loadConfirmation` returns `null` if confirmation is older than 10 minutes | 7 | PASS |
| AC4 | `clearConfirmation` sets column to `null` | 6 | PASS |
| AC5 | Only one active confirmation per `chat_id` — new proposal overwrites old | 7 | PASS |

---

## Test Results (T-16 only)

```
 ✓ AC1 — saveConfirmation upserts payload for chat_id
     ✓ saveConfirmation persists payload when a prior message row exists
     ✓ saveConfirmation persists payload via INSERT when no prior rows exist for chat_id
     ✓ saveConfirmation stores the full ConfirmationPayload including data fields
     ✓ saveConfirmation works for update_event action
     ✓ saveConfirmation works for delete_event action
     ✓ saveConfirmation uses a transaction (BEGIN / UPDATE or INSERT / COMMIT)
     ✓ saveConfirmation UPDATE uses parameterised $1/$2 — no string interpolation
     ✓ saveConfirmation ROLLBACK is called when UPDATE throws
     ✓ saveConfirmation releases the client even when it throws

 ✓ AC2 — loadConfirmation returns null when no pending confirmation
     ✓ returns null when no rows exist at all for the chat_id
     ✓ returns null when rows exist but active_confirmation is NULL
     ✓ returns null after clearConfirmation has been called
     ✓ returns null when pool query returns zero rows
     ✓ returns null when the active_confirmation field in the row is null
     ✓ loadConfirmation SELECT uses parameterised $1 — no string interpolation

 ✓ AC3 — loadConfirmation returns null when confirmation is older than 10 minutes
     ✓ returns null when proposed_at is 11 minutes ago
     ✓ returns null when proposed_at is exactly 10 minutes + 1 second ago
     ✓ returns null when proposed_at is 60 minutes ago
     ✓ returns null when proposed_at is a date from yesterday
     ✓ returns the payload when proposed_at is only 9 minutes 59 seconds ago (not expired)
     ✓ returns the payload when proposed_at is 1 second ago (fresh)
     ✓ expired payload is not written to DB by loadConfirmation (read-only expiry check)

 ✓ AC4 — clearConfirmation sets active_confirmation column to null
     ✓ clearConfirmation nulls the active_confirmation column after saveConfirmation
     ✓ clearConfirmation is a no-op when no rows exist for chat_id (does not throw)
     ✓ clearConfirmation is idempotent — calling it twice does not throw
     ✓ clearConfirmation UPDATE uses parameterised $1 — no string interpolation
     ✓ clearConfirmation targets the newest row for the chat_id
     ✓ clearConfirmation on expired confirmation also sets to null

 ✓ AC5 — only one active confirmation per chat_id; new proposal overwrites old
     ✓ second saveConfirmation overwrites the first payload
     ✓ overwrite works for different action types (create → delete)
     ✓ multiple overwrites still leave exactly one active confirmation
     ✓ overwriting an expired confirmation stores a fresh one
     ✓ confirmations for different chat_ids are independent
     ✓ clearing one chat_id does not affect another chat_id
     ✓ the store never accumulates extra rows solely from saveConfirmation calls
```

---

## Full Test Suite Run

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 Test Files  9 passed (9)
      Tests  307 passed (307)
   Start at  16:30:09
   Duration  1.60s (transform 724ms, setup 0ms, import 822ms, tests 3.03s, environment 0ms)
```

No test failures. No regressions.

---

## Strategy

- **No real database.** All tests use a fully in-memory `handleQuery` mock
  that simulates the exact SQL issued by `saveConfirmation`, `loadConfirmation`,
  and `clearConfirmation`:
  - `UPDATE conversation_context SET active_confirmation = $2 WHERE id = (SELECT ... LIMIT 1)`
    — updates the newest row for the given `chat_id`.
  - `INSERT INTO conversation_context (chat_id, role, content, active_confirmation) VALUES ($1, 'assistant', '', $2)`
    — inserts a placeholder row when no rows exist (INSERT fallback path).
  - `SELECT active_confirmation FROM conversation_context WHERE chat_id = $1 ORDER BY ... LIMIT 1`
    — reads the newest row's column.
  - `UPDATE conversation_context SET active_confirmation = NULL WHERE id = (SELECT ... LIMIT 1)`
    — nullifies the column on clear.

- **No external API calls.** Telegram, Anthropic, Google Calendar MCP, and
  Gmail MCP are all mocked. `@lifeos/shared` (pool, env, logger) is mocked via
  `vi.doMock()` with full module isolation (`vi.resetModules()` in each
  `beforeEach`).

- **10-minute expiry.** Three "expired" helper payloads test boundary conditions
  (11 min ago, 10 min + 1 s ago, yesterday) and two "fresh" helpers test the
  non-expiry boundary (9 min 59 s ago, 1 s ago). The expiry check is confirmed
  to be read-only — `loadConfirmation` does not issue a NULL-setting UPDATE.

- **Parameterised queries.** SQL text inspected directly on mock call args to
  confirm `$1`/`$2` placeholders are used and literal chat IDs are absent from
  the query strings.

- **Transaction safety.** `BEGIN`/`COMMIT`/`ROLLBACK` calls verified on
  `saveConfirmation`. `client.release()` verified even when exceptions are thrown.
