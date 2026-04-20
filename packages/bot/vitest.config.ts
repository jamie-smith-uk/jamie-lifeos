import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Isolate each test file so module-level side-effects (env loading, bot init) reset
    isolate: true,
    pool: "forks",
  },
});
