/**
 * Tests for T-14 — Events on a specific date or range
 *
 * Acceptance criteria:
 *   AC1: 'What have I got next Tuesday?' calls get_events_range with correct ISO dates
 *   AC2: 'What's on this week?' calls get_events_range from Monday to Sunday
 *   AC3: Natural language date resolution uses TZ from env, not UTC
 *
 * Strategy
 * --------
 * - The Google Calendar MCP server (fetch) is fully mocked — no real network calls.
 * - The Anthropic SDK is mocked to simulate the agent calling get_events_range.
 * - @lifeos/shared (pool, env, logger) is mocked with specific TZ values to verify
 *   timezone-aware date resolution.
 * - Tests verify:
 *     a) get_events_range is included in TOOL_DEFINITIONS passed to Anthropic API.
 *     b) The agent loop correctly routes get_events_range calls via executeCalendarTool.
 *     c) The system prompt Identity block contains T-14 date resolution rules.
 *     d) The system prompt Live Context block contains the timezone.
 *     e) get_events_range tool description contains natural language resolution guidance.
 *     f) The tool description instructs use of local TZ offset, not UTC.
 *     g) Single-day and week-range query patterns are described in the tool.
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

/**
 * Build an Anthropic mock that first returns a tool_use response for
 * get_events_range with the given start/end, then returns a text response.
 */
function buildAnthropicMockWithRangeTool(
  toolId: string,
  start: string,
  end: string,
  finalReply: string,
) {
  let callCount = 0;

  const createMock = vi.fn().mockImplementation(
    (params: { system: string; model: string; messages: unknown[] }) => {
      callCount++;

      if (callCount === 1) {
        // First call: return a tool_use for get_events_range
        return Promise.resolve({
          id: "msg_tool",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: toolId,
              name: "get_events_range",
              input: { start, end },
            },
          ],
          model: params.model,
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: {
            input_tokens: 20,
            output_tokens: 12,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        } as unknown as Anthropic.Message);
      }

      // Second call: return the final text reply
      return Promise.resolve({
        id: "msg_text",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: finalReply, citations: null }],
        model: params.model,
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 30,
          output_tokens: 20,
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

  let capturedSystemPrompt = "";
  let capturedToolsInFirstCall: unknown[] = [];

  const wrappedCreate = vi.fn().mockImplementation(
    (params: {
      system: string;
      model: string;
      messages: unknown[];
      tools?: unknown[];
    }) => {
      if (!capturedSystemPrompt) capturedSystemPrompt = params.system;
      if (capturedToolsInFirstCall.length === 0 && params.tools) {
        capturedToolsInFirstCall = params.tools;
      }
      return createMock(params);
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: wrappedCreate };
  }

  return {
    AnthropicMockClass,
    createMock: wrappedCreate,
    getSystemPrompt: () => capturedSystemPrompt,
    getToolsInFirstCall: () => capturedToolsInFirstCall,
  };
}

// ---------------------------------------------------------------------------
// AC1 — 'What have I got next Tuesday?' calls get_events_range with correct ISO dates
// ---------------------------------------------------------------------------

describe("AC1 — 'What have I got next Tuesday?' triggers get_events_range", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("runAgent includes get_events_range in tool definitions passed to Anthropic API", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithRangeTool(
      "tool_range_001",
      "2026-04-21T00:00:00+01:00",
      "2026-04-21T23:59:59+01:00",
      "You have 1 event next Tuesday.",
    );

    global.fetch = buildSuccessFetchMock("Team sync at 10:00 AM");

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
    await runAgent({ chat_id: 200, text: "What have I got next Tuesday?", message_id: 200 });

    expect(createMock).toHaveBeenCalled();

    const firstCallArgs = createMock.mock.calls[0] as [
      { tools?: Array<{ name: string }> },
    ];
    const tools = firstCallArgs[0].tools ?? [];
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("get_events_range");
  });

  it("agent tool loop executes get_events_range when model calls it", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithRangeTool(
      "tool_range_002",
      "2026-04-21T00:00:00+01:00",
      "2026-04-21T23:59:59+01:00",
      "You have a stand-up at 10am next Tuesday.",
    );

    global.fetch = buildSuccessFetchMock("Stand-up at 10am");

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
    await runAgent({ chat_id: 201, text: "What have I got next Tuesday?", message_id: 201 });

    // Two API calls: initial + after tool result
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("agent feeds get_events_range result back as tool_result with correct tool_use_id", async () => {
    const TOOL_ID = "tool_range_003";
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithRangeTool(
      TOOL_ID,
      "2026-04-21T00:00:00+01:00",
      "2026-04-21T23:59:59+01:00",
      "Tuesday looks busy.",
    );

    global.fetch = buildSuccessFetchMock("Meeting with Alice at 2pm");

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
    await runAgent({ chat_id: 202, text: "What have I got next Tuesday?", message_id: 202 });

    const secondCallArgs = createMock.mock.calls[1] as [
      { messages: Anthropic.MessageParam[] },
    ];
    const messages = secondCallArgs[0].messages;
    const toolResultMsg = messages.find(
      (m: Anthropic.MessageParam) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        (m.content as Anthropic.ToolResultBlockParam[]).some(
          (block) => block.type === "tool_result",
        ),
    );
    expect(toolResultMsg).toBeDefined();

    const resultBlock = (
      toolResultMsg!.content as Anthropic.ToolResultBlockParam[]
    ).find((b) => b.type === "tool_result");
    expect(resultBlock).toBeDefined();
    expect(resultBlock!.tool_use_id).toBe(TOOL_ID);
  });

  it("executeCalendarTool routes get_events_range with ISO 8601 start/end correctly", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildSuccessFetchMock("Design review at 3pm");

    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_events_range", {
      start: "2026-04-21T00:00:00+01:00",
      end: "2026-04-21T23:59:59+01:00",
    });
    expect(result).toBe("Design review at 3pm");

    global.fetch = savedFetch;
  });

  it("executeCalendarTool rejects natural language start — model must pre-resolve dates", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildSuccessFetchMock("Should not be called");

    const { executeCalendarTool } = await import("../tools/calendar.js");

    // Natural language must be resolved before calling the tool
    const result = await executeCalendarTool("get_events_range", {
      start: "next Tuesday",
      end: "2026-04-21T23:59:59+01:00",
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toMatch(/invalid start/i);

    global.fetch = savedFetch;
  });
});

// ---------------------------------------------------------------------------
// AC2 — 'What's on this week?' calls get_events_range from Monday to Sunday
// ---------------------------------------------------------------------------

describe("AC2 — 'What's on this week?' triggers get_events_range Monday–Sunday", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("agent tool loop executes get_events_range when model calls it for 'this week' query", async () => {
    const poolMock = buildPoolMock();
    // 'this week' from Monday 2026-04-20 to Sunday 2026-04-26
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithRangeTool(
      "tool_week_001",
      "2026-04-20T00:00:00+01:00",
      "2026-04-26T23:59:59+01:00",
      "Here is your week at a glance.",
    );

    global.fetch = buildSuccessFetchMock(
      "Mon: Stand-up\nTue: Design Review\nFri: Sprint Retrospective",
    );

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
    await runAgent({ chat_id: 300, text: "What's on this week?", message_id: 300 });

    // Two API calls: initial + after tool result
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("get_events_range tool definition specifies both start and end as required", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const required = getEventsRangeTool.input_schema.required as string[];
    expect(required).toContain("start");
    expect(required).toContain("end");
  });

  it("get_events_range tool description mentions 'this week' as an example query", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = (getEventsRangeTool.description ?? "").toLowerCase();
    expect(desc).toContain("this week");
  });

  it("get_events_range tool description mentions Monday-to-Sunday week boundary", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = getEventsRangeTool.description ?? "";
    // Should mention Monday as week start
    expect(desc.toLowerCase()).toContain("monday");
    // Should mention Sunday as week end
    expect(desc.toLowerCase()).toContain("sunday");
  });

  it("get_events_range tool description provides a concrete 'this week' example with ISO dates", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = getEventsRangeTool.description ?? "";
    // Should contain a concrete ISO 8601 example for 'this week'
    expect(desc).toMatch(/'this week'\s*[=→]/i);
  });

  it("executeCalendarTool accepts Monday-to-Sunday range (valid ISO 8601)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildSuccessFetchMock(
      "Mon: Stand-up\nTue: Design Review\nFri: Sprint Retro",
    );

    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_events_range", {
      start: "2026-04-20T00:00:00+01:00",
      end: "2026-04-26T23:59:59+01:00",
    });
    expect(result).toBe("Mon: Stand-up\nTue: Design Review\nFri: Sprint Retro");

    global.fetch = savedFetch;
  });

  it("executeCalendarTool returns 'No events' message for empty week", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const savedFetch = global.fetch;
    global.fetch = buildEmptyFetchMock();

    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_events_range", {
      start: "2026-04-20T00:00:00+01:00",
      end: "2026-04-26T23:59:59+01:00",
    });
    expect(result.toLowerCase()).toContain("no events");

    global.fetch = savedFetch;
  });
});

// ---------------------------------------------------------------------------
// AC3 — Natural language date resolution uses TZ from env, not UTC
// ---------------------------------------------------------------------------

describe("AC3 — date resolution uses TZ from env, not UTC", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("system prompt Live Context block contains the configured timezone", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: poolMock.pool,
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "America/New_York",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: buildLoggerMock(),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 400, text: "What's on this week?", message_id: 400 });

    // System prompt must contain the configured timezone
    expect(capturedSystemPrompt).toContain("America/New_York");
  });

  it("system prompt Live Context block contains the configured timezone for Europe/London", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 401, text: "What have I got next Tuesday?", message_id: 401 });

    // System prompt must contain the configured timezone
    expect(capturedSystemPrompt).toContain("Europe/London");
  });

  it("system prompt Live Context block is the second ## block (after Identity)", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 402, text: "What's on this week?", message_id: 402 });

    // Check block ordering — Live Context must come after Identity
    const identityPos = capturedSystemPrompt.indexOf("## Identity");
    const liveContextPos = capturedSystemPrompt.indexOf("## Live Context");
    expect(identityPos).toBeGreaterThanOrEqual(0);
    expect(liveContextPos).toBeGreaterThan(identityPos);
  });

  it("system prompt Identity block contains T-14 date resolution rules", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 403, text: "What's on this week?", message_id: 403 });

    // Extract the Identity block (between ## Identity and ## Live Context)
    const identityStart = capturedSystemPrompt.indexOf("## Identity");
    const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
    const identityBlock = capturedSystemPrompt.slice(identityStart, liveContextStart);

    // Identity block must contain T-14 date resolution guidance
    expect(identityBlock.toLowerCase()).toContain("iso 8601");
    expect(identityBlock.toLowerCase()).toContain("timezone");
  });

  it("system prompt Identity block mentions 'this week' date resolution", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 404, text: "What's on this week?", message_id: 404 });

    // Extract the Identity block
    const identityStart = capturedSystemPrompt.indexOf("## Identity");
    const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
    const identityBlock = capturedSystemPrompt.slice(identityStart, liveContextStart);

    // Should instruct the model about 'this week' = Monday-Sunday
    expect(identityBlock.toLowerCase()).toContain("this week");
    expect(identityBlock.toLowerCase()).toContain("monday");
    expect(identityBlock.toLowerCase()).toContain("sunday");
  });

  it("system prompt Identity block mentions 'next Tuesday' as a natural language example", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 405, text: "hello", message_id: 405 });

    // Extract the Identity block
    const identityStart = capturedSystemPrompt.indexOf("## Identity");
    const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
    const identityBlock = capturedSystemPrompt.slice(identityStart, liveContextStart);

    // Should mention 'next Tuesday' as a natural language example
    expect(identityBlock.toLowerCase()).toContain("next tuesday");
  });

  it("system prompt still has exactly 5 top-level ## blocks (T-14 does not add new blocks)", async () => {
    let capturedSystemPrompt = "";

    const createMock = vi.fn().mockImplementation(
      (params: { system: string }) => {
        capturedSystemPrompt = params.system;
        return Promise.resolve({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "OK", citations: null }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            cache_creation: null,
            inference_geo: null,
            server_tool_use: null,
            service_tier: null,
          },
        });
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function AnthropicMockClass(this: any, _opts: unknown) {
      this.messages = { create: createMock };
    }

    const poolMock = buildPoolMock();

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
    await runAgent({ chat_id: 406, text: "hello", message_id: 406 });

    // Exactly 5 top-level ## headers must be present (T-10 invariant)
    const h2Headers = capturedSystemPrompt.match(/^## .+/gm) ?? [];
    expect(h2Headers).toHaveLength(5);
  });

  it("get_events_range tool description instructs use of local TZ offset, not UTC Z-suffix", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = getEventsRangeTool.description ?? "";
    // Should explicitly instruct local timezone offset usage
    expect(desc.toLowerCase()).toMatch(/local.*timezone|timezone.*local|tz.*offset|local.*tz/);
  });

  it("get_events_range tool description mentions 'next Tuesday' as a natural language example", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = (getEventsRangeTool.description ?? "").toLowerCase();
    expect(desc).toContain("next tuesday");
  });

  it("get_events_range tool description mentions 'tomorrow' as a natural language example", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = (getEventsRangeTool.description ?? "").toLowerCase();
    expect(desc).toContain("tomorrow");
  });

  it("get_events_range tool description references the Live Context block as the source for date resolution", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getEventsRangeTool } = await import("../tools/calendar.js");

    const desc = (getEventsRangeTool.description ?? "").toLowerCase();
    // Should reference the system prompt / live context as the source
    expect(desc).toMatch(/live context|system prompt/);
  });
});
