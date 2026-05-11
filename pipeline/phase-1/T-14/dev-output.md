[93m[1m! [0m agent "ag-03-developer" is a subagent, not a primary agent. Falling back to default agent
[0m> build · claude-sonnet-4-6

[0m
[0m# [0mTodos

[ ] Read existing codebase to understand current structure
[ ] Implement get_events_range tool in calendar.ts
[ ] Wire natural language date resolution into agent loop in agent.ts
[ ] Write self-assessment.md to pipeline/phase-1/T-14/[0m
[0m→ [0mRead packages/orchestrator/src/tools/calendar.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts
Both files look well-implemented. Let me now examine what's already in place from T-12/T-13 and verify the current state more carefully:
[0m→ [0mRead packages/orchestrator/src
[0m✱ [0mGlob "packages/orchestrator/src/**/*"[90m 9 matches[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/calendar-t13.test.ts
[0m→ [0mRead packages/orchestrator/src/__tests__/calendar-t12.test.ts
Now let me check the existing pipeline directory structure and any previous task outputs:
[0m

total 128
drwxr-xr-x  22 jamie  staff    704 20 Apr 16:05 .
drwxr-xr-x   3 jamie  staff     96 20 Apr 13:26 ..
-rw-r--r--   1 jamie  staff   4476 20 Apr 13:42 ag01-output.md
-rw-r--r--   1 jamie  staff   1189 20 Apr 14:31 ag02-output.md
-rw-r--r--   1 jamie  staff     88 20 Apr 14:54 approval.json
-rw-r--r--   1 jamie  staff   6366 20 Apr 13:30 manifest-summary.md
-rw-r--r--   1 jamie  staff   8209 20 Apr 13:43 reviewer-summary.md
drwxr-xr-x   8 jamie  staff    256 20 Apr 13:52 T-01
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:03 T-02
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:21 T-03
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:38 T-04
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:47 T-05
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:53 T-06
drwxr-xr-x   8 jamie  staff    256 20 Apr 14:57 T-07
drwxr-xr-x   8 jamie  staff    256 20 Apr 15:07 T-08
drwxr-xr-x   8 jamie  staff    256 20 Apr 15:15 T-09
drwxr-xr-x   8 jamie  staff    256 20 Apr 15:39 T-10
drwxr-xr-x   8 jamie  staff    256 20 Apr 15:47 T-11
drwxr-xr-x   8 jamie  staff    256 20 Apr 15:57 T-12
drwxr-xr-x   8 jamie  staff    256 20 Apr 16:05 T-13
drwxr-xr-x   3 jamie  staff     96 20 Apr 16:05 T-14
-rw-r--r--   1 jamie  staff  25280 20 Apr 13:29 task-manifest.json[0m
[0m$ [0mls -la /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/ 2>/dev/null || echo "directory does not exist"
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-t10.test.ts[90m [limit=60][0m
[0m→ [0mRead pipeline/phase-1/T-13
[0m



[0m$ [0mls /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/T-14/dev-output.md[0m[0m→ [0mRead pipeline/phase-1/T-13/self-assessment.md
[0m→ [0mRead pipeline/phase-1/T-14/dev-output.md
Now I have a thorough understanding of the codebase. Let me analyze what T-14 requires:

**T-14 Analysis:**
- `get_events_range` is **already** implemented in `calendar.ts` (from T-12)
- The tool is **already** wired into the agent loop in `agent.ts` (from T-12)
- The system prompt **already** provides live context with current datetime and TZ (Block 2) — this enables natural language date resolution
- The tool description **already** instructs the model to resolve natural language dates using the system prompt

What T-14 **actually needs** to add:
1. **Enhanced system prompt guidance** specifically for multi-day ranges, "next Tuesday", "this week" etc.
2. **Enhanced tool description** to be more explicit about range queries like "this week" (Monday to Sunday)
3. **A new test file** `calendar-t14.test.ts` that tests the acceptance criteria
4. **Self-assessment.md**

Let me check what the task manifest says more carefully, and look at what the existing system prompt provides:
[0m→ [0mRead pipeline/phase-1/task-manifest.json
[0m
[0m[x] Read existing codebase to understand current structure
[ ] Enhance calendar.ts get_events_range tool description for natural language date resolution
[ ] Enhance agent.ts system prompt with range query / week-boundary instructions
[ ] Write calendar-t14.test.ts test file
[ ] Write self-assessment.md to pipeline/phase-1/T-14/

[0m# [0mTodos
Now I understand what T-14 requires. The infrastructure is all in place from T-12, but T-14 needs:

1. **Enhanced `getEventsRangeTool` description** — more explicit guidance on resolving "next Tuesday", "this week" (Monday–Sunday), "tomorrow" etc., using the TZ from env
2. **Enhanced `buildSystemPrompt()` Identity block** — add date range resolution rules for the agent
3. **New `calendar-t14.test.ts`** — tests for the 3 acceptance criteria
4. **Header comment updates** in both files to document T-14

Let me start:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -10,8 +10,16 @@
 *     so the agent can relay this clearly to the user.
 *   - Tool descriptions updated to guide the model to format results as a
 *     readable chronological list with start time, title, and location.
 *
+* T-14: Events on a specific date or range
+*   - getEventsRangeTool description extended with explicit natural language date
+*     resolution rules: 'next Tuesday', 'this week' (Mon–Sun), 'tomorrow', etc.
+*   - Tool description instructs the model to use the TZ from the system prompt
+*     Live Context block (not UTC) when resolving date boundaries.
+*   - Week boundary rule: 'this week' = Monday 00:00:00 local → Sunday 23:59:59 local.
+*   - Single-day queries use 00:00:00 → 23:59:59 in the local timezone.
+*
 * Each tool is represented in two forms:
 *   1. An Anthropic tool definition object (Tool) that is included in the
 *      messages.create() call so the model knows it can invoke the tool.
 *   2. An async executor function that calls the Google Calendar MCP server

[0m
Now update the `getEventsRangeTool` description to include explicit natural language date resolution rules:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -219,34 +219,64 @@
  * Matches the Google Calendar MCP contract:
  *   name:         "get_events_range"
  *   description:  Returns calendar events between a start and end datetime.
  *   input_schema: start (ISO 8601), end (ISO 8601) — both required.
+ *
+ * T-14: Description extended with natural language date resolution rules.
+ * The model must resolve relative date references using the current datetime
+ * and timezone provided in the Live Context block of the system prompt.
  */
 export const getEventsRangeTool: Anthropic.Tool = {
   name: "get_events_range",
   description:
     "Returns all calendar events between a start and end datetime. " +
     "Use this when the user asks about events on a specific date, a date range, " +
-    "or any variation of 'what do I have next Tuesday?' or 'what's on this week?'. " +
-    "Both start and end must be ISO 8601 datetime strings (e.g. '2026-04-21T00:00:00Z'). " +
-    "Use the current datetime from the system prompt to resolve natural language dates " +
-    "before calling this tool.",
+    "or uses natural language like 'next Tuesday', 'this week', 'tomorrow', " +
+    "'next week', 'this weekend', or any named day of the week. " +
+    "\n\n" +
+    "IMPORTANT — Date resolution rules (T-14):\n" +
+    "Always resolve natural language date references using the current datetime AND " +
+    "timezone from the Live Context block in the system prompt. Never use UTC as the " +
+    "local timezone unless the system prompt explicitly states the timezone is UTC.\n" +
+    "\n" +
+    "Single-day queries (e.g. 'next Tuesday', 'tomorrow', 'Friday'):\n" +
+    "  start = YYYY-MM-DDT00:00:00<tz-offset>  (midnight at start of that day in local TZ)\n" +
+    "  end   = YYYY-MM-DDT23:59:59<tz-offset>  (last second of that day in local TZ)\n" +
+    "\n" +
+    "Week queries (e.g. 'this week', 'next week'):\n" +
+    "  'This week' = Monday of the current ISO week at 00:00:00 local TZ through " +
+    "Sunday of the same week at 23:59:59 local TZ.\n" +
+    "  'Next week' = Monday of the next ISO week at 00:00:00 local TZ through " +
+    "Sunday of that week at 23:59:59 local TZ.\n" +
+    "\n" +
+    "Examples (assuming TZ is Europe/London at UTC+1 on Monday 2026-04-20):\n" +
+    "  'next Tuesday'  → start='2026-04-21T00:00:00+01:00', end='2026-04-21T23:59:59+01:00'\n" +
+    "  'this week'     → start='2026-04-20T00:00:00+01:00', end='2026-04-26T23:59:59+01:00'\n" +
+    "  'tomorrow'      → start='2026-04-21T00:00:00+01:00', end='2026-04-21T23:59:59+01:00'\n" +
+    "\n" +
+    "Both start and end must be ISO 8601 datetime strings with the local timezone offset " +
+    "(e.g. '2026-04-21T00:00:00+01:00'), not UTC Z-suffix, unless the configured TZ is UTC. " +
+    "When presenting results, format each event as a list item with start time, title, and " +
+    "location (if present). If no events are found, say so clearly.",
   input_schema: {
     type: "object" as const,
     properties: {
       start: {
         type: "string",
         description:
-          "Start of the date/time range in ISO 8601 format " +
-          "(e.g. '2026-04-21T00:00:00Z' or '2026-04-21T00:00:00+01:00'). " +
-          "Resolve natural language dates using the current datetime from the system prompt.",
+          "Start of the date/time range in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T00:00:00+01:00'). " +
+          "Resolve natural language dates using the current datetime and TZ from the " +
+          "system prompt Live Context block. For a single-day query, use midnight (T00:00:00) " +
+          "of that day in the local timezone.",
       },
       end: {
         type: "string",
         description:
-          "End of the date/time range in ISO 8601 format " +
-          "(e.g. '2026-04-21T23:59:59Z' or '2026-04-27T23:59:59+01:00'). " +
-          "Must be after start.",
+          "End of the date/time range in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T23:59:59+01:00'). " +
+          "For a single-day query, use 23:59:59 of that day in the local timezone. " +
+          "For 'this week', use Sunday at 23:59:59 local TZ. Must be after start.",
       },
     },
     required: ["start", "end"],
   },



[0m[0m# [0mTodos

[x] Read existing codebase to understand current structure
[x] Enhance calendar.ts get_events_range tool description for natural language date resolution
[ ] Enhance agent.ts system prompt with range query / week-boundary instructions
[ ] Write calendar-t14.test.ts test file
[ ] Write self-assessment.md to pipeline/phase-1/T-14/
[0mNow update `agent.ts` — add T-14 to the header and enhance the Identity block with date-range resolution guidance:
[0m← [0mEdit packages/orchestrator/src/agent.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -17,8 +17,14 @@
 * that when the agent receives event data from get_todays_events, it formats
 * the result as a readable chronological list (time + title + location).
 * Empty calendar responses are shown as "You have nothing scheduled today."
 *
+* T-14: System prompt Identity block extended with natural language date
+* resolution rules so the agent can translate 'next Tuesday', 'this week',
+* 'tomorrow', etc. to ISO 8601 datetime strings (with local TZ offset) before
+* calling get_events_range. The Live Context block provides the current
+* datetime and TZ required for this resolution.
+*
 * All SQL uses parameterised queries ($1, $2, …) — no string interpolation.
 *
 * Database connection is obtained from the shared `pool` singleton which
 * reads DATABASE_URL from process.env via the shared env module.

[0m

Now update the Identity block in `buildSystemPrompt()` to add T-14 date resolution rules while keeping exactly 5 `##` headers:
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -114,10 +114,28 @@
   1. 9:00 AM — Stand-up @ Zoom
   2. 12:30 PM — Lunch with Alice
   3. 3:00 PM — Design Review @ Office
 
-If the calendar is empty for the requested period, respond with exactly: "You have nothing scheduled today."`,
+If the calendar is empty for the requested period, respond with exactly: "You have nothing scheduled today."
 
+--- Date resolution rules (T-14) ---
+When the user mentions a relative date or date range, resolve it to ISO 8601 datetime strings using the current datetime and timezone from the Live Context block below BEFORE calling get_events_range. Always use the local timezone offset (e.g. +01:00, -05:00), not Z/UTC, unless the configured timezone IS UTC.
+
+Single-day queries (e.g. "next Tuesday", "tomorrow", "this Friday"):
+  start = <resolved date>T00:00:00<tz-offset>
+  end   = <resolved date>T23:59:59<tz-offset>
+
+Week queries:
+  "This week" = Monday of the current ISO week at T00:00:00<tz-offset> through Sunday at T23:59:59<tz-offset>.
+  "Next week" = Monday of the following ISO week at T00:00:00<tz-offset> through Sunday at T23:59:59<tz-offset>.
+
+Named-day resolution ("next Tuesday" when today is Monday 2026-04-20):
+  "next Tuesday" = the Tuesday that is NEXT after today = 2026-04-21.
+  "this Tuesday" when today is Monday = 2026-04-21 (same week).
+  If today IS Tuesday, "next Tuesday" = 7 days from now.
+
+Always derive day offsets from the current date in the Live Context block. The ISO week starts on Monday (ISO 8601).`,
+
     // Block 2: Live context
     `## Live Context
 Current datetime: ${localDatetime}
 ISO 8601: ${isoDatetime}

[0m
[0m# [0mTodos[x] Read existing codebase to understand current structure
[x] Enhance calendar.ts get_events_range tool description for natural language date resolution
[x] Enhance agent.ts system prompt with range query / week-boundary instructions
[ ] Write calendar-t14.test.ts test file
[ ] Write self-assessment.md to pipeline/phase-1/T-14/
[0m

Now write the T-14 test file:
[0m← [0mWrite packages/orchestrator/src/__tests__/calendar-t14.test.tsWrote file successfully.
[0m

Now let's run the tests to verify everything passes:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && pnpm --filter orchestrator test 2>&1
[0m
> @lifeos/orchestrator@0.0.1 test /Users/jamie/Documents/jamie-lifeos/packages/orchestrator
> vitest run --config vitest.config.ts


 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator


 Test Files  7 passed (7)
      Tests  182 passed (182)
   Start at  16:09:28
   Duration  2.07s (transform 1.33s, setup 0ms, import 1.88s, tests 3.78s, environment 0ms)
All 182 tests pass (up from 159, adding 23 new T-14 tests). Now let's also run the TypeScript type check:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx tsc --noEmit 2>&1
Clean. Now write the self-assessment:
[0m[0m# [0mTodos
[x] Read existing codebase to understand current structure
[x] Enhance calendar.ts get_events_range tool description for natural language date resolution
[x] Enhance agent.ts system prompt with range query / week-boundary instructions
[x] Write calendar-t14.test.ts test file
[ ] Write self-assessment.md to pipeline/phase-1/T-14/[0m


[0m← [0mWrite pipeline/phase-1/T-14/self-assessment.md

Wrote file successfully.[0m
[0m# [0mTodos[0m


[x] Read existing codebase to understand current structure
[x] Enhance calendar.ts get_events_range tool description for natural language date resolution
[x] Enhance agent.ts system prompt with range query / week-boundary instructions
[x] Write calendar-t14.test.ts test file
[x] Write self-assessment.md to pipeline/phase-1/T-14/T-14 is complete. Here's a summary of what was done:

## T-14 Implementation Summary

**Approach:** T-14 is a prompt-engineering task. The `get_events_range` tool and agent loop were already fully wired by T-12. T-14's job is to give the model the guidance it needs to resolve natural language date references to ISO 8601 before calling the tool.

### Changes made

**`packages/orchestrator/src/tools/calendar.ts`**
- Extended `getEventsRangeTool` description with explicit T-14 date resolution rules:
  - Single-day queries: `T00:00:00<tz-offset>` → `T23:59:59<tz-offset>` in local TZ
  - Week queries: Monday T00:00:00 → Sunday T23:59:59 (ISO week, local TZ)
  - Concrete examples for 'next Tuesday', 'this week', 'tomorrow'
  - Instructs use of local timezone offset (not Z/UTC)
  - References the Live Context block as the source for current datetime + TZ

**`packages/orchestrator/src/agent.ts`**
- Extended `buildSystemPrompt()` Identity block with a "Date resolution rules (T-14)" section covering single-day queries, week queries, and named-day resolution logic — while preserving the 5 `##` block invariant from T-10

**`packages/orchestrator/src/__tests__/calendar-t14.test.ts`** (new)
- 23 tests across 3 suites (AC1/AC2/AC3)

**`pipeline/phase-1/T-14/self-assessment.md`** (new)

**Test results: 182/182 pass. `tsc --noEmit` clean.**
