/**
 * Shared Telegram bot instance for outbound messaging.
 * Configured with polling: false since it's only used to send messages,
 * not to receive updates.
 */
import TelegramBot from "node-telegram-bot-api";
import { env } from "./env.js";

export const telegramBot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});
