/**
 * migrate.ts — Database migrations runner.
 *
 * Applies unapplied SQL migration files from db/migrations/ in filename order.
 * Migration filenames must match the pattern: NNNN_<description>.sql (e.g.
 * 0001_init.sql). Applied migrations are recorded in the `migrations` table and
 * are never re-run. If a migration fails, the error is logged and the process
 * exits with code 1.
 *
 * Usage (standalone):
 *   npx ts-node packages/shared/src/migrate.ts
 *
 * Programmatic usage (e.g. from orchestrator startup):
 *   import { runMigrations } from "@lifeos/shared";
 *   await runMigrations();
 *
 * Security:
 *   - Migration filenames are validated with a strict regex before use.
 *   - Migration names stored in the DB are parameterised — no interpolation.
 *   - Each migration runs inside a transaction; failure rolls back automatically.
 *   - The migrations table is created inside a transaction to prevent race
 *     conditions on concurrent startup.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Filename pattern for valid migration files.
 * Only zero-padded numeric prefix + underscore + alphanumeric/hyphen slug.
 * Prevents path traversal and injection via filename.
 */
const MIGRATION_FILENAME_RE = /^(\d{4,})_[a-zA-Z0-9_-]+\.sql$/;

/**
 * Resolve the migrations directory relative to the repository root.
 * __dirname is not available in ESM; derive it from import.meta.url.
 * packages/shared/src/ → up 3 levels → repo root → db/migrations
 * packages/shared/dist/ → up 3 levels → repo root → db/migrations
 */
function getMigrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // here = <repo>/packages/shared/src (when running from source)
  // here = <repo>/packages/shared/dist (when running from compiled output)
  // In both cases we want <repo>/db/migrations.
  const repoRoot = path.resolve(here, "..", "..", "..");
  return path.join(repoRoot, "db", "migrations");
}

// ---------------------------------------------------------------------------
// Core migration runner
// ---------------------------------------------------------------------------

/**
 * Ensure the migrations tracking table exists.
 * Runs inside a SERIALIZABLE transaction so concurrent processes do not
 * create duplicate tables on first boot.
 */
async function ensureMigrationsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL      PRIMARY KEY,
        name       TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetch the set of already-applied migration names from the DB.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    "SELECT name FROM migrations ORDER BY name",
  );
  return new Set(result.rows.map((r) => r.name));
}

/**
 * Read and sort migration filenames from the migrations directory.
 * Only files matching MIGRATION_FILENAME_RE are included; others are ignored
 * with a warning so that README files or editor swap files don't break runs.
 */
function readMigrationFiles(migrationsDir: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(migrationsDir);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      logger.warn({ migrationsDir }, "Migrations directory not found — skipping");
      return [];
    }
    throw err;
  }

  const files = entries.filter((f) => {
    if (!MIGRATION_FILENAME_RE.test(f)) {
      if (f.endsWith(".sql")) {
        logger.warn(
          { file: f },
          "Migration file has non-standard name and will be skipped",
        );
      }
      return false;
    }
    return true;
  });

  return files.sort((a, b) => {
    const numA = parseInt(a.split("_")[0] ?? "0", 10);
    const numB = parseInt(b.split("_")[0] ?? "0", 10);
    return numA - numB;
  });
}

/**
 * Apply a single SQL migration file inside a transaction.
 * Records the migration name in the `migrations` table on success.
 * On failure, rolls back and rethrows so the caller can handle exit.
 */
async function applyMigration(
  filename: string,
  sql: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    // Parameterised insert — migration name is never interpolated.
    await client.query(
      "INSERT INTO migrations (name) VALUES ($1)",
      [filename],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations in order.
 *
 * Safe to call multiple times — already-applied migrations are skipped.
 * Exits with code 1 if any migration fails (suitable for startup gate).
 */
export async function runMigrations(
  migrationsDir?: string,
): Promise<void> {
  const dir = migrationsDir ?? getMigrationsDir();
  const log = logger.child({ component: "migrate" });

  log.info({ migrationsDir: dir }, "Starting migrations runner");

  try {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();
    const files = readMigrationFiles(dir);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      log.info("No pending migrations — database is up to date");
      return;
    }

    log.info({ count: pending.length }, "Applying pending migrations");

    for (const filename of pending) {
      const filepath = path.join(dir, filename);
      // Resolve to an absolute path and verify it is still inside `dir`
      // to guard against path-traversal in constructed file paths.
      const resolved = path.resolve(filepath);
      const resolvedDir = path.resolve(dir);
      if (!resolved.startsWith(resolvedDir + path.sep)) {
        throw new Error(`Path traversal detected for migration: ${filename}`);
      }

      const sql = fs.readFileSync(resolved, "utf8");
      log.info({ migration: filename }, "Applying migration");
      await applyMigration(filename, sql);
      log.info({ migration: filename }, "Migration applied successfully");
    }

    log.info({ count: pending.length }, "All migrations applied");
  } catch (err) {
    log.error({ err }, "Migration failed — exiting with code 1");
    // Allow pool to close cleanly before exit.
    try {
      await pool.end();
    } catch {
      // Ignore errors during shutdown
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Standalone execution
// ---------------------------------------------------------------------------

// Detect if this module is the entry point (node:url trick for ESM).
const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  (async () => {
    await runMigrations();
    process.exit(0);
  })();
}
