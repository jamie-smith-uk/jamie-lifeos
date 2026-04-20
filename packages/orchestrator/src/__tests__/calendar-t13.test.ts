/**
 * Tests for T-13 — 'What have I got today?' intent
 *
 * Acceptance criteria:
 *   AC1: Smoke test 3: 'what have I got today?' causes agent to call get_todays_events
 *   AC2: Empty calendar returns "You have nothing scheduled today." message
 *   AC3: Events are returned in chronological order with time and title
 *
 * Strategy
 * --------
 * - The Google Calendar MCP server (fetch) is fully mocked — no real network calls.
 * - The Anthropic SDK is mocked to simulate the agent calling get_todays_events.
 * - @lifeos/shared (pool, env, logger) is mocked for full isolation.
 * - Tests verify:
 *     a) getTodaysEvents() returns the exact empty-state message "You have nothing scheduled today."
 *     b) The agent loop correctly routes get_todays_events calls via executeCalendarTool.
 *     c) The system prompt Identity block contains calendar formatting guidelines.
 *     d) The agent passes get_todays_events tool to the Anthropic API.
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

/** Build a fetch mock that returns whitespace-only text (treated as empty). */
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
 * Build an Anthropic mock that first returns a tool_use response for
 * get_todays_events, then returns a text response with the given reply.
 */
function buildAnthropicMockWithCalendarTool(
  toolId: string,
  finalReply: string,
) {
  let callCount = 0;

  const createMock = vi.fn().mockImplementation(
    (params: { system: string; model: string; messages: unknown[] }) => {
      callCount++;

      if (callCount === 1) {
        // First call: return a tool_use for get_todays_events
        return Promise.resolve({
          id: "msg_tool",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: toolId,
              name: "get_todays_events",
              input: {},
              caller: { type: "direct" },
            },
          ],
          model: params.model,
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: {
            input_tokens: 15,
            output_tokens: 8,
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
          input_tokens: 20,
          output_tokens: 15,
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
  let capturedMessagesInSecondCall: unknown[] = [];

  // Wrap to capture system prompt and tools
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
      if (callCount >= 1) {
        capturedMessagesInSecondCall = params.messages as unknown[];
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
    getMessagesInSecondCall: () => capturedMessagesInSecondCall,
  };
}

// ---------------------------------------------------------------------------
// AC1 — 'what have I got today?' causes agent to call get_todays_events
// ---------------------------------------------------------------------------

describe("AC1 — 'what have I got today?' triggers get_todays_events tool call", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("runAgent calls the Anthropic API with get_todays_events in tool definitions", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithCalendarTool(
      "tool_today_001",
      "You have 3 events today.",
    );

    // Mock the MCP fetch call for get_todays_events
    global.fetch = buildSuccessFetchMock("9:00 AM — Stand-up\n12:30 PM — Lunch");

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
    await runAgent({ chat_id: 1, text: "what have I got today?", message_id: 1 });

    // Should have called create() at least once
    expect(createMock).toHaveBeenCalled();

    // The first call must include get_todays_events in tools
    const firstCallArgs = createMock.mock.calls[0] as [
      { tools?: Array<{ name: string }> },
    ];
    const tools = firstCallArgs[0].tools ?? [];
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("get_todays_events");
  });

  it("runAgent executes the tool loop when model calls get_todays_events", async () => {
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithCalendarTool(
      "tool_today_002",
      "Here are your events: ...",
    );

    global.fetch = buildSuccessFetchMock("10:00 AM — Team sync\n2:00 PM — Code review");

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
    await runAgent({ chat_id: 2, text: "what have I got today?", message_id: 2 });

    // The agent should call create() twice: initial call + after tool result
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("runAgent feeds get_todays_events result back to the model as a tool_result", async () => {
    const TOOL_ID = "tool_today_003";
    const poolMock = buildPoolMock();
    const { AnthropicMockClass, createMock } = buildAnthropicMockWithCalendarTool(
      TOOL_ID,
      "You have 2 events today.",
    );

    global.fetch = buildSuccessFetchMock("9:00 AM — Stand-up\n3:00 PM — Planning");

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
    await runAgent({ chat_id: 3, text: "what have I got today?", message_id: 3 });

    // The second Anthropic call should include a tool_result message
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

    // The tool_result must reference the correct tool_use_id
    const resultBlock = (
      toolResultMsg!.content as Anthropic.ToolResultBlockParam[]
    ).find((b) => b.type === "tool_result");
    expect(resultBlock).toBeDefined();
    expect(resultBlock!.tool_use_id).toBe(TOOL_ID);
  });

  it("runAgent returns the final text from the model after the tool loop", async () => {
    const FINAL_REPLY =
      "Here are your events today:\n1. 9:00 AM — Stand-up\n2. 3:00 PM — Planning";
    const poolMock = buildPoolMock();
    const { AnthropicMockClass } = buildAnthropicMockWithCalendarTool(
      "tool_today_004",
      FINAL_REPLY,
    );

    global.fetch = buildSuccessFetchMock("9:00 AM — Stand-up\n3:00 PM — Planning");

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
    const result = await runAgent({
      chat_id: 4,
      text: "what have I got today?",
      message_id: 4,
    });

    expect(result.text).toBe(FINAL_REPLY);
  });
});

// ---------------------------------------------------------------------------
// AC2 — Empty calendar returns "You have nothing scheduled today."
// ---------------------------------------------------------------------------

describe("AC2 — empty calendar returns exact empty-state message", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("getTodaysEvents returns exactly 'You have nothing scheduled today.' when MCP result is empty", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(result).toBe("You have nothing scheduled today.");
  });

  it("getTodaysEvents returns 'You have nothing scheduled today.' when MCP text is whitespace only", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildWhitespaceTextFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(result).toBe("You have nothing scheduled today.");
  });

  it("empty-state message is a non-empty human-readable string", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("empty-state message is NOT valid JSON (it is a plain English sentence)", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    // Should not be parseable as JSON — it should be a plain sentence
    expect(() => JSON.parse(result)).toThrow();
  });

  it("executeCalendarTool('get_todays_events', {}) also returns empty-state message when MCP is empty", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildEmptyFetchMock();
    const { executeCalendarTool } = await import("../tools/calendar.js");

    const result = await executeCalendarTool("get_todays_events", {});
    expect(result).toBe("You have nothing scheduled today.");
  });

  it("system prompt Identity block instructs the agent to use 'You have nothing scheduled today.' for empty calendars", async () => {
    // We can verify this by importing agent.ts (via mock) and checking the system prompt
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
    await runAgent({ chat_id: 50, text: "hello", message_id: 50 });

    // The system prompt should instruct the agent about the empty-state message
    expect(capturedSystemPrompt).toContain("You have nothing scheduled today.");
  });
});

// ---------------------------------------------------------------------------
// AC3 — Events are in chronological order with time and title
// ---------------------------------------------------------------------------

describe("AC3 — events chronological order and formatting guidance", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("getTodaysEvents returns MCP result string directly (chronological order from MCP)", async () => {
    const chronologicalEvents =
      "9:00 AM — Stand-up\n11:00 AM — Design Review\n3:00 PM — Planning @ Office";
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    global.fetch = buildSuccessFetchMock(chronologicalEvents);
    const { getTodaysEvents } = await import("../tools/calendar.js");

    const result = await getTodaysEvents();
    expect(result).toBe(chronologicalEvents);
  });

  it("system prompt Identity block instructs agent to format events chronologically", async () => {
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
    await runAgent({ chat_id: 60, text: "hello", message_id: 60 });

    // System prompt should contain guidance about chronological ordering
    expect(capturedSystemPrompt.toLowerCase()).toMatch(/chronological/);
  });

  it("system prompt Identity block mentions start time in event format", async () => {
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
    await runAgent({ chat_id: 61, text: "hello", message_id: 61 });

    // Identity block should instruct model to include start time
    const identityStart = capturedSystemPrompt.indexOf("## Identity");
    const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
    const identityBlock = capturedSystemPrompt.slice(identityStart, liveContextStart);

    expect(identityBlock.toLowerCase()).toMatch(/start time/);
  });

  it("system prompt Identity block mentions location in event format", async () => {
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
    await runAgent({ chat_id: 62, text: "hello", message_id: 62 });

    // Identity block should mention location in event format
    const identityStart = capturedSystemPrompt.indexOf("## Identity");
    const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
    const identityBlock = capturedSystemPrompt.slice(identityStart, liveContextStart);

    expect(identityBlock.toLowerCase()).toContain("location");
  });

  it("system prompt still has exactly 5 top-level ## blocks (T-13 does not add new blocks)", async () => {
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
    await runAgent({ chat_id: 63, text: "hello", message_id: 63 });

    // Exactly 5 top-level ## headers must be present
    const h2Headers = capturedSystemPrompt.match(/^## .+/gm) ?? [];
    expect(h2Headers).toHaveLength(5);
  });

  it("get_todays_events tool description mentions chronological ordering", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");

    expect(
      (getTodaysEventsTool.description ?? "").toLowerCase(),
    ).toMatch(/chronological/);
  });

  it("get_todays_events tool description mentions listing with time and title", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");

    const desc = (getTodaysEventsTool.description ?? "").toLowerCase();
    expect(desc).toMatch(/time/);
    expect(desc).toMatch(/title/);
  });

  it("get_todays_events tool description mentions location in event format", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");

    expect(
      (getTodaysEventsTool.description ?? "").toLowerCase(),
    ).toContain("location");
  });

  it("get_todays_events tool description references 'You have nothing scheduled today.' for empty case", async () => {
    vi.doMock("@lifeos/shared", () => ({ logger: buildLoggerMock() }));
    const { getTodaysEventsTool } = await import("../tools/calendar.js");

    expect(getTodaysEventsTool.description ?? "").toContain(
      "You have nothing scheduled today.",
    );
  });
});
