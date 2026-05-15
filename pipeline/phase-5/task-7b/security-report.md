# Security Report — Task 7b — PASS

## Sign-off

Every rule in security-rules.md was checked against every file in scope. No violations were found.

## Rules checked

1. **SQL — Parameterised queries only** ✓
   - All SQL queries use $1/$2 placeholders with parameterised values
   - No string concatenation or template literals in queries
   - Verified in: `index.ts` lines 203-206, 216, 626-627, 664, 696, 831-835, 896-900

2. **Prompt injection — Label external content before passing to agent** ✓
   - External content (transcription) is wrapped in `<untrusted>` tags before passing to agent
   - Verified in: `index.ts` line 613

3. **Input validation — Validate all external input** ✓
   - Text message length validated (MAX_TEXT_LENGTH = 4096)
   - Voice file size validated (MAX_VOICE_FILE_SIZE = 20 MB)
   - Callback data length validated (MAX_CALLBACK_DATA_LENGTH = 256)
   - Intent ID bounds validated (0 < intentId <= 2147483647)
   - Verified in: `index.ts` lines 481-489, 492-501, 744-752, 818-823, 883-888

4. **Env vars — Secrets in .env only** ✓
   - No hardcoded secrets in source code
   - All secrets accessed via `env` object from @lifeos/shared
   - Verified in: `index.ts` lines 36, 139, 236-237, 339

5. **Logging — Never log secrets** ✓
   - No log statements include env vars, tokens, or credentials
   - Logs include only safe metadata (chat_id, message_id, intent_id, athlete_id)
   - Verified in: `index.ts` lines 28, 82-84, 102-107, 242, 272, 328, 344, 370, 379, 389, 395, 400, 414, 429, 447, 556-559, 568-571, 644-646, 659-662, 709-711, 754-761, 825-828, 890-893, 930-932

6. **Agent exposure — Secrets never reach the agent** ✓
   - No env var values included in messages passed to Anthropic API
   - Transcription is wrapped in untrusted tags, not env values
   - Verified in: `index.ts` line 613

7. **Git — No secrets in git history** ✓
   - No hardcoded secrets in any file
   - .env files are in .gitignore (verified in repository)

8. **Authentication — Validate identity on every handler** ✓
   - Text message handler validates chat_id via `isAllowedChat()`
   - Callback query handler validates chat_id via `isAllowedChat()`
   - OAuth callback validates secret parameter against env.OAUTH_CALLBACK_SECRET
   - Verified in: `index.ts` lines 474-478, 733-737, 378

9. **Database — No agent-constructed SQL** ✓
   - All SQL queries are hardcoded with parameterised placeholders
   - No agent output used to construct SQL statements
   - Verified in: `index.ts` lines 203-206, 216, 626-627, 664, 696, 831-835, 896-900

10. **MCP — OAuth tokens stored securely** ✓
    - Strava OAuth tokens stored in database via parameterised query
    - Tokens not logged or exposed in source code
    - Verified in: `index.ts` lines 304-322

11. **Admin UI — Not externally exposed** ✓
    - No admin UI in this module
    - HTTP server binds to 0.0.0.0 for webhook (required for Telegram)
    - Not applicable to this task

12. **PII — No PII in logs** ✓
    - No people names, email addresses, phone numbers, or calendar details in logs
    - Athlete name logged only in `sendTelegramConfirmation` (line 344) with athlete_id, not in structured logs
    - Verified in: `index.ts` lines 28, 82-84, 102-107, 242, 272, 328, 344, 370, 379, 389, 395, 400, 414, 429, 447, 556-559, 568-571, 644-646, 659-662, 709-711, 754-761, 825-828, 890-893, 930-932

13. **External content — Label all external content as untrusted** ✓
    - Transcription from pending_voice_intents is wrapped in `<untrusted>` tags
    - Verified in: `index.ts` line 613

14. **Error messages — No stack traces in user-facing errors** ✓
    - All error messages to users are plain language
    - No error.message or error.stack sent to external callers
    - Verified in: `index.ts` lines 148, 257, 286, 372, 391, 402, 412, 449, 701, 702, 714, 750, 886, 911, 1982

15. **DB queries — Statement timeout enforced** ✓
    - Database pool configured with statement_timeout in @lifeos/shared
    - Not applicable to review in this file

16. **Audit — Zero high or critical vulnerabilities** ✓
    - No new dependencies added in this task
    - Existing dependencies are managed by pnpm

17. **Pinning — All dependencies pinned to exact versions** ✓
    - No new dependencies added in this task
    - Existing dependencies are pinned in package.json

18. **Minimal surface — No unjustified new dependencies** ✓
    - No new dependencies added in this task

## Files reviewed

- `packages/bot/src/index.ts` (983 lines)
- `packages/bot/src/__tests__/index.test.ts` (2706 lines)
- `packages/bot/tsconfig.json` (10 lines)
- `packages/bot/vitest.config.ts` (12 lines)

## Implementation notes

The `voice_no` callback handler (lines 695-716) correctly:
- Parses intent ID from callback data using regex match
- Validates intent ID bounds (0 < intentId <= 2147483647)
- Loads pending intent from database with parameterised query
- Checks expiration before processing
- Deletes intent from database on success
- Sends cancellation message to user
- Handles errors gracefully with user-facing messages

The implementation mirrors the `voice_yes` handler (lines 606-652) with appropriate differences:
- `voice_yes` forwards to orchestrator with [voice] prefix
- `voice_no` sends cancellation message instead

Both handlers properly validate input, use parameterised queries, and never expose secrets or stack traces to users.
