import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: [
      "src/__tests__/**/*.test.ts",
      "src/tools/__tests__/people.test.ts",
      "src/tools/__tests__/life_events.test.ts",
      "src/tools/__tests__/life_events_nudges.test.ts",
      "src/tools/__tests__/nudges.test.ts",
      "src/__tests__/scheduler.test.ts",
    ],
    isolate: true,
    pool: "forks",
    passWithNoTests: true,
  },
});
