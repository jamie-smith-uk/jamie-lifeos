## task-1 — Create database migration for life_events table

**Files:** migrations/002_life_events.sql

⚠ task-1: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-2 — Create database migration for nudges table

**Files:** migrations/003_nudges.sql

- **Migration file naming convention**: Follow the pattern `00X_table_name.sql` where X is the sequential migration number
- **SQL table creation pattern**: Use `CREATE TABLE IF NOT EXISTS` for idempotent migrations, consistent with existing migration files
- **Foreign key constraints**: Use `ON DELETE SET NULL` for optional foreign keys (person_id, life_event_id) to allow orphaned nudges when referenced records are deleted
- **CHECK constraints**: Name them explicitly using the pattern `table_name_column_name_check` for clarity and maintainability
- **Timestamp columns**: Use `timestamptz` type with `DEFAULT now()` for created_at fields, consistent with the architecture specification

---
## task-3 — Update people table schema to match architecture

**Files:** migrations/004_update_people_interactions.sql

- **Migration file naming convention**: Continue using the pattern `00X_table_name.sql` where X is the sequential migration number (this task created `004_update_people_interactions.sql`)

- **Idempotent migrations**: Always use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for adding columns to ensure migrations can be run multiple times safely without errors

- **Timestamp column patterns**: Use `timestamptz NOT NULL DEFAULT now()` for audit columns like `created_at` and `updated_at`. For optional timestamp columns that represent when events occurred (like `interacted_at`), use `timestamptz` without NOT NULL constraint

- **Database schema evolution**: The people table now has proper audit columns (`created_at`, `updated_at`) and the interactions table distinguishes between when an interaction happened (`interacted_at`) vs when the record was created (`created_at`)

- **Migration testing**: Integration tests for migrations require a live PostgreSQL connection and are excluded from the standard test run. The unit test suite validates overall code quality and TypeScript compilation

---
## task-4a — Implement log_interaction function in people module

**Files:** packages/orchestrator/src/tools/people.ts

- **Database interaction pattern**: All people module functions use parameterized queries with the `pool.query()` method from `@lifeos/shared`. Never use string concatenation for SQL queries.

- **Fuzzy name matching**: The `findPersonByNameForUpdate` helper function provides consistent fuzzy matching across all people operations. It uses ILIKE with wildcards and prioritizes exact matches. Reuse this function rather than implementing custom matching logic.

- **Error handling convention**: All people module functions catch exceptions and return JSON strings with error objects rather than throwing. This ensures the tool interface remains consistent and never crashes the agent loop.

- **Response format pattern**: Success responses include `success: true`, relevant data objects (`person`, `interaction`, etc.), and a human-readable `message` field. Error responses include `error` or `success: false` with a `message` field.

- **Timestamp handling**: Use PostgreSQL's `now()` function for database timestamps rather than JavaScript Date objects to ensure consistent timezone handling and precision. Convert database timestamps to ISO strings in response objects using `.toISOString()`.

---
## task-4b — Add tests for log_interaction function

**Files:** packages/orchestrator/src/tools/__tests__/people.test.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

⚠ task-4b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-5a — Implement create_life_event function

**Files:** packages/orchestrator/src/tools/life_events.ts

- **Life events database pattern**: All life event operations use parameterized queries through `pool.query()` from `@lifeos/shared`. The `life_events` table has foreign key constraints to the `people` table with CASCADE delete behavior.

- **Fuzzy name matching consistency**: The `findPersonByName()` helper function provides the same fuzzy matching logic as `findPersonByNameForUpdate()` in people.ts. It uses ILIKE with wildcards and prioritizes exact matches. Always reuse this pattern for person lookups across all modules.

- **Recurring event type logic**: The `isRecurringEventType()` function determines if an event should be recurring based on event type. Currently supports "birthday" and "anniversary" (case-insensitive). This logic is centralized and can be extended for additional recurring event types.

- **Life event response format**: Success responses include `success: true`, a complete `life_event` object with all database fields converted to appropriate types (id as string, timestamps as ISO strings), and a human-readable `message`. This matches the pattern established in people.ts.

- **Input validation pattern**: The `validateLifeEventInputs()` function enforces string length constraints for security (person_name: 255 chars, event_type: 100 chars, notes: 10000 chars) and validates date format. This follows the same validation pattern as people.ts with the `validateStringLength()` helper.

---
## task-5b — Implement get_upcoming_life_events function

**Files:** packages/orchestrator/src/tools/life_events.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

- **Life events date filtering pattern**: The `get_upcoming_life_events` function uses JavaScript-based filtering after database query to handle recurring event logic. This approach provides precise control over date adjustments and is more maintainable than complex SQL date arithmetic.

- **Recurring event adjustment logic**: The `adjustRecurringEventDate()` helper function extracts month/day from the original event date and applies it to a target year. This pattern should be reused for any future recurring event functionality.

- **Date range validation pattern**: The `validateDateRangeInputs()` function provides comprehensive validation for date range queries including format validation, required field checks, and logical validation (start_date not after end_date). This pattern should be used for any future date range operations.

- **Life events tool executor pattern**: The `executeLifeEventsTool()` function now supports both "create_life_event" and "get_upcoming_life_events" operations. New life event operations should be added to this switch statement following the same pattern.

- **Biome complexity suppression**: Used `// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: date filtering and recurring event logic requires multiple conditions` to suppress complexity warnings for the date filtering logic, which legitimately requires multiple conditional branches for proper recurring event handling.

---
