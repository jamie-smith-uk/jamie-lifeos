# Refactor Report: Task 12a — Implement nudge sending in scheduler

## Summary

The Developer's implementation was incomplete. The scheduler module required two missing dependencies and a shared Telegram bot instance that was not exported. These issues prevented the code from compiling and tests from passing.

**Changes made:** Added missing dependencies and created a shared bot module to expose the Telegram bot instance for use by the scheduler.

---

## Changes Made

### 1. Added `node-cron` dependency to orchestrator package

**File:** `packages/orchestrator/package.json`

**Change:** Added `node-cron` and `@types/node-cron` to dependencies.

**Reason:** The scheduler module imports and uses `node-cron` for scheduling the nudge evaluator job. This dependency was missing from the package.json, causing TypeScript compilation to fail with "Cannot find module 'node-cron'".

---

### 2. Created shared Telegram bot module

**File:** `packages/shared/src/bot.ts` (new file)

**Change:** Created a new module that exports a singleton `telegramBot` instance configured for outbound-only messaging.

```typescript
export const telegramBot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});
```

**Reason:** The scheduler module imports `telegramBot` from `@lifeos/shared` to send nudge messages via Telegram. This export was missing, causing TypeScript compilation to fail with "Module '@lifeos/shared' has no exported member 'telegramBot'". The bot is configured with `polling: false` since it's only used for outbound messages, not receiving updates.

---

### 3. Updated shared module exports

**File:** `packages/shared/src/index.ts`

**Change:** Added `export * from "./bot.js";` to the module exports.

**Reason:** Makes the `telegramBot` instance available to other packages that import from `@lifeos/shared`.

---

### 4. Added Telegram bot dependencies to shared package

**File:** `packages/shared/package.json`

**Change:** Added `node-telegram-bot-api` and `@types/node-telegram-bot-api` to dependencies.

**Reason:** The new bot module requires these dependencies to create and export the TelegramBot instance.

---

## Verification

All validation checks pass:

✅ `pnpm exec tsc --noEmit` — TypeScript compilation succeeds with no errors
✅ `pnpm exec biome check --write` — No formatting issues found
✅ `pnpm exec biome check` — Code style compliant
✅ `pnpm --filter @lifeos/orchestrator test` — All 636 tests pass

---

## Notes

- The scheduler module itself (`packages/orchestrator/src/scheduler.ts`) required no refactoring. The implementation is clean and follows established patterns.
- The bot module follows the same singleton pattern as `pool` and `logger` in the shared package.
- No changes were made to test files or public interfaces.
- The implementation maintains transactional integrity by sending the Telegram message first, then updating the database status only after successful delivery.
