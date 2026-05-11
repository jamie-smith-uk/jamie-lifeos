# T-06 Test Report: Bot Service — Chat ID Whitelist Middleware

**Result: PASS**
**Date:** 2026-04-20
**Test runner:** Vitest v4.1.4
**Test file:** `packages/bot/src/__tests__/index.test.ts`

---

## Summary

| Metric | Value |
|---|---|
| Total tests | 36 |
| T-06 tests | 12 |
| Passed | 36 |
| Failed | 0 |
| Duration | ~1.12s |

---

## Acceptance Criteria Coverage

### AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded to orchestrator

| Test | Status |
|---|---|
| `T-06 AC-1 > forwards text message from allowed chat_id to orchestrator` | PASS |
| `T-06 AC-1 > forwards callback_query from allowed chat_id to orchestrator` | PASS |

### AC-2: Message from any other chat_id is dropped with no reply

| Test | Status |
|---|---|
| `T-06 AC-2 > does not call fetch for a text message from an unknown chat_id` | PASS |
| `T-06 AC-2 > does not send a reply to an unauthorised text sender` | PASS |
| `T-06 AC-2 > does not call fetch for a callback_query from an unknown chat_id` | PASS |
| `T-06 AC-2 > does not send a reply to an unauthorised callback_query sender` | PASS |

### AC-3: A WARN log entry is written containing the unauthorised chat_id

| Test | Status |
|---|---|
| `T-06 AC-3 > emits a WARN log with the offending chat_id for a text message` | PASS |
| `T-06 AC-3 > emits a WARN log with the offending chat_id for a callback_query` | PASS |

### AC-4: Unit test — isAllowedChat returns true for allowed ID, false for any other

| Test | Status |
|---|---|
| `T-06 AC-4 > returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID` | PASS |
| `T-06 AC-4 > returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID` | PASS |
| `T-06 AC-4 > returns false for chat_id 0` | PASS |
| `T-06 AC-4 > returns false for negative chat_id` | PASS |

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/bot

 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > imports without throwing 10ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > constructs TelegramBot with the configured token 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > starts in polling mode when BOT_MODE=polling 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > starts in webhook mode when BOT_MODE=webhook 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > registers at least one onText handler for all messages 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > registers a callback_query event handler 0ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > calls fetch with the /message path 53ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > uses the POST method 32ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > sends application/json content-type 33ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > includes chat_id, text, message_id and from_username in the body 34ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > omits from_username when message has no from field 33ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > calls fetch with the /callback path 34ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > uses the POST method for /callback 35ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > includes chat_id, callback_query_id, callback_data, message_id in body 35ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > ignores callback_query with no associated message/chat (no fetch call) 34ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when fetch throws on /message 37ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > error reply text contains 'Something went wrong' for /message 34ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when orchestrator returns HTTP 500 on /message 34ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when fetch throws on /callback 33ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > error reply text contains 'Something went wrong' for /callback 33ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when orchestrator returns HTTP 502 on /callback 36ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > does not crash if sendMessage itself throws during error reply 38ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > logs an error when orchestrator call fails for /message 37ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > logs an error when orchestrator call fails for /callback 37ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID 5ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID 3ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false for chat_id 0 4ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false for negative chat_id 3ms
 ✓ src/__tests__/index.test.ts > T-06 AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded > forwards text message from allowed chat_id to orchestrator 34ms
 ✓ src/__tests__/index.test.ts > T-06 AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded > forwards callback_query from allowed chat_id to orchestrator 36ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not call fetch for a text message from an unknown chat_id 36ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not send a reply to an unauthorised text sender 38ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not call fetch for a callback_query from an unknown chat_id 41ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not send a reply to an unauthorised callback_query sender 37ms
 ✓ src/__tests__/index.test.ts > T-06 AC-3: WARN log entry written with unauthorised chat_id > emits a WARN log with the offending chat_id for a text message 36ms
 ✓ src/__tests__/index.test.ts > T-06 AC-3: WARN log entry written with unauthorised chat_id > emits a WARN log with the offending chat_id for a callback_query 35ms

 Test Files  1 passed (1)
      Tests  36 passed (36)
   Start at  14:53:14
   Duration  1.12s (transform 33ms, setup 0ms, import 34ms, tests 967ms, environment 0ms)
```

---

## Implementation Notes

- **`packages/bot/src/middleware.ts`**: Exports `isAllowedChat(chatId: number): boolean`. Reads `TELEGRAM_ALLOWED_CHAT_ID` from `env`, parses it as an integer, compares against `chatId`. Returns `false` (safe-fail) and emits a WARN if the env var is not a valid integer. Emits a WARN with `{ chat_id, allowed_chat_id }` for any unauthorised chat.
- **`packages/bot/src/index.ts`**: Calls `isAllowedChat(chatId)` before forwarding any text message or callback query to the orchestrator. Returns early (silent drop, no `sendMessage` call) when the check fails. WARN logging is delegated to `isAllowedChat`.
- All Telegram API, orchestrator HTTP, and `@lifeos/shared` dependencies are fully mocked. No real network calls are made.
