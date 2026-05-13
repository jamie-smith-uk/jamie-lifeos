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
## task-5c — Add tests for life events module

**Files:** packages/orchestrator/src/tools/__tests__/life_events.test.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

- **Life events test structure**: The test file uses comprehensive mocking of the `@lifeos/shared` module to isolate database interactions. Tests are organized by function (`get_upcoming_life_events`, `create_life_event`) and then by concern (date filtering, error handling, response format, etc.).

- **Test data patterns**: Tests use consistent mock data structures with realistic person and life event records. Database query results are mocked with proper PostgreSQL result object structure including `rows`, `rowCount`, `command`, `oid`, and `fields` properties.

- **Recurring event testing approach**: Tests verify the `isRecurringEventType()` logic by checking that "birthday" and "anniversary" events (case-insensitive) are marked as recurring, while other event types are not. Date adjustment logic is tested by verifying that recurring events maintain their month/day but adjust to the target year.

- **Error handling test patterns**: Tests cover both validation errors (missing fields, invalid formats, length constraints) and runtime errors (database failures, JSON parsing errors). All error responses are expected to contain an `error` property with descriptive messages.

- **Vitest configuration**: The `vitest.config.ts` includes the life events test file in the test suite. Tests use `vi.resetModules()` and `vi.doMock()` for proper module isolation between test cases.

---
## task-6a — Implement create_nudge and dismiss_nudge functions

**Files:** packages/orchestrator/src/tools/nudges.ts

⚠ task-6a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-6b — Add tests for nudges module

**Files:** packages/orchestrator/src/tools/__tests__/nudges.test.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

- **Nudges test structure**: The nudges test file follows the established pattern with comprehensive mocking of `@lifeos/shared` module. Tests are organized by function (`create_nudge`, `dismiss_nudge`) and then by concern (input validation, response format, error handling).

- **Tool routing pattern**: The `executeNudgesTool` function uses an operation-based routing system where `operation: "dismiss_nudge"` routes to dismiss functionality, while the absence of an operation field defaults to create_nudge. This pattern should be maintained for consistency.

- **Nudges validation patterns**: The nudges module uses comprehensive input validation with specific error messages for each field. The `person_id` is required and must be an integer, `life_event_id` can be null, `message` is required and cannot be empty, and `trigger_at` must be a valid ISO date string.

- **Database response formatting**: Nudges responses convert database timestamps to ISO strings and convert numeric IDs to strings in the response objects. The `rowToNudgeInfo` helper function handles this conversion consistently.

- **Error handling consistency**: All nudges functions catch exceptions and return JSON strings with error objects rather than throwing. This maintains the tool interface contract and prevents crashes in the agent loop.

---
## task-7a — Add life events tool definitions to agent

**Files:** packages/orchestrator/src/agent.ts

- **Security pattern for external tool results**: All tools that return external or user-provided data must be included in the untrusted content labeling condition at lines 1153-1157 in `agent.ts`. This includes database content that contains user input (person names, event details, notes, etc.).

- **Life events tool integration**: The life events tools (`create_life_event`, `get_upcoming_life_events`) are now properly integrated into the agent's tool execution pipeline with security labeling. They follow the same pattern as other external tools (Gmail, Todoist, Calendar).

- **Tool name set pattern**: New tool modules should define their tool names in a `const TOOL_NAMES = new Set<string>([...])` and add this set to both the tool routing logic in `executeTool()` and the untrusted content labeling condition if the tools return external data.

- **Security rule compliance**: Any tool that returns data from external APIs, databases, or user input must have its results wrapped in `<untrusted>` tags to prevent prompt injection attacks when the results are passed to the Anthropic API.

- **Agent tool definitions structure**: Tool definitions are organized by module (calendar, todoist, gmail, people, life events) and combined into the main `TOOL_DEFINITIONS` array. Each module maintains its own tool definitions and executor function.

---
## task-7b — Add nudges tool definitions and routing to agent

**Files:** packages/orchestrator/src/agent.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

⚠ task-7b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-8 — Add log_interaction tool definition to agent

**Files:** packages/orchestrator/src/agent.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

⚠ task-8: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-9a — Update get_person to include life events

**Files:** packages/orchestrator/src/tools/people.ts

⚠ task-9a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-9b — Add tests for get_person with life events

**Files:** packages/orchestrator/src/tools/__tests__/people.test.ts, packages/orchestrator/vitest.config.ts, packages/orchestrator/tsconfig.json

⚠ task-9b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-10a — Create scheduler module with nudge evaluator

**Files:** packages/orchestrator/src/scheduler.ts

⚠ task-10a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
