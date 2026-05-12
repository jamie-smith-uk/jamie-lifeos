[0m
> ag-07-security · claude-haiku-4-5-20251001
[0m
I'll review the code for task-7a against the security ruleset. Let me start by reading the files in scope and the security rules.
[0m→ [0mRead packages/orchestrator/src/agent.ts
[0m→ [0mRead .opencode/agents/security-rules.md
Now I'll analyze the code against every rule in the security ruleset.

## Security Analysis

### Rule 4.1 — Input and Injection

**SQL — Parameterised queries only**
- Lines 174-178: `pool.query()` with parameterized query ✓
- Lines 221-232: `pool.query()` with parameterized query ✓
- Lines 267-271: `pool.query()` with parameterized query ✓
- Lines 335-346: `pool.query()` with parameterized query ✓
- Lines 350-354: `pool.query()` with parameterized query ✓
- Lines 1335-1346: `pool.query()` with parameterized query ✓
- Lines 1350-1354: `pool.query()` with parameterized query ✓
- Lines 1380-1387: `pool.query()` with parameterized query ✓
- Lines 1421-1432: `pool.query()` with parameterized query ✓

All SQL uses parameterized queries. ✓

**Prompt injection — Label external content**
- Lines 1151-1159: External tool results (Gmail, Todoist, Calendar) are wrapped in `<untrusted>` tags ✓
- Life events tool results (lines 682-684) are executed via `executeLifeEventsTool()` which returns JSON strings. These are NOT wrapped in `<untrusted>` tags.

**Input validation**
- Lines 909-915: Message text length validation ✓
- Tool inputs are passed directly to tool executors without validation in this file (validation happens in tool modules)

**Cron injection**
- Not applicable to this file.

### Rule 4.2 — Secrets and Credentials

**Env vars — Secrets in .env only**
- Line 131: `env.ANTHROPIC_API_KEY` is read from env ✓
- Line 154: `env.TZ` is read from env ✓
- Line 939: `env.ANTHROPIC_MODEL` is read from env ✓
- No hardcoded secrets ✓

**Logging — Never log secrets**
- Line 192: Logs error but not env vars ✓
- Line 940: Logs model ID (not a secret) ✓
- Line 973: Logs tool name and ID (not secrets) ✓
- Line 1026: Logs error (not secrets) ✓
- Line 1075: Logs error (not secrets) ✓
- Line 1112: Logs error (not secrets) ✓
- Line 1147: Logs error (not secrets) ✓
- Line 1183: Logs iteration count (not secrets) ✓
- Line 1197: Logs reply length (not secrets) ✓

No secrets logged. ✓

**Agent exposure — Secrets never reach the agent**
- Line 945: System prompt passed to API (contains no env vars) ✓
- Line 946: Tool definitions passed to API (contain no env vars) ✓
- Line 947: Messages passed to API (contain no env vars) ✓

No secrets exposed to agent. ✓

**Git — No secrets in git history**
- Not applicable to code review.

### Rule 4.3 — Authentication and Access

**Authentication**
- Not applicable to this file (no external request handlers).

**Database — No agent-constructed SQL**
- All database queries use parameterized queries ✓
- Agent never constructs SQL ✓

**MCP — OAuth tokens**
- Not applicable to this file.

**Admin UI**
- Not applicable to this file.

### Rule 4.4 — Data Handling

**PII — No PII in logs**
- Line 192: Logs error string (could contain PII if error message includes it, but error is from pool.query which shouldn't contain PII) ✓
- Line 940: Logs model ID and message count (not PII) ✓
- Line 973: Logs tool name and ID (not PII) ✓
- Line 1026, 1075, 1112, 1147: Log errors (potential PII risk if error messages contain it, but these are from tool execution) ✓
- Line 1197: Logs reply length (not PII) ✓

No direct PII logging. ✓

**External content — Label all external content as untrusted**
- Lines 1151-1159: Gmail, Todoist, and Calendar tool results are wrapped in `<untrusted>` tags ✓
- **ISSUE**: Life events tool results (line 682-684) are NOT wrapped in `<untrusted>` tags. Life events data comes from the database (internal), not external, so this may not be a violation. However, the rule states "all external content" and life events are database-sourced, not external API responses.

Actually, reviewing more carefully: life events are database records created by the user or system, not external API responses. The `<untrusted>` wrapping is specifically for external content (API responses, user inputs, third-party service data). Database records are internal and trusted. This is consistent with the pattern where only Gmail, Todoist, and Calendar (external APIs) are wrapped.

**Error messages — No stack traces in user-facing errors**
- Line 690: Returns `{ error: "Unknown tool: ${toolName}" }` (plain language) ✓
- Line 996: Returns error about missing parameters (plain language) ✓
- Line 1028: Returns plain language error ✓
- Line 1040: Returns plain language error ✓
- Line 1041: Returns plain language error ✓
- Line 1077: Returns plain language error ✓
- Line 1114: Returns plain language error ✓
- Line 1119: Returns plain language error ✓
- Line 1148: Returns `{ error: String(err) }` — **POTENTIAL ISSUE**: This converts an exception to string, which could include stack traces.

**FINDING**: Line 1148 converts exception to string without sanitization. If `err` is an Error object, `String(err)` will include the stack trace.

**DB queries — Statement timeout enforced**
- Not applicable to this file (pool configuration is in shared module).

### Rule 4.5 — Dependency Security

**Audit — Zero high or critical vulnerabilities**
- Not applicable to code review.

**Pinning — All dependencies pinned to exact versions**
- Not applicable to this file.

**Minimal surface — No unjustified new dependencies**
- Not applicable to this file.

## Summary of Findings

I found **ONE SECURITY VIOLATION**:

1. **Line 1148**: Exception error handling converts error to string without sanitization, which could expose stack traces to the agent.

Let me write the security report:
[0m
[0m← [0mWrite pipeline/phase-3/task-7a/security-report.md
Wrote file successfully.
[0m
**SECURITY REPORT COMPLETE — FAIL**

I found **1 security violation** in task-7a:

### Violation Summary

**Line 1148** — Unvalidated error exposure to agent
- The error handler converts exceptions to strings without sanitization
- If an Error object is thrown, `String(err)` includes the full stack trace
- This exposes internal file paths and implementation details to the agent
- **Fix required:** Return a plain-language error message only

The life events tool definitions themselves are correctly added (lines 507-554) with proper parameter descriptions, and the tool names are correctly registered in `LIFE_EVENTS_TOOL_NAMES` (line 635) and included in `TOOL_DEFINITIONS` (line 563). However, the error handling in the tool execution path violates the security rule against exposing stack traces.

The security report has been written to `/pipeline/phase-3/task-7a/security-report.md`.
