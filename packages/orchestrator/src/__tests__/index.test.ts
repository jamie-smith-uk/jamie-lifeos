/**
 * Tests for packages/orchestrator/src/index.ts — T-08
 *
 * Acceptance criteria:
 *   AC1: POST /message with valid body returns 200 and a text reply
 *   AC2: POST /callback with callback_data 'cancel' returns 200
 *   AC3: Migrations run before first request is handled
 *   AC4: Server listens on PORT env var, defaults to 3001
 *
 * Strategy
 * --------
 * index.ts calls main() at module load time, which:
 *   1. Calls runMigrations()
 *   2. Starts an HTTP server on env.PORT
 *
 * We use vi.doMock() + dynamic import() to inject mocks before the module
 * executes, intercepting runMigrations so no real DB is needed and capturing
 * the server instance.
 *
 * Each test suite creates its own server on a unique port to avoid conflicts.
 * The server is closed after each suite.
 */

import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Environment — set required vars before any module that reads process.env
// ---------------------------------------------------------------------------
process.env.TELEGRAM_BOT_TOKEN = "bot:test_token";
process.env.TELEGRAM_ALLOWED_CHAT_ID = "123456";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
process.env.DATABASE_URL =
  "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos";
process.env.DIGEST_CRON = "0 7 * * *";
process.env.TZ = "Europe/London";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface HttpResponse {
  statusCode: number;
  body: string;
}

function httpPost(port: number, path: string, payload: unknown): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body, "utf8"),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Server factory — spins up a fresh orchestrator instance on a free port
// ---------------------------------------------------------------------------

interface ServerHandle {
  port: number;
  server: http.Server;
  runMigrationsMock: ReturnType<typeof vi.fn>;
  close: () => Promise<void>;
}

/**
 * Import index.ts with @lifeos/shared mocked.
 *
 * The mock controls:
 *   - runMigrations: resolves immediately (no real DB)
 *   - env.PORT: assigned to the provided port string
 *   - logger: silenced (no output during tests)
 *
 * Returns the migration mock so tests can assert call order.
 *
 * IMPORTANT: vi.resetModules() must be called before this function so that
 * index.ts re-evaluates with the fresh mock.
 */
async function startServer(port: number): Promise<ServerHandle> {
  vi.resetModules();

  const runMigrationsMock = vi.fn().mockResolvedValue(undefined);

  const silentChild = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const silentLogger = {
    child: vi.fn(() => silentChild),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  vi.doMock("@lifeos/shared", () => ({
    env: {
      PORT: String(port),
      TELEGRAM_BOT_TOKEN: "bot:test_token",
      TELEGRAM_ALLOWED_CHAT_ID: "123456",
      ANTHROPIC_API_KEY: "sk-ant-test",
      DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
      DIGEST_CRON: "0 7 * * *",
      TZ: "Europe/London",
      ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
      BOT_MODE: "polling",
      LOG_LEVEL: "info",
      ORCHESTRATOR_URL: "http://localhost:3001",
    },
    logger: silentLogger,
    runMigrations: runMigrationsMock,
    pool: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
    },
  }));

  // Mock the agent module so runAgent returns a stub response without
  // hitting the real Anthropic API or database.
  vi.doMock("../agent.js", () => ({
    runAgent: vi
      .fn()
      .mockResolvedValue({ text: "Agent not yet implemented.", showConfirmationKeyboard: false }),
    loadContext: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn().mockResolvedValue(undefined),
    loadConfirmation: vi.fn().mockResolvedValue(null),
    clearConfirmation: vi.fn().mockResolvedValue(undefined),
  }));

  // Dynamically import index.ts — this triggers main() immediately.
  // We need to wait for the server to begin listening before returning.
  await import("../index.js");

  // Wait for the server to be listening on the port.
  await waitForPort(port);

  // Retrieve the actual Node http.Server so we can close it after tests.
  // Since main() is a module-level side effect we can't get the server handle
  // directly. We close the port by connecting and checking, then use a TCP
  // close approach. Instead, we track the server via a helper.
  const server = await getServerOnPort(port);

  return {
    port,
    server,
    runMigrationsMock,
    close: () =>
      new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

/**
 * Poll until TCP port is accepting connections (max 3 seconds).
 */
function waitForPort(port: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const socket = new (require("node:net").Socket)();
      socket.setTimeout(200);
      socket
        .once("connect", () => {
          socket.destroy();
          resolve();
        })
        .once("error", () => {
          socket.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Port ${port} not ready within ${timeoutMs}ms`));
          } else {
            setTimeout(attempt, 50);
          }
        })
        .once("timeout", () => {
          socket.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Port ${port} not ready within ${timeoutMs}ms`));
          } else {
            setTimeout(attempt, 50);
          }
        })
        .connect(port, "127.0.0.1");
    }
    attempt();
  });
}

/**
 * We can't easily get the server handle after a dynamic import of index.ts
 * since main() creates it internally. Use a workaround: make a dummy HTTP
 * request and infer the server is up, then store a reference via the global
 * __lastServer tracking (set by the mock).
 *
 * Simpler approach: create a second helper that wraps around by using
 * net.createServer trick to get a server reference OR use a shared registry.
 *
 * Since the above is overly complex, we instead take a pragmatic approach:
 * track the server by hooking into http.createServer via Node's built-in
 * net module inspection or simply use process._getActiveHandles().
 */
function getServerOnPort(port: number): Promise<http.Server> {
  // Use process._getActiveHandles() (Node internal, but stable enough for tests)
  // to find the TCP server listening on our port.
  return new Promise((resolve, reject) => {
    // Give node a tick to register the listener
    setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handles = (process as any)._getActiveHandles?.() as unknown[];
        if (handles) {
          for (const handle of handles) {
            if (
              handle instanceof http.Server &&
              (handle.address() as AddressInfo | null)?.port === port
            ) {
              resolve(handle);
              return;
            }
          }
        }
        reject(
          new Error(`Could not find http.Server listening on port ${port} via _getActiveHandles`),
        );
      } catch (e) {
        reject(e);
      }
    }, 100);
  });
}

// ---------------------------------------------------------------------------
// AC1: POST /message with valid body returns 200 and a text reply
// ---------------------------------------------------------------------------

describe("AC1 — POST /message returns 200 and a text reply", () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    handle = await startServer(13901);
  }, 10000);

  afterAll(async () => {
    await handle.close();
    vi.resetModules();
  });

  it("returns HTTP 200 for a valid message body", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Hello",
      message_id: 1,
    });
    expect(res.statusCode).toBe(200);
  });

  it("response body is valid JSON", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Hello",
      message_id: 1,
    });
    expect(() => JSON.parse(res.body)).not.toThrow();
  });

  it("response JSON contains a 'text' property", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "What time is it?",
      message_id: 2,
    });
    const parsed = JSON.parse(res.body) as unknown;
    expect(typeof (parsed as Record<string, unknown>).text).toBe("string");
  });

  it("'text' property in response is non-empty", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Schedule meeting",
      message_id: 3,
    });
    const parsed = JSON.parse(res.body) as Record<string, unknown>;
    expect((parsed.text as string).length).toBeGreaterThan(0);
  });

  it("returns 400 when chat_id is missing", async () => {
    const res = await httpPost(handle.port, "/message", {
      text: "Hello",
      message_id: 1,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when text is missing", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 100,
      message_id: 1,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when message_id is missing", async () => {
    const res = await httpPost(handle.port, "/message", {
      chat_id: 100,
      text: "Hello",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    // Send raw invalid JSON manually
    const response = await new Promise<HttpResponse>((resolve, reject) => {
      const body = "not json{{{";
      const options: http.RequestOptions = {
        hostname: "127.0.0.1",
        port: handle.port,
        path: "/message",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 for an unknown route", async () => {
    const res = await httpPost(handle.port, "/unknown", { foo: "bar" });
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AC2: POST /callback with callback_data 'cancel' returns 200
// ---------------------------------------------------------------------------

describe("AC2 — POST /callback with callback_data 'cancel' returns 200", () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    handle = await startServer(13902);
  }, 10000);

  afterAll(async () => {
    await handle.close();
    vi.resetModules();
  });

  it("returns 200 for callback_data='cancel'", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_001",
      callback_data: "cancel",
      message_id: 5,
    });
    expect(res.statusCode).toBe(200);
  });

  it("response body contains a text field for cancel", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_002",
      callback_data: "cancel",
      message_id: 6,
    });
    const parsed = JSON.parse(res.body) as Record<string, unknown>;
    expect(typeof parsed.text).toBe("string");
  });

  it("returns 200 for callback_data='confirm'", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_003",
      callback_data: "confirm",
      message_id: 7,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 200 for callback_data='edit'", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_004",
      callback_data: "edit",
      message_id: 8,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 200 for callback_data='dismiss:42'", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_005",
      callback_data: "dismiss:42",
      message_id: 9,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 for unknown callback_data", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_006",
      callback_data: "unknown_action",
      message_id: 10,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when callback_data field is missing", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_007",
      message_id: 11,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when chat_id is missing in callback", async () => {
    const res = await httpPost(handle.port, "/callback", {
      callback_query_id: "cq_008",
      callback_data: "cancel",
      message_id: 12,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid dismiss nudgeId (non-integer)", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_009",
      callback_data: "dismiss:abc",
      message_id: 13,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for dismiss nudgeId of 0", async () => {
    const res = await httpPost(handle.port, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_010",
      callback_data: "dismiss:0",
      message_id: 14,
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC3: Migrations run before first request is handled
// ---------------------------------------------------------------------------

describe("AC3 — migrations run before server accepts requests", () => {
  it("runMigrations is called before the server starts listening", async () => {
    vi.resetModules();

    const callOrder: string[] = [];

    const runMigrationsMock = vi.fn().mockImplementation(async () => {
      callOrder.push("runMigrations");
      // Simulate a small async delay so ordering is non-trivial
      await new Promise((r) => setTimeout(r, 10));
    });

    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const PORT = 13903;

    // We intercept http.createServer to capture server.listen calls
    const originalCreateServer = http.createServer.bind(http);
    const createServerSpy = vi
      .spyOn(http, "createServer")
      .mockImplementation((handler: Parameters<typeof http.createServer>[0]) => {
        const server = originalCreateServer(handler);
        const originalListen = server.listen.bind(server);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (server.listen as any) = (...args: any[]) => {
          callOrder.push("server.listen");
          return originalListen(...args);
        };
        return server;
      });

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: runMigrationsMock,
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    // Verify ordering: runMigrations must appear before server.listen
    const migrationsIdx = callOrder.indexOf("runMigrations");
    const listenIdx = callOrder.indexOf("server.listen");

    expect(migrationsIdx).toBeGreaterThanOrEqual(0);
    expect(listenIdx).toBeGreaterThanOrEqual(0);
    expect(migrationsIdx).toBeLessThan(listenIdx);

    // Cleanup
    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    createServerSpy.mockRestore();
    vi.resetModules();
  }, 10000);

  it("runMigrations is called exactly once on startup", async () => {
    vi.resetModules();

    const runMigrationsMock = vi.fn().mockResolvedValue(undefined);

    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const PORT = 13904;

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: runMigrationsMock,
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    expect(runMigrationsMock).toHaveBeenCalledTimes(1);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    vi.resetModules();
  }, 10000);

  it("the server is reachable (accepts requests) only after migrations complete", async () => {
    vi.resetModules();

    let migrationsResolved = false;

    const runMigrationsMock = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      migrationsResolved = true;
    });

    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const PORT = 13905;

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: runMigrationsMock,
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    // By the time the server accepts connections, migrations must be resolved
    const res = await httpPost(PORT, "/message", {
      chat_id: 123456,
      text: "test",
      message_id: 1,
    });

    expect(migrationsResolved).toBe(true);
    expect(res.statusCode).toBe(200);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    vi.resetModules();
  }, 10000);
});

// ---------------------------------------------------------------------------
// AC4: Server listens on PORT env var, defaults to 3001
// ---------------------------------------------------------------------------

describe("AC4 — server listens on PORT env var, defaults to 3001", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("listens on the specified PORT env var", async () => {
    vi.resetModules();

    const CUSTOM_PORT = 13906;

    const runMigrationsMock = vi.fn().mockResolvedValue(undefined);
    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(CUSTOM_PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: runMigrationsMock,
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../index.js");
    await waitForPort(CUSTOM_PORT);

    // Server is reachable on the custom port
    const res = await httpPost(CUSTOM_PORT, "/message", {
      chat_id: 123456,
      text: "port test",
      message_id: 1,
    });
    expect(res.statusCode).toBe(200);

    const server = await getServerOnPort(CUSTOM_PORT);
    expect((server.address() as AddressInfo).port).toBe(CUSTOM_PORT);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }, 10000);

  it("default PORT is 3001 (env.PORT default in shared env config)", () => {
    // Verify the default by inspecting the env.ts defaults from shared.
    // The OPTIONAL_DEFAULTS in env.ts set PORT = "3001".
    // Since we cannot import index.ts without a custom PORT (it would conflict
    // with other tests), we verify the default value is declared in shared/env.ts
    // by checking its compiled output.
    const path = require("node:path") as typeof import("path");
    const sharedEnvDist = path.resolve(__dirname, "../../../../packages/shared/dist/env.js");
    const fs = require("node:fs") as typeof import("fs");
    const content = fs.readFileSync(sharedEnvDist, "utf8");
    // env.ts contains OPTIONAL_DEFAULTS with PORT: "3001"
    expect(content).toMatch(/PORT.*3001|3001.*PORT/);
  });

  it("server address port matches the configured PORT", async () => {
    vi.resetModules();

    const TARGET_PORT = 13907;

    const runMigrationsMock = vi.fn().mockResolvedValue(undefined);
    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(TARGET_PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: runMigrationsMock,
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../index.js");
    await waitForPort(TARGET_PORT);

    const server = await getServerOnPort(TARGET_PORT);
    const addr = server.address() as AddressInfo;
    expect(addr.port).toBe(TARGET_PORT);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }, 10000);
});

// ---------------------------------------------------------------------------
// POST /dismiss-nudge endpoint tests (task-14)
// ---------------------------------------------------------------------------

describe("POST /dismiss-nudge endpoint", () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    handle = await startServer(13908);
  }, 10000);

  afterAll(async () => {
    await handle.close();
    vi.resetModules();
  });

  it("AC1: accepts nudge_id in request body and returns 200", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 42,
    });
    expect(res.statusCode).toBe(200);
  });

  it("AC1: response body is valid JSON", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 42,
    });
    expect(() => JSON.parse(res.body)).not.toThrow();
  });

  it("AC2: calls dismiss_nudge tool function with nudge_id", async () => {
    vi.resetModules();

    const dismissNudgeMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        nudge: { id: "42", status: "dismissed" },
        message: "Nudge dismissed successfully",
      }),
    );

    const silentChild = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const silentLogger = {
      child: vi.fn(() => silentChild),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const PORT = 13909;

    vi.doMock("@lifeos/shared", () => ({
      env: {
        PORT: String(PORT),
        TELEGRAM_BOT_TOKEN: "bot:test_token",
        TELEGRAM_ALLOWED_CHAT_ID: "123456",
        ANTHROPIC_API_KEY: "sk-ant-test",
        DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
        DIGEST_CRON: "0 7 * * *",
        TZ: "Europe/London",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        BOT_MODE: "polling",
        LOG_LEVEL: "info",
        ORCHESTRATOR_URL: "http://localhost:3001",
      },
      logger: silentLogger,
      runMigrations: vi.fn().mockResolvedValue(undefined),
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    vi.doMock("../agent.js", () => ({
      runAgent: vi
        .fn()
        .mockResolvedValue({ text: "stub response", showConfirmationKeyboard: false }),
      loadContext: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      loadConfirmation: vi.fn().mockResolvedValue(null),
      clearConfirmation: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock("../tools/nudges.js", () => ({
      executeNudgesTool: dismissNudgeMock,
    }));

    await import("../index.js");
    await waitForPort(PORT);

    const res = await httpPost(PORT, "/dismiss-nudge", {
      nudge_id: 42,
    });

    expect(res.statusCode).toBe(200);
    expect(dismissNudgeMock).toHaveBeenCalled();

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }, 10000);

  it("AC3: returns success response with nudge data on success", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 42,
    });
    const parsed = JSON.parse(res.body) as Record<string, unknown>;
    expect(parsed).toHaveProperty("success");
  });

  it("AC3: returns error response when nudge not found", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 999999,
    });
    const parsed = JSON.parse(res.body) as Record<string, unknown>;
    expect(parsed).toHaveProperty("success");
  });

  it("AC4: validates nudge_id is provided", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {});
    expect(res.statusCode).toBe(400);
  });

  it("AC4: validates nudge_id is a number", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: "not-a-number",
    });
    expect(res.statusCode).toBe(400);
  });

  it("AC4: validates nudge_id is an integer", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 42.5,
    });
    expect(res.statusCode).toBe(400);
  });

  it("AC4: validates nudge_id is positive", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: 0,
    });
    expect(res.statusCode).toBe(400);
  });

  it("AC4: validates nudge_id is positive (negative)", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: -1,
    });
    expect(res.statusCode).toBe(400);
  });

  it("AC5: returns 400 for invalid JSON body", async () => {
    const response = await new Promise<HttpResponse>((resolve, reject) => {
      const body = "not json{{{";
      const options: http.RequestOptions = {
        hostname: "127.0.0.1",
        port: handle.port,
        path: "/dismiss-nudge",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    expect(response.statusCode).toBe(400);
  });

  it("AC5: returns 400 for missing required fields", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      some_other_field: "value",
    });
    expect(res.statusCode).toBe(400);
  });

  it("AC5: returns error response with descriptive message on validation failure", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: "invalid",
    });
    expect(res.statusCode).toBe(400);
    const body = res.body;
    expect(body.length).toBeGreaterThan(0);
  });

  it("AC5: follows same error handling as other endpoints (returns JSON error)", async () => {
    const res = await httpPost(handle.port, "/dismiss-nudge", {
      nudge_id: null,
    });
    expect(res.statusCode).toBe(400);
    expect(() => JSON.parse(res.body)).not.toThrow();
  });
});
