# T-09 Test Report — Orchestrator: Conversation Context Persistence

**Task:** T-09  
**Epic:** EP-01  
**Title:** Orchestrator: conversation context persistence  
**Agent:** AG-05 Tester  
**Date:** 2026-04-20  
**Result:** PASS

---

## Summary

All 4 acceptance criteria are covered by passing unit tests. The test suite runs entirely with an in-memory mock of `@lifeos/shared`'s `pool` — no real PostgreSQL connection is required. The Telegram API, Anthropic API, Google Calendar MCP, and Gmail MCP are not involved in these tests.

- **Test file:** `packages/orchestrator/src/__tests__/agent.test.ts`
- **Implementation file:** `packages/orchestrator/src/agent.ts`
- **Test runner:** Vitest v4.1.4
- **Tests in file:** 18 (T-09 specific) out of 43 total in the package

---

## Acceptance Criteria Coverage

### AC1 — `loadContext` returns messages in chronological order (oldest first)

**Status:** PASS

| Test | Result |
|------|--------|
| Returns an empty array when no messages exist for the chatId | PASS |
| Returns a single message when one exists | PASS |
| Returns messages with oldest first for multiple messages | PASS |
| Preserves role values correctly | PASS |
| Isolates messages by chatId — does not return other chat messages | PASS |
| Returns at most 20 messages when more than 20 exist | PASS |
| The returned messages are always sorted oldest-first (created_at ASC) | PASS |

**Verification method:** The mock simulates an in-memory store. The SELECT handler applies `ORDER BY created_at DESC, id DESC LIMIT 20` followed by `ORDER BY created_at ASC, id ASC`, mirroring the production subquery. Tests assert content ordering by index position.

---

### AC2 — After the 21st message is saved, only 20 rows remain for that chat_id

**Status:** PASS

| Test | Result |
|------|--------|
| Saves 21 messages and leaves exactly 20 rows | PASS |
| The oldest row is pruned (not the newest) | PASS |

**Verification method:** The DELETE mock handler applies the same `ORDER BY created_at DESC, id DESC LIMIT 20` keep-set logic. After 21 inserts the in-memory store is inspected directly: `store.filter(r => r.chat_id === chatId).length === 20`. The second test asserts "message 1" is absent and "message 21" is present in `loadContext` results.

---

### AC3 — All SQL uses parameterised queries — no string interpolation

**Status:** PASS

| Test | Result |
|------|--------|
| INSERT uses $1/$2/$3 placeholders, not interpolated values | PASS |
| DELETE uses $1/$2 placeholders | PASS |
| SELECT uses $1/$2 placeholders | PASS |

**Verification method:** The pool mock records every `query(sql, values)` call. Tests inspect `clientQueryMock.mock.calls` and `poolQueryMock.mock.calls` to assert:
- SQL text contains `$1`, `$2`, `$3` placeholders
- SQL text does NOT contain literal chatId integers or content strings (including a SQL injection payload `'; DROP TABLE conversation_context; --`)
- The `values` array contains the actual data values

---

### AC4 — Unit test: saving 25 messages leaves exactly 20 in DB

**Status:** PASS

| Test | Result |
|------|--------|
| After 25 saves, exactly 20 rows remain for that chat_id | PASS |
| The 20 retained rows are the newest 20 (messages 6–25) | PASS |
| Messages for other chat_ids are unaffected by pruning | PASS |

**Verification method:** 25 `saveMessage` calls with alternating `user`/`assistant` roles. Post-run: `store.filter(r => r.chat_id === CHAT_ID).length === 20`. The retained content test asserts messages 1–5 absent and messages 6–25 present. The isolation test simultaneously inserts 25 messages into chat 100 and 3 into chat 200, verifying counts remain 20 and 3 respectively.

---

## Additional Tests (Transaction Safety)

These tests verify correct transactional behaviour, which underpins AC2 and AC3 reliability:

| Test | Result |
|------|--------|
| `saveMessage` wraps INSERT and DELETE in a transaction (BEGIN/COMMIT) | PASS |
| `saveMessage` issues ROLLBACK when the INSERT throws | PASS |
| `client.release()` is always called, even on error | PASS |

---

## Full Test Output

```
RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > returns an empty array when no messages exist for the chatId 6ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > returns a single message when one exists 2ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > returns messages with oldest first for multiple messages 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > preserves role values correctly 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > isolates messages by chatId — does not return other chat messages 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > returns at most 20 messages when more than 20 exist 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC1 — loadContext returns messages oldest-first > the returned messages are always sorted oldest-first (created_at ASC) 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC2 — rolling window: 21st message leaves exactly 20 rows > saves 21 messages and leaves exactly 20 rows 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC2 — rolling window: 21st message leaves exactly 20 rows > the oldest row is pruned (not the newest) 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC3 — parameterised queries only > INSERT uses $1/$2/$3 placeholders, not interpolated values 3ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC3 — parameterised queries only > DELETE uses $1/$2 placeholders 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC3 — parameterised queries only > SELECT uses $1/$2 placeholders 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC4 — saving 25 messages leaves exactly 20 rows > after 25 saves, exactly 20 rows remain for that chat_id 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC4 — saving 25 messages leaves exactly 20 rows > the 20 retained rows are the newest 20 (messages 6–25) 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > AC4 — saving 25 messages leaves exactly 20 rows > messages for other chat_ids are unaffected by pruning 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > Transaction safety > saveMessage wraps INSERT and DELETE in a transaction (BEGIN/COMMIT) 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > Transaction safety > saveMessage issues ROLLBACK when the INSERT throws 1ms
 ✓ src/__tests__/agent.test.ts > T-09 — agent.ts context persistence > Transaction safety > client.release() is always called, even on error 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns HTTP 200 for a valid message body 6ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response body is valid JSON 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response JSON contains a 'text' property 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > 'text' property in response is non-empty 0ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when chat_id is missing 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when text is missing 0ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when message_id is missing 0ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 for invalid JSON body 0ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 404 for an unknown route 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='cancel' 2ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > response body contains a text field for cancel 1ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='confirm' 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='edit' 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='dismiss:42' 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for unknown callback_data 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when callback_data field is missing 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when chat_id is missing in callback 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for invalid dismiss nudgeId (non-integer) 0ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for dismiss nudgeId of 0 0ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called before the server starts listening 156ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called exactly once on startup 103ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > the server is reachable (accepts requests) only after migrations complete 157ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > listens on the specified PORT env var 106ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > default PORT is 3001 (env.PORT default in shared env config) 1ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > server address port matches the configured PORT 106ms

 Test Files  2 passed (2)
      Tests  43 passed (43)
   Start at  15:14:43
   Duration  1.03s (transform 61ms, setup 0ms, import 98ms, tests 884ms, environment 0ms)
```

---

## Mock Strategy

| External dependency | Mock approach |
|---------------------|---------------|
| PostgreSQL (`pool` from `@lifeos/shared`) | `vi.doMock` per test — in-memory `StoredRow[]` array with `handleQuery` dispatcher |
| Telegram API | Not invoked by `agent.ts`; no mock needed |
| Anthropic API | Not invoked by `agent.ts`; no mock needed |
| Google Calendar MCP | Not invoked by `agent.ts`; no mock needed |
| Gmail MCP | Not invoked by `agent.ts`; no mock needed |

The pool mock captures all `query(sql, values)` calls for AC3 inspection and simultaneously simulates the INSERT/DELETE/SELECT semantics so AC1, AC2, and AC4 assertions operate against realistic data state.

---

## Verdict

**PASS** — All 4 acceptance criteria have at least one passing test. 18 T-09-specific tests pass with 0 failures, 0 skips.
