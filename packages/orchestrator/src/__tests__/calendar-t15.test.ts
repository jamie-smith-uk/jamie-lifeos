/**
 * Tests for T-15 — Calendar write tool wrappers
 *
 * Acceptance criteria:
 *   AC1: create_event, update_event, delete_event, check_free_busy tool definitions exported
 *   AC2: All four tools included in agent's tool definitions array
 *   AC3: Tool functions accept correct TypeScript types matching MCP contracts
 *
 * Strategy
 * --------
 * - The Google Calendar MCP server (fetch) is fully mocked — no real network calls.
 * - The Anthropic SDK is mocked — no real API calls.
 * - @lifeos/shared (pool, env, logger) is mocked.
 * - Tests verify:
 *     a) All four write tool definition objects are exported from calendar.ts.
 *     b) Each tool definition has correct name, description, and input_schema.
 *     c) Required fields are marked correctly in each schema.
 *     d) Optional fields (location, description, attendees) are NOT in required arrays.
 *     e) calendarWriteToolDefinitions array contains all four tools.
 *     f) TOOL_DEFINITIONS passed to Anthropic API includes all four write tools.
 *     g) Executor functions accept correct params and call MCP with correct arguments.
 *     h) Validation errors are returned for missing/invalid params (not thrown).
 *     i) Empty MCP responses produce graceful fallback strings.
 *     j) MCP errors are caught and returned as structured JSON error strings.
 * - All tests use vi.resetModules() + vi.doMock() for full module isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silent logger mock. */
function buildLoggerMock() {
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

/** Silent pool mock that returns empty rows. */
function buildPoolMock() {
  const clientQuery = vi.fn().mockImplementation((text: string) => {
    const norm = text.trim().toUpperCase();
    if (norm === "BEGIN" || norm === "COMMIT" || norm === "ROLLBACK") {
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rows: [] });
  });
  const clientMock = { query: clientQuery, release: vi.fn() };

  return {
    pool: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn().mockResolvedValue(clientMock),
    },
    clientQuery,
  };
}

/** Build a fetch mock that returns a successful MCP JSON-RPC response. */
function buildSuccessFetchMock(textContent: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [{ type: "text", text: textContent }],
        },
      }),
    text: () => Promise.resolve(textContent),
  } as unknown as Response);
}

/** Build a fetch mock that returns an empty MCP result (no events). */
function buildEmptyFetchMock() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [],
        },
      }),
    text: () => Promise.resolve(""),
  } as unknown as Response);
}

/** Build a fetch mock that returns an MCP-level error. */
function buildMcpErrorFetchMock(code: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        error: { code, message },
      }),
    text: () => Promise.resolve(""),
  } as unknown as Response);
}

/** Build a fetch mock that returns an HTTP error. */
function buildHttpErrorFetchMock(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(body),
  } as unknown as Response);
}

/**
 * Build a minimal Anthropic mock that returns a simple text response
 * and captures the tools passed on the first call.
 */
function buildAnthropicMockCapturingTools(replyText: string) {
  let capturedTools: unknown[] = [];

  const createMock = vi.fn().mockImplementation(
    (params: { tools?: unknown[]; system?: string; model?: string; messages?: unknown[] }) => {
      if (capturedTools.length === 0 && params.tools) {
        capturedTools = params.tools;
      }
      return Promise.resolve({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: replyText, citations: null }],
        model: params.model ?? "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          inference_geo: null,
          server_tool_use: null,
          service_tier: null,
        },
      } as unknown as Anthropic.Message);
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return {
    AnthropicMockClass,
    createMock,
    getCapturedTools: () => capturedTools as Array<{ name: string }>,
  };
}

// ---------------------------------------------------------------------------
// AC1 — create_event, update_event, delete_event, check_free_busy tool
//        definitions exported from calendar.ts
// ---------------------------------------------------------------------------

describe("AC1 — write tool definitions exported from calendar.ts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- createEventTool ---

  it("exports createEventTool with name 'create_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    expect(createEventTool).toBeDefined();
    expect(createEventTool.name).toBe("create_event");
  });

  it("createEventTool has a non-empty description", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    expect(typeof createEventTool.description).toBe("string");
    expect((createEventTool.description ?? "").length).toBeGreaterThan(10);
  });

  it("createEventTool input_schema requires title, start, end", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const required = createEventTool.input_schema.required as string[];
    expect(required).toContain("title");
    expect(required).toContain("start");
    expect(required).toContain("end");
  });

  it("createEventTool input_schema does NOT require optional fields", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const required = createEventTool.input_schema.required as string[];
    expect(required).not.toContain("location");
    expect(required).not.toContain("description");
    expect(required).not.toContain("attendees");
  });

  it("createEventTool input_schema properties include location, description, attendees", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const props = createEventTool.input_schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("location");
    expect(props).toHaveProperty("description");
    expect(props).toHaveProperty("attendees");
  });

  it("createEventTool input_schema attendees property is type array", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const props = createEventTool.input_schema.properties as Record<string, { type: string }>;
    expect(props["attendees"]?.type).toBe("array");
  });

  it("createEventTool description mentions confirmation requirement", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const desc = (createEventTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/confirm|confirmation|approval/);
  });

  // --- updateEventTool ---

  it("exports updateEventTool with name 'update_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    expect(updateEventTool).toBeDefined();
    expect(updateEventTool.name).toBe("update_event");
  });

  it("updateEventTool has a non-empty description", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    expect(typeof updateEventTool.description).toBe("string");
    expect((updateEventTool.description ?? "").length).toBeGreaterThan(10);
  });

  it("updateEventTool input_schema requires only eventId", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    const required = updateEventTool.input_schema.required as string[];
    expect(required).toContain("eventId");
    // All other fields are optional (partial update semantics)
    expect(required).not.toContain("title");
    expect(required).not.toContain("start");
    expect(required).not.toContain("end");
    expect(required).not.toContain("location");
    expect(required).not.toContain("description");
    expect(required).not.toContain("attendees");
  });

  it("updateEventTool input_schema properties include all update fields", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    const props = updateEventTool.input_schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("eventId");
    expect(props).toHaveProperty("title");
    expect(props).toHaveProperty("start");
    expect(props).toHaveProperty("end");
    expect(props).toHaveProperty("location");
    expect(props).toHaveProperty("description");
    expect(props).toHaveProperty("attendees");
  });

  it("updateEventTool description mentions confirmation requirement", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    const desc = (updateEventTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/confirm|confirmation|approval/);
  });

  // --- deleteEventTool ---

  it("exports deleteEventTool with name 'delete_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    expect(deleteEventTool).toBeDefined();
    expect(deleteEventTool.name).toBe("delete_event");
  });

  it("deleteEventTool has a non-empty description", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    expect(typeof deleteEventTool.description).toBe("string");
    expect((deleteEventTool.description ?? "").length).toBeGreaterThan(10);
  });

  it("deleteEventTool input_schema requires only eventId", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    const required = deleteEventTool.input_schema.required as string[];
    expect(required).toContain("eventId");
    expect(required).toHaveLength(1);
  });

  it("deleteEventTool description mentions confirmation requirement", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    const desc = (deleteEventTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/confirm|confirmation|approval/);
  });

  it("deleteEventTool description warns about irreversibility", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    const desc = (deleteEventTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/irreversible|permanent|cannot be undone|permanently/);
  });

  // --- checkFreeBusyTool ---

  it("exports checkFreeBusyTool with name 'check_free_busy'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    expect(checkFreeBusyTool).toBeDefined();
    expect(checkFreeBusyTool.name).toBe("check_free_busy");
  });

  it("checkFreeBusyTool has a non-empty description", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    expect(typeof checkFreeBusyTool.description).toBe("string");
    expect((checkFreeBusyTool.description ?? "").length).toBeGreaterThan(10);
  });

  it("checkFreeBusyTool input_schema requires start and end", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    const required = checkFreeBusyTool.input_schema.required as string[];
    expect(required).toContain("start");
    expect(required).toContain("end");
  });

  it("checkFreeBusyTool description mentions free/busy or availability", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    const desc = (checkFreeBusyTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/free|busy|availability/);
  });

  // --- calendarWriteToolDefinitions array ---

  it("exports calendarWriteToolDefinitions as an array of 3 tools (T-20: check_free_busy moved to calendarFreeBusyToolDefinitions)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
    expect(Array.isArray(calendarWriteToolDefinitions)).toBe(true);
    expect(calendarWriteToolDefinitions).toHaveLength(3);
  });

  it("calendarWriteToolDefinitions contains create_event", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
    const names = calendarWriteToolDefinitions.map((t) => t.name);
    expect(names).toContain("create_event");
  });

  it("calendarWriteToolDefinitions contains update_event", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
    const names = calendarWriteToolDefinitions.map((t) => t.name);
    expect(names).toContain("update_event");
  });

  it("calendarWriteToolDefinitions contains delete_event", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarWriteToolDefinitions } = await import("../tools/calendar.js");
    const names = calendarWriteToolDefinitions.map((t) => t.name);
    expect(names).toContain("delete_event");
  });

  it("calendarFreeBusyToolDefinitions (separate array) contains check_free_busy (T-20: moved from calendarWriteToolDefinitions)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarFreeBusyToolDefinitions } = await import("../tools/calendar.js");
    expect(Array.isArray(calendarFreeBusyToolDefinitions)).toBe(true);
    const names = calendarFreeBusyToolDefinitions.map((t: any) => t.name);
    expect(names).toContain("check_free_busy");
  });
});

// ---------------------------------------------------------------------------
// AC2 — All four tools included in agent's tool definitions array
// ---------------------------------------------------------------------------

describe("AC2 — all four write tools in agent TOOL_DEFINITIONS passed to Anthropic API", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
    global.fetch = buildEmptyFetchMock();
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("create_event is included in tools passed to Anthropic API on first call", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1000, text: "hello", message_id: 1000 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("create_event");
  });

  it("update_event is included in tools passed to Anthropic API on first call", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1001, text: "hello", message_id: 1001 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("update_event");
  });

  it("delete_event is included in tools passed to Anthropic API on first call", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1002, text: "hello", message_id: 1002 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("delete_event");
  });

  it("check_free_busy is included in tools passed to Anthropic API on first call", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1003, text: "hello", message_id: 1003 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("check_free_busy");
  });

  it("all four write tools plus read tools are in TOOL_DEFINITIONS (at least 6 total)", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1004, text: "hello", message_id: 1004 });

    const toolNames = getCapturedTools().map((t) => t.name);
    // Read tools (T-12): get_todays_events, get_events_range
    // Write tools (T-15): create_event, update_event, delete_event, check_free_busy
    expect(toolNames).toContain("get_todays_events");
    expect(toolNames).toContain("get_events_range");
    expect(toolNames).toContain("create_event");
    expect(toolNames).toContain("update_event");
    expect(toolNames).toContain("delete_event");
    expect(toolNames).toContain("check_free_busy");
    expect(toolNames.length).toBeGreaterThanOrEqual(6);
  });

  it("TOOL_DEFINITIONS does not contain duplicates", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, getCapturedTools } =
      buildAnthropicMockCapturingTools("OK");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1005, text: "hello", message_id: 1005 });

    const toolNames = getCapturedTools().map((t) => t.name);
    const uniqueNames = new Set(toolNames);
    expect(uniqueNames.size).toBe(toolNames.length);
  });
});

// ---------------------------------------------------------------------------
// AC3 — Tool functions accept correct TypeScript types matching MCP contracts
// ---------------------------------------------------------------------------

describe("AC3 — createEvent executor: correct params, MCP call, validation", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("createEvent calls MCP with correct tool name 'create_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event 'Team Standup' created successfully.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Team Standup",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { name: string } };
    expect(callBody.params.name).toBe("create_event");
  });

  it("createEvent sends title, start, end to MCP", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event created.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Product Demo",
      start: "2026-04-22T14:00:00+01:00",
      end: "2026-04-22T15:00:00+01:00",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["title"]).toBe("Product Demo");
    expect(callBody.params.arguments["start"]).toBe("2026-04-22T14:00:00+01:00");
    expect(callBody.params.arguments["end"]).toBe("2026-04-22T15:00:00+01:00");
  });

  it("createEvent sends optional location to MCP when provided", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event created.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Meeting",
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
      location: "Conference Room A",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["location"]).toBe("Conference Room A");
  });

  it("createEvent sends optional description to MCP when provided", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event created.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Planning Session",
      start: "2026-04-23T09:00:00+01:00",
      end: "2026-04-23T10:00:00+01:00",
      description: "Q2 planning discussion",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["description"]).toBe("Q2 planning discussion");
  });

  it("createEvent sends optional attendees array to MCP when provided", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event created.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Team Lunch",
      start: "2026-04-24T12:00:00+01:00",
      end: "2026-04-24T13:00:00+01:00",
      attendees: ["alice@example.com", "bob@example.com"],
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["attendees"]).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("createEvent does NOT send undefined optional fields to MCP", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event created.");
    global.fetch = fetchMock;

    const { createEvent } = await import("../tools/calendar.js");
    await createEvent({
      title: "Solo Meeting",
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments).not.toHaveProperty("location");
    expect(callBody.params.arguments).not.toHaveProperty("description");
    expect(callBody.params.arguments).not.toHaveProperty("attendees");
  });

  it("createEvent returns MCP text response on success", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Team Standup created for 2026-04-21 at 09:00.");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Team Standup",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    });
    expect(result).toBe("Team Standup created for 2026-04-21 at 09:00.");
  });

  it("createEvent returns fallback message when MCP returns empty content", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Silent Event",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    });
    // Should fall back to a created-successfully message
    expect(result.toLowerCase()).toMatch(/created|silent event/);
  });

  it("createEvent returns error JSON when title is empty", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/title/i);
  });

  it("createEvent returns error JSON for invalid ISO 8601 start", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Test Event",
      start: "not-a-date",
      end: "2026-04-21T09:30:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid start/i);
  });

  it("createEvent returns error JSON for invalid ISO 8601 end", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Test Event",
      start: "2026-04-21T09:00:00+01:00",
      end: "tomorrow afternoon",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid end/i);
  });

  it("createEvent returns error JSON for empty-string attendee", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Meeting",
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
      attendees: ["valid@example.com", ""],
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/attendees/i);
  });

  it("createEvent returns structured error JSON when MCP returns HTTP error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(500, "Internal Server Error");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Meeting",
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to create/i);
  });

  it("createEvent returns structured error JSON when MCP returns JSON-RPC error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildMcpErrorFetchMock(-32000, "Calendar API error");

    const { createEvent } = await import("../tools/calendar.js");
    const result = await createEvent({
      title: "Meeting",
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to create/i);
  });
});

describe("AC3 — updateEvent executor: correct params, MCP call, validation", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("updateEvent calls MCP with correct tool name 'update_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event updated.");
    global.fetch = fetchMock;

    const { updateEvent } = await import("../tools/calendar.js");
    await updateEvent({ eventId: "evt_abc123", title: "New Title" });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { name: string } };
    expect(callBody.params.name).toBe("update_event");
  });

  it("updateEvent sends eventId to MCP", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event updated.");
    global.fetch = fetchMock;

    const { updateEvent } = await import("../tools/calendar.js");
    await updateEvent({ eventId: "evt_xyz789" });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["eventId"]).toBe("evt_xyz789");
  });

  it("updateEvent sends only provided fields (partial update — title only)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event updated.");
    global.fetch = fetchMock;

    const { updateEvent } = await import("../tools/calendar.js");
    await updateEvent({ eventId: "evt_abc", title: "Updated Title" });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    const args = callBody.params.arguments;
    expect(args["title"]).toBe("Updated Title");
    expect(args).not.toHaveProperty("start");
    expect(args).not.toHaveProperty("end");
    expect(args).not.toHaveProperty("location");
    expect(args).not.toHaveProperty("description");
    expect(args).not.toHaveProperty("attendees");
  });

  it("updateEvent sends all provided fields when multiple are given", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event updated.");
    global.fetch = fetchMock;

    const { updateEvent } = await import("../tools/calendar.js");
    await updateEvent({
      eventId: "evt_multi",
      title: "Rescheduled Meeting",
      start: "2026-04-25T14:00:00+01:00",
      end: "2026-04-25T15:00:00+01:00",
      location: "Board Room",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    const args = callBody.params.arguments;
    expect(args["title"]).toBe("Rescheduled Meeting");
    expect(args["start"]).toBe("2026-04-25T14:00:00+01:00");
    expect(args["end"]).toBe("2026-04-25T15:00:00+01:00");
    expect(args["location"]).toBe("Board Room");
  });

  it("updateEvent returns MCP text response on success", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Event evt_abc123 has been updated.");

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "evt_abc123", title: "New Title" });
    expect(result).toBe("Event evt_abc123 has been updated.");
  });

  it("updateEvent returns fallback success message when MCP returns empty content", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "evt_empty" });
    expect(result.toLowerCase()).toMatch(/updated/);
  });

  it("updateEvent returns error JSON when eventId is empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/eventId/i);
  });

  it("updateEvent returns error JSON for invalid ISO 8601 start", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "evt_abc", start: "not-a-date" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid start/i);
  });

  it("updateEvent returns error JSON for invalid ISO 8601 end", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "evt_abc", end: "bad-end" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid end/i);
  });

  it("updateEvent returns structured error JSON when MCP returns HTTP error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(503, "Service Unavailable");

    const { updateEvent } = await import("../tools/calendar.js");
    const result = await updateEvent({ eventId: "evt_abc", title: "New" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to update/i);
  });
});

describe("AC3 — deleteEvent executor: correct params, MCP call, validation", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("deleteEvent calls MCP with correct tool name 'delete_event'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event deleted.");
    global.fetch = fetchMock;

    const { deleteEvent } = await import("../tools/calendar.js");
    await deleteEvent({ eventId: "evt_del_001" });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { name: string } };
    expect(callBody.params.name).toBe("delete_event");
  });

  it("deleteEvent sends eventId to MCP", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Event deleted.");
    global.fetch = fetchMock;

    const { deleteEvent } = await import("../tools/calendar.js");
    await deleteEvent({ eventId: "evt_del_xyz" });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["eventId"]).toBe("evt_del_xyz");
  });

  it("deleteEvent returns MCP text response on success", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Event evt_del_001 has been permanently deleted.");

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "evt_del_001" });
    expect(result).toBe("Event evt_del_001 has been permanently deleted.");
  });

  it("deleteEvent returns fallback success message when MCP returns empty content", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "evt_empty_del" });
    expect(result.toLowerCase()).toMatch(/deleted/);
  });

  it("deleteEvent returns error JSON when eventId is empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/eventId/i);
  });

  it("deleteEvent returns error JSON when eventId is whitespace-only", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "   " });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/eventId/i);
  });

  it("deleteEvent returns structured error JSON when MCP returns HTTP error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(404, "Not Found");

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "evt_nonexistent" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to delete/i);
  });

  it("deleteEvent returns structured error JSON when MCP returns JSON-RPC error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildMcpErrorFetchMock(-32001, "Event not found");

    const { deleteEvent } = await import("../tools/calendar.js");
    const result = await deleteEvent({ eventId: "evt_gone" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to delete/i);
  });
});

describe("AC3 — checkFreeBusy executor: correct params, MCP call, validation", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("checkFreeBusy calls MCP with correct tool name 'check_free_busy'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("You are free during this period.");
    global.fetch = fetchMock;

    const { checkFreeBusy } = await import("../tools/calendar.js");
    await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { name: string } };
    expect(callBody.params.name).toBe("check_free_busy");
  });

  it("checkFreeBusy sends start and end to MCP", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Busy: Team Meeting 10:00-11:00.");
    global.fetch = fetchMock;

    const { checkFreeBusy } = await import("../tools/calendar.js");
    await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });

    const callBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { params: { arguments: Record<string, unknown> } };
    expect(callBody.params.arguments["start"]).toBe("2026-04-22T10:00:00+01:00");
    expect(callBody.params.arguments["end"]).toBe("2026-04-22T11:00:00+01:00");
  });

  it("checkFreeBusy returns MCP text response on success", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("You are free from 10:00 to 11:00.");

    const { checkFreeBusy } = await import("../tools/calendar.js");
    const result = await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    expect(result).toBe("You are free from 10:00 to 11:00.");
  });

  it("checkFreeBusy returns fallback message when MCP returns empty content", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();

    const { checkFreeBusy } = await import("../tools/calendar.js");
    const result = await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    // Fallback should mention the query window
    expect(result).toMatch(/2026-04-22/);
  });

  it("checkFreeBusy returns error JSON for invalid ISO 8601 start", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { checkFreeBusy } = await import("../tools/calendar.js");
    const result = await checkFreeBusy({
      start: "Monday morning",
      end: "2026-04-22T11:00:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid start/i);
  });

  it("checkFreeBusy returns error JSON for invalid ISO 8601 end", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { checkFreeBusy } = await import("../tools/calendar.js");
    const result = await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "not-valid",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid end/i);
  });

  it("checkFreeBusy returns structured error JSON when MCP returns HTTP error", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(502, "Bad Gateway");

    const { checkFreeBusy } = await import("../tools/calendar.js");
    const result = await checkFreeBusy({
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/failed to check/i);
  });
});

// ---------------------------------------------------------------------------
// AC3 — executeCalendarTool dispatch for write tools
// ---------------------------------------------------------------------------

describe("AC3 — executeCalendarTool dispatch for write tools", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("executeCalendarTool routes 'create_event' to createEvent", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Standup created.");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("create_event", {
      title: "Standup",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    });
    expect(result).toBe("Standup created.");
  });

  it("executeCalendarTool routes 'update_event' to updateEvent", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Event updated.");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("update_event", {
      eventId: "evt_001",
      title: "Rescheduled Standup",
    });
    expect(result).toBe("Event updated.");
  });

  it("executeCalendarTool routes 'delete_event' to deleteEvent", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Event deleted.");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("delete_event", {
      eventId: "evt_002",
    });
    expect(result).toBe("Event deleted.");
  });

  it("executeCalendarTool routes 'check_free_busy' to checkFreeBusy", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("You are free.");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("check_free_busy", {
      start: "2026-04-22T10:00:00+01:00",
      end: "2026-04-22T11:00:00+01:00",
    });
    expect(result).toBe("You are free.");
  });

  it("executeCalendarTool returns error JSON for create_event with missing title", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("create_event", {
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
      // title missing
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/create_event requires/i);
  });

  it("executeCalendarTool returns error JSON for update_event with missing eventId", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("update_event", {
      title: "New Title",
      // eventId missing
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/update_event requires/i);
  });

  it("executeCalendarTool returns error JSON for delete_event with missing eventId", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("delete_event", {
      // eventId missing
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/delete_event requires/i);
  });

  it("executeCalendarTool returns error JSON for check_free_busy with missing start", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("check_free_busy", {
      end: "2026-04-22T11:00:00+01:00",
      // start missing
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/check_free_busy requires/i);
  });

  it("executeCalendarTool returns error JSON for unknown tool names", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");
    const result = await executeCalendarTool("completely_unknown_tool", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/unknown calendar tool/i);
  });
});

// ---------------------------------------------------------------------------
// AC3 — TypeScript interface structural checks (via runtime reflection)
// ---------------------------------------------------------------------------

describe("AC3 — TypeScript interface / MCP contract compliance", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createEventTool input_schema.type is 'object'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    expect(createEventTool.input_schema.type).toBe("object");
  });

  it("updateEventTool input_schema.type is 'object'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    expect(updateEventTool.input_schema.type).toBe("object");
  });

  it("deleteEventTool input_schema.type is 'object'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    expect(deleteEventTool.input_schema.type).toBe("object");
  });

  it("checkFreeBusyTool input_schema.type is 'object'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    expect(checkFreeBusyTool.input_schema.type).toBe("object");
  });

  it("createEventTool start and end schema properties describe ISO 8601 format", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const props = createEventTool.input_schema.properties as Record<
      string,
      { type: string; description: string }
    >;
    expect(props["start"]?.description.toLowerCase()).toMatch(/iso 8601/);
    expect(props["end"]?.description.toLowerCase()).toMatch(/iso 8601/);
  });

  it("updateEventTool start and end schema properties describe ISO 8601 format", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { updateEventTool } = await import("../tools/calendar.js");
    const props = updateEventTool.input_schema.properties as Record<
      string,
      { type: string; description: string }
    >;
    expect(props["start"]?.description.toLowerCase()).toMatch(/iso 8601/);
    expect(props["end"]?.description.toLowerCase()).toMatch(/iso 8601/);
  });

  it("checkFreeBusyTool start and end schema properties describe ISO 8601 format", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { checkFreeBusyTool } = await import("../tools/calendar.js");
    const props = checkFreeBusyTool.input_schema.properties as Record<
      string,
      { type: string; description: string }
    >;
    expect(props["start"]?.description.toLowerCase()).toMatch(/iso 8601/);
    expect(props["end"]?.description.toLowerCase()).toMatch(/iso 8601/);
  });

  it("createEventTool title schema property has type string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { createEventTool } = await import("../tools/calendar.js");
    const props = createEventTool.input_schema.properties as Record<
      string,
      { type: string }
    >;
    expect(props["title"]?.type).toBe("string");
  });

  it("deleteEventTool eventId schema property has type string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { deleteEventTool } = await import("../tools/calendar.js");
    const props = deleteEventTool.input_schema.properties as Record<
      string,
      { type: string }
    >;
    expect(props["eventId"]?.type).toBe("string");
  });

  it("createEvent, updateEvent, deleteEvent, checkFreeBusy are all exported as async functions", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const calendarModule = await import("../tools/calendar.js");

    expect(typeof calendarModule.createEvent).toBe("function");
    expect(typeof calendarModule.updateEvent).toBe("function");
    expect(typeof calendarModule.deleteEvent).toBe("function");
    expect(typeof calendarModule.checkFreeBusy).toBe("function");

    // Verify they return Promises (async functions)
    global.fetch = buildEmptyFetchMock();
    const r1 = calendarModule.createEvent({
      title: "t",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T10:00:00+01:00",
    });
    expect(r1).toBeInstanceOf(Promise);
    await r1;

    vi.resetModules();
  });
});
