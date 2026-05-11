# T-08 Test Report — Orchestrator Service: Entrypoint and HTTP Server

**Result: PASS**
**Date:** 2026-04-20
**Runner:** vitest v4.1.4
**Test file:** `packages/orchestrator/src/__tests__/index.test.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Test files | 1 |
| Tests total | 25 |
| Passed | 25 |
| Failed | 0 |
| Duration | ~1.06s |

---

## Acceptance Criteria Coverage

### AC1: POST /message with valid body returns 200 and a text reply ✅

| Test | Result |
|------|--------|
| returns HTTP 200 for a valid message body | PASS |
| response body is valid JSON | PASS |
| response JSON contains a 'text' property | PASS |
| 'text' property in response is non-empty | PASS |
| returns 400 when chat_id is missing | PASS |
| returns 400 when text is missing | PASS |
| returns 400 when message_id is missing | PASS |
| returns 400 for invalid JSON body | PASS |
| returns 404 for an unknown route | PASS |

### AC2: POST /callback with callback_data 'cancel' returns 200 ✅

| Test | Result |
|------|--------|
| returns 200 for callback_data='cancel' | PASS |
| response body contains a text field for cancel | PASS |
| returns 200 for callback_data='confirm' | PASS |
| returns 200 for callback_data='edit' | PASS |
| returns 200 for callback_data='dismiss:42' | PASS |
| returns 400 for unknown callback_data | PASS |
| returns 400 when callback_data field is missing | PASS |
| returns 400 when chat_id is missing in callback | PASS |
| returns 400 for invalid dismiss nudgeId (non-integer) | PASS |
| returns 400 for dismiss nudgeId of 0 | PASS |

### AC3: Migrations run before first request is handled ✅

| Test | Result |
|------|--------|
| runMigrations is called before the server starts listening | PASS |
| runMigrations is called exactly once on startup | PASS |
| the server is reachable (accepts requests) only after migrations complete | PASS |

### AC4: Server listens on PORT env var, defaults to 3001 ✅

| Test | Result |
|------|--------|
| listens on the specified PORT env var | PASS |
| default PORT is 3001 (env.PORT default in shared env config) | PASS |
| server address port matches the configured PORT | PASS |

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

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
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when callback_data field is missing 1ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when chat_id is missing in callback 2ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for invalid dismiss nudgeId (non-integer) 1ms
 ✓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for dismiss nudgeId of 0 0ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called before the server starts listening 158ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called exactly once on startup 108ms
 ✓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > the server is reachable (accepts requests) only after migrations complete 167ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > listens on the specified PORT env var 111ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > default PORT is 3001 (env.PORT default in shared env config) 2ms
 ✓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > server address port matches the configured PORT 105ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  15:07:03
   Duration  1.06s (transform 33ms, setup 0ms, import 55ms, tests 886ms, environment 0ms)
```

---

## Test Strategy

- **No real external services** — `@lifeos/shared` is fully mocked via `vi.doMock()` before each dynamic import of `index.ts`. `runMigrations` resolves immediately without a DB connection. The Telegram API, Anthropic API, Google Calendar MCP, and Gmail MCP are never invoked.
- **Module isolation** — `vi.resetModules()` is called before each server spawn so `index.ts` re-evaluates from scratch with fresh mocks, preventing state bleed between test suites.
- **Real HTTP transport** — Tests make actual HTTP requests via Node's `http.request` to the running server on isolated ports (13901–13907), exercising the full request-response cycle.
- **Migration ordering** — AC3 tests intercept `http.createServer` to record the call order of `runMigrations` vs `server.listen`, verifying the startup gate is enforced.
- **Port verification** — AC4 tests assert that `server.address().port` matches the configured `PORT` value.

---

## Files Created / Modified

| File | Action |
|------|--------|
| `packages/orchestrator/src/__tests__/index.test.ts` | Created — 25 tests across 4 suites |
| `packages/orchestrator/vitest.config.ts` | Created — vitest config for orchestrator package |
| `packages/orchestrator/package.json` | Modified — added `vitest ^4.1.4` devDependency and `test` script |
