# Test Report — T-07: Bot service: inline keyboard builder

**Status: PASS**
**Date:** 2026-04-20
**Runner:** Vitest v4.1.4
**Test file:** `packages/bot/src/__tests__/keyboard.test.ts`
**Implementation file:** `packages/bot/src/keyboard.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Test files run | 2 (keyboard.test.ts + pre-existing index.test.ts) |
| T-07 tests written | 28 |
| T-07 tests passed | 28 |
| T-07 tests failed | 0 |
| Total suite tests | 64 |
| Total suite passed | 64 |
| Total suite failed | 0 |
| Duration | 1.11s |

---

## Acceptance Criteria Coverage

### AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons

| Test | Result |
|------|--------|
| returns an object with inline_keyboard property | PASS |
| inline_keyboard is an array | PASS |
| has exactly one row | PASS |
| row contains exactly three buttons | PASS |
| each button has text and callback_data properties | PASS |
| first button text is 'Confirm' | PASS |
| second button text is 'Edit' | PASS |
| third button text is 'Cancel' | PASS |
| returns a fresh object on each call (not a cached reference) | PASS |
| conforms to InlineKeyboardMarkup shape (TypeScript structural check at runtime) | PASS |

**AC-1: PASS (10/10)**

---

### AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button

| Test | Result |
|------|--------|
| returns an object with inline_keyboard property | PASS |
| inline_keyboard is an array | PASS |
| has exactly one row | PASS |
| row contains exactly one button | PASS |
| the single button has text 'Dismiss' | PASS |
| the button has a callback_data property | PASS |
| conforms to InlineKeyboardMarkup shape | PASS |
| returns a fresh object for each call with the same nudgeId | PASS |

**AC-2: PASS (8/8)**

---

### AC-3: callback_data values are exactly 'confirm', 'edit', 'cancel', 'dismiss:\<nudgeId\>'

| Test | Result |
|------|--------|
| buildConfirmKeyboard: first button callback_data is exactly 'confirm' | PASS |
| buildConfirmKeyboard: second button callback_data is exactly 'edit' | PASS |
| buildConfirmKeyboard: third button callback_data is exactly 'cancel' | PASS |
| buildDismissKeyboard: callback_data is 'dismiss:\<nudgeId\>' for nudgeId=1 | PASS |
| buildDismissKeyboard: callback_data is 'dismiss:\<nudgeId\>' for nudgeId=42 | PASS |
| buildDismissKeyboard: callback_data is 'dismiss:\<nudgeId\>' for nudgeId=0 | PASS |
| buildDismissKeyboard: callback_data is 'dismiss:\<nudgeId\>' for a large nudgeId | PASS |
| buildDismissKeyboard: different nudgeIds produce different callback_data | PASS |
| buildDismissKeyboard: callback_data follows 'dismiss:\<nudgeId\>' pattern exactly (no extra chars) | PASS |
| buildConfirmKeyboard: no button has an unexpected callback_data value | PASS |

**AC-3: PASS (10/10)**

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/bot

 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > returns an object with inline_keyboard property 1ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > inline_keyboard is an array 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > has exactly one row 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > row contains exactly three buttons 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > each button has text and callback_data properties 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > first button text is 'Confirm' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > second button text is 'Edit' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > third button text is 'Cancel' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > returns a fresh object on each call (not a cached reference) 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons > conforms to InlineKeyboardMarkup shape (TypeScript structural check at runtime) 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > returns an object with inline_keyboard property 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > inline_keyboard is an array 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > has exactly one row 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > row contains exactly one button 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > the single button has text 'Dismiss' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > the button has a callback_data property 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > conforms to InlineKeyboardMarkup shape 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button > returns a fresh object for each call with the same nudgeId 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildConfirmKeyboard: first button callback_data is exactly 'confirm' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildConfirmKeyboard: second button callback_data is exactly 'edit' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildConfirmKeyboard: third button callback_data is exactly 'cancel' 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=1 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=42 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=0 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for a large nudgeId 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: different nudgeIds produce different callback_data 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildDismissKeyboard: callback_data follows 'dismiss:<nudgeId>' pattern exactly (no extra chars) 0ms
 ✓ src/__tests__/keyboard.test.ts > AC-3: callback_data values match exact specification > buildConfirmKeyboard: no button has an unexpected callback_data value 0ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > imports without throwing 11ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > constructs TelegramBot with the configured token 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > starts in polling mode when BOT_MODE=polling 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > starts in webhook mode when BOT_MODE=webhook 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > registers at least one onText handler for all messages 1ms
 ✓ src/__tests__/index.test.ts > AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set > registers a callback_query event handler 1ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > calls fetch with the /message path 51ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > uses the POST method 32ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > sends application/json content-type 32ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > includes chat_id, text, message_id and from_username in the body 32ms
 ✓ src/__tests__/index.test.ts > AC-2: Incoming messages are forwarded via POST /message > omits from_username when message has no from field 32ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > calls fetch with the /callback path 32ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > uses the POST method for /callback 32ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > includes chat_id, callback_query_id, callback_data, message_id in body 60ms
 ✓ src/__tests__/index.test.ts > AC-3: Callback queries are forwarded via POST /callback > ignores callback_query with no associated message/chat (no fetch call) 35ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when fetch throws on /message 36ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > error reply text contains 'Something went wrong' for /message 46ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when orchestrator returns HTTP 500 on /message 35ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when fetch throws on /callback 35ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > error reply text contains 'Something went wrong' for /callback 33ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > sends error reply when orchestrator returns HTTP 502 on /callback 33ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > does not crash if sendMessage itself throws during error reply 33ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > logs an error when orchestrator call fails for /message 36ms
 ✓ src/__tests__/index.test.ts > AC-4: Network errors caught; user receives error reply > logs an error when orchestrator call fails for /callback 37ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID 2ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID 1ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false for chat_id 0 1ms
 ✓ src/__tests__/index.test.ts > T-06 AC-4: isAllowedChat unit tests > returns false for negative chat_id 1ms
 ✓ src/__tests__/index.test.ts > T-06 AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded > forwards text message from allowed chat_id to orchestrator 33ms
 ✓ src/__tests__/index.test.ts > T-06 AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded > forwards callback_query from allowed chat_id to orchestrator 33ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not call fetch for a text message from an unknown chat_id 33ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not send a reply to an unauthorised text sender 32ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not call fetch for a callback_query from an unknown chat_id 33ms
 ✓ src/__tests__/index.test.ts > T-06 AC-2: Message from unauthorised chat_id is dropped with no reply > does not send a reply to an unauthorised callback_query sender 33ms
 ✓ src/__tests__/index.test.ts > T-06 AC-3: WARN log entry written with unauthorised chat_id > emits a WARN log with the offending chat_id for a text message 34ms
 ✓ src/__tests__/index.test.ts > T-06 AC-3: WARN log entry written with unauthorised chat_id > emits a WARN log with the offending chat_id for a callback_query 34ms

 Test Files  2 passed (2)
      Tests  64 passed (64)
   Start at  14:56:43
   Duration  1.11s (transform 85ms, setup 0ms, import 94ms, tests 951ms, environment 0ms)
```

---

## Notes

- No database connection required; `keyboard.ts` is a pure utility module with no I/O.
- No external API calls (Telegram, Anthropic, Google Calendar, Gmail) are made or required.
- The `InlineKeyboardMarkup` type is imported from `node-telegram-bot-api` for compile-time and runtime shape verification.
- All pre-existing tests (T-05, T-06) continue to pass without regression.
