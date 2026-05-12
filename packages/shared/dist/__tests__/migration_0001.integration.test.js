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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
// ---------------------------------------------------------------------------
// Database connection
// Use DATABASE_URL directly — do NOT read .env
// ---------------------------------------------------------------------------
const DATABASE_URL = "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
// ---------------------------------------------------------------------------
// Path to the migration file under test
// ---------------------------------------------------------------------------
const _thisDir = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(_thisDir, "..", "..", "..", "..", "db", "migrations", "0001_init.sql");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Drop test objects so each test starts from a known-clean state. */
async function teardownSchema(client) {
    await client.query("DROP TABLE IF EXISTS conversation_context CASCADE");
    await client.query("DROP TABLE IF EXISTS migrations CASCADE");
}
/** Apply the 0001_init.sql migration SQL directly. */
async function applyMigration(client) {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    await client.query(sql);
}
// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("T-04 — 0001_init.sql integration", () => {
    let client;
    beforeAll(async () => {
        client = await pool.connect();
    });
    afterAll(async () => {
        // Clean up test objects after the full suite
        await teardownSchema(client);
        client.release();
        await pool.end();
    });
    beforeEach(async () => {
        await teardownSchema(client);
    });
    // -------------------------------------------------------------------------
    // AC1 — Migration runs cleanly against a fresh PostgreSQL 16 database
    // -------------------------------------------------------------------------
    describe("AC1 — migration runs cleanly on a fresh database", () => {
        it("applies 0001_init.sql without throwing an error", async () => {
            await expect(applyMigration(client)).resolves.not.toThrow();
        });
        it("is idempotent: running the SQL twice does not error (IF NOT EXISTS guards)", async () => {
            await applyMigration(client);
            // Second run must also succeed because of IF NOT EXISTS clauses
            await expect(applyMigration(client)).resolves.not.toThrow();
        });
        it("creates the migrations tracking table", async () => {
            await applyMigration(client);
            const result = await client.query(`SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name   = 'migrations'`);
            expect(result.rows).toHaveLength(1);
        });
        it("creates the conversation_context table", async () => {
            await applyMigration(client);
            const result = await client.query(`SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'`);
            expect(result.rows).toHaveLength(1);
        });
    });
    // -------------------------------------------------------------------------
    // AC2 — conversation_context has all columns specified in architecture.md
    // -------------------------------------------------------------------------
    describe("AC2 — conversation_context column schema", () => {
        beforeEach(async () => {
            await applyMigration(client);
        });
        /** Fetch a column's definition from information_schema. */
        async function getColumn(columnName) {
            const result = await client.query(`SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'
           AND column_name  = $1`, [columnName]);
            return result.rows[0] ?? null;
        }
        it("has an id column", async () => {
            const col = await getColumn("id");
            expect(col).not.toBeNull();
        });
        it("id column is of integer type (serial)", async () => {
            const col = await getColumn("id");
            // SERIAL maps to 'integer' in information_schema
            expect(col?.data_type).toBe("integer");
        });
        it("id column is NOT NULL", async () => {
            const col = await getColumn("id");
            expect(col?.is_nullable).toBe("NO");
        });
        it("id column is the primary key", async () => {
            const result = await client.query(`SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema    = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema    = 'public'
           AND tc.table_name      = 'conversation_context'`);
            const pkColumns = result.rows.map((r) => r.column_name);
            expect(pkColumns).toContain("id");
        });
        it("has a chat_id column", async () => {
            const col = await getColumn("chat_id");
            expect(col).not.toBeNull();
        });
        it("chat_id column is BIGINT", async () => {
            const col = await getColumn("chat_id");
            expect(col?.data_type).toBe("bigint");
        });
        it("chat_id column is NOT NULL", async () => {
            const col = await getColumn("chat_id");
            expect(col?.is_nullable).toBe("NO");
        });
        it("has a role column", async () => {
            const col = await getColumn("role");
            expect(col).not.toBeNull();
        });
        it("role column is TEXT", async () => {
            const col = await getColumn("role");
            expect(col?.data_type).toBe("text");
        });
        it("role column is NOT NULL", async () => {
            const col = await getColumn("role");
            expect(col?.is_nullable).toBe("NO");
        });
        it("role column has a CHECK constraint that only allows 'user' and 'assistant'", async () => {
            // Verify via actual data insertion
            await expect(client.query(`INSERT INTO conversation_context (chat_id, role, content)
           VALUES (1, 'invalid_role', 'test')`)).rejects.toThrow();
            // Valid roles must succeed
            await expect(client.query(`INSERT INTO conversation_context (chat_id, role, content)
           VALUES (1, 'user', 'test message')`)).resolves.not.toThrow();
            await expect(client.query(`INSERT INTO conversation_context (chat_id, role, content)
           VALUES (1, 'assistant', 'test reply')`)).resolves.not.toThrow();
        });
        it("CHECK constraint named conversation_context_role_check exists", async () => {
            const result = await client.query(`SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_schema    = 'public'
           AND table_name      = 'conversation_context'
           AND constraint_type = 'CHECK'`);
            const names = result.rows.map((r) => r.constraint_name);
            expect(names).toContain("conversation_context_role_check");
        });
        it("has a content column", async () => {
            const col = await getColumn("content");
            expect(col).not.toBeNull();
        });
        it("content column is TEXT", async () => {
            const col = await getColumn("content");
            expect(col?.data_type).toBe("text");
        });
        it("content column is NOT NULL", async () => {
            const col = await getColumn("content");
            expect(col?.is_nullable).toBe("NO");
        });
        it("has a created_at column", async () => {
            const col = await getColumn("created_at");
            expect(col).not.toBeNull();
        });
        it("created_at column is TIMESTAMPTZ (timestamp with time zone)", async () => {
            const col = await getColumn("created_at");
            expect(col?.data_type).toBe("timestamp with time zone");
        });
        it("created_at column is NOT NULL", async () => {
            const col = await getColumn("created_at");
            expect(col?.is_nullable).toBe("NO");
        });
        it("created_at column has a DEFAULT of now()", async () => {
            const col = await getColumn("created_at");
            // Postgres reports the default as "now()" or "CURRENT_TIMESTAMP"
            expect(col?.column_default).toMatch(/now\(\)|CURRENT_TIMESTAMP/i);
        });
    });
    // -------------------------------------------------------------------------
    // AC3 — Index idx_conversation_context_chat_id_created_at is created
    // -------------------------------------------------------------------------
    describe("AC3 — index idx_conversation_context_chat_id_created_at", () => {
        beforeEach(async () => {
            await applyMigration(client);
        });
        it("index idx_conversation_context_chat_id_created_at exists", async () => {
            const result = await client.query(`SELECT indexname
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename  = 'conversation_context'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            expect(result.rows).toHaveLength(1);
        });
        it("index is on the conversation_context table", async () => {
            const result = await client.query(`SELECT tablename
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            expect(result.rows[0]?.tablename).toBe("conversation_context");
        });
        it("index covers the chat_id column", async () => {
            const result = await client.query(`SELECT indexdef
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            const def = result.rows[0]?.indexdef ?? "";
            expect(def).toMatch(/chat_id/i);
        });
        it("index covers the created_at column", async () => {
            const result = await client.query(`SELECT indexdef
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            const def = result.rows[0]?.indexdef ?? "";
            expect(def).toMatch(/created_at/i);
        });
        it("index orders created_at DESC", async () => {
            const result = await client.query(`SELECT indexdef
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            const def = result.rows[0]?.indexdef ?? "";
            expect(def).toMatch(/DESC/i);
        });
        it("index is a btree index (default type, suitable for range queries on created_at)", async () => {
            const result = await client.query(`SELECT indexdef
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname  = 'idx_conversation_context_chat_id_created_at'`);
            // Default Postgres index type is btree; indexdef contains "USING btree"
            const def = result.rows[0]?.indexdef ?? "";
            expect(def).toMatch(/USING btree/i);
        });
    });
    // -------------------------------------------------------------------------
    // AC4 — active_confirmation JSONB column is present and nullable
    // -------------------------------------------------------------------------
    describe("AC4 — active_confirmation JSONB nullable column", () => {
        beforeEach(async () => {
            await applyMigration(client);
        });
        it("has an active_confirmation column", async () => {
            const result = await client.query(`SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'
           AND column_name  = 'active_confirmation'`);
            expect(result.rows).toHaveLength(1);
        });
        it("active_confirmation column is JSONB type", async () => {
            const result = await client.query(`SELECT data_type, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'
           AND column_name  = 'active_confirmation'`);
            const col = result.rows[0];
            // JSONB reports as 'jsonb' in data_type
            expect(col?.data_type).toBe("jsonb");
        });
        it("active_confirmation column is nullable (no NOT NULL constraint)", async () => {
            const result = await client.query(`SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'
           AND column_name  = 'active_confirmation'`);
            expect(result.rows[0]?.is_nullable).toBe("YES");
        });
        it("active_confirmation column has no default value (defaults to NULL)", async () => {
            const result = await client.query(`SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'conversation_context'
           AND column_name  = 'active_confirmation'`);
            expect(result.rows[0]?.column_default).toBeNull();
        });
        it("inserting a row without active_confirmation stores NULL", async () => {
            await client.query(`INSERT INTO conversation_context (chat_id, role, content)
         VALUES (42, 'user', 'hello')`);
            const result = await client.query(`SELECT active_confirmation
         FROM conversation_context
         WHERE chat_id = 42`);
            expect(result.rows[0]?.active_confirmation).toBeNull();
        });
        it("inserting a JSONB value into active_confirmation is accepted", async () => {
            const payload = { action: "create_event", title: "Meeting" };
            await expect(client.query(`INSERT INTO conversation_context (chat_id, role, content, active_confirmation)
           VALUES (99, 'assistant', 'please confirm', $1)`, [JSON.stringify(payload)])).resolves.not.toThrow();
        });
        it("active_confirmation can be set to NULL after being set to a JSONB value", async () => {
            const payload = { action: "delete_task", task_id: 123 };
            await client.query(`INSERT INTO conversation_context (chat_id, role, content, active_confirmation)
         VALUES (77, 'assistant', 'please confirm', $1)`, [JSON.stringify(payload)]);
            await client.query(`UPDATE conversation_context
         SET active_confirmation = NULL
         WHERE chat_id = 77`);
            const result = await client.query(`SELECT active_confirmation FROM conversation_context WHERE chat_id = 77`);
            expect(result.rows[0]?.active_confirmation).toBeNull();
        });
    });
    // -------------------------------------------------------------------------
    // Full functional smoke test — end-to-end write and query
    // -------------------------------------------------------------------------
    describe("Functional smoke tests", () => {
        beforeEach(async () => {
            await applyMigration(client);
        });
        it("can insert and retrieve conversation_context rows by chat_id ordered by created_at DESC", async () => {
            const chatId = 1001;
            await client.query(`INSERT INTO conversation_context (chat_id, role, content)
         VALUES ($1, 'user', 'first message')`, [chatId]);
            // Small delay to ensure created_at ordering is distinct
            await client.query("SELECT pg_sleep(0.01)");
            await client.query(`INSERT INTO conversation_context (chat_id, role, content)
         VALUES ($1, 'assistant', 'second message')`, [chatId]);
            const result = await client.query(`SELECT role, content
         FROM conversation_context
         WHERE chat_id = $1
         ORDER BY created_at DESC`, [chatId]);
            expect(result.rows).toHaveLength(2);
            expect(result.rows[0]?.role).toBe("assistant");
            expect(result.rows[1]?.role).toBe("user");
        });
        it("CHECK constraint rejects invalid role on real insert", async () => {
            await expect(client.query(`INSERT INTO conversation_context (chat_id, role, content)
           VALUES (500, 'system', 'not allowed')`)).rejects.toThrow();
        });
        it("migrations table records applied migrations", async () => {
            // The migration SQL only creates tables; it does NOT insert into migrations
            // itself — that is the runner's job. Verify the table is writable and
            // queryable as expected by the runner.
            await client.query(`INSERT INTO migrations (name) VALUES ('0001_init.sql')`);
            const result = await client.query(`SELECT name FROM migrations WHERE name = '0001_init.sql'`);
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0]?.name).toBe("0001_init.sql");
        });
    });
});
//# sourceMappingURL=migration_0001.integration.test.js.map