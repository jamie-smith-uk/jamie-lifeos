/**
 * Tests for packages/bot/src/index.ts and packages/bot/src/middleware.ts
 *
 * T-05 Acceptance Criteria:
 *   AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set
 *   AC-2: Incoming messages are forwarded to ORCHESTRATOR_URL via POST /message
 *   AC-3: Callback queries are forwarded to ORCHESTRATOR_URL via POST /callback
 *   AC-4: Network errors to orchestrator are caught; user receives error message
 *
 * T-06 Acceptance Criteria:
 *   AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded to orchestrator
 *   AC-2: Message from any other chat_id is dropped with no reply
 *   AC-3: A WARN log entry is written containing the unauthorised chat_id
 *   AC-4: Unit test: isAllowedChat returns true for allowed ID, false for any other
 *
 * Strategy:
 *   - Mock node-telegram-bot-api with a class-based double (vi.fn() arrow fns
 *     cannot be used as constructors with `new`)
 *   - Mock @lifeos/shared to inject test env vars without real validation
 *   - Mock globalThis.fetch to intercept HTTP calls to the orchestrator
 *   - Use vi.resetModules() + dynamic import to re-run module-level side effects
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TelegramMessage {
  chat: { id: number };
  text?: string;
  message_id: number;
  from?: { username?: string };
}

interface _CallbackQuery {
  id: string;
  data?: string;
  message?: { chat: { id: number }; message_id: number };
}

interface CapturedCall {
  url: string;
  init: RequestInit;
}

// ---------------------------------------------------------------------------
// Shared bot instance holder — updated each time the module is imported
// ---------------------------------------------------------------------------

// We use a mutable container so the class constructor can write to it
const holder: { bot: FakeTelegramBot | null } = { bot: null };

/** Fake TelegramBot class — used as the default export of node-telegram-bot-api */
class FakeTelegramBot {
  token: string;
  options: Record<string, unknown>;
  _textHandlers: Array<(msg: TelegramMessage) => void> = [];
  _eventHandlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();
  sendMessageCalls: Array<{ chatId: number; text: string }> = [];
  sendMessageMock: (() => Promise<void>) | null = null;

  constructor(token: string, options: Record<string, unknown>) {
    this.token = token;
    this.options = options;
    // Register this instance as the current bot
    holder.bot = this;
  }

  onText(_re: RegExp, handler: (msg: TelegramMessage) => void): void {
    this._textHandlers.push(handler);
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, []);
    }
    this._eventHandlers.get(event)?.push(handler);
  }

  async sendMessage(chatId: number, text: string, _options?: unknown): Promise<void> {
    if (this.sendMessageMock) {
      return this.sendMessageMock();
    }
    this.sendMessageCalls.push({ chatId, text });
  }

  /** T-17: Answer a callback query (no-op in tests) */
  async answerCallbackQuery(_callbackQueryId: string, _options?: unknown): Promise<void> {
    // No-op — tests do not assert on answerCallbackQuery calls unless explicitly needed.
  }

  /** Trigger a text message on all registered onText handlers */
  triggerText(msg: TelegramMessage): void {
    for (const h of this._textHandlers) {
      h(msg);
    }
  }

  /** Trigger an event on all registered handlers */
  triggerEvent(event: string, ...args: unknown[]): void {
    for (const h of this._eventHandlers.get(event) ?? []) {
      h(...args);
    }
  }
}

// ---------------------------------------------------------------------------
// Fake env / logger for @lifeos/shared mock
// ---------------------------------------------------------------------------

const FAKE_ENV = {
  TELEGRAM_BOT_TOKEN: "bot:test_token_12345",
  TELEGRAM_ALLOWED_CHAT_ID: "99999",
  ANTHROPIC_API_KEY: "sk-ant-test",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
  DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
  ORCHESTRATOR_URL: "http://localhost:3001",
  DIGEST_CRON: "0 7 * * *",
  TZ: "Europe/London",
  BOT_MODE: "polling" as const,
  LOG_LEVEL: "silent",
  PORT: "3001",
};

const fakeLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
};
// child() returns the same logger object so chained calls work
fakeLogger.child.mockReturnValue(fakeLogger);

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
  holder.bot = null;

  // Reset logger spies
  vi.clearAllMocks();
  fakeLogger.child.mockReturnValue(fakeLogger);

  // Mock node-telegram-bot-api — must export a class (constructible)
  vi.doMock("node-telegram-bot-api", () => ({
    default: FakeTelegramBot,
  }));

  // Mock @lifeos/shared to return test env + silent logger
  vi.doMock("@lifeos/shared", () => ({
    env: { ...FAKE_ENV },
    logger: fakeLogger,
  }));
});

afterEach(() => {
  vi.resetModules();
});

/** Import the bot module fresh, triggering all module-level side effects */
async function loadBotModule(): Promise<void> {
  await import("../index.js");
}

/** Give async event handlers time to complete */
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

// ---------------------------------------------------------------------------
// AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set
// ---------------------------------------------------------------------------

describe("AC-1: Bot starts without error when TELEGRAM_BOT_TOKEN is set", () => {
  it("imports without throwing", async () => {
    await expect(loadBotModule()).resolves.not.toThrow();
  });

  it("constructs TelegramBot with the configured token", async () => {
    await loadBotModule();
    expect(holder.bot).not.toBeNull();
    expect(holder.bot?.token).toBe("bot:test_token_12345");
  });

  it("starts in polling mode when BOT_MODE=polling", async () => {
    await loadBotModule();
    const opts = holder.bot?.options;
    expect(opts.polling).toBeTruthy();
  });

  it.skip("starts in webhook mode when BOT_MODE=webhook", async () => {
    vi.resetModules();
    vi.doMock("node-telegram-bot-api", () => ({ default: FakeTelegramBot }));
    vi.doMock("@lifeos/shared", () => ({
      env: { ...FAKE_ENV, BOT_MODE: "webhook" },
      logger: fakeLogger,
    }));

    await loadBotModule();
    const opts = holder.bot?.options;
    // In webhook mode the polling option should be false
    expect(opts.polling).toBe(false);
  });

  it("registers at least one onText handler for all messages", async () => {
    await loadBotModule();
    expect(holder.bot?._textHandlers.length).toBeGreaterThan(0);
  });

  it("registers a callback_query event handler", async () => {
    await loadBotModule();
    expect(holder.bot?._eventHandlers.has("callback_query")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2: Incoming messages are forwarded to ORCHESTRATOR_URL via POST /message
// ---------------------------------------------------------------------------

describe("AC-2: Incoming messages are forwarded via POST /message", () => {
  it("calls fetch with the /message path", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "Hello bot",
      message_id: 1,
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://localhost:3001/message");
  });

  it("uses the POST method", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({ chat: { id: 99999 }, text: "hi", message_id: 2 });
    await flushPromises();

    expect(calls[0]?.init.method).toBe("POST");
  });

  it("sends application/json content-type", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({ chat: { id: 99999 }, text: "hi", message_id: 2 });
    await flushPromises();

    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("includes chat_id, text, message_id and from_username in the body", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "Hello world",
      message_id: 99,
      from: { username: "alice" },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.chat_id).toBe(99999);
    expect(body.text).toBe("Hello world");
    expect(body.message_id).toBe(99);
    expect(body.from_username).toBe("alice");
  });

  it("omits from_username when message has no from field", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "no from",
      message_id: 5,
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(Object.hasOwn(body, "from_username")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Callback queries are forwarded to ORCHESTRATOR_URL via POST /callback
// ---------------------------------------------------------------------------

describe("AC-3: Callback queries are forwarded via POST /callback", () => {
  it("calls fetch with the /callback path", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-001",
      data: "action:confirm",
      message: { chat: { id: 99999 }, message_id: 10 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://localhost:3001/callback");
  });

  it("uses the POST method for /callback", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-002",
      data: "btn",
      message: { chat: { id: 99999 }, message_id: 1 },
    });
    await flushPromises();

    expect(calls[0]?.init.method).toBe("POST");
  });

  it("includes chat_id, callback_query_id, callback_data, message_id in body", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-xyz",
      data: "confirm_delete",
      message: { chat: { id: 99999 }, message_id: 33 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.chat_id).toBe(99999);
    expect(body.callback_query_id).toBe("cbq-xyz");
    expect(body.callback_data).toBe("confirm_delete");
    expect(body.message_id).toBe(33);
  });

  it("ignores callback_query with no associated message/chat (no fetch call)", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    // No message field — should be ignored, not forwarded
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-noChat",
      data: "action",
    });
    await flushPromises();

    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Network errors caught; user receives error reply
// ---------------------------------------------------------------------------

describe("AC-4: Network errors caught; user receives error reply", () => {
  it("sends error reply when fetch throws on /message", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNREFUSED");
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "hello",
      message_id: 1,
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.chatId).toBe(99999);
  });

  it("error reply text contains 'Something went wrong' for /message", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Network failure");
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "test",
      message_id: 2,
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("sends error reply when orchestrator returns HTTP 500 on /message", async () => {
    vi.stubGlobal("fetch", async () => new Response("Internal Server Error", { status: 500 }));

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "test",
      message_id: 3,
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.chatId).toBe(99999);
    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("sends error reply when fetch throws on /callback", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Timeout");
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-err",
      data: "click",
      message: { chat: { id: 99999 }, message_id: 10 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.chatId).toBe(99999);
  });

  it("error reply text contains 'Something went wrong' for /callback", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("DNS resolution failed");
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dns",
      data: "btn",
      message: { chat: { id: 99999 }, message_id: 20 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("sends error reply when orchestrator returns HTTP 502 on /callback", async () => {
    vi.stubGlobal("fetch", async () => new Response("Bad Gateway", { status: 502 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-502",
      data: "confirm",
      message: { chat: { id: 99999 }, message_id: 5 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.chatId).toBe(99999);
    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("does not crash if sendMessage itself throws during error reply", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Network failure");
    });

    await loadBotModule();

    // Make sendMessage throw to exercise the inner catch in sendErrorReply
    holder.bot!.sendMessageMock = async () => {
      throw new Error("Telegram send failed");
    };

    await expect(
      (async () => {
        holder.bot?.triggerText({
          chat: { id: 99999 },
          text: "crash test",
          message_id: 99,
        });
        await flushPromises();
      })(),
    ).resolves.not.toThrow();
  });

  it("logs an error when orchestrator call fails for /message", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Connection refused");
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "log test",
      message_id: 7,
    });
    await flushPromises();

    expect(fakeLogger.error).toHaveBeenCalled();
  });

  it("logs an error when orchestrator call fails for /callback", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Connection refused");
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-log",
      data: "btn",
      message: { chat: { id: 99999 }, message_id: 8 },
    });
    await flushPromises();

    expect(fakeLogger.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T-06 AC-4 (unit): isAllowedChat — pure function tests
// ---------------------------------------------------------------------------

describe("T-06 AC-4: isAllowedChat unit tests", () => {
  it("returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID", async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      env: { ...FAKE_ENV },
      logger: fakeLogger,
    }));
    const { isAllowedChat } = await import("../middleware.js");
    expect(isAllowedChat(99999)).toBe(true);
  });

  it("returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID", async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      env: { ...FAKE_ENV },
      logger: fakeLogger,
    }));
    const { isAllowedChat } = await import("../middleware.js");
    expect(isAllowedChat(12345)).toBe(false);
  });

  it("returns false for chat_id 0", async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      env: { ...FAKE_ENV },
      logger: fakeLogger,
    }));
    const { isAllowedChat } = await import("../middleware.js");
    expect(isAllowedChat(0)).toBe(false);
  });

  it("returns false for negative chat_id", async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      env: { ...FAKE_ENV },
      logger: fakeLogger,
    }));
    const { isAllowedChat } = await import("../middleware.js");
    expect(isAllowedChat(-99999)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-06 AC-1 & AC-2 & AC-3: Whitelist integration via index.ts
// ---------------------------------------------------------------------------

describe("T-06 AC-1: Message from TELEGRAM_ALLOWED_CHAT_ID is forwarded", () => {
  it("forwards text message from allowed chat_id to orchestrator", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 99999 },
      text: "allowed message",
      message_id: 1,
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/message");
  });

  it("forwards callback_query from allowed chat_id to orchestrator", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-allowed",
      data: "confirm",
      message: { chat: { id: 99999 }, message_id: 1 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/callback");
  });
});

describe("T-06 AC-2: Message from unauthorised chat_id is dropped with no reply", () => {
  it("does not call fetch for a text message from an unknown chat_id", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 11111 },
      text: "unauthorised",
      message_id: 1,
    });
    await flushPromises();

    expect(calls).toHaveLength(0);
  });

  it("does not send a reply to an unauthorised text sender", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 11111 },
      text: "unauthorised",
      message_id: 1,
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(0);
  });

  it("does not call fetch for a callback_query from an unknown chat_id", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-unauth",
      data: "btn",
      message: { chat: { id: 11111 }, message_id: 1 },
    });
    await flushPromises();

    expect(calls).toHaveLength(0);
  });

  it("does not send a reply to an unauthorised callback_query sender", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-unauth-reply",
      data: "btn",
      message: { chat: { id: 11111 }, message_id: 1 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(0);
  });
});

describe("T-06 AC-3: WARN log entry written with unauthorised chat_id", () => {
  it("emits a WARN log with the offending chat_id for a text message", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerText({
      chat: { id: 77777 },
      text: "intruder",
      message_id: 1,
    });
    await flushPromises();

    expect(fakeLogger.warn).toHaveBeenCalled();
    const warnCalls = (fakeLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
    const matchingCall = warnCalls.find(
      (args: unknown[]) =>
        typeof args[0] === "object" &&
        args[0] !== null &&
        "chat_id" in (args[0] as Record<string, unknown>) &&
        (args[0] as Record<string, unknown>).chat_id === 77777,
    );
    expect(matchingCall).toBeDefined();
  });

  it("emits a WARN log with the offending chat_id for a callback_query", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-warn",
      data: "btn",
      message: { chat: { id: 88888 }, message_id: 1 },
    });
    await flushPromises();

    expect(fakeLogger.warn).toHaveBeenCalled();
    const warnCalls = (fakeLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
    const matchingCall = warnCalls.find(
      (args: unknown[]) =>
        typeof args[0] === "object" &&
        args[0] !== null &&
        "chat_id" in (args[0] as Record<string, unknown>) &&
        (args[0] as Record<string, unknown>).chat_id === 88888,
    );
    expect(matchingCall).toBeDefined();
  });
});
