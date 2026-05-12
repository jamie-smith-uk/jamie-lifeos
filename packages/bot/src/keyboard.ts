/**
 * packages/bot/src/keyboard.ts
 *
 * Inline keyboard builder utilities.
 *
 * Provides factory functions that return InlineKeyboardMarkup objects
 * suitable for use with node-telegram-bot-api sendMessage / editMessageReplyMarkup.
 */

import type { InlineKeyboardMarkup } from "node-telegram-bot-api";

/**
 * Returns a three-button inline keyboard for confirming, editing, or cancelling
 * a pending action.
 *
 * Button layout (single row):
 *   [Confirm]  [Edit]  [Cancel]
 *
 * callback_data values: 'confirm', 'edit', 'cancel'
 */
export function buildConfirmKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Confirm", callback_data: "confirm" },
        { text: "Edit", callback_data: "edit" },
        { text: "Cancel", callback_data: "cancel" },
      ],
    ],
  };
}

/**
 * Returns a single-button inline keyboard for dismissing a nudge.
 *
 * Button layout (single row):
 *   [Dismiss]
 *
 * callback_data value: 'dismiss:<nudgeId>'
 *
 * @param nudgeId - The numeric ID of the nudge to dismiss.
 */
export function buildDismissKeyboard(nudgeId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "Dismiss", callback_data: `dismiss:${nudgeId}` }]],
  };
}
