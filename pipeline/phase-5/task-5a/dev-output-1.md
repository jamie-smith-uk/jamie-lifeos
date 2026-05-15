I'll implement the voice confirmation keyboard builder function. Let me start by reading the in-scope source files and tests to understand what needs to be implemented.
Now let me read the test file to understand the exact requirements for the `buildVoiceConfirmationKeyboard` function:
Perfect! Now I understand exactly what needs to be implemented. The tests show that I need to create a `buildVoiceConfirmationKeyboard` function that:

1. Takes an intent ID parameter (number)
2. Returns an InlineKeyboardMarkup with exactly one row containing two buttons
3. First button: text "Yes, do it", callback_data "voice_yes_{id}"
4. Second button: text "No, cancel", callback_data "voice_no_{id}"

Let me implement this function in the keyboard.ts file:
Now let me run the validation commands to ensure everything is working correctly:
Excellent! All tests are passing. Now let me create the self-assessment.md file:
Perfect! I have successfully implemented the `buildVoiceConfirmationKeyboard` function that meets all the acceptance criteria:

## Summary

I implemented the `buildVoiceConfirmationKeyboard` function in `packages/bot/src/keyboard.ts` that:

1. **Creates an inline keyboard** with the proper InlineKeyboardMarkup structure
2. **Contains a "Yes, do it" button** with callback_data following the pattern `voice_yes_{id}`
3. **Contains a "No, cancel" button** with callback_data following the pattern `voice_no_{id}`
4. **Accepts an intent ID parameter** and properly embeds it in both callback data values

The implementation follows the existing code patterns in the file, includes proper JSDoc documentation, and passes all validation steps:

- ✅ TypeScript compilation with no errors
- ✅ Biome formatting and linting with no issues
- ✅ All 156 tests passing (1 skipped test unrelated to this task)

The function is now ready to be used by the bot service to generate confirmation keyboards for voice message intents, allowing users to confirm or cancel voice-transcribed actions through inline buttons.
[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
[0m→ [0mRead packages/bot/src/keyboard.ts
[0m✱ [0mGlob "packages/bot/**/*.test.ts"[90m 4 matches[0m
[0m→ [0mRead packages/bot/src/__tests__/keyboard.test.ts
[0m
[0m← [0mEdit packages/bot/src/keyboard.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/keyboard.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/keyboard.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/keyboard.ts
@@ -44,4 +44,26 @@
   return {
     inline_keyboard: [[{ text: "Dismiss", callback_data: `dismiss:${nudgeId}` }]],
   };
 }
+
+/**
+ * Returns a two-button inline keyboard for confirming or cancelling
+ * a voice message intent.
+ *
+ * Button layout (single row):
+ *   [Yes, do it]  [No, cancel]
+ *
+ * callback_data values: 'voice_yes_{id}', 'voice_no_{id}'
+ *
+ * @param intentId - The numeric ID of the voice intent to confirm or cancel.
+ */
+export function buildVoiceConfirmationKeyboard(intentId: number): InlineKeyboardMarkup {
+  return {
+    inline_keyboard: [
+      [
+        { text: "Yes, do it", callback_data: `voice_yes_${intentId}` },
+        { text: "No, cancel", callback_data: `voice_no_${intentId}` },
+      ],
+    ],
+  };
+}

[0m
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/bot/src/keyboard.ts
Checked 1 file in 5ms. No fixes applied.
[0m
[0m$ [0mpnpm exec biome check packages/bot/src/keyboard.ts
Checked 1 file in 4ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/bot test
> @lifeos/bot@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot
> vitest run --config vitest.config.ts


 RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot


 Test Files  4 passed (4)
      Tests  156 passed | 1 skipped (157)
   Start at  10:08:00
   Duration  1.74s (transform 347ms, setup 0ms, import 482ms, tests 3.39s, environment 1ms)
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-5/task-5a
(no output)
[0m
[0m← [0mWrite pipeline/phase-5/task-5a/self-assessment.md
Wrote file successfully.
[0m
