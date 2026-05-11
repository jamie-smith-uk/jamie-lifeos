# Security Report — T-05: Bot service entrypoint and message handler

**Date:** 2026-04-20  
**Reviewer:** AG-04 Security Agent  
**Task:** T-05 — Bot service: entrypoint and message handler  
**Files reviewed:**
- `packages/bot/src/index.ts`
- `packages/bot/package.json` (dependency surface, version pinning)
- `packages/shared/src/env.ts` (referenced env module, in scope as dependency of T-02)

**Verdict: FAIL**

---

## Findings

### FAIL-01 — Missing whitelist check on text message handler (Rule 4.1 Input Validation / Rule 4.3 Telegram Whitelist)

**Severity:** Critical  
**Rule:** 4.1 Input Validation — "Every message handler validates: chat_id matches whitelist"  
**Rule:** 4.3 Authentication — "Every handler (messages, callback queries, inline buttons) checks chat_id against TELEGRAM_ALLOWED_CHAT_ID first"  
**Location:** `packages/bot/src/index.ts:81-108`

The `onText` handler does **not** check `chatId` against `env.TELEGRAM_ALLOWED_CHAT_ID` before processing or forwarding the message. Any Telegram user who knows the bot token (or discovers the bot) can send messages that will be forwarded to the orchestrator.

```typescript
// packages/bot/src/index.ts:81
bot.onText(/.*/, (msg) => {
  const chatId = msg.chat.id;
  // NO whitelist check here — all senders are processed
  ...
  postToOrchestrator("/message", body)...
});
```

**Required fix:** At the top of the handler, before any processing, validate:
```typescript
if (String(chatId) !== env.TELEGRAM_ALLOWED_CHAT_ID) {
  botLogger.warn({ chat_id: chatId }, "Rejected message from non-whitelisted chat");
  return;
}
```

---

### FAIL-02 — Missing whitelist check on callback_query handler (Rule 4.3 Telegram Whitelist)

**Severity:** Critical  
**Rule:** 4.3 Authentication — "Every handler (messages, callback queries, inline buttons) checks chat_id against TELEGRAM_ALLOWED_CHAT_ID first"  
**Location:** `packages/bot/src/index.ts:114-150`

The `callback_query` handler checks for the presence of `chatId` (undefined guard) but does **not** check it against the whitelist. Any Telegram user can trigger callback queries that are forwarded to the orchestrator.

```typescript
// packages/bot/src/index.ts:114
bot.on("callback_query", (query) => {
  const chatId = query.message?.chat.id;
  if (chatId === undefined) { ... return; }
  // NO whitelist check — proceeds for any chat_id
  ...
  postToOrchestrator("/callback", body)...
});
```

**Required fix:** After the undefined guard, add:
```typescript
if (String(chatId) !== env.TELEGRAM_ALLOWED_CHAT_ID) {
  botLogger.warn({ chat_id: chatId }, "Rejected callback_query from non-whitelisted chat");
  return;
}
```

---

### FAIL-03 — Missing message length cap and empty message guard (Rule 4.1 Input Validation)

**Severity:** High  
**Rule:** 4.1 Input Validation — "message non-empty, length within 4000 chars"  
**Location:** `packages/bot/src/index.ts:83`

The text message handler sets `text = msg.text ?? ""` but then forwards empty strings and strings of any length to the orchestrator. There is no length cap and no guard against empty messages.

```typescript
const text = msg.text ?? "";
// Empty string is forwarded; strings > 4000 chars are forwarded unvalidated
```

**Required fix:**
```typescript
const text = msg.text ?? "";
if (text.trim() === "") return;
if (text.length > 4000) {
  await sendErrorReply(chatId);
  return;
}
```

---

### FAIL-04 — Webhook binds to 0.0.0.0 (Rule 4.3 Admin UI / binding exposure)

**Severity:** Medium  
**Rule:** 4.3 Admin UI — "Any admin service bound to 127.0.0.1 only. FAIL: admin service with ports binding to 0.0.0.0"  
**Location:** `packages/bot/src/index.ts:30`

The webhook host is hardcoded to `"0.0.0.0"`, binding the webhook HTTP listener on all interfaces. For a Telegram webhook receiver this is typically intentional (it needs to receive traffic from Telegram's servers), but the rule as written requires justification for any 0.0.0.0 binding and the task manifest contains none.

```typescript
webHook: isPolling
  ? false
  : { host: "0.0.0.0", port },
```

**Required action:** Add a documented justification in the task manifest that the webhook listener must be publicly reachable for Telegram to deliver updates, OR change to `"127.0.0.1"` if operating behind a reverse proxy that handles TLS termination.

---

### FAIL-05 — callback_data logged before any validation or whitelist check (Rule 4.4 PII / Rule 4.1)

**Severity:** Medium  
**Rule:** 4.4 PII — "People names, email addresses, phone numbers, calendar event details must not appear in logs"  
**Location:** `packages/bot/src/index.ts:127-134`

The callback_data value (user-controlled) and from_username are logged before any validation. `callback_data` could contain PII (e.g. task content, names, emails embedded by the UI). `from_username` is also a form of PII (Telegram identity).

```typescript
botLogger.info(
  {
    chat_id: chatId,
    callback_query_id: query.id,
    callback_data: callbackData,  // user-controlled, potentially PII
  },
  "Received callback_query",
);
```

Similarly in the text message handler:
```typescript
botLogger.info(
  { chat_id: chatId, message_id: messageId, from_username: fromUsername },
  // from_username is PII
  "Received message",
);
```

**Required fix:** Remove `callback_data` and `from_username` from log payloads. Log only opaque identifiers (`chat_id`, `message_id`, `callback_query_id`).

---

## Passing Checks

| Rule | Check | Result |
|------|-------|--------|
| 4.1 SQL — Parameterised queries | No SQL in this file | PASS (N/A) |
| 4.1 Prompt injection | No agent calls in this file | PASS (N/A) |
| 4.1 Cron injection | No cron handling in this file | PASS (N/A) |
| 4.2 Env vars — No hardcoded secrets | All secrets via `env.*` from shared module; no hardcoded token/key/secret strings found | PASS |
| 4.2 Logging — No secrets logged | No `process.env` values, token/key/secret/password variables logged | PASS |
| 4.2 Agent exposure | No Anthropic API calls in this file | PASS (N/A) |
| 4.3 Database — No agent-constructed SQL | No DB access in this file | PASS (N/A) |
| 4.3 MCP — OAuth tokens | No OAuth tokens present | PASS (N/A) |
| 4.4 Error messages — No stack traces to Telegram | `sendErrorReply` sends only `"Something went wrong. Please try again."` — no `error.message` or `error.stack` sent to user | PASS |
| 4.4 DB statement timeout | No DB pool config in this file | PASS (N/A) |
| 4.5 Dependency pinning | `node-telegram-bot-api: "0.67.0"` — exact version, no `^` or `~` | PASS |
| 4.5 Dependency justification | `node-telegram-bot-api` is the core bot library named in the task manifest | PASS |

---

## Summary

| ID | Severity | Rule | Description |
|----|----------|------|-------------|
| FAIL-01 | Critical | 4.1 / 4.3 | No whitelist check in `onText` handler |
| FAIL-02 | Critical | 4.3 | No whitelist check in `callback_query` handler |
| FAIL-03 | High | 4.1 | No empty-message guard or 4000-char length cap |
| FAIL-04 | Medium | 4.3 | Webhook binds to `0.0.0.0` without manifest justification |
| FAIL-05 | Medium | 4.4 | `callback_data` and `from_username` logged — potential PII exposure |

**Total blocking findings: 5**  
**Verdict: FAIL — return to AG-03 for remediation before proceeding to AG-05.**
