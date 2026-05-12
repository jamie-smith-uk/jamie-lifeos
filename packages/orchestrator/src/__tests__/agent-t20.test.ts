/**
 * Tests for T-20 — Free/busy check (EP-02-05)
 *
 * Acceptance criteria:
 *   AC1: Smoke test 8: 'am I free Thursday afternoon?' → clear free/busy response
 *        The agent resolves the time range, calls check_free_busy, and returns a
 *        plain-language response. The response must mention "free" or "busy".
 *
 *   AC2: If busy, response names the conflicting event.
 *        When check_free_busy returns a busy result, the agent's final text must
 *        name at least one conflicting event in its response.
 *
 *   AC3: No Confirm/Edit/Cancel buttons shown (read-only).
 *        showConfirmationKeyboard must be false for free/busy queries — this is a
 *        read-only operation and must never trigger a confirmation gate.
 *
 * Strategy
 * --------
 * All external dependencies are mocked:
 *   - @lifeos/shared  — pool (in-memory store), env, logger
 *   - @anthropic-ai/sdk — Anthropic class (constructor mock) whose instance returns
 *     a pre-scripted messages.create() sequence
 *   - ../tools/calendar.js — executeCalendarTool mocked so no real MCP call is made
 *
 * Design notes:
 *   - For AC1: The Anthropic mock is scripted to produce a 2-step sequence:
 *       1st call → tool_use response with check_free_busy
 *       2nd call → end_turn response with "You're free Thursday afternoon."
 *     The executeCalendarTool mock returns a "free" result from check_free_busy.
 *     Tests verify the response contains free/busy language and result.text is non-empty.
 *
 *   - For AC2: Same 2-step Anthropic mock, but executeCalendarTool returns a
 *     "busy" MCP result that includes an event name. The final agent text must
 *     name the conflicting event.
 *
 *   - For AC3: Any call with a free/busy intent must produce showConfirmationKeyboard=false.
 *     We test both the "free" and "busy" cases, as well as verifying that check_free_busy
 *     is NOT in CONFIRMATION_GATED_TOOLS by checking it is executed directly.
 *
 *   - Additional unit tests cover the checkFreeBusy executor, checkFreeBusyTool definition,
 *     calendarFreeBusyToolDefinitions export, and the TOOL_DEFINITIONS array in agent.ts
 *     to ensure check_free_busy is wired end-to-end.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store shared by pool mock (mirrors pattern from agent-t19.test.ts)
// ---------------------------------------------------------------------------

interface StoredRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: Date;
  active_confirmation: unknown | null;
}

let store: StoredRow[] = [];
let nextId = 1;

function resetStore(): void {
  store = [];
  nextId = 1;
}

function handleQuery(text: string, values: unknown[]): { rows: StoredRow[]; rowCount: number } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  if (normalised === "BEGIN" || normalised === "COMMIT" || normalised === "ROLLBACK") {
    return { rows: [], rowCount: 0 };
  }

  // INSERT with active_confirmation
  if (
    normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string | null;
    const confirmation = confirmationRaw !== null ? (JSON.parse(confirmationRaw) as unknown) : null;
    store.push({
      id: nextId++,
      chat_id: chatId,
      role: "assistant",
      content: "",
      created_at: new Date(),
      active_confirmation: confirmation,
    });
    return { rows: [], rowCount: 1 };
  }

  // INSERT without active_confirmation (saveMessage path)
  if (normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const role = values[1] as string;
    const content = values[2] as string;
    store.push({
      id: nextId++,
      chat_id: chatId,
      role,
      content,
      created_at: new Date(),
      active_confirmation: null,
    });
    return { rows: [], rowCount: 1 };
  }

  // UPDATE SET active_confirmation (saveConfirmation UPDATE path)
  if (
    normalised.startsWith("UPDATE CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION") &&
    !normalised.includes("NULL")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string;
    const confirmation = JSON.parse(confirmationRaw) as unknown;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    if (forChat.length === 0) return { rows: [], rowCount: 0 };
    const row = store.find((r) => r.id === forChat[0]?.id)!;
    row.active_confirmation = confirmation;
    return { rows: [], rowCount: 1 };
  }

  // UPDATE SET active_confirmation = NULL (clearConfirmation path)
  if (
    normalised.startsWith("UPDATE CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION") &&
    normalised.includes("NULL")
  ) {
    const chatId = values[0] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    if (forChat.length === 0) return { rows: [], rowCount: 0 };
    const row = store.find((r) => r.id === forChat[0]?.id)!;
    row.active_confirmation = null;
    return { rows: [], rowCount: 1 };
  }

  // DELETE (pruning path from saveMessage)
  if (normalised.startsWith("DELETE FROM CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    const keepIds = new Set(forChat.slice(0, limit).map((r) => r.id));
    store = store.filter((r) => r.chat_id !== chatId || keepIds.has(r.id));
    return { rows: [], rowCount: 0 };
  }

  // SELECT active_confirmation (loadConfirmation path)
  if (normalised.includes("ACTIVE_CONFIRMATION")) {
    const chatId = values[0] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    if (forChat.length === 0) return { rows: [], rowCount: 0 };
    return { rows: [forChat[0]!], rowCount: 1 };
  }

  // SELECT (loadContext path)
  if (normalised.startsWith("SELECT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      })
      .slice(0, limit)
      .sort((a, b) => {
        const diff = a.created_at.getTime() - b.created_at.getTime();
        return diff !== 0 ? diff : a.id - b.id;
      });
    return { rows: forChat, rowCount: forChat.length };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Pool mock builder
// ---------------------------------------------------------------------------

function buildPoolMock() {
  const clientQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const clientMock = {
    query: clientQueryMock,
    release: vi.fn(),
  };

  const poolQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const connectMock = vi.fn().mockResolvedValue(clientMock);

  return {
    pool: { query: poolQueryMock, connect: connectMock },
    clientQueryMock,
    clientMock,
    poolQueryMock,
    connectMock,
  };
}

// ---------------------------------------------------------------------------
// Shared env/logger mock values
// ---------------------------------------------------------------------------

const MOCK_ENV = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
  TZ: "Europe/London",
  DATABASE_URL: "postgresql://lifeos:nQPDvKEqqyXNtaKZoGRvCNWExkFhLkyG@localhost:5432/lifeos",
  TELEGRAM_BOT_TOKEN: "bot:test_token",
  TELEGRAM_ALLOWED_CHAT_ID: "123456",
  PORT: "3001",
  BOT_MODE: "polling",
  ORCHESTRATOR_URL: "http://localhost:3001",
  DIGEST_CRON: "0 7 * * *",
  LOG_LEVEL: "silent",
};

const MOCK_LOGGER = {
  child: () => MOCK_LOGGER,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

// ---------------------------------------------------------------------------
// Anthropic SDK mock factories
// ---------------------------------------------------------------------------

/**
 * Build a 2-step Anthropic mock for a free/busy query:
 *   1st call → tool_use with check_free_busy
 *   2nd call → end_turn with the given replyText
 */
function buildAnthropicFreeBusyMock(replyText: string) {
  const checkFreeBusyResponse = {
    id: "msg_001",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_001",
        name: "check_free_busy",
        input: {
          start: "2026-04-23T12:00:00+01:00",
          end: "2026-04-23T17:59:59+01:00",
        },
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const finalResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: replyText, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 150,
      output_tokens: 80,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const responses = [checkFreeBusyResponse, finalResponse];

  const createMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();
    return Promise.resolve(response ?? finalResponse);
  });

  // Must be a regular function (not arrow) for `new` to work
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return { AnthropicMockClass, createMock };
}

/**
 * Build an Anthropic mock that captures the tools passed on the first API call
 * and always responds with a plain text reply (no tools).
 */
function buildAnthropicCapturingToolsMock(replyText: string) {
  let capturedTools: Array<{ name: string }> = [];

  const createMock = vi
    .fn()
    .mockImplementation((params: { tools?: Array<{ name: string }>; model?: string }) => {
      if (capturedTools.length === 0 && params.tools) {
        capturedTools = params.tools;
      }
      return Promise.resolve({
        id: "msg_capture",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: replyText, citations: null }],
        stop_reason: "end_turn",
        stop_sequence: null,
        model: params.model ?? MOCK_ENV.ANTHROPIC_MODEL,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
        },
      });
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return {
    AnthropicMockClass,
    createMock,
    getCapturedTools: () => capturedTools,
  };
}

// ===========================================================================
// AC1 — Smoke test 8: 'am I free Thursday afternoon?' → clear free/busy response
// ===========================================================================

describe("AC1 — Smoke test 8: 'am I free Thursday afternoon?' returns clear free/busy response", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("runAgent returns a non-empty text reply for free/busy query", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 1000,
      text: "am I free Thursday afternoon?",
      message_id: 1,
    });

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent response mentions 'free' when check_free_busy returns no conflicts", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 1001,
      text: "am I free Thursday afternoon?",
      message_id: 2,
    });

    expect(result.text.toLowerCase()).toMatch(/free|available/);
  });

  it("agent calls check_free_busy tool when user asks about availability", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue("You are free during this period.");

    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 1002,
      text: "am I free Thursday afternoon?",
      message_id: 3,
    });

    expect(executeCalendarToolMock).toHaveBeenCalledWith(
      "check_free_busy",
      expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
      }),
    );
  });

  it("agent resolves 'Thursday afternoon' to ISO 8601 start/end parameters", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue("You are free during this period.");

    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 1003,
      text: "am I free Thursday afternoon?",
      message_id: 4,
    });

    const callArgs = executeCalendarToolMock.mock.calls[0] as [
      string,
      { start: string; end: string },
    ];
    const { start, end } = callArgs[1];

    // start and end must be ISO 8601 datetime strings
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([.,]\d+)?(Z|[+-]\d{2}:\d{2})?$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([.,]\d+)?(Z|[+-]\d{2}:\d{2})?$/);
  });

  it("agent response mentions 'Thursday' or 'afternoon' in free response", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 1004,
      text: "am I free Thursday afternoon?",
      message_id: 5,
    });

    expect(result.text.toLowerCase()).toMatch(/thursday|afternoon|free/);
  });

  it("check_free_busy tool is included in TOOL_DEFINITIONS passed to Anthropic API", async () => {
    const { AnthropicMockClass, createMock } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 1005,
      text: "am I free Thursday?",
      message_id: 6,
    });

    const callArgs = createMock.mock.calls[0]?.[0] as {
      tools?: Array<{ name: string }>;
    };
    const toolNames = callArgs.tools?.map((t) => t.name) ?? [];
    expect(toolNames).toContain("check_free_busy");
  });
});

// ===========================================================================
// AC2 — If busy, response names the conflicting event
// ===========================================================================

describe("AC2 — Busy response names the conflicting event", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("agent response names the conflicting event when busy", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Team Standup.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("BUSY: Team Standup (14:00–15:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 2000,
      text: "am I free Thursday afternoon?",
      message_id: 10,
    });

    // Response should name the conflicting event
    expect(result.text).toContain("Team Standup");
  });

  it("agent response indicates 'not free' or 'busy' when there is a conflict", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Design Review.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("BUSY: Design Review (15:00–16:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 2001,
      text: "am I free Thursday afternoon?",
      message_id: 11,
    });

    expect(result.text.toLowerCase()).toMatch(/not free|busy/);
  });

  it("agent response names the event when MCP returns a busy result with event name", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Product Demo.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("BUSY: Product Demo (14:30–15:30)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 2002,
      text: "am I free Thursday afternoon?",
      message_id: 12,
    });

    expect(result.text).toContain("Product Demo");
  });

  it("agent response names multiple conflicting events when there are several", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Team Standup and Design Review.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValue("BUSY: Team Standup (12:00–13:00), Design Review (15:00–16:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 2003,
      text: "am I free Thursday afternoon?",
      message_id: 13,
    });

    // Both conflicting events should be named
    expect(result.text).toContain("Team Standup");
    expect(result.text).toContain("Design Review");
  });

  it("busy response does not include Confirm/Edit/Cancel text", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Client Call.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("BUSY: Client Call (13:00–14:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 2004,
      text: "am I free Thursday afternoon?",
      message_id: 14,
    });

    // The text must not tell the user to confirm/edit/cancel
    expect(result.text.toLowerCase()).not.toMatch(/\bconfirm\b.*\bedit\b.*\bcancel\b/);
  });
});

// ===========================================================================
// AC3 — No Confirm/Edit/Cancel buttons shown (read-only)
// ===========================================================================

describe("AC3 — No Confirm/Edit/Cancel keyboard shown for free/busy queries", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("showConfirmationKeyboard is false when agent calls check_free_busy and user is free", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3000,
      text: "am I free Thursday afternoon?",
      message_id: 20,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("showConfirmationKeyboard is false when agent calls check_free_busy and user is busy", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Team Standup.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("BUSY: Team Standup (14:00–15:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3001,
      text: "am I free Thursday afternoon?",
      message_id: 21,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("showConfirmationKeyboard is false even when check_free_busy returns busy with multiple events", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock(
      "You're not free Thursday afternoon — you have Meeting A and Meeting B.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValue("BUSY: Meeting A (12:00–13:00), Meeting B (14:00–15:00)"),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3002,
      text: "am I free Thursday afternoon?",
      message_id: 22,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("check_free_busy tool is NOT in CONFIRMATION_GATED_TOOLS — it is executed directly", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue("You are free during this period.");

    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 3003,
      text: "am I free Thursday afternoon?",
      message_id: 23,
    });

    // The tool must have been called (i.e., executed directly, not intercepted)
    expect(executeCalendarToolMock).toHaveBeenCalledWith("check_free_busy", expect.any(Object));
  });

  it("no confirmation is saved in DB after a free/busy query", async () => {
    const { AnthropicMockClass } = buildAnthropicFreeBusyMock("You're free Thursday afternoon.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [
        {
          name: "check_free_busy",
          description: "Check if user is free or busy",
          input_schema: {
            type: "object",
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
        },
      ],
      executeCalendarTool: vi.fn().mockResolvedValue("You are free during this period."),
    }));

    const { runAgent } = await import("../agent.js");
    const chatId = 3004;
    await runAgent({
      chat_id: chatId,
      text: "am I free Thursday afternoon?",
      message_id: 24,
    });

    // No row in the store should have an active_confirmation for this chat_id
    const rowsWithConfirmation = store.filter(
      (r) => r.chat_id === chatId && r.active_confirmation !== null,
    );
    expect(rowsWithConfirmation).toHaveLength(0);
  });
});

// Note: checkFreeBusyTool definition tests and checkFreeBusy/executeCalendarTool
// unit tests are covered in calendar-t15.test.ts. This file focuses exclusively
// on the T-20 agent acceptance criteria (AC1, AC2, AC3).
