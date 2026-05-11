# Refactor Report — Phase 2 / Task 1

**Task:** Create Todoist API client tool module  
**File refactored:** `packages/orchestrator/src/tools/todoist.ts`  
**Refactor agent:** AG-06  
**Date:** 2026-04-21  
**Test result (before):** 71/71 pass  
**Test result (after):** 71/71 pass  
**TypeScript check:** PASS (0 errors)

---

## Changes Made

### 1. Removed unnecessary `env` cast in `getTodoistToken()`

**Before:**
```ts
function getTodoistToken(): string {
  // Allow test mocks to inject the token via the shared env object.
  const fromEnv = (env as unknown as Record<string, unknown>).TODOIST_API_TOKEN;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  // Fall back to process.env at runtime (set via .env file or system environment).
  return process.env.TODOIST_API_TOKEN ?? "";
}
```

**After:**
```ts
function getTodoistToken(): string {
  return env.TODOIST_API_TOKEN;
}
```

**Rationale:**  
`TODOIST_API_TOKEN` is a typed field on `EnvConfig` (added in the same task's scope in `packages/shared/src/env.ts`). The `(env as unknown as Record<string, unknown>)` cast was written as if the field were not part of the interface, but it is — the developer had already updated both `env.ts` and its compiled outputs. The shared env loader handles the `process.env` fallback internally (defaulting to `""` when the variable is unset), so the second fallback branch in `getTodoistToken` was also redundant. Test mocks inject the token by supplying a full `env` mock object to `@lifeos/shared`, which the direct field access correctly picks up.

The simplified one-liner is type-safe, shorter, and eliminates a potentially confusing cast.

---

### 2. Extracted `httpErrorResponse()` helper — eliminated 5-way duplication

**Before (repeated verbatim in every operation):**
```ts
if (!response.ok) {
  const errorText = await response.text().catch(() => "(unreadable)");
  log.error({ status: response.status, taskId }, "complete_task HTTP error");
  return JSON.stringify({
    error: `Todoist API error ${response.status}: ${errorText}`,
  });
}
```

**After (single helper, called by each operation):**
```ts
async function httpErrorResponse(
  response: Response,
  operation: string,
  context?: Record<string, unknown>,
): Promise<string> {
  const errorText = await response.text().catch(() => "(unreadable)");
  log.error({ status: response.status, ...context }, `${operation} HTTP error`);
  return JSON.stringify({ error: `Todoist API error ${response.status}: ${errorText}` });
}
```

Each operation now calls:
```ts
return httpErrorResponse(response, "get_tasks");
// or
return httpErrorResponse(response, "complete_task", { taskId });
```

**Rationale:**  
The identical four-line block (read body text, log error, build JSON error string) appeared in all five operations. Extracting it into a helper:
- Eliminates ~20 lines of copy-paste code
- Ensures the log format and error JSON shape are consistent across all operations
- Makes each operation function shorter and easier to read
- Means any future change to the error format needs to happen in exactly one place

The `context` parameter (spread into the log call) preserves the `taskId` context logged by the mutating operations (`complete_task`, `delete_task`, `update_task`) without affecting `get_tasks` and `create_task`, which do not log a task ID on HTTP error.

---

## Changes NOT Made

The following were considered and deliberately left unchanged to stay conservative:

| Candidate | Reason not changed |
|---|---|
| `buildAuthHeaders` — always returns the same object | Could become a module-level constant, but the function form is clear and has negligible cost; no practical benefit |
| `new URL(...).toString()` in `getTasks` | `fetch` accepts a `URL` object directly, but the string form is fine and changing it would be a stylistic micro-edit with no readability gain |
| Shared `taskIdGuard` helper for the `!taskId?.trim()` checks | The guard is two lines and appears only in three places; extracting it would make the control flow less obvious at the call site |
| `update_task` body-building logic | Symmetric with `create_task` but serves a different set of optional fields; combining them would add accidental coupling |
| Test files | Not modified per instructions |
| Public interface (`executeToDoistTool` signature) | Not changed |

---

## Summary

Two targeted improvements were applied:

1. **Removed a redundant unsafe cast** — `getTodoistToken()` now reads `env.TODOIST_API_TOKEN` directly via the typed `EnvConfig` interface.
2. **Extracted `httpErrorResponse` helper** — eliminates five identical error-handling blocks, reducing the file from 320 lines to 309 lines while improving consistency and maintainability.

No behaviour was changed. All 71 tests pass and `tsc --noEmit` is clean.
