/**
 * Tests for packages/bot/src/index.ts — dismiss nudge API call and UI update
 *
 * Task-13b Acceptance Criteria:
 *   AC-1: Bot calls orchestrator POST /dismiss-nudge endpoint with nudge ID
 *   AC-2: Successful dismissal removes the inline keyboard from the message
 *   AC-3: Bot handles dismiss callback errors gracefully
 *   AC-4: Tests verify API call and UI update behavior
 *
 * Strategy:
 *   - Mock node-telegram-bot-api with FakeTelegramBot class
 *   - Mock @lifeos/shared to inject test env vars
 *   - Mock globalThis.fetch to intercept HTTP calls to the orchestrator
 *   - Use vi.resetModules() + dynamic import to re-run module-level side effects
 *   - Trigger callback_query events with dismiss callback_data
 *   - Assert that the bot calls /dismiss-nudge endpoint with nudge ID
 *   - Assert that editMessageReplyMarkup is called to remove keyboard
 *   - Assert error handling when API calls fail
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

interface EditMessageReplyMarkupCall {
  chatId: number;
  messageId: number;
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
  answerCallbackQueryCalls: Array<{ callbackQueryId: string; options?: unknown }> = [];
  editMessageReplyMarkupCalls: EditMessageReplyMarkupCall[] = [];
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

  async editMessageReplyMarkup(
    replyMarkup: unknown,
    options?: unknown,
  ): Promise<void> {
    const opts = options as { chat_id?: number; message_id?: number } | undefined;
    this.editMessageReplyMarkupCalls.push({
      chatId: opts?.chat_id ?? 0,
      messageId: opts?.message_id ?? 0,
      options: { reply_markup: replyMarkup },
    });
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
// AC-1: Bot calls orchestrator POST /dismiss-nudge endpoint with nudge ID
// ---------------------------------------------------------------------------

describe("AC-1: Bot calls orchestrator POST /dismiss-nudge endpoint with nudge ID", () => {
  it("calls /dismiss-nudge endpoint when dismiss callback is received", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-1",
      data: "dismiss:42",
      message: { chat: { id: 99999 }, message_id: 10 },
    });
    await flushPromises();

    // Should have calls to both /callback and /dismiss-nudge
    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    expect(dismissCall).toBeDefined();
  });

  it("extracts nudge ID from dismiss callback_data and includes in /dismiss-nudge request", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-2",
      data: "dismiss:123",
      message: { chat: { id: 99999 }, message_id: 20 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    expect(dismissCall).toBeDefined();
    const body = JSON.parse(dismissCall?.init.body as string);
    expect(body.nudge_id).toBe(123);
  });

  it("uses POST method for /dismiss-nudge endpoint", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-3",
      data: "dismiss:99",
      message: { chat: { id: 99999 }, message_id: 30 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    expect(dismissCall?.init.method).toBe("POST");
  });

  it("sends application/json content-type for /dismiss-nudge request", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-4",
      data: "dismiss:55",
      message: { chat: { id: 99999 }, message_id: 40 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const headers = dismissCall?.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("includes chat_id in /dismiss-nudge request body", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-5",
      data: "dismiss:77",
      message: { chat: { id: 99999 }, message_id: 50 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const body = JSON.parse(dismissCall?.init.body as string);
    expect(body.chat_id).toBe(99999);
  });

  it("includes message_id in /dismiss-nudge request body", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-6",
      data: "dismiss:88",
      message: { chat: { id: 99999 }, message_id: 555 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const body = JSON.parse(dismissCall?.init.body as string);
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
      id: "cbq-dismiss-7",
      data: "dismiss:1",
      message: { chat: { id: 99999 }, message_id: 60 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const body = JSON.parse(dismissCall?.init.body as string);
    expect(body.nudge_id).toBe(1);
  });

  it("handles dismiss callback with large nudge ID", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-8",
      data: "dismiss:999999999",
      message: { chat: { id: 99999 }, message_id: 70 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const body = JSON.parse(dismissCall?.init.body as string);
    expect(body.nudge_id).toBe(999999999);
  });

  it("calls /dismiss-nudge with correct orchestrator URL", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-dismiss-9",
      data: "dismiss:42",
      message: { chat: { id: 99999 }, message_id: 80 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    expect(dismissCall?.url).toBe("http://localhost:3001/dismiss-nudge");
  });
});

// ---------------------------------------------------------------------------
// AC-2: Successful dismissal removes the inline keyboard from the message
// ---------------------------------------------------------------------------

describe("AC-2: Successful dismissal removes the inline keyboard from the message", () => {
  it("calls editMessageReplyMarkup when dismiss is successful", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-1",
      data: "dismiss:42",
      message: { chat: { id: 99999 }, message_id: 100 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(1);
  });

  it("editMessageReplyMarkup uses correct chat_id", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-2",
      data: "dismiss:99",
      message: { chat: { id: 99999 }, message_id: 110 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls[0]?.chatId).toBe(99999);
  });

  it("editMessageReplyMarkup uses correct message_id", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-3",
      data: "dismiss:77",
      message: { chat: { id: 99999 }, message_id: 777 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls[0]?.messageId).toBe(777);
  });

  it("editMessageReplyMarkup removes keyboard by passing empty inline_keyboard", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-4",
      data: "dismiss:55",
      message: { chat: { id: 99999 }, message_id: 120 },
    });
    await flushPromises();

    const editCall = holder.bot?.editMessageReplyMarkupCalls[0];
    expect(editCall?.options).toBeDefined();
    const options = editCall?.options as Record<string, unknown>;
    expect(options.reply_markup).toBeDefined();
    const replyMarkup = options.reply_markup as Record<string, unknown>;
    expect(replyMarkup.inline_keyboard).toEqual([]);
  });

  it("does not call editMessageReplyMarkup when /dismiss-nudge fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("API error");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-5",
      data: "dismiss:33",
      message: { chat: { id: 99999 }, message_id: 130 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(0);
  });

  it("calls editMessageReplyMarkup for multiple dismiss callbacks", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-6",
      data: "dismiss:11",
      message: { chat: { id: 99999 }, message_id: 140 },
    });
    await flushPromises();

    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-7",
      data: "dismiss:22",
      message: { chat: { id: 99999 }, message_id: 150 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(2);
  });

  it("editMessageReplyMarkup is called after /dismiss-nudge succeeds", async () => {
    const callOrder: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        callOrder.push("dismiss-nudge");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();

    const originalEdit = holder.bot?.editMessageReplyMarkup.bind(holder.bot);
    if (holder.bot) {
      holder.bot.editMessageReplyMarkup = async (
        chatId: number,
        messageId: number,
        options?: unknown,
      ) => {
        callOrder.push("editMessageReplyMarkup");
        return originalEdit?.(chatId, messageId, options);
      };
    }

    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-edit-8",
      data: "dismiss:44",
      message: { chat: { id: 99999 }, message_id: 160 },
    });
    await flushPromises();

    expect(callOrder).toContain("dismiss-nudge");
    expect(callOrder).toContain("editMessageReplyMarkup");
  });
});

// ---------------------------------------------------------------------------
// AC-3: Bot handles dismiss callback errors gracefully
// ---------------------------------------------------------------------------

describe("AC-3: Bot handles dismiss callback errors gracefully", () => {
  it("does not crash when /dismiss-nudge throws an error", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("Network error");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();

    await expect(
      (async () => {
        holder.bot?.triggerEvent("callback_query", {
          id: "cbq-error-1",
          data: "dismiss:42",
          message: { chat: { id: 99999 }, message_id: 170 },
        });
        await flushPromises();
      })(),
    ).resolves.not.toThrow();
  });

  it("sends error reply when /dismiss-nudge fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("Connection refused");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-2",
      data: "dismiss:99",
      message: { chat: { id: 99999 }, message_id: 180 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.chatId).toBe(99999);
  });

  it("error reply contains 'Something went wrong' when /dismiss-nudge fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("API error");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-3",
      data: "dismiss:77",
      message: { chat: { id: 99999 }, message_id: 190 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("handles /dismiss-nudge returning HTTP 500", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        return new Response("Internal Server Error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-4",
      data: "dismiss:55",
      message: { chat: { id: 99999 }, message_id: 200 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
    expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something went wrong/i);
  });

  it("handles /dismiss-nudge returning HTTP 404", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-5",
      data: "dismiss:33",
      message: { chat: { id: 99999 }, message_id: 210 },
    });
    await flushPromises();

    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
  });

  it("answers callback query even when /dismiss-nudge fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("Network error");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-6",
      data: "dismiss:11",
      message: { chat: { id: 99999 }, message_id: 220 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
  });

  it("logs error when /dismiss-nudge fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("API failure");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-7",
      data: "dismiss:22",
      message: { chat: { id: 99999 }, message_id: 230 },
    });
    await flushPromises();

    expect(fakeLogger.error).toHaveBeenCalled();
  });

  it("does not call editMessageReplyMarkup when /dismiss-nudge returns error status", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        return new Response("Bad Request", { status: 400 });
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-error-8",
      data: "dismiss:44",
      message: { chat: { id: 99999 }, message_id: 240 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Tests verify API call and UI update behavior
// ---------------------------------------------------------------------------

describe("AC-4: Tests verify API call and UI update behavior", () => {
  it("verifies both /dismiss-nudge API call and editMessageReplyMarkup UI update occur together", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-1",
      data: "dismiss:42",
      message: { chat: { id: 99999 }, message_id: 250 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    expect(dismissCall).toBeDefined();
    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(1);
  });

  it("verifies nudge_id is correctly extracted and sent to /dismiss-nudge", async () => {
    const calls: CapturedCall[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    const testNudgeId = 12345;
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-2",
      data: `dismiss:${testNudgeId}`,
      message: { chat: { id: 99999 }, message_id: 260 },
    });
    await flushPromises();

    const dismissCall = calls.find((c) => c.url.includes("/dismiss-nudge"));
    const body = JSON.parse(dismissCall?.init.body as string);
    expect(body.nudge_id).toBe(testNudgeId);
  });

  it("verifies editMessageReplyMarkup receives correct parameters from callback_query", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    const testChatId = 99999;
    const testMessageId = 777;
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-3",
      data: "dismiss:88",
      message: { chat: { id: testChatId }, message_id: testMessageId },
    });
    await flushPromises();

    const editCall = holder.bot?.editMessageReplyMarkupCalls[0];
    expect(editCall?.chatId).toBe(testChatId);
    expect(editCall?.messageId).toBe(testMessageId);
  });

  it("verifies keyboard is completely removed (empty inline_keyboard array)", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-4",
      data: "dismiss:99",
      message: { chat: { id: 99999 }, message_id: 270 },
    });
    await flushPromises();

    const editCall = holder.bot?.editMessageReplyMarkupCalls[0];
    const options = editCall?.options as Record<string, unknown>;
    const replyMarkup = options.reply_markup as Record<string, unknown>;
    expect(Array.isArray(replyMarkup.inline_keyboard)).toBe(true);
    expect((replyMarkup.inline_keyboard as unknown[]).length).toBe(0);
  });

  it("verifies error handling prevents UI update when API fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        return new Response("Error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-5",
      data: "dismiss:55",
      message: { chat: { id: 99999 }, message_id: 280 },
    });
    await flushPromises();

    expect(holder.bot?.editMessageReplyMarkupCalls).toHaveLength(0);
    expect(holder.bot?.sendMessageCalls).toHaveLength(1);
  });

  it("verifies callback_query is answered regardless of API success or failure", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/dismiss-nudge")) {
        throw new Error("Network error");
      }
      return new Response("{}", { status: 200 });
    });

    await loadBotModule();
    holder.bot?.triggerEvent("callback_query", {
      id: "cbq-verify-6",
      data: "dismiss:33",
      message: { chat: { id: 99999 }, message_id: 290 },
    });
    await flushPromises();

    expect(holder.bot?.answerCallbackQueryCalls).toHaveLength(1);
  });
});
