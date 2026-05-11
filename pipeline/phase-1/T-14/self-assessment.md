# T-14 Self-Assessment: Events on a specific date or range

## Task

Wire `get_events_range` into the agent loop so that natural language date
references ('next Tuesday', 'this week', 'tomorrow') are resolved to ISO 8601
datetime strings using the TZ from env before calling the tool. Handle
multi-day ranges (e.g. 'this week' = Monday–Sunday) and single-day queries.

## Pre-existing Infrastructure (from T-12)

T-12 already implemented:
- `getEventsRangeTool` definition (name, description, input_schema with `start`/`end` required)
- `getEventsRange(start, end)` executor with ISO 8601 validation
- `executeCalendarTool()` routing `get_events_range` correctly
- `calendarReadToolDefinitions` array spread into `TOOL_DEFINITIONS` in `agent.ts`
- `CALENDAR_TOOL_NAMES` set includes `"get_events_range"`
- The full agent tool loop in `runAgent()` handling tool execution

T-10 already implemented:
- `buildSystemPrompt()` with a **Live Context** block (Block 2) containing
  the current datetime as ISO 8601, a human-readable local datetime, and the
  configured timezone — all derived from `env.TZ`.

T-14's contribution is the **semantic guidance** that enables the model to
correctly resolve natural language dates before calling the already-wired tool.

## Files Modified

### `packages/orchestrator/src/tools/calendar.ts`

1. **Updated module-level JSDoc** to document T-14 changes.

2. **Extended `getEventsRangeTool` description** with explicit T-14 natural
   language date resolution rules:
   - Instructs the model to use the TZ from the Live Context block (never UTC
     unless the configured TZ is UTC)
   - Single-day queries: midnight (`T00:00:00<tz-offset>`) to end-of-day
     (`T23:59:59<tz-offset>`) in local timezone
   - Week queries: 'this week' = Monday of the current ISO week at
     `T00:00:00<tz-offset>` through Sunday at `T23:59:59<tz-offset>`
   - Concrete examples for 'next Tuesday', 'this week', 'tomorrow' showing
     the expected ISO 8601 strings with local timezone offset
   - Instructs the model to use the local timezone offset (e.g. `+01:00`),
     not the Z/UTC suffix, unless the configured TZ is UTC

### `packages/orchestrator/src/agent.ts`

3. **Updated module-level JSDoc** to document T-14 changes.

4. **Extended `buildSystemPrompt()` Identity block** with a date resolution
   rules section. The section:
   - Instructs the model to resolve relative date references using the current
     datetime and timezone from the Live Context block
   - Defines single-day query boundaries (T00:00:00 → T23:59:59 local TZ)
   - Defines week query boundaries (Monday T00:00:00 → Sunday T23:59:59 local TZ)
   - Provides named-day resolution logic for 'next Tuesday' etc.
   - Notes that ISO weeks start on Monday (ISO 8601)
   - The Identity block **remains the only block** extended — the total number
     of `##` top-level blocks remains exactly 5 (T-10 invariant preserved)

### `packages/orchestrator/src/__tests__/calendar-t14.test.ts` (new file)

5. **New T-14 test file** with 3 test suites covering all acceptance criteria:
   - **AC1** (5 tests): Verifies `get_events_range` is included in tool
     definitions, the agent executes the tool loop when the model calls it,
     tool results are fed back with the correct `tool_use_id`, the executor
     correctly routes the call, and it rejects natural language start params
     (model must pre-resolve dates).
   - **AC2** (6 tests): Verifies the agent loop executes for 'this week'
     queries, the tool definition requires both `start` and `end`, the
     description mentions 'this week', explicitly documents Monday–Sunday
     boundaries, provides a concrete ISO 8601 example, and handles empty
     week results gracefully.
   - **AC3** (9 tests): Verifies the Live Context block contains the
     configured TZ (tested with both `America/New_York` and `Europe/London`),
     the block order is Identity → Live Context, the Identity block contains
     T-14 date resolution rules (ISO 8601, timezone, 'this week', Monday,
     Sunday, 'next Tuesday'), the system prompt still has exactly 5 `##`
     blocks, the tool description instructs local TZ offset use, and the
     tool description mentions all required natural language examples.

## Architecture Notes

The T-14 implementation is **prompt engineering**, not new code logic. The
actual date arithmetic happens inside the Claude model at inference time,
guided by:

1. The **Live Context block** (already from T-10) — provides the concrete
   "current datetime + TZ" that the model needs as the anchor point.
2. The **Identity block date resolution section** (new in T-14) — gives the
   model the resolution algorithm: how to translate "next Tuesday" or
   "this week" into ISO 8601 boundaries.
3. The **tool description** (extended in T-14) — reinforces the rules at the
   tool call site, providing concrete examples.

This approach is correct because:
- The model cannot know the user's timezone from the user message alone.
- The `get_events_range` executor validates ISO 8601 format (rejecting natural
  language strings) — the validation was already in place from T-12.
- No server-side date arithmetic is needed or appropriate: the model has full
  context (current datetime + TZ + resolution rules) to do this correctly.

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 'What have I got next Tuesday?' calls `get_events_range` with correct ISO dates | PASS | AC1 tests verify tool is in definitions, loop executes, tool results fed back; tool description and Identity block both provide resolution rules for 'next Tuesday' with local TZ offset |
| 'What's on this week?' calls `get_events_range` from Monday to Sunday of current week | PASS | AC2 tests verify tool loop executes; tool description and Identity block explicitly define Monday-to-Sunday week boundary with local TZ |
| Natural language date resolution uses TZ from env, not UTC | PASS | AC3 tests verify Live Context block contains env TZ (tested with `America/New_York` and `Europe/London`); tool description and Identity block both instruct use of local TZ offset, not Z/UTC |

## Test Results

```
Test Files  7 passed (7)
     Tests  182 passed (182)
```

All 182 tests pass (23 new T-14 tests added to the previous 159).
TypeScript type check (`tsc --noEmit`) passes cleanly.

## Security Rules Applied

- No secrets hard-coded; all credentials remain in `process.env` only.
- No new SQL queries introduced; no DB access in this task.
- No new external network calls introduced; date resolution guidance is pure
  prompt text — no server-side date arithmetic or new dependencies.
- ISO 8601 input validation on `get_events_range` is unchanged and enforced:
  if the model passes natural language (a bug), the executor returns a
  structured error string, never throws.
- All external MCP errors continue to be caught and returned as structured
  error strings so the agent loop never crashes.
- No new environment variables or secrets introduced.
