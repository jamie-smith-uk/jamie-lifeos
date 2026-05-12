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
