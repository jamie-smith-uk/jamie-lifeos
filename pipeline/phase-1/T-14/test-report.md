# Test Report — T-14: EP-01-04: Events on a specific date or range

**Task ID:** T-14  
**Epic:** EP-01  
**Date:** 2026-04-20  
**Verdict:** PASS

---

## Summary

All 22 T-14 tests passed. All 3 acceptance criteria are covered by passing tests.  
Full suite: **182 tests passed, 0 failed** across 7 test files.

---

## Acceptance Criteria Coverage

### AC1 — 'What have I got next Tuesday?' calls `get_events_range` with correct ISO dates

| # | Test | Result |
|---|------|--------|
| 1 | `runAgent includes get_events_range in tool definitions passed to Anthropic API` | PASS |
| 2 | `agent tool loop executes get_events_range when model calls it` | PASS |
| 3 | `agent feeds get_events_range result back as tool_result with correct tool_use_id` | PASS |
| 4 | `executeCalendarTool routes get_events_range with ISO 8601 start/end correctly` | PASS |
| 5 | `executeCalendarTool rejects natural language start — model must pre-resolve dates` | PASS |

**Coverage:** The agent includes `get_events_range` in its tool definitions for every API call. When the model responds with a `tool_use` block for `get_events_range`, the agent loop executes the tool, passes the result back as a `tool_result` with the correct `tool_use_id`, and makes a second API call. The tool executor validates that `start` and `end` are ISO 8601 strings — natural language like `"next Tuesday"` is rejected, enforcing that the model must resolve dates before calling the tool.

---

### AC2 — 'What's on this week?' calls `get_events_range` from Monday to Sunday of current week

| # | Test | Result |
|---|------|--------|
| 6 | `agent tool loop executes get_events_range when model calls it for 'this week' query` | PASS |
| 7 | `get_events_range tool definition specifies both start and end as required` | PASS |
| 8 | `get_events_range tool description mentions 'this week' as an example query` | PASS |
| 9 | `get_events_range tool description mentions Monday-to-Sunday week boundary` | PASS |
| 10 | `get_events_range tool description provides a concrete 'this week' example with ISO dates` | PASS |
| 11 | `executeCalendarTool accepts Monday-to-Sunday range (valid ISO 8601)` | PASS |
| 12 | `executeCalendarTool returns 'No events' message for empty week` | PASS |

**Coverage:** The `getEventsRangeTool` definition requires both `start` and `end` parameters, explicitly describes `'this week'` as a trigger phrase, and specifies that a week runs Monday 00:00:00 → Sunday 23:59:59 in the local timezone. A concrete Monday-to-Sunday ISO range (`2026-04-20T00:00:00+01:00` to `2026-04-26T23:59:59+01:00`) is accepted and processed correctly. An empty MCP response for a week range returns a human-readable "No events found" message.

---

### AC3 — Natural language date resolution uses TZ from env, not UTC

| # | Test | Result |
|---|------|--------|
| 13 | `system prompt Live Context block contains the configured timezone (America/New_York)` | PASS |
| 14 | `system prompt Live Context block contains the configured timezone (Europe/London)` | PASS |
| 15 | `system prompt Live Context block is the second ## block (after Identity)` | PASS |
| 16 | `system prompt Identity block contains T-14 date resolution rules` | PASS |
| 17 | `system prompt Identity block mentions 'this week' date resolution` | PASS |
| 18 | `system prompt Identity block mentions 'next Tuesday' as a natural language example` | PASS |
| 19 | `system prompt still has exactly 5 top-level ## blocks (T-14 does not add new blocks)` | PASS |
| 20 | `get_events_range tool description instructs use of local TZ offset, not UTC Z-suffix` | PASS |
| 21 | `get_events_range tool description mentions 'next Tuesday' as a natural language example` | PASS |
| 22 | `get_events_range tool description mentions 'tomorrow' as a natural language example` | PASS |
| 23 | `get_events_range tool description references the Live Context block as the source for date resolution` | PASS |

**Coverage:** The system prompt's `## Live Context` block always includes `env.TZ` (verified with both `America/New_York` and `Europe/London`). The `## Identity` block contains explicit T-14 date resolution rules instructing the model to use ISO 8601 with local TZ offset, never UTC Z-suffix unless the configured timezone is UTC. The `getEventsRangeTool` description references the Live Context block as the authoritative source for current datetime and timezone. The 5-block system prompt structure is preserved.

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/calendar-t14.test.ts > AC1 — 'What have I got next Tuesday?' triggers get_events_range > runAgent includes get_events_range in tool definitions passed to Anthropic API 31ms
 ✓ src/__tests__/calendar-t14.test.ts > AC1 — 'What have I got next Tuesday?' triggers get_events_range > agent tool loop executes get_events_range when model calls it 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC1 — 'What have I got next Tuesday?' triggers get_events_range > agent feeds get_events_range result back as tool_result with correct tool_use_id 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC1 — 'What have I got next Tuesday?' triggers get_events_range > executeCalendarTool routes get_events_range with ISO 8601 start/end correctly 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC1 — 'What have I got next Tuesday?' triggers get_events_range > executeCalendarTool rejects natural language start — model must pre-resolve dates 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > agent tool loop executes get_events_range when model calls it for 'this week' query 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > get_events_range tool definition specifies both start and end as required 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > get_events_range tool description mentions 'this week' as an example query 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > get_events_range tool description mentions Monday-to-Sunday week boundary 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > get_events_range tool description provides a concrete 'this week' example with ISO dates 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > executeCalendarTool accepts Monday-to-Sunday range (valid ISO 8601) 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday > executeCalendarTool returns 'No events' message for empty week 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Live Context block contains the configured timezone 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Live Context block contains the configured timezone for Europe/London 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Live Context block is the second ## block (after Identity) 3ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Identity block contains T-14 date resolution rules 3ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Identity block mentions 'this week' date resolution 3ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt Identity block mentions 'next Tuesday' as a natural language example 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > system prompt still has exactly 5 top-level ## blocks (T-14 does not add new blocks) 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > get_events_range tool description instructs use of local TZ offset, not UTC Z-suffix 2ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > get_events_range tool description mentions 'next Tuesday' as a natural language example 1ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > get_events_range tool description mentions 'tomorrow' as a natural language example 3ms
 ✓ src/__tests__/calendar-t14.test.ts > AC3 — date resolution uses TZ from env, not UTC > get_events_range tool description references the Live Context block as the source for date resolution 1ms

 Test Files  7 passed (7)
      Tests  182 passed (182)
   Start at  16:12:14
   Duration  1.71s (transform 847ms, setup 0ms, import 1.32s, tests 2.53s, environment 1ms)
```

---

## Test File

`packages/orchestrator/src/__tests__/calendar-t14.test.ts`

---

## Mocking Strategy

- **Anthropic API:** Mocked via `vi.doMock('@anthropic-ai/sdk')` — simulates `tool_use` response for `get_events_range` followed by a final `end_turn` text response. No real Anthropic API calls.
- **Google Calendar MCP:** Mocked via `global.fetch` replacement — returns well-formed JSON-RPC 2.0 responses. No real network calls.
- **`@lifeos/shared` (pool, env, logger):** Mocked via `vi.doMock('@lifeos/shared')` with specific `TZ` values (`Europe/London`, `America/New_York`) to verify timezone-aware behaviour. No real database connections.
- **Telegram API:** Not invoked by the files under test (`calendar.ts`, `agent.ts`). No mock needed for T-14.
- **Gmail MCP:** Not invoked by the files under test. No mock needed for T-14.

---

## Notes

- Tests use `vi.resetModules()` + `vi.doMock()` for full module isolation between test cases.
- The test suite confirms the agent architecture enforces date pre-resolution at the model layer: `executeCalendarTool` validates ISO 8601 format and rejects natural language strings, ensuring the model must resolve `"next Tuesday"` → `"2026-04-21T00:00:00+01:00"` before the tool is invoked.
- The 5-block system prompt structure (`Identity`, `Live Context`, `People Index`, `Pending Nudges`, `Active Automations`) is preserved unchanged by T-14 — date resolution rules are injected into the existing `Identity` block.
