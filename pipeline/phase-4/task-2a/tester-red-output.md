I'll start by understanding the task and examining the relevant files. This is a database migration task for creating a `strava_activities` table. Let me read the existing migration files to understand the schema and patterns.
Let me read the existing strava_credentials migration to understand the pattern:
Perfect! I can see the exact schema for `strava_activities` in the architecture.md file (lines 149-171). Now I need to write tests for the migration. Let me check if there's an existing test pattern for migrations:
Great! There's already a test for the strava_credentials migration. Let me read it to understand the pattern:
Perfect! Now I understand the pattern. I need to create a similar test file for the `strava_activities` migration. Based on the architecture.md schema (lines 149-171), I need to test all the columns specified in the acceptance criteria plus the additional columns from the schema. Let me create the test file:
Now let me run biome on the test file to ensure it passes linting:
Good! Now let me run the second biome check to ensure it passes without errors:
Perfect! Now let me verify the test file loads correctly by running vitest on it:
Perfect! This is exactly what we expect in the RED phase - the tests are failing because the migration file doesn't exist yet. The test file itself loads correctly (no syntax errors), and all the tests are properly structured. The failures are because the Developer hasn't written the implementation yet.

Now let me create the confirmation file to mark that tests have been written:
Perfect! Let me verify the test file one more time to ensure it's properly formatted:
Excellent! Let me verify the confirmation file was created:
Perfect! Let me create a summary of what was completed:

## Summary

I have successfully completed the RED phase of TDD for **task-2a: Create strava_activities table with core activity fields**.

### Test File Created
- **File**: `/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/__tests__/006_strava_activities.test.ts`

### Test Coverage
The test suite comprehensively covers all acceptance criteria and schema requirements:

**Acceptance Criteria (6 tests):**
1. ✅ `strava_activities.id: SERIAL PRIMARY KEY`
2. ✅ `strava_activities.strava_id: BIGINT NOT NULL UNIQUE`
3. ✅ `strava_activities.athlete_id: BIGINT NOT NULL REFERENCES strava_credentials(athlete_id) ON DELETE CASCADE`
4. ✅ `strava_activities.name: TEXT NOT NULL`
5. ✅ `strava_activities.sport_type: TEXT NOT NULL`
6. ✅ `strava_activities.start_date: TIMESTAMPTZ NOT NULL`

**Additional Schema Columns (15 tests):**
- distance_m, moving_time_s, elapsed_time_s, total_elevation_gain
- average_speed_ms, max_speed_ms, average_heartrate, max_heartrate
- average_watts, kilojoules, suffer_score, raw_data, synced_at

**Security & Constraints (5 tests):**
- No string concatenation in migration
- CREATE TABLE IF NOT EXISTS for idempotency
- Foreign key reference to strava_credentials
- ON DELETE CASCADE enforcement

### Quality Assurance
✅ **Biome linting**: Passed (0 errors after auto-fix)
✅ **Vitest syntax**: Valid (31 tests load without errors)
✅ **Test behavior**: All tests fail as expected (RED phase) - migration file doesn't exist yet
✅ **Confirmation file**: Written to `/pipeline/phase-4/task-2a/tests-written.txt`

The tests are ready for the Developer to implement the migration in the GREEN phase.
[0m
> ag-03-tester · claude-haiku-4-5-20251001
[0m
[0m→ [0mRead .
[0m✱ [0mGlob "migrations/*.sql"[90m 5 matches[0m
[0m→ [0mRead migrations/005_strava_credentials.sql
[0m→ [0mRead docs/architecture.md
[0m✱ [0mGlob "**/__tests__/**/*.test.ts"[90m 39 matches[0m
[0m✱ [0mGlob "**/__tests__/**/*.test.js"[90m 7 matches[0m
[0m→ [0mRead migrations/__tests__/005_strava_credentials.test.ts
[0m
[0m← [0mWrite migrations/__tests__/006_strava_activities.test.ts
Wrote file successfully.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check --write migrations/__tests__/006_strava_activities.test.ts
Checked 1 file in 10ms. Fixed 1 file.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check migrations/__tests__/006_strava_activities.test.ts
Checked 1 file in 5ms. No fixes applied.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec vitest run --reporter=verbose migrations/__tests__/006_strava_activities.test.ts 2>&1 | head -100
RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos

 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should create strava_activities table 5ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have id column as SERIAL PRIMARY KEY 1ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have strava_id column as BIGINT NOT NULL UNIQUE 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have athlete_id column as BIGINT NOT NULL with foreign key reference 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have athlete_id foreign key with ON DELETE CASCADE 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have name column as TEXT NOT NULL 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have sport_type column as TEXT NOT NULL 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have start_date column as TIMESTAMPTZ NOT NULL 1ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have distance_m column as NUMERIC(10,2) 1ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have moving_time_s column as INTEGER 1ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have elapsed_time_s column as INTEGER 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have total_elevation_gain column as NUMERIC(8,2) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_speed_ms column as NUMERIC(8,4) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have max_speed_ms column as NUMERIC(8,4) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_heartrate column as NUMERIC(6,2) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have max_heartrate column as NUMERIC(6,2) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_watts column as NUMERIC(8,2) 1ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have kilojoules column as NUMERIC(10,2) 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have suffer_score column as INTEGER 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have raw_data column as JSONB 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have synced_at column as TIMESTAMPTZ NOT NULL DEFAULT NOW() 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.id as SERIAL PRIMARY KEY 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.strava_id as BIGINT NOT NULL UNIQUE 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.athlete_id as BIGINT NOT NULL REFERENCES strava_credentials(athlete_id) ON DELETE CASCADE 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.name as TEXT NOT NULL 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.sport_type as TEXT NOT NULL 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.start_date as TIMESTAMPTZ NOT NULL 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Security > should not use string concatenation in the migration 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Security > should use CREATE TABLE IF NOT EXISTS for idempotency 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Foreign key constraints > should reference strava_credentials table for athlete_id 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
 × migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Foreign key constraints > should enforce ON DELETE CASCADE for athlete_id foreign key 0ms
   → ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'

⎯⎯⎯⎯⎯⎯ Failed Tests 31 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should create strava_activities table
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have id column as SERIAL PRIMARY KEY
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have strava_id column as BIGINT NOT NULL UNIQUE
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have athlete_id column as BIGINT NOT NULL with foreign key reference
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have athlete_id foreign key with ON DELETE CASCADE
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have name column as TEXT NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have sport_type column as TEXT NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have start_date column as TIMESTAMPTZ NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have distance_m column as NUMERIC(10,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have moving_time_s column as INTEGER
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have elapsed_time_s column as INTEGER
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have total_elevation_gain column as NUMERIC(8,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_speed_ms column as NUMERIC(8,4)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have max_speed_ms column as NUMERIC(8,4)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_heartrate column as NUMERIC(6,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have max_heartrate column as NUMERIC(6,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have average_watts column as NUMERIC(8,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have kilojoules column as NUMERIC(10,2)
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have suffer_score column as INTEGER
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have raw_data column as JSONB
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Table structure > should have synced_at column as TIMESTAMPTZ NOT NULL DEFAULT NOW()
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.id as SERIAL PRIMARY KEY
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.strava_id as BIGINT NOT NULL UNIQUE
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.athlete_id as BIGINT NOT NULL REFERENCES strava_credentials(athlete_id) ON DELETE CASCADE
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.name as TEXT NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.sport_type as TEXT NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Acceptance criteria > should have strava_activities.start_date as TIMESTAMPTZ NOT NULL
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Security > should not use string concatenation in the migration
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Security > should use CREATE TABLE IF NOT EXISTS for idempotency
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Foreign key constraints > should reference strava_credentials table for athlete_id
 FAIL  migrations/__tests__/006_strava_activities.test.ts > Migration 006: strava_activities table > Foreign key constraints > should enforce ON DELETE CASCADE for athlete_id foreign key
Error: ENOENT: no such file or directory, open '/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/006_strava_activities.sql'
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-2a
(no output)
[0m
[0m← [0mWrite pipeline/phase-4/task-2a/tests-written.txt
Wrote file successfully.
[0m
[0m→ [0mRead migrations/__tests__/006_strava_activities.test.ts[90m [limit=50][0m
[0m
[0m$ [0mcat /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-4/task-2a/tests-written.txt
tests-written
[0m
