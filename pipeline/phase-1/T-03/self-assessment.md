# T-03 Self-Assessment — Database Migrations Runner

## Task
Implement `packages/shared/src/migrate.ts` and `db/migrations/0001_init.sql`.

## Files Written / Modified

| File | Action |
|------|--------|
| `packages/shared/src/migrate.ts` | Fixed: added missing `fileURLToPath` import from `"url"`; corrected path-resolution depth (3 levels, not 4) |
| `packages/shared/package.json` | Added `"type": "module"` to allow `import.meta.url` (Node16 ESM) |
| `db/migrations/0001_init.sql` | Created: `conversation_context` table + `idx_conversation_context_chat_id` index |
| `packages/shared/src/index.ts` | Added named re-export of `runMigrations` |

## Acceptance Criteria

### AC1 — Running migrate.ts twice applies migrations exactly once
**Met.** `runMigrations()` calls `ensureMigrationsTable()` (idempotent: `CREATE TABLE IF NOT EXISTS`), then fetches already-applied names from `migrations` and skips any filename already in that set. A second invocation finds all files in `applied` and exits early with "No pending migrations".

### AC2 — 0001_init.sql creates conversation_context table with correct schema and index
**Met.** `db/migrations/0001_init.sql` contains:
- `CREATE TABLE IF NOT EXISTS conversation_context` with columns `id SERIAL PRIMARY KEY`, `chat_id BIGINT NOT NULL`, `role TEXT NOT NULL CHECK (role IN ('user','assistant'))`, `content TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `CREATE INDEX IF NOT EXISTS idx_conversation_context_chat_id ON conversation_context (chat_id)`

Schema matches the `ConversationMessage` interface in `types.ts`.

### AC3 — Migration failures log the error and exit with code 1
**Met.** The outer `try/catch` in `runMigrations()` calls `log.error({ err }, "Migration failed — exiting with code 1")` and then `process.exit(1)`. The pool is gracefully drained before exit.

## Security Notes
- Migration filenames validated with `MIGRATION_FILENAME_RE` (`/^(\d{4,})_[a-zA-Z0-9_-]+\.sql$/`) before any filesystem access.
- Path-traversal guard: resolved file path is checked to remain within `resolvedDir` before `readFileSync`.
- Migration name recorded in DB via parameterised query (`$1`) — never interpolated.
- Each migration runs in an explicit `BEGIN`/`COMMIT`/`ROLLBACK` transaction.

## Issues Found and Fixed
1. **Missing import** — `fileURLToPath` was used but not imported. Added `import { fileURLToPath } from "url"`.
2. **Wrong path depth** — `path.resolve(here, "..", "..", "..", "..")` traversed one level too many. Fixed to 3 levels: `packages/shared/src → packages/shared → packages → repo-root`.
3. **`import.meta` in CJS context** — `packages/shared/package.json` lacked `"type": "module"`, causing a TypeScript error. Added `"type": "module"` to declare the package as ESM (consistent with the `.js` extension imports already used throughout).
