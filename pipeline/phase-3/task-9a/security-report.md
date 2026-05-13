# Security Report — Task 9a — PASS

## Sign-off

Every rule in security-rules.md was checked against the file in scope (`packages/orchestrator/src/tools/people.ts`). No violations were found. The code follows all parameterized query patterns, input validation requirements, and secure error handling conventions established in previous tasks.

## Rules Checked

- ✅ **SQL — Parameterised queries only**: All SQL statements use `$1/$2` placeholders. No string concatenation or template literals in queries.
- ✅ **Prompt injection — Label external content before passing to agent**: Tool functions return JSON strings; agent.ts is responsible for wrapping results in `<untrusted>` tags (outside scope).
- ✅ **Input validation — Validate all external input**: All JSON.parse calls wrapped in try-catch. All string inputs validated for length constraints. `days_threshold` validated as non-negative number.
- ✅ **Cron injection — Validate cron expressions before storing**: Not applicable (no cron expressions in this file).
- ✅ **Env vars — Secrets in .env only**: No hardcoded secrets, tokens, passwords, or keys.
- ✅ **Logging — Never log secrets**: All log statements log only non-sensitive data (IDs, counts, thresholds). No person names, notes, or other PII logged.
- ✅ **Agent exposure — Secrets never reach the agent**: No env var values included in strings passed to agent.
- ✅ **Git — No secrets in git history**: No secrets in the file.
- ✅ **Authentication — Validate identity on every handler**: Not applicable (tool functions, not external handlers).
- ✅ **Database — No agent-constructed SQL**: All SQL constructed in tool functions with parameterized queries.
- ✅ **MCP — OAuth tokens stored securely**: Not applicable (no OAuth tokens).
- ✅ **Admin UI — Not externally exposed**: Not applicable (no admin UI).
- ✅ **PII — No PII in logs**: No person names, emails, phone numbers, or calendar event details in logs.
- ✅ **External content — Label all external content as untrusted**: Tool functions return JSON strings; agent.ts wraps results (outside scope).
- ✅ **Error messages — No stack traces in user-facing errors**: All error messages are plain language only.
- ✅ **DB queries — Statement timeout enforced**: Enforced at pool configuration level in @lifeos/shared (outside scope).
- ✅ **Audit — Zero high or critical vulnerabilities**: Not applicable to code review.
- ✅ **Pinning — All dependencies pinned to exact versions**: Not applicable to code review.
- ✅ **Minimal surface — No unjustified new dependencies**: No new dependencies added.

## Files Reviewed

- `packages/orchestrator/src/tools/people.ts` (492 lines)

## Observation

The `get_person` function now returns life events data which includes user-provided notes. According to the security pattern established in task-7a, all tools that return user-provided data should be included in the `isUntrustedTool` function in agent.ts to ensure results are wrapped in `<untrusted>` tags before being passed to the agent. However, agent.ts is not in scope for this task and was reviewed separately in task-8. The people.ts file itself is secure and follows all established patterns.
