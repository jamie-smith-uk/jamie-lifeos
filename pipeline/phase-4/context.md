## task-1a — Create strava_credentials table migration

**Files:** migrations/005_strava_credentials.sql

⚠ task-1a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-1b — Add token expiry and sync tracking to strava_credentials

**Files:** migrations/005_strava_credentials.sql

⚠ task-1b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-2a — Create strava_activities table with core activity fields

**Files:** migrations/006_strava_activities.sql

- **Migration file location**: Migration files are stored in the `/migrations/` directory at the root level, not within any package.

- **Migration naming pattern**: Follow the pattern `NNN_descriptive_name.sql` where NNN is a zero-padded sequential number (e.g., `006_strava_activities.sql`).

- **Schema authority**: The `docs/architecture.md` file contains the authoritative database schema. When implementing migrations, match the exact column types, constraints, and foreign key relationships defined there.

- **Foreign key pattern**: Use `REFERENCES table_name(column_name) ON DELETE CASCADE` for foreign keys that should cascade deletes (like `athlete_id` referencing `strava_credentials`).

- **Idempotency**: Always use `CREATE TABLE IF NOT EXISTS` in migrations to ensure they can be run multiple times safely.

- **Column types**: Use PostgreSQL standard types: `serial` for auto-incrementing IDs, `bigint` for large integers, `text` for strings, `timestamptz` for timestamps with timezone, `numeric(p,s)` for decimal numbers, `jsonb` for JSON data.

---
## task-2b — Add performance metrics to strava_activities

**Files:** migrations/006_strava_activities.sql

- **Migration file structure**: The `migrations/006_strava_activities.sql` file contains the complete strava_activities table schema with all performance metrics columns already implemented from task-2a.

- **Performance metrics columns**: The strava_activities table includes comprehensive performance tracking fields: distance_m, moving_time_s, elapsed_time_s, total_elevation_gain, average_speed_ms, max_speed_ms, average_heartrate, max_heartrate, average_watts, kilojoules, suffer_score, raw_data, and synced_at.

- **Schema authority**: The `docs/architecture.md` file contains the authoritative database schema. The migration exactly matches the schema defined there, including proper column types, constraints, and foreign key relationships.

- **Foreign key pattern**: The athlete_id column uses `REFERENCES strava_credentials(athlete_id) ON DELETE CASCADE` to ensure data integrity and proper cleanup when credentials are removed.

- **Idempotency**: The migration uses `CREATE TABLE IF NOT EXISTS` to ensure it can be run multiple times safely without errors.

---
## task-3 — Add Strava environment variables

**Files:** packages/shared/src/env.ts, packages/shared/vitest.config.ts, packages/shared/tsconfig.json, .env.example

- **Environment variable validation pattern**: All required environment variables are added to the `REQUIRED_VARS` array in `packages/shared/src/env.ts` and validated for non-empty strings in the `loadEnv()` function
- **Environment configuration structure**: The `EnvConfig` interface defines the TypeScript types for all environment variables, and the `loadEnv()` function handles validation and default value assignment
- **Documentation standard**: All environment variables must be documented in `.env.example` with example values and grouped by service/functionality
- **Strava OAuth2 configuration**: The three Strava environment variables (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`) are now required for the application to start and are validated at startup
- **Testing approach**: Environment variable tests use module cache clearing (`vi.resetModules()`) and dynamic imports to test different environment configurations in isolation

---
## task-4a — Create Strava tools module with OAuth URL generation

**Files:** packages/orchestrator/src/tools/strava.ts, packages/orchestrator/src/tools/__tests__/strava.test.ts

- **OAuth state management pattern**: Use the `strava_oauth_state` table (migration 007) for storing temporary OAuth state tokens with expiration. All OAuth flows should follow this pattern for CSRF protection.

- **State token security**: Generate state tokens using `randomBytes(32).toString("hex")` for cryptographic security. Set 10-minute expiration and implement one-time use by deleting tokens after validation. **NEVER log state tokens** - they are sensitive authentication material.

- **Strava OAuth configuration**: The OAuth URL uses `https://www.strava.com/oauth/authorize` endpoint with scope `activity:read_all`. Client ID and redirect URI come from environment variables `STRAVA_CLIENT_ID` and `STRAVA_REDIRECT_URI`.

- **Error handling pattern**: All database operations in tools should use try-catch blocks with structured logging via `logger.child({ function: "function_name" })`. Log errors and re-throw to allow calling code to handle them.

- **Database query pattern**: Use parameterized queries with the shared `pool` from `@lifeos/shared`. Always check `rowCount` for INSERT operations to ensure success before proceeding.

---
