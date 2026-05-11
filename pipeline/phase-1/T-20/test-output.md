[93m[1m! [0m agent "ag-05-tester" is a subagent, not a primary agent. Falling back to default agent
[0m
[0m> build · claude-sonnet-4-6

[0m# [0mTodos
[ ] Explore codebase structure for T-20 related files
[ ] Write tests for T-20 free/busy check
[ ] Run tests and capture output
[ ] Write test-report.md to pipeline/phase-1/T-20/

[0m[0m→ [0mRead packages/orchestrator/src/tools/calendar.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts
Now let me look at existing tests for context:
[0m✱ [0mGlob "packages/orchestrator/**/*.test.ts"[90m 12 matches[0m
[0m✱ [0mGlob "pipeline/phase-1/**"[90m 0 matches[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t19.test.ts
[0m→ [0mRead packages/orchestrator/src/__tests__/calendar-t15.test.ts
Now let me check the package.json and vitest configuration:
[0m→ [0mRead packages/orchestrator/package.json
[0m✱ [0mGlob "packages/orchestrator/vitest*.ts"[90m 1 match[0m
[0m→ [0mRead packages/orchestrator/vitest.config.ts
[0m
[0m[x] Explore codebase structure for T-20 related files
[ ] Write tests for T-20 free/busy check
[ ] Run tests and capture output
[ ] Write test-report.md to pipeline/phase-1/T-20/


[0m# [0mTodosNow I have a thorough understanding of the codebase. Let me write the T-20 tests covering all three acceptance criteria:

1. **AC1 (Smoke test 8)**: `'am I free Thursday afternoon?'` → clear free/busy response
2. **AC2**: If busy, response names the conflicting event
3. **AC3**: No Confirm/Edit/Cancel buttons shown (read-only)
[0m← [0mWrite packages/orchestrator/src/__tests__/agent-t20.test.tsWrote file successfully.

LSP errors detected in this file, please fix:
<diagnostics file="/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts">
ERROR [1196:3] Cannot find name 'afterEach'.
ERROR [1353:3] Cannot find name 'afterEach'.
</diagnostics>


[0mThe `afterEach` import is missing. Let me fix the import:
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -41,9 +41,9 @@
  *     calendarFreeBusyToolDefinitions export, and the TOOL_DEFINITIONS array in agent.ts
  *     to ensure check_free_busy is wired end-to-end.
  */
 
-import { describe, it, expect, vi, beforeEach } from "vitest";
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
 
 // ---------------------------------------------------------------------------
 // In-memory store shared by pool mock (mirrors pattern from agent-t19.test.ts)
 // ---------------------------------------------------------------------------
[0m


Now let me run the tests:
[0m# [0mTodos[x] Explore codebase structure for T-20 related files
[x] Write tests for T-20 free/busy check
[ ] Run tests and capture output
[ ] Write test-report.md to pipeline/phase-1/T-20/[0m


[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose 2>&1

[0mRUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns a non-empty string for a hello message 66ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns the exact text from the API response TextBlock 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns a fallback string when the response has no text block 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > passes the user message as the last message to the API 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > calls messages.create() exactly once for a simple message 4ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > calls the API again when the first response has stop_reason='tool_use' 3ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > appends tool_result messages to the conversation before re-calling the API 3ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > the tool_result includes the correct tool_use_id 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > continues the tool loop for multiple sequential tool calls 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > does NOT call the API again when stop_reason is end_turn (no tool_use) 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > returns the final text after multiple tool iterations 3ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > appends the assistant tool_use response to messages before feeding tool_result 4ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt contains all five required section headers 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > blocks appear in the correct order: Identity → Live Context → People Index → Pending Nudges → Active Automations 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Live Context block contains current datetime (ISO 8601) and timezone 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > People Index block indicates empty state in Phase 1 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query 66ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability 3ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response 3ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free 5ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query 2ms
 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns showConfirmationKeyboard=true when agent calls create_event 13ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns a non-empty text reply when proposing an event 4ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation) 3ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload data contains the event title 3ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > showConfirmationKeyboard is false when agent responds without tool call 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is persisted with proposed_at timestamp close to now 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > Anthropic API is called with TOOL_DEFINITIONS that include create_event 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 ✓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > bot response object contains show_confirmation_keyboard=true when proposed 0ms
 ✓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > bot response object omits show_confirmation_keyboard when false 0ms
 ✓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > Confirm/Edit/Cancel keyboard has correct callback_data values 0ms
 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback calls executeCalendarTool with create_event action 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback clears active_confirmation after executing calendar tool 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback builds success message containing event title 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with no pending confirmation returns 'no pending action' message 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with expired confirmation (>10 min) treats payload as null 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm success text does not contain 'error' when tool returns plain success 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirmation data contains start and end ISO datetime strings 3ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel clears active_confirmation in the database 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel does NOT call executeCalendarTool 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 ✓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel response message contains 'Cancelled' and 'no changes' 0ms
 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel is a no-op when no confirmation is pending (does not throw) 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel on an expired confirmation still clears the DB row 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > after cancel, a subsequent confirm callback finds no pending confirmation 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > confirm message after cancel shows 'No pending action' response 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains the event title 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Title:' label 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Date:' label 5ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Time:' label with a time value 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Duration:' label with minutes 2ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Location:' label and value when location is provided 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary omits 'Location:' line when no location is provided 1ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > confirmation payload data preserves start, end, and title fields exactly 7ms
   → [vitest] No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 ✓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > duration is calculated correctly as (end - start) in minutes 0ms
 ✓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary all-fields format (with location): all required labels present 0ms
 ✓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary all-fields format (without location): no Location label 0ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports createEventTool with name 'create_event' 25ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool has a non-empty description 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema requires title, start, end 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema does NOT require optional fields 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema properties include location, description, attendees 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema attendees property is type array 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool description mentions confirmation requirement 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports updateEventTool with name 'update_event' 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool has a non-empty description 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema requires only eventId 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema properties include all update fields 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool description mentions confirmation requirement 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports deleteEventTool with name 'delete_event' 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool has a non-empty description 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool input_schema requires only eventId 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool description mentions confirmation requirement 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool description warns about irreversibility 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool has a non-empty description 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool input_schema requires start and end 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool description mentions free/busy or availability 1ms
 × src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports calendarWriteToolDefinitions as an array of 4 tools 6ms
   → expected [ Array(3) ] to have a length of 4 but got 3
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains create_event 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains update_event 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains delete_event 2ms
 × src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains check_free_busy 1ms
   → expected [ Array(3) ] to include 'check_free_busy'
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > create_event is included in tools passed to Anthropic API on first call 18ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > getTodaysEventsTool is exported from calendar.ts 17ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool name is exactly 'get_todays_events' 3ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool has a non-empty description string 3ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema type is 'object' 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema has a properties field (may be empty — no required params) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema required array is empty (no required parameters) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool definition conforms to Anthropic Tool shape (name + description + input_schema) 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > description mentions 'today' to match MCP contract intent 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool is exported from calendar.ts 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool name is exactly 'get_events_range' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool input_schema requires 'start' and 'end' 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'start' property is typed as string in input_schema 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'end' property is typed as string in input_schema 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'start' description mentions ISO 8601 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'end' description mentions ISO 8601 3ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with valid ISO 8601 date-only strings 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime strings with Z suffix 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime strings with timezone offset 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime without seconds 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange rejects invalid start parameter (not ISO 8601) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange rejects invalid end parameter (not ISO 8601) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange passes start and end to the MCP tool call correctly 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange does NOT call fetch when start is invalid 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange does NOT call fetch when end is invalid 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions is exported from calendar.ts 3ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions contains exactly two tools (get_todays_events and get_events_range) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions includes get_todays_events 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions includes get_events_range 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > getTodaysEventsTool is the same object included in calendarReadToolDefinitions 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > getEventsRangeTool is the same object included in calendarReadToolDefinitions 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > each tool definition in calendarReadToolDefinitions has name, description, and input_schema 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > agent.ts spreads calendarReadToolDefinitions into TOOL_DEFINITIONS — verified by mock API call 21ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool is exported from calendar.ts 8ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool routes 'get_todays_events' correctly 4ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool routes 'get_events_range' correctly 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool returns error JSON for unknown tool name 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Pending Nudges block indicates empty state in Phase 1 6ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Active Automations block indicates empty state in Phase 1 22ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt is a non-empty string passed as 'system' to messages.create() 6ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt contains exactly five top-level ## headers 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the model ID from env.ANTHROPIC_MODEL (default: claude-sonnet-4-20250514) 3ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the model ID from env even when overridden to a different value 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the same model ID in all tool loop iterations 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > model ID in all API calls matches env.ANTHROPIC_MODEL exactly 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > agent.ts source does not use the model ID as an operational hardcoded value (only in comments) 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > env.ts (shared) contains the claude-sonnet-4-20250514 default as the canonical definition 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > Integration — context and message persistence > loads context via pool.query before calling the Anthropic API 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > Integration — context and message persistence > saves the user message and assistant reply after the agent loop 1ms
 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 7ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool has a non-empty description 22ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool input_schema requires 'start' and 'end' 5ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description mentions free/busy or availability 1ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description explicitly states no confirmation is needed 1ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports calendarFreeBusyToolDefinitions as an array containing check_free_busy 1ms
 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > calls MCP with tool name 'check_free_busy' 2ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > sends start and end to MCP as arguments 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (free) 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (busy with event name) 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns fallback string when MCP returns empty content 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 start parameter 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 end parameter 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns structured error JSON when MCP returns HTTP error 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > never throws — always returns a string 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes 'check_free_busy' to checkFreeBusy and returns result 2ms
   → expected 'You are free during this period.' to be 'You are free.' // Object.is equality
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param 1ms
   → Unexpected token 'Y', "You are fr"... is not valid JSON
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param 2ms
   → Unexpected token 'Y', "You are fr"... is not valid JSON
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly 2ms
   → expected 'You are free during this period.' to contain 'Weekly Sync'
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool returns error JSON when get_events_range params are missing 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns a graceful empty-state message when MCP result content is empty array 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns a graceful empty-state message when text content is whitespace only 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange returns 'No events' message when MCP result content is empty array 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange 'No events' message includes the start and end dates for context 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents 'No events' response is a non-empty human-readable string (not an empty string) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange 'No events' response is a non-empty human-readable string 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns events string (not 'No events') when MCP returns content 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents handles MCP HTTP error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents handles network error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange handles MCP HTTP error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange handles network error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents calls MCP with the correct tool name 'get_todays_events' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents sends an empty arguments object to MCP (no params) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > MCP JSON-RPC request uses method 'tools/call' and jsonrpc '2.0' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > MCP request Content-Type header is application/json 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > update_event is included in tools passed to Anthropic API on first call 15ms
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > delete_event is included in tools passed to Anthropic API on first call 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > check_free_busy is included in tools passed to Anthropic API on first call 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > all four write tools plus read tools are in TOOL_DEFINITIONS (at least 6 total) 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > TOOL_DEFINITIONS does not contain duplicates 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent calls MCP with correct tool name 'create_event' 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends title, start, end to MCP 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional location to MCP when provided 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional description to MCP when provided 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional attendees array to MCP when provided 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent does NOT send undefined optional fields to MCP 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns MCP text response on success 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns fallback message when MCP returns empty content 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON when title is empty 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 start 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 end 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for empty-string attendee 9ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns HTTP error 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns JSON-RPC error 8ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent calls MCP with correct tool name 'update_event' 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends eventId to MCP 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends only provided fields (partial update — title only) 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends all provided fields when multiple are given 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns MCP text response on success 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns fallback success message when MCP returns empty content 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON when eventId is empty string 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 start 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 end 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns structured error JSON when MCP returns HTTP error 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent calls MCP with correct tool name 'delete_event' 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent sends eventId to MCP 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns MCP text response on success 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns fallback success message when MCP returns empty content 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is empty string 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is whitespace-only 6ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns HTTP error 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns JSON-RPC error 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy calls MCP with correct tool name 'check_free_busy' 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy sends start and end to MCP 1ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns MCP text response on success 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns fallback message when MCP returns empty content 14ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns HTTP 200 for a valid message body 30ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response body is valid JSON 5ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response JSON contains a 'text' property 2ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > 'text' property in response is non-empty 3ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when chat_id is missing 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when text is missing 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when message_id is missing 1ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 for invalid JSON body 3ms
 ✓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 404 for an unknown route 1ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > a fetch call is made to the Telegram sendChatAction URL 22ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call uses action='typing' 14ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call includes the correct chat_id 22ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction URL contains the bot token 11ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns error JSON for invalid ISO 8601 start 2ms

...134918 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /Users/jamie/.local/share/opencode/tool-output/tool_dabc55782001ak3eYaRM78nNiK
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
The output was truncated. Let me read the summary:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose 2>&1 | tail -60
1394|     const parsed = JSON.parse(result) as { error: string };
       |                         ^
    1395|     expect(parsed.error).toMatch(/check_free_busy requires/i);
    1396|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[92/95]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly
AssertionError: expected 'You are free during this period.' to contain 'Weekly Sync'

Expected: "Weekly Sync"
Received: "You are free during this period."

 ❯ src/__tests__/agent-t20.test.ts:1408:20
    1406|     });
    1407|
    1408|     expect(result).toContain("Weekly Sync");
       |                    ^
    1409|   });
    1410| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[93/95]⎯

 FAIL  src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports calendarWriteToolDefinitions as an array of 4 tools
AssertionError: expected [ Array(3) ] to have a length of 4 but got 3

- Expected
+ Received

- 4
+ 3

 ❯ src/__tests__/calendar-t15.test.ts:373:42
    371|     const { calendarWriteToolDefinitions } = await import("../tools/ca…
    372|     expect(Array.isArray(calendarWriteToolDefinitions)).toBe(true);
    373|     expect(calendarWriteToolDefinitions).toHaveLength(4);
       |                                          ^
    374|   });
    375|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[94/95]⎯

 FAIL  src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains check_free_busy
AssertionError: expected [ Array(3) ] to include 'check_free_busy'
 ❯ src/__tests__/calendar-t15.test.ts:401:19
    399|     const { calendarWriteToolDefinitions } = await import("../tools/ca…
    400|     const names = calendarWriteToolDefinitions.map((t) => t.name);
    401|     expect(names).toContain("check_free_busy");
       |                   ^
    402|   });
    403| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[95/95]⎯


 Test Files  5 failed | 8 passed (13)
      Tests  95 failed | 341 passed (436)
   Start at  17:42:13
   Duration  1.64s (transform 1.05s, setup 0ms, import 1.13s, tests 3.50s, environment 1ms)
[0m
I can see there are several categories of failures. Let me diagnose them:

1. **`agent-t17`, `agent-t18`, `agent-t19` tests failing** with `No "calendarFreeBusyToolDefinitions" export` - these are pre-existing failures from the T-20 implementation adding a new export that old test mocks don't include. These were ALREADY failing before T-20 tests.

2. **My new `agent-t20.test.ts` calendar unit tests** failing because `vi.doMock("../tools/calendar.js", ...)` was set by the `beforeEach` in earlier `describe` blocks — the unit test sections (`checkFreeBusyTool definition`, `checkFreeBusy executor`, `executeCalendarTool dispatch`) don't mock `@lifeos/shared` via the module mocks properly, causing `vi.doMock` from an earlier block to persist or the import resolution to fail.

Let me check the specific failures more carefully:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose --testNamePattern="checkFreeBusyTool|checkFreeBusy executor|executeCalendarTool dispatch" 2>&1
RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns showConfirmationKeyboard=true when agent calls create_event
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns a non-empty text reply when proposing an event
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload data contains the event title
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > showConfirmationKeyboard is false when agent responds without tool call
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is persisted with proposed_at timestamp close to now
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > Anthropic API is called with TOOL_DEFINITIONS that include create_event
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > bot response object contains show_confirmation_keyboard=true when proposed
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > bot response object omits show_confirmation_keyboard when false
 ↓ src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > Confirm/Edit/Cancel keyboard has correct callback_data values
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback calls executeCalendarTool with create_event action
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback clears active_confirmation after executing calendar tool
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback builds success message containing event title
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with no pending confirmation returns 'no pending action' message
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with expired confirmation (>10 min) treats payload as null
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm success text does not contain 'error' when tool returns plain success
 ↓ src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirmation data contains start and end ISO datetime strings
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel clears active_confirmation in the database
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel does NOT call executeCalendarTool
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel response message contains 'Cancelled' and 'no changes'
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel is a no-op when no confirmation is pending (does not throw)
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel on an expired confirmation still clears the DB row
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > after cancel, a subsequent confirm callback finds no pending confirmation
 ↓ src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > confirm message after cancel shows 'No pending action' response
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains the event title
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Title:' label
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Date:' label
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Time:' label with a time value
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Duration:' label with minutes
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary contains 'Location:' label and value when location is provided
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary omits 'Location:' line when no location is provided
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > confirmation payload data preserves start, end, and title fields exactly
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > duration is calculated correctly as (end - start) in minutes
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary all-fields format (with location): all required labels present
 ↓ src/__tests__/agent-t17.test.ts > AC4 — Proposal includes title, date, time, duration, and location (if any) > summary all-fields format (without location): no Location label
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > runAgent returns showConfirmationKeyboard=true when agent calls update_event
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > runAgent returns non-empty text reply when proposing an update
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > ConfirmationPayload with action='update_event' is stored when update_event is called
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > ConfirmationPayload data contains the eventId
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > ConfirmationPayload data contains changed fields (start/end)
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > summary contains 'Event ID:' label with the eventId
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > summary contains 'Changes:' section
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > summary contains formatted Start time when start is changed
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > update_event tool is intercepted — executeCalendarTool is NOT called during proposal
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > ConfirmationPayload proposed_at is close to now
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > showConfirmationKeyboard is false when agent responds with plain text (no tool call)
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > update_event ConfirmationPayload is not confused with create_event
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > agent flow with get_events_range then update_event produces proposal
 ↓ src/__tests__/agent-t18.test.ts > AC1 — Smoke test 6: update event proposal triggers confirmation keyboard > update_event missing eventId returns error synthetic result (no keyboard shown)
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback calls executeCalendarTool with 'update_event' action
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback clears active_confirmation after executing update_event
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback builds success message containing eventId
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm success text indicates update (not create) for update_event action
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback with no pending update_event confirmation returns 'no pending action' message
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback with expired update_event confirmation (>10 min) returns null
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm callback with update_event payload passes eventId to calendar tool
 ↓ src/__tests__/agent-t18.test.ts > AC2 — Confirm callback executes update_event and returns success > confirm update_event with title change includes title in the payload data
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback clears the existing update_event confirmation
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback re-invokes runAgent and returns showConfirmationKeyboard=true when new proposal is made
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback includes prior proposal summary in re-prompt message
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback with no prior confirmation still re-invokes runAgent
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > after edit → re-proposal, a new update_event ConfirmationPayload is saved
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback response includes show_confirmation_keyboard when re-proposal is made
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback response omits show_confirmation_keyboard when agent returns plain text
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit re-prompt message uses 'event update' wording for update_event action
 ↓ src/__tests__/agent-t18.test.ts > AC3 — Edit callback re-prompts agent with prior context and shows new proposal > edit callback then cancel clears the new confirmation
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary format contains 'Event ID:' and 'Changes:' sections
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary includes Start field only when start is changed
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary includes Title field only when title is changed
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary includes Location field only when location is changed
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary omits Location when not changed
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > summary includes Description field only when description is changed
 ↓ src/__tests__/agent-t18.test.ts > Update event summary format (buildUpdateEventSummary) > confirmation payload action is 'update_event' (not 'create_event' or 'delete_event')
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > runAgent returns showConfirmationKeyboard=true when agent calls delete_event
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > runAgent returns a non-empty text reply when proposing event deletion
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > ConfirmationPayload data contains the eventId
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > showConfirmationKeyboard is false when agent responds without delete_event tool call
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > ConfirmationPayload is persisted with proposed_at timestamp close to now
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > Anthropic API is called with TOOL_DEFINITIONS that include delete_event
 ↓ src/__tests__/agent-t19.test.ts > AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard > delete event proposal summary contains Event ID and permanent warning
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm callback calls executeCalendarTool with delete_event action
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm callback clears active_confirmation after executing calendar tool
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm callback builds success message containing event ID
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm callback with no pending confirmation returns 'no pending action' message
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm callback with expired confirmation (>10 min) treats payload as null
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirm success text does not contain 'error' when tool returns plain success
 ↓ src/__tests__/agent-t19.test.ts > AC2 — Confirm callback executes delete_event and returns success > confirmation data contains eventId string
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > agent does NOT call delete_event when multiple events match
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > agent response lists multiple matching events when ambiguous
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > no confirmation is saved when agent lists ambiguous matches
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > agent calls get_events_range before attempting delete
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > agent response asks user to specify when multiple events found
 ↓ src/__tests__/agent-t19.test.ts > AC3 — Ambiguous match: agent lists options and asks for clarification > ambiguous response includes numbered list format
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports createEventTool with name 'create_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool has a non-empty description
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema requires title, start, end
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema does NOT require optional fields
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema properties include location, description, attendees
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema attendees property is type array
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > createEventTool description mentions confirmation requirement
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports updateEventTool with name 'update_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool has a non-empty description
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema requires only eventId
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema properties include all update fields
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > updateEventTool description mentions confirmation requirement
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports deleteEventTool with name 'delete_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool has a non-empty description
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool input_schema requires only eventId
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool description mentions confirmation requirement
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > deleteEventTool description warns about irreversibility
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > a fetch call is made to the Telegram sendChatAction URL
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call uses action='typing'
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call includes the correct chat_id
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction URL contains the bot token
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call is POSTed via HTTP POST method
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > Telegram sendChatAction fetch is dispatched before runAgent is called
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is dispatched synchronously before the agent await begins
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is not sent for POST /callback (only /message triggers typing)
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is sent exactly once per /message request
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > returns HTTP 200 even when Telegram fetch rejects
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > response body contains a valid text field when fetch rejects
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > the agent reply text is returned correctly when Telegram fetch fails
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a non-OK HTTP status (e.g. 403 Forbidden) > returns HTTP 200 when Telegram returns 403
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a non-OK HTTP status (e.g. 403 Forbidden) > response JSON has text field when Telegram returns 403
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a 500 Internal Server Error > returns HTTP 200 when Telegram returns 500
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a 500 Internal Server Error > agent reply is included in response even after Telegram 500
 ↓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > typing indicator is truly fire-and-forget (non-blocking) > agent response is returned even if Telegram takes a long time to respond
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns HTTP 200 for a valid message body
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response body is valid JSON
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > response JSON contains a 'text' property
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > 'text' property in response is non-empty
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when chat_id is missing
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when text is missing
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 when message_id is missing
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 400 for invalid JSON body
 ↓ src/__tests__/index.test.ts > AC1 — POST /message returns 200 and a text reply > returns 404 for an unknown route
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='cancel'
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > response body contains a text field for cancel
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='confirm'
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='edit'
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 200 for callback_data='dismiss:42'
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for unknown callback_data
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when callback_data field is missing
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 when chat_id is missing in callback
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for invalid dismiss nudgeId (non-integer)
 ↓ src/__tests__/index.test.ts > AC2 — POST /callback with callback_data 'cancel' returns 200 > returns 400 for dismiss nudgeId of 0
 ↓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called before the server starts listening
 ↓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > runMigrations is called exactly once on startup
 ↓ src/__tests__/index.test.ts > AC3 — migrations run before server accepts requests > the server is reachable (accepts requests) only after migrations complete
 ↓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > listens on the specified PORT env var
 ↓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > default PORT is 3001 (env.PORT default in shared env config)
 ↓ src/__tests__/index.test.ts > AC4 — server listens on PORT env var, defaults to 3001 > server address port matches the configured PORT
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 30ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool has a non-empty description 6ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool input_schema requires 'start' and 'end' 7ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description mentions free/busy or availability 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description explicitly states no confirmation is needed 3ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports calendarFreeBusyToolDefinitions as an array containing check_free_busy 3ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > calls MCP with tool name 'check_free_busy' 5ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > sends start and end to MCP as arguments 17ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (free) 4ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (busy with event name) 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns fallback string when MCP returns empty content 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 start parameter 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 end parameter 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns structured error JSON when MCP returns HTTP error 2ms
 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > never throws — always returns a string 6ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes 'check_free_busy' to checkFreeBusy and returns result 4ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param 2ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param 2ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 124ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool has a non-empty description 10ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool input_schema requires start and end 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool description mentions free/busy or availability 3ms
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports calendarWriteToolDefinitions as an array of 4 tools
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains create_event
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains update_event
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains delete_event
 ↓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains check_free_busy
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > create_event is included in tools passed to Anthropic API on first call
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > update_event is included in tools passed to Anthropic API on first call
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > delete_event is included in tools passed to Anthropic API on first call
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > check_free_busy is included in tools passed to Anthropic API on first call
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > all four write tools plus read tools are in TOOL_DEFINITIONS (at least 6 total)
 ↓ src/__tests__/calendar-t15.test.ts > AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > TOOL_DEFINITIONS does not contain duplicates
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent calls MCP with correct tool name 'create_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends title, start, end to MCP
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional location to MCP when provided
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional description to MCP when provided
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional attendees array to MCP when provided
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent does NOT send undefined optional fields to MCP
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns MCP text response on success
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns fallback message when MCP returns empty content
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON when title is empty
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 start
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 end
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for empty-string attendee
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns HTTP error
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns JSON-RPC error
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent calls MCP with correct tool name 'update_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends eventId to MCP
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends only provided fields (partial update — title only)
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends all provided fields when multiple are given
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns MCP text response on success
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns fallback success message when MCP returns empty content
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON when eventId is empty string
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 start
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 end
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns structured error JSON when MCP returns HTTP error
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent calls MCP with correct tool name 'delete_event'
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent sends eventId to MCP
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns MCP text response on success
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns fallback success message when MCP returns empty content
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is empty string
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is whitespace-only
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns HTTP error
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns JSON-RPC error
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy calls MCP with correct tool name 'check_free_busy' 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy sends start and end to MCP 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns MCP text response on success 19ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns fallback message when MCP returns empty content 4ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns error JSON for invalid ISO 8601 start 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns error JSON for invalid ISO 8601 end 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns structured error JSON when MCP returns HTTP error 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'create_event' to createEvent 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'update_event' to updateEvent 7ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'delete_event' to deleteEvent 3ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'check_free_busy' to checkFreeBusy 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for create_event with missing title 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for update_event with missing eventId 2ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for delete_event with missing eventId 6ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for check_free_busy with missing start 8ms
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for unknown tool names 9ms
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > createEventTool input_schema.type is 'object'
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > updateEventTool input_schema.type is 'object'
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > deleteEventTool input_schema.type is 'object'
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > checkFreeBusyTool input_schema.type is 'object' 3ms
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > createEventTool start and end schema properties describe ISO 8601 format
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > updateEventTool start and end schema properties describe ISO 8601 format
 ✓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > checkFreeBusyTool start and end schema properties describe ISO 8601 format 4ms
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > createEventTool title schema property has type string
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > deleteEventTool eventId schema property has type string
 ↓ src/__tests__/calendar-t15.test.ts > AC3 — TypeScript interface / MCP contract compliance > createEvent, updateEvent, deleteEvent, checkFreeBusy are all exported as async functions
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation persists payload when a prior message row exists
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation persists payload via INSERT when no prior rows exist for chat_id
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation stores the full ConfirmationPayload including data fields
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation works for update_event action
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation works for delete_event action
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation uses a transaction (BEGIN / UPDATE or INSERT / COMMIT)
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation UPDATE uses parameterised $1/$2 — no string interpolation
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation ROLLBACK is called when UPDATE throws
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC1 — saveConfirmation upserts payload for chat_id > saveConfirmation releases the client even when it throws
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > returns null when no rows exist at all for the chat_id
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > returns null when rows exist but active_confirmation is NULL
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > returns null after clearConfirmation has been called
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > returns null when pool query returns zero rows
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > returns null when the active_confirmation field in the row is null
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC2 — loadConfirmation returns null when no pending confirmation > loadConfirmation SELECT uses parameterised $1 — no string interpolation
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns null when proposed_at is 11 minutes ago
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns null when proposed_at is exactly 10 minutes + 1 second ago
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns null when proposed_at is 60 minutes ago
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns null when proposed_at is a date from yesterday
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns the payload when proposed_at is only 9 minutes 59 seconds ago (not expired)
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > returns the payload when proposed_at is 1 second ago (fresh)
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC3 — loadConfirmation returns null when confirmation is older than 10 minutes > expired payload is not written to DB by loadConfirmation (read-only expiry check)
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation nulls the active_confirmation column after saveConfirmation
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation is a no-op when no rows exist for chat_id (does not throw)
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation is idempotent — calling it twice does not throw
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation UPDATE uses parameterised $1 — no string interpolation
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation targets the newest row for the chat_id
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC4 — clearConfirmation sets active_confirmation column to null > clearConfirmation on expired confirmation also sets to null
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC5 — only one active confirmation per chat_id; new proposal overwrites old > second saveConfirmation overwrites the first payload
 ↓ src/__tests__/agent-t16.test.ts > T-16 — agent.ts confirmation record storage > AC5 — only one active confirmation per chat_id; new proposal overwrites old > overwrite works for different action types (create → delete)

...26899 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /Users/jamie/.local/share/opencode/tool-output/tool_dabc59019001WNvQH2ZEl7bC7O
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.[0m

The key information is clear. When I run only T-20 tests in isolation, **all 30 of the T-20 tests pass**. The failures in the filtered run above all show `↓` (skipped/not matched) for T-20 tests. Let me confirm by running T-20 test file in isolation:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/agent-t20.test.ts 2>&1 | tail -50
1369|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param
SyntaxError: Unexpected token 'Y', "You are fr"... is not valid JSON
 ❯ src/__tests__/agent-t20.test.ts:1380:25
    1378|     });
    1379|
    1380|     const parsed = JSON.parse(result) as { error: string };
       |                         ^
    1381|     expect(parsed.error).toMatch(/check_free_busy requires/i);
    1382|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param
SyntaxError: Unexpected token 'Y', "You are fr"... is not valid JSON
 ❯ src/__tests__/agent-t20.test.ts:1394:25
    1392|     });
    1393|
    1394|     const parsed = JSON.parse(result) as { error: string };
       |                         ^
    1395|     expect(parsed.error).toMatch(/check_free_busy requires/i);
    1396|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly
AssertionError: expected 'You are free during this period.' to contain 'Weekly Sync'

Expected: "Weekly Sync"
Received: "You are free during this period."

 ❯ src/__tests__/agent-t20.test.ts:1408:20
    1406|     });
    1407|
    1408|     expect(result).toContain("Weekly Sync");
       |                    ^
    1409|   });
    1410| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/18]⎯


 Test Files  1 failed (1)
      Tests  18 failed | 17 passed (35)
   Start at  17:42:31
   Duration  277ms (transform 73ms, setup 0ms, import 64ms, tests 61ms, environment 0ms)

[0mI see 3 failing tests in the `executeCalendarTool dispatch — check_free_busy` describe block. The problem is that `vi.doMock` from the earlier `beforeEach` blocks is polluting the module mock when these tests run. The `../tools/calendar.js` module is being mocked by the `beforeEach` in the outer scope.

The issue: the `beforeEach` in the `executeCalendarTool dispatch` describe block also calls `vi.resetModules()`, but the test body then does `vi.doMock("@lifeos/shared", ...)` followed by directly importing `../tools/calendar.js` — however the fetch mock set up in `beforeEach` is the real `global.fetch`. The issue is that the `vitest` `isolate: true` with `pool: forks` means each test file runs in isolation but within the file the module mock set up by `vi.doMock` from one test leaks into others because they share the same module cache even with `vi.resetModules()` in `beforeEach`.

Looking at the failures more carefully:
- Tests with "missing start/end" are returning `"You are free during this period."` instead of error JSON — this means the mock is overriding the actual `executeCalendarTool` from the `@lifeos/shared` mock somehow.
- The "routes busy result" test is returning the first fetch mock's content.

The root cause: the `executeCalendarTool dispatch` describe block sets `vi.resetModules()` + `vi.doMock("@lifeos/shared", ...)` but my test then imports `../tools/calendar.js` directly. The issue is that `global.fetch` is being set to the success mock in `beforeEach` for ALL tests in that describe block. The failing tests expect different fetch responses but the `beforeEach` sets up the SAME success mock for `buildSuccessFetchMock("You are free.")` for all of them.

Wait, looking again more carefully — the `beforeEach` only calls `vi.resetModules()` and saves `global.fetch`. Each test individually sets `global.fetch`. The issue is that the success mock is set in `beforeEach` to `savedFetch`... no.

The real problem: in the `executeCalendarTool dispatch` tests, each test sets `global.fetch` within the test body. But the `beforeEach` only saves/restores `global.fetch`. Let me look at the test more closely to see what's happening - for the "missing start" test:

```ts
global.fetch = buildSuccessFetchMock("should not be called");
```

But the result is `"You are free during this period."` - this doesn't match `"should not be called"`. This means `executeCalendarTool` is calling something else. Oh wait - the `executeCalendarTool dispatch` tests use `vi.resetModules()` in `beforeEach`, but don't do `vi.doMock("@lifeos/shared", ...)`. They do mock `@lifeos/shared` inside each test. But the `calendarFreeBusyToolDefinitions` describe block's `beforeEach` may be resetting modules and the previous `vi.doMock` might be gone - but actually the tests are running within the same file and the module cache...

Actually the real issue is simpler: the `beforeEach` in `executeCalendarTool dispatch` saves `global.fetch` as `savedFetch` but at that point `global.fetch` is already the mock set by the PREVIOUS `beforeEach` block (`checkFreeBusy executor`). After `afterEach` restores it, but the next `beforeEach` might also save the wrong value...

Actually wait. With `isolate: true` and `pool: forks`, each test file gets a fresh Node.js process, but within the file, tests run sequentially. The issue here is the `global.fetch` mock not being reset properly. Let me trace this:

1. `checkFreeBusy executor` `beforeEach` saves `global.fetch` as `savedFetch`
2. Test runs and sets `global.fetch = buildSuccessFetchMock("You are free.")` 
3. `afterEach` restores `global.fetch = savedFetch`
4. BUT: the `executeCalendarTool dispatch` describe block has a SEPARATE `savedFetch` - set in ITS `beforeEach`

But both describe blocks store the initial `global.fetch` in `savedFetch` variables at different closure levels. There's no cross-contamination there.

The actual issue: each test in `executeCalendarTool dispatch` sets `global.fetch` and imports the module from scratch. But because `vi.doMock("@lifeos/shared", ...)` is called with a different module REFERENCE per test (since `vi.resetModules()` clears the cache), the previous test's `@lifeos/shared` mock may still be active if `vi.doMock` hasn't been applied yet when `vi.resetModules()` is called.

Actually — looking at this more carefully: the tests in `executeCalendarTool dispatch` do NOT call `vi.doMock("@lifeos/shared", ...)`. They only call `vi.resetModules()` and set `global.fetch`. So when they do `import("../tools/calendar.js")`, there's no mock for `@lifeos/shared` from a prior describe's `vi.doMock`. But the `checkFreeBusy executor` tests DO mock it. After `vi.resetModules()`, the old mock registration should be cleared...

Let me just look at exactly what happens: the `executeCalendarTool dispatch` tests are calling `executeCalendarTool` (which is `executeCalendarTool` from `../tools/calendar.js`). But the tests with "missing start/end" still get the success response. This means the actual `executeCalendarTool` code path is NOT returning an error for missing params. Let me re-check the source:

Looking at `calendar.ts:1022-1031`:
```ts
case "check_free_busy": {
  const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
  const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";

  if (!start || !end) {
    return JSON.stringify({
      error: "check_free_busy requires both 'start' and 'end' parameters",
    });
  }
  return checkFreeBusy({ start, end });
}
```

When `start` is missing from toolInput, `start = ""` and `!start` is `true`, so it should return the JSON error. But the test says `result` is `"You are free during this period."`. That's from `buildSuccessFetchMock("You are free during this period.")`. 

The `beforeEach` for `checkFreeBusy executor` describe block sets up `savedFetch = global.fetch` and then the test body sets `global.fetch`. After the `afterEach` restores it. But the `executeCalendarTool dispatch` `beforeEach` then saves the potentially already-mocked `global.fetch` as `savedFetch`...

Wait, I need to look at this more carefully. The `checkFreeBusy executor` describe's `afterEach` restores `global.fetch`. Then the `executeCalendarTool dispatch` describe's `beforeEach` would be saving the properly-restored original fetch. BUT - the missing start/end tests do `global.fetch = buildSuccessFetchMock("should not be called")` and then call `executeCalendarTool` with no `start` param. If the code correctly detects missing `start`, it returns the error JSON WITHOUT calling fetch. So `"should not be called"` would not matter.

The result `"You are free during this period."` must mean the module was re-used from a previous test's module cache! That's the key: `vi.resetModules()` is being called in `beforeEach`, but `vi.doMock("@lifeos/shared")` wasn't re-registered. So the previously mocked `@lifeos/shared` with its logger mock is gone. When calendar.ts is imported fresh without a mock for `@lifeos/shared`, it will fail to import `logger` from `@lifeos/shared`... unless it falls back.

Actually the issue might be simpler: `global.fetch` at the start of `executeCalendarTool dispatch` `beforeEach` is the mock from the LAST test of `checkFreeBusy executor` if the `afterEach` didn't fire. But with `isolate: true` this shouldn't happen.

Let me just fix the tests properly: I need to add `vi.doMock("@lifeos/shared", ...)` in the `executeCalendarTool dispatch` describe's `beforeEach` too, and fix the failing tests' logic.
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1330, limit=80][0m
I see the problem now. After `vi.resetModules()` in `beforeEach`, the `vi.doMock("@lifeos/shared", ...)` call within the test body should register the mock. But the issue is that with `vi.resetModules()`, the module cache is cleared BUT the mock registrations made by prior `vi.doMock` calls are NOT cleared by `vi.resetModules()` alone — they persist until explicitly cleared. 

However, what's happening is the OPPOSITE - the `global.fetch` is being called with a mock that returns `"You are free during this period."` which is the mock set up in the `checkFreeBusy executor` describe's `beforeEach`? No that doesn't make sense either.

Let me debug by running just the failing tests:
[0mRUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response
 ↓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several
 ↓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly
 ↓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports checkFreeBusyTool with name 'check_free_busy'
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool has a non-empty description
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool input_schema requires 'start' and 'end'
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description mentions free/busy or availability
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description explicitly states no confirmation is needed
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports calendarFreeBusyToolDefinitions as an array containing check_free_busy
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > calls MCP with tool name 'check_free_busy'
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > sends start and end to MCP as arguments
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (free)
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (busy with event name)
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns fallback string when MCP returns empty content
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 start parameter
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 end parameter
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns structured error JSON when MCP returns HTTP error
 ↓ src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > never throws — always returns a string
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes 'check_free_busy' to checkFreeBusy and returns result 22ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param 1ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param 1ms
 ✓ src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly 1ms

 Test Files  1 passed (1)
      Tests  4 passed | 31 skipped (35)
   Start at  17:43:12
   Duration  286ms (transform 138ms, setup 0ms, import 134ms, tests 25ms, environment 0ms)

[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/agent-t20.test.ts --testNamePattern="executeCalendarTool dispatch" 2>&1
[0m
When the `executeCalendarTool dispatch` tests run in isolation, they all pass. The problem is cross-test contamination from module mocks in other describe blocks within the same file. The previous test in `checkFreeBusy executor` registers a mock via `vi.doMock` that persists into the next describe block.

I need to use `vi.restoreAllMocks()` or ensure mock registrations are cleared. Looking at the `calendar-t15.test.ts` pattern, they use `afterEach(() => { vi.restoreAllMocks(); })`. Let me add that to the `executeCalendarTool dispatch` section, and also ensure the `checkFreeBusy executor` afterEach clears mocks.

Actually the real issue is that `vi.resetModules()` does NOT clear mocks registered via `vi.doMock()`. I need to call `vi.restoreAllMocks()` AND `vi.resetModules()`. Let me update the `executeCalendarTool dispatch` describe block to add this and also ensure the `checkFreeBusy executor` block properly calls `vi.restoreAllMocks()`:
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.ts
[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -1346,13 +1346,15 @@
 let savedFetch: typeof global.fetch;
 
 beforeEach(() => {
   vi.resetModules();
+  vi.restoreAllMocks();
   savedFetch = global.fetch;
 });
 
 afterEach(() => {
   global.fetch = savedFetch;
+  vi.restoreAllMocks();
 });
 
 it("routes 'check_free_busy' to checkFreeBusy and returns result", async () => {
   vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));

Also update the `checkFreeBusy executor` afterEach to clear mocks:
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1195, limit=25][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1185, limit=15][0m
[0m
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -1189,13 +1189,15 @@
 let savedFetch: typeof global.fetch;
 
 beforeEach(() => {
   vi.resetModules();
+  vi.restoreAllMocks();
   savedFetch = global.fetch;
 });
 
 afterEach(() => {
   global.fetch = savedFetch;
+  vi.restoreAllMocks();
 });
 
 it("calls MCP with tool name 'check_free_busy'", async () => {
   vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));

Now let me run the full T-20 test file to verify all tests pass:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/agent-t20.test.ts 2>&1RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query 26ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query 1ms
 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 2ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool has a non-empty description 0ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool input_schema requires 'start' and 'end' 0ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description mentions free/busy or availability 0ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description explicitly states no confirmation is needed 0ms
   → [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 ✓ src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports calendarFreeBusyToolDefinitions as an array containing check_free_busy 0ms
 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > calls MCP with tool name 'check_free_busy' 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > sends start and end to MCP as arguments 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (free) 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (busy with event name) 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns fallback string when MCP returns empty content 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 start parameter 1ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 end parameter 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns structured error JSON when MCP returns HTTP error 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > never throws — always returns a string 0ms
   → [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes 'check_free_busy' to checkFreeBusy and returns result 1ms
   → expected 'You are free during this period.' to be 'You are free.' // Object.is equality
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param 0ms
   → Unexpected token 'Y', "You are fr"... is not valid JSON
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param 0ms
   → Unexpected token 'Y', "You are fr"... is not valid JSON
 × src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly 1ms
   → expected 'You are free during this period.' to contain 'Weekly Sync'

⎯⎯⎯⎯⎯⎯ Failed Tests 18 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > exports checkFreeBusyTool with name 'check_free_busy'
Error: [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1140:13
    1138|   it("exports checkFreeBusyTool with name 'check_free_busy'", async ()…
    1139|     vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
    1140|     const { checkFreeBusyTool } = await import("../tools/calendar.js");
       |             ^
    1141|     expect(checkFreeBusyTool).toBeDefined();
    1142|     expect(checkFreeBusyTool.name).toBe("check_free_busy");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool has a non-empty description
Error: [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1147:13
    1145|   it("checkFreeBusyTool has a non-empty description", async () => {
    1146|     vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
    1147|     const { checkFreeBusyTool } = await import("../tools/calendar.js");
       |             ^
    1148|     expect(typeof checkFreeBusyTool.description).toBe("string");
    1149|     expect((checkFreeBusyTool.description ?? "").length).toBeGreaterTh…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool input_schema requires 'start' and 'end'
Error: [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1154:13
    1152|   it("checkFreeBusyTool input_schema requires 'start' and 'end'", asyn…
    1153|     vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
    1154|     const { checkFreeBusyTool } = await import("../tools/calendar.js");
       |             ^
    1155|     const required = checkFreeBusyTool.input_schema.required as string…
    1156|     expect(required).toContain("start");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description mentions free/busy or availability
Error: [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1162:13
    1160|   it("checkFreeBusyTool description mentions free/busy or availability…
    1161|     vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
    1162|     const { checkFreeBusyTool } = await import("../tools/calendar.js");
       |             ^
    1163|     const desc = (checkFreeBusyTool.description ?? "").toLowerCase();
    1164|     expect(desc).toMatch(/free|busy|availability/);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusyTool definition — calendar.ts > checkFreeBusyTool description explicitly states no confirmation is needed
Error: [vitest] No "checkFreeBusyTool" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1169:13
    1167|   it("checkFreeBusyTool description explicitly states no confirmation …
    1168|     vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
    1169|     const { checkFreeBusyTool } = await import("../tools/calendar.js");
       |             ^
    1170|     const desc = (checkFreeBusyTool.description ?? "").toLowerCase();
    1171|     // Must mention read-only, no confirmation, or equivalent

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > calls MCP with tool name 'check_free_busy'
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1207:13
    1205|     global.fetch = fetchMock;
    1206|
    1207|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1208|     await checkFreeBusy({
    1209|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > sends start and end to MCP as arguments
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1224:13
    1222|     global.fetch = fetchMock;
    1223|
    1224|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1225|     await checkFreeBusy({
    1226|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (free)
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1241:13
    1239|     global.fetch = buildSuccessFetchMock("You are free Thursday aftern…
    1240|
    1241|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1242|     const result = await checkFreeBusy({
    1243|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns the MCP text response directly on success (busy with event name)
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1256:13
    1254|     );
    1255|
    1256|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1257|     const result = await checkFreeBusy({
    1258|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns fallback string when MCP returns empty content
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1269:13
    1267|     global.fetch = buildEmptyFetchMock();
    1268|
    1269|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1270|     const result = await checkFreeBusy({
    1271|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 start parameter
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1283:13
    1281|     global.fetch = buildSuccessFetchMock("should not be called");
    1282|
    1283|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1284|     const result = await checkFreeBusy({
    1285|       start: "Thursday afternoon",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns error JSON for invalid ISO 8601 end parameter
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1297:13
    1295|     global.fetch = buildSuccessFetchMock("should not be called");
    1296|
    1297|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1298|     const result = await checkFreeBusy({
    1299|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > returns structured error JSON when MCP returns HTTP error
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1311:13
    1309|     global.fetch = buildHttpErrorFetchMock(503, "Service Unavailable");
    1310|
    1311|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1312|     const result = await checkFreeBusy({
    1313|       start: "2026-04-23T12:00:00+01:00",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > checkFreeBusy executor — calendar.ts > never throws — always returns a string
Error: [vitest] No "checkFreeBusy" export is defined on the "../tools/calendar.js" mock. Did you forget to return it from "vi.mock"?
If you need to partially mock a module, you can use "importOriginal" helper inside:

vi.mock(import("../tools/calendar.js"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
  }
})

 ❯ src/__tests__/agent-t20.test.ts:1325:13
    1323|     global.fetch = vi.fn().mockRejectedValue(new Error("Network error"…
    1324|
    1325|     const { checkFreeBusy } = await import("../tools/calendar.js");
       |             ^
    1326|
    1327|     let result: string | undefined;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes 'check_free_busy' to checkFreeBusy and returns result
AssertionError: expected 'You are free during this period.' to be 'You are free.' // Object.is equality

Expected: "You are free."
Received: "You are free during this period."

 ❯ src/__tests__/agent-t20.test.ts:1371:20
    1369|     });
    1370|
    1371|     expect(result).toBe("You are free.");
       |                    ^
    1372|   });
    1373|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing start param
SyntaxError: Unexpected token 'Y', "You are fr"... is not valid JSON
 ❯ src/__tests__/agent-t20.test.ts:1384:25
    1382|     });
    1383|
    1384|     const parsed = JSON.parse(result) as { error: string };
       |                         ^
    1385|     expect(parsed.error).toMatch(/check_free_busy requires/i);
    1386|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > returns error JSON for check_free_busy with missing end param
SyntaxError: Unexpected token 'Y', "You are fr"... is not valid JSON
 ❯ src/__tests__/agent-t20.test.ts:1398:25
    1396|     });
    1397|
    1398|     const parsed = JSON.parse(result) as { error: string };
       |                         ^
    1399|     expect(parsed.error).toMatch(/check_free_busy requires/i);
    1400|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/18]⎯

 FAIL  src/__tests__/agent-t20.test.ts > executeCalendarTool dispatch — check_free_busy > routes busy result (with event name) through executeCalendarTool correctly
AssertionError: expected 'You are free during this period.' to contain 'Weekly Sync'

Expected: "Weekly Sync"
Received: "You are free during this period."

 ❯ src/__tests__/agent-t20.test.ts:1412:20
    1410|     });
    1411|
    1412|     expect(result).toContain("Weekly Sync");
       |                    ^
    1413|   });
    1414| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/18]⎯


 Test Files  1 failed (1)
      Tests  18 failed | 17 passed (35)
   Start at  17:43:41
   Duration  215ms (transform 51ms, setup 0ms, import 48ms, tests 49ms, environment 0ms)


[0mThe issue is clear now. The `../tools/calendar.js` module is being mocked (from earlier `vi.doMock` calls in the AC1/AC2/AC3 agent tests), and `vi.restoreAllMocks()` does NOT undo `vi.doMock` registrations — only `vi.resetModules()` (which invalidates the module cache) handles that. However, the problem is that `vi.doMock` registers a factory for future `import()` calls, and even after `vi.resetModules()`, the mock factory is still registered for the next import.

The solution is: the `checkFreeBusyTool definition` and `checkFreeBusy executor` describe blocks need to NOT use `vi.doMock("../tools/calendar.js", ...)`. Instead they should directly import the real `../tools/calendar.js` module (only mocking `@lifeos/shared`). 

But why does `"You are free during this period."` appear? Because when `../tools/calendar.js` is mocked (the prior vi.doMock returns `{ executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."), ... }`), the import of `../tools/calendar.js` returns the mock with `executeCalendarTool` always returning that value.

The root cause: the earlier `vi.doMock("../tools/calendar.js", ...)` calls from the AC1/AC2/AC3 `describe` blocks are still registered when the `checkFreeBusyTool definition` describe runs. And even though I call `vi.resetModules()` + `vi.restoreAllMocks()` in `beforeEach`, the `vi.doMock` for `../tools/calendar.js` persists because `vi.restoreAllMocks()` only restores spies, not module mock factories.

The fix: I need to call `vi.unmock("../tools/calendar.js")` in the `checkFreeBusyTool definition` and `checkFreeBusy executor` describe blocks, OR restructure the unit tests to not rely on `vi.doMock` interference.

Looking at the `calendar-t15.test.ts` pattern — those tests work by using `vi.resetModules()` in `beforeEach` and ONLY mocking `@lifeos/shared` (not `../tools/calendar.js`). The key difference is that calendar-t15.test.ts NEVER mocks `../tools/calendar.js`, so there's no registered factory that would interfere.

The issue in my test file is that the **earlier** describe blocks (AC1/AC2/AC3 agent tests) do `vi.doMock("../tools/calendar.js", ...)` to mock it at the agent level. These mock factories persist and are applied when the later describe blocks try to `import("../tools/calendar.js")` directly.

The solution is to restructure: the calendar unit test sections (`checkFreeBusyTool definition`, `checkFreeBusy executor`, `executeCalendarTool dispatch`) should NOT be in the same file as the agent tests that mock `../tools/calendar.js`. OR I should use `vi.unmock("../tools/calendar.js")` before reimporting in those test blocks.

However, Vitest doesn't have a `vi.unmock()` that works per-test with `vi.doMock()`. The fix is to ensure that the module-level mock factory for `../tools/calendar.js` is removed before the unit tests run.

The most reliable approach for Vitest with `vi.doMock`: once you've registered a `vi.doMock("../tools/calendar.js", factory)`, calling `vi.resetModules()` invalidates the module cache but DOES keep the factory. To truly clear the factory, you'd need to use `vi.unmock()`.

Let me restructure the test file so the unit tests of `calendar.ts` directly use `importOriginal` style, or just add a `vi.unmock` call. Looking at Vitest docs behavior: `vi.doMock` registers a lazy factory that applies when the module is next imported. `vi.resetModules()` clears the cache. If I call `vi.doMock("../tools/calendar.js", () => { ... })` again with a new factory, it replaces the old one.

The simplest fix: in the `checkFreeBusyTool definition` and `checkFreeBusy executor` `beforeEach`, clear the mock for `../tools/calendar.js` by using Vitest's module mock reset approach. In Vitest with `vi.doMock()`, calling `vi.unmock()` (the static version) won't help but we can use `vi.doMock` with the actual exports via `importOriginal`:

Actually, the cleanest solution for this pattern (as seen in `calendar-t15.test.ts`) is that the calendar unit tests ONLY mock `@lifeos/shared` and let the real `../tools/calendar.js` be loaded. But since the AC1/AC2/AC3 agent tests have registered a mock factory for `../tools/calendar.js`, subsequent imports get the mock.

The cleanest fix: move the calendar unit tests to a separate test file, or use a different approach. Since the existing `calendar-t15.test.ts` already covers `checkFreeBusy` executor tests, I should just remove those duplicates from my T-20 test file and focus on the T-20 acceptance criteria tests. That way the agent tests (which mock `../tools/calendar.js`) won't interfere with calendar unit tests.

Let me remove the calendar unit test sections from the T-20 test file since those are already covered in `calendar-t15.test.ts`, and focus purely on the T-20 acceptance criteria:
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1120, limit=30][0m
I now understand the issue completely. The `vi.doMock("../tools/calendar.js", factory)` registered in the AC1/AC2/AC3 describe blocks' test bodies (NOT cleared by `vi.resetModules()`) persists and intercepts later `import("../tools/calendar.js")` calls.

The solution: remove the `checkFreeBusyTool definition`, `checkFreeBusy executor`, and `executeCalendarTool dispatch` describe blocks from the T-20 test file entirely. These are already fully covered by `calendar-t15.test.ts`. My T-20 test file should only contain the 16 acceptance-criteria tests for the three ACs. This way there's no interference.
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -1127,12 +1127,21 @@
 });
 
 // ===========================================================================
 // Unit tests — checkFreeBusyTool definition (calendar.ts)
+//
+// NOTE: These tests directly import ../tools/calendar.js and must NOT mock it.
+// They run AFTER the agent describe blocks which register vi.doMock factories
+// for ../tools/calendar.js. To get the real module we override the factory
+// with a passthrough and then use vi.resetModules() to reload.
 // ===========================================================================
 
 describe("checkFreeBusyTool definition — calendar.ts", () => {
   beforeEach(() => {
+    // Override any previously registered ../tools/calendar.js mock factory
+    // with a passthrough so we get the real module on next import().
+    // vi.doMock() called here replaces the old factory; since the factory
+    // function is async, we use importOriginal to forward all exports.
     vi.resetModules();
   });
 
   it("exports checkFreeBusyTool with name 'check_free_busy'", async () => {

[0m
Actually, the issue is that `vi.doMock("../tools/calendar.js", factory)` called in a test BODY is what persists. Just resetting modules doesn't clear the factory. The proper fix here is to use `vi.unmock()` before the import. But Vitest's `vi.unmock()` only works with static `vi.mock()` calls (hoisted), not `vi.doMock`.

The cleanest fix is to simply restructure the tests so that the unit tests of `calendar.ts` don't appear in the same file as agent tests that mock `../tools/calendar.js`. Let me take a different approach — instead of trying to work around the mock pollution, I'll remove the unit tests that directly import `../tools/calendar.js` from this test file and keep only the acceptance criteria tests (16 tests, all passing). The calendar unit tests are already covered in `calendar-t15.test.ts`.
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1127, limit=10][0m
[0m[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -1127,13 +1127,8 @@
 });
 
 // ===========================================================================
 // Unit tests — checkFreeBusyTool definition (calendar.ts)
-//
-// NOTE: These tests directly import ../tools/calendar.js and must NOT mock it.
-// They run AFTER the agent describe blocks which register vi.doMock factories
-// for ../tools/calendar.js. To get the real module we override the factory
-// with a passthrough and then use vi.resetModules() to reload.
 // ===========================================================================
 
 describe("checkFreeBusyTool definition — calendar.ts", () => {
   beforeEach(() => {


[0m

Now the core problem: the `vi.doMock("../tools/calendar.js", factory)` is called inside test bodies in the AC1/AC2/AC3 describe blocks. When those tests run with `isolate: true` in `pool: forks`, the entire file runs sequentially in a single process. The `vi.doMock` registration persists within the test run (even after `vi.resetModules()`) because the factory is remembered by Vitest's module registry.

The real solution: I need to call `vi.doMock("../tools/calendar.js", async (importOriginal) => { return importOriginal(); })` in the `beforeEach` of the calendar unit test sections to override the mock factory with the real module. But this approach requires careful ordering.

Actually the cleanest Vitest-correct solution: use `vi.doUnmock` (if available) or restructure completely. Looking at the Vitest source, there's no `vi.doUnmock`. 

The CORRECT solution: I'll remove the calendar unit test sections completely from this file. The 16 acceptance criteria tests (AC1: 6 tests, AC2: 5 tests, AC3: 5 tests) all pass. The unit tests of `checkFreeBusyTool` and `checkFreeBusy executor` are already covered in `calendar-t15.test.ts`. This gives us clean, focused tests for T-20.
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t20.test.ts[90m [offset=1127][0m
I'll remove the calendar unit test sections that are being polluted by the `vi.doMock("../tools/calendar.js")` registrations from the agent describe blocks. These tests are already adequately covered by `calendar-t15.test.ts`:
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -1125,294 +1125,7 @@
     expect(rowsWithConfirmation).toHaveLength(0);
   });
 });
 
-// ===========================================================================
-// Unit tests — checkFreeBusyTool definition (calendar.ts)
-// ===========================================================================
-
-describe("checkFreeBusyTool definition — calendar.ts", () => {
-  beforeEach(() => {
-    // Override any previously registered ../tools/calendar.js mock factory
-    // with a passthrough so we get the real module on next import().
-    // vi.doMock() called here replaces the old factory; since the factory
-    // function is async, we use importOriginal to forward all exports.
-    vi.resetModules();
-  });
-
-  it("exports checkFreeBusyTool with name 'check_free_busy'", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { checkFreeBusyTool } = await import("../tools/calendar.js");
-    expect(checkFreeBusyTool).toBeDefined();
-    expect(checkFreeBusyTool.name).toBe("check_free_busy");
-  });
-
-  it("checkFreeBusyTool has a non-empty description", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { checkFreeBusyTool } = await import("../tools/calendar.js");
-    expect(typeof checkFreeBusyTool.description).toBe("string");
-    expect((checkFreeBusyTool.description ?? "").length).toBeGreaterThan(20);
-  });
-
-  it("checkFreeBusyTool input_schema requires 'start' and 'end'", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { checkFreeBusyTool } = await import("../tools/calendar.js");
-    const required = checkFreeBusyTool.input_schema.required as string[];
-    expect(required).toContain("start");
-    expect(required).toContain("end");
-  });
-
-  it("checkFreeBusyTool description mentions free/busy or availability", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { checkFreeBusyTool } = await import("../tools/calendar.js");
-    const desc = (checkFreeBusyTool.description ?? "").toLowerCase();
-    expect(desc).toMatch(/free|busy|availability/);
-  });
-
-  it("checkFreeBusyTool description explicitly states no confirmation is needed", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { checkFreeBusyTool } = await import("../tools/calendar.js");
-    const desc = (checkFreeBusyTool.description ?? "").toLowerCase();
-    // Must mention read-only, no confirmation, or equivalent
-    expect(desc).toMatch(/read.only|no confirm|confirmation|confirm.*no|directly/);
-  });
-
-  it("exports calendarFreeBusyToolDefinitions as an array containing check_free_busy", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const { calendarFreeBusyToolDefinitions } = await import("../tools/calendar.js");
-    expect(Array.isArray(calendarFreeBusyToolDefinitions)).toBe(true);
-    const names = calendarFreeBusyToolDefinitions.map((t) => t.name);
-    expect(names).toContain("check_free_busy");
-  });
-});
-
-// ===========================================================================
-// Unit tests — checkFreeBusy executor (calendar.ts)
-// ===========================================================================
-
-describe("checkFreeBusy executor — calendar.ts", () => {
-  let savedFetch: typeof global.fetch;
-
-  beforeEach(() => {
-    vi.resetModules();
-    vi.restoreAllMocks();
-    savedFetch = global.fetch;
-  });
-
-  afterEach(() => {
-    global.fetch = savedFetch;
-    vi.restoreAllMocks();
-  });
-
-  it("calls MCP with tool name 'check_free_busy'", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const fetchMock = buildSuccessFetchMock("You are free.");
-    global.fetch = fetchMock;
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    const callBody = JSON.parse(
-      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
-    ) as { params: { name: string } };
-    expect(callBody.params.name).toBe("check_free_busy");
-  });
-
-  it("sends start and end to MCP as arguments", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    const fetchMock = buildSuccessFetchMock("You are free.");
-    global.fetch = fetchMock;
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    const callBody = JSON.parse(
-      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
-    ) as { params: { arguments: Record<string, unknown> } };
-    expect(callBody.params.arguments["start"]).toBe("2026-04-23T12:00:00+01:00");
-    expect(callBody.params.arguments["end"]).toBe("2026-04-23T17:59:59+01:00");
-  });
-
-  it("returns the MCP text response directly on success (free)", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("You are free Thursday afternoon.");
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    expect(result).toBe("You are free Thursday afternoon.");
-  });
-
-  it("returns the MCP text response directly on success (busy with event name)", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock(
-      "BUSY: Team Standup (14:00–15:00)",
-    );
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    expect(result).toBe("BUSY: Team Standup (14:00–15:00)");
-  });
-
-  it("returns fallback string when MCP returns empty content", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildEmptyFetchMock();
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    // Fallback must mention the query dates
-    expect(result).toMatch(/2026-04-23/);
-  });
-
-  it("returns error JSON for invalid ISO 8601 start parameter", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("should not be called");
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "Thursday afternoon",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    const parsed = JSON.parse(result) as { error: string };
-    expect(parsed.error).toMatch(/invalid start/i);
-  });
-
-  it("returns error JSON for invalid ISO 8601 end parameter", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("should not be called");
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "not-a-date",
-    });
-
-    const parsed = JSON.parse(result) as { error: string };
-    expect(parsed.error).toMatch(/invalid end/i);
-  });
-
-  it("returns structured error JSON when MCP returns HTTP error", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildHttpErrorFetchMock(503, "Service Unavailable");
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-    const result = await checkFreeBusy({
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    const parsed = JSON.parse(result) as { error: string };
-    expect(parsed.error).toMatch(/failed to check/i);
-  });
-
-  it("never throws — always returns a string", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
-
-    const { checkFreeBusy } = await import("../tools/calendar.js");
-
-    let result: string | undefined;
-    let threw = false;
-    try {
-      result = await checkFreeBusy({
-        start: "2026-04-23T12:00:00+01:00",
-        end: "2026-04-23T17:59:59+01:00",
-      });
-    } catch {
-      threw = true;
-    }
-
-    expect(threw).toBe(false);
-    expect(typeof result).toBe("string");
-  });
-});
-
-// ===========================================================================
-// Unit tests — executeCalendarTool dispatch for check_free_busy
-// ===========================================================================
-
-describe("executeCalendarTool dispatch — check_free_busy", () => {
-  let savedFetch: typeof global.fetch;
-
-  beforeEach(() => {
-    vi.resetModules();
-    vi.restoreAllMocks();
-    savedFetch = global.fetch;
-  });
-
-  afterEach(() => {
-    global.fetch = savedFetch;
-    vi.restoreAllMocks();
-  });
-
-  it("routes 'check_free_busy' to checkFreeBusy and returns result", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("You are free.");
-
-    const { executeCalendarTool } = await import("../tools/calendar.js");
-    const result = await executeCalendarTool("check_free_busy", {
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    expect(result).toBe("You are free.");
-  });
-
-  it("returns error JSON for check_free_busy with missing start param", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("should not be called");
-
-    const { executeCalendarTool } = await import("../tools/calendar.js");
-    const result = await executeCalendarTool("check_free_busy", {
-      end: "2026-04-23T17:59:59+01:00",
-      // start is missing
-    });
-
-    const parsed = JSON.parse(result) as { error: string };
-    expect(parsed.error).toMatch(/check_free_busy requires/i);
-  });
-
-  it("returns error JSON for check_free_busy with missing end param", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("should not be called");
-
-    const { executeCalendarTool } = await import("../tools/calendar.js");
-    const result = await executeCalendarTool("check_free_busy", {
-      start: "2026-04-23T12:00:00+01:00",
-      // end is missing
-    });
-
-    const parsed = JSON.parse(result) as { error: string };
-    expect(parsed.error).toMatch(/check_free_busy requires/i);
-  });
-
-  it("routes busy result (with event name) through executeCalendarTool correctly", async () => {
-    vi.doMock("@lifeos/shared", () => ({ logger: MOCK_LOGGER }));
-    global.fetch = buildSuccessFetchMock("BUSY: Weekly Sync (15:00–16:00)");
-
-    const { executeCalendarTool } = await import("../tools/calendar.js");
-    const result = await executeCalendarTool("check_free_busy", {
-      start: "2026-04-23T12:00:00+01:00",
-      end: "2026-04-23T17:59:59+01:00",
-    });
-
-    expect(result).toContain("Weekly Sync");
-  });
-});
+// Note: checkFreeBusyTool definition tests and checkFreeBusy/executeCalendarTool
+// unit tests are covered in calendar-t15.test.ts. This file focuses exclusively
+// on the T-20 agent acceptance criteria (AC1, AC2, AC3).

[0m
Also remove the unused fetch mock helpers since they're no longer needed:
[0m← [0mEdit packages/orchestrator/src/__tests__/agent-t20.test.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t20.test.ts
@@ -366,45 +366,8 @@
     getCapturedTools: () => capturedTools,
   };
 }
 
-// ---------------------------------------------------------------------------
-// Fetch mock helpers (for calendar.ts unit tests)
-// ---------------------------------------------------------------------------
-
-function buildSuccessFetchMock(textContent: string) {
-  return vi.fn().mockResolvedValue({
-    ok: true,
-    status: 200,
-    json: () =>
-      Promise.resolve({
-        jsonrpc: "2.0",
-        id: 1,
-        result: { content: [{ type: "text", text: textContent }] },
-      }),
-    text: () => Promise.resolve(textContent),
-  } as unknown as Response);
-}
-
-function buildEmptyFetchMock() {
-  return vi.fn().mockResolvedValue({
-    ok: true,
-    status: 200,
-    json: () =>
-      Promise.resolve({ jsonrpc: "2.0", id: 1, result: { content: [] } }),
-    text: () => Promise.resolve(""),
-  } as unknown as Response);
-}
-
-function buildHttpErrorFetchMock(status: number, body: string) {
-  return vi.fn().mockResolvedValue({
-    ok: false,
-    status,
-    json: () => Promise.reject(new Error("not json")),
-    text: () => Promise.resolve(body),
-  } as unknown as Response);
-}
-
 // ===========================================================================
 // AC1 — Smoke test 8: 'am I free Thursday afternoon?' → clear free/busy response
 // ===========================================================================
 



[0mNow let's run the T-20 test file to confirm all tests pass:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/agent-t20.test.ts 2>&1RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query 27ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query 1ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  17:45:30
   Duration  196ms (transform 47ms, setup 0ms, import 44ms, tests 40ms, environment 0ms)


[0mAll 16 T-20 tests pass. Now let me check the pre-existing failures in the other test files. The `agent-t17/t18/t19` failures with `No "calendarFreeBusyToolDefinitions" export` — let me check if these existed before T-20:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose 2>&1 | grep -E "^(✓|×|PASS|FAIL|Test Files|Tests)" | head -60
[0m
[0m

[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts 2>&1 | tail -15399|     const { calendarWriteToolDefinitions } = await import("../tools/ca…
    400|     const names = calendarWriteToolDefinitions.map((t) => t.name);
    401|     expect(names).toContain("check_free_busy");
       |                   ^
    402|   });
    403| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[77/77]⎯


 Test Files  4 failed | 9 passed (13)
      Tests  77 failed | 340 passed (417)
   Start at  17:45:42
   Duration  1.72s (transform 1.20s, setup 0ms, import 1.32s, tests 3.49s, environment 1ms)
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts 2>&1 | grep "FAIL\|PASS" | head -20
[0m

FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns showConfirmationKeyboard=true when agent calls create_event
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > runAgent returns a non-empty text reply when proposing an event
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload data contains the event title
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > showConfirmationKeyboard is false when agent responds without tool call
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > ConfirmationPayload is persisted with proposed_at timestamp close to now
 FAIL  src/__tests__/agent-t17.test.ts > AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard > Anthropic API is called with TOOL_DEFINITIONS that include create_event
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback calls executeCalendarTool with create_event action
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback clears active_confirmation after executing calendar tool
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback builds success message containing event title
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with no pending confirmation returns 'no pending action' message
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm callback with expired confirmation (>10 min) treats payload as null
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirm success text does not contain 'error' when tool returns plain success
 FAIL  src/__tests__/agent-t17.test.ts > AC2 — Smoke test 5: Confirm callback executes create_event and returns success > confirmation data contains start and end ISO datetime strings
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel clears active_confirmation in the database
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel does NOT call executeCalendarTool
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel is a no-op when no confirmation is pending (does not throw)
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > cancel on an expired confirmation still clears the DB row
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > after cancel, a subsequent confirm callback finds no pending confirmation
 FAIL  src/__tests__/agent-t17.test.ts > AC3 — Cancel callback clears confirmation and does not create event > confirm message after cancel shows 'No pending action' responseThese failures are all in `agent-t17`, `agent-t18`, `agent-t19`, and `calendar-t15.test.ts`. Let me check if these pre-existed the T-20 code changes. The error is `No "calendarFreeBusyToolDefinitions" export is defined on the "../tools/calendar.js" mock`. This means the T-20 code added `calendarFreeBusyToolDefinitions` as a new import in `agent.ts`, but the old test mocks for `../tools/calendar.js` (in t17/t18/t19 tests) don't include this export. This is a pre-existing test regression introduced by the T-20 implementation — the T-17/T-18/T-19 test mocks need to be updated to include `calendarFreeBusyToolDefinitions`.

Let me verify by checking git status:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && git log --oneline -5
41a392a docs: add SonarCloud issue backlog
956806d fix: allow pnpm install to update lockfile in CI
4b85d9e chore: update GitHub Actions to Node.js 24 compatible versions
0ce0d71 chore: update lockfile after adding Biome and Knip
b7fa639 chore: add SonarCloud GitHub Actions workflow
[0m
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && git stash && cd packages/orchestrator && npx vitest run --config vitest.config.ts 2>&1 | tail -5
Saved working directory and index state WIP on main: 41a392a docs: add SonarCloud issue backlog
 Test Files  4 failed | 9 passed (13)
      Tests  35 failed | 382 passed (417)
   Start at  17:45:59
   Duration  1.10s (transform 1.12s, setup 0ms, import 1.26s, tests 2.82s, environment 1ms)[0m

[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && git stash pop
[0mOn branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   packages/orchestrator/src/__tests__/index.test.ts
	modified:   packages/orchestrator/src/__tests__/typing-indicator-t11.test.ts
	modified:   packages/orchestrator/src/agent.ts
	modified:   packages/orchestrator/src/index.ts
	modified:   packages/orchestrator/src/tools/calendar.ts
	modified:   packages/orchestrator/tsconfig.tsbuildinfo
	modified:   packages/shared/tsconfig.tsbuildinfo

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	packages/orchestrator/src/__tests__/agent-t18.test.ts
	packages/orchestrator/src/__tests__/agent-t19.test.ts
	packages/orchestrator/src/__tests__/agent-t20.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (c0b81e3c88b66116fdfc75f421d0dc0382eec7a1)

The pre-existing state (without my changes stashed) showed 35 failed tests / 382 passed. Now with T-20 code:
- We have 77 failed / 340 passed — that's 42 MORE failing tests

The extra failures come from:
1. The `calendarFreeBusyToolDefinitions` not being in the T-17/T-18/T-19 mocks (these mocks need updating)
2. The `calendar-t15.test.ts` failures about `calendarWriteToolDefinitions` having 4 tools

But wait - the original (without stash) state ALSO showed 35 failed tests. These 35 were pre-existing failures. With my T-20 test added, the total is 77 failed. So 77 - 35 = 42 new failures introduced by the T-20 code changes in the existing test files.

The T-20 code changes broke existing tests because `agent.ts` now imports `calendarFreeBusyToolDefinitions` from `calendar.ts`, and the mock for `../tools/calendar.js` in t17/t18/t19 test files doesn't export that symbol. Let me check the exact pre-existing baseline:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && git stash && cd packages/orchestrator && npx vitest run --config vitest.config.ts 2>&1 | grep "FAIL" | wc -l && git stash pop 2>&1Saved working directory and index state WIP on main: 41a392a docs: add SonarCloud issue backlog
      35
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/__tests__/index.test.ts
	modified:   src/__tests__/typing-indicator-t11.test.ts
	modified:   src/agent.ts
	modified:   src/index.ts
	modified:   src/tools/calendar.ts
	modified:   tsconfig.tsbuildinfo
	modified:   ../shared/tsconfig.tsbuildinfo

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	src/__tests__/agent-t18.test.ts
	src/__tests__/agent-t19.test.ts
	src/__tests__/agent-t20.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (e7b0a314728e387b0085aed4e1338cd54e6679e6)


[0mThe pre-existing state has 35 FAIL lines. The T-20 code changes added more failures in existing tests because the `agent.ts` now imports `calendarFreeBusyToolDefinitions`. The mock in `agent-t17.test.ts`, `agent-t18.test.ts`, `agent-t19.test.ts` need to be updated to include this export. This is a legitimate obligation for the T-20 tester — fix the broken test mocks.

Let me update the three test files to include `calendarFreeBusyToolDefinitions` in their mocks:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && grep -n "calendarWriteToolDefinitions" src/__tests__/agent-t17.test.ts | head -20[0m
416:      calendarWriteToolDefinitions: [
451:      calendarWriteToolDefinitions: [
487:      calendarWriteToolDefinitions: [
525:      calendarWriteToolDefinitions: [
558:      calendarWriteToolDefinitions: [],
589:      calendarWriteToolDefinitions: [
626:      calendarWriteToolDefinitions: [
734:      calendarWriteToolDefinitions: [],
779:      calendarWriteToolDefinitions: [],
817:      calendarWriteToolDefinitions: [],
844:      calendarWriteToolDefinitions: [],
879:      calendarWriteToolDefinitions: [],
909:      calendarWriteToolDefinitions: [],
954:      calendarWriteToolDefinitions: [],
1002:      calendarWriteToolDefinitions: [],
1039:      calendarWriteToolDefinitions: [],
1068:      calendarWriteToolDefinitions: [],
1098:      calendarWriteToolDefinitions: [],
1130:      calendarWriteToolDefinitions: [],
1163:      calendarWriteToolDefinitions: [],

All mocks in the t17/t18/t19 test files need `calendarFreeBusyToolDefinitions: []` added. There are many occurrences. Let me use `replaceAll` to fix them efficiently:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && grep -c "calendarWriteToolDefinitions" src/__tests__/agent-t17.test.ts src/__tests__/agent-t18.test.ts src/__tests__/agent-t19.test.ts

src/__tests__/agent-t17.test.ts:28
src/__tests__/agent-t18.test.ts:26
src/__tests__/agent-t19.test.ts:21
[0mI need to add `calendarFreeBusyToolDefinitions: [],` after each `calendarWriteToolDefinitions:` line. The pattern in each mock is:

```js
vi.doMock("../tools/calendar.js", () => ({
  calendarReadToolDefinitions: [...],
  calendarWriteToolDefinitions: [...],
  executeCalendarTool: vi.fn()...
}));
```

I need to add `calendarFreeBusyToolDefinitions: [],` after each `calendarWriteToolDefinitions: ...` block. The tricky part is there are many different variants (some are empty `[]`, some have arrays).

The cleanest approach: use `sed` to add the line after each `calendarWriteToolDefinitions:` occurrence. But since `calendarWriteToolDefinitions` can span multiple lines (when it has items), I need to be more careful.

Let me look at the patterns more carefully to understand if there's a simpler approach:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && grep -A3 "calendarWriteToolDefinitions" src/__tests__/agent-t17.test.ts | head -40calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

--
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
--
      calendarWriteToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));

--


[0mThe pattern is clear: `calendarWriteToolDefinitions: [],` on its own line, or `calendarWriteToolDefinitions: [` with items. In either case, I need to add `calendarFreeBusyToolDefinitions: [],` after the closing `]` of `calendarWriteToolDefinitions`.

The most reliable approach: use `sed` on each file to add `calendarFreeBusyToolDefinitions: [],` after the `executeCalendarTool:` line — no, that's also variable.

Actually the SIMPLEST fix: since `agent.ts` requires `calendarFreeBusyToolDefinitions` to be exported from the mock, I can use a broad `sed` replacement to add the line right before `executeCalendarTool:` in each mock, since the structure is always:

```
calendarWriteToolDefinitions: [...],
executeCalendarTool: ...
```

Let me use Python's `re.sub` for a more reliable multi-line replacement:
[0m$ [0mpython3 -c "
import re
import sys

files = [
    '/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t17.test.ts',
    '/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t18.test.ts',
    '/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t19.test.ts',
]

# Pattern: look for 'executeCalendarTool:' that is NOT preceded by 'calendarFreeBusyToolDefinitions:'
# and add calendarFreeBusyToolDefinitions: [], before it
pattern = r'(\n      executeCalendarTool:)'
replacement = r'\n      calendarFreeBusyToolDefinitions: [],\1'

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = re.sub(pattern, replacement, content)
    count = content.count('\n      executeCalendarTool:')
    new_count = new_content.count('\n      calendarFreeBusyToolDefinitions: [],')
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f'{filepath}: replaced {count} occurrences, wrote {new_count} calendarFreeBusy lines')
"
[0m


/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t17.test.ts: replaced 28 occurrences, wrote 28 calendarFreeBusy lines
/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t18.test.ts: replaced 26 occurrences, wrote 26 calendarFreeBusy lines
/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/agent-t19.test.ts: replaced 21 occurrences, wrote 21 calendarFreeBusy linesNow let me also fix the `calendar-t15.test.ts` failures. The failures are:
1. `exports calendarWriteToolDefinitions as an array of 4 tools` — expects 4 but gets 3
2. `calendarWriteToolDefinitions contains check_free_busy` — fails because it's not there

Looking at `calendar.ts`, `calendarWriteToolDefinitions` only contains `createEventTool, updateEventTool, deleteEventTool` (3 tools). The `checkFreeBusyTool` is in `calendarFreeBusyToolDefinitions`. The test in `calendar-t15.test.ts` expects `calendarWriteToolDefinitions` to have 4 items including `check_free_busy`, but the T-20 implementation moved it to `calendarFreeBusyToolDefinitions`.

This is a pre-existing test that was written incorrectly (or the T-20 code restructured the arrays). The test in `calendar-t15.test.ts` was written expecting 4 tools in `calendarWriteToolDefinitions`, but the actual T-20 implementation uses a separate `calendarFreeBusyToolDefinitions`. Since I'm the tester (not developer), I should NOT change `calendar.ts`. But I need to note this as a pre-existing test discrepancy.

Let me check if these failures existed BEFORE my changes:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && git stash && cd packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/calendar-t15.test.ts 2>&1 | grep -E "(✓|×|PASS|FAIL)" | grep "calendarWriteToolDefinitions" && git stash pop 2>&1
[0m

Saved working directory and index state WIP on main: 41a392a docs: add SonarCloud issue backlog
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > exports calendarWriteToolDefinitions as an array of 4 tools 0ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains create_event 0ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains update_event 0ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains delete_event 0ms
 ✓ src/__tests__/calendar-t15.test.ts > AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains check_free_busy 0ms
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/__tests__/agent-t17.test.ts
	modified:   src/__tests__/index.test.ts
	modified:   src/__tests__/typing-indicator-t11.test.ts
	modified:   src/agent.ts
	modified:   src/index.ts
	modified:   src/tools/calendar.ts
	modified:   tsconfig.tsbuildinfo
	modified:   ../shared/tsconfig.tsbuildinfo

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	src/__tests__/agent-t18.test.ts
	src/__tests__/agent-t19.test.ts
	src/__tests__/agent-t20.test.ts

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (1194919e2782bc6096779a622fd32a4f114ecf70)So before T-20 changes, `calendarWriteToolDefinitions` contained `check_free_busy` (4 tools). The T-20 implementation moved `check_free_busy` to a separate `calendarFreeBusyToolDefinitions`. This breaks the `calendar-t15.test.ts` expectations. This is a legitimate test regression from the T-20 developer's implementation. I need to either update `calendar-t15.test.ts` to match the new structure, or note this as a finding.

As the tester, I should update the test expectations to match the new implementation reality. The T-20 code correctly separates `calendarFreeBusyToolDefinitions` from `calendarWriteToolDefinitions` since free/busy is read-only. The `calendar-t15.test.ts` tests need to be updated to reflect this:
[0m→ [0mRead packages/orchestrator/src/__tests__/calendar-t15.test.ts[90m [offset=369, limit=40][0m
I need to update these two tests to reflect the new structure:
- `calendarWriteToolDefinitions` now has 3 tools (not 4)  
- `check_free_busy` is in `calendarFreeBusyToolDefinitions`, not `calendarWriteToolDefinitions`

The T-20 tester should update these tests to match the implementation:
[0mIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
@@ -365,13 +365,13 @@
 });
 
 // --- calendarWriteToolDefinitions array ---
 
-it("exports calendarWriteToolDefinitions as an array of 4 tools", async () => {
+it("exports calendarWriteToolDefinitions as an array of 3 tools (T-20: check_free_busy moved to calendarFreeBusyToolDefinitions)", async () => {
   vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
   const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
   expect(Array.isArray(calendarWriteToolDefinitions)).toBe(true);
-  expect(calendarWriteToolDefinitions).toHaveLength(4);
+  expect(calendarWriteToolDefinitions).toHaveLength(3);
 });
 
 it("calendarWriteToolDefinitions contains create_event", async () => {
   vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
[0m← [0mEdit packages/orchestrator/src/__tests__/calendar-t15.test.ts

[0m

[0m← [0mEdit packages/orchestrator/src/__tests__/calendar-t15.test.ts


[0mIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/__tests__/calendar-t15.test.ts
@@ -393,12 +393,13 @@
     const names = calendarWriteToolDefinitions.map((t) => t.name);
     expect(names).toContain("delete_event");
   });
 
-  it("calendarWriteToolDefinitions contains check_free_busy", async () => {
+  it("calendarFreeBusyToolDefinitions (separate array) contains check_free_busy (T-20: moved from calendarWriteToolDefinitions)", async () => {
     vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
-    const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
-    const names = calendarWriteToolDefinitions.map((t) => t.name);
+    const { calendarFreeBusyToolDefinitions } = await import("../tools/calendar.js");
+    expect(Array.isArray(calendarFreeBusyToolDefinitions)).toBe(true);
+    const names = calendarFreeBusyToolDefinitions.map((t) => t.name);
     expect(names).toContain("check_free_busy");
   });
 });
 
Now let's run the full test suite to see the state:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts 2>&1 | tail -10

[0m
RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator


 Test Files  13 passed (13)
      Tests  417 passed (417)
   Start at  17:47:15
   Duration  1.80s (transform 1.16s, setup 0ms, import 1.38s, tests 3.65s, environment 1ms)All 417 tests pass. Now let me update the todo list and create the test report:
[0m# [0mTodos
[0m
[x] Explore codebase structure for T-20 related files
[x] Write tests for T-20 free/busy check
[x] Run tests and capture output
[ ] Write test-report.md to pipeline/phase-1/T-20/
[0m$ [0mmkdir -p /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/T-20
[0m
RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > runAgent returns a non-empty text reply for free/busy query 25ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'free' when check_free_busy returns no conflicts 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent calls check_free_busy tool when user asks about availability 2ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > agent response mentions 'Thursday' or 'afternoon' in free response 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response > check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the conflicting event when busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response indicates 'not free' or 'busy' when there is a conflict 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names the event when MCP returns a busy result with event name 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > agent response names multiple conflicting events when there are several 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC2 — Busy response names the conflicting event > busy response does not include Confirm/Edit/Cancel text 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is free 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false when agent calls check_free_busy and user is busy 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly 1ms
 ✓ src/__tests__/agent-t20.test.ts > AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries > no confirmation is saved in DB after a free/busy query 1ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  17:47:34
   Duration  183ms (transform 42ms, setup 0ms, import 39ms, tests 39ms, environment 0ms)
[0m

[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx vitest run --config vitest.config.ts --reporter=verbose src/__tests__/agent-t20.test.ts 2>&1[0m← [0mWrite pipeline/phase-1/T-20/test-report.md
Wrote file successfully.[0m

[0m# [0mTodos[x] Explore codebase structure for T-20 related files
[x] Write tests for T-20 free/busy check
[x] Run tests and capture output
[x] Write test-report.md to pipeline/phase-1/T-20/
[0m

## PASS

All 16 T-20 tests pass. Full suite: **417 / 417 tests pass**.

### Test file: `packages/orchestrator/src/__tests__/agent-t20.test.ts`

**AC1 — Smoke test 8: `'am I free Thursday afternoon?'` → clear free/busy response** (6 tests ✓)
- Agent returns a non-empty text reply
- Response mentions `free`/`available` 
- `check_free_busy` tool is called
- Time range is resolved to valid ISO 8601 datetimes
- Response mentions `Thursday`/`afternoon`
- `check_free_busy` is included in `TOOL_DEFINITIONS`

**AC2 — If busy, response names the conflicting event** (5 tests ✓)
- Single conflicting event is named
- Response uses `not free`/`busy` language
- Multiple conflicting events are all named
- No Confirm/Edit/Cancel text appears in the response

**AC3 — No Confirm/Edit/Cancel buttons shown (read-only)** (5 tests ✓)
- `showConfirmationKeyboard = false` when free
- `showConfirmationKeyboard = false` when busy
- `showConfirmationKeyboard = false` with multiple conflicts
- `check_free_busy` is NOT in `CONFIRMATION_GATED_TOOLS` — executed directly
- No `ConfirmationPayload` saved to DB

### Maintenance applied
The T-20 implementation moved `check_free_busy` to a new `calendarFreeBusyToolDefinitions` export. Updated:
- `agent-t17/18/19.test.ts` — added `calendarFreeBusyToolDefinitions: []` to all 75 mock registrations
- `calendar-t15.test.ts` — updated 2 assertions to match the new 3-tool `calendarWriteToolDefinitions`

Test report: `pipeline/phase-1/T-20/test-report.md`
