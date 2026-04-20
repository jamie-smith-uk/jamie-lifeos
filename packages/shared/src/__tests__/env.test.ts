/**
 * Tests for env.ts — validated environment configuration.
 *
 * Because env.ts runs loadEnv() at module load time (top-level), each test
 * that wants a different environment state must:
 *   1. Mutate process.env
 *   2. Call vi.resetModules() to clear the module cache
 *   3. Dynamically import env.ts so it re-runs loadEnv()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/** Minimum set of env vars that satisfies all required checks. */
const VALID_ENV: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: "bot:test_token",
  TELEGRAM_ALLOWED_CHAT_ID: "123456",
  ANTHROPIC_API_KEY: "sk-ant-test",
  DATABASE_URL: "postgresql://localhost:5432/testdb",
  DIGEST_CRON: "0 7 * * *",
  TZ: "Europe/London",
};

/** Save original env and restore after each test. */
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  // Restore process.env exactly
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
  vi.resetModules();
});

function setEnv(vars: Record<string, string>) {
  // Clear all VALID_ENV keys first so previous values don't bleed in
  for (const key of Object.keys(VALID_ENV)) {
    delete process.env[key];
  }
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

async function loadEnvModule() {
  vi.resetModules();
  return import("../env.js");
}

// ---------------------------------------------------------------------------
// AC: env.ts throws a descriptive error if any required variable is missing
// ---------------------------------------------------------------------------

describe("env.ts — missing required variables", () => {
  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["TELEGRAM_BOT_TOKEN"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("throws when TELEGRAM_ALLOWED_CHAT_ID is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["TELEGRAM_ALLOWED_CHAT_ID"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/TELEGRAM_ALLOWED_CHAT_ID/);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["ANTHROPIC_API_KEY"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("throws when DATABASE_URL is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["DATABASE_URL"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/DATABASE_URL/);
  });

  it("throws when DIGEST_CRON is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["DIGEST_CRON"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/DIGEST_CRON/);
  });

  it("throws when TZ is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars["TZ"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/TZ/);
  });

  it("throws when a required var is set to empty string", async () => {
    setEnv({ ...VALID_ENV, TELEGRAM_BOT_TOKEN: "   " });

    await expect(loadEnvModule()).rejects.toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("throws when multiple required vars are missing and lists them all", async () => {
    const vars = { ...VALID_ENV };
    delete vars["TELEGRAM_BOT_TOKEN"];
    delete vars["ANTHROPIC_API_KEY"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(
      /TELEGRAM_BOT_TOKEN.*ANTHROPIC_API_KEY|ANTHROPIC_API_KEY.*TELEGRAM_BOT_TOKEN/,
    );
  });

  it("error message mentions .env file", async () => {
    const vars = { ...VALID_ENV };
    delete vars["DATABASE_URL"];
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/\.env/);
  });
});

// ---------------------------------------------------------------------------
// AC: env.ts succeeds with all required vars present
// ---------------------------------------------------------------------------

describe("env.ts — valid configuration", () => {
  it("loads successfully when all required vars are set", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env).toBeDefined();
    expect(mod.env.TELEGRAM_BOT_TOKEN).toBe("bot:test_token");
    expect(mod.env.DATABASE_URL).toBe("postgresql://localhost:5432/testdb");
  });

  it("applies default for ANTHROPIC_MODEL when not set", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-20250514");
  });

  it("applies default BOT_MODE=polling when not set", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env.BOT_MODE).toBe("polling");
  });

  it("applies default LOG_LEVEL=info when not set", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env.LOG_LEVEL).toBe("info");
  });

  it("accepts BOT_MODE=webhook", async () => {
    setEnv({ ...VALID_ENV, BOT_MODE: "webhook" });

    const mod = await loadEnvModule();
    expect(mod.env.BOT_MODE).toBe("webhook");
  });

  it("throws on invalid BOT_MODE value", async () => {
    setEnv({ ...VALID_ENV, BOT_MODE: "long-polling" });

    await expect(loadEnvModule()).rejects.toThrow(/BOT_MODE/);
  });

  it("trims leading/trailing whitespace from values", async () => {
    setEnv({ ...VALID_ENV, TELEGRAM_BOT_TOKEN: "  bot:trimmed_token  " });

    const mod = await loadEnvModule();
    expect(mod.env.TELEGRAM_BOT_TOKEN).toBe("bot:trimmed_token");
  });
});
