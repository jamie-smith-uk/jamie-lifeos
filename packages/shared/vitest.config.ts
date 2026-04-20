import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Isolate each test file so module-level side-effects (env loading) reset
    isolate: true,
    // Give each test file its own fresh module registry
    pool: "forks",
  },
});
