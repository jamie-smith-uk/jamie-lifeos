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

import { env, logger } from "@lifeos/shared";
import TelegramBot from "node-telegram-bot-api";
import { buildConfirmKeyboard } from "./keyboard.js";
import { isAllowedChat } from "./middleware.js";

// ---------------------------------------------------------------------------
// Initialise bot
// ---------------------------------------------------------------------------

const botLogger = logger.child({ service: "bot" });

const isPolling = env.BOT_MODE === "polling";
const port = parseInt(env.PORT, 10);

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
  polling: isPolling ? { autoStart: true, params: { timeout: 10 } } : false,
  webHook: isPolling ? false : { host: "0.0.0.0", port },
});

if (isPolling) {
  botLogger.info({ mode: "polling" }, "Bot started in polling mode");
} else {
  botLogger.info({ port, mode: "webhook" }, "Bot listening in webhook mode");
}

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

  if (!isAllowedChat(chatId)) {
    // Silently drop — no reply sent to the unauthorised sender.
    // WARN logging is handled inside isAllowedChat.
    return;
  }

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
    body.from_username = fromUsername;
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
          .editMessageReplyMarkup(chatId, messageId, {
            reply_markup: { inline_keyboard: [] },
          })
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
