I'll start by reading the files in scope to understand what needs to be tested.
Now let me check the tools/strava.ts to understand what functions are available for querying activities:
Let me continue reading the strava.ts file to find the activity query functions:
Let me read the get_strava_activities and get_strava_trends functions:
Now let me check the architecture.md to understand the database schema:
Let me check if context.ts exists or needs to be created:
So context.ts doesn't exist yet. Let me check the agent.ts to understand the structure:
Now let me understand the task better. The task is to modify context.ts to query and format last 7 days Strava activity summary. Let me check if there's a context.ts file or if I need to create tests for a new one. Let me look at the acceptance criteria more carefully and check what functions might be needed:

Based on the task spec, I need to write tests for:
1. System prompt includes last 7 days activity count
2. System prompt includes total moving time for last 7 days
3. System prompt includes last activity sport and date
4. Handles case where no activities exist gracefully

This suggests I need to test a function that queries the last 7 days of activities and formats them for the system prompt. Let me start writing the test file:
Now let me run biome check on the test file to ensure it passes linting:
Good! Now let me run biome check again without --write to ensure it passes:
Perfect! Now let me verify the test file loads without errors by running vitest:
Let me try a different approach to run the tests:
Good! The tests are failing as expected because context.ts doesn't exist yet. This is correct for the RED phase. The tests are properly structured and the module loading errors are expected. Let me verify the test file syntax is correct by checking if it has any syntax errors:
That's expected. Let me verify the test file is properly formatted by reading it back:
Perfect! The test file is properly formatted. Now let me create the confirmation file to mark that tests have been written:
Perfect! Let me verify the confirmation file was created:
Excellent! Let me verify the test file one more time to ensure it's complete and covers all acceptance criteria:
Perfect! Let me verify the biome check one more time to ensure everything is clean:
Perfect! Let me create a summary of what was written:

## Summary

I have successfully completed the RED phase of TDD for **task-9a: Query last 7 days activity summary**. Here's what was delivered:

### Test File Created
**File:** `/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts`

### Test Coverage

The test suite comprehensively covers all 4 acceptance criteria:

#### **AC1: System prompt includes last 7 days activity count** (4 tests)
- Returns activity count of 0 when no activities exist
- Returns activity count of 1 when one activity exists in last 7 days
- Returns activity count of 3 when three activities exist in last 7 days
- Excludes activities older than 7 days from the count

#### **AC2: System prompt includes total moving time for last 7 days** (4 tests)
- Returns 0 moving time when no activities exist
- Returns correct moving time for single activity
- Returns sum of moving times for multiple activities
- Formats moving time in human-readable format (minutes or hours)

#### **AC3: System prompt includes last activity sport and date** (4 tests)
- Returns empty string for sport and date when no activities exist
- Returns sport type of the most recent activity
- Returns date of the most recent activity
- Identifies most recent activity when multiple exist

#### **AC4: Handles case where no activities exist gracefully** (4 tests)
- Returns a valid string when no activities exist
- Does not throw an error when no activities exist
- Returns sensible defaults when no activities exist
- Returns different athlete data for different athlete_ids

#### **Additional Tests: Parameterised Queries** (2 tests)
- Uses parameterised queries with $1 placeholder for athlete_id
- Does not use string interpolation for athlete_id

### Test Infrastructure
- **Mock Strategy:** Full in-memory store simulation for PostgreSQL queries
- **Vitest Boilerplate:** Proper imports from `"vitest"` with `vi.doMock` pattern for `@lifeos/shared`
- **Determinism:** All tests are deterministic with no external service calls
- **Biome Compliance:** All tests pass biome linting checks

### Confirmation File
**File:** `/home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-9a/tests-written.txt`

Contains: `tests-written`

All tests are expected to fail at this stage (RED phase) because `context.ts` has not yet been implemented. The tests define the exact contract that the Developer must satisfy.
[0m
> ag-03-tester · claude-haiku-4-5-20251001
[0m
[0m→ [0mRead packages/orchestrator/src
[0m✗ [0mRead packages/orchestrator/src/context.ts failed
[91m[1mError: [0mFile not found: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/context.ts
[0m→ [0mRead packages/orchestrator/src/__tests__/agent.test.ts
[0m→ [0mRead packages/orchestrator/src/tools/strava.ts[90m [limit=100][0m
[0m
[0m$ [0mgrep -n "export async function" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/strava.ts | head -20
15:export async function get_strava_oauth_url(_params: Record<string, unknown>): Promise<string> {
64:export async function validate_oauth_state(params: { state: string }): Promise<boolean> {
347:export async function get_strava_activities(params: {
424:export async function fetch_90day_activities(params: {
494:export async function get_strava_trends(params: {
755:export async function sync_strava_activities(params: {
[0m
[0m→ [0mRead packages/orchestrator/src/tools/strava.ts[90m [offset=347, limit=150][0m
[0m
[0m$ [0mgrep -A 50 "## Database schema" /home/runner/work/jamie-lifeos/jamie-lifeos/docs/architecture.md | head -80
## Database schema

### migrations

    CREATE TABLE migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### people

    CREATE TABLE people (
        id                  SERIAL PRIMARY KEY,
        name                TEXT        NOT NULL,
        relationship_type   TEXT        NOT NULL,
        how_known           TEXT,
        notes               TEXT,
        last_interaction_at TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### life_events

    CREATE TABLE life_events (
        id           SERIAL PRIMARY KEY,
        person_id    INTEGER     NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        event_type   TEXT        NOT NULL,
        event_date   DATE        NOT NULL,
        is_recurring BOOLEAN     NOT NULL DEFAULT false,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### interactions

    CREATE TABLE interactions (
        id           SERIAL PRIMARY KEY,
        person_id    INTEGER     NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        notes        TEXT,
        interacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### nudges

    CREATE TABLE nudges (
        id            SERIAL PRIMARY KEY,
        person_id     INTEGER     REFERENCES people(id) ON DELETE SET NULL,
        life_event_id INTEGER     REFERENCES life_events(id) ON DELETE SET NULL,
[0m
[0m$ [0mls -la /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/ | grep -E "context|agent"
-rw-r--r-- 1 runner runner 64106 May 15 07:00 agent.ts
[0m
[0m→ [0mRead packages/orchestrator/src/agent.ts[90m [limit=100][0m
[0m
[0m← [0mWrite packages/orchestrator/src/__tests__/context.test.ts
Wrote file successfully.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check --write packages/orchestrator/src/__tests__/context.test.ts
Checked 1 file in 35ms. Fixed 1 file.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check packages/orchestrator/src/__tests__/context.test.ts
Checked 1 file in 14ms. No fixes applied.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec vitest run --reporter=verbose packages/orchestrator/src/__tests__/context.test.ts 2>&1 | head -100
undefined
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "vitest" not found
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && pnpm exec vitest run --reporter=verbose src/__tests__/context.test.ts 2>&1 | head -150
RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator

 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 0 when no activities exist 15ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 1 when one activity exists in last 7 days 4ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 3 when three activities exist in last 7 days 3ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > excludes activities older than 7 days from the count 8ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns 0 moving time when no activities exist 3ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns correct moving time for single activity 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns sum of moving times for multiple activities 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > formats moving time in human-readable format (minutes or hours) 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns empty string for sport and date when no activities exist 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns sport type of the most recent activity 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns date of the most recent activity 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > identifies most recent activity when multiple exist 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns a valid string when no activities exist 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > does not throw an error when no activities exist 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns sensible defaults when no activities exist 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns different athlete data for different athlete_ids 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id 2ms
   → Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts

⎯⎯⎯⎯⎯⎯ Failed Tests 18 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 0 when no activities exist
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:169:38
    167|   describe("AC1 — System prompt includes last 7 days activity count", …
    168|     it("returns activity count of 0 when no activities exist", async (…
    169|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    170|       const summary = await getActivitySummary(42);
    171|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 1 when one activity exists in last 7 days
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:198:38
    196|       });
    197|
    198|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    199|       const summary = await getActivitySummary(42);
    200|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 3 when three activities exist in last 7 days
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:233:38
    231|       }
    232|
    233|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    234|       const summary = await getActivitySummary(42);
    235|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > excludes activities older than 7 days from the count
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:292:38
    290|       });
    291|
    292|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    293|       const summary = await getActivitySummary(42);
    294|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns 0 moving time when no activities exist
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:306:38
    304|   describe("AC2 — System prompt includes total moving time for last 7 …
    305|     it("returns 0 moving time when no activities exist", async () => {
    306|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    307|       const summary = await getActivitySummary(42);
    308|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns correct moving time for single activity
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:335:38
    333|       });
    334|
    335|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    336|       const summary = await getActivitySummary(42);
    337|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns sum of moving times for multiple activities
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:370:38
    368|       }
    369|
    370|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    371|       const summary = await getActivitySummary(42);
    372|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/18]⎯

 FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > formats moving time in human-readable format (minutes or hours)
Error: Cannot find module '/src/context.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
 ❯ src/__tests__/context.test.ts:399:38
    397|       });
    398|
    399|       const { getActivitySummary } = await import("../context.js");
       |                                      ^
    400|       const summary = await getActivitySummary(42);
    401|
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && node --check src/__tests__/context.test.ts 2>&1 || echo "Note: TypeScript files need tsc, not node --check"
node:internal/modules/esm/get_format:189
  throw new ERR_UNKNOWN_FILE_EXTENSION(ext, filepath);
        ^

TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts
    at Object.getFileProtocolModuleFormat [as file:] (node:internal/modules/esm/get_format:189:9)
    at defaultGetFormat (node:internal/modules/esm/get_format:232:36)
    at checkSyntax (node:internal/main/check_syntax:69:20) {
  code: 'ERR_UNKNOWN_FILE_EXTENSION'
}

Node.js v20.20.2
Note: TypeScript files need tsc, not node --check
[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts[90m [limit=50][0m
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-9a
(no output)
[0m
[0m← [0mWrite pipeline/phase-4/task-9a/tests-written.txt
Wrote file successfully.
[0m
[0m$ [0mcat /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-9a/tests-written.txt
tests-written
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && grep -n "describe\|it(" packages/orchestrator/src/__tests__/context.test.ts | head -50
21:import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
128:describe("task-9a — context.ts Strava activity summary", () => {
167:  describe("AC1 — System prompt includes last 7 days activity count", () => {
168:    it("returns activity count of 0 when no activities exist", async () => {
176:    it("returns activity count of 1 when one activity exists in last 7 days", async () => {
177:      const today = new Date().toISOString().split("T")[0];
205:    it("returns activity count of 3 when three activities exist in last 7 days", async () => {
210:        const dateStr = date.toISOString().split("T")[0];
240:    it("excludes activities older than 7 days from the count", async () => {
244:      const eightDaysAgoStr = eightDaysAgo.toISOString().split("T")[0];
248:      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];
304:  describe("AC2 — System prompt includes total moving time for last 7 days", () => {
305:    it("returns 0 moving time when no activities exist", async () => {
313:    it("returns correct moving time for single activity", async () => {
314:      const today = new Date().toISOString().split("T")[0];
342:    it("returns sum of moving times for multiple activities", async () => {
347:        const dateStr = date.toISOString().split("T")[0];
377:    it("formats moving time in human-readable format (minutes or hours)", async () => {
378:      const today = new Date().toISOString().split("T")[0];
412:  describe("AC3 — System prompt includes last activity sport and date", () => {
413:    it("returns empty string for sport and date when no activities exist", async () => {
421:    it("returns sport type of the most recent activity", async () => {
432:        start_date: yesterday.toISOString().split("T")[0],
452:        start_date: today.toISOString().split("T")[0],
472:    it("returns date of the most recent activity", async () => {
474:      const dateStr = today.toISOString().split("T")[0];
503:    it("identifies most recent activity when multiple exist", async () => {
514:        start_date: threeDaysAgo.toISOString().split("T")[0],
534:        start_date: today.toISOString().split("T")[0],
560:  describe("AC4 — Handles case where no activities exist gracefully", () => {
561:    it("returns a valid string when no activities exist", async () => {
569:    it("does not throw an error when no activities exist", async () => {
575:    it("returns sensible defaults when no activities exist", async () => {
583:    it("returns different athlete data for different athlete_ids", async () => {
584:      const today = new Date().toISOString().split("T")[0];
641:  describe("Parameterised queries", () => {
642:    it("uses parameterised queries with $1 placeholder for athlete_id", async () => {
657:    it("does not use string interpolation for athlete_id", async () => {
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check packages/orchestrator/src/__tests__/context.test.ts
Checked 1 file in 14ms. No fixes applied.
[0m
