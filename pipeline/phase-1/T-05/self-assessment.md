# T-05 Self-Assessment — Bot service: entrypoint and message handler

**Agent:** AG-03 Developer  
**Task:** T-05 — Bot service: entrypoint and message handler  
**Date:** 2026-04-20  
**Revision:** 1

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Bot starts without error when `TELEGRAM_BOT_TOKEN` is set | PASS | `env.ts` (T-02) validates `TELEGRAM_BOT_TOKEN` at startup and throws before the bot is constructed if it is absent. When present, `new TelegramBot(env.TELEGRAM_BOT_TOKEN, ...)` is called exactly once. The final `botLogger.info("Bot initialised successfully")` line confirms the constructor returned without throwing. |
| 2 | Incoming messages are forwarded to `ORCHESTRATOR_URL` via `POST /message` | PASS | `bot.onText(/.*/)` handler calls `postToOrchestrator("/message", body)` with `{ chat_id, text, message_id, from_username? }` — exactly the `IncomingMessage` shape defined in `@lifeos/shared`. The body is JSON-serialised and sent via `fetch` with `Content-Type: application/json`. |
| 3 | Callback queries are forwarded to `ORCHESTRATOR_URL` via `POST /callback` | PASS | `bot.on("callback_query", ...)` handler calls `postToOrchestrator("/callback", body)` with `{ chat_id, callback_query_id, callback_data, message_id }` — exactly the `IncomingCallback` shape defined in `@lifeos/shared`. |
| 4 | Network errors to orchestrator are caught; user receives error message | PASS | Both handlers attach `.catch()` to the `postToOrchestrator` promise. On error: the error is logged via `botLogger.error`, then `sendErrorReply(chatId)` sends "Something went wrong. Please try again." to the user. `sendErrorReply` itself is wrapped in a `try/catch` so a secondary send failure is also logged without crashing the process. |

**Overall verdict: PASS**

---

## Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `packages/bot/src/index.ts` | Replaced placeholder | Full bot entrypoint: polling/webhook init, onText handler, callback_query handler, error handling |
| `packages/bot/package.json` | Modified | Added `"type": "module"`, added `node-telegram-bot-api@0.67.0` runtime dep, added `@types/node@25.6.0` and `@types/node-telegram-bot-api@0.64.14` dev deps — all pinned to exact versions |

---

## Technical Decisions

### Polling vs webhook mode
`BOT_MODE` is read from `env` (validated by T-02's `env.ts`). In polling mode the `polling` constructor option is set to `{ autoStart: true, params: { timeout: 10 } }` and `webHook` is `false`. In webhook mode `webHook: { host: "0.0.0.0", port }` is passed instead — the library starts its own HTTP listener. This avoids calling any deprecated `startWebHook()` method and matches the type definitions exactly.

### Native `fetch` for orchestrator calls
Node.js 18+ ships native `fetch` in the global scope. Since the project targets Node 20 LTS (per `package.json` `engines.node`), no additional HTTP-client dependency is needed. This keeps the dependency surface small and avoids adding `axios` or `node-fetch`.

### `postToOrchestrator` checks HTTP status
A non-2xx response from the orchestrator is treated as an error — the response body is read and included in the thrown `Error`. This ensures unexpected orchestrator behaviour (5xx, 404, etc.) is surfaced in the bot logs and the user still receives the error reply.

### `onText(/.*/)` catches all text messages
The `/.*/ ` regex matches every non-empty string, including commands like `/start`. This is correct at the T-05 stage: the orchestrator is responsible for intent routing. Whitelist filtering (dropping messages from unauthorised chat IDs) is added in T-06 as specified.

### Fire-and-forget with structured error handling
The `onText` and `callback_query` handlers are synchronous callbacks provided by `node-telegram-bot-api`. They cannot return Promises. Async work is kicked off and errors are handled in `.catch()` chains, never via unhandled promise rejections. Both handlers follow the same pattern:  
1. Kick off `postToOrchestrator(...)`.  
2. `.catch()` logs the error and calls `sendErrorReply(chatId)`.  
3. `sendErrorReply` itself has a `try/catch` so secondary failures are also logged.

### `void sendErrorReply(chatId)` suppresses floating promise lint warnings
`sendErrorReply` returns a `Promise<void>`. Calling it inside a `.catch()` callback without `await` would produce a floating promise. Prefixing with `void` makes the intentional fire-and-forget explicit and suppresses any ESLint `no-floating-promises` warning.

### `callback_query` with missing `message` field
The Telegram Bot API specifies that `callback_query.message` is optional (may be absent for inline queries not attached to a message). The handler guards against this with an early return and a `WARN` log, so the process never crashes on an unexpected payload shape.

---

## Security Notes

- No secrets are present in source code. `TELEGRAM_BOT_TOKEN` and `ORCHESTRATOR_URL` are read exclusively from `env` (validated by T-02's `env.ts`).
- The logger inherited from `@lifeos/shared` has a `redact` configuration that censors `*.token`, `*.api_key`, `*.secret`, etc. from structured log output.
- `from_username` is only included in the forwarded body if it is defined — no `undefined` values are serialised into JSON.
- All `package.json` dependency versions are pinned to exact values — no `^` or `~` prefixes.
- `fetch` requests do not include any Telegram credentials; they communicate only with the internal `ORCHESTRATOR_URL`.

---

## Verification

```
pnpm --filter @lifeos/shared build    # generates dist/ + type declarations
pnpm --filter @lifeos/bot typecheck   # zero errors
pnpm typecheck                        # zero errors across all 3 packages
```

All three commands exit 0 with no TypeScript diagnostics.

---

## Risks / Blockers for Downstream Tasks

- **T-06 (whitelist middleware):** T-05 intentionally does not filter by `TELEGRAM_ALLOWED_CHAT_ID` — that is T-06's responsibility. Any message reaching the bot in the current state will be forwarded to the orchestrator.
- **T-11 (typing indicator):** T-05 does not send a typing action before forwarding. T-11 will add `bot.sendChatAction(chatId, "typing")` before the orchestrator call.
- **T-17 (confirmation keyboard):** T-05 sends raw text replies only. Rendering inline keyboards in response to orchestrator replies is deferred to T-17.
- **Orchestrator not yet running:** `postToOrchestrator` will throw `ECONNREFUSED` if T-08 is not yet deployed. The error is caught and the user receives the "Something went wrong" reply — no crash occurs.
