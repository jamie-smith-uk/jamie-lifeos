# T-15 Self-Assessment — Calendar tool wrappers: write operations

## Task
Extend `packages/orchestrator/src/tools/calendar.ts` with write tool wrappers:
`create_event`, `update_event`, `delete_event`, `check_free_busy`. Export tool
definition objects for each. Include all four tools in the agent's tool
definitions array. These tools must NOT be called by the agent directly — they
are only called by the orchestrator's confirmation executor after user confirms.

## Acceptance Criteria

### 1. `create_event`, `update_event`, `delete_event`, `check_free_busy` tool definitions exported
**PASS**

All four tool definition objects are exported from `calendar.ts`:
- `createEventTool` (line 380) — `Anthropic.Tool` for `create_event`
- `updateEventTool` (line 533) — `Anthropic.Tool` for `update_event`
- `deleteEventTool` (line 680) — `Anthropic.Tool` for `delete_event`
- `checkFreeBusyTool` (line 765) — `Anthropic.Tool` for `check_free_busy`

All four are collected in the exported `calendarWriteToolDefinitions` array (line 867).

### 2. All four tools included in agent's tool definitions array
**PASS**

`agent.ts` imports `calendarWriteToolDefinitions` alongside `calendarReadToolDefinitions`
and spreads both into `TOOL_DEFINITIONS` (lines 167–172 of updated `agent.ts`).
`CALENDAR_TOOL_NAMES` set updated with all four write tool names so `executeTool()`
routes them correctly to `executeCalendarTool()`.

### 3. Tool functions accept correct TypeScript types matching MCP contracts
**PASS**

Each write tool has a TypeScript interface matching the MCP contract:
- `CreateEventParams` — `title: string`, `start: string`, `end: string`, optional `location?`, `description?`, `attendees?`
- `UpdateEventParams` — `eventId: string`, all other fields optional (partial update)
- `DeleteEventParams` — `eventId: string`
- `CheckFreeBusyParams` — `start: string`, `end: string`

`tsc --noEmit` passes with zero errors (including under `exactOptionalPropertyTypes: true`).

## Security Rules Applied

- No secrets hard-coded; MCP URL remains in `process.env.GOOGLE_CALENDAR_MCP_URL`.
- All datetime inputs validated with `isIso8601()` before forwarding to MCP.
- All attendee inputs validated as non-empty strings.
- Write tool descriptions and comments explicitly state they must NOT be called
  directly by the agent — only by the confirmation executor after user approval.
- No SQL, no DB access — module is pure MCP client code.
- All external errors caught and returned as structured JSON strings to prevent
  agent loop crashes.
- Optional parameters built conditionally to satisfy `exactOptionalPropertyTypes`.

## Files Modified

- `packages/orchestrator/src/tools/calendar.ts` — added write tool interfaces,
  tool definitions, executor functions, `calendarWriteToolDefinitions` array,
  and write-tool cases in `executeCalendarTool()`.
- `packages/orchestrator/src/agent.ts` — imported `calendarWriteToolDefinitions`,
  spread into `TOOL_DEFINITIONS`, added write tool names to `CALENDAR_TOOL_NAMES`.
