I'll fix the security findings in the bot's voice callback handler. Let me first read the current file to understand the context and then apply the required fixes.
Now I need to apply the security fixes as specified in the findings. Let me implement both fixes:

1. **Finding 1**: Wrap the transcription in `<untrusted>` tags before passing to orchestrator (line 756)
2. **Finding 2**: Add validation for callback data length and intent ID bounds (lines 609, 672-674)
Now let me run all the validation commands to ensure the fixes are correct and don't introduce any errors:
Perfect! All validation commands pass. Now let me create the self-assessment.md file:
## Summary

I have successfully fixed both security findings in the voice callback handler:

### Security Fixes Applied

1. **Prompt Injection Protection (Finding 1)**:
   - Wrapped the external transcription content in `<untrusted>` tags before passing to the orchestrator
   - Changed line 768: `[voice] ${intent.transcription}` → `[voice] <untrusted>${intent.transcription}</untrusted>`

2. **Input Validation (Finding 2)**:
   - Added length cap validation for callback data (256 characters maximum)
   - Added bounds checking for intent ID (1 to 2147483647)
   - Both validations include proper error logging and safe callback query responses

### Validation Results

All validation commands passed successfully:
- ✅ TypeScript compilation: No errors
- ✅ Biome formatting: Auto-fixed and clean
- ✅ Biome linting: No issues
- ✅ Tests: 210 passed, 1 skipped (all existing functionality preserved)

The security fixes ensure that:
- External user content is properly labeled before being passed to agents
- All input is validated with appropriate length caps and bounds checking
- Error handling maintains user experience while preventing security vulnerabilities

The voice callback handler now meets all security requirements while maintaining full functionality for the voice confirmation workflow.
[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
[0m→ [0mRead packages/bot/src/index.ts
[0m
[0m← [0mEdit packages/bot/src/index.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
@@ -609,8 +609,19 @@
 const callbackData = query.data ?? "";
 const messageId = query.message?.message_id ?? 0;
 const callbackQueryId = query.id;
 
+// Validate callback data length
+const MAX_CALLBACK_DATA_LENGTH = 256;
+if (callbackData.length > MAX_CALLBACK_DATA_LENGTH) {
+  botLogger.warn(
+    { chat_id: chatId, callback_data_length: callbackData.length },
+    "Callback data exceeds maximum length",
+  );
+  void answerCallbackQuerySafely(callbackQueryId, "Invalid request");
+  return;
+}
+
 botLogger.info(
   {
     chat_id: chatId,
     callback_query_id: callbackQueryId,

[0m
[0m← [0mEdit packages/bot/src/index.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
@@ -683,8 +683,19 @@
 const voiceYesMatch = callbackData.match(/^voice_yes_(\d+)$/);
 if (voiceYesMatch) {
   const intentId = parseInt(voiceYesMatch[1], 10);
 
+  // Validate intent ID bounds
+  const MAX_INTENT_ID = 2147483647; // Max 32-bit signed integer
+  if (intentId <= 0 || intentId > MAX_INTENT_ID) {
+    botLogger.warn(
+      { chat_id: chatId, intent_id: intentId },
+      "Invalid intent ID",
+    );
+    void answerCallbackQuerySafely(callbackQueryId, "Invalid request");
+    return;
+  }
+
   botLogger.info(
     { chat_id: chatId, intent_id: intentId, callback_query_id: callbackQueryId },
     "Processing voice_yes callback",
   );

[0m
[0m← [0mEdit packages/bot/src/index.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/index.ts
@@ -774,9 +774,9 @@
   return;
 }
 
 // Intent is valid, forward to orchestrator with [voice] prefix
-const prefixedTranscription = `[voice] ${intent.transcription}`;
+const prefixedTranscription = `[voice] <untrusted>${intent.transcription}</untrusted>`;
 const forwardBody = {
   chat_id: chatId,
   callback_query_id: callbackQueryId,
   callback_data: prefixedTranscription,

[0m
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/bot/src/index.ts
Checked 1 file in 38ms. Fixed 1 file.
[0m
[0m$ [0mpnpm exec biome check packages/bot/src/index.ts
Checked 1 file in 18ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/bot test
> @lifeos/bot@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot
> vitest run --config vitest.config.ts


 RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot


 Test Files  6 passed (6)
      Tests  210 passed | 1 skipped (211)
   Start at  10:42:30
   Duration  2.26s (transform 661ms, setup 0ms, import 740ms, tests 4.83s, environment 1ms)
[0m
[0m← [0mWrite pipeline/phase-2/task-7a/self-assessment.md
Wrote file successfully.
[0m
