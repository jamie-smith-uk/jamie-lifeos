/**
 * packages/bot/src/index.ts
 *
 * Telegram bot entrypoint.
 *
 * Starts node-telegram-bot-api in polling or webhook mode (BOT_MODE env var).
 * Forwards every incoming text message to the orchestrator via POST /message.
 * Forwards every callback_query to the orchestrator via POST /callback.
 * On any network error the user always receives a plain error reply.
 */

import TelegramBot from "node-telegram-bot-api";
import { env, logger } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Initialise bot
// ---------------------------------------------------------------------------

const botLogger = logger.child({ service: "bot" });

const isPolling = env.BOT_MODE === "polling";

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
  polling: isPolling
    ? { autoStart: true, params: { timeout: 10 } }
    : false,
});

if (!isPolling) {
  // Webhook mode: the caller (Railway / reverse proxy) must have already
  // registered the webhook URL with Telegram. The bot simply listens on PORT.
  const port = parseInt(env.PORT, 10);
  bot.startWebHook("/", /* tlsOptions */ null as never, port);
  botLogger.info({ port, mode: "webhook" }, "Bot listening in webhook mode");
} else {
  botLogger.info({ mode: "polling" }, "Bot started in polling mode");
}

// ---------------------------------------------------------------------------
// Helper: POST to orchestrator with a JSON body
// ---------------------------------------------------------------------------

async function postToOrchestrator(
  path: "/message" | "/callback",
  body: Record<string, unknown>,
): Promise<void> {
  const url = `${env.ORCHESTRATOR_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Orchestrator responded with HTTP ${response.status}: ${text}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: send a safe error reply to the user
// ---------------------------------------------------------------------------

async function sendErrorReply(chatId: number): Promise<void> {
  try {
    await bot.sendMessage(chatId, "Something went wrong. Please try again.");
  } catch (replyErr) {
    botLogger.error(
      { err: replyErr, chat_id: chatId },
      "Failed to send error reply to user",
    );
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

  botLogger.info(
    { chat_id: chatId, message_id: messageId, from_username: fromUsername },
    "Received message",
  );

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    message_id: messageId,
  };
  if (fromUsername !== undefined) {
    body["from_username"] = fromUsername;
  }

  postToOrchestrator("/message", body).catch((err: unknown) => {
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

  const callbackData = query.data ?? "";
  const messageId = query.message?.message_id ?? 0;

  botLogger.info(
    { chat_id: chatId, callback_query_id: query.id, callback_data: callbackData },
    "Received callback_query",
  );

  const body: Record<string, unknown> = {
    chat_id: chatId,
    callback_query_id: query.id,
    callback_data: callbackData,
    message_id: messageId,
  };

  postToOrchestrator("/callback", body).catch((err: unknown) => {
    botLogger.error(
      { err, chat_id: chatId, callback_query_id: query.id },
      "Failed to forward callback_query to orchestrator",
    );
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
