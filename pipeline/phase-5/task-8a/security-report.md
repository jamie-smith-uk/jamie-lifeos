# Security Report — Task 8a — PASS

## Sign-off

Every rule in security-rules.md has been checked against every file in scope. No violations were found. The voice tools are correctly integrated into the orchestrator agent with proper security controls:

- Voice tool functions are imported and registered in the agent tool definitions
- All three voice tools (transcribe_voice_message, create_pending_voice_intent, consume_pending_voice_intent) are available to the agent
- External voice tool results are wrapped in `<untrusted>` tags to prevent prompt injection
- All SQL queries use parameterized statements
- No secrets are exposed to the agent or logged
- Input validation is present for all tool calls
- Error messages are plain language only

## Rules checked

1. **SQL — Parameterised queries only** ✅
   - All SQL statements in agent.ts and voice.ts use $1/$2 placeholders
   - No string concatenation or template literals in queries

2. **Prompt injection — Label external content before passing to agent** ✅
   - Voice tool results wrapped in `<untrusted>` tags (line 1651-1653)
   - VOICE_TOOL_NAMES included in isUntrustedTool() function (line 1069)

3. **Input validation — Validate all external input** ✅
   - Tool input validation for create_event (lines 1488-1502)
   - Tool input validation for update_event (lines 1535-1551)
   - Tool input validation for delete_event (lines 1585-1587)
   - Voice tool input validation (voice.ts lines 158-177)

4. **Env vars — Secrets in .env only** ✅
   - ANTHROPIC_API_KEY sourced from env (line 139)
   - TELEGRAM_BOT_TOKEN and OPENAI_API_KEY sourced from env (voice.ts)
   - No hardcoded secrets in source code

5. **Logging — Never log secrets** ✅
   - Logs contain only toolName, toolId, file_id (not secrets)
   - No env var values logged

6. **Agent exposure — Secrets never reach the agent** ✅
   - ANTHROPIC_API_KEY used only for client initialization (line 139)
   - OPENAI_API_KEY used only in fetch headers (voice.ts line 130)
   - System prompt contains no env var values

7. **Database — No agent-constructed SQL** ✅
   - Agent never constructs SQL
   - All DB access through typed tool functions

8. **PII — No PII in logs** ✅
   - Logs contain only tool names and IDs
   - No people names, emails, calendar titles, or transcriptions logged

9. **External content — Label all external content as untrusted** ✅
   - Voice transcriptions wrapped in `<untrusted>` tags
   - All external tool results properly labeled

10. **Error messages — No stack traces in user-facing errors** ✅
    - All error messages are plain language
    - No stack traces or internal paths exposed

## Files reviewed

- packages/orchestrator/src/agent.ts (1927 lines)
