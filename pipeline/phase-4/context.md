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
