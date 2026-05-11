# Test Report — Task T-10 — PASS

**Task:** T-10 — Orchestrator: agent core — Anthropic API client and tool loop  
**File under test:** `packages/orchestrator/src/agent.ts`  
**Test file:** `packages/orchestrator/src/__tests__/agent-t10.test.ts`  
**Date:** 2026-04-20  
**Verdict:** PASS

---

## Summary

All 28 T-10 tests pass. All 71 tests in the orchestrator package pass (T-09 + T-08 tests remain green).

```
 Test Files  3 passed (3)
      Tests  71 passed (71)
   Start at  15:38:43
   Duration  1.19s (transform 318ms, setup 0ms, import 445ms, tests 1.04s, environment 0ms)
```

---

## Acceptance Criteria Coverage

### AC1 — Agent returns a text response for a plain 'hello' message

| Test | Result |
|------|--------|
| returns a non-empty string for a hello message | PASS |
| returns the exact text from the API response TextBlock | PASS |
| returns a fallback string when the response has no text block | PASS |
| passes the user message as the last message to the API | PASS |
| calls messages.create() exactly once for a simple message | PASS |

**Verdict: PASS** — `runAgent` correctly extracts the `TextBlock` from the Anthropic response and returns its text. It provides a non-empty fallback when no text block is present.

---

### AC2 — Tool loop executes tools and feeds results back until no more tool_use blocks

| Test | Result |
|------|--------|
| calls the API again when the first response has stop_reason='tool_use' | PASS |
| appends tool_result messages to the conversation before re-calling the API | PASS |
| the tool_result includes the correct tool_use_id | PASS |
| continues the tool loop for multiple sequential tool calls | PASS |
| does NOT call the API again when stop_reason is end_turn (no tool_use) | PASS |
| returns the final text after multiple tool iterations | PASS |
| appends the assistant tool_use response to messages before feeding tool_result | PASS |

**Verdict: PASS** — The tool loop correctly:
- Re-calls the API when `stop_reason === "tool_use"`
- Appends the assistant's `tool_use` content block to the message history
- Adds `tool_result` user messages with the correct `tool_use_id`
- Continues iterating until `stop_reason !== "tool_use"`
- Does not call the API extra times when there are no tools

---

### AC3 — System prompt contains all five blocks in correct order

| Test | Result |
|------|--------|
| system prompt contains all five required section headers | PASS |
| blocks appear in the correct order: Identity → Live Context → People Index → Pending Nudges → Active Automations | PASS |
| Live Context block contains current datetime (ISO 8601) and timezone | PASS |
| People Index block indicates empty state in Phase 1 | PASS |
| Pending Nudges block indicates empty state in Phase 1 | PASS |
| Active Automations block indicates empty state in Phase 1 | PASS |
| system prompt is a non-empty string passed as 'system' to messages.create() | PASS |
| system prompt contains exactly five top-level ## headers | PASS |

**Verdict: PASS** — The system prompt contains exactly five `## ` blocks in the correct order:
1. `## Identity` 
2. `## Live Context` (with ISO 8601 datetime and timezone)
3. `## People Index` (Phase 1 empty placeholder)
4. `## Pending Nudges` (Phase 1 empty placeholder)
5. `## Active Automations` (Phase 1 empty placeholder)

---

### AC4 — Model ID is claude-sonnet-4-20250514 — not hardcoded elsewhere

| Test | Result |
|------|--------|
| uses the model ID from env.ANTHROPIC_MODEL (default: claude-sonnet-4-20250514) | PASS |
| uses the model ID from env even when overridden to a different value | PASS |
| uses the same model ID in all tool loop iterations | PASS |
| model ID in all API calls matches env.ANTHROPIC_MODEL exactly | PASS |
| agent.ts source does not use the model ID as an operational hardcoded value (only in comments) | PASS |
| env.ts (shared) contains the claude-sonnet-4-20250514 default as the canonical definition | PASS |

**Verdict: PASS** — The model ID is sourced exclusively from `env.ANTHROPIC_MODEL`. The literal string `"claude-sonnet-4-20250514"` does not appear in the operational code of `agent.ts` (only in doc comments). The canonical default lives in `packages/shared/src/env.ts:44`.

---

### Integration — Context and message persistence (bonus)

| Test | Result |
|------|--------|
| loads context via pool.query before calling the Anthropic API | PASS |
| saves the user message and assistant reply after the agent loop | PASS |

---

## Test Strategy

All tests use `vi.doMock()` with `vi.resetModules()` in `beforeEach` to ensure full isolation between test cases. No real services are called:

- **Anthropic API**: Mocked via a real `function` constructor (required for `new Anthropic(...)` in `agent.ts`) that returns controlled response sequences from a queue
- **PostgreSQL**: `pool.query` and `pool.connect` mocked to return empty rows; the in-memory store from the T-09 test file is not reused
- **No real env vars**: `env` is injected via `@lifeos/shared` mock with test values

The mock response builder uses `as unknown as Anthropic.Message` casts to avoid strict SDK type requirements (the SDK's `TextBlock`, `ToolUseBlock`, and `Usage` interfaces have added required fields like `citations`, `caller`, and `service_tier` that the mock doesn't need to populate).

---

## Full Test Output

```
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns a non-empty string for a hello message 20ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns the exact text from the API response TextBlock 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > returns a fallback string when the response has no text block 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > passes the user message as the last message to the API 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC1 — runAgent returns a text response for a plain hello message > calls messages.create() exactly once for a simple message 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > calls the API again when the first response has stop_reason='tool_use' 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > appends tool_result messages to the conversation before re-calling the API 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > the tool_result includes the correct tool_use_id 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > continues the tool loop for multiple sequential tool calls 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > does NOT call the API again when stop_reason is end_turn (no tool_use) 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > returns the final text after multiple tool iterations 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC2 — tool loop executes tools and feeds results back > appends the assistant tool_use response to messages before feeding tool_result 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt contains all five required section headers 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > blocks appear in the correct order: Identity → Live Context → People Index → Pending Nudges → Active Automations 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Live Context block contains current datetime (ISO 8601) and timezone 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > People Index block indicates empty state in Phase 1 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Pending Nudges block indicates empty state in Phase 1 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > Active Automations block indicates empty state in Phase 1 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt is a non-empty string passed as 'system' to messages.create() 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC3 — system prompt contains all five blocks in correct order > system prompt contains exactly five top-level ## headers 2ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the model ID from env.ANTHROPIC_MODEL (default: claude-sonnet-4-20250514) 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the model ID from env even when overridden to a different value 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > uses the same model ID in all tool loop iterations 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > model ID in all API calls matches env.ANTHROPIC_MODEL exactly 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > agent.ts source does not use the model ID as an operational hardcoded value (only in comments) 0ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > AC4 — model ID is sourced from env.ANTHROPIC_MODEL > env.ts (shared) contains the claude-sonnet-4-20250514 default as the canonical definition 0ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > Integration — context and message persistence > loads context via pool.query before calling the Anthropic API 1ms
 ✓ src/__tests__/agent-t10.test.ts > T-10 — runAgent agent core > Integration — context and message persistence > saves the user message and assistant reply after the agent loop 1ms

 Test Files  3 passed (3)
      Tests  71 passed (71)
   Start at  15:38:43
   Duration  1.19s
```

---

## Regression: Prior Tests Remain Green

All 43 pre-existing tests (18 T-09 context persistence + 25 T-08 HTTP server) continue to pass alongside the 28 new T-10 tests.
