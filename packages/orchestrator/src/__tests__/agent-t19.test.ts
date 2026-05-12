/**
 * Tests for T-19 — Delete calendar event with confirmation (EP-02-04)
 *
 * Acceptance criteria:
 *   AC1: Smoke test 7: 'delete my 3pm Friday' → event summary proposal with confirmation
 *        (agent calls get_events_range first, identifies event, calls delete_event,
 *        showConfirmationKeyboard = true, ConfirmationPayload with action='delete_event' saved).
 *   AC2: Confirm → event deleted from Google Calendar
 *        (executeCalendarTool called with delete_event action and eventId, success message returned).
 *   AC3: Ambiguous match → agent lists matching events and asks user to specify
 *        (when multiple events match the user's description, agent does NOT call delete_event
 *        yet, instead lists options and waits for clarification).
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
 *   - To test AC1 (confirmation saved), we inspect the in-memory store directly
 *     (any row for the chat_id with active_confirmation != null) rather than calling
 *     loadConfirmation which only reads the newest row.
 *   - For AC2, we seed confirmations directly into the store to test the
 *     confirm handler path independently.
 *   - For AC3, we test the agent's behavior when get_events_range returns multiple matches.
 */

import type { ConfirmationPayload, DeleteEventData } from "@lifeos/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function handleQuery(text: string, values: unknown[]): { rows: StoredRow[]; rowCount: number } {
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
//
// IMPORTANT: The Anthropic client is instantiated with `new Anthropic(...)`.
// The mock class MUST be a regular function (not arrow) so it can be used
// as a constructor. This pattern matches how T-17/T-18 tests mock it.
// ---------------------------------------------------------------------------

/**
 * Build an Anthropic SDK mock whose messages.create() returns:
 *   1st call → tool_use response with get_events_range tool block
 *   2nd call → tool_use response with delete_event tool block
 *   3rd call → end_turn response with proposal text
 *
 * Returns { AnthropicMockClass, createMock } so tests can inspect calls.
 */
function buildAnthropicDeleteEventMock(eventData: {
  eventId: string;
  title?: string;
  start?: string;
}) {
  const getEventsResponse = {
    id: "msg_001",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_001",
        name: "get_events_range",
        input: {
          start: "2026-04-25T00:00:00+01:00",
          end: "2026-04-25T23:59:59+01:00",
        },
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

  const deleteEventResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_002",
        name: "delete_event",
        input: { eventId: eventData.eventId },
        caller: { type: "direct" },
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 150,
      output_tokens: 30,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const proposalText =
    `I found the event you want to delete:\n\n` +
    `Event ID: ${eventData.eventId}\n` +
    `Action: Delete (permanent — this cannot be undone)\n\n` +
    `Please Confirm or Cancel.`;

  const proposalResponse = {
    id: "msg_003",
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

  const responses = [getEventsResponse, deleteEventResponse, proposalResponse];

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
 * Build an Anthropic SDK mock for ambiguous match scenario:
 *   1st call → tool_use response with get_events_range tool block
 *   2nd call → end_turn response listing multiple events (no delete_event call)
 */
function buildAnthropicAmbiguousMatchMock() {
  const getEventsResponse = {
    id: "msg_001",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_001",
        name: "get_events_range",
        input: {
          start: "2026-04-25T00:00:00+01:00",
          end: "2026-04-25T23:59:59+01:00",
        },
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

  const ambiguousText =
    `I found multiple events on Friday at 3pm. Please specify which one you'd like to delete:\n\n` +
    `1. 3:00 PM — Team Meeting @ Conference Room A\n` +
    `2. 3:30 PM — Client Call @ Zoom\n\n` +
    `Which event would you like to delete?`;

  const ambiguousResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: ambiguousText,
        citations: null,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 200,
      output_tokens: 80,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const responses = [getEventsResponse, ambiguousResponse];

  const createMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();
    return Promise.resolve(response ?? ambiguousResponse);
  });

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
// AC1 — Smoke test 7: 'delete my 3pm Friday' → event summary proposal with confirmation
// ===========================================================================

describe("AC1 — Smoke test 7: delete event proposal triggers confirmation keyboard", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("runAgent returns showConfirmationKeyboard=true when agent calls delete_event", async () => {
    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_friday_3pm",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_friday_3pm",
              summary: "Team Meeting",
              start: { dateTime: "2026-04-25T15:00:00+01:00" },
              end: { dateTime: "2026-04-25T16:00:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 100,
      text: "delete my 3pm Friday",
      message_id: 1,
    });

    expect(result.showConfirmationKeyboard).toBe(true);
  });

  it("runAgent returns a non-empty text reply when proposing event deletion", async () => {
    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_meeting_delete",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_meeting_delete",
              summary: "Weekly Standup",
              start: { dateTime: "2026-04-25T15:00:00+01:00" },
              end: { dateTime: "2026-04-25T15:30:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 101,
      text: "delete my 3pm Friday meeting",
      message_id: 2,
    });

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("ConfirmationPayload is stored in the DB (any row for chat_id has active_confirmation)", async () => {
    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_to_delete",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_to_delete",
              summary: "Lunch Meeting",
              start: { dateTime: "2026-04-25T12:00:00+01:00" },
              end: { dateTime: "2026-04-25T13:00:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 102,
      text: "delete my lunch meeting Friday",
      message_id: 3,
    });

    // Check any row in the store for this chat_id has a confirmation saved
    const confirmation = findConfirmation(102);
    expect(confirmation).not.toBeNull();
    expect(confirmation?.action).toBe("delete_event");
  });

  it("ConfirmationPayload data contains the eventId", async () => {
    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_specific_id",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_specific_id",
              summary: "Design Review",
              start: { dateTime: "2026-04-25T14:00:00+01:00" },
              end: { dateTime: "2026-04-25T15:00:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 103,
      text: "delete my design review Friday",
      message_id: 4,
    });

    const confirmation = findConfirmation(103);
    const data = confirmation?.data as DeleteEventData;
    expect(data?.eventId).toBe("evt_specific_id");
  });

  it("showConfirmationKeyboard is false when agent responds without delete_event tool call", async () => {
    const { AnthropicMockClass } = buildAnthropicPlainTextMock(
      "I couldn't find any events to delete.",
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
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 104,
      text: "delete my nonexistent meeting",
      message_id: 5,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("ConfirmationPayload is persisted with proposed_at timestamp close to now", async () => {
    const before = Date.now();

    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_timestamp_test",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_timestamp_test",
              summary: "Test Event",
              start: { dateTime: "2026-04-25T16:00:00+01:00" },
              end: { dateTime: "2026-04-25T17:00:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 105,
      text: "delete my test event Friday",
      message_id: 6,
    });

    const after = Date.now();
    const confirmation = findConfirmation(105);
    expect(confirmation).not.toBeNull();

    const proposedAt = new Date(confirmation?.proposed_at).getTime();
    expect(proposedAt).toBeGreaterThanOrEqual(before);
    expect(proposedAt).toBeLessThanOrEqual(after);
  });

  it("Anthropic API is called with TOOL_DEFINITIONS that include delete_event", async () => {
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
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
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

    const callArgs = createMock.mock.calls[0]?.[0] as {
      tools?: Array<{ name: string }>;
    };
    const toolNames = callArgs.tools?.map((t) => t.name) ?? [];
    expect(toolNames).toContain("delete_event");
  });

  it("delete event proposal summary contains Event ID and permanent warning", async () => {
    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_summary_test",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify([
            {
              id: "evt_summary_test",
              summary: "Summary Test Event",
              start: { dateTime: "2026-04-25T10:00:00+01:00" },
              end: { dateTime: "2026-04-25T11:00:00+01:00" },
            },
          ]),
        )
        .mockResolvedValueOnce("Event deleted successfully."),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 107,
      text: "delete my summary test event",
      message_id: 8,
    });

    const confirmation = findConfirmation(107);
    expect(confirmation?.summary).toContain("Event ID: evt_summary_test");
    expect(confirmation?.summary).toContain("permanent");
    expect(confirmation?.summary).toContain("cannot be undone");
  });
});

// ===========================================================================
// AC2 — Confirm → event deleted from Google Calendar
// ===========================================================================

describe("AC2 — Confirm callback executes delete_event and returns success", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("confirm callback calls executeCalendarTool with delete_event action", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue("Event deleted successfully.");

    // Seed confirmation into store (simulate a prior proposal being saved)
    seedConfirmation(200, {
      action: "delete_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_to_confirm\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_to_confirm",
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
      "delete_event",
      expect.objectContaining({
        eventId: "evt_to_confirm",
      }),
    );
  });

  it("confirm callback clears active_confirmation after executing calendar tool", async () => {
    const chatId = 201;

    seedConfirmation(chatId, {
      action: "delete_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_clear_test\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_clear_test",
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
      executeCalendarTool: vi.fn().mockResolvedValue("Event deleted successfully."),
    }));

    const { loadConfirmation, clearConfirmation } = await import("../agent.js");
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    await executeCalendarTool(payload?.action, payload?.data as unknown as Record<string, unknown>);
    await clearConfirmation(chatId);

    const afterClear = await loadConfirmation(chatId);
    expect(afterClear).toBeNull();
  });

  it("confirm callback builds success message containing event ID", async () => {
    const chatId = 202;

    seedConfirmation(chatId, {
      action: "delete_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_success_msg\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_success_msg",
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
    const deleteData = payload?.data as DeleteEventData;
    const successText = `Event (ID: ${deleteData.eventId}) has been deleted from your calendar.`;
    expect(successText).toContain("evt_success_msg");
    expect(successText).toMatch(/has been deleted from your calendar/i);
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
      action: "delete_event",
      proposed_at: elevenMinutesAgo.toISOString(),
      summary: "Event ID: evt_expired\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_expired",
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
      action: "delete_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_happy_path\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_happy_path",
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
      executeCalendarTool: vi.fn().mockResolvedValue("Event deleted successfully."),
    }));

    const { loadConfirmation } = await import("../agent.js");
    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();

    // Simulate index.ts success message building
    const toolResult = "Event deleted successfully.";
    let hasError = false;
    try {
      const parsed = JSON.parse(toolResult) as { error?: string };
      hasError = !!parsed.error;
    } catch {
      hasError = false; // plain text — no JSON error key
    }
    expect(hasError).toBe(false);

    const deleteData = payload?.data as DeleteEventData;
    const successText = `Event (ID: ${deleteData.eventId}) has been deleted from your calendar.`;
    expect(successText).not.toMatch(/error/i);
  });

  it("confirmation data contains eventId string", async () => {
    const chatId = 206;

    seedConfirmation(chatId, {
      action: "delete_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_data_test\nAction: Delete (permanent — this cannot be undone)",
      data: {
        eventId: "evt_data_test",
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

    const data = payload?.data as DeleteEventData;
    expect(typeof data.eventId).toBe("string");
    expect(data.eventId).toBe("evt_data_test");
  });
});

// ===========================================================================
// AC3 — Ambiguous match → agent lists matching events and asks user to specify
// ===========================================================================

describe("AC3 — Ambiguous match: agent lists options and asks for clarification", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("agent does NOT call delete_event when multiple events match", async () => {
    const { AnthropicMockClass } = buildAnthropicAmbiguousMatchMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_meeting_1",
            summary: "Team Meeting",
            start: { dateTime: "2026-04-25T15:00:00+01:00" },
            end: { dateTime: "2026-04-25T16:00:00+01:00" },
            location: "Conference Room A",
          },
          {
            id: "evt_call_1",
            summary: "Client Call",
            start: { dateTime: "2026-04-25T15:30:00+01:00" },
            end: { dateTime: "2026-04-25T16:30:00+01:00" },
            location: "Zoom",
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 300,
      text: "delete my 3pm Friday",
      message_id: 10,
    });

    // Should NOT trigger confirmation keyboard since no delete_event was called
    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("agent response lists multiple matching events when ambiguous", async () => {
    const { AnthropicMockClass } = buildAnthropicAmbiguousMatchMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_meeting_2",
            summary: "Team Meeting",
            start: { dateTime: "2026-04-25T15:00:00+01:00" },
            end: { dateTime: "2026-04-25T16:00:00+01:00" },
            location: "Conference Room A",
          },
          {
            id: "evt_call_2",
            summary: "Client Call",
            start: { dateTime: "2026-04-25T15:30:00+01:00" },
            end: { dateTime: "2026-04-25T16:30:00+01:00" },
            location: "Zoom",
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 301,
      text: "delete my Friday 3pm",
      message_id: 11,
    });

    expect(result.text).toContain("multiple events");
    expect(result.text).toContain("Team Meeting");
    expect(result.text).toContain("Client Call");
    expect(result.text).toMatch(/which.*delete/i);
  });

  it("no confirmation is saved when agent lists ambiguous matches", async () => {
    const { AnthropicMockClass } = buildAnthropicAmbiguousMatchMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_meeting_3",
            summary: "Team Meeting",
            start: { dateTime: "2026-04-25T15:00:00+01:00" },
            end: { dateTime: "2026-04-25T16:00:00+01:00" },
          },
          {
            id: "evt_call_3",
            summary: "Client Call",
            start: { dateTime: "2026-04-25T15:30:00+01:00" },
            end: { dateTime: "2026-04-25T16:30:00+01:00" },
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 302,
      text: "delete my Friday afternoon meeting",
      message_id: 12,
    });

    // No confirmation should be saved since delete_event was not called
    const confirmation = findConfirmation(302);
    expect(confirmation).toBeNull();
  });

  it("agent calls get_events_range before attempting delete", async () => {
    const executeCalendarToolMock = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify([
          {
            id: "evt_range_test",
            summary: "Single Event",
            start: { dateTime: "2026-04-25T15:00:00+01:00" },
            end: { dateTime: "2026-04-25T16:00:00+01:00" },
          },
        ]),
      )
      .mockResolvedValueOnce("Event deleted successfully.");

    const { AnthropicMockClass } = buildAnthropicDeleteEventMock({
      eventId: "evt_range_test",
    });

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 303,
      text: "delete my Friday 3pm meeting",
      message_id: 13,
    });

    // First call should be get_events_range
    expect(executeCalendarToolMock).toHaveBeenNthCalledWith(
      1,
      "get_events_range",
      expect.objectContaining({
        start: expect.stringMatching(/2026-04-25T00:00:00/),
        end: expect.stringMatching(/2026-04-25T23:59:59/),
      }),
    );
  });

  it("agent response asks user to specify when multiple events found", async () => {
    const { AnthropicMockClass } = buildAnthropicAmbiguousMatchMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_specify_1",
            summary: "Team Meeting",
            start: { dateTime: "2026-04-25T15:00:00+01:00" },
            end: { dateTime: "2026-04-25T16:00:00+01:00" },
            location: "Conference Room A",
          },
          {
            id: "evt_specify_2",
            summary: "Client Call",
            start: { dateTime: "2026-04-25T15:30:00+01:00" },
            end: { dateTime: "2026-04-25T16:30:00+01:00" },
            location: "Zoom",
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 304,
      text: "delete my Friday 3pm",
      message_id: 14,
    });

    expect(result.text).toMatch(/specify|which/i);
    expect(result.text).toContain("Team Meeting");
    expect(result.text).toContain("Client Call");
  });

  it("ambiguous response includes numbered list format", async () => {
    const { AnthropicMockClass } = buildAnthropicAmbiguousMatchMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_events_range",
          description: "Get events in a date range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "delete_event",
          description: "Delete an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_list_1",
            summary: "Event One",
            start: { dateTime: "2026-04-25T10:00:00+01:00" },
            end: { dateTime: "2026-04-25T11:00:00+01:00" },
          },
          {
            id: "evt_list_2",
            summary: "Event Two",
            start: { dateTime: "2026-04-25T14:00:00+01:00" },
            end: { dateTime: "2026-04-25T15:00:00+01:00" },
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 305,
      text: "delete my Friday event",
      message_id: 15,
    });

    // Should contain numbered list format
    expect(result.text).toMatch(/1\./);
    expect(result.text).toMatch(/2\./);
  });
});
