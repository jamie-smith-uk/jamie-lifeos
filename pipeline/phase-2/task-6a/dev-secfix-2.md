[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
I'll fix the regex injection vulnerability in the Gmail tool by replacing the unsafe regex pattern with a safer LIKE-based approach. Let me start by reading the current file to understand the issue.
[0m→ [0mRead packages/orchestrator/src/tools/gmail.ts
Now I can see the security issue. The `findPersonByEmail` function at lines 261 and 267 is using a regex pattern constructed from user input without proper escaping. The pattern is built by joining search terms with `|` and then used directly in a PostgreSQL regex query with the `~` operator.

Let me fix this by replacing the unsafe regex approach with a safer LIKE-based approach as recommended in the security findings:
[0m
[0m← [0mEdit packages/orchestrator/src/tools/gmail.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/gmail.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/gmail.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/gmail.ts
@@ -257,18 +257,17 @@
 
 if (searchTerms.length === 0) return null;
 
 // Query for people whose names might match the email address
-const regexPattern = searchTerms.join("|");
+// Use LIKE patterns for safe matching instead of regex to prevent injection
 const likePatterns = searchTerms.map((term) => `%${term}%`);
 
 const result = await pool.query(
   `SELECT name, relationship_type 
    FROM people 
-   WHERE LOWER(name) ~ $1 
-   OR LOWER(name) LIKE ANY($2::text[])
+   WHERE LOWER(name) LIKE ANY($1::text[])
    LIMIT 1`,
-  [regexPattern, likePatterns],
+  [likePatterns],
 );
 
 if (result.rows.length > 0) {
   return {

[0m
Now let me run all the validation commands to ensure the fix is correct and doesn't break anything:
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/orchestrator/src/tools/gmail.ts
Checked 1 file in 46ms. No fixes applied.
[0m
[0m$ [0mpnpm exec biome check packages/orchestrator/src/tools/gmail.ts
Checked 1 file in 23ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test
> @lifeos/orchestrator@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
> vitest run --config vitest.config.ts


 RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator


 Test Files  15 passed (15)
      Tests  406 passed (406)
   Start at  13:20:53
   Duration  5.59s (transform 1.30s, setup 0ms, import 1.54s, tests 10.11s, environment 2ms)
[0m
Perfect! All validation commands pass. Now let me create the self-assessment.md file:
[0m← [0mWrite pipeline/phase-2/task-6a/self-assessment.md
Wrote file successfully.
[0m
## Summary

I have successfully fixed the regex injection vulnerability in the Gmail tool. Here's what was accomplished:

### Security Fix Applied
- **Removed unsafe regex pattern construction** from the `findPersonByEmail` function
- **Eliminated the PostgreSQL regex query** (`LOWER(name) ~ $1`) that was vulnerable to injection
- **Kept only the safe LIKE pattern matching** (`LOWER(name) LIKE ANY($1::text[])`) approach
- **Maintained all existing functionality** while eliminating the security risk

### Validation Results
All validation commands passed successfully:
- ✅ TypeScript compilation: No errors
- ✅ Biome formatting: No issues  
- ✅ Biome linting: No violations
- ✅ Tests: All 406 tests passing

### Key Changes
The fix was surgical and minimal - I only removed the vulnerable regex pattern construction and query clause while preserving the safe LIKE-based matching. This ensures:

1. **Security**: No more regex injection vulnerability
2. **Functionality**: Email-to-person matching still works correctly
3. **Performance**: Minimal impact since LIKE patterns are efficient
4. **Compatibility**: All existing tests continue to pass

The self-assessment documents the fix details, validation results, and provides guidance for future agents working with email matching and database security patterns.
