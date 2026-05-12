# Refactor Report — task-6b

## Summary

Refactored `packages/orchestrator/src/tools/gmail.ts` to eliminate code duplication in PersonInfo object creation and people deduplication logic. All tests pass.

## Changes Made

### 1. Extracted PersonInfo object creation into `rowToPersonInfo()` helper

**File:** `packages/orchestrator/src/tools/gmail.ts`

**Lines:** 214-224 (new helper function)

**Reason:** The pattern of converting a database row to a PersonInfo object was repeated 3 times:
- Line 298 (in `findPersonByEmail`)
- Line 1217 (in `findPersonByName`)
- Line 1297 (in `resolvePersonReference`)

**Change:** Created a single helper function `rowToPersonInfo()` that encapsulates this conversion logic and is now called in all three locations.

**Benefit:** Reduces duplication, improves maintainability, and makes future changes to PersonInfo creation centralized.

### 2. Extracted people deduplication logic into `addPersonIfUnique()` helper

**File:** `packages/orchestrator/src/tools/gmail.ts`

**Lines:** 229-233 (new helper function)

**Reason:** The pattern of checking if a person already exists in a list (by ID) before adding them was repeated 5 times:
- Lines 401-404 (in `getInboxSummary`)
- Lines 470-475 (in `getThread`)
- Lines 1245 (in `findMentionedPeople`)
- Lines 1375 (in `logInteraction`)

**Change:** Created a single helper function `addPersonIfUnique()` that encapsulates the deduplication check and is now called in all locations.

**Benefit:** Eliminates repeated conditional logic, improves readability, and ensures consistent deduplication behavior across the codebase.

### 3. Updated all PersonInfo creation calls to use `rowToPersonInfo()`

**File:** `packages/orchestrator/src/tools/gmail.ts`

**Lines:** 298, 1217, 1297

**Change:** Replaced inline object creation with calls to `rowToPersonInfo(result.rows[0])`.

### 4. Updated all people deduplication calls to use `addPersonIfUnique()`

**File:** `packages/orchestrator/src/tools/gmail.ts`

**Lines:** 401-404, 470-475, 1245, 1375

**Change:** Replaced inline deduplication checks with calls to `addPersonIfUnique()`.

## Verification

All validation checks passed:

```bash
✓ pnpm exec tsc --noEmit
✓ pnpm exec biome check --write packages/orchestrator/src/tools/gmail.ts
✓ pnpm exec biome check packages/orchestrator/src/tools/gmail.ts
✓ pnpm --filter @lifeos/orchestrator test (434 tests passed)
```

## No Breaking Changes

- No public interfaces modified
- No function signatures changed
- All tests continue to pass
- Behavior is identical to before refactoring
