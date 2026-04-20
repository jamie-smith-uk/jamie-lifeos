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
/**
 * Run all pending migrations in order.
 *
 * Safe to call multiple times — already-applied migrations are skipped.
 * Exits with code 1 if any migration fails (suitable for startup gate).
 */
export declare function runMigrations(migrationsDir?: string): Promise<void>;
//# sourceMappingURL=migrate.d.ts.map