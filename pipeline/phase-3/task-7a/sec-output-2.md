[0m
> ag-07-security · claude-haiku-4-5-20251001
[0m
I'll review the code for task-7a against the security ruleset. Let me start by reading the files in scope and the security rules.
[0m→ [0mRead packages/orchestrator/src/agent.ts
[0m→ [0mRead .opencode/agents/security-rules.md
Now I'll analyze the code against every rule in the security ruleset.

## Security Analysis

I'll check each rule systematically:

### 4.1 Input and Injection

**SQL — Parameterised queries only**
- Lines 174-178: `pool.query()` with parameterized query ✓
- Lines 221-232: `pool.query()` with parameterized query ✓
- Lines 267-271: `pool.query()` with parameterized query ✓
- Lines 335-346: `pool.query()` with parameterized query ✓
- Lines 350-354: `pool.query()` with parameterized query ✓
- Lines 1267-1271: `pool.query()` with parameterized query ✓
- Lines 1278-1289: `pool.query()` with parameterized query ✓
- Lines 1335-1346: `pool.query()` with parameterized query ✓
- Lines 1350-1354: `pool.query()` with parameterized query ✓
- Lines 1381-1387: `pool.query()` with parameterized query ✓
- Lines 1421-1432: `pool.query()` with parameterized query ✓

**Prompt injection — Label external content**
- Lines 1151-1159: External tool results (Gmail, Todoist, Calendar) are wrapped in `<untrusted>` tags ✓
- Life events tool results are NOT wrapped in untrusted tags (lines 682-684)

**Input validation**
- Lines 909-915: Message length validation ✓
- No validation on tool inputs before execution (line 1145)

**Cron injection**
- Not applicable to this file

### 4.2 Secrets and Credentials

**Env vars — Secrets in .env only**
- Line 131: `env.ANTHROPIC_API_KEY` sourced from env ✓
- Line 154: `env.TZ` sourced from env ✓
- Line 939: `env.ANTHROPIC_MODEL` sourced from env ✓
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

**Agent exposure — Secrets never reach agent**
- Line 945: System prompt passed to API (contains no env vars) ✓
- Line 946: Tool definitions passed to API (contain no env vars) ✓

**Git — No secrets in git history**
- Not applicable to code review

### 4.3 Authentication and Access

**Authentication — Validate identity on every handler**
- This file contains agent logic, not external handlers
- No authentication checks needed here ✓

**Database — No agent-constructed SQL**
- All SQL uses parameterized queries ✓
- Agent never constructs SQL ✓

**MCP — OAuth tokens stored securely**
- Not applicable to this file

**Admin UI — Not externally exposed**
- Not applicable to this file

### 4.4 Data Handling

**PII — No PII in logs**
- Line 192: Logs error message (not PII) ✓
- Line 940: Logs model and message count (not PII) ✓
- Line 973: Logs tool name and ID (not PII) ✓
- Line 1026, 1075, 1112, 1147, 1183, 1197: Log errors and metrics (not PII) ✓

**External content — Label all external content as untrusted**
- Lines 1151-1159: Gmail, Todoist, Calendar results wrapped in `<untrusted>` ✓
- **ISSUE**: Life events tool results (line 682-684) are NOT wrapped in untrusted tags, but they should be since they come from the database and could contain user-provided data

**Error messages — No stack traces in user-facing errors**
- Line 1148: Returns generic error message ✓
- Line 1028: Returns generic error message ✓
- Line 1077: Returns generic error message ✓
- Line 1114: Returns generic error message ✓

**DB queries — Statement timeout enforced**
- Not applicable to this file (pool configuration is in shared module)

### 4.5 Dependency Security

**Audit — Zero high or critical vulnerabilities**
- Not applicable to code review

**Pinning — All dependencies pinned to exact versions**
- Not applicable to code review

**Minimal surface — No unjustified new dependencies**
- Not applicable to code review

## Finding

I found one security violation:

**RULE VIOLATED**: External content — Label all external content as untrusted (4.4)

**FILE**: packages/orchestrator/src/agent.ts

**LINES**: 682-684

**DESCRIPTION**: Life events tool results are executed and returned to the agent without being wrapped in `<untrusted>` tags. The life events module returns data from the database that includes user-provided content (person names, event types, notes). This external/user-provided data must be labeled as untrusted before being passed to the Anthropic API, consistent with the pattern already applied to Gmail, Todoist, and Calendar tools (lines 1151-1159).

**REQUIRED FIX**: Wrap the life events tool result in `<untrusted>` tags in the external content labeling block (lines 1151-1159). Add `LIFE_EVENTS_TOOL_NAMES` to the condition that checks whether to wrap results in untrusted tags.

Now I'll write the security report:
[0m
[0m← [0mWrite pipeline/phase-3/task-7a/security-report.md
Wrote file successfully.
[0m
## Summary

**FAIL** — Task 7a has one security violation.

**Violation**: Life events tool results are not wrapped in `<untrusted>` tags before being passed to the Anthropic API. This violates rule 4.4 (External content — Label all external content as untrusted).

**Required fix**: Add `LIFE_EVENTS_TOOL_NAMES` to the untrusted content labeling condition at lines 1153-1157 in agent.ts, so that life events results are wrapped in `<untrusted>` tags just like Gmail, Todoist, and Calendar results.

The security report has been written to `/pipeline/phase-3/task-7a/security-report.md`.
