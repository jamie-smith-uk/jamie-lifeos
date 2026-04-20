/**
 * Tests for task: replace-promise-chains-with-async-await
 *
 * Acceptance criteria:
 *   AC1: migrate.ts has no .then()/.catch() chains — uses await/try/catch instead
 *   AC2: tsc --noEmit passes with no errors
 *   AC3: pnpm test passes with no failures (verified by this suite itself passing)
 *
 * Strategy
 * --------
 * These are static source-analysis tests. They read the raw TypeScript source
 * of migrate.ts and assert that the promise-chain patterns (.then / .catch) are
 * absent. The tests are intentionally RED before the refactoring is applied.
 *
 * We also verify that the module still exports runMigrations as an async
 * function after the refactor — i.e. behaviour is preserved.
 */
export {};
//# sourceMappingURL=migrate-async-await.test.d.ts.map