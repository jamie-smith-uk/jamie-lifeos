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
export {};
//# sourceMappingURL=migrate.test.d.ts.map