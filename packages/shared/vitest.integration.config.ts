import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.integration.test.ts"],
    isolate: false,
    pool: "threads",
    testTimeout: 30000,
  },
});
