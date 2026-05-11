# Refactor Report — task-3: Add Todoist tool definitions to agent

**Phase:** 2  
**Task:** task-3  
**File in scope:** `packages/orchestrator/src/agent.ts`  
**Date:** 2026-04-21  

---

## Summary

The Developer's implementation is clean and correct. Two conservative, targeted improvements were made to reduce redundancy in the documentation block introduced by task-3.

---

## Changes Made

### 1. Removed redundant per-constant JSDoc comment (`agent.ts` lines 223–225)

**Before:**
```typescript
/**
 * Tool definitions to include in the Anthropic API call.
 * T-12 adds the calendar read tools: get_todays_events and get_events_range.
 * T-15 adds the calendar write tools: create_event, update_event,
 * delete_event, check_free_busy — these are included so the model is aware
 * of them, but are ONLY executed by the confirmation executor after explicit
 * user approval.
 * Task-3 (Phase 2): Todoist tools added — get_tasks, create_task,
 * complete_task, delete_task, update_task.
 */

/**
 * Todoist tool definitions for the Anthropic API.
 * All 5 operations: get_tasks, create_task, complete_task, delete_task, update_task.
 */
const todoistToolDefinitions: Anthropic.Tool[] = [
```

**After:**
```typescript
/**
 * Tool definitions to include in the Anthropic API call.
 * T-12 adds the calendar read tools: get_todays_events and get_events_range.
 * T-15 adds the calendar write tools: create_event, update_event,
 * delete_event, check_free_busy — these are included so the model is aware
 * of them, but are ONLY executed by the confirmation executor after explicit
 * user approval.
 * Task-3 (Phase 2): Todoist tools added — get_tasks, create_task,
 * complete_task, delete_task, update_task.
 */
const todoistToolDefinitions: Anthropic.Tool[] = [
```

**Rationale:** The per-constant JSDoc (`"Todoist tool definitions for the Anthropic API. All 5 operations: ..."`) duplicated information already stated in the section-level JSDoc immediately above. Removing it eliminates the duplicated documentation without any change to behaviour or public interface.

---

### 2. Updated section banner comment to include task-3 reference

**Before:**
```typescript
// ---------------------------------------------------------------------------
// Tool definitions (T-12: read tools; T-15: write tools)
// ---------------------------------------------------------------------------
```

**After:**
```typescript
// ---------------------------------------------------------------------------
// Tool definitions (T-12: read tools; T-15: write tools; Task-3: Todoist tools)
// ---------------------------------------------------------------------------
```

**Rationale:** The section banner comment listed only the earlier task references (T-12, T-15) but omitted Task-3's contribution (Todoist tools). Adding it keeps the banner consistent with the section content and aligned with the existing pattern used for calendar tool tasks.

---

## What Was NOT Changed

The following items were considered and deliberately left unchanged:

- **`required: []` on `get_tasks`**: The empty array is technically redundant in JSON Schema (the default is no required fields), but it is explicit defensive documentation of intent — consistent with the style of other tool definitions in the file. Removing it would be a style micro-optimisation with negligible benefit.

- **Inline `logger.child(...)` in `executeTool` unknown-tool path**: This creates a new child logger on each unknown-tool call. It is in an error path that should be rare in production, and the pattern is consistent with the rest of the file. Extracting it to a module-level constant would be a minor optimisation but would diverge from the existing style pattern without measurable benefit in context.

- **`TODOIST_TOOL_NAMES` Set ordering**: The tool names in `TODOIST_TOOL_NAMES` match the declaration order in `todoistToolDefinitions`. This is intentional and consistent.

- **`executeTool` routing comment**: The comment `// Delegate Todoist tools to the Todoist module (Task-3, Phase 2).` is clear and informative — no change.

---

## Test Results

All tests pass after refactoring:

- `packages/orchestrator/src/__tests__/agent-task3.test.ts`: **42/42 passed**
- Full `packages/orchestrator/src/__tests__/` suite: **367/367 passed** across 13 test files

No regressions introduced. Pre-existing failures in `packages/orchestrator/dist/__tests__/` are unrelated to this task (they are stale compiled artefacts with port conflicts and missing environment dependencies).

---

## Verdict

PASS — behaviour unchanged, documentation reduced by one redundant block, section banner updated for consistency. All tests green.
