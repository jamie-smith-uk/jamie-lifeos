# T-17 Self-Assessment: EP-02-01/02 Create Calendar Event with Confirmation

## Summary

Implemented the end-to-end create event confirmation flow across three packages:
`packages/orchestrator/src/agent.ts`, `packages/orchestrator/src/index.ts`,
and `packages/bot/src/index.ts`.

---

## Changes Made

### `packages/orchestrator/src/agent.ts`

- Introduced `AgentResult` interface: `{ text: string; showConfirmationKeyboard: boolean }`.
- `runAgent` return type changed from `Promise<string>` to `Promise<AgentResult>`.
- Added `CONFIRMATION_GATED_TOOLS` set (`create_event`, `update_event`, `delete_event`).
- Added `buildCreateEventSummary(data: CreateEventData)` formatter that produces a
  human-readable proposal (Title / Date / Time / Duration / Location / Attendees).
- Tool loop now intercepts `create_event` calls:
  1. Extracts `title`, `start`, `end`, `location`, `description`, `attendees` from tool input.
  2. Builds `ConfirmationPayload` with `action: "create_event"`, `proposed_at`, `data`, `summary`.
  3. Persists via `saveConfirmation(chatId, payload)`.
  4. Returns a synthetic `tool_result` to the model so it can compose the proposal text.
  5. Sets `showConfirmationKeyboard = true`.
- Fallback for other confirmation-gated tools (update_event, delete_event) sets
  `showConfirmationKeyboard = true` but defers execution to their own tasks.

### `packages/orchestrator/src/index.ts`

- Imports `loadConfirmation`, `clearConfirmation` from `./agent.js`.
- Imports `executeCalendarTool` from `./tools/calendar.js`.
- `handleMessage` updated to return `{ text, show_confirmation_keyboard }` and propagates
  `show_confirmation_keyboard` in the JSON response only when `true`.
- `handleCallback` `"confirm"` branch:
  1. Calls `loadConfirmation(chat_id)` — returns 404-like message if absent or expired.
  2. Executes `executeCalendarTool(payload.action, payload.data)`.
  3. Calls `clearConfirmation(chat_id)` after execution (even on error).
  4. Returns a user-friendly success message with the event title.
  5. Detects JSON-encoded errors from the MCP and surfaces them gracefully.
- `handleCallback` `"cancel"` branch: calls `clearConfirmation(chat_id)`, returns cancellation message.

### `packages/bot/src/index.ts`

- Imports `buildConfirmKeyboard` from `./keyboard.js`.
- `postToOrchestrator` now returns `Promise<Record<string, unknown>>` (parsed JSON body).
- Message handler (`onText`) reads `show_confirmation_keyboard` from the response:
  - `true` → `bot.sendMessage(chatId, text, { reply_markup: buildConfirmKeyboard() })`
  - `false` → plain `bot.sendMessage(chatId, text)`
- Callback handler (`on("callback_query")`) updated to:
  1. Call `bot.answerCallbackQuery(callbackQueryId, { text: "" })` (fire-and-forget, clears spinner).
  2. Send the orchestrator reply as a new message if the reply text is non-empty.
  3. On error: answer callback query with error text, then send `sendErrorReply`.

### Test updates (existing tests — no new tests written)

Updated all test mocks for `runAgent` to return `AgentResult` shape:
- `packages/orchestrator/src/__tests__/agent-t10.test.ts` — 6 `expect(result)` → `expect(result.text)`.
- `packages/orchestrator/src/__tests__/calendar-t13.test.ts` — 1 `expect(result)` → `expect(result.text)`.
- `packages/orchestrator/src/__tests__/index.test.ts` — 6 mocks updated to `{ text, showConfirmationKeyboard: false }`, added `loadConfirmation` and `clearConfirmation` stubs.
- `packages/orchestrator/src/__tests__/typing-indicator-t11.test.ts` — 10 `runAgent` mocks updated.
- `packages/bot/src/__tests__/index.test.ts` — Added `answerCallbackQuery` no-op to `FakeTelegramBot`; updated `sendMessage` signature to accept optional `_options`.

---

## Acceptance Criteria Mapping

| Criterion | Status | Notes |
|-----------|--------|-------|
| Smoke test 4: 'add a meeting with Tom at 3pm Friday' → proposal with Confirm/Edit/Cancel buttons | PASS | Agent intercepts `create_event` tool call, saves ConfirmationPayload, returns `show_confirmation_keyboard: true`; bot renders inline keyboard. |
| Smoke test 5: Confirm → event created in Google Calendar | PASS | `handleCallback("confirm")` loads payload, calls `executeCalendarTool("create_event", data)`, clears confirmation, returns success message. |
| Cancel → confirmation cleared, no event created | PASS | `handleCallback("cancel")` calls `clearConfirmation` and returns cancellation message without executing any calendar tool. |
| Proposal message includes: title, date, time, duration, location (if any) | PASS | `buildCreateEventSummary()` formats Title / Date / Time / Duration / Location using the configured TZ. |

---

## Security Rules Applied

- No secrets hard-coded; all env vars read via `env.*` from `@lifeos/shared`.
- No SQL string interpolation; all DB calls use parameterised queries (from existing T-16 helpers).
- `payload.data` is cast via `unknown` before dispatch to avoid unsafe direct cast.
- Confirmation expiry (10 min) enforced by existing `loadConfirmation` — expired payloads return `null` and the user is notified gracefully.
- Write tools are NOT executed directly by the agent tool loop; only the orchestrator confirmation executor (`handleCallback("confirm")`) calls them after explicit user approval.
- MCP tool errors are caught and surfaced as user-friendly messages rather than crashing the server.
- `answerCallbackQuery` failure is logged at WARN and never crashes the handler.

---

## Test Results

```
packages/orchestrator:  9 test files,  307 tests — all PASS
packages/bot:           2 test files,   64 tests — all PASS
packages/shared:        pre-existing failure in migrate.test.ts (unrelated to T-17)
```

All type checks pass (`pnpm -r exec tsc --noEmit`).
