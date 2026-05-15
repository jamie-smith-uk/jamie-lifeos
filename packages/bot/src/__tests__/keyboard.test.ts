/**
 * Tests for packages/bot/src/keyboard.ts
 *
 * T-07 Acceptance Criteria:
 *   AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons
 *   AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button
 *   AC-3: callback_data values are exactly 'confirm', 'edit', 'cancel', 'dismiss:<nudgeId>'
 *
 * task-5a Acceptance Criteria:
 *   AC-1: buildVoiceConfirmationKeyboard function creates inline keyboard
 *   AC-2: Keyboard contains 'Yes, do it' button with callback_data voice_yes_{id}
 *   AC-3: Keyboard contains 'No, cancel' button with callback_data voice_no_{id}
 *   AC-4: Function accepts intent ID parameter and embeds it in callback data
 */

import type { InlineKeyboardMarkup } from "node-telegram-bot-api";
import { describe, expect, it } from "vitest";
import {
  buildConfirmKeyboard,
  buildDismissKeyboard,
  buildVoiceConfirmationKeyboard,
} from "../keyboard.js";

// ---------------------------------------------------------------------------
// AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons
// ---------------------------------------------------------------------------

describe("AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons", () => {
  it("returns an object with inline_keyboard property", () => {
    const result = buildConfirmKeyboard();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("inline_keyboard");
  });

  it("inline_keyboard is an array", () => {
    const result = buildConfirmKeyboard();
    expect(Array.isArray(result.inline_keyboard)).toBe(true);
  });

  it("has exactly one row", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard).toHaveLength(1);
  });

  it("row contains exactly three buttons", () => {
    const result = buildConfirmKeyboard();
    const row = result.inline_keyboard[0];
    expect(row).toHaveLength(3);
  });

  it("each button has text and callback_data properties", () => {
    const result = buildConfirmKeyboard();
    const row = result.inline_keyboard[0]!;
    for (const button of row) {
      expect(button).toHaveProperty("text");
      expect(button).toHaveProperty("callback_data");
    }
  });

  it("first button text is 'Confirm'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[0]?.text).toBe("Confirm");
  });

  it("second button text is 'Edit'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[1]?.text).toBe("Edit");
  });

  it("third button text is 'Cancel'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[2]?.text).toBe("Cancel");
  });

  it("returns a fresh object on each call (not a cached reference)", () => {
    const result1 = buildConfirmKeyboard();
    const result2 = buildConfirmKeyboard();
    expect(result1).not.toBe(result2);
  });

  it("conforms to InlineKeyboardMarkup shape (TypeScript structural check at runtime)", () => {
    const result: InlineKeyboardMarkup = buildConfirmKeyboard();
    // If we reach here, TypeScript was satisfied; verify runtime shape as well
    expect(result.inline_keyboard).toBeDefined();
    expect(Array.isArray(result.inline_keyboard)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button
// ---------------------------------------------------------------------------

describe("AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button", () => {
  it("returns an object with inline_keyboard property", () => {
    const result = buildDismissKeyboard(1);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("inline_keyboard");
  });

  it("inline_keyboard is an array", () => {
    const result = buildDismissKeyboard(1);
    expect(Array.isArray(result.inline_keyboard)).toBe(true);
  });

  it("has exactly one row", () => {
    const result = buildDismissKeyboard(1);
    expect(result.inline_keyboard).toHaveLength(1);
  });

  it("row contains exactly one button", () => {
    const result = buildDismissKeyboard(1);
    expect(result.inline_keyboard[0]).toHaveLength(1);
  });

  it("the single button has text 'Dismiss'", () => {
    const result = buildDismissKeyboard(42);
    expect(result.inline_keyboard[0]?.[0]?.text).toBe("Dismiss");
  });

  it("the button has a callback_data property", () => {
    const result = buildDismissKeyboard(5);
    expect(result.inline_keyboard[0]?.[0]).toHaveProperty("callback_data");
  });

  it("conforms to InlineKeyboardMarkup shape", () => {
    const result: InlineKeyboardMarkup = buildDismissKeyboard(99);
    expect(result.inline_keyboard).toBeDefined();
  });

  it("returns a fresh object for each call with the same nudgeId", () => {
    const r1 = buildDismissKeyboard(10);
    const r2 = buildDismissKeyboard(10);
    expect(r1).not.toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// AC-3: callback_data values are exactly 'confirm', 'edit', 'cancel', 'dismiss:<nudgeId>'
// ---------------------------------------------------------------------------

describe("AC-3: callback_data values match exact specification", () => {
  // buildConfirmKeyboard callback_data values
  it("buildConfirmKeyboard: first button callback_data is exactly 'confirm'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("confirm");
  });

  it("buildConfirmKeyboard: second button callback_data is exactly 'edit'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("edit");
  });

  it("buildConfirmKeyboard: third button callback_data is exactly 'cancel'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]?.[2]?.callback_data).toBe("cancel");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=1", () => {
    const result = buildDismissKeyboard(1);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("dismiss:1");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=42", () => {
    const result = buildDismissKeyboard(42);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("dismiss:42");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=0", () => {
    const result = buildDismissKeyboard(0);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("dismiss:0");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for a large nudgeId", () => {
    const result = buildDismissKeyboard(999999);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("dismiss:999999");
  });

  it("buildDismissKeyboard: different nudgeIds produce different callback_data", () => {
    const r1 = buildDismissKeyboard(1);
    const r2 = buildDismissKeyboard(2);
    expect(r1.inline_keyboard[0]?.[0]?.callback_data).not.toBe(
      r2.inline_keyboard[0]?.[0]?.callback_data,
    );
  });

  it("buildDismissKeyboard: callback_data follows 'dismiss:<nudgeId>' pattern exactly (no extra chars)", () => {
    const nudgeId = 7;
    const result = buildDismissKeyboard(nudgeId);
    const callbackData = result.inline_keyboard[0]?.[0]?.callback_data;
    expect(callbackData).toMatch(/^dismiss:\d+$/);
    expect(callbackData).toBe(`dismiss:${nudgeId}`);
  });

  it("buildConfirmKeyboard: no button has an unexpected callback_data value", () => {
    const result = buildConfirmKeyboard();
    const row = result.inline_keyboard[0]!;
    const callbackValues = row.map((b) => b.callback_data);
    expect(callbackValues).toEqual(["confirm", "edit", "cancel"]);
  });
});

// ---------------------------------------------------------------------------
// task-5a AC-1: buildVoiceConfirmationKeyboard function creates inline keyboard
// ---------------------------------------------------------------------------

describe("task-5a AC-1: buildVoiceConfirmationKeyboard function creates inline keyboard", () => {
  it("returns an object with inline_keyboard property", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("inline_keyboard");
  });

  it("inline_keyboard is an array", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(Array.isArray(result.inline_keyboard)).toBe(true);
  });

  it("has exactly one row", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard).toHaveLength(1);
  });

  it("row contains exactly two buttons", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    const row = result.inline_keyboard[0];
    expect(row).toHaveLength(2);
  });

  it("each button has text and callback_data properties", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    const row = result.inline_keyboard[0]!;
    for (const button of row) {
      expect(button).toHaveProperty("text");
      expect(button).toHaveProperty("callback_data");
    }
  });

  it("conforms to InlineKeyboardMarkup shape (TypeScript structural check at runtime)", () => {
    const result: InlineKeyboardMarkup = buildVoiceConfirmationKeyboard(1);
    // If we reach here, TypeScript was satisfied; verify runtime shape as well
    expect(result.inline_keyboard).toBeDefined();
    expect(Array.isArray(result.inline_keyboard)).toBe(true);
  });

  it("returns a fresh object on each call (not a cached reference)", () => {
    const result1 = buildVoiceConfirmationKeyboard(1);
    const result2 = buildVoiceConfirmationKeyboard(1);
    expect(result1).not.toBe(result2);
  });
});

// ---------------------------------------------------------------------------
// task-5a AC-2: Keyboard contains 'Yes, do it' button with callback_data voice_yes_{id}
// ---------------------------------------------------------------------------

describe("task-5a AC-2: Keyboard contains 'Yes, do it' button with callback_data voice_yes_{id}", () => {
  it("first button text is 'Yes, do it'", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard[0]?.[0]?.text).toBe("Yes, do it");
  });

  it("first button callback_data is 'voice_yes_1' for intent ID 1", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_1");
  });

  it("first button callback_data is 'voice_yes_42' for intent ID 42", () => {
    const result = buildVoiceConfirmationKeyboard(42);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_42");
  });

  it("first button callback_data is 'voice_yes_0' for intent ID 0", () => {
    const result = buildVoiceConfirmationKeyboard(0);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_0");
  });

  it("first button callback_data is 'voice_yes_999999' for large intent ID", () => {
    const result = buildVoiceConfirmationKeyboard(999999);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_999999");
  });

  it("first button callback_data follows 'voice_yes_<id>' pattern exactly", () => {
    const intentId = 7;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const callbackData = result.inline_keyboard[0]?.[0]?.callback_data;
    expect(callbackData).toMatch(/^voice_yes_\d+$/);
    expect(callbackData).toBe(`voice_yes_${intentId}`);
  });
});

// ---------------------------------------------------------------------------
// task-5a AC-3: Keyboard contains 'No, cancel' button with callback_data voice_no_{id}
// ---------------------------------------------------------------------------

describe("task-5a AC-3: Keyboard contains 'No, cancel' button with callback_data voice_no_{id}", () => {
  it("second button text is 'No, cancel'", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard[0]?.[1]?.text).toBe("No, cancel");
  });

  it("second button callback_data is 'voice_no_1' for intent ID 1", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_1");
  });

  it("second button callback_data is 'voice_no_42' for intent ID 42", () => {
    const result = buildVoiceConfirmationKeyboard(42);
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_42");
  });

  it("second button callback_data is 'voice_no_0' for intent ID 0", () => {
    const result = buildVoiceConfirmationKeyboard(0);
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_0");
  });

  it("second button callback_data is 'voice_no_999999' for large intent ID", () => {
    const result = buildVoiceConfirmationKeyboard(999999);
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_999999");
  });

  it("second button callback_data follows 'voice_no_<id>' pattern exactly", () => {
    const intentId = 7;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const callbackData = result.inline_keyboard[0]?.[1]?.callback_data;
    expect(callbackData).toMatch(/^voice_no_\d+$/);
    expect(callbackData).toBe(`voice_no_${intentId}`);
  });
});

// ---------------------------------------------------------------------------
// task-5a AC-4: Function accepts intent ID parameter and embeds it in callback data
// ---------------------------------------------------------------------------

describe("task-5a AC-4: Function accepts intent ID parameter and embeds it in callback data", () => {
  it("accepts an intent ID parameter", () => {
    expect(() => buildVoiceConfirmationKeyboard(1)).not.toThrow();
  });

  it("embeds intent ID in both callback_data values", () => {
    const intentId = 123;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const yesCallback = result.inline_keyboard[0]?.[0]?.callback_data;
    const noCallback = result.inline_keyboard[0]?.[1]?.callback_data;
    expect(yesCallback).toContain("123");
    expect(noCallback).toContain("123");
  });

  it("different intent IDs produce different callback_data", () => {
    const r1 = buildVoiceConfirmationKeyboard(1);
    const r2 = buildVoiceConfirmationKeyboard(2);
    expect(r1.inline_keyboard[0]?.[0]?.callback_data).not.toBe(
      r2.inline_keyboard[0]?.[0]?.callback_data,
    );
    expect(r1.inline_keyboard[0]?.[1]?.callback_data).not.toBe(
      r2.inline_keyboard[0]?.[1]?.callback_data,
    );
  });

  it("same intent ID produces consistent callback_data across calls", () => {
    const intentId = 50;
    const r1 = buildVoiceConfirmationKeyboard(intentId);
    const r2 = buildVoiceConfirmationKeyboard(intentId);
    expect(r1.inline_keyboard[0]?.[0]?.callback_data).toBe(
      r2.inline_keyboard[0]?.[0]?.callback_data,
    );
    expect(r1.inline_keyboard[0]?.[1]?.callback_data).toBe(
      r2.inline_keyboard[0]?.[1]?.callback_data,
    );
  });

  it("callback_data values contain the exact intent ID without modification", () => {
    const intentId = 12345;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const yesCallback = result.inline_keyboard[0]?.[0]?.callback_data;
    const noCallback = result.inline_keyboard[0]?.[1]?.callback_data;
    expect(yesCallback).toBe(`voice_yes_${intentId}`);
    expect(noCallback).toBe(`voice_no_${intentId}`);
  });

  it("no button has an unexpected callback_data value", () => {
    const intentId = 99;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const row = result.inline_keyboard[0]!;
    const callbackValues = row.map((b) => b.callback_data);
    expect(callbackValues).toEqual([`voice_yes_${intentId}`, `voice_no_${intentId}`]);
  });
});

// ---------------------------------------------------------------------------
// task-5b: Edge cases for ID formatting
// ---------------------------------------------------------------------------

describe("task-5b: Edge cases for ID formatting", () => {
  it("handles intent ID of 1 (minimum positive ID)", () => {
    const result = buildVoiceConfirmationKeyboard(1);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_1");
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_1");
  });

  it("handles intent ID of 0 (zero)", () => {
    const result = buildVoiceConfirmationKeyboard(0);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe("voice_yes_0");
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe("voice_no_0");
  });

  it("handles very large intent IDs (9007199254740991 - JavaScript MAX_SAFE_INTEGER)", () => {
    const largeId = 9007199254740991;
    const result = buildVoiceConfirmationKeyboard(largeId);
    expect(result.inline_keyboard[0]?.[0]?.callback_data).toBe(`voice_yes_${largeId}`);
    expect(result.inline_keyboard[0]?.[1]?.callback_data).toBe(`voice_no_${largeId}`);
  });

  it("callback_data does not contain spaces or special characters", () => {
    const intentId = 42;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const yesCallback = result.inline_keyboard[0]?.[0]?.callback_data;
    const noCallback = result.inline_keyboard[0]?.[1]?.callback_data;
    expect(yesCallback).not.toMatch(/\s/);
    expect(noCallback).not.toMatch(/\s/);
    expect(yesCallback).toMatch(/^[a-z_0-9]+$/);
    expect(noCallback).toMatch(/^[a-z_0-9]+$/);
  });

  it("callback_data format is consistent across multiple calls with same ID", () => {
    const intentId = 555;
    const results = [
      buildVoiceConfirmationKeyboard(intentId),
      buildVoiceConfirmationKeyboard(intentId),
      buildVoiceConfirmationKeyboard(intentId),
    ];
    const yesCallbacks = results.map((r) => r.inline_keyboard[0]?.[0]?.callback_data);
    const noCallbacks = results.map((r) => r.inline_keyboard[0]?.[1]?.callback_data);
    expect(yesCallbacks[0]).toBe(yesCallbacks[1]);
    expect(yesCallbacks[1]).toBe(yesCallbacks[2]);
    expect(noCallbacks[0]).toBe(noCallbacks[1]);
    expect(noCallbacks[1]).toBe(noCallbacks[2]);
  });

  it("callback_data is unique for sequential intent IDs", () => {
    const ids = [1, 2, 3, 4, 5];
    const yesCallbacks = ids.map(
      (id) => buildVoiceConfirmationKeyboard(id).inline_keyboard[0]?.[0]?.callback_data,
    );
    const noCallbacks = ids.map(
      (id) => buildVoiceConfirmationKeyboard(id).inline_keyboard[0]?.[1]?.callback_data,
    );
    const uniqueYesCallbacks = new Set(yesCallbacks);
    const uniqueNoCallbacks = new Set(noCallbacks);
    expect(uniqueYesCallbacks.size).toBe(ids.length);
    expect(uniqueNoCallbacks.size).toBe(ids.length);
  });

  it("callback_data length is reasonable for all tested IDs", () => {
    const testIds = [0, 1, 42, 999, 999999, 9007199254740991];
    for (const id of testIds) {
      const result = buildVoiceConfirmationKeyboard(id);
      const yesCallback = result.inline_keyboard[0]?.[0]?.callback_data;
      const noCallback = result.inline_keyboard[0]?.[1]?.callback_data;
      expect(yesCallback).toBeDefined();
      expect(noCallback).toBeDefined();
      expect(typeof yesCallback).toBe("string");
      expect(typeof noCallback).toBe("string");
      expect(yesCallback!.length).toBeGreaterThan(0);
      expect(noCallback!.length).toBeGreaterThan(0);
    }
  });

  it("callback_data uses underscore as separator, not other characters", () => {
    const intentId = 123;
    const result = buildVoiceConfirmationKeyboard(intentId);
    const yesCallback = result.inline_keyboard[0]?.[0]?.callback_data;
    const noCallback = result.inline_keyboard[0]?.[1]?.callback_data;
    expect(yesCallback).toMatch(/^voice_yes_\d+$/);
    expect(noCallback).toMatch(/^voice_no_\d+$/);
    expect(yesCallback).not.toMatch(/-/);
    expect(yesCallback).not.toMatch(/\./);
    expect(noCallback).not.toMatch(/-/);
    expect(noCallback).not.toMatch(/\./);
  });

  it("keyboard structure is valid for all tested intent IDs", () => {
    const testIds = [0, 1, 42, 999999];
    for (const id of testIds) {
      const result = buildVoiceConfirmationKeyboard(id);
      expect(result.inline_keyboard).toHaveLength(1);
      expect(result.inline_keyboard[0]).toHaveLength(2);
      expect(result.inline_keyboard[0]?.[0]).toHaveProperty("text");
      expect(result.inline_keyboard[0]?.[0]).toHaveProperty("callback_data");
      expect(result.inline_keyboard[0]?.[1]).toHaveProperty("text");
      expect(result.inline_keyboard[0]?.[1]).toHaveProperty("callback_data");
    }
  });
});
