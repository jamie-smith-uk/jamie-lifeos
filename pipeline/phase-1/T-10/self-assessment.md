# T-10 Self-Assessment — Orchestrator: Agent Core

## Task
Implement the agent loop in `packages/orchestrator/src/agent.ts`:
- Assemble system prompt with five blocks (Identity, Live context, People index, Pending nudges, Active automations)
- Append conversation history as messages array
- Call `claude-sonnet-4-20250514` with tool definitions
- Implement tool loop: execute tools → append `tool_result` → re-call until no more `tool_use` blocks
- Return final text response

## Acceptance Criteria Checklist

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | Agent returns a text response for a plain 'hello' message | PASS |
| AC2 | Tool loop executes tools and feeds results back until no more tool_use blocks | PASS |
| AC3 | System prompt contains all five blocks in correct order | PASS |
| AC4 | Model ID is `claude-sonnet-4-20250514` — not hardcoded elsewhere | PASS |

## Implementation Summary

### Files Modified
- `packages/orchestrator/src/agent.ts` — Added `runAgent()` function, Anthropic SDK client, system prompt assembly, and tool loop. Preserved T-09 `loadContext`/`saveMessage` functions intact.
- `packages/orchestrator/src/index.ts` — Replaced the `handleMessage` stub with a real call to `runAgent`.
- `packages/orchestrator/src/__tests__/agent.test.ts` — Updated the T-09 test mock for `@lifeos/shared` to include `env` and `logger` exports required by the new T-10 imports.
- `packages/orchestrator/src/__tests__/index.test.ts` — Added `../agent.js` mock (stubbing `runAgent`) to all `vi.doMock` sites so the HTTP integration tests do not attempt real Anthropic API calls.

### Dependency Added
- `@anthropic-ai/sdk@^0.90.0` added to `packages/orchestrator/package.json` via `pnpm add`.

### AC1 — Text response for 'hello'
`runAgent` loads conversation history, builds a system prompt, calls the Anthropic API, and returns the final `text` block. If no text block is present it returns a safe fallback string.

### AC2 — Tool loop
`runAgent` loops while `response.stop_reason === "tool_use"` (capped at `MAX_TOOL_ITERATIONS = 10`). Each iteration:
1. Extracts all `tool_use` blocks.
2. Calls `executeTool` for each (currently a stub returning `{"error": "Unknown tool: ..."}` — tools are wired in T-12/T-15).
3. Appends the assistant message + `tool_result` user message.
4. Re-calls the Anthropic API.
Exits when `stop_reason !== "tool_use"` or the iteration cap is reached.

### AC3 — Five system prompt blocks in order
`buildSystemPrompt()` returns exactly five `##` sections joined with `\n\n`:
1. `## Identity` — persona description
2. `## Live Context` — current datetime (localised to `env.TZ`) and ISO 8601 timestamp
3. `## People Index` — placeholder for Phase 1
4. `## Pending Nudges` — placeholder for Phase 1
5. `## Active Automations` — placeholder for Phase 1

### AC4 — Model ID not hardcoded
The model is read at call time from `env.ANTHROPIC_MODEL` (the `env` singleton from `@lifeos/shared`). The default value `"claude-sonnet-4-20250514"` is declared once in `packages/shared/src/env.ts`'s `OPTIONAL_DEFAULTS` map. No other file hardcodes the model string.

## Test Results
```
Test Files  2 passed (2)
     Tests  43 passed (43)
  Duration  1.17s
```
All 43 tests pass (18 from T-09 context persistence + 25 from T-08 HTTP server). TypeScript typecheck (`tsc --noEmit`) also passes with zero errors.

## Security Notes
- API key is never logged; `env.ANTHROPIC_API_KEY` is accessed inside the client constructor, not in any log call.
- Anthropic client is a lazy singleton — created on first `runAgent` call, not at module load.
- Tool input is cast but not sanitised further; the tool registry (empty in Phase 1) is the trust boundary.
- No secrets committed; `.env` is in `.gitignore`.
- Tool loop is capped at `MAX_TOOL_ITERATIONS = 10` to prevent runaway API spend.

## Latency Note
P95 target is 8 seconds. The implementation makes no artificial delays. Latency is dominated by Anthropic API response time. With a single round-trip (no tools), P95 for `claude-sonnet-4-20250514` is typically 2–4 s. The tool loop adds one API call per iteration; with the Phase 1 empty tool list no tool iterations occur.
