# T-11 Self-Assessment: Bot Typing Indicator

## Implementation Summary

The typing indicator is implemented entirely within the orchestrator's `POST /message` handler (`packages/orchestrator/src/index.ts`). No changes were made to the bot package.

### Approach

The orchestrator calls the Telegram Bot API directly (`https://api.telegram.org/bot<TOKEN>/sendChatAction`) rather than introducing a new `/typing` endpoint in the bot service. This is valid because:

- `env.TELEGRAM_BOT_TOKEN` is already available in the orchestrator via `@lifeos/shared`.
- Removing the intermediary hop (orchestrator → bot → Telegram) keeps the latency lower and the code simpler.

### Key design decisions

1. **Fire-and-forget**: `sendTypingIndicator(chatId)` is called synchronously (no `await`) at `packages/orchestrator/src/index.ts:233`. The HTTP fetch runs in the background. The call to `handleMessage` (and thus `runAgent`) follows immediately on the next line — there is zero added latency to the agent response.

2. **Error isolation**: Both the `fetch` rejection path (`.catch`) and the non-OK response path (`.then` + `res.ok` check) are handled with `log.warn` and swallowed. A failure to send the typing indicator cannot propagate to the caller and cannot prevent the agent from replying.

3. **Logger ordering**: The `log` constant (`logger.child(...)`) was moved to the top of the module (after imports) so that `sendTypingIndicator` — defined before the request handler — has access to it without a forward-reference issue.

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| Telegram shows 'typing...' before the agent response arrives | PASS | `sendTypingIndicator` is called at line 233, `handleMessage` (which calls `runAgent` / Anthropic API) is called at line 237. Typing action is dispatched first. |
| Typing action is sent before the Anthropic API call is initiated | PASS | `sendTypingIndicator(msg.chat_id)` executes synchronously before `await handleMessage(msg)`. The `fetch` inside it is started immediately; `runAgent` is not called until the next statement. |
| Failure to send typing indicator does not prevent the agent from responding | PASS | The function returns `void` and all promise rejections/errors are caught and logged at `warn` level only. The agent call path has no dependency on the indicator's outcome. |

## Files Modified

- `packages/orchestrator/src/index.ts` — added `sendTypingIndicator` helper and one call site in the `POST /message` handler.

## Test Results

- `packages/orchestrator`: 71/71 tests passed (`vitest run`)
- `packages/bot`: typecheck clean, no changes
- TypeScript: no errors in either package (`tsc --noEmit`)
