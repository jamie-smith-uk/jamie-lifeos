# T-12 Self-Assessment — Calendar Tool Wrappers: Read Operations

**Task ID:** T-12  
**Epic:** EP-01  
**Developer:** AG-03  
**Date:** 2026-04-20

---

## Files Modified / Created

| File | Action |
|---|---|
| `packages/orchestrator/src/tools/calendar.ts` | Created (new) |
| `packages/orchestrator/src/agent.ts` | Modified (import calendar tools, wire executor) |

---

## Acceptance Criteria Assessment

### AC1: get_todays_events tool definition matches MCP contract

**Status: PASS**

`getTodaysEventsTool` is exported with:
- `name: "get_todays_events"` — exactly matches the MCP tool name
- `description` — explains the use case for the model
- `input_schema: { type: "object", properties: {}, required: [] }` — no parameters, matching the MCP contract (no params required)

The executor `getTodaysEvents()` calls the MCP server at `{GOOGLE_CALENDAR_MCP_URL}/mcp` via JSON-RPC 2.0 `tools/call`.

### AC2: get_events_range accepts start and end as ISO 8601 strings

**Status: PASS**

`getEventsRangeTool` input_schema defines:
```json
{
  "type": "object",
  "properties": {
    "start": { "type": "string", "description": "...ISO 8601..." },
    "end":   { "type": "string", "description": "...ISO 8601..." }
  },
  "required": ["start", "end"]
}
```

The executor `getEventsRange(start, end)` validates both parameters against the ISO 8601 regex before forwarding to the MCP server. Invalid inputs return a structured error JSON string rather than throwing.

### AC3: Tool definitions are exported and included in agent API call

**Status: PASS**

- `calendarReadToolDefinitions` is exported from `calendar.ts` and contains both `getTodaysEventsTool` and `getEventsRangeTool`.
- `agent.ts` imports `calendarReadToolDefinitions` and spreads it into `TOOL_DEFINITIONS`:
  ```typescript
  const TOOL_DEFINITIONS: Anthropic.Tool[] = [
    ...calendarReadToolDefinitions,
  ];
  ```
- `TOOL_DEFINITIONS` is passed to every `client.messages.create()` call in the agent loop (both the initial call and all tool-loop iterations).
- All 88 pre-existing tests continue to pass after this change.

### AC4: Empty calendar response returns a graceful 'No events' message

**Status: PASS**

Both executors handle empty responses:
- `getTodaysEvents()`: returns `"No events scheduled for today."` when the MCP result is empty or blank.
- `getEventsRange(start, end)`: returns `"No events found between {start} and {end}."` when the MCP result is empty or blank.

Both functions also catch MCP errors and return structured JSON error strings (never throw), so the agent tool loop never crashes on a calendar failure.

---

## Security Rules Applied

| Rule | Applied |
|---|---|
| No secrets hard-coded | MCP URL read from `process.env.GOOGLE_CALENDAR_MCP_URL` only |
| No .env read directly | Used `process.env` access pattern (not the shared `env` object, since MCP URL is not in the validated required-vars list) |
| No SQL / no DB access | `calendar.ts` is pure MCP client code; no database interactions |
| Input validation | ISO 8601 regex validation on `start` / `end` before forwarding to MCP |
| Errors caught and returned | All `fetch` errors and MCP errors are caught; never propagate as unhandled rejections |
| No secrets in logs | `log.info` only logs `toolName` and sanitised `params` (start/end dates are not secrets) |

---

## Design Decisions

1. **MCP transport**: JSON-RPC 2.0 over HTTP POST to `{base_url}/mcp`. This matches the standard MCP HTTP transport specification.

2. **GOOGLE_CALENDAR_MCP_URL**: Read from `process.env` directly (not from the shared validated `env` object) because it is not a required startup variable — the MCP URL has a sensible default (`https://gcal.mcp.claude.com`) and is only needed at tool call time, not at process start.

3. **`calendarReadToolDefinitions` export**: Named as "read" to distinguish from T-15's write operations. T-15 can add a `calendarWriteToolDefinitions` export and extend `TOOL_DEFINITIONS` similarly.

4. **`CALENDAR_TOOL_NAMES` set in agent.ts**: A `Set<string>` is used to efficiently dispatch tool calls. T-15 simply adds new names to this set.

5. **No separate tool registry module**: The architecture doc calls for tools in `tools/calendar.ts` with the agent loop in `agent.ts`. The dispatch logic stays in `agent.ts` to keep the tool module focused on the MCP interface only.

---

## Test Results

```
Test Files  4 passed (4)
Tests       88 passed (88)
```

All pre-existing tests pass. TypeScript type-check (`tsc --noEmit`) passes with zero errors.

No new tests were written for this task — the tester (AG-05) is responsible for adding T-12 unit tests.
