[93m[1m! [0m agent "ag-06-refactor" is a subagent, not a primary agent. Falling back to default agent
[0m
[0m

> build · claude-sonnet-4-6I'll start by reading all the files in scope and the corresponding test files.
[0m→ [0mRead packages/orchestrator/src/tools/todoist.ts
[0m→ [0mRead packages/shared/src/env.ts
[0m→ [0mRead packages/shared/dist/env.d.ts
[0m→ [0mRead packages/shared/dist/env.js
[0m→ [0mRead packages/shared/dist/env.d.ts.map
Now let me find and read the test files:
[0m✱ [0mGlob "**/*.test.ts"[90m in packages/orchestrator · 12 matches[0m
[0m✱ [0mGlob "pipeline/phase-2/task-1"[90m in . · 0 matches[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/todoist-task1.test.ts
[0m→ [0mRead packages/orchestrator/src/__tests__/todoist-task1.test.ts[90m [offset=1401][0m
Now let me run the tests to confirm they all pass before making any changes:
[0mRUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos


 Test Files  1 passed (1)
      Tests  71 passed (71)
   Start at  06:21:33
   Duration  224ms (transform 64ms, setup 0ms, import 72ms, tests 39ms, environment 0ms)



[0m[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npx vitest run packages/orchestrator/src/__tests__/todoist-task1.test.ts 2>&171 tests pass. Now I'll perform a thorough analysis of `todoist.ts` for refactor opportunities. Let me note what I've observed:
[0m# [0mTodos[x] Analyse todoist.ts for refactor opportunities
[ ] Apply conservative improvements to todoist.ts
[ ] Re-run tests to verify green
[ ] Write refactor-report.md to pipeline/phase-2/task-1/
[0m

**Observations from the analysis:**

1. **`getTodoistToken()`** — The `env` object in `packages/shared/src/env.ts` already has `TODOIST_API_TOKEN` as a typed field in `EnvConfig`. The `(env as unknown as Record<string, unknown>).TODOIST_API_TOKEN` cast is redundant — `env.TODOIST_API_TOKEN` can be used directly. The `process.env` fallback is then also unnecessary since `env` already handles that.

2. **HTTP error handler is duplicated** — The same pattern (`await response.text().catch(() => "(unreadable)")` + log + return error JSON) appears in all 5 operations. This should be extracted into a helper.

3. **`buildAuthHeaders`** — Always returns the same two headers. Fine as-is, no issue.

4. **`formatTask`** — Minor: the `priority` label appended with `||` separator is fine. No changes needed.

5. **`getTasks`** uses `new URL(...).toString()` unnecessarily when it could just pass the URL object directly to `fetch`, but this is a very minor style concern and `fetch` accepts strings — not worth changing.

6. **`update_task`** uses `task.id ?? taskId` in its success message — this is correct and clear.

The two meaningful refactors are:
- Remove the `env` cast — use `env.TODOIST_API_TOKEN` directly (type-safe, no cast needed)
- Extract `handleHttpError` helper to eliminate the 5-way duplication of the HTTP error response pattern
[0m← [0mEdit packages/orchestrator/src/tools/todoist.ts[0m

Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -17,17 +17,12 @@
 import { env, logger } from "@lifeos/shared";
 
 const log = logger.child({ service: "todoist-tools" });
 
-// TODOIST_API_TOKEN is not part of the shared EnvConfig (it is Todoist-specific).
-// We read it via a type-safe accessor that looks in both the shared env object
-// (for test mocks that inject it there) and process.env as a fallback.
+// TODOIST_API_TOKEN is declared in EnvConfig and populated by the shared env
+// loader (with an empty-string default when unset).  Read it directly.
 function getTodoistToken(): string {
-  // Allow test mocks to inject the token via the shared env object.
-  const fromEnv = (env as unknown as Record<string, unknown>).TODOIST_API_TOKEN;
-  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
-  // Fall back to process.env at runtime (set via .env file or system environment).
-  return process.env.TODOIST_API_TOKEN ?? "";
+  return env.TODOIST_API_TOKEN;
 }
 
 const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";
 

Now extract the duplicated HTTP-error response into a shared helper:
[0m← [0mEdit packages/orchestrator/src/tools/todoist.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -51,8 +51,22 @@
     "Content-Type": "application/json",
   };
 }
 
+/**
+ * Handle a non-OK HTTP response: reads the body text, logs the status, and
+ * returns a JSON-serialised error string.  Never throws.
+ */
+async function httpErrorResponse(
+  response: Response,
+  operation: string,
+  context?: Record<string, unknown>,
+): Promise<string> {
+  const errorText = await response.text().catch(() => "(unreadable)");
+  log.error({ status: response.status, ...context }, `${operation} HTTP error`);
+  return JSON.stringify({ error: `Todoist API error ${response.status}: ${errorText}` });
+}
+
 // ---------------------------------------------------------------------------
 // Response formatting
 // ---------------------------------------------------------------------------
 



[0mGood — that's expected for now. I'll wire it up by replacing each inline error-response block:
[0m← [0mEdit packages/orchestrator/src/tools/todoist.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -117,13 +117,9 @@
   headers: buildAuthHeaders(token),
 });
 
 if (!response.ok) {
-  const errorText = await response.text().catch(() => "(unreadable)");
-  log.error({ status: response.status }, "get_tasks HTTP error");
-  return JSON.stringify({
-    error: `Todoist API error ${response.status}: ${errorText}`,
-  });
+  return httpErrorResponse(response, "get_tasks");
 }
 
 const tasks = (await response.json()) as TodoistTask[];
 return formatTasks(tasks);

[0m

[0m← [0mEdit packages/orchestrator/src/tools/todoist.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -160,13 +160,9 @@
   body: JSON.stringify(body),
 });
 
 if (!response.ok) {
-  const errorText = await response.text().catch(() => "(unreadable)");
-  log.error({ status: response.status }, "create_task HTTP error");
-  return JSON.stringify({
-    error: `Todoist API error ${response.status}: ${errorText}`,
-  });
+  return httpErrorResponse(response, "create_task");
 }
 
 const task = (await response.json()) as TodoistTask;
 return `Task created successfully (id: ${task.id}): ${task.content}`;
[0m

[0m← [0mEdit packages/orchestrator/src/tools/todoist.ts

[0mIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -190,13 +190,9 @@
     headers: buildAuthHeaders(token),
   });
 
   if (!response.ok) {
-    const errorText = await response.text().catch(() => "(unreadable)");
-    log.error({ status: response.status, taskId }, "complete_task HTTP error");
-    return JSON.stringify({
-      error: `Todoist API error ${response.status}: ${errorText}`,
-    });
+    return httpErrorResponse(response, "complete_task", { taskId });
   }
 
   return `Task ${taskId} completed successfully.`;
 } catch (err) {

[0m← [0mEdit packages/orchestrator/src/tools/todoist.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -219,13 +219,9 @@
     headers: buildAuthHeaders(token),
   });
 
   if (!response.ok) {
-    const errorText = await response.text().catch(() => "(unreadable)");
-    log.error({ status: response.status, taskId }, "delete_task HTTP error");
-    return JSON.stringify({
-      error: `Todoist API error ${response.status}: ${errorText}`,
-    });
+    return httpErrorResponse(response, "delete_task", { taskId });
   }
 
   return `Task ${taskId} deleted successfully.`;
 } catch (err) {

[0m

[0m← [0mEdit packages/orchestrator/src/tools/todoist.ts
[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/todoist.ts
@@ -261,13 +261,9 @@
   body: JSON.stringify(body),
 });
 
 if (!response.ok) {
-  const errorText = await response.text().catch(() => "(unreadable)");
-  log.error({ status: response.status, taskId }, "update_task HTTP error");
-  return JSON.stringify({
-    error: `Todoist API error ${response.status}: ${errorText}`,
-  });
+  return httpErrorResponse(response, "update_task", { taskId });
 }
 
 const task = (await response.json()) as TodoistTask;
 return `Task ${task.id ?? taskId} updated successfully.`;

Now verify the final state of the file looks correct:
[0m→ [0mRead packages/orchestrator/src/tools/todoist.ts
The file looks clean. Now run the full test suite again:
[0m
[0m


RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos


 Test Files  1 passed (1)
      Tests  71 passed (71)
   Start at  06:22:41
   Duration  212ms (transform 51ms, setup 0ms, import 54ms, tests 42ms, environment 0ms)[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npx vitest run packages/orchestrator/src/__tests__/todoist-task1.test.ts 2>&171/71 still green. Now also do a TypeScript check to confirm no LSP errors remain:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos/packages/orchestrator && npx tsc --noEmit 2>&1
No TypeScript errors. Now create the pipeline directory and write the report:
[0m

[0m$ [0mmkdir -p /Users/jamie/Documents/jamie-lifeos/pipeline/phase-2/task-1[0m


[0m[0m# [0mTodos
[x] Analyse todoist.ts for refactor opportunities
[x] Apply conservative improvements to todoist.ts
[x] Re-run tests to verify green
[ ] Write refactor-report.md to pipeline/phase-2/task-1/[0m← [0mWrite pipeline/phase-2/task-1/refactor-report.mdWrote file successfully.

[0m
[0m# [0mTodos


[x] Analyse todoist.ts for refactor opportunities
[x] Apply conservative improvements to todoist.ts
[x] Re-run tests to verify green
[x] Write refactor-report.md to pipeline/phase-2/task-1/[0mRefactor complete. Here is a summary of what was done:

---

## AG-06 Refactor — Phase 2 / Task 1

**Result:** PASS — 71/71 tests green, `tsc --noEmit` clean.

### Two changes applied to `packages/orchestrator/src/tools/todoist.ts`

**1. Removed redundant `env` cast in `getTodoistToken()`**  
`TODOIST_API_TOKEN` is already a typed field on `EnvConfig`. The `(env as unknown as Record<string, unknown>)` cast and the `process.env` fallback were both unnecessary — `env` already handles the fallback internally. The function collapsed to a single `return env.TODOIST_API_TOKEN;`.

**2. Extracted `httpErrorResponse()` helper**  
The same four-line block (read body text → log error → return JSON error string) was duplicated verbatim in all five operations. Extracting it into a shared async helper eliminates ~20 lines of copy-paste, enforces a consistent log/error format, and makes each operation body easier to read. An optional `context` parameter preserves the per-operation `taskId` logging for mutating operations.

### Deliberately unchanged
- `buildAuthHeaders` (no practical gain converting to a constant)
- `new URL(...).toString()` in `getTasks` (cosmetic only)
- `taskId` guard pattern (only 3 occurrences, clear inline)
- All public interfaces and test files

Report written to `pipeline/phase-2/task-1/refactor-report.md`.
