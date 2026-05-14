/**
 * Shared Telegram bot instance for outbound messaging.
 * Configured with polling: false since it's only used to send messages,
 * not to receive updates.
 */
import TelegramBot from "node-telegram-bot-api";
export declare const telegramBot: TelegramBot;
//# sourceMappingURL=bot.d.ts.map