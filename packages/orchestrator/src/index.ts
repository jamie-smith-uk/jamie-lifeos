/**
 * index.ts — Orchestrator HTTP server entrypoint.
 *
 * Starts a Node.js HTTP server (no framework). Handles:
 *   POST /message  — accepts IncomingMessage, calls the agent, returns reply text.
 *   POST /callback — accepts IncomingCallback, routes to confirm/edit/cancel handler.
 *
 * Migrations are run before the server begins accepting requests.
 *
 * Environment:
 *   PORT  — TCP port to listen on (default: 3001).
 */

import http from "http";
import { env, logger, runMigrations } from "@lifeos/shared";
import type { IncomingMessage as BotMessage, IncomingCallback } from "@lifeos/shared";
import { runAgent } from "./agent.js";

// ---------------------------------------------------------------------------
// Logger child (declared early so helpers below can use it)
// ---------------------------------------------------------------------------

const log = logger.child({ service: "orchestrator" });

// ---------------------------------------------------------------------------
// Typing indicator — fire-and-forget helper
// ---------------------------------------------------------------------------

/**
 * Send a `typing` chat action to the given chat via the Telegram Bot API.
 *
 * This is intentionally fire-and-forget: the promise is never awaited so it
 * cannot block or delay the agent response. Any network / API error is logged
 * at warn level and silently discarded — failure must NOT prevent the agent
 * from replying.
 */
function sendTypingIndicator(chatId: number): void {
  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  })
    .then((res) => {
      if (!res.ok) {
        res.text().catch(() => "(unreadable)").then((text) => {
          log.warn(
            { chat_id: chatId, status: res.status, body: text },
            "sendChatAction typing returned non-OK status",
          );
        });
      }
    })
    .catch((err: unknown) => {
      log.warn({ err, chat_id: chatId }, "Failed to send typing indicator");
    });
}

// ---------------------------------------------------------------------------
// Message handler — delegates to the agent core (T-10).
// ---------------------------------------------------------------------------

/**
 * Handle an incoming message by invoking the agent loop.
 * The agent loads conversation context, calls the Anthropic API (with tool
 * loop), persists the exchange, and returns the assistant's text reply.
 */
async function handleMessage(msg: BotMessage): Promise<string> {
  return runAgent(msg);
}

// ---------------------------------------------------------------------------
// Callback routing
// ---------------------------------------------------------------------------

/**
 * Route an inline-keyboard callback to the appropriate handler.
 *
 * Supported callback_data values:
 *   confirm  — execute the pending confirmation action.
 *   edit     — re-prompt the agent with an edit request.
 *   cancel   — clear the pending confirmation and notify the user.
 *   dismiss:<nudgeId> — dismiss a nudge notification.
 *
 * All other values are rejected with a 400 response.
 */
async function handleCallback(
  callback: IncomingCallback,
): Promise<{ status: number; text: string }> {
  const data = callback.callback_data;

  if (data === "confirm") {
    // TODO(T-17): execute pending confirmation action.
    log.info({ chat_id: callback.chat_id }, "Callback: confirm (stub)");
    return { status: 200, text: "Confirmed." };
  }

  if (data === "edit") {
    // TODO(T-18): re-prompt agent with edit intent.
    log.info({ chat_id: callback.chat_id }, "Callback: edit (stub)");
    return { status: 200, text: "Please describe your changes." };
  }

  if (data === "cancel") {
    // TODO(T-17): clearConfirmation(callback.chat_id) — no DB side-effect yet.
    log.info({ chat_id: callback.chat_id }, "Callback: cancel");
    return { status: 200, text: "Cancelled." };
  }

  if (data.startsWith("dismiss:")) {
    const nudgeIdRaw = data.slice("dismiss:".length);
    const nudgeId = Number(nudgeIdRaw);
    if (!Number.isInteger(nudgeId) || nudgeId <= 0) {
      log.warn({ chat_id: callback.chat_id, nudgeIdRaw }, "Invalid nudge ID in dismiss callback");
      return { status: 400, text: "Invalid dismiss payload." };
    }
    // TODO(T-xx): mark nudge dismissed in DB.
    log.info({ chat_id: callback.chat_id, nudgeId }, "Callback: dismiss (stub)");
    return { status: 200, text: "Dismissed." };
  }

  log.warn({ chat_id: callback.chat_id, callback_data: data }, "Unknown callback_data");
  return { status: 400, text: "Unknown callback action." };
}

// ---------------------------------------------------------------------------
// HTTP utilities
// ---------------------------------------------------------------------------

/** Read the full request body as a UTF-8 string, guarded by a size limit. */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const MAX_BYTES = 1_048_576; // 1 MiB
    let body = "";
    let bytesRead = 0;

    req.setEncoding("utf8");

    req.on("data", (chunk: string) => {
      bytesRead += Buffer.byteLength(chunk, "utf8");
      if (bytesRead > MAX_BYTES) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      body += chunk;
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** Send a JSON response. */
function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body, "utf8").toString(),
  });
  res.end(body);
}

/** Send a plain-text error response. */
function sendError(
  res: http.ServerResponse,
  status: number,
  message: string,
): void {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(message, "utf8").toString(),
  });
  res.end(message);
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const method = req.method ?? "";
  const url = req.url ?? "";

  // ------------------------------------------------------------------
  // POST /message
  // ------------------------------------------------------------------
  if (method === "POST" && url === "/message") {
    let body: string;
    try {
      body = await readBody(req);
    } catch (err) {
      log.warn({ err }, "Failed to read /message request body");
      sendError(res, 400, "Bad request body");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendError(res, 400, "Invalid JSON");
      return;
    }

    // Validate required fields.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)["chat_id"] !== "number" ||
      typeof (parsed as Record<string, unknown>)["text"] !== "string" ||
      typeof (parsed as Record<string, unknown>)["message_id"] !== "number"
    ) {
      sendError(res, 400, "Missing required fields: chat_id, text, message_id");
      return;
    }

    const msg = parsed as BotMessage;

    log.info({ chat_id: msg.chat_id, message_id: msg.message_id }, "POST /message received");

    // Send typing indicator before invoking the agent. Fire-and-forget:
    // failure must not block or prevent the agent from responding.
    sendTypingIndicator(msg.chat_id);

    let replyText: string;
    try {
      replyText = await handleMessage(msg);
    } catch (err) {
      log.error({ err, chat_id: msg.chat_id }, "Agent error handling /message");
      sendError(res, 500, "Internal server error");
      return;
    }

    sendJson(res, 200, { text: replyText });
    return;
  }

  // ------------------------------------------------------------------
  // POST /callback
  // ------------------------------------------------------------------
  if (method === "POST" && url === "/callback") {
    let body: string;
    try {
      body = await readBody(req);
    } catch (err) {
      log.warn({ err }, "Failed to read /callback request body");
      sendError(res, 400, "Bad request body");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendError(res, 400, "Invalid JSON");
      return;
    }

    // Validate required fields.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)["chat_id"] !== "number" ||
      typeof (parsed as Record<string, unknown>)["callback_query_id"] !== "string" ||
      typeof (parsed as Record<string, unknown>)["callback_data"] !== "string" ||
      typeof (parsed as Record<string, unknown>)["message_id"] !== "number"
    ) {
      sendError(res, 400, "Missing required fields: chat_id, callback_query_id, callback_data, message_id");
      return;
    }

    const callback = parsed as IncomingCallback;

    log.info(
      { chat_id: callback.chat_id, callback_data: callback.callback_data },
      "POST /callback received",
    );

    let result: { status: number; text: string };
    try {
      result = await handleCallback(callback);
    } catch (err) {
      log.error({ err, chat_id: callback.chat_id }, "Error handling /callback");
      sendError(res, 500, "Internal server error");
      return;
    }

    sendJson(res, result.status, { text: result.text });
    return;
  }

  // ------------------------------------------------------------------
  // 404 for all other routes
  // ------------------------------------------------------------------
  sendError(res, 404, "Not found");
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Run database migrations before the server accepts any traffic.
  log.info("Running database migrations…");
  await runMigrations();
  log.info("Migrations complete");

  const port = Number(env.PORT);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    log.error({ PORT: env.PORT }, "Invalid PORT — must be an integer 1–65535");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    requestHandler(req, res).catch((err: unknown) => {
      log.error({ err }, "Unhandled error in request handler");
      if (!res.headersSent) {
        sendError(res, 500, "Internal server error");
      }
    });
  });

  server.listen(port, () => {
    log.info({ port, service: "orchestrator" }, `Orchestrator listening on port ${port}`);
  });

  // Graceful shutdown handlers.
  const shutdown = (signal: string) => {
    log.info({ signal }, "Received shutdown signal — closing HTTP server");
    server.close(() => {
      log.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  // Use console.error as a last resort — logger may not be initialised.
  console.error("Fatal error during orchestrator startup:", err);
  process.exit(1);
});
