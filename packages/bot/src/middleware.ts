/**
 * packages/bot/src/middleware.ts
 *
 * Chat-ID whitelist middleware.
 *
 * Exposes isAllowedChat(chatId) which returns true only when the provided
 * chat_id matches the single allowed chat configured via
 * TELEGRAM_ALLOWED_CHAT_ID.  Callers are responsible for silently dropping
 * and logging any message that fails this check — no reply must be sent to
 * unauthorised senders.
 */

import { env, logger } from "@lifeos/shared";

const middlewareLogger = logger.child({ service: "bot:middleware" });

/**
 * Returns true if chatId matches TELEGRAM_ALLOWED_CHAT_ID, false otherwise.
 * An invalid / non-numeric env value is treated as "no chat is allowed"
 * (safe-fail) and a WARN is emitted at startup.
 */
export function isAllowedChat(chatId: number): boolean {
  const raw = env.TELEGRAM_ALLOWED_CHAT_ID.trim();
  const allowed = parseInt(raw, 10);

  if (Number.isNaN(allowed)) {
    middlewareLogger.warn(
      { TELEGRAM_ALLOWED_CHAT_ID: raw },
      "TELEGRAM_ALLOWED_CHAT_ID is not a valid integer — all chats will be denied",
    );
    return false;
  }

  if (chatId !== allowed) {
    middlewareLogger.warn(
      { chat_id: chatId, allowed_chat_id: allowed },
      "Unauthorised chat_id — message dropped",
    );
    return false;
  }

  return true;
}
