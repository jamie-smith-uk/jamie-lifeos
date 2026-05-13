# Refactor Report — task-9a

## Summary
**Changes made** to improve code maintainability and reduce duplication.

## Files Modified
- `packages/orchestrator/src/tools/people.ts`

## Changes Made

### 1. Eliminated duplicate fuzzy name matching query in `getPerson` function
**Location:** Lines 253-262 (before refactoring)

**What was changed:**
- Replaced inline fuzzy name matching query with call to existing `findPersonByNameForUpdate()` helper function
- Removed duplicate SQL query that was identical to the one in `findPersonByNameForUpdate()`

**Why:**
- The `getPerson` function was duplicating the exact fuzzy name matching logic that already existed in `findPersonByNameForUpdate()` (lines 144-153)
- This violates DRY (Don't Repeat Yourself) principle and creates maintenance burden
- If fuzzy matching logic needs to change, it now only needs to be updated in one place
- The helper function is already used by `updatePerson()` and `logInteraction()`, so reusing it maintains consistency

**Before:**
```typescript
const fuzzyName = buildFuzzyNameQuery(name);
const result = await pool.query(
  `SELECT id, name, relationship_type, how_known, notes, last_interaction_at
   FROM people
   WHERE name ILIKE $1
   ORDER BY 
     CASE WHEN LOWER(name) = LOWER($2) THEN 1 ELSE 2 END,
     name
   LIMIT 1`,
  [fuzzyName, name.trim()],
);

if (result.rows.length === 0) {
  return JSON.stringify({
    success: false,
    message: `No person found matching "${name}"`,
  });
}

const personRow = result.rows[0];
```

**After:**
```typescript
const personRow = await findPersonByNameForUpdate(name);
if (!personRow) {
  return JSON.stringify({
    success: false,
    message: `No person found matching "${name}"`,
  });
}
```

### 2. Simplified life events mapping in `getPerson` function
**Location:** Line 274 (before refactoring: line 286)

**What was changed:**
- Removed unnecessary arrow function wrapper in `.map()` call
- Changed from `lifeEventsResult.rows.map((row) => { return rowToLifeEventInfo(row); })` to `lifeEventsResult.rows.map(rowToLifeEventInfo)`

**Why:**
- The arrow function was unnecessary indirection that added no value
- Passing the function reference directly is more concise and idiomatic JavaScript
- Improves readability without changing behavior

**Before:**
```typescript
const lifeEvents: LifeEventInfo[] = lifeEventsResult.rows.map((row) => {
  return rowToLifeEventInfo(row);
});
```

**After:**
```typescript
const lifeEvents: LifeEventInfo[] = lifeEventsResult.rows.map(rowToLifeEventInfo);
```

## Verification
All validation checks passed:
- ✅ TypeScript compilation: No errors
- ✅ Biome linter: No issues
- ✅ All 578 tests pass (22 test files)

## Impact Assessment
- **Behavior:** No change — all tests pass without modification
- **Public interfaces:** No change — function signatures remain identical
- **Database queries:** No change — same queries executed, just reused from helper
- **Performance:** Slight improvement — one less function call overhead in `getPerson`
- **Maintainability:** Improved — reduced code duplication, single source of truth for fuzzy matching logic
