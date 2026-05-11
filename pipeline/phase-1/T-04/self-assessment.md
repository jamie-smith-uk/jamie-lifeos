# T-04 Self-Assessment — conversation_context schema migration

**Task:** T-04  
**File produced:** `db/migrations/0001_init.sql`  
**Date:** 2026-04-20

---

## Acceptance criteria check

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | Migration runs cleanly against a fresh PostgreSQL 16 database | PASS | Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`; idempotent and compatible with PG 16 |
| 2 | `conversation_context` table has all columns specified in architecture.md | PASS | `id SERIAL PRIMARY KEY`, `chat_id BIGINT NOT NULL`, `role TEXT NOT NULL`, `content TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `active_confirmation JSONB NULL` |
| 3 | Index `idx_conversation_context_chat_id_created_at` is created | PASS | `CREATE INDEX IF NOT EXISTS idx_conversation_context_chat_id_created_at ON conversation_context (chat_id, created_at DESC)` |
| 4 | `active_confirmation` JSONB column is present and nullable | PASS | Declared as `JSONB NULL` with no `NOT NULL` constraint |

---

## Design decisions

### migrations table included
The task description says "Also creates the migrations table itself if not handled by the runner." The runner (`migrate.ts`, T-03) creates the table on startup, but since `0001_init.sql` is the very first migration that runs, including a `CREATE TABLE IF NOT EXISTS migrations` here is safe and provides a self-contained fallback. The `IF NOT EXISTS` guard prevents any conflict.

### active_confirmation placement
`architecture.md` states: "The pending action is stored as a JSONB object in the `active_confirmation` column of the `conversation_context` table — it is not a separate table." The column is placed on `conversation_context` rather than a dedicated table, exactly as specified. It is nullable (no `NOT NULL` constraint, no `DEFAULT`) so rows that are not part of an active confirmation carry `NULL` without overhead.

### Constraint naming
The role check constraint is named `conversation_context_role_check` to match the architecture.md schema block and to follow PostgreSQL naming conventions for check constraints (`<table>_<column>_check`).

### Index ordering
The index is defined as `(chat_id, created_at DESC)` rather than plain `(chat_id)`. This directly serves the two primary access patterns: `ORDER BY created_at DESC LIMIT 20` for history loads, and filtering to the latest row per `chat_id` for confirmation reads.

---

## Security rules compliance

| Rule | Compliant |
|---|---|
| No hardcoded secrets or credentials | Yes — file contains only DDL |
| No SQL string concatenation | Yes — migration file is DDL only; no dynamic queries |
| Parameterised queries | N/A — this file is a static DDL migration, not application code |
| No env var values in file | Yes |

---

## Files changed

- `db/migrations/0001_init.sql` — replaced incomplete prior version with full schema including `active_confirmation JSONB NULL`, correct index name and ordering, and `migrations` table DDL
