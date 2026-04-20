/**
 * Tests for T-11 — Bot: typing indicator
 *
 * Acceptance criteria:
 *   AC1: Telegram shows 'typing...' before the agent response arrives
 *        → sendChatAction with action='typing' is POSTed to the Telegram API
 *          for the correct chat_id before the agent returns its response.
 *   AC2: Typing action is sent before the Anthropic API call is initiated
 *        → The Telegram sendChatAction fetch() happens before messages.create()
 *          is called on the Anthropic client.
 *   AC3: Failure to send typing indicator does not prevent the agent from responding
 *        → Even when the Telegram fetch() rejects (network error) or returns a
 *          non-OK HTTP status, the /message handler still returns 200 with a
 *          valid text reply.
 *
 * Strategy
 * --------
 * - The orchestrator calls `fetch` (global) to POST to the Telegram API.
 * - We intercept the global `fetch` to spy on calls and simulate failures.
 * - We mock `@lifeos/shared` (env, logger, runMigrations, pool) and `../agent.js`
 *   (runAgent) so no real network or DB calls are made.
 * - Each test suite starts a fresh orchestrator server on a unique port so the
 *   dynamically imported index.ts module can be fully isolated.
 * - The call-order between Telegram fetch and Anthropic create is verified by
 *   recording timestamps / sequence numbers inside each mock.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import http from "http";
import { AddressInfo } from "net";

// ---------------------------------------------------------------------------
// Environment — set required process.env vars before any module reads them
// ---------------------------------------------------------------------------

process.env["TELEGRAM_BOT_TOKEN"] = "bot:t11_test_token";
process.env["TELEGRAM_ALLOWED_CHAT_ID"] = "123456";
process.env["ANTHROPIC_API_KEY"] = "sk-ant-t11-test";
process.env["DATABASE_URL"] =
  "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos";
process.env["DIGEST_CRON"] = "0 7 * * *";
process.env["TZ"] = "Europe/London";

// ---------------------------------------------------------------------------
// HTTP helper — POST JSON and return { statusCode, body }
// ---------------------------------------------------------------------------

interface HttpResponse {
  statusCode: number;
  body: string;
}

function httpPost(
  port: number,
  path: string,
  payload: unknown,
): Promise<HttpResponse> {
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
      res.on("end", () =>
        resolve({ statusCode: res.statusCode ?? 0, body: data }),
      );
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Wait for a TCP port to accept connections
// ---------------------------------------------------------------------------

function waitForPort(port: number, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const socket = new (require("net").Socket)();
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

// ---------------------------------------------------------------------------
// Get an http.Server handle for a port using _getActiveHandles
// ---------------------------------------------------------------------------

function getServerOnPort(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
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
          new Error(
            `Could not find http.Server listening on port ${port} via _getActiveHandles`,
          ),
        );
      } catch (e) {
        reject(e);
      }
    }, 100);
  });
}

// ---------------------------------------------------------------------------
// Silent logger factory
// ---------------------------------------------------------------------------

function buildSilentLogger() {
  const child = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return {
    child: vi.fn(() => child),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Shared env mock factory
// ---------------------------------------------------------------------------

function buildEnvMock(port: number) {
  return {
    PORT: String(port),
    TELEGRAM_BOT_TOKEN: "bot:t11_test_token",
    TELEGRAM_ALLOWED_CHAT_ID: "123456",
    ANTHROPIC_API_KEY: "sk-ant-t11-test",
    DATABASE_URL:
      "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
    DIGEST_CRON: "0 7 * * *",
    TZ: "Europe/London",
    ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
    BOT_MODE: "polling",
    LOG_LEVEL: "info",
    ORCHESTRATOR_URL: "http://localhost:3001",
  };
}

// ---------------------------------------------------------------------------
// Server handle type
// ---------------------------------------------------------------------------

interface ServerHandle {
  port: number;
  server: http.Server;
  close: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// AC1 — Telegram shows 'typing...' before the agent response arrives
// ---------------------------------------------------------------------------
// Verified by: intercepting global fetch and asserting that at least one call
// is made to the Telegram sendChatAction URL with action='typing' and the
// correct chat_id, AND that this call is made before runAgent resolves.
// ---------------------------------------------------------------------------

describe("AC1 — typing indicator is sent to Telegram before agent response arrives", () => {
  let handle: ServerHandle;

  // Track all fetch calls made during the test
  const fetchCalls: Array<{ url: string; body: unknown; timestamp: number }> =
    [];
  let agentResolveTimestamp = 0;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    vi.resetModules();
    fetchCalls.length = 0;
    agentResolveTimestamp = 0;

    const PORT = 14101;

    originalFetch = global.fetch;

    // Intercept global fetch — record URL + body + timestamp for each call.
    // The real Telegram API is NOT called; we return a mocked 200 OK.
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : null;
      fetchCalls.push({ url, body, timestamp: Date.now() });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT),
      logger: buildSilentLogger(),
      runMigrations: vi.fn().mockResolvedValue(undefined),
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    // Mock runAgent — record timestamp when it resolves so we can assert
    // that the Telegram fetch happened BEFORE (or concurrently with the start
    // of) the agent call.
    vi.doMock("../agent.js", () => ({
      runAgent: vi.fn().mockImplementation(async () => {
        // Simulate a tiny async delay to make ordering observable
        await new Promise((r) => setTimeout(r, 10));
        agentResolveTimestamp = Date.now();
        return { text: "Agent reply for typing test.", showConfirmationKeyboard: false };
      }),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    handle = {
      port: PORT,
      server: await getServerOnPort(PORT),
      close: () =>
        new Promise((resolve, reject) =>
          (handle.server as http.Server).close((err) =>
            err ? reject(err) : resolve(),
          ),
        ),
    };
  }, 15000);

  afterAll(async () => {
    await handle.close();
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("a fetch call is made to the Telegram sendChatAction URL", async () => {
    fetchCalls.length = 0;

    await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Hello bot",
      message_id: 1,
    });

    const telegramCalls = fetchCalls.filter((c) =>
      c.url.includes("sendChatAction"),
    );
    expect(telegramCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("the sendChatAction call uses action='typing'", async () => {
    fetchCalls.length = 0;

    await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Trigger typing indicator",
      message_id: 2,
    });

    const telegramCalls = fetchCalls.filter((c) =>
      c.url.includes("sendChatAction"),
    );
    expect(telegramCalls.length).toBeGreaterThanOrEqual(1);

    const typingCall = telegramCalls.find(
      (c) => (c.body as Record<string, unknown>)["action"] === "typing",
    );
    expect(typingCall).toBeDefined();
  });

  it("the sendChatAction call includes the correct chat_id", async () => {
    fetchCalls.length = 0;
    const CHAT_ID = 123456;

    await httpPost(handle.port, "/message", {
      chat_id: CHAT_ID,
      text: "Check chat_id in typing indicator",
      message_id: 3,
    });

    const typingCalls = fetchCalls.filter(
      (c) =>
        c.url.includes("sendChatAction") &&
        (c.body as Record<string, unknown>)["action"] === "typing",
    );
    expect(typingCalls.length).toBeGreaterThanOrEqual(1);

    const callWithCorrectChatId = typingCalls.find(
      (c) => (c.body as Record<string, unknown>)["chat_id"] === CHAT_ID,
    );
    expect(callWithCorrectChatId).toBeDefined();
  });

  it("the sendChatAction URL contains the bot token", async () => {
    fetchCalls.length = 0;

    await httpPost(handle.port, "/message", {
      chat_id: 123456,
      text: "Check token in URL",
      message_id: 4,
    });

    const telegramCalls = fetchCalls.filter((c) =>
      c.url.includes("sendChatAction"),
    );
    expect(telegramCalls.length).toBeGreaterThanOrEqual(1);

    // The URL should include the bot token
    const callWithToken = telegramCalls.find((c) =>
      c.url.includes("t11_test_token"),
    );
    expect(callWithToken).toBeDefined();
  });

  it("the sendChatAction call is POSTed via HTTP POST method", async () => {
    vi.resetModules();

    const PORT2 = 14102;
    const postMethodCalls: Array<{ url: string; method: string }> = [];
    const savedFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      postMethodCalls.push({ url, method: init?.method ?? "GET" });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT2),
      logger: buildSilentLogger(),
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
      runAgent: vi.fn().mockResolvedValue({ text: "Reply.", showConfirmationKeyboard: false }),
    }));

    await import("../index.js");
    await waitForPort(PORT2);

    await httpPost(PORT2, "/message", {
      chat_id: 123456,
      text: "method check",
      message_id: 5,
    });

    const sendChatActionCalls = postMethodCalls.filter((c) =>
      c.url.includes("sendChatAction"),
    );
    expect(sendChatActionCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of sendChatActionCalls) {
      expect(call.method).toBe("POST");
    }

    const server = await getServerOnPort(PORT2);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    global.fetch = savedFetch;
    vi.resetModules();
  }, 15000);
});

// ---------------------------------------------------------------------------
// AC2 — Typing action is sent before the Anthropic API call is initiated
// ---------------------------------------------------------------------------
// Verified by: recording call-order sequence numbers for the Telegram fetch
// and the runAgent invocation. Telegram fetch must be dispatched BEFORE
// runAgent is entered.
// ---------------------------------------------------------------------------

describe("AC2 — typing action is sent before the Anthropic API call is initiated", () => {
  it("Telegram sendChatAction fetch is dispatched before runAgent is called", async () => {
    vi.resetModules();

    const PORT = 14201;
    const callOrder: string[] = [];
    const savedFetch = global.fetch;

    // Intercept fetch: note when sendChatAction is dispatched
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("sendChatAction")) {
        callOrder.push("sendChatAction");
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT),
      logger: buildSilentLogger(),
      runMigrations: vi.fn().mockResolvedValue(undefined),
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
    }));

    // runAgent records its invocation in callOrder and introduces a delay to
    // make it non-trivially observable
    vi.doMock("../agent.js", () => ({
      runAgent: vi.fn().mockImplementation(async () => {
        callOrder.push("runAgent");
        await new Promise((r) => setTimeout(r, 5));
        return { text: "Typed response.", showConfirmationKeyboard: false };
      }),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    await httpPost(PORT, "/message", {
      chat_id: 123456,
      text: "order test",
      message_id: 1,
    });

    // sendChatAction must appear in callOrder before runAgent
    const typingIdx = callOrder.indexOf("sendChatAction");
    const agentIdx = callOrder.indexOf("runAgent");

    expect(typingIdx).toBeGreaterThanOrEqual(0);
    expect(agentIdx).toBeGreaterThanOrEqual(0);
    expect(typingIdx).toBeLessThan(agentIdx);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    global.fetch = savedFetch;
    vi.resetModules();
  }, 15000);

  it("sendChatAction is dispatched synchronously before the agent await begins", async () => {
    vi.resetModules();

    const PORT = 14202;
    const events: string[] = [];
    const savedFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("sendChatAction")) {
        events.push("telegram_fetch_dispatched");
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT),
      logger: buildSilentLogger(),
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
      runAgent: vi.fn().mockImplementation(async () => {
        events.push("agent_started");
        return { text: "Dispatch order check.", showConfirmationKeyboard: false };
      }),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    await httpPost(PORT, "/message", {
      chat_id: 123456,
      text: "dispatch order check",
      message_id: 2,
    });

    // Both events must have been recorded
    expect(events).toContain("telegram_fetch_dispatched");
    expect(events).toContain("agent_started");

    // Telegram fetch must precede agent start
    const telegramIdx = events.indexOf("telegram_fetch_dispatched");
    const agentIdx = events.indexOf("agent_started");
    expect(telegramIdx).toBeLessThan(agentIdx);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    global.fetch = savedFetch;
    vi.resetModules();
  }, 15000);

  it("sendChatAction is not sent for POST /callback (only /message triggers typing)", async () => {
    vi.resetModules();

    const PORT = 14203;
    const telegramCallUrls: string[] = [];
    const savedFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("telegram")) {
        telegramCallUrls.push(url);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT),
      logger: buildSilentLogger(),
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
      runAgent: vi.fn().mockResolvedValue({ text: "OK", showConfirmationKeyboard: false }),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    // POST /callback — should NOT trigger typing indicator
    await httpPost(PORT, "/callback", {
      chat_id: 123456,
      callback_query_id: "cq_t11",
      callback_data: "cancel",
      message_id: 5,
    });

    const sendChatActionUrls = telegramCallUrls.filter((u) =>
      u.includes("sendChatAction"),
    );
    expect(sendChatActionUrls).toHaveLength(0);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    global.fetch = savedFetch;
    vi.resetModules();
  }, 15000);

  it("sendChatAction is sent exactly once per /message request", async () => {
    vi.resetModules();

    const PORT = 14204;
    let sendChatActionCallCount = 0;
    const savedFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("sendChatAction")) {
        sendChatActionCallCount++;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      } as Response);
    });

    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(PORT),
      logger: buildSilentLogger(),
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
      runAgent: vi.fn().mockResolvedValue({ text: "One typing call expected.", showConfirmationKeyboard: false }),
    }));

    await import("../index.js");
    await waitForPort(PORT);

    sendChatActionCallCount = 0;

    await httpPost(PORT, "/message", {
      chat_id: 123456,
      text: "one typing call",
      message_id: 6,
    });

    // Give the fire-and-forget a moment to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(sendChatActionCallCount).toBe(1);

    const server = await getServerOnPort(PORT);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );

    global.fetch = savedFetch;
    vi.resetModules();
  }, 15000);
});

// ---------------------------------------------------------------------------
// AC3 — Failure to send typing indicator does not prevent the agent from responding
// ---------------------------------------------------------------------------
// Verified by: making the global fetch reject (simulate network failure) or
// return a non-OK status when the Telegram sendChatAction URL is called, and
// asserting that the /message endpoint still returns HTTP 200 with a valid
// agent reply.
// ---------------------------------------------------------------------------

describe("AC3 — typing indicator failure does not prevent agent response", () => {
  describe("when fetch rejects (network error)", () => {
    let handle: ServerHandle;
    let originalFetch: typeof global.fetch;

    beforeAll(async () => {
      vi.resetModules();

      const PORT = 14301;
      originalFetch = global.fetch;

      // Reject every fetch call to simulate a network failure
      global.fetch = vi.fn().mockRejectedValue(
        new Error("ECONNREFUSED: Telegram unreachable"),
      );

      vi.doMock("@lifeos/shared", () => ({
        env: buildEnvMock(PORT),
        logger: buildSilentLogger(),
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
        runAgent: vi.fn().mockResolvedValue({ text: "Reply despite typing failure.", showConfirmationKeyboard: false }),
      }));

      await import("../index.js");
      await waitForPort(PORT);

      handle = {
        port: PORT,
        server: await getServerOnPort(PORT),
        close: () =>
          new Promise((resolve, reject) =>
            (handle.server as http.Server).close((err) =>
              err ? reject(err) : resolve(),
            ),
          ),
      };
    }, 15000);

    afterAll(async () => {
      await handle.close();
      global.fetch = originalFetch;
      vi.resetModules();
    });

    it("returns HTTP 200 even when Telegram fetch rejects", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "Will fetch reject?",
        message_id: 1,
      });
      expect(res.statusCode).toBe(200);
    });

    it("response body contains a valid text field when fetch rejects", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "Network failure test",
        message_id: 2,
      });
      const parsed = JSON.parse(res.body) as Record<string, unknown>;
      expect(typeof parsed["text"]).toBe("string");
      expect((parsed["text"] as string).length).toBeGreaterThan(0);
    });

    it("the agent reply text is returned correctly when Telegram fetch fails", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "Check reply text",
        message_id: 3,
      });
      const parsed = JSON.parse(res.body) as Record<string, unknown>;
      expect(parsed["text"]).toBe("Reply despite typing failure.");
    });
  });

  describe("when Telegram returns a non-OK HTTP status (e.g. 403 Forbidden)", () => {
    let handle: ServerHandle;
    let originalFetch: typeof global.fetch;

    beforeAll(async () => {
      vi.resetModules();

      const PORT = 14302;
      originalFetch = global.fetch;

      // Return a 403 Forbidden for all fetch calls (simulates bot token invalid)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      } as Response);

      vi.doMock("@lifeos/shared", () => ({
        env: buildEnvMock(PORT),
        logger: buildSilentLogger(),
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
        runAgent: vi.fn().mockResolvedValue({ text: "Reply despite 403.", showConfirmationKeyboard: false }),
      }));

      await import("../index.js");
      await waitForPort(PORT);

      handle = {
        port: PORT,
        server: await getServerOnPort(PORT),
        close: () =>
          new Promise((resolve, reject) =>
            (handle.server as http.Server).close((err) =>
              err ? reject(err) : resolve(),
            ),
          ),
      };
    }, 15000);

    afterAll(async () => {
      await handle.close();
      global.fetch = originalFetch;
      vi.resetModules();
    });

    it("returns HTTP 200 when Telegram returns 403", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "Telegram 403 test",
        message_id: 1,
      });
      expect(res.statusCode).toBe(200);
    });

    it("response JSON has text field when Telegram returns 403", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "403 body test",
        message_id: 2,
      });
      const parsed = JSON.parse(res.body) as Record<string, unknown>;
      expect(typeof parsed["text"]).toBe("string");
      expect((parsed["text"] as string).length).toBeGreaterThan(0);
    });
  });

  describe("when Telegram returns a 500 Internal Server Error", () => {
    let handle: ServerHandle;
    let originalFetch: typeof global.fetch;

    beforeAll(async () => {
      vi.resetModules();

      const PORT = 14303;
      originalFetch = global.fetch;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      } as Response);

      vi.doMock("@lifeos/shared", () => ({
        env: buildEnvMock(PORT),
        logger: buildSilentLogger(),
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
        runAgent: vi.fn().mockResolvedValue({ text: "Reply despite Telegram 500.", showConfirmationKeyboard: false }),
      }));

      await import("../index.js");
      await waitForPort(PORT);

      handle = {
        port: PORT,
        server: await getServerOnPort(PORT),
        close: () =>
          new Promise((resolve, reject) =>
            (handle.server as http.Server).close((err) =>
              err ? reject(err) : resolve(),
            ),
          ),
      };
    }, 15000);

    afterAll(async () => {
      await handle.close();
      global.fetch = originalFetch;
      vi.resetModules();
    });

    it("returns HTTP 200 when Telegram returns 500", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "Telegram 500 test",
        message_id: 1,
      });
      expect(res.statusCode).toBe(200);
    });

    it("agent reply is included in response even after Telegram 500", async () => {
      const res = await httpPost(handle.port, "/message", {
        chat_id: 123456,
        text: "500 reply check",
        message_id: 2,
      });
      const parsed = JSON.parse(res.body) as Record<string, unknown>;
      expect(parsed["text"]).toBe("Reply despite Telegram 500.");
    });
  });

  describe("typing indicator is truly fire-and-forget (non-blocking)", () => {
    it("agent response is returned even if Telegram takes a long time to respond", async () => {
      vi.resetModules();

      const PORT = 14304;
      const savedFetch = global.fetch;
      let telegramDelayResolved = false;

      // Simulate a very slow Telegram response (2 seconds)
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("sendChatAction")) {
          return new Promise<Response>((resolve) =>
            setTimeout(() => {
              telegramDelayResolved = true;
              resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve("ok"),
              } as Response);
            }, 2000),
          );
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve("ok"),
        } as Response);
      });

      vi.doMock("@lifeos/shared", () => ({
        env: buildEnvMock(PORT),
        logger: buildSilentLogger(),
        runMigrations: vi.fn().mockResolvedValue(undefined),
        pool: {
          query: vi.fn().mockResolvedValue({ rows: [] }),
          connect: vi.fn().mockResolvedValue({
            query: vi.fn().mockResolvedValue({ rows: [] }),
            release: vi.fn(),
          }),
        },
      }));

      // Agent responds quickly (50ms)
      vi.doMock("../agent.js", () => ({
        runAgent: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, 50));
          return { text: "Fast agent reply.", showConfirmationKeyboard: false };
        }),
      }));

      await import("../index.js");
      await waitForPort(PORT);

      const start = Date.now();
      const res = await httpPost(PORT, "/message", {
        chat_id: 123456,
        text: "non-blocking test",
        message_id: 1,
      });
      const elapsed = Date.now() - start;

      // Agent response should arrive well under 1 second (not blocked by 2s Telegram)
      expect(res.statusCode).toBe(200);
      expect(elapsed).toBeLessThan(1000);

      // Telegram response should NOT have resolved yet (fire-and-forget)
      expect(telegramDelayResolved).toBe(false);

      const server = await getServerOnPort(PORT);
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );

      global.fetch = savedFetch;
      vi.resetModules();
    }, 15000);
  });
});
