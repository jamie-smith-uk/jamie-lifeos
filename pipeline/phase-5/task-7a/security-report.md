# Security Report — Task 7a — PASS

## Sign-off

Every rule in security-rules.md was checked against the file in scope (`packages/bot/src/index.ts`) and no violations were found. The voice_yes callback handler implementation correctly manages pending intents with proper security controls including input validation, parameterized SQL queries, untrusted content labeling, and secure error handling.

## Rules checked

1. **SQL — Parameterised queries only** ✓
   - All database queries use parameterized placeholders ($1, $2, etc.)
   - No string concatenation or template literals in SQL statements

2. **Prompt injection — Label external content before passing to agent** ✓
   - Transcription from pending_voice_intents wrapped in `<untrusted>` tags before forwarding to orchestrator (line 775)

3. **Input validation — Validate all external input** ✓
   - Intent ID bounds validated (0 < intentId <= 2147483647) on lines 688-693
   - Chat ID authorization checked via isAllowedChat() on lines 603-607
   - All external inputs validated before processing

4. **Env vars — Secrets in .env only** ✓
   - All secrets accessed via env object (TELEGRAM_BOT_TOKEN, ORCHESTRATOR_URL, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, TELEGRAM_ALLOWED_CHAT_ID, OAUTH_CALLBACK_SECRET)
   - No hardcoded secrets in source code

5. **Logging — Never log secrets** ✓
   - No environment variables or sensitive values logged
   - Only metadata (IDs, timestamps, counts) logged
   - Usernames logged are public Telegram identifiers, not PII

6. **Agent exposure — Secrets never reach the agent** ✓
   - No Anthropic API calls in this file
   - Secrets never passed to external agents

7. **Git — No secrets in git history** ✓
   - No secrets visible in source code

8. **Authentication — Validate identity on every handler** ✓
   - Text message handler validates chat ID via isAllowedChat() (lines 474-478)
   - Callback handler validates chat ID via isAllowedChat() (lines 603-607)
   - OAuth callback validates secret token (line 378)
   - State token validated against database (lines 189-222)

9. **Database — No agent-constructed SQL** ✓
   - All SQL queries are hardcoded with parameterized values
   - No agent output used to construct SQL statements

10. **MCP — OAuth tokens stored securely** ✓
    - Strava credentials stored in database via parameterized query (lines 316-322)
    - Correct per security rules: first-party integration tokens must be persisted in PostgreSQL

11. **Admin UI — Not externally exposed** ✓
    - Server listening on 0.0.0.0 is for webhook/OAuth callback handling, not an admin service

12. **PII — No PII in logs** ✓
    - Only athlete_id logged, not athlete names
    - Usernames logged are public Telegram identifiers
    - No email addresses, phone numbers, or calendar event details logged

13. **External content — Label all external content as untrusted** ✓
    - Transcription from database wrapped in `<untrusted>` tags (line 775)
    - Token data from Strava API not passed to agent
    - Athlete names not passed to agent

14. **Error messages — No stack traces in user-facing errors** ✓
    - All user-facing error messages are plain language
    - No stack traces, internal paths, or environment values exposed
    - Consistent error handling pattern throughout

15. **DB queries — Statement timeout enforced** ✓
    - Pool configured with statement_timeout: 30_000 in packages/shared/src/db.ts

16. **Audit — Zero high or critical vulnerabilities** ✓
    - No new dependencies added in this task

17. **Pinning — All dependencies pinned to exact versions** ✓
    - No new dependencies added in this task

18. **Minimal surface — No unjustified new dependencies** ✓
    - No new dependencies added in this task

## Files reviewed

- `packages/bot/src/index.ts` (853 lines)
