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
