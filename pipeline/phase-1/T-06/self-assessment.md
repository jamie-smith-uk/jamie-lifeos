# T-06 Self-Assessment: Bot service — chat_id whitelist middleware

## Acceptance Criteria Review

### AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded to orchestrator
PASS. `isAllowedChat` returns `true` for the configured ID. Both the `onText` handler and `callback_query` handler call `isAllowedChat` first; only if it returns `true` does execution continue to `postToOrchestrator`. Integration tests confirm fetch is called for `chat_id: 99999` (the value of `TELEGRAM_ALLOWED_CHAT_ID` in test env).

### AC-2: Message from any other chat_id is dropped with no reply
PASS. When `isAllowedChat` returns `false`, both handlers `return` immediately — `postToOrchestrator` is never called and `sendErrorReply` is never called. Tests assert zero `fetch` calls and zero `sendMessageCalls` for unknown chat IDs.

### AC-3: A WARN log entry is written containing the unauthorised chat_id
PASS. Inside `isAllowedChat`, a `logger.warn({ chat_id: chatId, ... })` call is made before returning `false`. Tests assert that `fakeLogger.warn` was called with an object containing the exact offending `chat_id`.

### AC-4: Unit test — isAllowedChat returns true for allowed ID, false for any other
PASS. Four unit tests cover this:
- Returns `true` for `99999` (the configured ID)
- Returns `false` for `12345` (arbitrary other ID)
- Returns `false` for `0`
- Returns `false` for `-99999` (negative ID)

## Files Modified

| File | Change |
|------|--------|
| `packages/bot/src/middleware.ts` | Created — exports `isAllowedChat(chatId: number): boolean` |
| `packages/bot/src/index.ts` | Added `import { isAllowedChat }` and guard call in both `onText` and `callback_query` handlers |
| `packages/bot/src/__tests__/index.test.ts` | Updated existing T-05 tests to use allowed chat ID `99999`; added 10 new T-06 tests |

## Test Results

```
Test Files  1 passed (1)
     Tests  36 passed (36)
```

26 existing T-05 tests continue to pass. 10 new T-06 tests all pass.

## Security Notes

- `TELEGRAM_ALLOWED_CHAT_ID` is read from `env` (validated at startup by `@lifeos/shared`) — never from `process.env` directly.
- If the env value is non-numeric, `isAllowedChat` safe-fails to `false` and emits a WARN — no messages pass through.
- No reply is ever sent to an unauthorised sender, preventing information leakage about the bot's existence.
- The offending `chat_id` is logged at WARN level (not ERROR) as it is an expected operational event, not a system fault.
