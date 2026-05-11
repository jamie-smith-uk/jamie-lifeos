# Test Report — T-20: EP-02-05 Free/Busy Check

**Task:** T-20  
**Epic:** EP-02  
**Title:** EP-02-05: Free/busy check  
**Date:** 2026-04-20  
**Status:** PASS  

---

## Summary

All 16 tests for T-20 pass. Every acceptance criterion has at least one passing test.

The implementation in `packages/orchestrator/src/tools/calendar.ts` and `packages/orchestrator/src/agent.ts` correctly wires the `check_free_busy` tool as a directly-executed read-only operation with no confirmation gate.

Additionally, the T-20 implementation introduced structural changes (moving `check_free_busy` from `calendarWriteToolDefinitions` to a new `calendarFreeBusyToolDefinitions` export) that required updating existing test mocks in T-17, T-18, T-19 test files and updating the `calendar-t15.test.ts` assertions. After these updates, the full test suite passes: **417 / 417 tests pass**.

---

## Test File

`packages/orchestrator/src/__tests__/agent-t20.test.ts`

---

## Acceptance Criteria Coverage

### AC1 — Smoke test 8: 'am I free Thursday afternoon?' → clear free/busy response

| # | Test Name | Result |
|---|-----------|--------|
| 1 | runAgent returns a non-empty text reply for free/busy query | ✓ PASS |
| 2 | agent response mentions 'free' when check_free_busy returns no conflicts | ✓ PASS |
| 3 | agent calls check_free_busy tool when user asks about availability | ✓ PASS |
| 4 | agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters | ✓ PASS |
| 5 | agent response mentions 'Thursday' or 'afternoon' in free response | ✓ PASS |
| 6 | check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API | ✓ PASS |

**AC1 verdict: PASS** — 6/6 tests pass. The agent correctly handles `'am I free Thursday afternoon?'` by calling `check_free_busy` with properly resolved ISO 8601 datetimes and returning a plain-language free/busy response.

---

### AC2 — If busy, response names the conflicting event

| # | Test Name | Result |
|---|-----------|--------|
| 7 | agent response names the conflicting event when busy | ✓ PASS |
| 8 | agent response indicates 'not free' or 'busy' when there is a conflict | ✓ PASS |
| 9 | agent response names the event when MCP returns a busy result with event name | ✓ PASS |
| 10 | agent response names multiple conflicting events when there are several | ✓ PASS |
| 11 | busy response does not include Confirm/Edit/Cancel text | ✓ PASS |

**AC2 verdict: PASS** — 5/5 tests pass. When the MCP returns a busy result, the agent's final response includes the conflicting event name(s). Multiple conflicts are all named. The response never includes confirmation button text.

---

### AC3 — No Confirm/Edit/Cancel buttons shown (read-only)

| # | Test Name | Result |
|---|-----------|--------|
| 12 | showConfirmationKeyboard is false when agent calls check_free_busy and user is free | ✓ PASS |
| 13 | showConfirmationKeyboard is false when agent calls check_free_busy and user is busy | ✓ PASS |
| 14 | showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events | ✓ PASS |
| 15 | check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly | ✓ PASS |
| 16 | no confirmation is saved in DB after a free/busy query | ✓ PASS |

**AC3 verdict: PASS** — 5/5 tests pass. `showConfirmationKeyboard` is always `false` for free/busy queries. `check_free_busy` is not in `CONFIRMATION_GATED_TOOLS`, so it is executed directly by the agent without interception. No `ConfirmationPayload` is saved to the database.

---

## Test Run Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ AC1 — 'am I free Thursday afternoon?' → runAgent returns a non-empty text reply for free/busy query (25ms)
 ✓ AC1 — agent response mentions 'free' when check_free_busy returns no conflicts (1ms)
 ✓ AC1 — agent calls check_free_busy tool when user asks about availability (2ms)
 ✓ AC1 — agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters (1ms)
 ✓ AC1 — agent response mentions 'Thursday' or 'afternoon' in free response (1ms)
 ✓ AC1 — check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API (1ms)
 ✓ AC2 — agent response names the conflicting event when busy (1ms)
 ✓ AC2 — agent response indicates 'not free' or 'busy' when there is a conflict (1ms)
 ✓ AC2 — agent response names the event when MCP returns a busy result with event name (1ms)
 ✓ AC2 — agent response names multiple conflicting events when there are several (1ms)
 ✓ AC2 — busy response does not include Confirm/Edit/Cancel text (1ms)
 ✓ AC3 — showConfirmationKeyboard is false when agent calls check_free_busy and user is free (1ms)
 ✓ AC3 — showConfirmationKeyboard is false when agent calls check_free_busy and user is busy (1ms)
 ✓ AC3 — showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events (1ms)
 ✓ AC3 — check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly (1ms)
 ✓ AC3 — no confirmation is saved in DB after a free/busy query (1ms)

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Duration  183ms
```

---

## Full Suite Impact

T-20 implementation introduced two structural changes that required test maintenance:

1. **`calendarFreeBusyToolDefinitions` new export**: `agent.ts` now imports `calendarFreeBusyToolDefinitions` from `calendar.ts`. The mocks in `agent-t17.test.ts`, `agent-t18.test.ts`, and `agent-t19.test.ts` were updated to include `calendarFreeBusyToolDefinitions: []` in all `vi.doMock("../tools/calendar.js", ...)` factory calls (75 occurrences across 3 files).

2. **`check_free_busy` moved to separate array**: The T-20 implementation moved `checkFreeBusyTool` from `calendarWriteToolDefinitions` (was 4 tools) to a new `calendarFreeBusyToolDefinitions` export. Two tests in `calendar-t15.test.ts` were updated to match this new structure:
   - `exports calendarWriteToolDefinitions as an array of 3 tools` (was 4)
   - `calendarFreeBusyToolDefinitions contains check_free_busy` (was checking `calendarWriteToolDefinitions`)

**Full suite result after maintenance:** 417 / 417 tests pass across all 13 test files.

---

## Mock Strategy

- **Anthropic API**: 2-step scripted mock — 1st call returns `tool_use` with `check_free_busy`, 2nd call returns plain-language `end_turn` reply.
- **`../tools/calendar.js`**: `executeCalendarTool` mocked to return configurable free/busy strings without real MCP network calls.
- **`@lifeos/shared`**: `pool` (in-memory store), `env`, `logger` all mocked. No real database connections.
- **No real network calls** to Anthropic API, Google Calendar MCP, Telegram API, or Gmail MCP.

---

## Verdict: PASS
