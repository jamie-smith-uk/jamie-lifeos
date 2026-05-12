# Security Report — Task 6a — PASS

## Sign-off

Every rule in security-rules.md has been checked against every file in scope. No violations were found. The implementation of email sender matching against the people graph follows all security requirements.

## Rules checked

1. **SQL — Parameterised queries only** ✓
   - Database queries use parameterized placeholders ($1::text[]) with no string concatenation.

2. **Prompt injection — Label external content before passing to agent** ✓
   - All external email data (From, Subject, body, thread IDs) wrapped in explicit `<untrusted>` tags.

3. **Input validation — Validate all external input** ✓
   - Thread ID length validated against MAX_THREAD_ID_LEN (256 chars).
   - Operation name length validated against MAX_OPERATION_LEN (64 chars).
   - Email content and subject validated as strings before processing.

4. **Cron injection — Validate cron expressions before storing** ✓
   - Not applicable (no cron expressions in scope).

5. **Env vars — Secrets in .env only** ✓
   - All credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) accessed via env module only.
   - No hardcoded secrets in source code.

6. **Logging — Never log secrets** ✓
   - All error logs use String(err) without exposing credentials or tokens.
   - No env var values logged.

7. **Agent exposure — Secrets never reach the agent** ✓
   - No env var values included in strings passed to Anthropic API.

8. **Git — No secrets in git history** ✓
   - Not applicable to code review.

9. **Authentication — Validate identity on every handler** ✓
   - Not applicable (tool implementations, not HTTP handlers).

10. **Database — No agent-constructed SQL** ✓
    - SQL hardcoded with parameterized placeholders; no agent output used in query construction.

11. **MCP — OAuth tokens stored securely** ✓
    - OAuth tokens accessed from env vars only.
    - Access tokens cached in memory with expiry, never persisted to database.

12. **Admin UI — Not externally exposed** ✓
    - Not applicable (no admin UI in scope).

13. **PII — No PII in logs** ✓
    - Error logs do not include email addresses, names, or other PII.
    - Email data returned to agent is wrapped in `<untrusted>` tags, not logged.

14. **External content — Label all external content as untrusted** ✓
    - All Gmail API responses (messages, threads, headers) wrapped in `<untrusted>` tags before return.

15. **Error messages — No stack traces in user-facing errors** ✓
    - All error responses return JSON objects with generic error messages.
    - No stack traces or internal paths exposed.

16. **DB queries — Statement timeout enforced** ✓
    - Uses pool.query() from shared module with established timeout configuration.

17. **Audit — Zero high or critical vulnerabilities** ✓
    - Not applicable to code review.

18. **Pinning — All dependencies pinned to exact versions** ✓
    - Not applicable (no new dependencies added).

19. **Minimal surface — No unjustified new dependencies** ✓
    - No new dependencies introduced.

## Files reviewed

- `packages/orchestrator/src/tools/gmail.ts` (1144 lines)
  - Email sender matching implementation (lines 202-302)
  - Integration with get_inbox_summary (lines 354-406)
  - Integration with get_thread (lines 413-457)
  - All external data properly labeled as untrusted
  - All database queries parameterized
  - All credentials accessed via env module only
