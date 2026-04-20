/**
 * Tests for env.ts — validated environment configuration.
 *
 * Because env.ts runs loadEnv() at module load time (top-level), each test
 * that wants a different environment state must:
 *   1. Mutate process.env
 *   2. Call vi.resetModules() to clear the module cache
 *   3. Dynamically import env.ts so it re-runs loadEnv()
 */
export {};
//# sourceMappingURL=env.test.d.ts.map