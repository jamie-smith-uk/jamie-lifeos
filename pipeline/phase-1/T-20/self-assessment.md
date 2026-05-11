# T-20 Self-Assessment — EP-02-05: Free/busy check

**Agent:** AG-03 Developer
**Task:** T-20 — Wire the check_free_busy tool so the agent can answer "am I free Thursday afternoon?" with a plain-language free/busy response (naming conflicting events if busy). No confirmation step required (read-only operation).
**Date:** 2026-04-20

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Smoke test 8: 'am I free Thursday afternoon?' → clear free/busy response | PASS | `checkFreeBusyTool` description updated to explicitly instruct the agent to call `check_free_busy` for user availability queries; system prompt free/busy rules added to `buildSystemPrompt()` in `agent.ts:182-196` |
| 2 | If busy, response names the conflicting event | PASS | Tool description and system prompt both mandate: "If busy: 'You're not free <period> — you have <event name(s)>.' Always name the conflicting event(s)." — `calendar.ts:785-787`, `agent.ts:188-190` |
| 3 | No Confirm/Edit/Cancel buttons shown (read-only) | PASS | `check_free_busy` is intentionally absent from `CONFIRMATION_GATED_TOOLS` (`agent.ts:277-284`); tool description and system prompt both contain explicit "Do NOT show Confirm/Edit/Cancel buttons" instructions |

**Overall verdict: PASS**

---

## Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `packages/orchestrator/src/tools/calendar.ts` | Modified | Updated `checkFreeBusyTool` description with direct-user-query semantics, time-of-day resolution rules, and plain-language response format. Updated file header docstring to distinguish T-20 from confirmation-gated write tools. Extracted `checkFreeBusyTool` from `calendarWriteToolDefinitions` into its own `calendarFreeBusyToolDefinitions` export to signal its non-gated status. |
| `packages/orchestrator/src/agent.ts` | Modified | Imported `calendarFreeBusyToolDefinitions`; spread it into `TOOL_DEFINITIONS`; added free/busy rules block to system prompt (`buildSystemPrompt`); updated `CALENDAR_TOOL_NAMES` and `CONFIRMATION_GATED_TOOLS` comments to document T-20 intent. Updated file header docstring. |

---

## Technical Decisions

- **`check_free_busy` extracted from `calendarWriteToolDefinitions`**: The tool was originally grouped with write tools in T-15. For T-20, a dedicated `calendarFreeBusyToolDefinitions` export was created to signal that this tool is read-only and non-gated. `calendarWriteToolDefinitions` now contains only the three mutating tools (create/update/delete).

- **No executor changes required**: `check_free_busy` was already handled in `executeCalendarTool`'s dispatch switch and in `CALENDAR_TOOL_NAMES`. The only wiring change needed was removing it from the implicit group of write tools and making the non-confirmation-gated routing explicit in comments and documentation.

- **System prompt free/busy block (T-20 rules)**: Added alongside the existing delete-event rules (T-19). Defines time-of-day vocabulary (afternoon/morning/evening) to afternoon = 12:00–17:59 so the model produces consistent ISO 8601 bounds. Both the system prompt and the tool description contain the plain-language response format to maximise the probability of the model following the instruction.

- **No DB schema changes**: T-20 is purely an agent-layer wiring task. No migrations required.

- **TypeScript strict-mode compliance**: `npx tsc --noEmit` passes for both `packages/orchestrator` and `packages/shared` with no errors.

---

## Security Notes

- `check_free_busy` remains a read-only MCP query — no calendar mutations are possible through this path.
- Input validation (ISO 8601 format check via `isIso8601`) is applied before the MCP call in `checkFreeBusy()` (`calendar.ts:807-822`).
- No secrets are hard-coded; MCP URL sourced from `process.env.GOOGLE_CALENDAR_MCP_URL`.
- External MCP errors are caught and returned as structured error strings — the agent loop never crashes.
- No SQL is introduced by this task.

---

## Risks / Blockers for Downstream Tasks

- The quality of the plain-language free/busy response depends on the MCP server returning event names in its free/busy result payload. If the MCP server returns only boolean busy/free without event names, the model cannot name conflicting events. This is a MCP server contract risk, not an orchestrator risk.
- None for downstream tasks in Phase 1.
