[93m[1m! [0m agent "ag-03-developer" is a subagent, not a primary agent. Falling back to default agent


[0m> build · claude-sonnet-4-6[0m
[0m# [0mTodos[0m[ ] Read existing codebase to understand structure
[ ] Implement check_free_busy tool in calendar.ts
[ ] Wire check_free_busy in agent.ts
[ ] Write self-assessment.md to pipeline/phase-1/T-20/


[0m→ [0mRead packages/orchestrator/src/tools/calendar.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts
Now I have a clear picture of the existing codebase. Let me analyze what's needed for T-20:
[0m• [0mExplore codebase structure[90m Explore Agent[0m
[0m✓ [0mExplore codebase structure[90m Explore Agent[0m
[0m[0m
[x] Read existing codebase to understand structure
[ ] Update check_free_busy tool in calendar.ts - make it directly executable (not confirmation-gated)
[ ] Update agent.ts to route check_free_busy as a direct read-like tool
[ ] Write self-assessment.md to pipeline/phase-1/T-20/[0m# [0mTodos


Now I understand the situation clearly. The `check_free_busy` tool already exists in `calendar.ts` with:
- A tool definition (`checkFreeBusyTool`)
- An executor function (`checkFreeBusy`)
- A case in `executeCalendarTool`

However, looking at `agent.ts`, `check_free_busy` is listed in `calendarWriteToolDefinitions` and its **name is in `CALENDAR_TOOL_NAMES`** but NOT in `CONFIRMATION_GATED_TOOLS` — so it would actually execute directly through `executeTool`. But the task requires:

1. The tool description in `calendar.ts` needs to be updated so the agent knows to call `check_free_busy` when user asks "am I free Thursday afternoon?" — not just as a pre-flight check
2. The system prompt in `agent.ts` needs a free/busy response rule so the agent returns a plain-language response naming conflicting events
3. `check_free_busy` must NOT show confirmation buttons (it's already not in `CONFIRMATION_GATED_TOOLS`, so this is already correct)

Let me update the `checkFreeBusyTool` description in `calendar.ts` to direct the model to use it for direct user free/busy queries:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -22,15 +22,22 @@
 * T-15: Write operations (confirmation-gated — NOT called directly by the agent)
 *   - create_event    — create a new calendar event
 *   - update_event    — update fields on an existing event by eventId
 *   - delete_event    — delete an existing event by eventId
-*   - check_free_busy — query free/busy status for a time range
 *
 *   These write tools are included in the agent's tool definitions array so
 *   the model is aware of them, but they MUST NOT be executed directly by the
 *   agent. The orchestrator's confirmation executor calls them only after the
 *   user explicitly confirms the proposed mutation.
 *
+* T-20: Free/busy check (read-only — executed directly by the agent)
+*   - check_free_busy — query free/busy status for a time range
+*
+*   check_free_busy is a read-only query (no mutation). The agent calls it
+*   directly without a confirmation gate when the user asks "am I free …?".
+*   The agent returns a plain-language response and names any conflicting
+*   events. No Confirm/Edit/Cancel buttons are shown.
+*
 * Each tool is represented in two forms:
 *   1. An Anthropic tool definition object (Tool) that is included in the
 *      messages.create() call so the model knows it can invoke the tool.
 *   2. An async executor function that calls the Google Calendar MCP server

[0m
Now update the `checkFreeBusyTool` description to clearly instruct the model to call it for direct user free/busy questions and to respond in plain language with conflicting event names:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -763,38 +763,65 @@
  * Matches the Google Calendar MCP contract:
  *   name:         "check_free_busy"
  *   input_schema: start (ISO 8601), end (ISO 8601) — both required.
  *
- * NOTE: Although check_free_busy is a query (not a mutation), it is grouped
- * with the write tools because it is used as a pre-flight check before
- * scheduling confirmations and is managed by the confirmation executor.
- * It is included in the agent's tool definitions array.
+ * T-20: check_free_busy is a read-only query executed directly by the agent
+ * (no confirmation gate). Use it when the user asks whether they are free
+ * during a time period ("am I free Thursday afternoon?", "do I have anything
+ * on Friday morning?", etc.). Resolve natural language time references using
+ * the Live Context block timezone before calling this tool.
+ *
+ * After calling check_free_busy, return a plain-language response:
+ *   - If free: "You're free <period>."
+ *   - If busy: "You're not free <period> — you have <event name(s)>."
+ *     Always name the conflicting event(s) in the response.
+ *
+ * Also used as a pre-flight check before proposing to create or move an event.
  */
 export const checkFreeBusyTool: Anthropic.Tool = {
   name: "check_free_busy",
   description:
     "Queries the user's Google Calendar to determine whether they are free or busy " +
     "during a specified time range. " +
-    "Use this as a pre-flight check before proposing to create or move an event, " +
-    "to avoid double-booking the user. " +
+    "\n\n" +
+    "Use this tool when the user directly asks whether they are free, available, or " +
+    "has anything scheduled during a time period — e.g. 'am I free Thursday afternoon?', " +
+    "'do I have anything on Friday morning?', 'am I available at 3pm tomorrow?'. " +
+    "Also use it as a pre-flight check before proposing to create or move an event. " +
+    "\n\n" +
+    "IMPORTANT — Date and time resolution (T-14 rules apply):\n" +
+    "Always resolve natural language time references using the current datetime and " +
+    "timezone from the Live Context block. Never use UTC unless the configured TZ is UTC. " +
+    "\n\n" +
+    "Afternoon = 12:00:00 through 17:59:59 in the local timezone.\n" +
+    "Morning   = 08:00:00 through 11:59:59 in the local timezone.\n" +
+    "Evening   = 18:00:00 through 21:59:59 in the local timezone.\n" +
+    "\n\n" +
+    "After receiving the result, respond in plain language:\n" +
+    "  - If FREE:  'You're free <period>.' (e.g. 'You're free Thursday afternoon.')\n" +
+    "  - If BUSY:  'You're not free <period> — you have <event name(s)>.' " +
+    "Always name the conflicting event(s). " +
+    "If there are multiple conflicts, list all of them. " +
+    "\n\n" +
     "Both start and end must be ISO 8601 datetime strings with the local timezone offset " +
-    "(e.g. '2026-04-21T10:00:00+01:00'). " +
-    "Use the current datetime and timezone from the Live Context block to resolve " +
-    "relative time references.",
+    "(e.g. '2026-04-21T12:00:00+01:00'). Do NOT show Confirm/Edit/Cancel buttons — " +
+    "this is a read-only query that requires no confirmation.",
   input_schema: {
     type: "object" as const,
     properties: {
       start: {
         type: "string",
         description:
           "Start of the time window to check in ISO 8601 format with local timezone offset " +
-          "(e.g. '2026-04-21T10:00:00+01:00').",
+          "(e.g. '2026-04-21T12:00:00+01:00'). Resolve natural language using the Live Context TZ. " +
+          "For 'Thursday afternoon' use the Thursday of the current or next week at T12:00:00<tz-offset>.",
       },
       end: {
         type: "string",
         description:
           "End of the time window to check in ISO 8601 format with local timezone offset " +
-          "(e.g. '2026-04-21T11:00:00+01:00'). Must be after start.",
+          "(e.g. '2026-04-21T17:59:59+01:00'). Must be after start. " +
+          "For 'Thursday afternoon' use T17:59:59<tz-offset> on the same day.",
       },
     },
     required: ["start", "end"],
   },
[0m


Now update the `calendarWriteToolDefinitions` export to separate `checkFreeBusyTool` from the write tools, and create a dedicated export for it so the `agent.ts` comment block is accurate:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts
[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -901,11 +901,21 @@
 export const calendarWriteToolDefinitions: Anthropic.Tool[] = [
   createEventTool,
   updateEventTool,
   deleteEventTool,
-  checkFreeBusyTool,
 ];
 
+/**
+ * Free/busy query tool definition (T-20).
+ *
+ * check_free_busy is a read-only query — the agent calls it directly without
+ * any confirmation gate. It is exported separately from calendarWriteToolDefinitions
+ * to signal that it does NOT require user confirmation.
+ *
+ * Import this array and spread it into TOOL_DEFINITIONS in agent.ts.
+ */
+export const calendarFreeBusyToolDefinitions: Anthropic.Tool[] = [checkFreeBusyTool];
+
 // ---------------------------------------------------------------------------
 // Tool executor — called by the agent tool loop in agent.ts
 // ---------------------------------------------------------------------------
 

Now update the `executeCalendarTool` docstring to clarify T-20 semantics:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -919,19 +919,22 @@
 // Tool executor — called by the agent tool loop in agent.ts
 // ---------------------------------------------------------------------------
 
 /**
- * Execute a calendar read tool by name.
+ * Execute a calendar tool by name.
  *
  * This function is the single integration point between the agent's generic
  * tool loop and the calendar tool implementations. The agent.ts executeTool()
  * function should delegate to this when toolName is a known calendar tool.
  *
- * Write tools (create_event, update_event, delete_event, check_free_busy) are
- * also handled here for cases where the confirmation executor calls them via
- * the same dispatch path. The agent's tool loop itself should NOT invoke write
- * tools without the confirmation gate.
+ * Read tools (get_todays_events, get_events_range) and the free/busy query
+ * tool (check_free_busy, T-20) are executed directly by the agent tool loop.
  *
+ * Write tools (create_event, update_event, delete_event) are also handled here
+ * for cases where the confirmation executor calls them via the same dispatch
+ * path. The agent's tool loop itself should NOT invoke write tools without
+ * the confirmation gate.
+ *
  * @param toolName   The tool name as specified in the Anthropic tool definition.
  * @param toolInput  The validated input object from the Anthropic API response.
  * @returns          A string result to feed back to the model as a tool_result.
  */


Now update `agent.ts` to:
1. Import `calendarFreeBusyToolDefinitions`
2. Add it to `TOOL_DEFINITIONS`
3. Add a free/busy rule in the system prompt
4. Update the file header comment to mention T-20
[0m← [0mEdit packages/orchestrator/src/agent.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -73,8 +73,21 @@
 *   eventId, persists a ConfirmationPayload { action: 'delete_event', eventId }
 *   via saveConfirmation, and returns a synthetic tool_result so the model can
 *   compose the proposal text.  showConfirmationKeyboard is set to true.
 *
+* T-20: Free/busy check (read-only, no confirmation gate):
+*
+*   check_free_busy is wired as a directly-executable tool — it is NOT in
+*   CONFIRMATION_GATED_TOOLS and does NOT set showConfirmationKeyboard. When
+*   the user asks "am I free Thursday afternoon?", the agent resolves the time
+*   range, calls check_free_busy, and returns a plain-language response. If
+*   busy, the response names the conflicting event(s). No Confirm/Edit/Cancel
+*   buttons are shown.
+*
+*   calendarFreeBusyToolDefinitions is imported from calendar.ts and spread
+*   into TOOL_DEFINITIONS so the model is aware of this tool. The tool name
+*   "check_free_busy" is added to CALENDAR_TOOL_NAMES for dispatch.
+*
 * All SQL uses parameterised queries ($1, $2, …) — no string interpolation.
 *
 * Database connection is obtained from the shared `pool` singleton which
 * reads DATABASE_URL from process.env via the shared env module.
[0m


[0m← [0mEdit packages/orchestrator/src/agent.ts

Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -102,8 +102,9 @@
 import type { MessageRole, ConversationMessage, ConfirmationPayload, IncomingMessage, CreateEventData, UpdateEventData, DeleteEventData } from "@lifeos/shared";
 import {
   calendarReadToolDefinitions,
   calendarWriteToolDefinitions,
+  calendarFreeBusyToolDefinitions,
   executeCalendarTool,
 } from "./tools/calendar.js";
 
 // ---------------------------------------------------------------------------
[0m
Now add the free/busy response rules to the system prompt:
[0m← [0mEdit packages/orchestrator/src/agent.ts
[0mIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -189,8 +189,20 @@
 3. If multiple events match (ambiguous), do NOT call delete_event yet. Instead, list the matching events to the user (numbered list with time and title) and ask them to specify which one to delete. Wait for the user's clarification before calling delete_event.
 4. If no events are found for the period, inform the user that no matching events were found.
 5. delete_event is irreversible — always show the event details in the proposal summary before the user confirms.
 
+--- Free/busy rules (T-20) ---
+When the user asks whether they are free, available, or has anything on during a time period:
+1. Resolve the time period to ISO 8601 start and end datetimes using the Live Context block timezone.
+   - "afternoon" = 12:00:00 through 17:59:59 local TZ
+   - "morning"   = 08:00:00 through 11:59:59 local TZ
+   - "evening"   = 18:00:00 through 21:59:59 local TZ
+2. Call check_free_busy with those datetimes. This is a read-only query — execute it immediately with NO confirmation step.
+3. Respond in plain language:
+   - If free:  "You're free <period>." (e.g. "You're free Thursday afternoon.")
+   - If busy:  "You're not free <period> — you have <event name(s)>." Always name the conflicting event(s). If there are multiple conflicts, list all of them.
+4. Do NOT show Confirm/Edit/Cancel buttons for free/busy queries.
+
 --- Date resolution rules (T-14) ---
 When the user mentions a relative date or date range, resolve it to ISO 8601 datetime strings using the current datetime and timezone from the Live Context block below BEFORE calling get_events_range. Always use the local timezone offset (e.g. +01:00, -05:00), not Z/UTC, unless the configured timezone IS UTC.
 
 Single-day queries (e.g. "next Tuesday", "tomorrow", "this Friday"):


Now add `calendarFreeBusyToolDefinitions` to `TOOL_DEFINITIONS`:
[0m← [0mEdit packages/orchestrator/src/agent.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -247,15 +247,17 @@
 /**
  * Tool definitions to include in the Anthropic API call.
  * T-12 adds the calendar read tools: get_todays_events and get_events_range.
  * T-15 adds the calendar write tools: create_event, update_event,
- * delete_event, check_free_busy — these are included so the model is aware
- * of them, but are ONLY executed by the confirmation executor after explicit
- * user approval.
+ * delete_event — these are included so the model is aware of them, but are
+ * ONLY executed by the confirmation executor after explicit user approval.
+ * T-20 adds check_free_busy as a directly-executable read-only query tool;
+ * no confirmation gate is applied.
  */
 const TOOL_DEFINITIONS: Anthropic.Tool[] = [
   ...calendarReadToolDefinitions,
   ...calendarWriteToolDefinitions,
+  ...calendarFreeBusyToolDefinitions,
 ];
 
 // ---------------------------------------------------------------------------
 // Tool executor
[0m


Now update the `CALENDAR_TOOL_NAMES` comment to mention T-20 and the `CONFIRMATION_GATED_TOOLS` section to confirm `check_free_busy` is not gated:
[0m← [0mEdit packages/orchestrator/src/agent.ts

Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -269,16 +269,21 @@
  *
  * T-15: Write tool names added. These are routed through executeCalendarTool
  * just like the read tools; the confirmation gate lives in the orchestrator
  * layer, not here.
+ *
+ * T-20: check_free_busy is a read-only query tool executed directly by the
+ * agent (no confirmation gate). It is included here so executeTool dispatches
+ * it to executeCalendarTool.
  */
 const CALENDAR_TOOL_NAMES = new Set<string>([
   "get_todays_events",
   "get_events_range",
   // T-15 write tools (confirmation-gated — executed only by confirmation executor)
   "create_event",
   "update_event",
   "delete_event",
+  // T-20 free/busy query (read-only — executed directly by the agent, no confirmation gate)
   "check_free_busy",
 ]);
 
 /**
[0m
Now update the `CONFIRMATION_GATED_TOOLS` comment to clarify that `check_free_busy` is intentionally excluded:
[0m← [0mEdit packages/orchestrator/src/agent.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -291,8 +291,11 @@
  * When the agent calls one of these tools, the tool loop intercepts the call,
  * saves a ConfirmationPayload, and returns a synthetic tool_result so the
  * model can compose a proposal text — the actual calendar mutation is deferred
  * until the user taps Confirm.
+ *
+ * check_free_busy is intentionally NOT in this set (T-20): it is a read-only
+ * query that the agent executes directly without any confirmation step.
  */
 const CONFIRMATION_GATED_TOOLS = new Set<string>([
   "create_event",
   "update_event",


[0m
Now let's verify the build passes:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npx tsc --noEmit -p packages/orchestrator/tsconfig.json 2>&1
TypeScript check passes. Let me also verify the shared package builds cleanly:
[0m

[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npx tsc --noEmit -p packages/shared/tsconfig.json 2>&1Both pass. Now let me update the todos and write the self-assessment:
[0m
[0m# [0mTodos
[x] Read existing codebase to understand structure
[x] Update check_free_busy tool in calendar.ts - make it directly executable (not confirmation-gated)
[x] Update agent.ts to route check_free_busy as a direct read-like tool
[ ] Write self-assessment.md to pipeline/phase-1/T-20/[0m

[0m$ [0mls /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/T-20/

[0m
dev-output.md[0m← [0mWrite pipeline/phase-1/T-20/self-assessment.md[0m
Wrote file successfully.

[0m# [0mTodos[0m


[x] Read existing codebase to understand structure
[x] Update check_free_busy tool in calendar.ts - make it directly executable (not confirmation-gated)
[x] Update agent.ts to route check_free_busy as a direct read-like tool
[x] Write self-assessment.md to pipeline/phase-1/T-20/T-20 is complete. Here's a summary of what was implemented:

## T-20: EP-02-05 Free/busy check — Implementation Summary

### What changed

**`packages/orchestrator/src/tools/calendar.ts`**
- Updated `checkFreeBusyTool` description to explicitly handle direct user availability queries ("am I free Thursday afternoon?"), not just pre-flight checks
- Added time-of-day resolution rules (afternoon = 12:00–17:59, morning = 08:00–11:59, evening = 18:00–21:59)
- Added plain-language response format instructions: "You're free…" / "You're not free… — you have \<event name(s)>"
- Extracted `checkFreeBusyTool` from `calendarWriteToolDefinitions` into its own `calendarFreeBusyToolDefinitions` export to clearly signal it is non-confirmation-gated
- Updated file header docstring to document T-20 distinction

**`packages/orchestrator/src/agent.ts`**
- Imported `calendarFreeBusyToolDefinitions` and spread into `TOOL_DEFINITIONS`
- Added free/busy rules block to the system prompt (T-20 section alongside T-19 delete rules)
- Updated `CONFIRMATION_GATED_TOOLS` comment to explicitly document that `check_free_busy` is intentionally absent (read-only, no gate)
- Updated `CALENDAR_TOOL_NAMES` comment to document T-20

### Why no new code was needed for routing

`check_free_busy` was already in `CALENDAR_TOOL_NAMES` and handled in `executeCalendarTool`'s dispatch switch from T-15. It was never in `CONFIRMATION_GATED_TOOLS`, so the agent loop already executed it directly. The work for T-20 was: correcting the tool description, adding the system prompt rules, and making the architectural distinction between write-gated tools and this read-only query explicit.

### Verification
`npx tsc --noEmit` passes for both `packages/orchestrator` and `packages/shared`.
