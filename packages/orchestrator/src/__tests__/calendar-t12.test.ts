/**
 * Tests for packages/orchestrator/src/tools/calendar.ts — T-12
 *
 * Acceptance criteria:
 *   AC1: get_todays_events tool definition matches MCP contract
 *   AC2: get_events_range accepts start and end as ISO 8601 strings
 *   AC3: Tool definitions are exported and included in agent API call
 *   AC4: Empty calendar response returns a graceful 'No events' message to user
 *
 * Strategy
 * --------
 * - The Google Calendar MCP server (fetch) is fully mocked — no real network
 *   calls are made.
 * - @lifeos/shared logger is mocked with silent stubs.
 * - Each test suite uses vi.resetModules() + vi.doMock() in beforeEach for
 *   full module isolation, matching the patterns established in T-10/T-11 tests.
 * - All four acceptance criteria are covered by multiple focused tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silent logger mock matching the @lifeos/shared logger interface. */
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

/**
 * Build a fetch mock that returns a successful MCP JSON-RPC response with the
 * given text content. Returns the mock function so tests can inspect calls.
 */
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

/**
 * Build a fetch mock that returns an empty MCP result (no content array
 * entries). Used to test the "No events" graceful response.
 */
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

/**
 * Build a fetch mock that returns an MCP result whose content array contains
 * a text block with an empty string. Also triggers the "No events" path.
 */
function buildWhitespaceTextFetchMock() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [{ type: "text", text: "   " }],
        },
      }),
    text: () => Promise.resolve(""),
  } as unknown as Response);
}

/**
 * Build a fetch mock that returns an HTTP error response.
 */
function buildHttpErrorFetchMock(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(`HTTP ${status} error`),
  } as unknown as Response);
}

/**
 * Build a fetch mock that rejects with a network error.
 */
function buildNetworkErrorFetchMock() {
  return vi.fn().mockRejectedValue(new Error("ECONNREFUSED: MCP server unreachable"));
}

// ---------------------------------------------------------------------------
// AC1 — get_todays_events tool definition matches MCP contract
// ---------------------------------------------------------------------------

describe("AC1 — get_todays_events tool definition matches MCP contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getTodaysEventsTool is exported from calendar.ts", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool).toBeDefined();
  });

  it("tool name is exactly 'get_todays_events'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool.name).toBe("get_todays_events");
  });

  it("tool has a non-empty description string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(typeof getTodaysEventsTool.description).toBe("string");
    expect((getTodaysEventsTool.description ?? "").length).toBeGreaterThan(0);
  });

  it("input_schema type is 'object'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool.input_schema.type).toBe("object");
  });

  it("input_schema has a properties field (may be empty — no required params)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool.input_schema).toHaveProperty("properties");
  });

  it("input_schema required array is empty (no required parameters)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool.input_schema.required).toEqual([]);
  });

  it("tool definition conforms to Anthropic Tool shape (name + description + input_schema)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect(getTodaysEventsTool).toMatchObject({
      name: expect.any(String),
      description: expect.any(String),
      input_schema: {
        type: "object",
        properties: expect.anything(),
      },
    });
  });

  it("description mentions 'today' to match MCP contract intent", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");
    expect((getTodaysEventsTool.description ?? "").toLowerCase()).toContain("today");
  });
});

// ---------------------------------------------------------------------------
// AC2 — get_events_range accepts start and end as ISO 8601 strings
// ---------------------------------------------------------------------------

describe("AC2 — get_events_range accepts start and end as ISO 8601 strings", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("getEventsRangeTool is exported from calendar.ts", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    expect(getEventsRangeTool).toBeDefined();
  });

  it("getEventsRangeTool name is exactly 'get_events_range'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    expect(getEventsRangeTool.name).toBe("get_events_range");
  });

  it("getEventsRangeTool input_schema requires 'start' and 'end'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    const required = getEventsRangeTool.input_schema.required as string[];
    expect(required).toContain("start");
    expect(required).toContain("end");
  });

  it("'start' property is typed as string in input_schema", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    const props = getEventsRangeTool.input_schema.properties as Record<string, { type: string; description: string }>;
    expect(props["start"]).toBeDefined();
    expect(props["start"]!.type).toBe("string");
  });

  it("'end' property is typed as string in input_schema", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    const props = getEventsRangeTool.input_schema.properties as Record<string, { type: string; description: string }>;
    expect(props["end"]).toBeDefined();
    expect(props["end"]!.type).toBe("string");
  });

  it("'start' description mentions ISO 8601", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    const props = getEventsRangeTool.input_schema.properties as Record<string, { type: string; description: string }>;
    expect(props["start"]!.description.toLowerCase()).toContain("iso 8601");
  });

  it("'end' description mentions ISO 8601", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");
    const props = getEventsRangeTool.input_schema.properties as Record<string, { type: string; description: string }>;
    expect(props["end"]!.description.toLowerCase()).toContain("iso 8601");
  });

  it("getEventsRange executes successfully with valid ISO 8601 date-only strings", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Meeting at 9am");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21", "2026-04-27");
    expect(result).toBe("Meeting at 9am");
  });

  it("getEventsRange executes successfully with ISO 8601 datetime strings with Z suffix", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Stand-up 10:00");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "2026-04-21T23:59:59Z");
    expect(result).toBe("Stand-up 10:00");
  });

  it("getEventsRange executes successfully with ISO 8601 datetime strings with timezone offset", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Team lunch at noon");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00+01:00", "2026-04-27T23:59:59+01:00");
    expect(result).toBe("Team lunch at noon");
  });

  it("getEventsRange executes successfully with ISO 8601 datetime without seconds", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Review meeting");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T09:00", "2026-04-21T17:00");
    expect(result).toBe("Review meeting");
  });

  it("getEventsRange rejects invalid start parameter (not ISO 8601)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Should not be called");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("next Tuesday", "2026-04-27T23:59:59Z");
    const parsed = JSON.parse(result) as { error: string; received: string };
    expect(parsed.error).toMatch(/invalid start/i);
    expect(parsed.received).toBe("next Tuesday");
  });

  it("getEventsRange rejects invalid end parameter (not ISO 8601)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("Should not be called");
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "end of the week");
    const parsed = JSON.parse(result) as { error: string; received: string };
    expect(parsed.error).toMatch(/invalid end/i);
    expect(parsed.received).toBe("end of the week");
  });

  it("getEventsRange passes start and end to the MCP tool call correctly", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Board meeting");
    global.fetch = fetchMock;
    const { getEventsRange } = await import("../tools/calendar.js");

    await getEventsRange("2026-04-21T00:00:00Z", "2026-04-21T23:59:59Z");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(callArgs[1].body as string) as {
      params: { name: string; arguments: { start: string; end: string } };
    };
    expect(requestBody.params.name).toBe("get_events_range");
    expect(requestBody.params.arguments.start).toBe("2026-04-21T00:00:00Z");
    expect(requestBody.params.arguments.end).toBe("2026-04-21T23:59:59Z");
  });

  it("getEventsRange does NOT call fetch when start is invalid", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Should not reach MCP");
    global.fetch = fetchMock;
    const { getEventsRange } = await import("../tools/calendar.js");

    await getEventsRange("not-a-date", "2026-04-27T23:59:59Z");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getEventsRange does NOT call fetch when end is invalid", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Should not reach MCP");
    global.fetch = fetchMock;
    const { getEventsRange } = await import("../tools/calendar.js");

    await getEventsRange("2026-04-21T00:00:00Z", "not-a-date");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC3 — Tool definitions are exported and included in agent API call
// ---------------------------------------------------------------------------

describe("AC3 — tool definitions are exported and included in agent API call", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calendarReadToolDefinitions is exported from calendar.ts", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions } = await import("../tools/calendar.js");
    expect(calendarReadToolDefinitions).toBeDefined();
    expect(Array.isArray(calendarReadToolDefinitions)).toBe(true);
  });

  it("calendarReadToolDefinitions contains exactly two tools (get_todays_events and get_events_range)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions } = await import("../tools/calendar.js");
    expect(calendarReadToolDefinitions).toHaveLength(2);
  });

  it("calendarReadToolDefinitions includes get_todays_events", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions } = await import("../tools/calendar.js");
    const names = calendarReadToolDefinitions.map((t) => t.name);
    expect(names).toContain("get_todays_events");
  });

  it("calendarReadToolDefinitions includes get_events_range", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions } = await import("../tools/calendar.js");
    const names = calendarReadToolDefinitions.map((t) => t.name);
    expect(names).toContain("get_events_range");
  });

  it("getTodaysEventsTool is the same object included in calendarReadToolDefinitions", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions, getTodaysEventsTool } = await import("../tools/calendar.js");
    const found = calendarReadToolDefinitions.find((t) => t.name === "get_todays_events");
    expect(found).toBe(getTodaysEventsTool);
  });

  it("getEventsRangeTool is the same object included in calendarReadToolDefinitions", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions, getEventsRangeTool } = await import("../tools/calendar.js");
    const found = calendarReadToolDefinitions.find((t) => t.name === "get_events_range");
    expect(found).toBe(getEventsRangeTool);
  });

  it("each tool definition in calendarReadToolDefinitions has name, description, and input_schema", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { calendarReadToolDefinitions } = await import("../tools/calendar.js");
    for (const tool of calendarReadToolDefinitions) {
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect((tool.description ?? "").length).toBeGreaterThan(0);
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe("object");
    }
  });

  it("agent.ts spreads calendarReadToolDefinitions into TOOL_DEFINITIONS — verified by mock API call", async () => {
    // Re-create the agent mock pattern from T-10 tests but verify tool definitions.
    let capturedTools: unknown[] = [];

    const createMock = vi.fn().mockImplementation(
      (params: { tools?: unknown[] }) => {
        capturedTools = params.tools ?? [];
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 5, output_tokens: 2, cache_creation_input_tokens: null, cache_read_input_tokens: null, cache_creation: null, inference_geo: null, server_tool_use: null, service_tier: null },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 100, text: "hello", message_id: 1 });

    // Agent must have passed tools to create()
    expect(capturedTools).toBeDefined();
    expect(Array.isArray(capturedTools)).toBe(true);
    expect((capturedTools as Array<{ name: string }>).length).toBeGreaterThan(0);

    // Both calendar tools must be present
    const toolNames = (capturedTools as Array<{ name: string }>).map((t) => t.name);
    expect(toolNames).toContain("get_todays_events");
    expect(toolNames).toContain("get_events_range");
  });

  it("executeCalendarTool is exported from calendar.ts", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { executeCalendarTool } = await import("../tools/calendar.js");
    expect(typeof executeCalendarTool).toBe("function");
  });

  it("executeCalendarTool routes 'get_todays_events' correctly", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildSuccessFetchMock("9am Standup");
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_todays_events", {});
    expect(result).toBe("9am Standup");

    global.fetch = savedFetch;
  });

  it("executeCalendarTool routes 'get_events_range' correctly", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildSuccessFetchMock("Board meeting Tue");
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_events_range", {
      start: "2026-04-21T00:00:00Z",
      end: "2026-04-27T23:59:59Z",
    });
    expect(result).toBe("Board meeting Tue");

    global.fetch = savedFetch;
  });

  it("executeCalendarTool returns error JSON for unknown tool name", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("unknown_tool_xyz", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/unknown/i);
  });

  it("executeCalendarTool returns error JSON when get_events_range params are missing", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_events_range", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC4 — Empty calendar response returns a graceful 'No events' message
// ---------------------------------------------------------------------------

describe("AC4 — empty calendar response returns graceful 'No events' message", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("getTodaysEvents returns a graceful empty-state message when MCP result content is empty array", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    // T-13 updated the exact wording to "You have nothing scheduled today."
    expect(result).toBe("You have nothing scheduled today.");
  });

  it("getTodaysEvents returns a graceful empty-state message when text content is whitespace only", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildWhitespaceTextFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    // T-13 updated the exact wording to "You have nothing scheduled today."
    expect(result).toBe("You have nothing scheduled today.");
  });

  it("getEventsRange returns 'No events' message when MCP result content is empty array", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "2026-04-27T23:59:59Z");
    expect(result.toLowerCase()).toContain("no events");
  });

  it("getEventsRange 'No events' message includes the start and end dates for context", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getEventsRange } = await import("../tools/calendar.js");

    const start = "2026-04-21T00:00:00Z";
    const end = "2026-04-27T23:59:59Z";
    const result = await getEventsRange(start, end);
    // Should reference the requested range so the user has context
    expect(result).toContain(start);
    expect(result).toContain(end);
  });

  it("getTodaysEvents 'No events' response is a non-empty human-readable string (not an empty string)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("getEventsRange 'No events' response is a non-empty human-readable string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "2026-04-27T23:59:59Z");
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("getTodaysEvents returns events string (not 'No events') when MCP returns content", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock("9am Stand-up\n11am Design review");
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(result).toBe("9am Stand-up\n11am Design review");
    expect(result.toLowerCase()).not.toContain("no events");
  });

  it("getTodaysEvents handles MCP HTTP error gracefully (returns error JSON, not throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(503);
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    // Should not throw — must return a string
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // Should be parseable as JSON error object
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("getTodaysEvents handles network error gracefully (returns error JSON, not throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildNetworkErrorFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("getEventsRange handles MCP HTTP error gracefully (returns error JSON, not throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildHttpErrorFetchMock(500);
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "2026-04-27T23:59:59Z");
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("getEventsRange handles network error gracefully (returns error JSON, not throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildNetworkErrorFetchMock();
    const { getEventsRange } = await import("../tools/calendar.js");

    const result = await getEventsRange("2026-04-21T00:00:00Z", "2026-04-27T23:59:59Z");
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("getTodaysEvents calls MCP with the correct tool name 'get_todays_events'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("All clear today");
    global.fetch = fetchMock;
    const { getTodaysEvents } = await import("../tools/calendar.js");

    await getTodaysEvents();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(callArgs[1].body as string) as {
      method: string;
      params: { name: string; arguments: Record<string, unknown> };
    };
    expect(requestBody.method).toBe("tools/call");
    expect(requestBody.params.name).toBe("get_todays_events");
  });

  it("getTodaysEvents sends an empty arguments object to MCP (no params)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Nothing today");
    global.fetch = fetchMock;
    const { getTodaysEvents } = await import("../tools/calendar.js");

    await getTodaysEvents();

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(callArgs[1].body as string) as {
      params: { arguments: Record<string, unknown> };
    };
    // The arguments object for get_todays_events should be empty
    expect(Object.keys(requestBody.params.arguments)).toHaveLength(0);
  });

  it("MCP JSON-RPC request uses method 'tools/call' and jsonrpc '2.0'", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Test event");
    global.fetch = fetchMock;
    const { getTodaysEvents } = await import("../tools/calendar.js");

    await getTodaysEvents();

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(callArgs[1].body as string) as {
      jsonrpc: string;
      method: string;
    };
    expect(requestBody.jsonrpc).toBe("2.0");
    expect(requestBody.method).toBe("tools/call");
  });

  it("MCP request Content-Type header is application/json", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const fetchMock = buildSuccessFetchMock("Test");
    global.fetch = fetchMock;
    const { getTodaysEvents } = await import("../tools/calendar.js");

    await getTodaysEvents();

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
