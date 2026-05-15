I'll implement this task to make the failing tests pass. Let me start by reading the in-scope source files and tests to understand what needs to be implemented.
Let me check if the context.ts file exists or if I need to create it:
The context.ts file doesn't exist yet, so I need to create it. Let me first read the test file to understand what needs to be implemented:
Now I need to check if there are any tests specifically for context.ts. Let me look for context-related tests:
Perfect! There's a specific test file for context.ts. Let me read it:
Now let me check the existing agent.ts file to understand the current structure and see if there are any existing context-related functions:
Let me continue reading the agent.ts file to see the rest:
Now I need to check if there are any existing Strava tools to understand the structure. Let me look at the Strava tools file:
Now I understand the structure. Based on the test file, I need to create a `context.ts` file that exports a `getActivitySummary` function. This function should query the last 7 days of Strava activities and return a formatted summary string. Let me create the context.ts file:
Now let me run the validation commands to check if my implementation is correct:
Now let me run the tests to see if they pass:
I see the issue. The tests are expecting the mock to be called, but it seems like the mock isn't being called properly. Let me check the test more carefully and see what's happening. The issue is that the tests are looking for SQL queries that start with "SELECT", but my query might not be matching the expected pattern. Let me look at the test mock more carefully:
The mock looks correct. Let me check the failing test more carefully:
The issue is that the mock isn't being called. Let me check if there's an issue with the module import or the mock setup. Let me run a specific test to debug this:
The issue is that the mock isn't being called. Let me check if there's an issue with the mock setup. Let me add some debugging to see what's happening. First, let me check if the mock is being set up correctly by looking at the mock calls:
So the mock is working for the other tests. The issue might be that the mock is being reset between tests. Let me check the test setup more carefully. The issue might be that the `poolQueryMock` is being reset in the `beforeEach`. Let me look at the test structure again:
I see the issue! The `vi.resetModules()` is being called in `beforeEach`, which means the module is being reset between tests. This means that the mock calls from previous tests are being cleared. The parameterized query tests are running after other tests, so the mock calls are being reset.

Let me check if there's a way to preserve the mock calls or if I need to modify the test. Looking at the test, it seems like each test should be independent. The issue is that the parameterized query tests are expecting the mock to have been called, but since `vi.resetModules()` is called, the mock calls are cleared.

Let me look at the test more carefully. The test is calling `getActivitySummary(42)` and then checking if the mock was called. But since `vi.resetModules()` is called in `beforeEach`, the mock is fresh for each test. This should work. Let me check if there's an issue with my implementation.

Let me add some debugging to see what's happening. Let me modify the test temporarily to see what mock calls are being made:
Let me create a simple test to debug what's happening. I think the issue might be that the mock isn't being called at all. Let me check if there's an error in my function that's preventing the database call:
The code looks correct. Let me check if there's an issue with the error handling. If there's an error in the try block, it would go to the catch block and return the fallback string, which means the mock wouldn't be called. But that doesn't make sense because the other tests are passing.

Let me check if there's a difference in how the mock is being called. Let me look at the mock setup again:
I see the issue! The mock is set up correctly, but I think the problem might be that the test is running in isolation and the mock calls are being cleared. Let me create a simple debug test to see what's happening:
[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
[0m✗ [0mRead packages/orchestrator/src/context.ts failed
[91m[1mError: [0mFile not found: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/context.ts
[0m✱ [0mGlob "packages/orchestrator/src/context.ts"[90m 0 matches[0m
[0m→ [0mRead packages/orchestrator/src
[0m→ [0mRead packages/orchestrator/src/__tests__/agent.test.ts
[0m✱ [0mGrep "context"[90m in packages/orchestrator/src/__tests__ · 53 matches[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts
[0m→ [0mRead packages/orchestrator/src/agent.ts[90m [offset=1419][0m
[0m→ [0mRead packages/orchestrator/src/tools/strava.ts
[0m
[0m← [0mWrite packages/orchestrator/src/context.ts
Wrote file successfully.
[0m
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/orchestrator/src/context.ts packages/orchestrator/src/__tests__/agent.test.ts
Checked 2 files in 29ms. Fixed 1 file.
[0m
[0m$ [0mpnpm exec biome check packages/orchestrator/src/context.ts packages/orchestrator/src/__tests__/agent.test.ts
Checked 2 files in 14ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  ❯ src/__tests__/context.test.ts (18 tests | 2 failed) 118ms
packages/orchestrator test:        × uses parameterised queries with $1 placeholder for athlete_id 14ms
packages/orchestrator test:        × does not use string interpolation for athlete_id 3ms
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
packages/orchestrator test:  FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id
packages/orchestrator test: AssertionError: expected undefined to be defined
packages/orchestrator test:  ❯ src/__tests__/context.test.ts:649:26
packages/orchestrator test:     647|         ([sql]) => typeof sql === "string" && sql.toUpperCase().starts…
packages/orchestrator test:     648|       );
packages/orchestrator test:     649|       expect(selectCall).toBeDefined();
packages/orchestrator test:        |                          ^
packages/orchestrator test:     650|
packages/orchestrator test:     651|       const [selectSql, selectValues] = selectCall as [string, unknown…
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯
packages/orchestrator test:  FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id
packages/orchestrator test: AssertionError: expected undefined to be defined
packages/orchestrator test:  ❯ src/__tests__/context.test.ts:664:26
packages/orchestrator test:     662|         ([sql]) => typeof sql === "string" && sql.toUpperCase().starts…
packages/orchestrator test:     663|       );
packages/orchestrator test:     664|       expect(selectCall).toBeDefined();
packages/orchestrator test:        |                          ^
packages/orchestrator test:     665|
packages/orchestrator test:     666|       const [selectSql] = selectCall as [string, unknown[]];
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
packages/orchestrator test:  Test Files  1 failed | 27 passed (28)
packages/orchestrator test:       Tests  2 failed | 718 passed (720)
packages/orchestrator test:    Start at  07:04:54
packages/orchestrator test:    Duration  7.51s (transform 1.98s, setup 0ms, import 2.48s, tests 14.03s, environment 4ms)
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts,title=src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id,line=649,column=26::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/context.test.ts:649:26%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/context.test.ts,title=src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id,line=664,column=26::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/context.test.ts:664:26%0A%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts[90m [offset=88, limit=20][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts[90m [offset=640, limit=30][0m
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test -- --reporter=verbose src/__tests__/context.test.ts -t "uses parameterised queries"
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts --reporter\=verbose src/__tests__/context.test.ts -t 'uses parameterised queries'
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 0 when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 1 when one activity exists in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 3 when three activities exist in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > excludes activities older than 7 days from the count
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns 0 moving time when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns correct moving time for single activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns sum of moving times for multiple activities
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > formats moving time in human-readable format (minutes or hours)
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns empty string for sport and date when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns sport type of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns date of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > identifies most recent activity when multiple exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns a valid string when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > does not throw an error when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns sensible defaults when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns different athlete data for different athlete_ids
packages/orchestrator test:  × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id 18ms
packages/orchestrator test:    → expected undefined to be defined
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
packages/orchestrator test:  FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id
packages/orchestrator test: AssertionError: expected undefined to be defined
packages/orchestrator test:  ❯ src/__tests__/context.test.ts:649:26
packages/orchestrator test:     647|         ([sql]) => typeof sql === "string" && sql.toUpperCase().starts…
packages/orchestrator test:     648|       );
packages/orchestrator test:     649|       expect(selectCall).toBeDefined();
packages/orchestrator test:        |                          ^
packages/orchestrator test:     650|
packages/orchestrator test:     651|       const [selectSql, selectValues] = selectCall as [string, unknown…
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
packages/orchestrator test:  Test Files  1 failed (1)
packages/orchestrator test:       Tests  1 failed | 17 skipped (18)
packages/orchestrator test:    Start at  07:05:12
packages/orchestrator test:    Duration  263ms (transform 87ms, setup 0ms, import 98ms, tests 20ms, environment 0ms)
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts --reporter\=verbose src/__tests__/context.test.ts -t 'uses parameterised queries'`
Exit status 1
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test -- --reporter=verbose src/__tests__/context.test.ts -t "returns activity count of 0"
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts --reporter\=verbose src/__tests__/context.test.ts -t 'returns activity count of 0'
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  ✓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 0 when no activities exist 14ms
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 1 when one activity exists in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 3 when three activities exist in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > excludes activities older than 7 days from the count
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns 0 moving time when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns correct moving time for single activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns sum of moving times for multiple activities
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > formats moving time in human-readable format (minutes or hours)
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns empty string for sport and date when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns sport type of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns date of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > identifies most recent activity when multiple exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns a valid string when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > does not throw an error when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns sensible defaults when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns different athlete data for different athlete_ids
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id
packages/orchestrator test:  Test Files  1 passed (1)
packages/orchestrator test:       Tests  1 passed | 17 skipped (18)
packages/orchestrator test:    Start at  07:05:16
packages/orchestrator test:    Duration  252ms (transform 87ms, setup 0ms, import 95ms, tests 16ms, environment 0ms)
packages/orchestrator test: Done
[0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts[90m [offset=130, limit=30][0m
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && node -e "
const { execSync } = require('child_process');
try {
  const result = execSync('pnpm --filter @lifeos/orchestrator test -- --reporter=verbose src/__tests__/context.test.ts -t \"uses parameterised queries\" 2>&1', { encoding: 'utf8' });
  console.log('STDOUT:', result);
} catch (error) {
  console.log('STDERR:', error.stdout);
  console.log('Mock calls debug needed');
}
"
STDERR: Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts --reporter\=verbose src/__tests__/context.test.ts -t 'uses parameterised queries'
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 0 when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 1 when one activity exists in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > returns activity count of 3 when three activities exist in last 7 days
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC1 — System prompt includes last 7 days activity count > excludes activities older than 7 days from the count
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns 0 moving time when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns correct moving time for single activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > returns sum of moving times for multiple activities
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC2 — System prompt includes total moving time for last 7 days > formats moving time in human-readable format (minutes or hours)
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns empty string for sport and date when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns sport type of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > returns date of the most recent activity
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC3 — System prompt includes last activity sport and date > identifies most recent activity when multiple exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns a valid string when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > does not throw an error when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns sensible defaults when no activities exist
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > AC4 — Handles case where no activities exist gracefully > returns different athlete data for different athlete_ids
packages/orchestrator test:  × src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id 24ms
packages/orchestrator test:    → expected undefined to be defined
packages/orchestrator test:  ↓ src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > does not use string interpolation for athlete_id
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
packages/orchestrator test:  FAIL  src/__tests__/context.test.ts > task-9a — context.ts Strava activity summary > Parameterised queries > uses parameterised queries with $1 placeholder for athlete_id
packages/orchestrator test: AssertionError: expected undefined to be defined
packages/orchestrator test:  ❯ src/__tests__/context.test.ts:649:26
packages/orchestrator test:     647|         ([sql]) => typeof sql === "string" && sql.toUpperCase().starts…
packages/orchestrator test:     648|       );
packages/orchestrator test:     649|       expect(selectCall).toBeDefined();
packages/orchestrator test:        |                          ^
packages/orchestrator test:     650|
packages/orchestrator test:     651|       const [selectSql, selectValues] = selectCall as [string, unknown…
packages/orchestrator test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
packages/orchestrator test:  Test Files  1 failed (1)
packages/orchestrator test:       Tests  1 failed | 17 skipped (18)
packages/orchestrator test:    Start at  07:05:30
packages/orchestrator test:    Duration  264ms (transform 91ms, setup 0ms, import 98ms, tests 25ms, environment 0ms)
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts --reporter\=verbose src/__tests__/context.test.ts -t 'uses parameterised queries'`
Exit status 1

Mock calls debug needed
[0m
[0m→ [0mRead packages/orchestrator/src/context.ts[90m [offset=80, limit=30][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/context.test.ts[90m [offset=109, limit=20][0m
[93m[1m! [0mpermission requested: external_directory (/tmp/*); auto-rejecting
[0m✗ [0mWrite /tmp/debug-test.js failed
[91m[1mError: [0mThe user rejected permission to use this specific tool call.
