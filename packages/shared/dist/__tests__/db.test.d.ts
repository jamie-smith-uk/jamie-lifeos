/**
 * Tests for db.ts — PostgreSQL Pool singleton.
 *
 * We do NOT make real DB connections (no Postgres available in CI).
 * Instead we verify:
 *   - pool is exported as a Pool instance
 *   - pool is created once and reused (same reference on multiple imports)
 *   - closePool() is exported and callable
 *
 * The pg Pool constructor itself is well-tested by node-postgres; we are only
 * validating the singleton wiring and export contract.
 */
export {};
//# sourceMappingURL=db.test.d.ts.map