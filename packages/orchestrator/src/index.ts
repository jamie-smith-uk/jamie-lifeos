/**
 * index.ts — Orchestrator HTTP server entrypoint.
 *
 * Starts a Node.js HTTP server (no framework). Handles:
 *   POST /message  — accepts IncomingMessage, calls the agent, returns reply text.
 *   POST /callback — accepts IncomingCallback, routes to confirm/edit/cancel handler.
 *
 * Migrations are run before the server begins accepting requests.
 *
 * T-17: Confirm/cancel callback handlers wired end-to-end.
 *   confirm — loads ConfirmationPayload, executes the calendar tool, clears
 *             the confirmation, and returns a success message.
 *   cancel  — clears the pending confirmation and returns a cancellation message.
 *   The /message handler propagates show_confirmation_keyboard from AgentResult
 *   so the bot knows to render the inline keyboard.
 *
 * T-18: Edit callback handler wired end-to-end.
 *   edit    — loads the current ConfirmationPayload, clears it, then re-invokes
 *             runAgent with a synthetic message that includes the prior proposal
 *             context so the agent can refine the proposed change. The agent
 *             will propose again (via update_event or create_event interception)
 *             and showConfirmationKeyboard will be set to true in the reply so
 *             the bot renders the inline keyboard again for the revised proposal.
 *
 * T-19: Delete event confirmation flow wired end-to-end.
 *   When the agent calls delete_event, the interceptor in agent.ts saves a
 *   ConfirmationPayload { action: 'delete_event', eventId }.  On confirm, this
 *   handler calls delete_event via executeCalendarTool and returns a deletion
 *   success message.  The agent is instructed to first call get_events_range to
 *   resolve ambiguous matches before proposing the deletion.
 *
 * Environment:
 *   PORT  — TCP port to listen on (default: 3001).
 */

import http from "node:http";
import type {
  IncomingMessage as BotMessage,
  CreateEventData,
  DeleteEventData,
  IncomingCallback,
  UpdateEventData,
} from "@lifeos/shared";
import { env, logger, runMigrations } from "@lifeos/shared";
import { clearConfirmation, loadConfirmation, runAgent } from "./agent.js";
import { executeCalendarTool } from "./tools/calendar.js";
import { executeNudgesTool } from "./tools/nudges.js";

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
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`;

  void (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      });
      if (!res.ok) {
        let text = "(unreadable)";
        try {
          text = await res.text();
        } catch {
          // ignore
        }
        log.warn(
          { chat_id: chatId, status: res.status, body: text },
          "sendChatAction typing returned non-OK status",
        );
      }
    } catch (err: unknown) {
      log.warn({ err, chat_id: chatId }, "Failed to send typing indicator");
    }
  })();
}

// ---------------------------------------------------------------------------
// Message handler — delegates to the agent core (T-10).
// ---------------------------------------------------------------------------

/**
 * Handle an incoming message by invoking the agent loop.
 * The agent loads conversation context, calls the Anthropic API (with tool
 * loop), persists the exchange, and returns the assistant's reply along with
 * a flag indicating whether the confirmation keyboard should be shown.
 *
 * T-17: Returns { text, show_confirmation_keyboard } so the bot knows whether
 * to render Confirm / Edit / Cancel inline buttons alongside the reply.
 */
async function handleMessage(
  msg: BotMessage,
): Promise<{ text: string; show_confirmation_keyboard: boolean }> {
  const result = await runAgent(msg);
  return {
    text: result.text,
    show_confirmation_keyboard: result.showConfirmationKeyboard,
  };
}

// ---------------------------------------------------------------------------
// Callback routing
// ---------------------------------------------------------------------------

/**
 * Route an inline-keyboard callback to the appropriate handler.
 *
 * Supported callback_data values:
 *   confirm  — load pending ConfirmationPayload, execute the calendar tool,
 *              clear the confirmation, and return a success message.
 *   edit     — load the pending ConfirmationPayload, clear it, re-invoke
 *              runAgent with a synthetic edit-intent message so the agent can
 *              refine and re-propose the change. Returns the agent's new
 *              proposal text and show_confirmation_keyboard flag.
 *   cancel   — clear the pending confirmation and notify the user.
 *   dismiss:<nudgeId> — dismiss a nudge notification.
 *
 * All other values are rejected with a 400 response.
 *
 * T-17: confirm and cancel are fully implemented.
 * T-18: edit is fully implemented.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
async function handleCallback(
  callback: IncomingCallback,
): Promise<{ status: number; text: string; show_confirmation_keyboard?: boolean }> {
  const data = callback.callback_data;

  if (data === "confirm") {
    log.info({ chat_id: callback.chat_id }, "Callback: confirm");

    // Load the pending confirmation payload.
    const payload = await loadConfirmation(callback.chat_id);

    if (payload === null) {
      log.warn({ chat_id: callback.chat_id }, "Confirm callback: no pending confirmation found");
      return {
        status: 200,
        text: "No pending action to confirm. The proposal may have expired.",
      };
    }

    log.info(
      { chat_id: callback.chat_id, action: payload.action },
      "Executing confirmed calendar action",
    );

    // Execute the calendar tool with the stored data.
    let toolResult: string;
    try {
      toolResult = await executeCalendarTool(
        payload.action,
        payload.data as unknown as Record<string, unknown>,
      );
    } catch (err) {
      log.error(
        { err, chat_id: callback.chat_id, action: payload.action },
        "Calendar tool error during confirm",
      );
      // Clear the confirmation so the user is not stuck.
      try {
        await clearConfirmation(callback.chat_id);
      } catch (clearErr: unknown) {
        log.error({ err: clearErr }, "Failed to clear confirmation after tool error");
      }
      return {
        status: 200,
        text: "Something went wrong while applying the change. Please try again.",
      };
    }

    // Clear the confirmation now that the action has been executed.
    try {
      await clearConfirmation(callback.chat_id);
    } catch (clearErr: unknown) {
      log.error({ clearErr }, "Failed to clear confirmation after confirm");
    }

    // Build a user-friendly success message.
    let successText: string;

    // Try to parse the tool result as JSON (may contain an error field).
    let toolResultObj: { error?: string } | null = null;
    try {
      toolResultObj = JSON.parse(toolResult) as { error?: string };
    } catch {
      // Not JSON — treat as plain success text from the MCP server.
    }

    if (payload.action === "create_event") {
      const eventData = payload.data as CreateEventData;

      if (toolResultObj?.error) {
        successText = `Failed to create event: ${toolResultObj.error}`;
      } else {
        successText = `Event "${eventData.title}" has been added to your calendar.`;
        if (toolResult && toolResult.trim() !== "" && !toolResultObj?.error) {
          // Append any detail the MCP server returned.
          successText += `\n\n${toolResult}`;
        }
      }
    } else if (payload.action === "update_event") {
      // T-18: Build a success message for update_event.
      const updateData = payload.data as UpdateEventData;

      if (toolResultObj?.error) {
        successText = `Failed to update event: ${toolResultObj.error}`;
      } else {
        successText = `Event (ID: ${updateData.eventId}) has been updated in your calendar.`;
        if (toolResult && toolResult.trim() !== "" && !toolResultObj?.error) {
          successText += `\n\n${toolResult}`;
        }
      }
    } else if (payload.action === "delete_event") {
      // T-19: Build a success message for delete_event.
      const deleteData = payload.data as DeleteEventData;

      if (toolResultObj?.error) {
        successText = `Failed to delete event: ${toolResultObj.error}`;
      } else {
        successText = `Event (ID: ${deleteData.eventId}) has been deleted from your calendar.`;
        if (toolResult && toolResult.trim() !== "" && !toolResultObj?.error) {
          successText += `\n\n${toolResult}`;
        }
      }
    } else {
      successText = `Action confirmed: ${toolResult}`;
    }

    log.info(
      { chat_id: callback.chat_id, action: payload.action },
      "Confirmation executed successfully",
    );
    return { status: 200, text: successText };
  }

  if (data === "edit") {
    log.info({ chat_id: callback.chat_id }, "Callback: edit");

    // T-18: Load the pending confirmation so we can include context in the
    // re-prompt message. Then clear it — the agent will create a fresh
    // confirmation when it proposes the revised change.
    let existingPayload: Awaited<ReturnType<typeof loadConfirmation>>;
    try {
      existingPayload = await loadConfirmation(callback.chat_id);
    } catch (err: unknown) {
      log.warn({ err, chat_id: callback.chat_id }, "Edit callback: failed to load confirmation");
      existingPayload = null;
    }

    // Clear the existing confirmation so we start fresh.
    try {
      await clearConfirmation(callback.chat_id);
    } catch (clearErr: unknown) {
      log.error({ err: clearErr }, "Failed to clear confirmation on edit");
    }

    // Build a context-aware re-prompt message that includes the prior proposal
    // so the agent knows what was proposed and can offer to change specific fields.
    let rePromptText: string;
    if (existingPayload !== null) {
      rePromptText =
        `I'd like to make some changes to the proposed ${existingPayload.action === "update_event" ? "event update" : "event"}. ` +
        `Here is what was proposed:\n\n<untrusted>${existingPayload.summary}</untrusted>\n\n` +
        `Please tell me what you would like to change about this proposal.`;
    } else {
      rePromptText = "I'd like to make some changes. Please tell me what you would like to adjust.";
    }

    // Re-invoke the agent with the edit-intent message so it can re-propose.
    let agentResult: { text: string; showConfirmationKeyboard: boolean };
    try {
      agentResult = await runAgent({
        chat_id: callback.chat_id,
        text: rePromptText,
        message_id: callback.message_id,
      });
    } catch (err) {
      log.error({ err, chat_id: callback.chat_id }, "Agent error during edit re-prompt");
      return {
        status: 200,
        text: "Something went wrong while processing your edit request. Please describe your changes again.",
      };
    }

    log.info(
      { chat_id: callback.chat_id, showConfirmationKeyboard: agentResult.showConfirmationKeyboard },
      "Edit re-prompt agent response ready",
    );

    const editResult: { status: number; text: string; show_confirmation_keyboard?: boolean } = {
      status: 200,
      text: agentResult.text,
    };
    if (agentResult.showConfirmationKeyboard) {
      editResult.show_confirmation_keyboard = true;
    }
    return editResult;
  }

  if (data === "cancel") {
    log.info({ chat_id: callback.chat_id }, "Callback: cancel");

    // T-17: Clear any pending confirmation and notify the user.
    try {
      await clearConfirmation(callback.chat_id);
    } catch (clearErr: unknown) {
      log.error({ err: clearErr }, "Failed to clear confirmation on cancel");
    }

    return { status: 200, text: "Cancelled. No changes were made to your calendar." };
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
function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body, "utf8").toString(),
  });
  res.end(body);
}

/** Send a plain-text error response. */
function sendError(res: http.ServerResponse, status: number, message: string): void {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(message, "utf8").toString(),
  });
  res.end(message);
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
      typeof (parsed as Record<string, unknown>).chat_id !== "number" ||
      typeof (parsed as Record<string, unknown>).text !== "string" ||
      typeof (parsed as Record<string, unknown>).message_id !== "number"
    ) {
      sendError(res, 400, "Missing required fields: chat_id, text, message_id");
      return;
    }

    const msg = parsed as BotMessage;

    if (msg.chat_id !== Number(env.TELEGRAM_ALLOWED_CHAT_ID)) {
      log.warn({ chat_id: msg.chat_id }, "Rejected message from unauthorised chat_id");
      sendError(res, 403, "Forbidden");
      return;
    }

    log.info({ chat_id: msg.chat_id, message_id: msg.message_id }, "POST /message received");

    // Send typing indicator before invoking the agent. Fire-and-forget:
    // failure must not block or prevent the agent from responding.
    sendTypingIndicator(msg.chat_id);

    let agentReply: { text: string; show_confirmation_keyboard: boolean };
    try {
      agentReply = await handleMessage(msg);
    } catch (err) {
      log.error({ err, chat_id: msg.chat_id }, "Agent error handling /message");
      sendError(res, 500, "Internal server error");
      return;
    }

    // T-17: Propagate show_confirmation_keyboard so the bot renders inline
    // keyboard buttons when a calendar mutation has been proposed.
    const responsePayload: { text: string; show_confirmation_keyboard?: boolean } = {
      text: agentReply.text,
    };
    if (agentReply.show_confirmation_keyboard) {
      responsePayload.show_confirmation_keyboard = true;
    }

    sendJson(res, 200, responsePayload);
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
      typeof (parsed as Record<string, unknown>).chat_id !== "number" ||
      typeof (parsed as Record<string, unknown>).callback_query_id !== "string" ||
      typeof (parsed as Record<string, unknown>).callback_data !== "string" ||
      typeof (parsed as Record<string, unknown>).message_id !== "number"
    ) {
      sendError(
        res,
        400,
        "Missing required fields: chat_id, callback_query_id, callback_data, message_id",
      );
      return;
    }

    const callback = parsed as IncomingCallback;

    if (callback.chat_id !== Number(env.TELEGRAM_ALLOWED_CHAT_ID)) {
      log.warn({ chat_id: callback.chat_id }, "Rejected callback from unauthorised chat_id");
      sendError(res, 403, "Forbidden");
      return;
    }

    log.info(
      { chat_id: callback.chat_id, callback_data: callback.callback_data },
      "POST /callback received",
    );

    let result: { status: number; text: string; show_confirmation_keyboard?: boolean };
    try {
      result = await handleCallback(callback);
    } catch (err) {
      log.error({ err, chat_id: callback.chat_id }, "Error handling /callback");
      sendError(res, 500, "Internal server error");
      return;
    }

    // T-18: Propagate show_confirmation_keyboard from callback result so the
    // bot renders inline keyboard buttons when the edit re-prompt proposes again.
    const callbackResponsePayload: { text: string; show_confirmation_keyboard?: boolean } = {
      text: result.text,
    };
    if (result.show_confirmation_keyboard) {
      callbackResponsePayload.show_confirmation_keyboard = true;
    }

    sendJson(res, result.status, callbackResponsePayload);
    return;
  }

  // ------------------------------------------------------------------
  // POST /dismiss-nudge
  // ------------------------------------------------------------------
  if (method === "POST" && url === "/dismiss-nudge") {
    let body: string;
    try {
      body = await readBody(req);
    } catch (err) {
      log.warn({ err }, "Failed to read /dismiss-nudge request body");
      sendJson(res, 400, { success: false, error: "Bad request body" });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid JSON" });
      return;
    }

    // Validate required fields.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).nudge_id !== "number" ||
      typeof (parsed as Record<string, unknown>).chat_id !== "number"
    ) {
      sendJson(res, 400, { success: false, error: "Missing required fields: nudge_id, chat_id" });
      return;
    }

    const nudgeId = (parsed as Record<string, unknown>).nudge_id as number;
    const chat_id = (parsed as Record<string, unknown>).chat_id as number;

    // Validate nudge_id is a positive integer
    if (!Number.isInteger(nudgeId) || nudgeId <= 0) {
      sendJson(res, 400, { success: false, error: "nudge_id must be a positive integer" });
      return;
    }

    if (chat_id !== Number(env.TELEGRAM_ALLOWED_CHAT_ID)) {
      log.warn({ chat_id }, "Rejected /dismiss-nudge from unauthorised chat_id");
      sendJson(res, 403, { success: false, error: "Forbidden" });
      return;
    }

    log.info({ nudge_id: nudgeId, chat_id }, "POST /dismiss-nudge received");

    let toolResult: string;
    try {
      // Call dismiss_nudge via executeNudgesTool with operation field
      toolResult = await executeNudgesTool(
        JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: nudgeId,
        }),
      );
    } catch (err) {
      log.error({ err, nudge_id: nudgeId }, "Error calling dismiss_nudge tool");
      sendJson(res, 500, { success: false, error: "Internal server error" });
      return;
    }

    // Parse the tool result to determine success/failure
    let toolResultObj: { success?: boolean; error?: string } | null = null;
    try {
      toolResultObj = JSON.parse(toolResult) as { success?: boolean; error?: string };
    } catch {
      log.error({ nudge_id: nudgeId, toolResult }, "Failed to parse dismiss_nudge tool result");
      sendJson(res, 500, { success: false, error: "Internal server error" });
      return;
    }

    // Return the tool result as JSON
    sendJson(res, 200, toolResultObj);
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
  try {
    await runMigrations();
  } catch (err: unknown) {
    log.error({ err }, "Failed to run migrations — exiting");
    process.exit(1);
  }
  log.info("Migrations complete");

  const port = Number(env.PORT);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    log.error({ PORT: env.PORT }, "Invalid PORT — must be an integer 1–65535");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        await requestHandler(req, res);
      } catch (err: unknown) {
        log.error({ err }, "Unhandled error in request handler");
        if (!res.headersSent) {
          sendError(res, 500, "Internal server error");
        }
      }
    })();
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

void (async () => {
  try {
    await main();
  } catch (_err: unknown) {
    process.exit(1);
  }
})();
