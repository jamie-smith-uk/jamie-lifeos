# Refactor Report: task-7a — Implement voice_yes callback handler

## Summary

Refactored `packages/bot/src/index.ts` to eliminate duplication in callback query error handling and orchestrator reply processing. Extracted three new helper functions to reduce code repetition and improve maintainability.

## Changes Made

### 1. **Extracted `answerCallbackQuerySafely()` helper function** (lines 422–431)
   - **File**: `packages/bot/src/index.ts`
   - **Reason**: The pattern of calling `bot.answerCallbackQuery()` with error handling was repeated 8+ times across three callback handlers (dismiss nudge, voice_yes, and general callback). This helper consolidates the try-catch logic and logging.
   - **Impact**: Reduces code duplication and ensures consistent error handling for callback query responses.

### 2. **Extracted `sendOrchestratorReply()` helper function** (lines 437–450)
   - **File**: `packages/bot/src/index.ts`
   - **Reason**: The logic to extract `text` from orchestrator response and send it as a message was duplicated in the voice_yes handler and general callback handler. This helper centralizes the extraction and sending logic.
   - **Impact**: Eliminates duplication and ensures consistent handling of orchestrator replies across all callback handlers.

### 3. **Refactored voice_yes callback handler** (lines 690–788)
   - **File**: `packages/bot/src/index.ts`
   - **Changes**:
     - Extracted inline type definition `PendingVoiceIntent` interface (lines 687–695) for clarity and reusability
     - Replaced 8 instances of `bot.answerCallbackQuery(...).catch(...)` with calls to `answerCallbackQuerySafely()`
     - Replaced 2 instances of orchestrator reply handling with calls to `sendOrchestratorReply()`
     - Added `void` prefix to promise-based function calls to explicitly indicate fire-and-forget behavior
   - **Reason**: Reduces nesting depth and improves readability by using helper functions instead of inline error handling
   - **Impact**: Handler is now 40 lines shorter while maintaining identical behavior

### 4. **Refactored dismiss nudge callback handler** (lines 645–668)
   - **File**: `packages/bot/src/index.ts`
   - **Changes**:
     - Replaced 2 instances of `bot.answerCallbackQuery(...).catch(...)` with calls to `answerCallbackQuerySafely()`
     - Added `void` prefix to promise-based function calls
   - **Reason**: Consistency with voice_yes handler refactoring and elimination of duplicated error handling
   - **Impact**: Cleaner code with consistent error handling pattern

### 5. **Refactored general callback handler** (lines 800–810)
   - **File**: `packages/bot/src/index.ts`
   - **Changes**:
     - Replaced inline orchestrator reply handling with call to `sendOrchestratorReply()`
     - Replaced 2 instances of `bot.answerCallbackQuery(...).catch(...)` with calls to `answerCallbackQuerySafely()`
     - Added `void` prefix to promise-based function calls
   - **Reason**: Consistency across all callback handlers and elimination of duplicated reply handling logic
   - **Impact**: Handler is now 15 lines shorter with identical behavior

## Verification

All validation checks pass:
- ✅ TypeScript type checking: `pnpm exec tsc --noEmit` — no errors
- ✅ Biome formatting: `pnpm exec biome check --write packages/bot/src/index.ts` — 1 file fixed (formatting)
- ✅ Biome linting: `pnpm exec biome check packages/bot/src/index.ts` — no issues
- ✅ Test suite: `pnpm --filter @lifeos/bot test` — 210 passed, 1 skipped

## Behavior Preservation

All refactoring changes are conservative and preserve existing behavior:
- No changes to public interfaces or function signatures
- No changes to test files
- No changes to database schema or queries
- No changes to logging patterns or error messages
- All acceptance criteria for task-7a remain satisfied
