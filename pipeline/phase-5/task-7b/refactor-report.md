# Refactor Report: task-7b

## Summary

Refactored `packages/bot/src/index.ts` to eliminate code duplication between the `voice_yes` and `voice_no` callback handlers. Extracted common logic into reusable helper functions while preserving all existing behavior and test coverage.

## Changes Made

### File: `packages/bot/src/index.ts`

#### 1. Extracted `PendingVoiceIntent` interface (lines 593-600)
- **Reason**: The interface was defined twice (once in each handler). Moved to module level for reuse.
- **Impact**: Eliminates duplicate type definition, improves maintainability.

#### 2. Created `handleExpiredVoiceIntent()` helper function (lines 658-689)
- **Reason**: Both `voice_yes` and `voice_no` handlers had identical expiration handling logic (~30 lines each).
- **What it does**: Handles the case when a voice intent has expired—deletes the intent from the database and sends an expiry message to the user.
- **Impact**: Reduces duplication by ~60 lines of code. Both handlers now call this single function instead of duplicating the logic.

#### 3. Created `handleVoiceNoIntent()` helper function (lines 695-716)
- **Reason**: The `voice_no` handler's valid intent processing was unique and worth extracting for clarity.
- **What it does**: Deletes a valid (non-expired) voice intent and sends a cancellation message to the user.
- **Impact**: Makes the `voice_no` handler more readable and separates concerns. The handler now clearly shows: parse ID → validate → load intent → check expiration → handle accordingly.

#### 4. Simplified `voice_yes` callback handler (lines 813-868)
- **Reason**: Replaced inline expiration handling with call to `handleExpiredVoiceIntent()`.
- **Changes**:
  - Removed ~50 lines of inline expiration logic
  - Replaced with single function call: `handleExpiredVoiceIntent(chatId, intentId, callbackQueryId)`
  - Removed duplicate `PendingVoiceIntent` interface definition
- **Impact**: Handler is now 50 lines shorter and more readable. Logic flow is clearer: load intent → check expiration → handle accordingly.

#### 5. Simplified `voice_no` callback handler (lines 870-925)
- **Reason**: Replaced inline expiration and cancellation handling with calls to helper functions.
- **Changes**:
  - Removed ~100 lines of inline logic
  - Replaced with two function calls: `handleExpiredVoiceIntent()` and `handleVoiceNoIntent()`
  - Removed duplicate `PendingVoiceIntent` interface definition
- **Impact**: Handler is now 100 lines shorter. The main handler focuses on parsing and validation; specific behaviors are delegated to helpers.

## Code Quality Improvements

- **Reduced duplication**: ~160 lines of duplicated code eliminated
- **Improved readability**: Both handlers now follow a clear pattern: parse → validate → load → check expiration → delegate to behavior-specific handler
- **Better maintainability**: Changes to expiration handling or cancellation logic only need to be made in one place
- **Preserved behavior**: All tests pass; no functional changes to the implementation

## Verification

All validation checks passed:
- ✅ TypeScript type checking (`pnpm exec tsc --noEmit`)
- ✅ Biome formatting and linting (`pnpm exec biome check --write` and `pnpm exec biome check`)
- ✅ All 242 tests pass (`pnpm --filter @lifeos/bot test`)

## Notes for Future Agents

The refactored code maintains the same public interface and behavior. The helper functions are internal to the module and not exported. If you need to modify voice intent handling in the future:

1. **Expiration logic**: Update `handleExpiredVoiceIntent()` (lines 658-689)
2. **Cancellation logic**: Update `handleVoiceNoIntent()` (lines 695-716)
3. **Confirmation logic**: Update `handleValidVoiceIntent()` (lines 606-652)

All three helpers follow the same error handling pattern: log errors, answer callback query, and send error reply to user.
