# Test Report — T-05: Bot service: entrypoint and message handler

**Result: PASS**
**Date:** 2026-04-20
**Agent:** ag-05-tester
**Task:** T-05 (EP-01)
**File under test:** `packages/bot/src/index.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Test files | 1 |
| Total tests | 24 |
| Passed | 24 |
| Failed | 0 |
| Duration | ~662ms |
| Framework | Vitest v4.1.4 |

---

## Test Infrastructure Added

- `packages/bot/package.json` — added `"vitest": "^4.1.4"` to `devDependencies` and `"test"` script
- `packages/bot/vitest.config.ts` — vitest configuration (node environment, forks pool, isolate: true)
- `packages/bot/src/__tests__/index.test.ts` — test suite (24 tests)

### Mocking Strategy

- **`node-telegram-bot-api`** — replaced with a `FakeTelegramBot` class that records registered handlers, captures `sendMessage` calls, and exposes `triggerText()`/`triggerEvent()` helpers
- **`@lifeos/shared`** — mocked to inject a test `env` object (no real env-var validation) and a silent `fakeLogger` with `vi.fn()` spies
- **`globalThis.fetch`** — stubbed per test with `vi.stubGlobal()` to capture orchestrator HTTP calls or simulate network failures
- No real Telegram API, Anthropic API, database, Google Calendar MCP, or Gmail MCP calls are made

---

## Acceptance Criteria Coverage

### AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set

| Test | Result |
|------|--------|
| imports without throwing | PASS |
| constructs TelegramBot with the configured token | PASS |
| starts in polling mode when BOT_MODE=polling | PASS |
| starts in webhook mode when BOT_MODE=webhook | PASS |
| registers at least one onText handler for all messages | PASS |
| registers a callback_query event handler | PASS |

**Verdict: PASS** — Module loads cleanly with `TELEGRAM_BOT_TOKEN` set; correct mode is configured based on `BOT_MODE`.

---

### AC-2: Incoming messages are forwarded to ORCHESTRATOR_URL via POST /message

| Test | Result |
|------|--------|
| calls fetch with the /message path | PASS |
| uses the POST method | PASS |
| sends application/json content-type | PASS |
| includes chat_id, text, message_id and from_username in the body | PASS |
| omits from_username when message has no from field | PASS |

**Verdict: PASS** — Text messages trigger a `POST` to `http://<ORCHESTRATOR_URL>/message` with correct JSON payload including `chat_id`, `text`, `message_id`, and the optional `from_username`.

---

### AC-3: Callback queries are forwarded to ORCHESTRATOR_URL via POST /callback

| Test | Result |
|------|--------|
| calls fetch with the /callback path | PASS |
| uses the POST method for /callback | PASS |
| includes chat_id, callback_query_id, callback_data, message_id in body | PASS |
| ignores callback_query with no associated message/chat (no fetch call) | PASS |

**Verdict: PASS** — Callback queries trigger a `POST` to `http://<ORCHESTRATOR_URL>/callback` with the correct payload; queries missing a `message`/`chat` context are silently discarded.

---

### AC-4: Network errors to orchestrator are caught; user receives error message

| Test | Result |
|------|--------|
| sends error reply when fetch throws on /message | PASS |
| error reply text contains 'Something went wrong' for /message | PASS |
| sends error reply when orchestrator returns HTTP 500 on /message | PASS |
| sends error reply when fetch throws on /callback | PASS |
| error reply text contains 'Something went wrong' for /callback | PASS |
| sends error reply when orchestrator returns HTTP 502 on /callback | PASS |
| does not crash if sendMessage itself throws during error reply | PASS |
| logs an error when orchestrator call fails for /message | PASS |
| logs an error when orchestrator call fails for /callback | PASS |

**Verdict: PASS** — Both fetch-level exceptions and HTTP non-2xx responses are caught; the user always receives a "Something went wrong" reply; secondary failures in `sendErrorReply` are caught and logged without crashing; errors are logged via the bot's child logger.

---

## Full Test Output

```
> @lifeos/bot@0.0.1 test /Users/jamie/Documents/jamie-lifeos/packages/bot
> vitest run --config vitest.config.ts

 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/bot

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  14:47:13
   Duration  818ms (transform 31ms, setup 0ms, import 35ms, tests 662ms, environment 0ms)
```

---

## Verdict

**PASS** — All 4 acceptance criteria have passing tests (24/24). The implementation in `packages/bot/src/index.ts` satisfies the T-05 specification.
