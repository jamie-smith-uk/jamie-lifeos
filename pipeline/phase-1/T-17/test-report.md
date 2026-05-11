# T-17 Test Report — Create calendar event with confirmation

**Task:** T-17 — EP-02-01/02: Create calendar event with confirmation  
**Date:** 2026-04-20  
**Tester:** AG-05 (automated)  
**Result:** PASS

---

## Summary

All 35 tests pass. Every acceptance criterion has at least one passing test.

```
Test Files  1 passed (1)
     Tests  35 passed (35)
  Start at  16:59:15
  Duration  192ms
```

---

## Test File

`packages/orchestrator/src/__tests__/agent-t17.test.ts`

---

## Acceptance Criteria Coverage

### AC1 — Smoke test 4: meeting proposal → Confirm/Edit/Cancel buttons

**Requirement:** 'add a meeting with Tom at 3pm Friday' → proposal with Confirm/Edit/Cancel buttons  
**Tests:** 10 passing

| Test | Result |
|------|--------|
| `runAgent returns showConfirmationKeyboard=true when agent calls create_event` | ✓ PASS |
| `runAgent returns a non-empty text reply when proposing an event` | ✓ PASS |
| `ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)` | ✓ PASS |
| `ConfirmationPayload data contains the event title` | ✓ PASS |
| `showConfirmationKeyboard is false when agent responds without tool call` | ✓ PASS |
| `ConfirmationPayload is persisted with proposed_at timestamp close to now` | ✓ PASS |
| `Anthropic API is called with TOOL_DEFINITIONS that include create_event` | ✓ PASS |
| `bot response object contains show_confirmation_keyboard=true when proposed` | ✓ PASS |
| `bot response object omits show_confirmation_keyboard when false` | ✓ PASS |
| `Confirm/Edit/Cancel keyboard has correct callback_data values` | ✓ PASS |

**Notes:** The `runAgent` function correctly intercepts the `create_event` tool call in the tool loop, calls `saveConfirmation` with a `ConfirmationPayload`, sets `showConfirmationKeyboard = true`, and returns the proposal text from the agent's second API call. The bot layer correctly propagates `show_confirmation_keyboard` in the `/message` response. The keyboard callback_data values are `confirm`, `edit`, and `cancel` as specified.

---

### AC2 — Smoke test 5: Confirm → event created in Google Calendar

**Requirement:** On Confirm callback, orchestrator calls `create_event` tool and sends success message  
**Tests:** 7 passing

| Test | Result |
|------|--------|
| `confirm callback calls executeCalendarTool with create_event action` | ✓ PASS |
| `confirm callback clears active_confirmation after executing calendar tool` | ✓ PASS |
| `confirm callback builds success message containing event title` | ✓ PASS |
| `confirm callback with no pending confirmation returns 'no pending action' message` | ✓ PASS |
| `confirm callback with expired confirmation (>10 min) treats payload as null` | ✓ PASS |
| `confirm success text does not contain 'error' when tool returns plain success` | ✓ PASS |
| `confirmation data contains start and end ISO datetime strings` | ✓ PASS |

**Notes:** The confirm handler correctly: (1) loads the `ConfirmationPayload` via `loadConfirmation`, (2) calls `executeCalendarTool` with `action="create_event"` and the event data, (3) clears the confirmation after execution, (4) returns a success message `Event "<title>" has been added to your calendar.`. Expired confirmations (>10 min) are treated as absent. No-pending-confirmation returns a graceful "No pending action to confirm" message.

---

### AC3 — Cancel → confirmation cleared, no event created

**Requirement:** Cancel clears confirmation and sends cancellation message; no event created  
**Tests:** 7 passing

| Test | Result |
|------|--------|
| `cancel clears active_confirmation in the database` | ✓ PASS |
| `cancel does NOT call executeCalendarTool` | ✓ PASS |
| `cancel response message contains 'Cancelled' and 'no changes'` | ✓ PASS |
| `cancel is a no-op when no confirmation is pending (does not throw)` | ✓ PASS |
| `cancel on an expired confirmation still clears the DB row` | ✓ PASS |
| `after cancel, a subsequent confirm callback finds no pending confirmation` | ✓ PASS |
| `confirm message after cancel shows 'No pending action' response` | ✓ PASS |

**Notes:** The cancel handler correctly calls `clearConfirmation` without calling `executeCalendarTool`. The cancellation message is "Cancelled. No changes were made to your calendar." Cancel is idempotent (no-op when no pending confirmation). After cancel, any subsequent confirm attempt correctly finds no pending action.

---

### AC4 — Proposal message includes: title, date, time, duration, location (if any)

**Requirement:** Proposal message includes title, date, time, duration, and location (if any)  
**Tests:** 11 passing

| Test | Result |
|------|--------|
| `summary contains the event title` | ✓ PASS |
| `summary contains 'Title:' label` | ✓ PASS |
| `summary contains 'Date:' label` | ✓ PASS |
| `summary contains 'Time:' label with a time value` | ✓ PASS |
| `summary contains 'Duration:' label with minutes` | ✓ PASS |
| `summary contains 'Location:' label and value when location is provided` | ✓ PASS |
| `summary omits 'Location:' line when no location is provided` | ✓ PASS |
| `confirmation payload data preserves start, end, and title fields exactly` | ✓ PASS |
| `duration is calculated correctly as (end - start) in minutes` | ✓ PASS |
| `summary all-fields format (with location): all required labels present` | ✓ PASS |
| `summary all-fields format (without location): no Location label` | ✓ PASS |

**Notes:** The `buildCreateEventSummary` function in `agent.ts` produces a structured summary with: `Title: <value>`, `Date: <human-readable>`, `Time: <start> – <end>`, `Duration: <N> min`, and optionally `Location: <value>` (only when provided). All fields are verified from the stored `ConfirmationPayload.summary`. Location is correctly omitted when not provided by the agent.

---

## Full Test Output

```
 ✓ AC1 > runAgent returns showConfirmationKeyboard=true when agent calls create_event 23ms
 ✓ AC1 > runAgent returns a non-empty text reply when proposing an event 1ms
 ✓ AC1 > ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation) 1ms
 ✓ AC1 > ConfirmationPayload data contains the event title 1ms
 ✓ AC1 > showConfirmationKeyboard is false when agent responds without tool call 1ms
 ✓ AC1 > ConfirmationPayload is persisted with proposed_at timestamp close to now 1ms
 ✓ AC1 > Anthropic API is called with TOOL_DEFINITIONS that include create_event 1ms
 ✓ AC1 > bot response object contains show_confirmation_keyboard=true when proposed 0ms
 ✓ AC1 > bot response object omits show_confirmation_keyboard when false 0ms
 ✓ AC1 > Confirm/Edit/Cancel keyboard has correct callback_data values 0ms
 ✓ AC2 > confirm callback calls executeCalendarTool with create_event action 1ms
 ✓ AC2 > confirm callback clears active_confirmation after executing calendar tool 1ms
 ✓ AC2 > confirm callback builds success message containing event title 1ms
 ✓ AC2 > confirm callback with no pending confirmation returns 'no pending action' message 0ms
 ✓ AC2 > confirm callback with expired confirmation (>10 min) treats payload as null 0ms
 ✓ AC2 > confirm success text does not contain 'error' when tool returns plain success 1ms
 ✓ AC2 > confirmation data contains start and end ISO datetime strings 1ms
 ✓ AC3 > cancel clears active_confirmation in the database 0ms
 ✓ AC3 > cancel does NOT call executeCalendarTool 0ms
 ✓ AC3 > cancel response message contains 'Cancelled' and 'no changes' 0ms
 ✓ AC3 > cancel is a no-op when no confirmation is pending (does not throw) 1ms
 ✓ AC3 > cancel on an expired confirmation still clears the DB row 0ms
 ✓ AC3 > after cancel, a subsequent confirm callback finds no pending confirmation 0ms
 ✓ AC3 > confirm message after cancel shows 'No pending action' response 0ms
 ✓ AC4 > summary contains the event title 1ms
 ✓ AC4 > summary contains 'Title:' label 1ms
 ✓ AC4 > summary contains 'Date:' label 1ms
 ✓ AC4 > summary contains 'Time:' label with a time value 1ms
 ✓ AC4 > summary contains 'Duration:' label with minutes 1ms
 ✓ AC4 > summary contains 'Location:' label and value when location is provided 1ms
 ✓ AC4 > summary omits 'Location:' line when no location is provided 1ms
 ✓ AC4 > confirmation payload data preserves start, end, and title fields exactly 1ms
 ✓ AC4 > duration is calculated correctly as (end - start) in minutes 0ms
 ✓ AC4 > summary all-fields format (with location): all required labels present 0ms
 ✓ AC4 > summary all-fields format (without location): no Location label 0ms

 Test Files  1 passed (1)
      Tests  35 passed (35)
   Duration  192ms
```

---

## Mock Strategy

All external dependencies are mocked — no real API calls made:

| Dependency | Mock Strategy |
|------------|---------------|
| `@anthropic-ai/sdk` | Constructor mock with pre-scripted `messages.create()` sequence (tool_use → end_turn) |
| `@lifeos/shared` pool | In-memory store simulating `conversation_context` table with full SQL handler |
| `../tools/calendar.js` | `executeCalendarTool` mocked — no real MCP calls |
| Telegram Bot API | Not involved in orchestrator tests; keyboard shape tested inline |
| Google Calendar MCP | Not called — `executeCalendarTool` mock intercepts all calls |
| Anthropic API | Mocked to return controlled create_event tool_use + proposal responses |

---

## Regression

All existing tests continue to pass:

- `packages/orchestrator`: **342/342** tests pass (10 test files)
- `packages/bot`: **64/64** tests pass (2 test files)
