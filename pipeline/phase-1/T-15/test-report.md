# Test Report — T-15: Calendar tool wrappers: write operations

**Task ID:** T-15  
**Epic:** EP-02  
**Status:** PASS  
**Date:** 2026-04-20  
**Test file:** `packages/orchestrator/src/__tests__/calendar-t15.test.ts`  
**Implementation file:** `packages/orchestrator/src/tools/calendar.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 90 |
| Passed | 90 |
| Failed | 0 |
| Skipped | 0 |
| Duration | ~251ms |

**Verdict: PASS** — All 90 tests pass. All 3 acceptance criteria are fully covered.

---

## Acceptance Criteria Coverage

### AC1 — `create_event`, `update_event`, `delete_event`, `check_free_busy` tool definitions exported

**Status: PASS** (26 tests)

Tests verify:
- `createEventTool` is exported with `name === "create_event"`
- `updateEventTool` is exported with `name === "update_event"`
- `deleteEventTool` is exported with `name === "delete_event"`
- `checkFreeBusyTool` is exported with `name === "check_free_busy"`
- Each tool definition has a non-empty description
- `createEventTool.input_schema` requires `title`, `start`, `end`; optional: `location`, `description`, `attendees` (array)
- `updateEventTool.input_schema` requires only `eventId`; all other fields optional (partial update semantics)
- `deleteEventTool.input_schema` requires only `eventId`
- `checkFreeBusyTool.input_schema` requires `start` and `end`
- `calendarWriteToolDefinitions` array contains exactly 4 tools: all four write tools
- `deleteEventTool` description warns about irreversibility
- All write tool descriptions mention confirmation/approval requirement

### AC2 — All four tools included in agent's tool definitions array

**Status: PASS** (6 tests)

Tests verify by calling `runAgent()` with a fully mocked Anthropic SDK and capturing the `tools` parameter passed to `messages.create()`:
- `create_event` is present in tools array on the first API call
- `update_event` is present in tools array on the first API call
- `delete_event` is present in tools array on the first API call
- `check_free_busy` is present in tools array on the first API call
- All four write tools AND both read tools (`get_todays_events`, `get_events_range`) are present (≥6 tools total)
- No duplicate tool names in `TOOL_DEFINITIONS`

### AC3 — Tool functions accept correct TypeScript types matching MCP contracts

**Status: PASS** (58 tests)

#### createEvent executor (16 tests)
- Calls MCP with tool name `"create_event"`
- Sends `title`, `start`, `end` in MCP `arguments`
- Sends optional `location` when provided
- Sends optional `description` when provided
- Sends optional `attendees` array when provided
- Does NOT send undefined optional fields to MCP
- Returns MCP text response on success
- Returns fallback "created" message when MCP returns empty content
- Returns structured error JSON when `title` is empty string
- Returns structured error JSON for invalid ISO 8601 `start`
- Returns structured error JSON for invalid ISO 8601 `end`
- Returns structured error JSON for empty-string attendee entry
- Returns structured error JSON on HTTP error (500)
- Returns structured error JSON on MCP JSON-RPC error

#### updateEvent executor (10 tests)
- Calls MCP with tool name `"update_event"`
- Sends `eventId` in MCP `arguments`
- Partial update: only sends provided fields (e.g. `title` only — no `start`, `end`, `location`, etc.)
- Sends all provided fields when multiple are given
- Returns MCP text response on success
- Returns fallback "updated" message when MCP returns empty content
- Returns structured error JSON when `eventId` is empty string
- Returns structured error JSON for invalid ISO 8601 `start`
- Returns structured error JSON for invalid ISO 8601 `end`
- Returns structured error JSON on HTTP error (503)

#### deleteEvent executor (8 tests)
- Calls MCP with tool name `"delete_event"`
- Sends `eventId` in MCP `arguments`
- Returns MCP text response on success
- Returns fallback "deleted" message when MCP returns empty content
- Returns structured error JSON when `eventId` is empty string
- Returns structured error JSON when `eventId` is whitespace-only
- Returns structured error JSON on HTTP error (404)
- Returns structured error JSON on MCP JSON-RPC error

#### checkFreeBusy executor (7 tests)
- Calls MCP with tool name `"check_free_busy"`
- Sends `start` and `end` in MCP `arguments`
- Returns MCP text response on success
- Returns fallback message (containing the date) when MCP returns empty content
- Returns structured error JSON for invalid ISO 8601 `start`
- Returns structured error JSON for invalid ISO 8601 `end`
- Returns structured error JSON on HTTP error (502)

#### executeCalendarTool dispatch (9 tests)
- Routes `"create_event"` → `createEvent()`
- Routes `"update_event"` → `updateEvent()`
- Routes `"delete_event"` → `deleteEvent()`
- Routes `"check_free_busy"` → `checkFreeBusy()`
- Returns error JSON for `create_event` missing `title`
- Returns error JSON for `update_event` missing `eventId`
- Returns error JSON for `delete_event` missing `eventId`
- Returns error JSON for `check_free_busy` missing `start`
- Returns error JSON for unknown tool names

#### TypeScript interface / MCP contract compliance (8 tests)
- All four tool definitions have `input_schema.type === "object"`
- `createEventTool`, `updateEventTool`, `checkFreeBusyTool` `start`/`end` schema properties describe ISO 8601 format
- `createEventTool` `title` property has `type: "string"`
- `deleteEventTool` `eventId` property has `type: "string"`
- `createEvent`, `updateEvent`, `deleteEvent`, `checkFreeBusy` are all exported as async functions (return `Promise`)

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ AC1 — write tool definitions exported from calendar.ts > exports createEventTool with name 'create_event' 13ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool has a non-empty description 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema requires title, start, end 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema does NOT require optional fields 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema properties include location, description, attendees 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool input_schema attendees property is type array 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > createEventTool description mentions confirmation requirement 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > exports updateEventTool with name 'update_event' 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > updateEventTool has a non-empty description 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema requires only eventId 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > updateEventTool input_schema properties include all update fields 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > updateEventTool description mentions confirmation requirement 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > exports deleteEventTool with name 'delete_event' 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > deleteEventTool has a non-empty description 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > deleteEventTool input_schema requires only eventId 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > deleteEventTool description mentions confirmation requirement 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > deleteEventTool description warns about irreversibility 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > exports checkFreeBusyTool with name 'check_free_busy' 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool has a non-empty description 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool input_schema requires start and end 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > checkFreeBusyTool description mentions free/busy or availability 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > exports calendarWriteToolDefinitions as an array of 4 tools 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains create_event 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains update_event 0ms
 ✓ AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains delete_event 1ms
 ✓ AC1 — write tool definitions exported from calendar.ts > calendarWriteToolDefinitions contains check_free_busy 2ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > create_event is included in tools passed to Anthropic API on first call 23ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > update_event is included in tools passed to Anthropic API on first call 2ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > delete_event is included in tools passed to Anthropic API on first call 1ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > check_free_busy is included in tools passed to Anthropic API on first call 1ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > all four write tools plus read tools are in TOOL_DEFINITIONS (at least 6 total) 1ms
 ✓ AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API > TOOL_DEFINITIONS does not contain duplicates 1ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent calls MCP with correct tool name 'create_event' 1ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends title, start, end to MCP 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional location to MCP when provided 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional description to MCP when provided 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent sends optional attendees array to MCP when provided 1ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent does NOT send undefined optional fields to MCP 1ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns MCP text response on success 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns fallback message when MCP returns empty content 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON when title is empty 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 start 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for invalid ISO 8601 end 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns error JSON for empty-string attendee 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns HTTP error 0ms
 ✓ AC3 — createEvent executor: correct params, MCP call, validation > createEvent returns structured error JSON when MCP returns JSON-RPC error 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent calls MCP with correct tool name 'update_event' 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends eventId to MCP 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends only provided fields (partial update — title only) 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent sends all provided fields when multiple are given 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns MCP text response on success 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns fallback success message when MCP returns empty content 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON when eventId is empty string 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 start 0ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns error JSON for invalid ISO 8601 end 1ms
 ✓ AC3 — updateEvent executor: correct params, MCP call, validation > updateEvent returns structured error JSON when MCP returns HTTP error 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent calls MCP with correct tool name 'delete_event' 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent sends eventId to MCP 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns MCP text response on success 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns fallback success message when MCP returns empty content 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is empty string 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns error JSON when eventId is whitespace-only 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns HTTP error 0ms
 ✓ AC3 — deleteEvent executor: correct params, MCP call, validation > deleteEvent returns structured error JSON when MCP returns JSON-RPC error 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy calls MCP with correct tool name 'check_free_busy' 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy sends start and end to MCP 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns MCP text response on success 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns fallback message when MCP returns empty content 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns error JSON for invalid ISO 8601 start 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns error JSON for invalid ISO 8601 end 0ms
 ✓ AC3 — checkFreeBusy executor: correct params, MCP call, validation > checkFreeBusy returns structured error JSON when MCP returns HTTP error 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'create_event' to createEvent 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'update_event' to updateEvent 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'delete_event' to deleteEvent 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool routes 'check_free_busy' to checkFreeBusy 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for create_event with missing title 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for update_event with missing eventId 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for delete_event with missing eventId 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for check_free_busy with missing start 0ms
 ✓ AC3 — executeCalendarTool dispatch for write tools > executeCalendarTool returns error JSON for unknown tool names 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > createEventTool input_schema.type is 'object' 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > updateEventTool input_schema.type is 'object' 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > deleteEventTool input_schema.type is 'object' 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > checkFreeBusyTool input_schema.type is 'object' 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > createEventTool start and end schema properties describe ISO 8601 format 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > updateEventTool start and end schema properties describe ISO 8601 format 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > checkFreeBusyTool start and end schema properties describe ISO 8601 format 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > createEventTool title schema property has type string 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > deleteEventTool eventId schema property has type string 0ms
 ✓ AC3 — TypeScript interface / MCP contract compliance > createEvent, updateEvent, deleteEvent, checkFreeBusy are all exported as async functions 0ms

 Test Files  1 passed (1)
      Tests  90 passed (90)
   Start at  16:21:29
   Duration  251ms (transform 71ms, setup 0ms, import 62ms, tests 80ms, environment 0ms)
```

---

## Mock Strategy

All external dependencies are fully mocked — no real network calls or database access occur:

| Dependency | Mock strategy |
|---|---|
| Google Calendar MCP (fetch) | `vi.fn()` returning JSON-RPC 2.0 success/error/empty responses |
| Anthropic API | Constructor mock via `vi.doMock("@anthropic-ai/sdk")` capturing tool definitions |
| `@lifeos/shared` pool | Silent mock returning empty rows; `connect()` returns mock client |
| `@lifeos/shared` env | In-line object with test values (no `.env` file read) |
| `@lifeos/shared` logger | Silent stub with `child()`, `info()`, `warn()`, `error()`, `debug()` |

Each test suite uses `vi.resetModules()` + `vi.doMock()` for full module isolation, preventing cross-test contamination.
