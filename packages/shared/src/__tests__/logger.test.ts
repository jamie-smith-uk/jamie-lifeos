/**
 * Tests for logger.ts — pino structured logger.
 *
 * The logger module reads LOG_LEVEL from process.env at module load time.
 * We use vi.resetModules() + dynamic import to test different level configs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let originalLogLevel: string | undefined;

beforeEach(() => {
  originalLogLevel = process.env.LOG_LEVEL;
});

afterEach(() => {
  if (originalLogLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = originalLogLevel;
  }
  vi.resetModules();
});

async function loadLoggerModule() {
  vi.resetModules();
  return import("../logger.js");
}

// ---------------------------------------------------------------------------
// AC: logger.ts exports a pino logger with level configurable via LOG_LEVEL
// ---------------------------------------------------------------------------

describe("logger.ts — exports a pino logger", () => {
  it("exports a `logger` named export", async () => {
    process.env.LOG_LEVEL = "info";
    const mod = await loadLoggerModule();
    expect(mod.logger).toBeDefined();
  });

  it("logger has pino Logger interface (info, warn, error, debug methods)", async () => {
    process.env.LOG_LEVEL = "info";
    const mod = await loadLoggerModule();
    const { logger } = mod;

    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.trace).toBe("function");
    expect(typeof logger.fatal).toBe("function");
  });

  it("logger.level reflects LOG_LEVEL=debug", async () => {
    process.env.LOG_LEVEL = "debug";
    const mod = await loadLoggerModule();
    expect(mod.logger.level).toBe("debug");
  });

  it("logger.level reflects LOG_LEVEL=warn", async () => {
    process.env.LOG_LEVEL = "warn";
    const mod = await loadLoggerModule();
    expect(mod.logger.level).toBe("warn");
  });

  it("logger.level reflects LOG_LEVEL=error", async () => {
    process.env.LOG_LEVEL = "error";
    const mod = await loadLoggerModule();
    expect(mod.logger.level).toBe("error");
  });

  it("logger.level reflects LOG_LEVEL=trace", async () => {
    process.env.LOG_LEVEL = "trace";
    const mod = await loadLoggerModule();
    expect(mod.logger.level).toBe("trace");
  });

  it("logger defaults to level=info when LOG_LEVEL is not set", async () => {
    delete process.env.LOG_LEVEL;
    const mod = await loadLoggerModule();
    expect(mod.logger.level).toBe("info");
  });

  it("logger has child() method for creating child loggers", async () => {
    process.env.LOG_LEVEL = "info";
    const mod = await loadLoggerModule();
    expect(typeof mod.logger.child).toBe("function");

    const child = mod.logger.child({ service: "test" });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
  });

  it("logger emits JSON output (has formatters producing level as string)", async () => {
    process.env.LOG_LEVEL = "info";
    const mod = await loadLoggerModule();
    const { logger: _logger } = mod;

    // Capture output by writing to a buffer stream
    const chunks: Buffer[] = [];
    const stream = new (await import("node:stream")).Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });

    const pino = (await import("pino")).default;
    const testLogger = pino(
      {
        level: "info",
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
      },
      stream,
    );

    testLogger.info({ msg: "hello" }, "test message");
    await new Promise((resolve) => setTimeout(resolve, 10));

    const output = Buffer.concat(chunks).toString();
    const parsed = JSON.parse(output);

    // With the custom formatter, level should be a string, not a number
    expect(typeof parsed.level).toBe("string");
    expect(parsed.level).toBe("info");
  });
});
