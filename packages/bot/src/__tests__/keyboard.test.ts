/**
 * Tests for packages/bot/src/keyboard.ts
 *
 * T-07 Acceptance Criteria:
 *   AC-1: buildConfirmKeyboard returns valid InlineKeyboardMarkup with three buttons
 *   AC-2: buildDismissKeyboard returns InlineKeyboardMarkup with a single Dismiss button
 *   AC-3: callback_data values are exactly 'confirm', 'edit', 'cancel', 'dismiss:<nudgeId>'
 */

import { describe, it, expect } from "vitest";
import type { InlineKeyboardMarkup } from "node-telegram-bot-api";
import { buildConfirmKeyboard, buildDismissKeyboard } from "../keyboard.js";

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
    expect(result.inline_keyboard[0]![0]!.text).toBe("Confirm");
  });

  it("second button text is 'Edit'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]![1]!.text).toBe("Edit");
  });

  it("third button text is 'Cancel'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]![2]!.text).toBe("Cancel");
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
    expect(result.inline_keyboard[0]![0]!.text).toBe("Dismiss");
  });

  it("the button has a callback_data property", () => {
    const result = buildDismissKeyboard(5);
    expect(result.inline_keyboard[0]![0]).toHaveProperty("callback_data");
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
    expect(result.inline_keyboard[0]![0]!.callback_data).toBe("confirm");
  });

  it("buildConfirmKeyboard: second button callback_data is exactly 'edit'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]![1]!.callback_data).toBe("edit");
  });

  it("buildConfirmKeyboard: third button callback_data is exactly 'cancel'", () => {
    const result = buildConfirmKeyboard();
    expect(result.inline_keyboard[0]![2]!.callback_data).toBe("cancel");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=1", () => {
    const result = buildDismissKeyboard(1);
    expect(result.inline_keyboard[0]![0]!.callback_data).toBe("dismiss:1");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=42", () => {
    const result = buildDismissKeyboard(42);
    expect(result.inline_keyboard[0]![0]!.callback_data).toBe("dismiss:42");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for nudgeId=0", () => {
    const result = buildDismissKeyboard(0);
    expect(result.inline_keyboard[0]![0]!.callback_data).toBe("dismiss:0");
  });

  it("buildDismissKeyboard: callback_data is 'dismiss:<nudgeId>' for a large nudgeId", () => {
    const result = buildDismissKeyboard(999999);
    expect(result.inline_keyboard[0]![0]!.callback_data).toBe("dismiss:999999");
  });

  it("buildDismissKeyboard: different nudgeIds produce different callback_data", () => {
    const r1 = buildDismissKeyboard(1);
    const r2 = buildDismissKeyboard(2);
    expect(r1.inline_keyboard[0]![0]!.callback_data).not.toBe(
      r2.inline_keyboard[0]![0]!.callback_data,
    );
  });

  it("buildDismissKeyboard: callback_data follows 'dismiss:<nudgeId>' pattern exactly (no extra chars)", () => {
    const nudgeId = 7;
    const result = buildDismissKeyboard(nudgeId);
    const callbackData = result.inline_keyboard[0]![0]!.callback_data;
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
