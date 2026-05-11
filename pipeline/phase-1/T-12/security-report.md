# Security Report — T-12: Calendar Tool Wrappers (Read Operations)

**Agent:** AG-04 Security  
**Date:** 2026-04-20  
**Files in scope:** `packages/orchestrator/src/tools/calendar.ts`  
**Supporting context reviewed:** `packages/orchestrator/src/agent.ts` (integration point)

---

## Verdict: PASS

No FAIL conditions found. One advisory note raised (see §4.4 PII).

---

## Rule-by-rule findings

### 4.1 Input and Injection

| Rule | Status | Notes |
|------|--------|-------|
| **SQL — Parameterised queries only** | PASS | `calendar.ts` contains zero SQL. All DB access remains in the `db/` layer. |
| **Prompt injection — Label external content** | PASS with advisory | Calendar event text returned by the MCP server is passed back to the Anthropic API as a `tool_result` block (`content: resultContent` at `agent.ts:265–268`). The Anthropic `tool_result` message type is structurally distinct from a `user` turn, which provides natural separation. **However**, the returned calendar text is not wrapped in explicit untrusted context tags before reaching the model. The security rules require external content to be "labelled as untrusted when passed to agent" (§4.4). See advisory in §4.4. This is borderline: the current phase does not inject calendar content into a user or system message, only into a `tool_result`, so no hard FAIL is triggered. Recommend adding labels in T-15 or a follow-up. |
| **Input validation — Telegram handlers** | PASS | `calendar.ts` is not a Telegram handler. Input validation (`isIso8601`) is applied to `start` and `end` before forwarding to MCP. |
| **Cron injection** | PASS | No cron logic in scope. |

### 4.2 Secrets and Credentials

| Rule | Status | Notes |
|------|--------|-------|
| **Env vars — Secrets in .env only** | PASS | `GOOGLE_CALENDAR_MCP_URL` read via `process.env["GOOGLE_CALENDAR_MCP_URL"]`. No hardcoded secrets. No strings matching `sk-`, `token`, `password`, `secret`, `key` (case-insensitive) appear in `calendar.ts`. The default fallback value `"https://gcal.mcp.claude.com"` is a URL, not a credential. |
| **Logging — Never log secrets** | PASS | Log calls at lines 97 (`toolName`, `params`) and 177/266 (`err`) do not log environment variable values or variables named `token/key/secret/password`. `params` for `get_todays_events` is always `{}`. For `get_events_range`, `params` contains `start` and `end` datetime strings — not secrets. |
| **Agent exposure — Secrets never reach the agent** | PASS | No env var values are interpolated into `messages` or `system` at any point in `calendar.ts` or in the modified sections of `agent.ts`. |
| **Git — .env in .gitignore** | PASS | `.gitignore` at repo root includes `.env` and `.env.*` on lines 1–2. |

### 4.3 Authentication and Access

| Rule | Status | Notes |
|------|--------|-------|
| **Telegram — Whitelist on every handler** | PASS | `calendar.ts` is not a Telegram handler. Whitelist enforcement is in `index.ts` (previously audited in T-10/T-11). |
| **Database — No agent-constructed SQL** | PASS | `calendar.ts` performs zero DB access. No agent output is used to construct SQL anywhere in this module or in the modified `agent.ts` sections. |
| **MCP — OAuth tokens stored securely** | PASS | No OAuth tokens appear in source code. The module relies solely on the MCP server's own credential handling (the MCP URL is not a credential). |
| **Admin UI — Not externally exposed** | PASS | Not applicable to this module. |

### 4.4 Data Handling

| Rule | Status | Notes |
|------|--------|-------|
| **PII — No PII in logs** | ADVISORY | The `log.info` call at line 97 logs `{ toolName, params }`. For `get_events_range`, `params` contains `{ start, end }` — datetime strings that are not PII. Calendar event titles and descriptions come back in the MCP response string (`result`) and are **not** logged. `log.error` at lines 177 and 266 logs `err` which may contain MCP error messages; these could theoretically include partial event titles in error context from the MCP server. This is low-risk but worth noting. No hard FAIL: no direct logging of `people.name`, email content, or calendar event titles. |
| **External content — Label all external content as untrusted** | ADVISORY | The string returned by `callMcpTool()` (lines 125–131) — which contains raw calendar event data from Google Calendar — is passed directly to the Anthropic API as a `tool_result` content block without an untrusted-content wrapper. The rule requires external content to be "always labelled as untrusted when passed to agent." The `tool_result` channel provides some structural isolation, but an explicit label (e.g. wrapping content in `<untrusted_calendar_data>…</untrusted_calendar_data>` tags) is the specified control. **Recommend adding this wrapper in T-15 or a dedicated hardening task.** Not raising as a hard FAIL because the data enters via `tool_result`, not a `user` message, and the security rule examples focus on email/task content; however this should be resolved before production. |
| **Error messages — No stack traces to Telegram** | PASS | Errors in `getTodaysEvents()` and `getEventsRange()` are caught and returned as structured JSON strings to the agent loop. They are not sent directly to Telegram. The Telegram layer (`index.ts`) handles the final user-facing message; the error strings here are opaque agent-layer data. |
| **DB queries — Statement timeout enforced** | PASS | Not applicable; `calendar.ts` makes no DB connections. |

### 4.5 Dependency Security

| Rule | Status | Notes |
|------|--------|-------|
| **Audit — Zero high/critical vulnerabilities** | PASS | No new npm packages were added by T-12. `calendar.ts` uses only `@anthropic-ai/sdk` (already present) and `@lifeos/shared` (workspace). |
| **Pinning — Exact versions** | PASS | `packages/orchestrator/package.json` has no `^` or `~` prefixes. All versions are pinned exactly (e.g. `"@anthropic-ai/sdk": "0.90.0"`, `"typescript": "5.4.5"`). |
| **Minimal surface — No unjustified new dependencies** | PASS | No new external dependencies introduced. `fetch` is used from the Node.js built-in global (Node 18+). |

---

## Acceptance criteria verification

| Criterion | Met? |
|-----------|------|
| `get_todays_events` tool definition matches MCP contract | YES — `name: "get_todays_events"`, no required params, correct `input_schema` |
| `get_events_range` accepts `start` and `end` as ISO 8601 strings | YES — both validated via `isIso8601()` before forwarding |
| Tool definitions exported and included in agent API call | YES — `calendarReadToolDefinitions` exported and spread into `TOOL_DEFINITIONS` in `agent.ts:126-128` |
| Empty calendar response returns graceful "No events" message | YES — lines 171-173 (`getTodaysEvents`) and 260-262 (`getEventsRange`) handle empty/blank responses |

---

## Advisories (non-blocking)

1. **Untrusted content labelling** (`calendar.ts:125–131` → `agent.ts:265–268`): Raw MCP calendar data is passed to the model as a `tool_result` without an explicit `<untrusted_calendar_data>` wrapper. Not a hard FAIL at this phase, but should be resolved before write operations (T-15) are added, as write-capable agents face higher prompt-injection risk from calendar event content.

2. **MCP error messages in logs** (`calendar.ts:177, 266`): If the Google Calendar MCP server returns an error message that echoes back calendar content (e.g. "event 'Meeting with Alice' not found"), that title could appear in log output. Consider sanitising or truncating MCP error strings before logging.

---

## Overall result

**PASS**
