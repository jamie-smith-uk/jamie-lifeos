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

import { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

// Set up required env vars before importing db.ts
// (env.ts is imported by db.ts at module load time)
process.env.TELEGRAM_BOT_TOKEN = "bot:test_token";
process.env.TELEGRAM_ALLOWED_CHAT_ID = "123456";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
process.env.DIGEST_CRON = "0 7 * * *";
process.env.TZ = "Europe/London";
process.env.OPENAI_API_KEY = "sk-test-openai";
process.env.STRAVA_CLIENT_ID = "12345";
process.env.STRAVA_CLIENT_SECRET = "secret_abc123";
process.env.STRAVA_REDIRECT_URI = "http://localhost:3001/auth/strava/callback";
process.env.OAUTH_CALLBACK_SECRET = "test-secret";

// ---------------------------------------------------------------------------
// AC: db.ts exports a Pool instance; Pool is created once and reused
// ---------------------------------------------------------------------------

describe("db.ts — Pool singleton", () => {
  it("exports a `pool` named export that is a pg.Pool instance", async () => {
    const mod = await import("../db.js");
    expect(mod.pool).toBeDefined();
    expect(mod.pool).toBeInstanceOf(Pool);
  });

  it("pool is reused — same reference on repeated imports", async () => {
    const mod1 = await import("../db.js");
    const mod2 = await import("../db.js");
    // ES module cache: same object reference
    expect(mod1.pool).toBe(mod2.pool);
  });

  it("pool has expected configuration (max: 10)", async () => {
    const mod = await import("../db.js");
    // pg Pool stores options internally; access via the options property
    const options = (mod.pool as any).options;
    expect(options.max).toBe(10);
  });

  it("pool has idleTimeoutMillis set to 30000", async () => {
    const mod = await import("../db.js");
    const options = (mod.pool as any).options;
    expect(options.idleTimeoutMillis).toBe(30_000);
  });

  it("pool has connectionTimeoutMillis set to 5000", async () => {
    const mod = await import("../db.js");
    const options = (mod.pool as any).options;
    expect(options.connectionTimeoutMillis).toBe(5_000);
  });

  it("pool uses DATABASE_URL from env as connectionString", async () => {
    const mod = await import("../db.js");
    const options = (mod.pool as any).options;
    expect(options.connectionString).toBe("postgresql://localhost:5432/testdb");
  });

  it("pool disables SSL for localhost connections", async () => {
    const mod = await import("../db.js");
    const options = (mod.pool as any).options;
    // localhost → ssl should be false
    expect(options.ssl).toBe(false);
  });

  it("exports a closePool() function", async () => {
    const mod = await import("../db.js");
    expect(typeof mod.closePool).toBe("function");
  });

  it("closePool() returns a Promise", async () => {
    const mod = await import("../db.js");
    // We can't actually end the pool (would break other tests), so just check
    // the return type by spying
    const spy = vi.spyOn(mod.pool, "end").mockResolvedValueOnce(undefined);
    const result = mod.closePool();
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
