/**
 * bot.ts — Telegram bot singleton for outbound messaging.
 *
 * Creates a single TelegramBot instance configured for outbound-only messaging
 * (no polling or webhook). This is used by the scheduler and other services
 * to send messages to the allowed chat ID.
 */
import TelegramBot from "node-telegram-bot-api";
/**
 * Shared Telegram bot instance for outbound messaging.
 * Configured with polling: false since it's only used to send messages,
 * not to receive updates.
 */
export declare const telegramBot: TelegramBot;
//# sourceMappingURL=bot.d.ts.map