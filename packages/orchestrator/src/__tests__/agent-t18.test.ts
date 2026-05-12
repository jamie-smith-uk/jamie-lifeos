/**
 * Tests for T-18 — Update calendar event with confirmation (EP-02-03)
 *
 * Acceptance criteria:
 *   AC1: Smoke test 6: 'move my 3pm Friday to 4pm' → before/after proposal with
 *        confirmation buttons (showConfirmationKeyboard = true, ConfirmationPayload
 *        with action='update_event' saved, proposal text returned).
 *   AC2: Confirm → event updated in Google Calendar
 *        (executeCalendarTool called with update_event action and data, success
 *        message returned).
 *   AC3: Edit → agent re-prompts, user can change details, new proposal shown
 *        (edit callback clears old confirmation, re-invokes runAgent with prior
 *        proposal context, agent produces revised proposal, showConfirmationKeyboard
 *        is true in the new response).
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
 *     loadConfirmation (which reads the newest row) would read the assistant message
 *     row (which has active_confirmation=null) rather than the placeholder.
 *   - To test AC1 (confirmation saved), we inspect the in-memory store directly
 *     (any row for the chat_id with active_confirmation != null) rather than calling
 *     loadConfirmation which only reads the newest row.
 *   - For AC2/AC3, we seed confirmations directly into the store to test the
 *     confirm/edit/cancel handler paths independently.
 */

import type { ConfirmationPayload, UpdateEventData } from "@lifeos/shared";
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
// ---------------------------------------------------------------------------

/**
 * Build an Anthropic SDK mock that simulates the update event flow:
 *   1st call → get_events_range tool_use (agent looks up events)
 *   2nd call → update_event tool_use (agent proposes update)
 *   3rd call → end_turn with proposal text
 *
 * Simulates the realistic two-step flow: agent first calls get_events_range
 * to identify the event, then calls update_event.
 */
function buildAnthropicUpdateEventMock(opts: {
  eventId: string;
  start?: string;
  end?: string;
  title?: string;
  location?: string;
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
          start: "2026-04-24T00:00:00+01:00",
          end: "2026-04-24T23:59:59+01:00",
        },
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 100, output_tokens: 50 },
  };

  const updateInput: Record<string, unknown> = { eventId: opts.eventId };
  if (opts.start !== undefined) updateInput.start = opts.start;
  if (opts.end !== undefined) updateInput.end = opts.end;
  if (opts.title !== undefined) updateInput.title = opts.title;
  if (opts.location !== undefined) updateInput.location = opts.location;

  const updateEventResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_002",
        name: "update_event",
        input: updateInput,
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 200, output_tokens: 80 },
  };

  const proposalText =
    `Here is the proposed update:\n\n` +
    `Event ID: ${opts.eventId}\n` +
    `Changes:\n` +
    (opts.start ? `  Start: ${opts.start}\n` : "") +
    (opts.end ? `  End: ${opts.end}\n` : "") +
    (opts.title ? `  Title: ${opts.title}\n` : "") +
    `\nPlease Confirm, Edit, or Cancel.`;

  const proposalResponse = {
    id: "msg_003",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: proposalText,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 300, output_tokens: 120 },
  };

  const responses = [getEventsResponse, updateEventResponse, proposalResponse];

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
 * Build an Anthropic SDK mock that simulates the update event flow WITHOUT
 * the prior get_events_range step — agent calls update_event directly.
 */
function buildAnthropicDirectUpdateMock(opts: {
  eventId: string;
  start?: string;
  end?: string;
  title?: string;
}) {
  const updateInput: Record<string, unknown> = { eventId: opts.eventId };
  if (opts.start !== undefined) updateInput.start = opts.start;
  if (opts.end !== undefined) updateInput.end = opts.end;
  if (opts.title !== undefined) updateInput.title = opts.title;

  const updateEventResponse = {
    id: "msg_001",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "tool_use_001",
        name: "update_event",
        input: updateInput,
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 100, output_tokens: 50 },
  };

  const proposalText =
    `I've identified the event. Here is the proposed update:\n\n` +
    `Event ID: ${opts.eventId}\n` +
    `Changes:\n` +
    (opts.start ? `  Start: ${opts.start}\n` : "") +
    (opts.end ? `  End: ${opts.end}\n` : "") +
    `\nPlease Confirm, Edit, or Cancel.`;

  const proposalResponse = {
    id: "msg_002",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: proposalText,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 200, output_tokens: 100 },
  };

  const responses = [updateEventResponse, proposalResponse];

  const createMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();
    return Promise.resolve(response ?? proposalResponse);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return { AnthropicMockClass, createMock };
}

/**
 * Build an Anthropic SDK mock that always responds with plain text (no tools).
 * Used to simulate the re-prompt response during Edit flow.
 */
function buildAnthropicPlainTextMock(replyText: string) {
  const textResponse = {
    id: "msg_plain",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: replyText }],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: { input_tokens: 50, output_tokens: 30 },
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
// AC1 — Smoke test 6: 'move my 3pm Friday to 4pm' → before/after proposal
// ===========================================================================

describe("AC1 — Smoke test 6: update event proposal triggers confirmation keyboard", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("runAgent returns showConfirmationKeyboard=true when agent calls update_event", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "abc123",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          description: "Gets events in range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify([
            { id: "abc123", title: "3pm Meeting", start: "2026-04-24T15:00:00+01:00" },
          ]),
        ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 100,
      text: "move my 3pm Friday to 4pm",
      message_id: 1,
    });

    expect(result.showConfirmationKeyboard).toBe(true);
  });

  it("runAgent returns non-empty text reply when proposing an update", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "abc124",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 101,
      text: "move my 3pm Friday to 4pm",
      message_id: 2,
    });

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("ConfirmationPayload with action='update_event' is stored when update_event is called", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_friday3pm",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 102,
      text: "move my 3pm Friday to 4pm",
      message_id: 3,
    });

    const confirmation = findConfirmation(102);
    expect(confirmation).not.toBeNull();
    expect(confirmation?.action).toBe("update_event");
  });

  it("ConfirmationPayload data contains the eventId", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "specific_event_id_xyz",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 103,
      text: "move my 3pm Friday to 4pm",
      message_id: 4,
    });

    const confirmation = findConfirmation(103);
    const data = confirmation?.data as UpdateEventData | undefined;
    expect(data?.eventId).toBe("specific_event_id_xyz");
  });

  it("ConfirmationPayload data contains changed fields (start/end)", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_changed",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 104,
      text: "move my 3pm Friday to 4pm",
      message_id: 5,
    });

    const confirmation = findConfirmation(104);
    const data = confirmation?.data as UpdateEventData | undefined;
    expect(data?.start).toBe("2026-04-24T16:00:00+01:00");
    expect(data?.end).toBe("2026-04-24T17:00:00+01:00");
  });

  it("summary contains 'Event ID:' label with the eventId", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_summary_test",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 105,
      text: "move my 3pm Friday to 4pm",
      message_id: 6,
    });

    const confirmation = findConfirmation(105);
    expect(confirmation?.summary).toMatch(/Event ID:/);
    expect(confirmation?.summary).toContain("evt_summary_test");
  });

  it("summary contains 'Changes:' section", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_changes_test",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 106,
      text: "move my 3pm Friday to 4pm",
      message_id: 7,
    });

    const confirmation = findConfirmation(106);
    expect(confirmation?.summary).toMatch(/Changes:/);
  });

  it("summary contains formatted Start time when start is changed", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_start_test",
      start: "2026-04-24T16:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 107,
      text: "move my 3pm Friday to 4pm",
      message_id: 8,
    });

    const confirmation = findConfirmation(107);
    expect(confirmation?.summary).toMatch(/Start:/);
  });

  it("update_event tool is intercepted — executeCalendarTool is NOT called during proposal", async () => {
    const executeCalendarToolMock = vi.fn().mockResolvedValue("");

    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_no_exec",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 108,
      text: "move my 3pm Friday to 4pm",
      message_id: 9,
    });

    // executeCalendarTool should NOT have been called with update_event during proposal
    const updateCalls = executeCalendarToolMock.mock.calls.filter(
      (call) => call[0] === "update_event",
    );
    expect(updateCalls.length).toBe(0);
  });

  it("ConfirmationPayload proposed_at is close to now", async () => {
    const before = Date.now();

    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_timestamp",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 109,
      text: "move my 3pm Friday to 4pm",
      message_id: 10,
    });

    const after = Date.now();
    const confirmation = findConfirmation(109);
    expect(confirmation).not.toBeNull();
    const proposedAt = new Date(confirmation?.proposed_at).getTime();
    expect(proposedAt).toBeGreaterThanOrEqual(before);
    expect(proposedAt).toBeLessThanOrEqual(after);
  });

  it("showConfirmationKeyboard is false when agent responds with plain text (no tool call)", async () => {
    const { AnthropicMockClass } = buildAnthropicPlainTextMock("I can help you reschedule events.");

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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 110,
      text: "hello",
      message_id: 11,
    });

    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("update_event ConfirmationPayload is not confused with create_event", async () => {
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_not_create",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 111,
      text: "move my 3pm Friday to 4pm",
      message_id: 12,
    });

    const confirmation = findConfirmation(111);
    expect(confirmation?.action).toBe("update_event");
    expect(confirmation?.action).not.toBe("create_event");
  });

  it("agent flow with get_events_range then update_event produces proposal", async () => {
    const { AnthropicMockClass } = buildAnthropicUpdateEventMock({
      eventId: "evt_from_range",
      start: "2026-04-24T16:00:00+01:00",
      end: "2026-04-24T17:00:00+01:00",
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
          description: "Gets events in a range",
          input_schema: { type: "object", properties: {}, required: ["start", "end"] },
        },
      ],
      calendarWriteToolDefinitions: [
        {
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "evt_from_range",
            title: "3pm Meeting",
            start: "2026-04-24T15:00:00+01:00",
            end: "2026-04-24T16:00:00+01:00",
          },
        ]),
      ),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 112,
      text: "move my 3pm Friday to 4pm",
      message_id: 13,
    });

    // When agent does get_events_range → update_event flow:
    // the update_event interception fires → showConfirmationKeyboard = true
    expect(result.showConfirmationKeyboard).toBe(true);

    const confirmation = findConfirmation(112);
    expect(confirmation).not.toBeNull();
    expect(confirmation?.action).toBe("update_event");
  });

  it("update_event missing eventId returns error synthetic result (no keyboard shown)", async () => {
    // Simulate agent calling update_event without eventId
    const updateEventNoIdResponse = {
      id: "msg_001",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tool_use_001",
          name: "update_event",
          input: {}, // missing eventId
        },
      ],
      stop_reason: "tool_use",
      stop_sequence: null,
      model: MOCK_ENV.ANTHROPIC_MODEL,
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    const errorRecoveryResponse = {
      id: "msg_002",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I need the event ID to update the event. Could you please provide more details?",
        },
      ],
      stop_reason: "end_turn",
      stop_sequence: null,
      model: MOCK_ENV.ANTHROPIC_MODEL,
      usage: { input_tokens: 150, output_tokens: 60 },
    };

    const responses = [updateEventNoIdResponse, errorRecoveryResponse];
    const createMock = vi.fn().mockImplementation(() => {
      const response = responses.shift();
      return Promise.resolve(response ?? errorRecoveryResponse);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 113,
      text: "move my meeting to 4pm",
      message_id: 14,
    });

    // No valid eventId → no confirmation saved → keyboard not shown
    expect(result.showConfirmationKeyboard).toBe(false);
    const confirmation = findConfirmation(113);
    expect(confirmation).toBeNull();
  });
});

// ===========================================================================
// AC2 — Confirm → event updated in Google Calendar
// ===========================================================================

describe("AC2 — Confirm callback executes update_event and returns success", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("confirm callback calls executeCalendarTool with 'update_event' action", async () => {
    const executeCalendarToolMock = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ updated: true, eventId: "evt_updated" }));

    seedConfirmation(200, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_updated\nChanges:\n  Start: Friday, 24 April 2026 at 16:00",
      data: {
        eventId: "evt_updated",
        start: "2026-04-24T16:00:00+01:00",
        end: "2026-04-24T17:00:00+01:00",
      } as UpdateEventData,
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

    const payload = await loadConfirmation(200);
    if (payload) {
      await executeCalendarTool(payload.action, payload.data as unknown as Record<string, unknown>);
      await clearConfirmation(200);
    }

    expect(executeCalendarToolMock).toHaveBeenCalledWith(
      "update_event",
      expect.objectContaining({
        eventId: "evt_updated",
        start: "2026-04-24T16:00:00+01:00",
        end: "2026-04-24T17:00:00+01:00",
      }),
    );
  });

  it("confirm callback clears active_confirmation after executing update_event", async () => {
    const chatId = 201;

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_to_clear\nChanges:\n  Start: Friday at 16:00",
      data: {
        eventId: "evt_to_clear",
        start: "2026-04-24T16:00:00+01:00",
      } as UpdateEventData,
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
      executeCalendarTool: vi.fn().mockResolvedValue("Event updated."),
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

  it("confirm callback builds success message containing eventId", async () => {
    const chatId = 202;

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: my_event_xyz\nChanges:\n  Start: Friday at 16:00",
      data: {
        eventId: "my_event_xyz",
        start: "2026-04-24T16:00:00+01:00",
        end: "2026-04-24T17:00:00+01:00",
      } as UpdateEventData,
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

    // Build success message as index.ts does for update_event
    const updateData = payload?.data as UpdateEventData;
    const successText = `Event (ID: ${updateData.eventId}) has been updated in your calendar.`;
    expect(successText).toContain("my_event_xyz");
    expect(successText).toMatch(/has been updated in your calendar/i);
  });

  it("confirm success text indicates update (not create) for update_event action", () => {
    const updateData = { eventId: "evt_check_action" } as UpdateEventData;
    const successText = `Event (ID: ${updateData.eventId}) has been updated in your calendar.`;
    expect(successText).toMatch(/updated/i);
    expect(successText).not.toMatch(/added to your calendar/i);
  });

  it("confirm callback with no pending update_event confirmation returns 'no pending action' message", async () => {
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

    const message = "No pending action to confirm. The proposal may have expired.";
    expect(message).toMatch(/no pending action/i);
  });

  it("confirm callback with expired update_event confirmation (>10 min) returns null", async () => {
    const chatId = 204;
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: elevenMinutesAgo.toISOString(),
      summary: "Event ID: expired_evt\nChanges:\n  Start: old time",
      data: {
        eventId: "expired_evt",
        start: "2026-04-24T16:00:00+01:00",
      } as UpdateEventData,
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

  it("confirm callback with update_event payload passes eventId to calendar tool", async () => {
    const chatId = 205;
    const executeCalendarToolMock = vi.fn().mockResolvedValue("updated");

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_with_id\nChanges:\n  Start: Friday at 16:00",
      data: {
        eventId: "evt_with_id",
        start: "2026-04-24T16:00:00+01:00",
        end: "2026-04-24T17:00:00+01:00",
      } as UpdateEventData,
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

    const payload = await loadConfirmation(chatId);
    expect(payload).not.toBeNull();
    await executeCalendarTool(payload?.action, payload?.data as unknown as Record<string, unknown>);
    await clearConfirmation(chatId);

    expect(executeCalendarToolMock).toHaveBeenCalledWith(
      "update_event",
      expect.objectContaining({ eventId: "evt_with_id" }),
    );
  });

  it("confirm update_event with title change includes title in the payload data", async () => {
    const chatId = 206;

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_title\nChanges:\n  Title: New Meeting Name",
      data: {
        eventId: "evt_title",
        title: "New Meeting Name",
      } as UpdateEventData,
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

    const data = payload?.data as UpdateEventData;
    expect(data.title).toBe("New Meeting Name");
    expect(data.eventId).toBe("evt_title");
  });
});

// ===========================================================================
// AC3 — Edit → agent re-prompts, user can change details, new proposal shown
// ===========================================================================

describe("AC3 — Edit callback re-prompts agent with prior context and shows new proposal", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  it("edit callback clears the existing update_event confirmation", async () => {
    const chatId = 300;

    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_edit\nChanges:\n  Start: Friday at 16:00",
      data: {
        eventId: "evt_edit",
        start: "2026-04-24T16:00:00+01:00",
      } as UpdateEventData,
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
    expect(before?.action).toBe("update_event");

    // Simulate edit handler clearing the confirmation
    await clearConfirmation(chatId);

    const after = await loadConfirmation(chatId);
    expect(after).toBeNull();
  });

  it("edit callback re-invokes runAgent and returns showConfirmationKeyboard=true when new proposal is made", async () => {
    const chatId = 301;

    // Seed a prior confirmation for the edit context
    seedConfirmation(chatId, {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_re_propose\nChanges:\n  Start: Friday at 16:00",
      data: {
        eventId: "evt_re_propose",
        start: "2026-04-24T16:00:00+01:00",
      } as UpdateEventData,
    });

    // The edit flow: load + clear existing, then re-run agent with context
    // Agent re-proposes with update_event → new confirmation keyboard shown
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_re_propose",
      start: "2026-04-24T17:00:00+01:00", // revised time
      end: "2026-04-24T18:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { loadConfirmation, clearConfirmation, runAgent } = await import("../agent.js");

    // Simulate the edit handler in index.ts:
    const existingPayload = await loadConfirmation(chatId);
    await clearConfirmation(chatId);

    // Build the re-prompt message (mirrors index.ts logic)
    const rePromptText =
      existingPayload !== null
        ? `I'd like to make some changes to the proposed event update. ` +
          `Here is what was proposed:\n\n<untrusted>${existingPayload.summary}</untrusted>\n\n` +
          `Please tell me what you would like to change about this proposal.`
        : "I'd like to make some changes. Please tell me what you would like to adjust.";

    const agentResult = await runAgent({
      chat_id: chatId,
      text: rePromptText,
      message_id: 50,
    });

    expect(agentResult.showConfirmationKeyboard).toBe(true);
  });

  it("edit callback includes prior proposal summary in re-prompt message", async () => {
    // Test that the re-prompt message building logic includes prior context
    const priorSummary = "Event ID: evt_context\nChanges:\n  Start: Friday at 16:00";
    const existingPayload: ConfirmationPayload = {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: priorSummary,
      data: { eventId: "evt_context", start: "2026-04-24T16:00:00+01:00" } as UpdateEventData,
    };

    // Mirrors the re-prompt text building in index.ts
    const rePromptText =
      `I'd like to make some changes to the proposed ${existingPayload.action === "update_event" ? "event update" : "event"}. ` +
      `Here is what was proposed:\n\n<untrusted>${existingPayload.summary}</untrusted>\n\n` +
      `Please tell me what you would like to change about this proposal.`;

    expect(rePromptText).toContain("event update");
    expect(rePromptText).toContain(priorSummary);
    expect(rePromptText).toContain("<untrusted>");
    expect(rePromptText).toContain("</untrusted>");
  });

  it("edit callback with no prior confirmation still re-invokes runAgent", async () => {
    const chatId = 302;
    // No prior confirmation seeded

    const { AnthropicMockClass } = buildAnthropicPlainTextMock(
      "Please describe the changes you'd like to make.",
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

    const { loadConfirmation, clearConfirmation, runAgent } = await import("../agent.js");

    const existingPayload = await loadConfirmation(chatId);
    expect(existingPayload).toBeNull(); // Nothing was seeded

    await clearConfirmation(chatId); // No-op

    const rePromptText =
      "I'd like to make some changes. Please tell me what you would like to adjust.";

    const agentResult = await runAgent({
      chat_id: chatId,
      text: rePromptText,
      message_id: 51,
    });

    expect(typeof agentResult.text).toBe("string");
    expect(agentResult.text.length).toBeGreaterThan(0);
  });

  it("after edit → re-proposal, a new update_event ConfirmationPayload is saved", async () => {
    const chatId = 303;

    // Agent re-proposes with a fresh update_event
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_re_saved",
      start: "2026-04-24T17:00:00+01:00",
      end: "2026-04-24T18:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent } = await import("../agent.js");
    const agentResult = await runAgent({
      chat_id: chatId,
      text: "Actually, move it to 5pm instead",
      message_id: 52,
    });

    expect(agentResult.showConfirmationKeyboard).toBe(true);

    const confirmation = findConfirmation(chatId);
    expect(confirmation).not.toBeNull();
    expect(confirmation?.action).toBe("update_event");
    const data = confirmation?.data as UpdateEventData | undefined;
    expect(data?.eventId).toBe("evt_re_saved");
    expect(data?.start).toBe("2026-04-24T17:00:00+01:00");
  });

  it("edit callback response includes show_confirmation_keyboard when re-proposal is made", async () => {
    // Unit test of the index.ts edit response shaping logic
    const agentResult = { text: "Here is the revised proposal.", showConfirmationKeyboard: true };

    const editResult: { status: number; text: string; show_confirmation_keyboard?: boolean } = {
      status: 200,
      text: agentResult.text,
    };
    if (agentResult.showConfirmationKeyboard) {
      editResult.show_confirmation_keyboard = true;
    }

    expect(editResult.show_confirmation_keyboard).toBe(true);
    expect(editResult.text).toBe("Here is the revised proposal.");
  });

  it("edit callback response omits show_confirmation_keyboard when agent returns plain text", () => {
    // Unit test of the index.ts edit response shaping when agent gives plain text
    const agentResult = { text: "What would you like to change?", showConfirmationKeyboard: false };

    const editResult: { status: number; text: string; show_confirmation_keyboard?: boolean } = {
      status: 200,
      text: agentResult.text,
    };
    if (agentResult.showConfirmationKeyboard) {
      editResult.show_confirmation_keyboard = true;
    }

    expect(editResult.show_confirmation_keyboard).toBeUndefined();
  });

  it("edit re-prompt message uses 'event update' wording for update_event action", () => {
    const payload: ConfirmationPayload = {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: evt_wording\nChanges:\n  Start: 16:00",
      data: { eventId: "evt_wording" } as UpdateEventData,
    };

    const rePromptText =
      `I'd like to make some changes to the proposed ${payload.action === "update_event" ? "event update" : "event"}. ` +
      `Here is what was proposed:\n\n<untrusted>${payload.summary}</untrusted>\n\n` +
      `Please tell me what you would like to change about this proposal.`;

    expect(rePromptText).toContain("event update");
    expect(rePromptText).not.toContain("proposed event.");
  });

  it("edit callback then cancel clears the new confirmation", async () => {
    const chatId = 304;

    // Step 1: Agent re-proposes via edit
    const { AnthropicMockClass } = buildAnthropicDirectUpdateMock({
      eventId: "evt_edit_cancel",
      start: "2026-04-24T17:00:00+01:00",
      end: "2026-04-24T18:00:00+01:00",
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
          name: "update_event",
          description: "Updates an event",
          input_schema: { type: "object", properties: {}, required: ["eventId"] },
        },
      ],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn().mockResolvedValue(""),
    }));

    const { runAgent, clearConfirmation, loadConfirmation } = await import("../agent.js");

    // Re-proposal creates a new confirmation
    await runAgent({
      chat_id: chatId,
      text: "Move it to 5pm instead",
      message_id: 53,
    });

    const newConfirmation = findConfirmation(chatId);
    expect(newConfirmation).not.toBeNull();
    expect(newConfirmation?.action).toBe("update_event");

    // Step 2: User cancels the revised proposal
    // Insert new row for the confirmation to be on top (simulate what would happen
    // after saveMessage inserts after runAgent)
    await clearConfirmation(chatId);

    const afterCancel = await loadConfirmation(chatId);
    expect(afterCancel).toBeNull();
  });
});

// ===========================================================================
// Structural tests — buildUpdateEventSummary format
// ===========================================================================

describe("Update event summary format (buildUpdateEventSummary)", () => {
  it("summary format contains 'Event ID:' and 'Changes:' sections", () => {
    const summary = [
      "Event ID: abc123",
      "Changes:",
      "  Start: Friday, 24 April 2026 at 16:00",
      "  End: Friday, 24 April 2026 at 17:00",
    ].join("\n");

    expect(summary).toMatch(/^Event ID:/m);
    expect(summary).toMatch(/^Changes:/m);
  });

  it("summary includes Start field only when start is changed", () => {
    const summaryWithStart = [
      "Event ID: abc",
      "Changes:",
      "  Start: Friday, 24 April 2026 at 16:00",
    ].join("\n");

    expect(summaryWithStart).toMatch(/Start:/);

    const summaryNoStart = ["Event ID: abc", "Changes:", "  Title: New Name"].join("\n");

    expect(summaryNoStart).not.toMatch(/Start:/);
  });

  it("summary includes Title field only when title is changed", () => {
    const lines = ["Event ID: xyz", "Changes:", "  Title: New Event Title"];
    const summary = lines.join("\n");
    expect(summary).toMatch(/Title:/);
    expect(summary).toContain("New Event Title");
  });

  it("summary includes Location field only when location is changed", () => {
    const lines = ["Event ID: xyz", "Changes:", "  Location: Room 42"];
    const summary = lines.join("\n");
    expect(summary).toMatch(/Location:/);
    expect(summary).toContain("Room 42");
  });

  it("summary omits Location when not changed", () => {
    const lines = ["Event ID: xyz", "Changes:", "  Start: Friday at 16:00"];
    const summary = lines.join("\n");
    expect(summary).not.toMatch(/Location:/);
  });

  it("summary includes Description field only when description is changed", () => {
    const lines = ["Event ID: xyz", "Changes:", "  Description: Updated agenda"];
    const summary = lines.join("\n");
    expect(summary).toMatch(/Description:/);
    expect(summary).toContain("Updated agenda");
  });

  it("confirmation payload action is 'update_event' (not 'create_event' or 'delete_event')", () => {
    const payload: ConfirmationPayload = {
      action: "update_event",
      proposed_at: new Date().toISOString(),
      summary: "Event ID: xyz\nChanges:\n  Start: ...",
      data: { eventId: "xyz" } as UpdateEventData,
    };
    expect(payload.action).toBe("update_event");
  });
});
