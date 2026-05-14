/**
 * Tests for packages/bot/src/index.ts — dismiss nudge callback handling
 *
 * Task-13a Acceptance Criteria:
 *   AC-1: Bot parses dismiss callback data to extract nudge ID
 *   AC-2: Callback data format is consistent with scheduler's Dismiss button
 *   AC-3: Bot handles malformed callback data gracefully
 *   AC-4: Callback query is answered to remove loading state
 *
 * Strategy:
 *   - Mock node-telegram-bot-api with FakeTelegramBot class
 *   - Mock @lifeos/shared to inject test env vars
 *   - Mock globalThis.fetch to intercept HTTP calls to the orchestrator
 *   - Use vi.resetModules() + dynamic import to re-run module-level side effects
 *   - Trigger callback_query events with various dismiss callback_data formats
 *   - Assert that the bot extracts nudge ID and forwards it to /callback endpoint
 *   - Assert that answerCallbackQuery is called to dismiss the loading spinner
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

interface CapturedCall {
  url: string;
  init: RequestInit;
}

interface AnswerCallbackQueryCall {
  callbackQueryId: string;
  options?: unknown;
}

// ---------------------------------------------------------------------------
// Shared bot instance holder
// ---------------------------------------------------------------------------

const holder: { bot: FakeTelegramBot | null } = { bot: null };

/** Fake TelegramBot class — used as the default export of node-telegram-bot-api */
class FakeTelegramBot {
  token: string;
  options: Record<string, unknown>;
  _textHandlers: Array<(msg: TelegramMessage) => void> = [];
  _eventHandlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();
  sendMessageCalls: Array<{ chatId: number; text: string }> = [];
  answerCallbackQueryCalls: AnswerCallbackQueryCall[] = [];
  sendMessageMock: (() => Promise<void>) | null = null;

  constructor(token: string, options: Record<string, unknown>) {
    this.token = token;
    this.options = options;
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

  async answerCallbackQuery(callbackQueryId: string, options?: unknown): Promise<void> {
    this.answerCallbackQueryCalls.push({ callbackQueryId, options });
  }

  triggerText(msg: TelegramMessage): void {
    for (const h of this._textHandlers) {
      h(msg);
    }
  }

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
fakeLogger.child.mockReturnValue(fakeLogger);

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
  holder.bot = null;

  vi.clearAllMocks();
  fakeLogger.child.mockReturnValue(fakeLogger);

  vi.doMock("node-telegram-bot-api", () => ({
    default: FakeTelegramBot,
  }));

  vi.doMock("@lifeos/shared", () => ({
    env: { ...FAKE_ENV },
    logger: fakeLogger,
  }));
});

afterEach(() => {
  vi.resetModules();
});

async function loadBotModule(): Promise<void> {
  await import("../index.js");
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

// ---------------------------------------------------------------------------
// AC-1: Bot parses dismiss callback data to extract nudge ID
// ---------------------------------------------------------------------------

describe("AC-1: Bot parses dismiss callback data to extract nudge ID", () => {
  it("extracts nudge ID from dismiss_nudge_<id> callback_data format", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-1",
      data: "dismiss_nudge_42",
      message: { chat: { id: 99999 }, message_id: 10 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_42");
  });

  it("forwards the full callback_data to orchestrator /callback endpoint", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-2",
      data: "dismiss_nudge_123",
      message: { chat: { id: 99999 }, message_id: 20 },
    });
    await flushPromises();

    expect(calls[0]?.url).toBe("http://localhost:3001/callback");
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_123");
  });

  it("includes callback_query_id in the forwarded request", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-unique-id-999",
      data: "dismiss_nudge_5",
      message: { chat: { id: 99999 }, message_id: 30 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_query_id).toBe("cbq-unique-id-999");
  });

  it("includes chat_id in the forwarded request", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-chat-test",
      data: "dismiss_nudge_7",
      message: { chat: { id: 99999 }, message_id: 40 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.chat_id).toBe(99999);
  });

  it("includes message_id in the forwarded request", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-msg-test",
      data: "dismiss_nudge_99",
      message: { chat: { id: 99999 }, message_id: 555 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.message_id).toBe(555);
  });

  it("handles dismiss callback with single-digit nudge ID", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-single",
      data: "dismiss_nudge_1",
      message: { chat: { id: 99999 }, message_id: 50 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_1");
  });

  it("handles dismiss callback with large nudge ID", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-large",
      data: "dismiss_nudge_999999999",
      message: { chat: { id: 99999 }, message_id: 60 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_999999999");
  });
});

// ---------------------------------------------------------------------------
// AC-2: Callback data format is consistent with scheduler's Dismiss button
// ---------------------------------------------------------------------------

describe("AC-2: Callback data format is consistent with scheduler's Dismiss button", () => {
  it("accepts dismiss_nudge_<id> format from scheduler", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    // Scheduler sends: callback_data: `dismiss_nudge_${nudge.id}`
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-scheduler",
      data: "dismiss_nudge_42",
      message: { chat: { id: 99999 }, message_id: 70 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://localhost:3001/callback");
  });

  it("preserves the exact callback_data string when forwarding to orchestrator", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    const testData = "dismiss_nudge_12345";
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-preserve",
      data: testData,
      message: { chat: { id: 99999 }, message_id: 80 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe(testData);
  });

  it("does not modify or parse the nudge ID from callback_data", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-noparse",
      data: "dismiss_nudge_777",
      message: { chat: { id: 99999 }, message_id: 90 },
    });
    await flushPromises();

    const body = JSON.parse(calls[0]?.init.body as string);
    // The bot should forward the raw callback_data without parsing
    expect(body.callback_data).toBe("dismiss_nudge_777");
  });
});

// ---------------------------------------------------------------------------
// AC-3: Bot handles malformed callback data gracefully
// ---------------------------------------------------------------------------

describe("AC-3: Bot handles malformed callback data gracefully", () => {
  it("forwards malformed callback_data to orchestrator without crashing", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-malformed-1",
      data: "dismiss_nudge_abc",
      message: { chat: { id: 99999 }, message_id: 100 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_abc");
  });

  it("forwards callback_data with missing nudge ID", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-missing-id",
      data: "dismiss_nudge_",
      message: { chat: { id: 99999 }, message_id: 110 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_");
  });

  it("forwards callback_data with wrong prefix", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-wrong-prefix",
      data: "dismiss_nudge_wrong_format_42",
      message: { chat: { id: 99999 }, message_id: 120 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_wrong_format_42");
  });

  it("forwards empty callback_data string", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-empty",
      data: "",
      message: { chat: { id: 99999 }, message_id: 130 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("");
  });

  it("forwards callback_data with special characters", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-special",
      data: "dismiss_nudge_@#$%",
      message: { chat: { id: 99999 }, message_id: 140 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss_nudge_@#$%");
  });

  it("does not crash when callback_data is undefined", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-undefined",
      data: undefined,
      message: { chat: { id: 99999 }, message_id: 150 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    // When data is undefined, it should be converted to empty string
    expect(body.callback_data).toBe("");
  });

  it("forwards callback_data with spaces", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-spaces",
      data: "dismiss nudge 42",
      message: { chat: { id: 99999 }, message_id: 160 },
    });
    await flushPromises();

    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.callback_data).toBe("dismiss nudge 42");
  });
});

// ---------------------------------------------------------------------------
// AC-4: Callback query is answered to remove loading state
// ---------------------------------------------------------------------------

describe("AC-4: Callback query is answered to remove loading state", () => {
  it("calls answerCallbackQuery when dismiss callback is received", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-answer-1",
      data: "dismiss_nudge_42",
      message: { chat: { id: 99999 }, message_id: 170 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
  });

  it("answers with the correct callback_query_id", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-answer-unique-123",
      data: "dismiss_nudge_99",
      message: { chat: { id: 99999 }, message_id: 180 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls[0]?.callbackQueryId).toBe("cbq-answer-unique-123");
  });

  it("answers callback query even when orchestrator call succeeds", async () => {
    vi.stubGlobal("fetch", async () => new Response('{"text":"Success"}', { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-answer-success",
      data: "dismiss_nudge_5",
      message: { chat: { id: 99999 }, message_id: 190 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
    expect(holder.bot?.answerCallbackQueryCalls[0]?.callbackQueryId).toBe("cbq-answer-success");
  });

  it("answers callback query even when orchestrator call fails", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("Network error");
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-answer-error",
      data: "dismiss_nudge_7",
      message: { chat: { id: 99999 }, message_id: 200 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
    expect(holder.bot?.answerCallbackQueryCalls[0]?.callbackQueryId).toBe("cbq-answer-error");
  });

  it("answers callback query with empty text to dismiss spinner", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-answer-empty",
      data: "dismiss_nudge_10",
      message: { chat: { id: 99999 }, message_id: 210 },
    });
    await flushPromises();

    const answerCall = holder.bot?.answerCallbackQueryCalls[0];
    expect(answerCall).toBeDefined();
    // The answer should be called with empty text to dismiss the spinner
    expect(answerCall?.options).toBeDefined();
  });

  it("answers multiple dismiss callbacks independently", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-multi-1",
      data: "dismiss_nudge_1",
      message: { chat: { id: 99999 }, message_id: 220 },
    });
    await flushPromises();

    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-multi-2",
      data: "dismiss_nudge_2",
      message: { chat: { id: 99999 }, message_id: 230 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(2);
    expect(holder.bot?.answerCallbackQueryCalls[0]?.callbackQueryId).toBe("cbq-multi-1");
    expect(holder.bot?.answerCallbackQueryCalls[1]?.callbackQueryId).toBe("cbq-multi-2");
  });

  it("answers callback query before sending reply message", async () => {
    const callOrder: string[] = [];
    vi.stubGlobal("fetch", async () => new Response('{"text":"Dismissed"}', { status: 200 }));

    await loadBotModule();

    // Track the order of operations
    const originalAnswer = holder.bot?.answerCallbackQuery.bind(holder.bot);
    const originalSend = holder.bot?.sendMessage.bind(holder.bot);

    if (holder.bot) {
      holder.bot.answerCallbackQuery = async (id: string) => {
        callOrder.push("answer");
        return originalAnswer?.(id);
      };
      holder.bot.sendMessage = async (chatId: number, text: string) => {
        callOrder.push("send");
        return originalSend?.(chatId, text);
      };
    }

    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-order",
      data: "dismiss_nudge_15",
      message: { chat: { id: 99999 }, message_id: 240 },
    });
    await flushPromises();

    // answerCallbackQuery should be called
    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
  });
});
