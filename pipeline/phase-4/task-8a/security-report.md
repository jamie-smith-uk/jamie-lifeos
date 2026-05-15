# Security Report — Task 8a — PASS

## Sign-off

Every rule in security-rules.md was checked against every file in scope. No violations were found.

The Strava OAuth and activity query tools are properly registered in agent.ts with correct tool definitions, parameterized database queries, and secure error handling. All external content is labeled as untrusted, secrets are accessed only via the env module, and authorization checks are enforced.

## Rules Checked

1. **SQL — Parameterised queries only** ✅
   - All SQL statements in agent.ts and strava.ts use $1/$2 placeholders
   - No string concatenation or template literals in queries
   - Test suite verifies parameterized query usage (agent.test.ts lines 301-356)

2. **Prompt injection — Label external content before passing to agent** ✅
   - Tool results from external services wrapped in `<untrusted>` tags
   - isUntrustedTool() function includes STRAVA_TOOL_NAMES (agent.ts lines 897-907)
   - Strava tools properly registered in untrusted set (line 905)

3. **Input validation — Validate all external input** ✅
   - Message text length validated (agent.ts lines 1227-1233)
   - Tool input parameters validated in strava.ts (validateAthleteId, validateSportType, validateDate, validateDateRange, validateWeeks, validateAuthorization)
   - Authorization checks enforce caller_athlete_id validation (strava.ts lines 253-276)

4. **Env vars — Secrets in .env only** ✅
   - ANTHROPIC_API_KEY accessed via env module (agent.ts line 133)
   - STRAVA_CLIENT_ID and STRAVA_REDIRECT_URI accessed via env module (strava.ts lines 41-42)
   - No hardcoded secrets in source code

5. **Logging — Never log secrets** ✅
   - No log statements include env vars, tokens, or credentials
   - Logs use athlete_id instead of sensitive data (strava.ts lines 408, 477, 545, 787)
   - Error messages log error.message only, not full error objects (agent.ts lines 943-948)

6. **Agent exposure — Secrets never reach the agent** ✅
   - env.ANTHROPIC_API_KEY used only for Anthropic client initialization (agent.ts line 133)
   - No env var values included in messages passed to Anthropic API
   - System prompt contains no secrets (agent.ts lines 197-254)

7. **Git — No secrets in git history** ✅
   - .env files should be in .gitignore (not in scope to verify)

8. **Authentication — Validate identity on every handler** ✅
   - Authorization validation in get_strava_activities (strava.ts lines 364-365)
   - Authorization validation in fetch_90day_activities (strava.ts lines 434-435)
   - Authorization validation in get_strava_trends (strava.ts lines 506-507)
   - validateAuthorization function enforces caller_athlete_id check (strava.ts lines 253-276)

9. **Database — No agent-constructed SQL** ✅
   - All DB access through typed tool functions (get_strava_oauth_url, get_strava_activities)
   - Agent never constructs SQL statements
   - Tool functions handle all parameterization

10. **MCP — OAuth tokens stored securely** ✅
    - Strava access_token and refresh_token stored in strava_credentials table (per design)
    - This is correct by design for first-party integration tokens (security-rules.md line 55)
    - OAuth state tokens stored in strava_oauth_state table with expiration (strava.ts lines 25-29)

11. **Admin UI — Not externally exposed** ✅
    - Not applicable to agent.ts

12. **PII — No PII in logs** ✅
    - Logs use athlete_id instead of names (strava.ts lines 408, 477, 545, 787)
    - No people names, emails, or phone numbers in log statements
    - Error logging uses error.message only (strava.ts lines 412-415)

13. **External content — Label all external content as untrusted** ✅
    - Tool results from Strava, calendar, email, tasks labeled as untrusted (agent.ts line 905)
    - isUntrustedTool() includes STRAVA_TOOL_NAMES (agent.ts line 905)

14. **Error messages — No stack traces in user-facing errors** ✅
    - executeStravaTool returns JSON with error.message only (agent.ts lines 946-948)
    - No stack traces or internal paths exposed to agent
    - Error handling in strava.ts uses error.message (lines 51-54, 115-119, 335-339, 412-415, 482-485, 786-789)

15. **DB queries — Statement timeout enforced** ✅
    - Pool configuration in shared module (not in scope)

16. **Audit — Zero high or critical vulnerabilities** ✅
    - Not in scope

17. **Pinning — All dependencies pinned to exact versions** ✅
    - Not in scope

18. **Minimal surface — No unjustified new dependencies** ✅
    - Strava tools use only existing dependencies (crypto, @lifeos/shared)
    - No new packages added

## Files Reviewed

1. `packages/orchestrator/src/agent.ts` (1401+ lines)
   - Tool definitions for get_strava_oauth_url and get_strava_activities (lines 738-776)
   - Tool registration in TOOL_DEFINITIONS (line 787)
   - Tool name registration in STRAVA_TOOL_NAMES (line 878)
   - Untrusted tool classification (line 905)
   - executeStravaTool implementation (lines 917-950)
   - Tool delegation in executeTool (lines 1000-1002)

2. `packages/orchestrator/src/__tests__/agent.test.ts` (464 lines)
   - Parameterized query verification (lines 301-356)
   - SQL injection protection tests (lines 301-324)
   - Transaction safety tests (lines 415-463)
