import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Integration tests require a live PostgreSQL instance — run separately
    // via vitest.integration.config.ts; exclude them from the unit test run.
    exclude: ["src/__tests__/**/*.integration.test.ts"],
    // Isolate each test file so module-level side-effects (env loading) reset
    isolate: true,
    // Give each test file its own fresh module registry
    pool: "forks",
  },
});
