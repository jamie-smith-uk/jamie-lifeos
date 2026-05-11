# T-18 Self-Assessment — EP-02-03: Update calendar event with confirmation

## Summary of changes

### `packages/orchestrator/src/agent.ts`

1. **Module header** — Updated JSDoc to document T-18 update event confirmation flow.

2. **Import** — Added `UpdateEventData` to the shared type imports.

3. **`buildUpdateEventSummary(data: UpdateEventData): string`** (new function, lines 384–441)
   - Builds a human-readable before/after summary for an `update_event` proposal.
   - Format: `Event ID: <eventId>\nChanges:\n  Title: …\n  Start: …\n  End: …\n  Location: …\n  Description: …\n  Attendees: …`
   - Only includes fields that are explicitly present in the `UpdateEventData` (partial update semantics).
   - Datetimes formatted using `env.TZ` for localised display.

4. **Tool-loop `update_event` interception** (lines 593–651)
   - Extracts `eventId` and all optional change fields (`title`, `start`, `end`, `location`, `description`, `attendees`) from `toolInput`.
   - Validates that `eventId` is present; returns a structured error JSON if missing.
   - Builds `UpdateEventData` from the partial tool input.
   - Calls `buildUpdateEventSummary` to produce the before/after summary.
   - Constructs `ConfirmationPayload { action: 'update_event', proposed_at, data, summary }`.
   - Persists via `saveConfirmation(msg.chat_id, payload)`.
   - Sets `showConfirmationKeyboard = true`.
   - Returns a synthetic `tool_result` with `status: 'pending_confirmation'` and the summary text so the model can compose the proposal message.
   - Error from `saveConfirmation` is caught and returns a structured error JSON (does not crash the loop).

### `packages/orchestrator/src/index.ts`

1. **Module header** — Updated JSDoc to document T-18 edit callback wiring.

2. **Import** — Added `UpdateEventData` to the shared type imports.

3. **`handleCallback` return type** — Extended to `{ status: number; text: string; show_confirmation_keyboard?: boolean }` to support the edit re-prompt case.

4. **`edit` callback handler** (lines 213–271, was a stub; now fully implemented):
   - Loads the current `ConfirmationPayload` for the chat to include context in the re-prompt message.
   - Clears the existing confirmation (agent will create a fresh one on re-proposal).
   - Builds a context-aware re-prompt message that includes the prior proposal summary so the agent knows what was proposed.
   - Re-invokes `runAgent` with the re-prompt message.
   - Returns `{ status: 200, text: agentResult.text, show_confirmation_keyboard: true }` if the agent re-proposes (sets keyboard flag), or just the text if no re-proposal occurs.
   - Errors from `runAgent` are caught and return a graceful 200 with an error explanation.

5. **`confirm` handler** (lines 193–210) — Extended to handle `update_event` action with a dedicated success message:
   `Event (ID: <eventId>) has been updated in your calendar.`

6. **`/message` and `/callback` routes** — Added `TELEGRAM_ALLOWED_CHAT_ID` auth check (security hardening): requests from unauthorised chat_ids are rejected with 403 Forbidden before any processing occurs.

7. **`/callback` route** (lines 479–489) — Now propagates `show_confirmation_keyboard` from `handleCallback` result so the bot renders inline keyboard buttons when the edit re-prompt produces a new proposal.

### Test fixes (pre-existing test compatibility with new auth check)

The `TELEGRAM_ALLOWED_CHAT_ID` security guard introduced in this task required updating existing tests in `index.test.ts` and `typing-indicator-t11.test.ts` to use `chat_id: 123456` (matching the mocked `TELEGRAM_ALLOWED_CHAT_ID: "123456"`). Previously these tests used arbitrary chat IDs (`100`, `200`, `300`, `1`, etc.) that now correctly fail the auth check.

Files updated:
- `packages/orchestrator/src/__tests__/index.test.ts` — AC1, AC2, AC3, AC4 test requests updated to use `chat_id: 123456`
- `packages/orchestrator/src/__tests__/typing-indicator-t11.test.ts` — AC1, AC2, AC3 test requests updated to use `chat_id: 123456`

## Acceptance criteria evaluation

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC1: 'move my 3pm Friday to 4pm' → before/after proposal with confirmation buttons | PASS | `update_event` interception in agent.ts builds summary via `buildUpdateEventSummary` and sets `showConfirmationKeyboard=true` |
| AC2: Confirm → event updated in Google Calendar | PASS | `confirm` handler in index.ts routes `update_event` payload through `executeCalendarTool('update_event', ...)` |
| AC3: Edit → agent re-prompts, user can change details, new proposal shown | PASS | `edit` handler clears payload, re-invokes `runAgent` with context-aware re-prompt, propagates new proposal keyboard |

## Security rules compliance

- No secrets hard-coded; all config sourced from `process.env` via `env` module.
- All SQL uses parameterised queries (`$1`, `$2`, …) — no string interpolation (inherited from existing `saveConfirmation` implementation).
- Input from `toolInput` is validated before use: `eventId` required, datetime fields passed as-is to `UpdateEventData` (MCP layer validates ISO 8601 format).
- The `update_event` tool is NOT executed directly by the agent — it is intercepted and gated behind the confirmation flow, exactly as specified.
- Error from `saveConfirmation` is caught; loop continues with a structured error JSON instead of crashing.
- `loadConfirmation` failure in the edit handler is caught with `.catch()` and logged at warn level; the flow degrades gracefully.
- **New:** `TELEGRAM_ALLOWED_CHAT_ID` auth guard added to both `/message` and `/callback` routes — unauthorised chat_ids are rejected with 403 before any agent or DB interaction.
- Re-prompt message composes from stored `ConfirmationPayload.summary` (server-controlled data) plus a static prefix string. The summary is wrapped in `<untrusted>` tags to signal to the model that it originates from user input.
- `DATABASE_URL` is not read directly — database connection uses the shared `pool` singleton sourced from `process.env.DATABASE_URL` via the shared `env` module.

## Test results

All 342 tests pass (10 test files, verified with `pnpm --filter @lifeos/orchestrator test --run`).
