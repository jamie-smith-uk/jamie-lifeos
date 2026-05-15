I'll implement the pending voice intent creation and reading functions to make the failing tests pass. Let me start by reading the in-scope source files and tests.
Now let me read the test file to understand what functions I need to implement:
I can see that the test file only contains tests for the `transcribe_voice_message` function, which is already implemented. Let me check if there are any other test files that might contain tests for the pending voice intent functions:
Perfect! There's a separate test file for the pending voice intents. Let me read it:
Now I need to check the shared module to understand the database pool and types:
Let me also check the shared types to see if there are any relevant types defined:
Now I need to check the shared index to see what's exported:
Perfect! Now I understand what I need to implement. Based on the tests, I need to add two functions to the voice.ts file:

1. `create_pending_voice_intent` - Creates a pending voice intent with a 5-minute TTL
2. `consume_pending_voice_intent` - Reads and deletes a pending voice intent by ID, returning null if expired

Let me implement these functions:
Now I'll add the two functions at the end of the file:
Now let me run the validation commands to ensure everything is working correctly:
Excellent! All tests are passing. Now let me create the self-assessment.md file:
Perfect! I have successfully implemented the pending voice intent creation and reading functions. Let me summarize what was accomplished:

## Summary

I implemented two new functions in `packages/orchestrator/src/tools/voice.ts`:

1. **`create_pending_voice_intent`**: 
   - Creates a new pending voice intent record in the database
   - Sets expiration to 5 minutes from creation using PostgreSQL `NOW() + INTERVAL '5 minutes'`
   - Returns the complete record with all fields
   - Uses parameterized queries for security

2. **`consume_pending_voice_intent`**:
   - Atomically reads and deletes a pending voice intent by ID using `DELETE ... RETURNING`
   - Returns null if the record doesn't exist
   - Returns null if the record is expired (expires_at <= current time)
   - Uses parameterized queries for security

## Key Implementation Details

- **Database Integration**: Used the existing `pool` from `@lifeos/shared` for database operations
- **Type Safety**: Added proper TypeScript interfaces for function parameters and return types
- **Security**: All SQL queries use parameterized queries to prevent SQL injection
- **Atomicity**: The consume function uses `DELETE ... RETURNING` for atomic read-and-delete operations
- **Expiration Logic**: TTL is set at database level during insertion, with application-level expiration checking during consumption

## Validation Results

- ✅ TypeScript compilation: No errors
- ✅ Biome linting: No issues
- ✅ All tests passing: 794/794 tests passed including the new pending voice intent tests

The implementation follows all the established patterns in the codebase and meets all acceptance criteria specified in the task.
[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
[0m→ [0mRead packages/orchestrator/src/tools/voice.ts
[0m→ [0mRead packages/orchestrator/src/tools/__tests__/voice.test.ts
[0m✱ [0mGlob "packages/orchestrator/src/tools/__tests__/*.test.ts"[90m 9 matches[0m
[0m→ [0mRead packages/orchestrator/src/tools/__tests__/voice-pending-intents.test.ts
[0m→ [0mRead packages/shared/src/db.ts
[0m→ [0mRead packages/shared/src/types.ts
[0m→ [0mRead packages/shared/src/index.ts
[0m
[0m← [0mEdit packages/orchestrator/src/tools/voice.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
@@ -4,9 +4,9 @@
  * Implements transcribe_voice_message function that downloads Telegram voice
  * files and sends them to OpenAI Whisper API for transcription.
  */
 
-import { env, logger } from "@lifeos/shared";
+import { env, logger, pool } from "@lifeos/shared";
 
 interface TranscribeVoiceMessageParams {
   file_id: string;
 }

[0m
[0m← [0mEdit packages/orchestrator/src/tools/voice.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
@@ -10,8 +10,27 @@
 interface TranscribeVoiceMessageParams {
   file_id: string;
 }
 
+interface CreatePendingVoiceIntentParams {
+  chat_id: number;
+  transcription: string;
+  telegram_file_id: string;
+}
+
+interface ConsumePendingVoiceIntentParams {
+  id: number;
+}
+
+interface PendingVoiceIntent {
+  id: number;
+  chat_id: number;
+  transcription: string;
+  telegram_file_id: string;
+  expires_at: Date;
+  created_at: Date;
+}
+
 interface TelegramGetFileResponse {
   ok: boolean;
   result?: {
     file_path: string;

[0m
[0m← [0mEdit packages/orchestrator/src/tools/voice.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/voice.ts
@@ -196,4 +196,53 @@
     voiceLogger.error({ error: errorMessage }, "Voice transcription failed");
     return `error: ${errorMessage}`;
   }
 }
+
+/**
+ * Creates a pending voice intent in the database with a 5-minute TTL
+ */
+export async function create_pending_voice_intent(
+  params: CreatePendingVoiceIntentParams,
+): Promise<PendingVoiceIntent> {
+  const sql = `
+    INSERT INTO pending_voice_intents (chat_id, transcription, telegram_file_id, expires_at)
+    VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
+    RETURNING id, chat_id, transcription, telegram_file_id, expires_at, created_at
+  `;
+
+  const result = await pool.query(sql, [
+    params.chat_id,
+    params.transcription,
+    params.telegram_file_id,
+  ]);
+
+  return result.rows[0] as PendingVoiceIntent;
+}
+
+/**
+ * Reads and deletes a pending voice intent by ID, returning null if expired
+ */
+export async function consume_pending_voice_intent(
+  params: ConsumePendingVoiceIntentParams,
+): Promise<PendingVoiceIntent | null> {
+  const sql = `
+    DELETE FROM pending_voice_intents
+    WHERE id = $1
+    RETURNING id, chat_id, transcription, telegram_file_id, expires_at, created_at
+  `;
+
+  const result = await pool.query(sql, [params.id]);
+
+  if (result.rows.length === 0) {
+    return null;
+  }
+
+  const intent = result.rows[0] as PendingVoiceIntent;
+
+  // Check if the intent is expired (expires_at is in the past)
+  if (intent.expires_at <= new Date()) {
+    return null;
+  }
+
+  return intent;
+}

[0m
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/orchestrator/src/tools/voice.ts
Checked 1 file in 13ms. No fixes applied.
[0m
[0m$ [0mpnpm exec biome check packages/orchestrator/src/tools/voice.ts
Checked 1 file in 7ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  Test Files  31 passed (31)
packages/orchestrator test:       Tests  794 passed (794)
packages/orchestrator test:    Start at  10:02:01
packages/orchestrator test:    Duration  8.11s (transform 2.12s, setup 0ms, import 2.66s, tests 14.80s, environment 5ms)
packages/orchestrator test: Done
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-5/task-4a
(no output)
[0m
[0m← [0mWrite pipeline/phase-5/task-4a/self-assessment.md
Wrote file successfully.
[0m
