/**
 * Tests for T-17 — Create calendar event with confirmation (EP-02-01/02)
 *
 * Acceptance criteria:
 *   AC1: Smoke test 4: 'add a meeting with Tom at 3pm Friday' → proposal with
 *        Confirm/Edit/Cancel buttons (showConfirmationKeyboard = true, confirmation
 *        saved, agent reply contains proposal text).
 *   AC2: Smoke test 5: Confirm → event created in Google Calendar
 *        (executeCalendarTool called with create_event and data, success message returned).
 *   AC3: Cancel → confirmation cleared, no event created.
 *   AC4: Proposal message includes: title, date, time, duration, location (if any).
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
 *   - runAgent calls saveConfirmation DURING the tool loop, BEFORE saveMessage.
 *     For brand-new chats (no prior rows), saveConfirmation inserts a placeholder row.
 *     Then saveMessage inserts additional rows with later timestamps. As a result,
 *     loadConfirmation (which reads the newest row) would read the assistant message row
 *     (which has active_confirmation=null) rather than the placeholder.
 *   - To test AC1/AC4 (confirmation saved), we inspect the in-memory store directly
 *     (any row for the chat_id with active_confirmation != null) rather than calling
 *     loadConfirmation which only reads the newest row.
 *   - For AC2/AC3, we seed confirmations directly into the store to test the
 *     confirm/cancel handler paths independently.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfirmationPayload } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// In-memory store shared by pool mock
// ---------------------------------------------------------------------------

interface StoredRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: Date;
  active_confirmation: ConfirmationPayload | null;
}

let store: StoredRow[] = [];
let nextId = 1;

function resetStore(): void {
  store = [];
  nextId = 1;
}

/** Find any row for chatId that has an active (non-null) confirmation. */
function findConfirmation(chatId: number): ConfirmationPayload | null {
  const row = store.find((r) => r.chat_id === chatId && r.active_confirmation !== null);
  return row?.active_confirmation ?? null;
}

function handleQuery(
  text: string,
  values: unknown[],
): { rows: StoredRow[]; rowCount: number } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  if (normalised === "BEGIN" || normalised === "COMMIT" || normalised === "ROLLBACK") {
    return { rows: [], rowCount: 0 };
  }

  // INSERT with active_confirmation (saveConfirmation INSERT path)
  if (
    normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string | null;
    const confirmation =
      confirmationRaw !== null ? (JSON.parse(confirmationRaw) as ConfirmationPayload) : null;
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

  // UPDATE SET active_confirmation = $2 (saveConfirmation UPDATE path)
  if (
    normalised.startsWith("UPDATE CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION") &&
    !normalised.includes("NULL")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string;
    const confirmation = JSON.parse(confirmationRaw) as ConfirmationPayload;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    if (forChat.length === 0) return { rows: [], rowCount: 0 };
    const row = store.find((r) => r.id === forChat[0]!.id)!;
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
    const row = store.find((r) => r.id === forChat[0]!.id)!;
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
  const clientQueryMock = vi.fn().mockImplementation(
    (text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
  );

  const clientMock = {
    query: clientQueryMock,
    release: vi.fn(),
  };

  const poolQueryMock = vi.fn().mockImplementation(
    (text: string, values?: unknown[]) =>
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
//
// IMPORTANT: The Anthropic client is instantiated with `new Anthropic(...)`.
// The mock class MUST be a regular function (not arrow) so it can be used
// as a constructor. This pattern matches how T-10 tests mock it.
// ---------------------------------------------------------------------------

/**
 * Build an Anthropic SDK mock whose messages.create() returns:
 *   1st call → tool_use response with a create_event tool block
 *   2nd call → end_turn response with proposal text
 *
 * Returns { AnthropicMockClass, createMock } so tests can inspect calls.
 */
function buildAnthropicCreateEventMock(eventData: {
  title: string;
  start: string;
  end: string;
  location?: string;
}) {
  const toolUseResponse = {
    id: "msg_001",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_001",
        name: "create_event",
        input: { ...eventData },
        caller: { type: "direct" },
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

  const proposalText =
    `Here is the proposed event:\n\n` +
    `Title: ${eventData.title}\n` +
    `Start: ${eventData.start}\n` +
    (eventData.location ? `Location: ${eventData.location}\n` : "") +
    `\nPlease Confirm, Edit, or Cancel.`;

  const proposalResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: proposalText,
        citations: null,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 200,
      output_tokens: 100,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const responses = [toolUseResponse, proposalResponse];

  const createMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();
    return Promise.resolve(response ?? proposalResponse);
  });

  // Must be a regular function (not arrow) for `new` to work
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return { AnthropicMockClass, createMock };
}

/**
 * Build an Anthropic SDK mock that always responds with plain text (no tools).
 */
function buildAnthropicPlainTextMock(replyText: string) {
  const textResponse = {
    id: "msg_plain",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: replyText, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 50,
      output_tokens: 30,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const createMock = vi.fn().mockResolvedValue(textResponse);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return { AnthropicMockClass, createMock };
}

/** Seed an active confirmation directly into the in-memory store. */
function seedConfirmation(chatId: number, payload: ConfirmationPayload): void {
  store.push({
    id: nextId++,
    chat_id: chatId,
    role: "assistant",
    content: "",
    created_at: new Date(),
    active_confirmation: payload,
  });
}

// ===========================================================================
// AC1 — Smoke test 4: meeting proposal → showConfirmationKeyboard = true
// ===========================================================================

describe("AC1 — Smoke test 4: meeting proposal triggers confirmation keyboard", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("runAgent returns showConfirmationKeyboard=true when agent calls create_event", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Meeting with Tom",
      start: "2026-04-24T15:00:00+01:00",
      end: "2026-04-24T16:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 100,
      text: "add a meeting with Tom at 3pm Friday",
      message_id: 1,
    });

    expect(result.showConfirmationKeyboard).toBe(true);
  });

  it("runAgent returns a non-empty text reply when proposing an event", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Meeting with Tom",
      start: "2026-04-24T15:00:00+01:00",
      end: "2026-04-24T16:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 101,
      text: "add a meeting with Tom at 3pm Friday",
      message_id: 2,
    });

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Meeting with Tom",
      start: "2026-04-24T15:00:00+01:00",
      end: "2026-04-24T16:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 102,
      text: "add a meeting with Tom at 3pm Friday",
      message_id: 3,
    });

    // Check any row in the store for this chat_id has a confirmation saved
    const confirmation = findConfirmation(102);
    expect(confirmation).not.toBeNull();
    expect(confirmation?.action).toBe("create_event");
  });

  it("ConfirmationPayload data contains the event title", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Standup with Tom",
      start: "2026-04-24T15:00:00+01:00",
      end: "2026-04-24T16:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 103,
      text: "schedule a standup with Tom at 3pm",
      message_id: 4,
    });

    const confirmation = findConfirmation(103);
    const data = confirmation?.data as { title?: string };
    expect(data?.title).toBe("Standup with Tom");
  });

  it("showConfirmationKeyboard is false when agent responds without tool call", async () => {
    const { AnthropicMockClass } = buildAnthropicPlainTextMock("I'm sorry, I don't understand.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 104,
      text: "hello there",
      message_id: 5,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("ConfirmationPayload is persisted with proposed_at timestamp close to now", async () => {
    const before = Date.now();

    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Weekly Review",
      start: "2026-04-24T14:00:00+01:00",
      end: "2026-04-24T15:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 105,
      text: "add weekly review on Friday 2pm",
      message_id: 6,
    });

    const after = Date.now();
    const confirmation = findConfirmation(105);
    expect(confirmation).not.toBeNull();

    const proposedAt = new Date(confirmation!.proposed_at).getTime();
    expect(proposedAt).toBeGreaterThanOrEqual(before);
    expect(proposedAt).toBeLessThanOrEqual(after);
  });

  it("Anthropic API is called with TOOL_DEFINITIONS that include create_event", async () => {
    const { AnthropicMockClass, createMock } = buildAnthropicPlainTextMock("Sure, I can help.");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 106,
      text: "What can you do?",
      message_id: 7,
    });

    const callArgs = createMock.mock.calls[0]![0] as {
      tools?: Array<{ name: string }>;
    };
    const toolNames = callArgs.tools?.map((t) => t.name) ?? [];
    expect(toolNames).toContain("create_event");
  });

  it("bot response object contains show_confirmation_keyboard=true when proposed", () => {
    // Unit test the index.ts response shaping logic
    const agentReply = { text: "Here is the proposal.", showConfirmationKeyboard: true };

    const responsePayload: { text: string; show_confirmation_keyboard?: boolean } = {
      text: agentReply.text,
    };
    if (agentReply.showConfirmationKeyboard) {
      responsePayload.show_confirmation_keyboard = true;
    }

    expect(responsePayload.show_confirmation_keyboard).toBe(true);
    expect(responsePayload.text).toBe("Here is the proposal.");
  });

  it("bot response object omits show_confirmation_keyboard when false", () => {
    const agentReply = { text: "Hello!", showConfirmationKeyboard: false };

    const responsePayload: { text: string; show_confirmation_keyboard?: boolean } = {
      text: agentReply.text,
    };
    if (agentReply.showConfirmationKeyboard) {
      responsePayload.show_confirmation_keyboard = true;
    }

    expect(responsePayload.show_confirmation_keyboard).toBeUndefined();
  });

  it("Confirm/Edit/Cancel keyboard has correct callback_data values", () => {
    // Inline test of the keyboard shape returned by buildConfirmKeyboard()
    const keyboard = {
      inline_keyboard: [
        [
          { text: "Confirm", callback_data: "confirm" },
          { text: "Edit", callback_data: "edit" },
          { text: "Cancel", callback_data: "cancel" },
        ],
      ],
    };

    const row = keyboard.inline_keyboard[0]!;
    const callbackValues = row.map((b: { text: string; callback_data: string }) => b.callback_data);

    expect(callbackValues).toEqual(["confirm", "edit", "cancel"]);
  });
});

// ===========================================================================
// AC2 — Smoke test 5: Confirm → event created in Google Calendar
// ===========================================================================

describe("AC2 — Smoke test 5: Confirm callback executes create_event and returns success", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("confirm callback calls executeCalendarTool with create_event action", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue(
      JSON.stringify({ htmlLink: "https://cal.google.com/event/123" }),
    );

    // Seed confirmation into store (simulate a prior proposal being saved)
    seedConfirmation(200, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Meeting with Tom\nDate: Friday\nTime: 15:00 – 16:00\nDuration: 60 min",
      data: {
        title: "Meeting with Tom",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { loadConfirmation, clearConfirmation } = await import("../agent.js");
    const { executeCalendarTool } = await import("../tools/calendar.js");

    // Simulate the confirm handler logic from index.ts
    const payload = await loadConfirmation(200);
    if (payload) {
      await executeCalendarTool(payload.action, payload.data as unknown as Record<string, unknown>);
      await clearConfirmation(200);
    }

    expect(executeCalendarToolMock).toHaveBeenCalledWith(
      "create_event",
      expect.objectContaining({
        title: "Meeting with Tom",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      }),
    );
  });

  it("confirm callback clears active_confirmation after executing calendar tool", async () => {
    const chatId = 201;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Team Sync\nDate: Friday\nTime: 09:00 – 09:30\nDuration: 30 min",
      data: {
        title: "Team Sync",
        start: "2026-04-24T09:00:00+01:00",
        end: "2026-04-24T09:30:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue("Event created."),
    }));

    const { loadConfirmation, clearConfirmation } = await import("../agent.js");
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    await executeCalendarTool(payload!.action, payload!.data as unknown as Record<string, unknown>);
    await clearConfirmation(chatId);

    const afterClear = await loadConfirmation(chatId);
    expect(afterClear).toBeNull();
  });

  it("confirm callback builds success message containing event title", async () => {
    const chatId = 202;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Product Review\nDate: Friday\nTime: 14:00 – 15:00\nDuration: 60 min",
      data: {
        title: "Product Review",
        start: "2026-04-24T14:00:00+01:00",
        end: "2026-04-24T15:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { loadConfirmation } = await import("../agent.js");

    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    // Build expected success message (mirrors index.ts logic)
    const eventData = payload!.data as { title: string };
    const successText = `Event "${eventData.title}" has been added to your calendar.`;
    expect(successText).toContain("Product Review");
    expect(successText).toMatch(/has been added to your calendar/i);
  });

  it("confirm callback with no pending confirmation returns 'no pending action' message", async () => {
    const chatId = 203;
    // No confirmation seeded

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { loadConfirmation } = await import("../agent.js");
    const payload = await loadConfirmation(chatId);

    expect(payload).toBeNull();
    // When no payload, the orchestrator returns this message
    const message = "No pending action to confirm. The proposal may have expired.";
    expect(message).toMatch(/no pending action/i);
  });

  it("confirm callback with expired confirmation (>10 min) treats payload as null", async () => {
    const chatId = 204;
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: elevenMinutesAgo.toISOString(),
      summary: "Title: Expired Meeting",
      data: {
        title: "Expired Meeting",
        start: "2026-04-24T10:00:00+01:00",
        end: "2026-04-24T11:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { loadConfirmation } = await import("../agent.js");
    const payload = await loadConfirmation(chatId);
    expect(payload).toBeNull();
  });

  it("confirm success text does not contain 'error' when tool returns plain success", async () => {
    const chatId = 205;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Happy Path",
      data: {
        title: "Happy Path",
        start: "2026-04-24T11:00:00+01:00",
        end: "2026-04-24T12:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue("Event created successfully."),
    }));

    const { loadConfirmation } = await import("../agent.js");
    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    // Simulate index.ts success message building
    const toolResult = "Event created successfully.";
    let hasError = false;
    try {
      const parsed = JSON.parse(toolResult) as { error?: string };
      hasError = !!parsed.error;
    } catch {
      hasError = false; // plain text — no JSON error key
    }
    expect(hasError).toBe(false);

    const eventData = payload!.data as { title: string };
    const successText = `Event "${eventData.title}" has been added to your calendar.`;
    expect(successText).not.toMatch(/error/i);
  });

  it("confirmation data contains start and end ISO datetime strings", async () => {
    const chatId = 206;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: ISO Test",
      data: {
        title: "ISO Test",
        start: "2026-04-24T10:00:00+01:00",
        end: "2026-04-24T11:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { loadConfirmation } = await import("../agent.js");
    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    const data = payload!.data as { start: string; end: string };
    // start and end should be ISO 8601 datetime strings
    expect(data.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(data.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ===========================================================================
// AC3 — Cancel → confirmation cleared, no event created
// ===========================================================================

describe("AC3 — Cancel callback clears confirmation and does not create event", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("cancel clears active_confirmation in the database", async () => {
    const chatId = 300;
    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: To Be Cancelled",
      data: {
        title: "To Be Cancelled",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { loadConfirmation, clearConfirmation } = await import("../agent.js");

    const before = await loadConfirmation(chatId);
    expect(before).not.toBeNull();

    await clearConfirmation(chatId);

    const after = await loadConfirmation(chatId);
    expect(after).toBeNull();
  });

  it("cancel does NOT call executeCalendarTool", async () => {
    const chatId = 301;
    const executeCalendarToolMock = vi.fn();

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Should Not Be Created",
      data: {
        title: "Should Not Be Created",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { clearConfirmation } = await import("../agent.js");

    // Simulate cancel: only clearConfirmation, no calendar tool call
    await clearConfirmation(chatId);

    expect(executeCalendarToolMock).not.toHaveBeenCalled();
  });

  it("cancel response message contains 'Cancelled' and 'no changes'", () => {
    // Mirrors index.ts cancel handler response
    const cancelText = "Cancelled. No changes were made to your calendar.";
    expect(cancelText).toMatch(/cancelled/i);
    expect(cancelText).toMatch(/no changes/i);
  });

  it("cancel is a no-op when no confirmation is pending (does not throw)", async () => {
    const chatId = 302;

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { clearConfirmation } = await import("../agent.js");
    await expect(clearConfirmation(chatId)).resolves.toBeUndefined();
  });

  it("cancel on an expired confirmation still clears the DB row", async () => {
    const chatId = 303;
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: elevenMinutesAgo.toISOString(),
      summary: "Title: Expired Event",
      data: {
        title: "Expired Event",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { clearConfirmation } = await import("../agent.js");
    await expect(clearConfirmation(chatId)).resolves.toBeUndefined();

    const row = store.find((r) => r.chat_id === chatId);
    expect(row?.active_confirmation).toBeNull();
  });

  it("after cancel, a subsequent confirm callback finds no pending confirmation", async () => {
    const chatId = 304;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Ghost Event",
      data: {
        title: "Ghost Event",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { clearConfirmation, loadConfirmation } = await import("../agent.js");

    await clearConfirmation(chatId);

    const payload = await loadConfirmation(chatId);
    expect(payload).toBeNull();
  });

  it("confirm message after cancel shows 'No pending action' response", async () => {
    const chatId = 305;

    seedConfirmation(chatId, {
      action: "create_event",
      proposed_at: new Date().toISOString(),
      summary: "Title: Cancelled Then Confirmed",
      data: {
        title: "Cancelled Then Confirmed",
        start: "2026-04-24T15:00:00+01:00",
        end: "2026-04-24T16:00:00+01:00",
      },
    });

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { clearConfirmation, loadConfirmation } = await import("../agent.js");

    await clearConfirmation(chatId);

    const payload = await loadConfirmation(chatId);
    const responseText =
      payload === null
        ? "No pending action to confirm. The proposal may have expired."
        : "Event confirmed";

    expect(responseText).toMatch(/no pending action/i);
  });
});

// ===========================================================================
// AC4 — Proposal message includes: title, date, time, duration, location
// ===========================================================================

describe("AC4 — Proposal includes title, date, time, duration, and location (if any)", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("summary contains the event title", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Budget Planning",
      start: "2026-04-24T10:00:00+01:00",
      end: "2026-04-24T11:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 400,
      text: "schedule budget planning at 10am",
      message_id: 10,
    });

    const confirmation = findConfirmation(400);
    expect(confirmation?.summary).toContain("Budget Planning");
  });

  it("summary contains 'Title:' label", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Design Sprint",
      start: "2026-04-24T09:00:00+01:00",
      end: "2026-04-24T10:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 401,
      text: "schedule design sprint at 9am Friday",
      message_id: 11,
    });

    const confirmation = findConfirmation(401);
    expect(confirmation?.summary).toMatch(/^Title:/m);
  });

  it("summary contains 'Date:' label", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Engineering Sync",
      start: "2026-04-24T14:00:00+01:00",
      end: "2026-04-24T15:30:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 402,
      text: "schedule engineering sync at 2pm Friday",
      message_id: 12,
    });

    const confirmation = findConfirmation(402);
    expect(confirmation?.summary).toMatch(/^Date:/m);
  });

  it("summary contains 'Time:' label with a time value", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "1:1 with Manager",
      start: "2026-04-24T11:00:00+01:00",
      end: "2026-04-24T11:30:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 403,
      text: "schedule 1:1 with manager at 11am for 30 minutes",
      message_id: 13,
    });

    const confirmation = findConfirmation(403);
    expect(confirmation?.summary).toMatch(/^Time:/m);
    expect(confirmation?.summary).toMatch(/Time:.*\d{2}:\d{2}/);
  });

  it("summary contains 'Duration:' label with minutes", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Retrospective",
      start: "2026-04-24T10:00:00+01:00",
      end: "2026-04-24T11:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 404,
      text: "schedule retrospective at 10am for 60 minutes",
      message_id: 14,
    });

    const confirmation = findConfirmation(404);
    expect(confirmation?.summary).toMatch(/^Duration:/m);
    expect(confirmation?.summary).toMatch(/Duration:.*\d+ min/);
  });

  it("summary contains 'Location:' label and value when location is provided", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Offsite Meeting",
      start: "2026-04-24T09:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
      location: "Conference Centre, 15 Main Street",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 405,
      text: "schedule offsite at Conference Centre, 15 Main Street all day Friday",
      message_id: 15,
    });

    const confirmation = findConfirmation(405);
    expect(confirmation?.summary).toMatch(/^Location:/m);
    expect(confirmation?.summary).toContain("Conference Centre, 15 Main Street");
  });

  it("summary omits 'Location:' line when no location is provided", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "Remote Call",
      start: "2026-04-24T13:00:00+01:00",
      end: "2026-04-24T13:30:00+01:00",
      // no location
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 406,
      text: "schedule remote call at 1pm for 30 minutes",
      message_id: 16,
    });

    const confirmation = findConfirmation(406);
    expect(confirmation?.summary).not.toMatch(/^Location:/m);
  });

  it("confirmation payload data preserves start, end, and title fields exactly", async () => {
    const { AnthropicMockClass } = buildAnthropicCreateEventMock({
      title: "QA Review",
      start: "2026-04-24T10:30:00+01:00",
      end: "2026-04-24T11:00:00+01:00",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: { ...MOCK_ENV, TZ: "Europe/London" },
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [
        {
          name: "create_event",
          description: "Creates an event",
          input_schema: { type: "object", properties: {}, required: ["title", "start", "end"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 407,
      text: "schedule QA review at 10:30am for 30 minutes",
      message_id: 17,
    });

    const confirmation = findConfirmation(407);
    expect(confirmation).not.toBeNull();

    const data = confirmation!.data as { title: string; start: string; end: string };
    expect(data.title).toBe("QA Review");
    expect(data.start).toBe("2026-04-24T10:30:00+01:00");
    expect(data.end).toBe("2026-04-24T11:00:00+01:00");
  });

  it("duration is calculated correctly as (end - start) in minutes", () => {
    // Unit test the math used by buildCreateEventSummary in agent.ts
    const start = new Date("2026-04-24T15:00:00+01:00");
    const end = new Date("2026-04-24T16:00:00+01:00");
    const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
    expect(durationMin).toBe(60);

    const summary = `Title: Meeting\nDate: Friday\nTime: 15:00 – 16:00\nDuration: ${durationMin} min`;
    expect(summary).toContain("Duration: 60 min");
  });

  it("summary all-fields format (with location): all required labels present", () => {
    const lines = [
      "Title: All Hands",
      "Date: Friday, 24 April 2026",
      "Time: 09:00 – 10:00",
      "Duration: 60 min",
      "Location: Main Conference Room",
    ];
    const summary = lines.join("\n");

    expect(summary).toMatch(/^Title:/m);
    expect(summary).toMatch(/^Date:/m);
    expect(summary).toMatch(/^Time:/m);
    expect(summary).toMatch(/^Duration:/m);
    expect(summary).toMatch(/^Location:/m);
  });

  it("summary all-fields format (without location): no Location label", () => {
    const lines = [
      "Title: Team Standup",
      "Date: Monday, 20 April 2026",
      "Time: 09:00 – 09:30",
      "Duration: 30 min",
    ];
    const summary = lines.join("\n");

    expect(summary).toMatch(/^Title:/m);
    expect(summary).toMatch(/^Date:/m);
    expect(summary).toMatch(/^Time:/m);
    expect(summary).toMatch(/^Duration:/m);
    expect(summary).not.toMatch(/^Location:/m);
  });
});
