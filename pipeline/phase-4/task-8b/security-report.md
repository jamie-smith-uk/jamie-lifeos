# Security Report — Task 8b — PASS

## Sign-off

Every rule in security-rules.md was checked against every file in scope. No violations were found.

The code correctly:
- Uses parameterised SQL queries throughout (rules 4.1)
- Wraps external tool results in `<untrusted>` tags before passing to the agent (rules 4.1, 4.4)
- Validates all incoming message input with length caps (rule 4.1)
- Accesses all secrets via environment variables only, never hardcoded (rule 4.2)
- Never logs secrets, tokens, or credentials (rule 4.2)
- Never passes environment variable values to the Anthropic API (rule 4.2)
- Never constructs SQL from agent output (rule 4.3)
- Logs using IDs (chat_id, athlete_id) rather than PII (rule 4.4)
- Returns plain error messages without stack traces to external callers (rule 4.4)

## Rules checked

1. **SQL — Parameterised queries only** ✅
   - All SQL statements use $1/$2 placeholders
   - No string concatenation or template literals in queries
   - Verified in loadContext, saveMessage, saveConfirmation, loadConfirmation, clearConfirmation

2. **Prompt injection — Label external content** ✅
   - External tool results wrapped in `<untrusted>` tags (lines 1505-1507)
   - isUntrustedTool() function correctly identifies all external data sources

3. **Input validation — Validate all external input** ✅
   - Message text validated for non-empty and length cap of 50,000 characters (lines 1261-1267)

4. **Env vars — Secrets in .env only** ✅
   - All environment variables accessed via env module (ANTHROPIC_API_KEY, ANTHROPIC_MODEL, TZ)
   - No hardcoded secrets in source code

5. **Logging — Never log secrets** ✅
   - No log statements include env var values or secret-pattern variables
   - Logs use safe values like model ID, message count, iteration count

6. **Agent exposure — Secrets never reach the agent** ✅
   - API key used only for Anthropic client instantiation (line 133)
   - Never included in messages or system prompt

7. **Database — No agent-constructed SQL** ✅
   - All database access through typed tool functions
   - Agent output never used to construct SQL statements

8. **PII — No PII in logs** ✅
   - Logs use IDs (chat_id, athlete_id) not names or personal details
   - No calendar event titles, email content, or person names in logs

9. **External content — Label all external content** ✅
   - All external tool results wrapped in `<untrusted>` tags before agent processing

10. **Error messages — No stack traces in user-facing errors** ✅
    - Error messages return plain language only (lines 1500, 1347-1349, 1392-1394, 1470-1472)
    - No stack traces or internal paths exposed

11. **MCP — OAuth tokens stored securely** ✅
    - Strava tokens stored in PostgreSQL (correct per security rules note)
    - No Google MCP tokens in code

12. **Strava tool registration** ✅
    - get_strava_oauth_url, get_strava_activities, get_strava_trends all registered in TOOL_DEFINITIONS (lines 738-795)
    - All three tools added to STRAVA_TOOL_NAMES set (lines 897-901)
    - executeStravaTool function correctly dispatches all three tools (lines 940-984)
    - Tool loop correctly routes Strava tools via STRAVA_TOOL_NAMES check (lines 1034-1036)

## Files reviewed

- packages/orchestrator/src/agent.ts (1781 lines)
- packages/orchestrator/src/__tests__/agent.test.ts (464 lines)
