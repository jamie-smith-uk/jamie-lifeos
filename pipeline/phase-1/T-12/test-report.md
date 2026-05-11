# Test Report — T-12: Calendar tool wrappers: read operations

**Task:** T-12  
**Epic:** EP-01  
**Status:** PASS  
**Date:** 2026-04-20  
**Test file:** `packages/orchestrator/src/__tests__/calendar-t12.test.ts`  
**Implementation:** `packages/orchestrator/src/tools/calendar.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total tests (T-12 file) | 46 |
| Passed | 46 |
| Failed | 0 |
| Skipped | 0 |
| Duration | ~0.3s |

All four acceptance criteria are covered by at least one passing test. The full test suite (140 tests across 5 files) passed with zero failures.

---

## Acceptance Criteria Results

### AC1 — get_todays_events tool definition matches MCP contract

**Result: PASS** (8 tests)

| Test | Result |
|------|--------|
| `getTodaysEventsTool` is exported from `calendar.ts` | PASS |
| Tool name is exactly `get_todays_events` | PASS |
| Tool has a non-empty description string | PASS |
| `input_schema.type` is `"object"` | PASS |
| `input_schema` has a `properties` field | PASS |
| `input_schema.required` array is empty (no required parameters) | PASS |
| Tool definition conforms to Anthropic Tool shape (`name` + `description` + `input_schema`) | PASS |
| Description mentions `today` to match MCP contract intent | PASS |

The `getTodaysEventsTool` export exactly matches the MCP contract: `name: "get_todays_events"`, `input_schema: { type: "object", properties: {}, required: [] }`.

---

### AC2 — get_events_range accepts start and end as ISO 8601 strings

**Result: PASS** (11 tests)

| Test | Result |
|------|--------|
| `getEventsRangeTool` is exported from `calendar.ts` | PASS |
| Tool name is exactly `get_events_range` | PASS |
| `input_schema` requires both `start` and `end` | PASS |
| `start` property is typed as `string` in `input_schema` | PASS |
| `end` property is typed as `string` in `input_schema` | PASS |
| `start` description mentions ISO 8601 | PASS |
| `end` description mentions ISO 8601 | PASS |
| `getEventsRange` executes with valid ISO 8601 date-only strings (`2026-04-21`) | PASS |
| `getEventsRange` executes with ISO 8601 datetime strings with `Z` suffix | PASS |
| `getEventsRange` executes with ISO 8601 datetime strings with timezone offset (`+01:00`) | PASS |
| `getEventsRange` executes with ISO 8601 datetime without seconds | PASS |
| `getEventsRange` rejects invalid `start` parameter (natural language, not ISO 8601) | PASS |
| `getEventsRange` rejects invalid `end` parameter | PASS |
| `getEventsRange` passes `start` and `end` to MCP tool call correctly | PASS |
| `getEventsRange` does NOT call fetch when `start` is invalid | PASS |
| `getEventsRange` does NOT call fetch when `end` is invalid | PASS |

ISO 8601 validation is enforced before forwarding to the MCP server. Invalid inputs return a structured JSON error without making a network call.

---

### AC3 — Tool definitions are exported and included in agent API call

**Result: PASS** (12 tests)

| Test | Result |
|------|--------|
| `calendarReadToolDefinitions` is exported from `calendar.ts` | PASS |
| `calendarReadToolDefinitions` contains exactly two tools | PASS |
| Array includes `get_todays_events` | PASS |
| Array includes `get_events_range` | PASS |
| `getTodaysEventsTool` is the exact object in `calendarReadToolDefinitions` | PASS |
| `getEventsRangeTool` is the exact object in `calendarReadToolDefinitions` | PASS |
| Every tool in `calendarReadToolDefinitions` has `name`, `description`, `input_schema` | PASS |
| `agent.ts` spreads `calendarReadToolDefinitions` into `TOOL_DEFINITIONS` — verified via mock Anthropic API call | PASS |
| `executeCalendarTool` is exported from `calendar.ts` | PASS |
| `executeCalendarTool` routes `get_todays_events` correctly | PASS |
| `executeCalendarTool` routes `get_events_range` correctly | PASS |
| `executeCalendarTool` returns error JSON for unknown tool name | PASS |
| `executeCalendarTool` returns error JSON when `get_events_range` params are missing | PASS |

The integration test confirms that `agent.ts` includes both calendar tool definitions in every `messages.create()` call to the Anthropic API.

---

### AC4 — Empty calendar response returns a graceful 'No events' message to user

**Result: PASS** (15 tests)

| Test | Result |
|------|--------|
| `getTodaysEvents` returns `"No events"` message when MCP result content is empty array | PASS |
| `getTodaysEvents` returns `"No events"` message when text content is whitespace only | PASS |
| `getEventsRange` returns `"No events"` message when MCP result content is empty array | PASS |
| `getEventsRange` `"No events"` message includes the start and end dates for context | PASS |
| `getTodaysEvents` `"No events"` response is a non-empty human-readable string | PASS |
| `getEventsRange` `"No events"` response is a non-empty human-readable string | PASS |
| `getTodaysEvents` returns events string (not `"No events"`) when MCP returns content | PASS |
| `getTodaysEvents` handles MCP HTTP error gracefully (returns error JSON, not throw) | PASS |
| `getTodaysEvents` handles network error gracefully (returns error JSON, not throw) | PASS |
| `getEventsRange` handles MCP HTTP error gracefully (returns error JSON, not throw) | PASS |
| `getEventsRange` handles network error gracefully (returns error JSON, not throw) | PASS |
| `getTodaysEvents` calls MCP with the correct tool name `get_todays_events` | PASS |
| `getTodaysEvents` sends an empty arguments object to MCP (no params) | PASS |
| MCP JSON-RPC request uses `method: "tools/call"` and `jsonrpc: "2.0"` | PASS |
| MCP request `Content-Type` header is `application/json` | PASS |

Both `getTodaysEvents` and `getEventsRange` return a human-readable `"No events..."` message instead of an empty or null value when the MCP server returns an empty result. Network and HTTP errors are caught and returned as structured JSON strings — the agent loop never throws.

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > getTodaysEventsTool is exported from calendar.ts 17ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool name is exactly 'get_todays_events' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool has a non-empty description string 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema type is 'object' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema has a properties field (may be empty — no required params) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > input_schema required array is empty (no required parameters) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > tool definition conforms to Anthropic Tool shape (name + description + input_schema) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC1 — get_todays_events tool definition matches MCP contract > description mentions 'today' to match MCP contract intent 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool is exported from calendar.ts 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool name is exactly 'get_events_range' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRangeTool input_schema requires 'start' and 'end' 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'start' property is typed as string in input_schema 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'end' property is typed as string in input_schema 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'start' description mentions ISO 8601 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > 'end' description mentions ISO 8601 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with valid ISO 8601 date-only strings 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime strings with Z suffix 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime strings with timezone offset 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange executes successfully with ISO 8601 datetime without seconds 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange rejects invalid start parameter (not ISO 8601) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange rejects invalid end parameter (not ISO 8601) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange passes start and end to the MCP tool call correctly 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange does NOT call fetch when start is invalid 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC2 — get_events_range accepts start and end as ISO 8601 strings > getEventsRange does NOT call fetch when end is invalid 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions is exported from calendar.ts 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions contains exactly two tools (get_todays_events and get_events_range) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions includes get_todays_events 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > calendarReadToolDefinitions includes get_events_range 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > getTodaysEventsTool is the same object included in calendarReadToolDefinitions 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > getEventsRangeTool is the same object included in calendarReadToolDefinitions 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > each tool definition in calendarReadToolDefinitions has name, description, and input_schema 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > agent.ts spreads calendarReadToolDefinitions into TOOL_DEFINITIONS — verified by mock API call 13ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool is exported from calendar.ts 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool routes 'get_todays_events' correctly 2ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool routes 'get_events_range' correctly 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool returns error JSON for unknown tool name 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC3 — tool definitions are exported and included in agent API call > executeCalendarTool returns error JSON when get_events_range params are missing 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns 'No events' message when MCP result content is empty array 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns 'No events' message when text content is whitespace only 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange returns 'No events' message when MCP result content is empty array 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange 'No events' message includes the start and end dates for context 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents 'No events' response is a non-empty human-readable string (not an empty string) 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange 'No events' response is a non-empty human-readable string 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents returns events string (not 'No events') when MCP returns content 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents handles MCP HTTP error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents handles network error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange handles MCP HTTP error gracefully (returns error JSON, not throw) 1ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getEventsRange handles network error gracefully (returns error JSON, not throw) 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents calls MCP with the correct tool name 'get_todays_events' 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > getTodaysEvents sends an empty arguments object to MCP (no params) 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > MCP JSON-RPC request uses method 'tools/call' and jsonrpc '2.0' 0ms
 ✓ src/__tests__/calendar-t12.test.ts > AC4 — empty calendar response returns graceful 'No events' message > MCP request Content-Type header is application/json 0ms

 Test Files  5 passed (5)
      Tests  140 passed (140)
   Start at  15:55:59
   Duration  1.52s (transform 369ms, setup 0ms, import 468ms, tests 2.33s, environment 0ms)
```

---

## Mock Strategy

- **Google Calendar MCP server:** `global.fetch` replaced with `vi.fn()` returning controlled JSON-RPC 2.0 responses. No real HTTP calls made.
- **`@lifeos/shared` logger:** Replaced with silent `vi.fn()` stubs to suppress log output.
- **Anthropic API (AC3 integration test):** Mocked via `vi.doMock("@anthropic-ai/sdk", ...)` with a constructor-function mock, identical pattern to T-10 tests.
- **Database:** Not used in `calendar.ts` — no DB mock required for this module.

Each test suite uses `vi.resetModules()` + `vi.doMock()` in `beforeEach`/`afterEach` for full module isolation.

---

## Verdict

**PASS** — All 46 T-12 tests pass. Every acceptance criterion is covered by multiple tests. The implementation correctly:
1. Exports `getTodaysEventsTool` matching the MCP contract (name `get_todays_events`, no required parameters).
2. Exports `getEventsRangeTool` accepting ISO 8601 `start` and `end` strings with validation.
3. Exports `calendarReadToolDefinitions` (both tools) which `agent.ts` spreads into every Anthropic API call.
4. Returns a graceful human-readable `"No events..."` string when the MCP response is empty.
