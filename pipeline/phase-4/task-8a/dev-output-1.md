I'll implement this task to register the OAuth and activity query tools in the agent. Let me start by reading the in-scope source files and tests to understand what needs to be implemented.
Now let me read the test file to understand what needs to be implemented:
Now I need to check if there are any tests specifically for the Strava tools. Let me look for test files that might test the Strava tool registration:
Perfect! I found the test file for Strava tools. Let me read it:
Now let me check if there's a Strava tools module that I need to understand:
Now I understand what needs to be implemented. Looking at the test file, I need to register the Strava tools (`get_strava_oauth_url` and `get_strava_activities`) in the agent.ts file. The tests are checking that these tools are included in the `TOOL_DEFINITIONS` array that gets passed to the Anthropic API.

Let me examine the current structure of the agent.ts file to see where I need to add the Strava tool definitions. I can see that there are already tool definitions for other services like Todoist, Gmail, People, etc.

Now I need to:
1. Add Strava tool definitions to the agent.ts file
2. Add the Strava tool names to the appropriate sets for routing
3. Add the execution logic for Strava tools

Let me implement this:
Now I need to add the Strava tool names to the routing sets and add the execution logic:
Now I need to update the `isUntrustedTool` function to include Strava tools:
Now I need to add the execution logic for Strava tools in the `executeTool` function:
Now I need to implement the `executeStravaTool` function. Let me add it before the `executeTool` function:
Now let me run the validation commands to check if my implementation is working correctly:
Now let me run the tests to see if they pass:
Great! All tests are passing. Now let me create the self-assessment.md file:
Perfect! I have successfully implemented task 8a by registering the OAuth and activity query tools in the agent. Let me summarize what was accomplished:

## Summary

I successfully implemented the registration of Strava tools in the agent.ts file:

### ✅ **Acceptance Criteria Met:**

1. **AC1: get_strava_oauth_url tool is registered with proper schema**
   - Added tool definition with description and input schema
   - Configured as parameterless tool (no required parameters)

2. **AC2: get_strava_activities tool is registered with sport_type and date filters**
   - Added comprehensive tool definition with filtering parameters
   - Includes `sport_type`, `start_date`, and `end_date` filters
   - Requires `athlete_id` parameter

3. **AC3: Tool schemas include required parameters and descriptions**
   - All tools have detailed descriptions
   - Proper required parameters arrays
   - Descriptive parameter documentation

### 🔧 **Implementation Details:**

- **Added Strava tool definitions** to the `TOOL_DEFINITIONS` array
- **Implemented tool routing** via `STRAVA_TOOL_NAMES` set
- **Created execution logic** in `executeStravaTool` function
- **Integrated security handling** by marking tools as untrusted
- **Followed established patterns** used by other tool modules

### ✅ **All Validation Commands Passed:**
- TypeScript compilation: ✅ No errors
- Biome formatting: ✅ Applied fixes
- Biome linting: ✅ No violations
- Tests: ✅ All 682 tests passed (26 test files)

The implementation follows the existing codebase patterns and security requirements, ensuring that the Strava tools are properly integrated into the agent's tool execution system while maintaining the established architecture and security standards.
[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
[0m→ [0mRead packages/orchestrator/src/agent.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts[90m [offset=1384][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/agent.test.ts
[0m✱ [0mGrep "strava|oauth"[90m in packages/orchestrator/src/__tests__ · 51 matches[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/agent-strava-tools.test.ts
[0m→ [0mRead packages/orchestrator/src/tools/strava.ts
[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -94,8 +94,9 @@
 import { executeLifeEventsTool } from "./tools/life_events.js";
 import { executeNudgesTool } from "./tools/nudges.js";
 import { executePeopleTool } from "./tools/people.js";
 import { executeToDoistTool } from "./tools/todoist.js";
+import { get_strava_oauth_url, get_strava_activities } from "./tools/strava.js";
 
 // ---------------------------------------------------------------------------
 // Constants
 // ---------------------------------------------------------------------------

[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -730,8 +730,52 @@
     },
   },
 ];
 
+/**
+ * Strava tool definitions.
+ * Task-8a (Phase 4): Strava tools added — get_strava_oauth_url, get_strava_activities.
+ */
+const stravaToolDefinitions: Anthropic.Tool[] = [
+  {
+    name: "get_strava_oauth_url",
+    description:
+      "Generate a Strava OAuth authorization URL with CSRF protection. Returns a URL that the user can visit to authorize the application to access their Strava data.",
+    input_schema: {
+      type: "object",
+      properties: {},
+      required: [],
+    },
+  },
+  {
+    name: "get_strava_activities",
+    description:
+      "Retrieve Strava activities from the database with optional filters for sport type and date range. Returns activity data including distance, time, and performance metrics.",
+    input_schema: {
+      type: "object",
+      properties: {
+        athlete_id: {
+          type: "number",
+          description: "The Strava athlete ID to retrieve activities for.",
+        },
+        sport_type: {
+          type: "string",
+          description: "Filter activities by sport type (e.g. 'Run', 'Ride', 'Swim').",
+        },
+        start_date: {
+          type: "string",
+          description: "Filter activities from this date onwards in YYYY-MM-DD format.",
+        },
+        end_date: {
+          type: "string",
+          description: "Filter activities up to this date in YYYY-MM-DD format.",
+        },
+      },
+      required: ["athlete_id"],
+    },
+  },
+];
+
 const TOOL_DEFINITIONS: Anthropic.Tool[] = [
   ...calendarReadToolDefinitions,
   ...calendarWriteToolDefinitions,
   ...calendarFreeBusyToolDefinitions,
@@ -739,8 +783,9 @@
   ...gmailToolDefinitions,
   ...peopleToolDefinitions,
   ...lifeEventsToolDefinitions,
   ...nudgesToolDefinitions,
+  ...stravaToolDefinitions,
 ];
 
 // ---------------------------------------------------------------------------
 // Tool executor

[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -869,8 +869,16 @@
  */
 const NUDGES_TOOL_NAMES = new Set<string>(["create_nudge", "dismiss_nudge"]);
 
 /**
+ * The set of Strava tool names handled by executeStravaTool.
+ * Task-8a (Phase 4): All Strava operations are registered here so the
+ * tool loop routes them to the Strava module rather than the unknown-tool
+ * handler.
+ */
+const STRAVA_TOOL_NAMES = new Set<string>(["get_strava_oauth_url", "get_strava_activities"]);
+
+/**
  * The set of write tool names that must be confirmation-gated.
  * When the agent calls one of these tools, the tool loop intercepts the call,
  * saves a ConfirmationPayload, and returns a synthetic tool_result so the
  * model can compose a proposal text — the actual calendar mutation is deferred

[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -900,9 +900,10 @@
     TODOIST_TOOL_NAMES.has(toolName) ||
     CALENDAR_TOOL_NAMES.has(toolName) ||
     LIFE_EVENTS_TOOL_NAMES.has(toolName) ||
     NUDGES_TOOL_NAMES.has(toolName) ||
-    PEOPLE_TOOL_NAMES.has(toolName)
+    PEOPLE_TOOL_NAMES.has(toolName) ||
+    STRAVA_TOOL_NAMES.has(toolName)
   );
 }
 
 /**

[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -952,8 +952,13 @@
   const nudgesInput = { ...toolInput, operation: toolName };
   return executeNudgesTool(JSON.stringify(nudgesInput));
 }
 
+// Delegate Strava tools to the Strava module (Task-8a, Phase 4).
+if (STRAVA_TOOL_NAMES.has(toolName)) {
+  return executeStravaTool(toolName, toolInput);
+}
+
 // Unknown tool — return a graceful error so the model can handle it.
 logger
   .child({ service: "agent" })
   .warn({ toolName, toolInput }, "Unknown tool called — no handler registered");

[0m
[0m← [0mEdit packages/orchestrator/src/agent.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -906,8 +906,46 @@
   );
 }
 
 /**
+ * Execute a Strava tool call and return its result as a string.
+ * Delegates to the appropriate Strava function based on toolName.
+ *
+ * @param toolName   The name of the Strava tool to execute.
+ * @param toolInput  The input parameters for the tool.
+ * @returns          A string representation of the tool result.
+ */
+async function executeStravaTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
+  try {
+    if (toolName === "get_strava_oauth_url") {
+      const result = await get_strava_oauth_url(toolInput);
+      return JSON.stringify({ oauth_url: result });
+    }
+
+    if (toolName === "get_strava_activities") {
+      const result = await get_strava_activities(toolInput as {
+        athlete_id: number;
+        sport_type?: string;
+        start_date?: string;
+        end_date?: string;
+        caller_athlete_id?: number;
+      });
+      return JSON.stringify({ activities: result });
+    }
+
+    // Unknown Strava tool
+    return JSON.stringify({ error: `Unknown Strava tool: ${toolName}` });
+  } catch (error) {
+    logger
+      .child({ service: "agent" })
+      .error({ err: error, toolName, toolInput }, "Strava tool execution error");
+    return JSON.stringify({ 
+      error: error instanceof Error ? error.message : "Strava tool execution failed" 
+    });
+  }
+}
+
+/**
  * Execute a single tool call and return its result as a string.
  * Delegates to the appropriate tool module based on toolName.
  * Unrecognised tools return an error string so the model can handle it
  * gracefully rather than crashing the loop.

[0m
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/orchestrator/src/agent.ts packages/orchestrator/src/__tests__/agent.test.ts
Checked 2 files in 50ms. Fixed 1 file.
[0m
[0m$ [0mpnpm exec biome check packages/orchestrator/src/agent.ts packages/orchestrator/src/__tests__/agent.test.ts
Checked 2 files in 20ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  Test Files  26 passed (26)
packages/orchestrator test:       Tests  682 passed (682)
packages/orchestrator test:    Start at  06:55:02
packages/orchestrator test:    Duration  7.54s (transform 1.96s, setup 0ms, import 2.37s, tests 14.55s, environment 4ms)
packages/orchestrator test: Done
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-8a
(no output)
[0m
[0m← [0mWrite pipeline/phase-4/task-8a/self-assessment.md
Wrote file successfully.
[0m
