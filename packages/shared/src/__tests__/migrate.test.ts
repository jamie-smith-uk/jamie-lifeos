/**
 * Tests for migrate.ts — Database migrations runner.
 *
 * Acceptance criteria (T-03):
 *   AC1: Running migrate.ts twice applies migrations exactly once.
 *   AC2: 0001_init.sql creates conversation_context table with correct schema
 *        and index.
 *   AC3: Migration failures log the error and exit with code 1.
 *
 * Because no real PostgreSQL is available in CI, all DB interactions are
 * handled via vi.mock. The pg pool is replaced with a lightweight fake that
 * captures every SQL statement executed. The file-system is real — we use a
 * temporary directory populated with controlled .sql files.
 *
 * Strategy
 * --------
 * - vi.mock("../db.js") replaces the pool singleton with a controllable fake.
 * - vi.mock("../logger.js") silences pino and lets us inspect log calls.
 * - Each test that needs fresh module state calls vi.resetModules() so that
 *   migrate.ts re-imports with the freshly configured mock.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

// ---------------------------------------------------------------------------
// Environment setup (must happen before any imports that touch env.ts)
// ---------------------------------------------------------------------------
process.env.TELEGRAM_BOT_TOKEN = "bot:test_token";
process.env.TELEGRAM_ALLOWED_CHAT_ID = "123456";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
process.env.DIGEST_CRON = "0 7 * * *";
process.env.TZ = "Europe/London";

// ---------------------------------------------------------------------------
// Helpers — fake DB client / pool factory
// ---------------------------------------------------------------------------

/**
 * Creates a self-contained fake pg client + pool pair.
 *
 * `executedStatements` collects every SQL string passed to client.query().
 * `insertedMigrations` collects every migration name inserted into the
 *   migrations table so tests can assert idempotency.
 * `appliedMigrations` is the set of already-applied migration names that the
 *   fake SELECT returns; tests mutate this between calls to simulate state.
 */
function makeFakePool(options: { appliedMigrations?: Set<string>; queryError?: Error | null }) {
  const { queryError = null } = options;
  // mutable so tests can update between runMigrations() calls
  const appliedMigrations: Set<string> = options.appliedMigrations ?? new Set();
  const executedStatements: string[] = [];
  const insertedMigrations: string[] = [];

  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      const trimmed = sql.trim();
      executedStatements.push(trimmed);

      if (queryError) {
        throw queryError;
      }

      // Simulate SELECT name FROM migrations
      if (/SELECT name FROM migrations/i.test(trimmed)) {
        return {
          rows: [...appliedMigrations].map((name) => ({ name })),
        };
      }

      // Track INSERT migrations rows so we can assert idempotency
      if (/INSERT INTO migrations/i.test(trimmed) && params) {
        const name = params[0] as string;
        insertedMigrations.push(name);
        appliedMigrations.add(name); // mark as applied for subsequent calls
      }

      return { rows: [] };
    }),
    release: vi.fn(),
  };

  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async (sql: string) => {
      const trimmed = sql.trim();
      executedStatements.push(trimmed);

      if (queryError) {
        throw queryError;
      }

      if (/SELECT name FROM migrations/i.test(trimmed)) {
        return {
          rows: [...appliedMigrations].map((name) => ({ name })),
        };
      }

      return { rows: [] };
    }),
    end: vi.fn(async () => undefined),
  };

  return { pool, client, executedStatements, insertedMigrations, appliedMigrations };
}

// ---------------------------------------------------------------------------
// Helpers — temporary migrations directory
// ---------------------------------------------------------------------------

function makeTempMigrationsDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lifeos-migrate-test-"));
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content, "utf8");
  }
  return dir;
}

function cleanupDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 0001_init.sql content (real file from the repo)
// ---------------------------------------------------------------------------

// Resolve path relative to this test file's location:
// __tests__/ → src/ → shared/ → packages/ → repo root → db/migrations/
const _thisDir = path.dirname(fileURLToPath(import.meta.url));
const INIT_SQL_PATH = path.resolve(
  _thisDir,
  "..",
  "..",
  "..",
  "..",
  "db",
  "migrations",
  "0001_init.sql",
);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("migrate.ts", () => {
  let tmpDir: string;
  let fakePoolData: ReturnType<typeof makeFakePool>;
  let processExitSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules();

    // Spy on process.exit to prevent the process from actually exiting
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: number | string | null | undefined) => {
        throw new Error(`process.exit(${_code})`);
      });
  });

  afterEach(() => {
    if (tmpDir) {
      cleanupDir(tmpDir);
    }
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // AC1: Running migrate.ts twice applies migrations exactly once
  // -------------------------------------------------------------------------

  describe("AC1 — idempotency: migrations applied exactly once", () => {
    it("applies a pending migration on first run", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_init.sql": "CREATE TABLE t1 (id SERIAL PRIMARY KEY);",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      expect(fakePoolData.insertedMigrations).toContain("0001_init.sql");
      expect(fakePoolData.insertedMigrations).toHaveLength(1);
    });

    it("does NOT apply the same migration on the second run", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_init.sql": "CREATE TABLE t1 (id SERIAL PRIMARY KEY);",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");

      // First run — should apply
      await runMigrations(tmpDir);
      const countAfterFirstRun = fakePoolData.insertedMigrations.length;
      expect(countAfterFirstRun).toBe(1);

      // Second run — already in appliedMigrations set, so nothing new applied
      await runMigrations(tmpDir);
      expect(fakePoolData.insertedMigrations).toHaveLength(1); // still 1, not 2
    });

    it("never re-runs a migration that is already in the migrations table", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_init.sql": "CREATE TABLE t1 (id SERIAL PRIMARY KEY);",
        "0002_add_col.sql": "ALTER TABLE t1 ADD COLUMN name TEXT;",
      });

      // Pre-seed: 0001 already applied, 0002 pending
      fakePoolData = makeFakePool({
        appliedMigrations: new Set(["0001_init.sql"]),
      });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      // Only 0002 should have been applied
      expect(fakePoolData.insertedMigrations).toEqual(["0002_add_col.sql"]);
      expect(fakePoolData.insertedMigrations).not.toContain("0001_init.sql");
    });

    it("runs migrations in numeric filename order (lexicographic on zero-padded names)", async () => {
      tmpDir = makeTempMigrationsDir({
        "0003_third.sql": "-- third",
        "0001_first.sql": "-- first",
        "0002_second.sql": "-- second",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });
      const order: string[] = [];

      // Wrap client to capture INSERT order
      const originalQuery = fakePoolData.client.query;
      fakePoolData.client.query = vi.fn(async (sql: string, params?: unknown[]) => {
        if (/INSERT INTO migrations/i.test(sql) && params) {
          order.push(params[0] as string);
        }
        return originalQuery(sql, params);
      });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      expect(order).toEqual(["0001_first.sql", "0002_second.sql", "0003_third.sql"]);
    });

    it("creates the migrations tracking table on startup", async () => {
      tmpDir = makeTempMigrationsDir({});

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      const allSql = fakePoolData.executedStatements.join("\n");
      expect(allSql).toMatch(/CREATE TABLE IF NOT EXISTS migrations/i);
    });

    it("records applied migration names in the migrations table", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_init.sql": "CREATE TABLE foo (id SERIAL);",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      // The INSERT must use parameterised query
      const insertCalls = fakePoolData.client.query.mock.calls.filter((args) =>
        /INSERT INTO migrations/i.test(args[0]),
      );
      expect(insertCalls).toHaveLength(1);
      const firstInsertCall = insertCalls[0];
      expect(firstInsertCall).toBeDefined();
      expect(firstInsertCall?.[1]).toEqual(["0001_init.sql"]);
    });
  });

  // -------------------------------------------------------------------------
  // AC2: 0001_init.sql creates conversation_context table with correct schema
  //      and index
  // -------------------------------------------------------------------------

  describe("AC2 — 0001_init.sql schema correctness", () => {
    it("0001_init.sql file exists in db/migrations/", () => {
      expect(fs.existsSync(INIT_SQL_PATH)).toBe(true);
    });

    it("0001_init.sql contains CREATE TABLE conversation_context", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS conversation_context/i);
    });

    it("conversation_context table has id SERIAL PRIMARY KEY column", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/id\s+SERIAL\s+PRIMARY KEY/i);
    });

    it("conversation_context table has chat_id BIGINT NOT NULL column", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/chat_id\s+BIGINT\s+NOT NULL/i);
    });

    it("conversation_context table has role TEXT NOT NULL column", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/role\s+TEXT\s+NOT NULL/i);
    });

    it("conversation_context table has a CHECK constraint on role (user|assistant)", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      // Check constraint must reference both valid roles
      expect(sql).toMatch(/CHECK\s*\(/i);
      expect(sql).toMatch(/['"]?user['"]?/);
      expect(sql).toMatch(/['"]?assistant['"]?/);
    });

    it("conversation_context table has content TEXT NOT NULL column", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/content\s+TEXT\s+NOT NULL/i);
    });

    it("conversation_context table has created_at TIMESTAMPTZ column with DEFAULT now()", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/created_at\s+TIMESTAMPTZ/i);
      expect(sql).toMatch(/DEFAULT\s+now\(\)/i);
    });

    it("0001_init.sql creates an index on chat_id", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/i);
      expect(sql).toMatch(/idx_conversation_context_chat_id/i);
    });

    it("index is created ON conversation_context with chat_id as leading column", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      // The composite index starts with chat_id (may include additional columns)
      expect(sql).toMatch(/ON conversation_context\s*\(\s*chat_id/i);
    });

    it("0001_init.sql uses IF NOT EXISTS for idempotency (table creation)", () => {
      const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      // Both CREATE TABLE and CREATE INDEX should be IF NOT EXISTS
      const matches = sql.match(/IF NOT EXISTS/gi) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it("the migration runner executes 0001_init.sql SQL content against the DB", async () => {
      const _initSql = fs.readFileSync(INIT_SQL_PATH, "utf8");
      const migrationsDir = path.dirname(INIT_SQL_PATH);

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(migrationsDir);

      // The client should have executed the actual SQL from 0001_init.sql
      const allClientSql = fakePoolData.executedStatements.join("\n");
      expect(allClientSql).toContain("CREATE TABLE IF NOT EXISTS conversation_context");
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Migration failures log the error and exit with code 1
  // -------------------------------------------------------------------------

  describe("AC3 — failure handling: log error and exit with code 1", () => {
    it("calls process.exit(1) when a migration query throws", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_fail.sql": "INVALID SQL THAT WILL FAIL;",
      });

      const queryError = new Error("syntax error at or near INVALID");
      fakePoolData = makeFakePool({
        appliedMigrations: new Set(),
        queryError,
      });

      // Make only the migration SQL execution throw, not ensureMigrationsTable
      // or getAppliedMigrations. We do this by making the first two client
      // connections succeed (for ensureMigrationsTable) and then throw.
      let connectCount = 0;
      const goodClient = {
        query: vi.fn(async (sql: string, _params?: unknown[]) => {
          if (/SELECT name FROM migrations/i.test(sql)) {
            return { rows: [] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };
      const badClient = {
        query: vi.fn(async () => {
          throw queryError;
        }),
        release: vi.fn(),
      };

      const pool = {
        connect: vi.fn(async () => {
          connectCount++;
          // First connect = ensureMigrationsTable (good), second = applyMigration (bad)
          return connectCount === 1 ? goodClient : badClient;
        }),
        query: vi.fn(async (sql: string) => {
          if (/SELECT name FROM migrations/i.test(sql)) {
            return { rows: [] };
          }
          return { rows: [] };
        }),
        end: vi.fn(async () => undefined),
      };

      const errorLogger = vi.fn();
      vi.doMock("../db.js", () => ({ pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: errorLogger,
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: errorLogger,
        },
      }));

      const { runMigrations } = await import("../migrate.js");

      await expect(runMigrations(tmpDir)).rejects.toThrow("process.exit(1)");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("logs the error object before exiting with code 1", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_fail.sql": "INVALID SQL;",
      });

      const queryError = new Error("DB connection refused");
      let connectCount = 0;
      const goodClient = {
        query: vi.fn(async () => ({ rows: [] })),
        release: vi.fn(),
      };
      const badClient = {
        query: vi.fn(async () => {
          throw queryError;
        }),
        release: vi.fn(),
      };

      const pool = {
        connect: vi.fn(async () => {
          connectCount++;
          return connectCount === 1 ? goodClient : badClient;
        }),
        query: vi.fn(async () => ({ rows: [] })),
        end: vi.fn(async () => undefined),
      };

      const errorLogger = vi.fn();
      vi.doMock("../db.js", () => ({ pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: errorLogger,
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: errorLogger,
        },
      }));

      const { runMigrations } = await import("../migrate.js");

      await expect(runMigrations(tmpDir)).rejects.toThrow("process.exit(1)");

      // error logger must have been called with the error
      expect(errorLogger).toHaveBeenCalled();
      const firstCall = errorLogger.mock.calls[0];
      const logArg = firstCall?.[0];
      expect(logArg).toHaveProperty("err");
    });

    it("calls pool.end() to drain connections before exiting on failure", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_fail.sql": "BAD SQL;",
      });

      const queryError = new Error("fatal DB error");
      let connectCount = 0;
      const goodClient = {
        query: vi.fn(async () => ({ rows: [] })),
        release: vi.fn(),
      };
      const badClient = {
        query: vi.fn(async () => {
          throw queryError;
        }),
        release: vi.fn(),
      };
      const poolEnd = vi.fn(async () => undefined);

      const pool = {
        connect: vi.fn(async () => {
          connectCount++;
          return connectCount === 1 ? goodClient : badClient;
        }),
        query: vi.fn(async () => ({ rows: [] })),
        end: poolEnd,
      };

      vi.doMock("../db.js", () => ({ pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await expect(runMigrations(tmpDir)).rejects.toThrow("process.exit(1)");

      expect(poolEnd).toHaveBeenCalled();
    });

    it("exits with code 1, not any other code", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_fail.sql": "BAD SQL;",
      });

      const queryError = new Error("query failed");
      let connectCount = 0;
      const goodClient = {
        query: vi.fn(async () => ({ rows: [] })),
        release: vi.fn(),
      };
      const badClient = {
        query: vi.fn(async () => {
          throw queryError;
        }),
        release: vi.fn(),
      };

      const pool = {
        connect: vi.fn(async () => {
          connectCount++;
          return connectCount === 1 ? goodClient : badClient;
        }),
        query: vi.fn(async () => ({ rows: [] })),
        end: vi.fn(async () => undefined),
      };

      vi.doMock("../db.js", () => ({ pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await expect(runMigrations(tmpDir)).rejects.toThrow("process.exit(1)");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("does NOT exit with code 1 when all migrations succeed", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_init.sql": "CREATE TABLE ok (id SERIAL);",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Additional robustness tests
  // -------------------------------------------------------------------------

  describe("file filtering", () => {
    it("ignores files that don't match the NNNN_name.sql pattern", async () => {
      tmpDir = makeTempMigrationsDir({
        "0001_valid.sql": "SELECT 1;",
        "README.md": "# docs",
        "backup.sql": "-- non-standard filename",
        ".DS_Store": "",
      });

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await runMigrations(tmpDir);

      // Only 0001_valid.sql should have been applied
      expect(fakePoolData.insertedMigrations).toEqual(["0001_valid.sql"]);
    });

    it("handles an empty migrations directory without error", async () => {
      tmpDir = makeTempMigrationsDir({});

      fakePoolData = makeFakePool({ appliedMigrations: new Set() });

      vi.doMock("../db.js", () => ({ pool: fakePoolData.pool }));
      vi.doMock("../logger.js", () => ({
        logger: {
          child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          })),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { runMigrations } = await import("../migrate.js");
      await expect(runMigrations(tmpDir)).resolves.toBeUndefined();
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });
});
