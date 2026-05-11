# Self-Assessment — Task 2: Create Gmail MCP Tool Module

## Task Summary

Implemented `packages/orchestrator/src/tools/gmail.ts` — a Gmail MCP tool module that communicates with the Gmail MCP server at `gmail.mcp.claude.com` via JSON-RPC 2.0 over HTTPS.

## Acceptance Criteria Status

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| AC1 | `executeGmailTool` exported, routes `get_inbox_summary` and `get_thread` | PASS | Unified dispatcher with switch statement; unknown ops return `{error: "..."}` |
| AC2 | `get_inbox_summary` returns up to 10 unread emails with sender, subject, snippet | PASS | Requests `is:unread`, slices to 10, formats each with From/Subject/Summary/Thread ID |
| AC3 | `get_thread` accepts thread ID and returns full thread plain-text content | PASS | Validates `thread_id`, strips HTML, includes sender/subject/date/body per message |
| AC4 | Email classification: action required, FYI, waiting on | PASS | Keyword pattern matching on combined subject+snippet text; exactly one label per email |
| AC5 | Uses Gmail MCP server at `gmail.mcp.claude.com` via HTTPS + JSON-RPC 2.0 | PASS | HTTPS POST to `https://gmail.mcp.claude.com/rpc` with `jsonrpc: "2.0"`, `Content-Type: application/json` |
| AC6 | Error handling: network, HTTP 4xx/5xx, MCP JSON-RPC errors | PASS | All three error paths return `JSON.stringify({error: "..."})`, never throw |
| AC7 | Response format: always a string, errors valid JSON, success is human-readable text | PASS | Success is multi-line human-readable text (not raw JSON array); errors have `error` key |

## Test Results

```
Test Files  13 passed (13)
     Tests  370 passed (370)
   Duration  2.01s
```

All 45 gmail-task2.test.ts tests pass across 7 describe blocks (AC1–AC7).

## Implementation Details

### File: `packages/orchestrator/src/tools/gmail.ts`

**Architecture:** Follows the established pattern from `todoist.ts` — private functions per operation, unified `executeGmailTool` dispatcher, all errors caught and serialised, no throws.

**MCP Transport:**
- `callMcp(method, params)` — sends JSON-RPC 2.0 POST requests to `https://gmail.mcp.claude.com/rpc`
- Throws on network failure or non-OK HTTP status; callers catch and serialise
- No dedicated API token needed — authentication is handled by the MCP server

**`get_inbox_summary`:**
- Sends `gmail.listMessages` with `query: "is:unread"` and `maxResults: 10`
- Returns formatted multi-line text with From, Subject, Summary, Thread ID, and classification per email
- Graceful empty-inbox message matches `/no (unread )?emails?|inbox.*empty|nothing|0 email/`

**`get_thread`:**
- Validates `thread_id` before making any network call
- Sends `gmail.getThread` with the thread ID
- Formats each message with From, Subject, Date, and plain-text Body
- `stripHtml()` removes any `<tag>` patterns from body content

**Email Classification (`classifyEmail`):**
- Priority order: "waiting on" > "action required" > "FYI"
- Pattern matching on lowercased combined `subject + snippet`
- Default fallback is "FYI" for unmatched emails

## Security Assessment

- No secrets hard-coded — authentication delegated to MCP server (no Bearer tokens)
- No credentials logged — `log.error` calls only include error codes and contextual identifiers
- All user input (thread IDs) is passed as JSON body parameters, not interpolated into URLs
- HTTPS enforced — `GMAIL_MCP_URL` starts with `https://`
- All operations return strings and never throw — no unhandled promise rejections
- No direct `.env` file reads — imports only from `@lifeos/shared`
- `thread_id` validated before network call to prevent empty-string requests

### AG-07 Security Audit — 2026-04-21

**Verdict: PASS** — All security rules satisfied. No blocking findings.

| Finding | Description | Status |
|---------|-------------|--------|
| FAIL-1 | External email content not wrapped in `<untrusted>` tags | RESOLVED — tags at lines 220–229, 295–305 |
| FAIL-2 | No length cap on `thread_id` or `operation` | RESOLVED — `MAX_THREAD_ID_LEN=256`, `MAX_OPERATION_LEN=64` enforced at lines 257, 331 |
| FAIL-3 | Raw `err` object logged (may expose secrets/PII) | RESOLVED — catch blocks log only `{ code }` at lines 237, 312 |
| FAIL-4 | External MCP error `.message` returned to caller verbatim | RESOLVED — generic safe strings returned at lines 195, 271 |
| FAIL-5 | MCP-sourced thread IDs emitted outside `<untrusted>` blocks | RESOLVED — `Thread ID` inside `<untrusted>` block at line 227; inline `<untrusted>Thread ID: ...</untrusted>` at line 283 |

All 19 security rule checks passed (prompt injection labelling, input validation, no hardcoded secrets, no PII in logs, no stack traces in errors, exact dependency pinning, etc.).

## Deviations from Spec

None. All acceptance criteria implemented as specified.
