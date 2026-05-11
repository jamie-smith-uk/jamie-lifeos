[93m[1m! [0m agent "ag-03-developer" is a subagent, not a primary agent. Falling back to default agent
[0m


[0m> build · claude-sonnet-4-6[0m# [0mTodos


[0m[ ] Read existing bot and orchestrator code to understand current structure
[ ] Implement typing indicator in orchestrator /message handler
[ ] Ensure typing indicator is sent before agent call and doesn't block response
[ ] Write self-assessment.md to pipeline/phase-1/T-11/[0m# [0mTodos[ ] Read existing bot and orchestrator code to understand current structure
[ ] Implement typing indicator in orchestrator /message handler
[ ] Ensure typing indicator is sent before agent call and doesn't block response
[ ] Write self-assessment.md to pipeline/phase-1/T-11/[0m


[0m→ [0mRead packages/bot/src/index.ts
[0m→ [0mRead packages/orchestrator/src/index.ts
Now let me look at the shared env module to understand what environment variables are available:
[0m✱ [0mGlob "packages/shared/src/**/*.ts"[90m 12 matches[0m
[0m✱ [0mGlob "pipeline/phase-1/**"[90m 0 matches[0m
[0m→ [0mRead packages/shared/src/env.ts
[0m→ [0mRead packages/shared/src/types.ts
Now let me look at the bot's package.json to understand dependencies available:
[0m→ [0mRead packages/bot
[0m→ [0mRead packages/orchestrator
[0m→ [0mRead packages/bot/package.json
[0m→ [0mRead packages/orchestrator/package.json
Now I have a clear picture. Let me analyze the design:

1. The **orchestrator** has `env.TELEGRAM_BOT_TOKEN` available (via shared env). The orchestrator can call the Telegram API directly to send the typing indicator.
2. The approach should be: in the orchestrator's `POST /message` handler, fire-and-forget `sendChatAction('typing')` before calling `runAgent`.
3. The bot does **not** need a new `/typing` endpoint since the orchestrator can call Telegram directly.

Let me check how the orchestrator env is configured - specifically whether it has BOT_TOKEN access:
[0m→ [0mRead packages/shared/src/index.ts
Good. The `env` export includes `TELEGRAM_BOT_TOKEN`, so the orchestrator already has access to it. Now I'll implement the typing indicator directly in the orchestrator by calling the Telegram Bot API with a fire-and-forget pattern.
[0m[x] Read existing bot and orchestrator code to understand current structure
[ ] Implement typing indicator in orchestrator /message handler
[ ] Ensure typing indicator is sent before agent call and doesn't block response
[ ] Write self-assessment.md to pipeline/phase-1/T-11/[0m
[0m# [0mTodos


Now I'll implement the typing indicator in the orchestrator. The strategy is:
- Add a `sendTypingIndicator(chatId)` helper that calls the Telegram Bot API directly
- Fire it as a non-blocking promise (with `.catch` for error suppression) before invoking `runAgent`
[0m← [0mEdit packages/orchestrator/src/index.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
@@ -16,8 +16,44 @@
 import type { IncomingMessage as BotMessage, IncomingCallback } from "@lifeos/shared";
 import { runAgent } from "./agent.js";
 
 // ---------------------------------------------------------------------------
+// Typing indicator — fire-and-forget helper
+// ---------------------------------------------------------------------------
+
+/**
+ * Send a `typing` chat action to the given chat via the Telegram Bot API.
+ *
+ * This is intentionally fire-and-forget: the promise is never awaited so it
+ * cannot block or delay the agent response. Any network / API error is logged
+ * at warn level and silently discarded — failure must NOT prevent the agent
+ * from replying.
+ */
+function sendTypingIndicator(chatId: number): void {
+  const url =
+    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`;
+
+  fetch(url, {
+    method: "POST",
+    headers: { "Content-Type": "application/json" },
+    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
+  })
+    .then((res) => {
+      if (!res.ok) {
+        res.text().catch(() => "(unreadable)").then((text) => {
+          log.warn(
+            { chat_id: chatId, status: res.status, body: text },
+            "sendChatAction typing returned non-OK status",
+          );
+        });
+      }
+    })
+    .catch((err: unknown) => {
+      log.warn({ err, chat_id: chatId }, "Failed to send typing indicator");
+    });
+}
+
+// ---------------------------------------------------------------------------
 // Message handler — delegates to the agent core (T-10).
 // ---------------------------------------------------------------------------
 
 /**

[0m

Now add the call to `sendTypingIndicator` in the `POST /message` handler, just before `handleMessage` is called:
[0m← [0mEdit packages/orchestrator/src/index.ts[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
@@ -227,8 +227,12 @@
 const msg = parsed as BotMessage;
 
 log.info({ chat_id: msg.chat_id, message_id: msg.message_id }, "POST /message received");
 
+// Send typing indicator before invoking the agent. Fire-and-forget:
+// failure must not block or prevent the agent from responding.
+sendTypingIndicator(msg.chat_id);
+
 let replyText: string;
 try {
   replyText = await handleMessage(msg);
 } catch (err) {


Now let me verify the final state of the orchestrator file:
[0m→ [0mRead packages/orchestrator/src/index.ts
There's one issue: `sendTypingIndicator` uses `log` but `log` is declared after the function. Let me fix the ordering — move the logger declaration before the typing indicator helper:
[0m[0m



[0m← [0mEdit packages/orchestrator/src/index.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
@@ -16,8 +16,14 @@
 import type { IncomingMessage as BotMessage, IncomingCallback } from "@lifeos/shared";
 import { runAgent } from "./agent.js";
 
 // ---------------------------------------------------------------------------
+// Logger child (declared early so helpers below can use it)
+// ---------------------------------------------------------------------------
+
+const log = logger.child({ service: "orchestrator" });
+
+// ---------------------------------------------------------------------------
 // Typing indicator — fire-and-forget helper
 // ---------------------------------------------------------------------------
 
 /**
I need to remove the duplicate `log` declaration that was already in the file:
[0m← [0mEdit packages/orchestrator/src/index.ts
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/index.ts
@@ -125,14 +125,8 @@
   return { status: 400, text: "Unknown callback action." };
 }
 
 // ---------------------------------------------------------------------------
-// Logger child
-// ---------------------------------------------------------------------------
-
-const log = logger.child({ service: "orchestrator" });
-
-// ---------------------------------------------------------------------------
 // HTTP utilities
 // ---------------------------------------------------------------------------
 
 /** Read the full request body as a UTF-8 string, guarded by a size limit. */

[0m
Now let's verify the file compiles cleanly:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npm run typecheck --workspace=packages/orchestrator 2>&1


[0mnpm error No workspaces found:
npm error   --workspace=packages/orchestrator
npm error A complete log of this run can be found in: /Users/jamie/.npm/_logs/2026-04-20T14_41_29_572Z-debug-0.log[0m$ [0mnpm run typecheck
[0m> @lifeos/orchestrator@0.0.1 typecheck
> tsc --noEmit

Clean. Now let's verify the bot package still typechecks too (no changes, but confirm):
[0m$ [0mnpm run typecheck> @lifeos/bot@0.0.1 typecheck
> tsc --noEmit

[0m
Both packages typecheck cleanly. Now let me run the orchestrator tests:
[0m$ [0mnpm test> @lifeos/orchestrator@0.0.1 test
> vitest run --config vitest.config.ts


 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator


 Test Files  3 passed (3)
      Tests  71 passed (71)
   Start at  15:41:43
   Duration  1.10s (transform 178ms, setup 0ms, import 206ms, tests 981ms, environment 0ms)

[0m
All 71 tests pass. Now mark the implementation tasks as done and write the self-assessment:
[0m# [0mTodos

[x] Read existing bot and orchestrator code to understand current structure
[x] Implement typing indicator in orchestrator /message handler
[x] Ensure typing indicator is sent before agent call and doesn't block response
[ ] Write self-assessment.md to pipeline/phase-1/T-11/[0m
[0m$ [0mmkdir -p /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/T-11
[0m



[0m← [0mWrite pipeline/phase-1/T-11/self-assessment.md[0mWrote file successfully.[0m# [0mTodos[x] Read existing bot and orchestrator code to understand current structure
[x] Implement typing indicator in orchestrator /message handler
[x] Ensure typing indicator is sent before agent call and doesn't block response
[x] Write self-assessment.md to pipeline/phase-1/T-11/
[0m

## T-11 Complete

**Changes made:** `packages/orchestrator/src/index.ts` only.

### What was implemented

A `sendTypingIndicator(chatId: number): void` helper was added at `packages/orchestrator/src/index.ts:31-53`. It calls `https://api.telegram.org/bot<TOKEN>/sendChatAction` with `action: "typing"` using the bot token already available in `env.TELEGRAM_BOT_TOKEN`.

The function is called at line 233 in the `POST /message` handler — one line before `await handleMessage(msg)` (which triggers the Anthropic API call). Because the function returns `void` and never awaited, it is a true fire-and-forget: the typing indicator HTTP request is dispatched to Telegram immediately, then the agent begins without waiting for Telegram's acknowledgement.

All error paths (network failure, non-2xx response) are caught and logged at `warn` level only — they cannot propagate and cannot block the reply.

**No bot changes were required** — the orchestrator already has `TELEGRAM_BOT_TOKEN` via the shared env module, so calling the Telegram API directly is simpler and faster than routing through the bot service.

**Tests:** 71/71 orchestrator tests pass; both packages typecheck clean.
