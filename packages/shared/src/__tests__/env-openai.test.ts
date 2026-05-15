/**
 * Tests for OPENAI_API_KEY environment variable validation.
 *
 * Verifies that OPENAI_API_KEY is:
 * 1. Validated as a required string in the env schema
 * 2. Exported from the validated environment config
 * 3. Documented in .env.example with an explanatory comment
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Minimum set of env vars that satisfies all required checks. */
const VALID_ENV: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: "bot:test_token",
  TELEGRAM_ALLOWED_CHAT_ID: "123456",
  ANTHROPIC_API_KEY: "sk-ant-test",
  OPENAI_API_KEY: "sk-proj-test-openai-key",
  DATABASE_URL: "postgresql://localhost:5432/testdb",
  STRAVA_CLIENT_ID: "12345",
  STRAVA_CLIENT_SECRET: "secret_abc123",
  STRAVA_REDIRECT_URI: "http://localhost:3001/auth/strava/callback",
  OAUTH_CALLBACK_SECRET: "test-secret",
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
// AC1: OPENAI_API_KEY is validated as required string in env schema
// ---------------------------------------------------------------------------

describe("env.ts — OPENAI_API_KEY validation", () => {
  it("throws when OPENAI_API_KEY is missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars.OPENAI_API_KEY;
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("throws when OPENAI_API_KEY is empty string", async () => {
    setEnv({ ...VALID_ENV, OPENAI_API_KEY: "" });

    await expect(loadEnvModule()).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("throws when OPENAI_API_KEY is only whitespace", async () => {
    setEnv({ ...VALID_ENV, OPENAI_API_KEY: "   " });

    await expect(loadEnvModule()).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("throws when OPENAI_API_KEY is undefined", async () => {
    const vars = { ...VALID_ENV };
    delete vars.OPENAI_API_KEY;
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("includes OPENAI_API_KEY in error message when missing", async () => {
    const vars = { ...VALID_ENV };
    delete vars.OPENAI_API_KEY;
    setEnv(vars);

    await expect(loadEnvModule()).rejects.toThrow(/Missing required environment variable/);
  });
});

// ---------------------------------------------------------------------------
// AC2: OPENAI_API_KEY is exported from validated environment config
// ---------------------------------------------------------------------------

describe("env.ts — OPENAI_API_KEY export", () => {
  it("exports OPENAI_API_KEY when set", async () => {
    setEnv({ ...VALID_ENV, OPENAI_API_KEY: "sk-proj-test-key-123" });

    const mod = await loadEnvModule();
    expect(mod.env.OPENAI_API_KEY).toBe("sk-proj-test-key-123");
  });

  it("exports OPENAI_API_KEY with trimmed whitespace", async () => {
    setEnv({ ...VALID_ENV, OPENAI_API_KEY: "  sk-proj-test-key-123  " });

    const mod = await loadEnvModule();
    expect(mod.env.OPENAI_API_KEY).toBe("sk-proj-test-key-123");
  });

  it("loads successfully when OPENAI_API_KEY is set with all other required vars", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env).toBeDefined();
    expect(mod.env.OPENAI_API_KEY).toBe("sk-proj-test-openai-key");
  });

  it("OPENAI_API_KEY is a string property on env object", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(typeof mod.env.OPENAI_API_KEY).toBe("string");
  });

  it("OPENAI_API_KEY is not empty after loading", async () => {
    setEnv(VALID_ENV);

    const mod = await loadEnvModule();
    expect(mod.env.OPENAI_API_KEY.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC3: .env.example contains OPENAI_API_KEY with explanatory comment
// ---------------------------------------------------------------------------

describe(".env.example — OPENAI_API_KEY documentation", () => {
  let envExampleContent: string;

  beforeEach(() => {
    const envExamplePath = resolve(process.cwd(), "../../.env.example");
    envExampleContent = readFileSync(envExamplePath, "utf-8");
  });

  it("documents OPENAI_API_KEY in .env.example", () => {
    expect(envExampleContent).toMatch(/OPENAI_API_KEY/);
  });

  it("includes OPENAI_API_KEY with a value in .env.example", () => {
    expect(envExampleContent).toMatch(/OPENAI_API_KEY\s*=\s*.+/);
  });

  it("includes an explanatory comment for OPENAI_API_KEY", () => {
    // Check for a comment line that mentions OpenAI or Whisper
    expect(envExampleContent).toMatch(/#.*(?:OpenAI|Whisper|voice|transcription)/i);
  });

  it("OPENAI_API_KEY appears near the comment in .env.example", () => {
    const lines = envExampleContent.split("\n");
    let commentLineIndex = -1;
    let openaiLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/#.*(?:OpenAI|Whisper|voice|transcription)/i)) {
        commentLineIndex = i;
      }
      if (lines[i].match(/OPENAI_API_KEY/)) {
        openaiLineIndex = i;
      }
    }

    // Both comment and OPENAI_API_KEY should exist
    expect(commentLineIndex).toBeGreaterThanOrEqual(0);
    expect(openaiLineIndex).toBeGreaterThanOrEqual(0);
    // They should be within 2 lines of each other (comment, blank line, key)
    expect(Math.abs(openaiLineIndex - commentLineIndex)).toBeLessThanOrEqual(2);
  });

  it("OPENAI_API_KEY is not commented out in .env.example", () => {
    const lines = envExampleContent.split("\n");
    let found = false;

    for (const line of lines) {
      if (line.match(/^OPENAI_API_KEY\s*=/)) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
  });
});
