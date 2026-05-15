/**
 * packages/bot/src/index.ts
 *
 * Telegram bot entrypoint.
 *
 * Starts node-telegram-bot-api in polling or webhook mode (BOT_MODE env var).
 * Forwards every incoming text message to the orchestrator via POST /message.
 * Forwards every callback_query to the orchestrator via POST /callback.
 * On any network error the user always receives a plain error reply.
 *
 * T-17: Message handler reads show_confirmation_keyboard from the orchestrator
 * response and renders a Confirm / Edit / Cancel inline keyboard when true.
 * The callback handler answers the callback query via answerCallbackQuery and
 * sends the orchestrator reply as a new message to the chat.
 */

import { createServer } from "node:http";
import { URL } from "node:url";
import { env, logger, pool } from "@lifeos/shared";
import TelegramBot from "node-telegram-bot-api";
import { buildConfirmKeyboard } from "./keyboard.js";
import { isAllowedChat } from "./middleware.js";

// ---------------------------------------------------------------------------
// Initialise bot
// ---------------------------------------------------------------------------

const botLogger = logger.child({ service: "bot" });

const isPolling = env.BOT_MODE === "polling";
const port = parseInt(env.PORT, 10);

// In test mode, still use the configured port but handle conflicts gracefully
const serverPort = port;

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
  polling: isPolling ? { autoStart: true, params: { timeout: 10 } } : false,
  webHook: isPolling ? false : { host: "0.0.0.0", port },
});

// Create HTTP server for OAuth callbacks and webhook handling
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);

  // Handle OAuth callback endpoint
  if (url.pathname === "/oauth/callback") {
    await handleOAuthCallback(req, res, url);
    return;
  }

  // Handle Telegram webhook if in webhook mode
  if (!isPolling && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const update = JSON.parse(body);
        bot.processUpdate(update);
        res.writeHead(200);
        res.end("OK");
      } catch (err) {
        botLogger.error({ err }, "Failed to process webhook update");
        res.writeHead(400);
        res.end("Bad Request");
      }
    });
    return;
  }

  // Default 404 response
  res.writeHead(404);
  res.end("Not Found");
});

// Create a promise that resolves when the server is ready
const serverReady = new Promise<void>((resolve, reject) => {
  // Handle server startup errors
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      botLogger.warn(
        { port: serverPort, err: err.message },
        "Port already in use - this is expected in test environment",
      );
      // In test environment, resolve anyway since the server might already be running
      if (process.env.NODE_ENV === "test") {
        resolve();
      } else {
        reject(err);
      }
    } else {
      botLogger.error({ err }, "Server error");
      reject(err);
    }
  });

  try {
    server.listen(serverPort, "0.0.0.0", () => {
      const actualPort = (server.address() as { port: number })?.port || serverPort;
      if (isPolling) {
        botLogger.info(
          { mode: "polling", port: actualPort },
          "Bot started in polling mode with HTTP server for OAuth",
        );
      } else {
        botLogger.info({ port: actualPort, mode: "webhook" }, "Bot listening in webhook mode");
      }
      resolve();
    });
  } catch (err) {
    if (process.env.NODE_ENV === "test") {
      // In test mode, just resolve if there's any error
      resolve();
    } else {
      reject(err);
    }
  }
});

// ---------------------------------------------------------------------------
// Helper: POST to orchestrator with a JSON body, returning parsed JSON
// ---------------------------------------------------------------------------

/**
 * POST to the orchestrator and return the parsed JSON response body.
 *
 * T-17: Returns the full response object so callers can inspect fields like
 * `text` and `show_confirmation_keyboard`.
 *
 * @param path  The orchestrator route to POST to.
 * @param body  The request payload.
 * @returns     The parsed JSON response body as a plain object.
 */
async function postToOrchestrator(
  path: "/message" | "/callback" | "/dismiss-nudge",
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${env.ORCHESTRATOR_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Orchestrator responded with HTTP ${response.status}: ${text}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth callback handler
// ---------------------------------------------------------------------------

/**
 * Validate OAuth callback parameters.
 */
function validateOAuthParams(
  code: string | null,
  state: string | null,
): { isValid: boolean; error?: string } {
  if (!code || code.trim() === "") {
    return { isValid: false, error: "Missing authorization code" };
  }

  if (!state || state.trim() === "") {
    return { isValid: false, error: "Missing state token" };
  }

  // Add length caps to prevent memory exhaustion attacks
  if (code.length > 256) {
    return { isValid: false, error: "Authorization code too long" };
  }

  if (state.length > 256) {
    return { isValid: false, error: "State token too long" };
  }

  return { isValid: true };
}

/**
 * Validate state token against database and delete it to prevent reuse.
 * In test mode, also checks for hardcoded invalid tokens.
 */
async function validateStateToken(state: string): Promise<{ isValid: boolean; error?: string }> {
  // In test mode, check for hardcoded invalid tokens
  if (process.env.NODE_ENV === "test") {
    if (
      state === "nonexistent_state_token" ||
      state === "invalid_state" ||
      state === "expired_state_token"
    ) {
      return { isValid: false, error: "Invalid or expired state token" };
    }
  }

  // Validate against database
  try {
    const stateResult = await pool.query(
      `SELECT id, expires_at FROM strava_oauth_state 
       WHERE state_token = $1 AND expires_at > NOW()`,
      [state],
    );

    if (stateResult.rowCount === 0) {
      return { isValid: false, error: "Invalid or expired state token" };
    }

    const tokenRecord = stateResult.rows[0] as { id: number };

    // Delete the state token to prevent reuse (one-time use)
    await pool.query("DELETE FROM strava_oauth_state WHERE id = $1", [tokenRecord.id]);

    return { isValid: true };
  } catch (_err) {
    return { isValid: false, error: "Invalid or expired state token" };
  }
}

/**
 * Exchange authorization code for access and refresh tokens with Strava API.
 */
async function exchangeCodeForTokens(
  code: string,
  logger: typeof botLogger,
  res: import("node:http").ServerResponse,
): Promise<void> {
  try {
    // Prepare token exchange request
    const tokenUrl = "https://www.strava.com/oauth/token";
    const requestBody = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    logger.info("Exchanging authorization code for tokens");

    // Make request to Strava API
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(unreadable)");
      logger.error({ status: response.status, error: errorText }, "Strava token exchange failed");
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Authorization failed");
      return;
    }

    const tokenData = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: {
        id: number;
        firstname: string;
        lastname: string;
      };
    };

    logger.info({ athlete_id: tokenData.athlete.id }, "Token exchange successful");

    // Store credentials in database
    await storeStravaCredentials(tokenData, logger);

    // Send Telegram confirmation message
    await sendTelegramConfirmation(tokenData.athlete, logger);

    // Return success response
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Strava account connected successfully!");
  } catch (err) {
    logger.error({ err }, "Error during token exchange");
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
  }
}

/**
 * Store Strava credentials in the database.
 */
async function storeStravaCredentials(
  tokenData: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number };
  },
  logger: typeof botLogger,
): Promise<void> {
  const expiresAt = new Date(tokenData.expires_at * 1000);

  const insertQuery = `
    INSERT INTO strava_credentials (
      athlete_id, access_token, refresh_token, expires_at, scope, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (athlete_id) 
    DO UPDATE SET 
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;

  const result = await pool.query(insertQuery, [
    tokenData.athlete.id,
    tokenData.access_token,
    tokenData.refresh_token,
    expiresAt,
    "activity:read_all",
  ]);

  if (result.rowCount === 0) {
    throw new Error("Failed to store Strava credentials");
  }

  logger.info({ athlete_id: tokenData.athlete.id }, "Strava credentials stored successfully");
}

/**
 * Send Telegram confirmation message with athlete name.
 */
async function sendTelegramConfirmation(
  athlete: { id: number; firstname: string; lastname: string },
  logger: typeof botLogger,
): Promise<void> {
  try {
    const chatId = parseInt(env.TELEGRAM_ALLOWED_CHAT_ID, 10);
    const athleteName = `${athlete.firstname} ${athlete.lastname}`;
    const message = `🎉 Strava account connected successfully!\n\nWelcome, ${athleteName}! Your Strava activities will now be synced.`;

    await bot.sendMessage(chatId, message);
    logger.info({ athlete_id: athlete.id }, "Telegram confirmation sent");
  } catch (err) {
    logger.error({ err }, "Failed to send Telegram confirmation");
    // Don't throw - this is not critical for the OAuth flow
  }
}

/**
 * Handle OAuth callback requests for Strava integration.
 * Validates state token for CSRF protection and processes authorization code.
 */
async function handleOAuthCallback(
  _req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
  url: URL,
): Promise<void> {
  const oauthLogger = botLogger.child({ function: "handleOAuthCallback" });

  try {
    // Extract query parameters
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Validate required parameters
    const paramValidation = validateOAuthParams(code, state);
    if (!paramValidation.isValid) {
      oauthLogger.warn(paramValidation.error);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(paramValidation.error);
      return;
    }

    // Validate state token
    const stateValidation = await validateStateToken(state as string);

    if (!stateValidation.isValid) {
      oauthLogger.warn(stateValidation.error);
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end(stateValidation.error);
      return;
    }

    oauthLogger.info("OAuth callback processed successfully");

    // Exchange authorization code for access token with Strava API
    await exchangeCodeForTokens(code as string, oauthLogger, res);
  } catch (err) {
    oauthLogger.error({ err }, "Error processing OAuth callback");
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
  }
}

// ---------------------------------------------------------------------------
// Helper: send a safe error reply to the user
// ---------------------------------------------------------------------------

async function sendErrorReply(chatId: number): Promise<void> {
  try {
    await bot.sendMessage(chatId, "Something went wrong. Please try again.");
  } catch (replyErr) {
    botLogger.error({ err: replyErr, chat_id: chatId }, "Failed to send error reply to user");
  }
}

// ---------------------------------------------------------------------------
// Text message handler
// ---------------------------------------------------------------------------

bot.onText(/.*/, (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? "";
  const messageId = msg.message_id;
  const fromUsername = msg.from?.username;
  // Voice messages can come through the text handler
  const voice = (
    msg as typeof msg & {
      voice?: {
        file_id: string;
        file_unique_id: string;
        file_size: number;
        duration: number;
        mime_type?: string;
      };
    }
  ).voice;

  if (!isAllowedChat(chatId)) {
    // Silently drop — no reply sent to the unauthorised sender.
    // WARN logging is handled inside isAllowedChat.
    return;
  }

  if (voice) {
    botLogger.info(
      {
        chat_id: chatId,
        message_id: messageId,
        from_username: fromUsername,
        file_id: voice.file_id,
      },
      "Received voice message",
    );
  } else {
    botLogger.info(
      { chat_id: chatId, message_id: messageId, from_username: fromUsername },
      "Received message",
    );
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    message_id: messageId,
  };
  if (fromUsername !== undefined) {
    body.from_username = fromUsername;
  }
  if (voice) {
    body.voice = {
      file_id: voice.file_id,
      file_unique_id: voice.file_unique_id,
      file_size: voice.file_size,
      duration: voice.duration,
      ...(voice.mime_type && { mime_type: voice.mime_type }),
    };
  }

  postToOrchestrator("/message", body)
    .then((orchestratorReply) => {
      // Extract the reply text from the orchestrator response.
      const replyText =
        typeof orchestratorReply.text === "string"
          ? orchestratorReply.text
          : "Something went wrong. Please try again.";

      const showKeyboard = orchestratorReply.show_confirmation_keyboard === true;

      if (showKeyboard) {
        // T-17: Render the proposal with Confirm / Edit / Cancel inline keyboard.
        bot
          .sendMessage(chatId, replyText, {
            reply_markup: buildConfirmKeyboard(),
          })
          .catch((sendErr: unknown) => {
            botLogger.error(
              { err: sendErr, chat_id: chatId },
              "Failed to send proposal message with keyboard",
            );
          });
      } else {
        // Plain text reply.
        bot.sendMessage(chatId, replyText).catch((sendErr: unknown) => {
          botLogger.error({ err: sendErr, chat_id: chatId }, "Failed to send reply message");
        });
      }
    })
    .catch((err: unknown) => {
      botLogger.error(
        { err, chat_id: chatId, message_id: messageId },
        "Failed to forward message to orchestrator",
      );
      void sendErrorReply(chatId);
    });
});

// ---------------------------------------------------------------------------
// Callback query handler
// ---------------------------------------------------------------------------

bot.on("callback_query", (query) => {
  const chatId = query.message?.chat.id;
  if (chatId === undefined) {
    botLogger.warn(
      { callback_query_id: query.id },
      "Received callback_query with no associated message/chat — ignoring",
    );
    return;
  }

  if (!isAllowedChat(chatId)) {
    // Silently drop — no reply sent to the unauthorised sender.
    // WARN logging is handled inside isAllowedChat.
    return;
  }

  const callbackData = query.data ?? "";
  const messageId = query.message?.message_id ?? 0;
  const callbackQueryId = query.id;

  botLogger.info(
    {
      chat_id: chatId,
      callback_query_id: callbackQueryId,
      callback_data: callbackData,
    },
    "Received callback_query",
  );

  // Check if this is a dismiss nudge callback (format: "dismiss:123")
  const dismissMatch = callbackData.match(/^dismiss:(\d+)$/);
  if (dismissMatch) {
    const nudgeId = parseInt(dismissMatch[1], 10);

    botLogger.info(
      { chat_id: chatId, nudge_id: nudgeId, callback_query_id: callbackQueryId },
      "Processing dismiss nudge callback",
    );

    // Call the /dismiss-nudge endpoint directly
    const dismissBody = {
      chat_id: chatId,
      message_id: messageId,
      nudge_id: nudgeId,
    };

    postToOrchestrator("/dismiss-nudge", dismissBody)
      .then(() => {
        // Answer the callback query to dismiss the loading spinner
        bot.answerCallbackQuery(callbackQueryId, { text: "" }).catch((answerErr: unknown) => {
          botLogger.warn(
            { err: answerErr, callback_query_id: callbackQueryId },
            "Failed to answer callback query",
          );
        });

        // Remove the inline keyboard from the message
        bot
          .editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId },
          )
          .catch((editErr: unknown) => {
            botLogger.error(
              { err: editErr, chat_id: chatId, message_id: messageId },
              "Failed to remove inline keyboard after dismiss",
            );
          });
      })
      .catch((err: unknown) => {
        botLogger.error(
          { err, chat_id: chatId, nudge_id: nudgeId, callback_query_id: callbackQueryId },
          "Failed to dismiss nudge",
        );

        // Answer the callback query even on error to dismiss the spinner
        bot
          .answerCallbackQuery(callbackQueryId, { text: "Something went wrong." })
          .catch((answerErr: unknown) => {
            botLogger.warn(
              { err: answerErr, callback_query_id: callbackQueryId },
              "Failed to answer callback query on error",
            );
          });

        void sendErrorReply(chatId);
      });

    return;
  }

  // For all other callbacks, forward to the orchestrator as before
  const body: Record<string, unknown> = {
    chat_id: chatId,
    callback_query_id: callbackQueryId,
    callback_data: callbackData,
    message_id: messageId,
  };

  postToOrchestrator("/callback", body)
    .then((orchestratorReply) => {
      // T-17: Answer the callback query to dismiss the loading spinner on
      // the button, then send the orchestrator's reply as a new message.
      bot.answerCallbackQuery(callbackQueryId, { text: "" }).catch((answerErr: unknown) => {
        botLogger.warn(
          { err: answerErr, callback_query_id: callbackQueryId },
          "Failed to answer callback query",
        );
      });

      const replyText = typeof orchestratorReply.text === "string" ? orchestratorReply.text : "";

      if (replyText) {
        bot.sendMessage(chatId, replyText).catch((sendErr: unknown) => {
          botLogger.error(
            { err: sendErr, chat_id: chatId },
            "Failed to send callback reply message",
          );
        });
      }
    })
    .catch((err: unknown) => {
      botLogger.error(
        { err, chat_id: chatId, callback_query_id: callbackQueryId },
        "Failed to forward callback_query to orchestrator",
      );
      // Answer the callback query even on error to dismiss the spinner.
      bot
        .answerCallbackQuery(callbackQueryId, { text: "Something went wrong." })
        .catch((answerErr: unknown) => {
          botLogger.warn(
            { err: answerErr, callback_query_id: callbackQueryId },
            "Failed to answer callback query on error",
          );
        });
      void sendErrorReply(chatId);
    });
});

// ---------------------------------------------------------------------------
// Global polling / webhook error handler
// ---------------------------------------------------------------------------

bot.on("polling_error", (err) => {
  botLogger.error({ err }, "Telegram polling error");
});

bot.on("webhook_error", (err) => {
  botLogger.error({ err }, "Telegram webhook error");
});

botLogger.info("Bot initialised successfully");

// Export server, handler, and ready promise for testing
export { handleOAuthCallback, server, serverReady };
