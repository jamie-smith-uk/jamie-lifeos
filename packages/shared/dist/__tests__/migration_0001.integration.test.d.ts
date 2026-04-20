/**
 * Integration tests for T-04 — conversation_context schema migration
 *
 * Acceptance criteria:
 *   AC1: Migration runs cleanly against a fresh PostgreSQL 16 database
 *   AC2: conversation_context table has all columns specified in architecture.md
 *   AC3: Index idx_conversation_context_chat_id_created_at is created
 *   AC4: active_confirmation JSONB column is present and nullable
 *
 * Strategy:
 *   - Connect directly to a real PostgreSQL 16 instance using DATABASE_URL.
 *   - Drop and recreate the target tables before each test so the migration
 *     always runs against a clean schema.
 *   - Apply the SQL from db/migrations/0001_init.sql verbatim.
 *   - Query information_schema and pg_indexes to assert every structural
 *     requirement.
 *   - No Telegram, Anthropic, Google Calendar, or Gmail calls are made.
 */
export {};
//# sourceMappingURL=migration_0001.integration.test.d.ts.map