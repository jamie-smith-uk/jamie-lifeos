/**
 * Tests for packages/orchestrator/src/agent.ts — T-10
 *
 * Acceptance criteria:
 *   AC1: Agent returns a text response for a plain 'hello' message
 *   AC2: Tool loop executes tools and feeds results back until no more tool_use blocks
 *   AC3: System prompt contains all five blocks in correct order
 *   AC4: Model ID is claude-sonnet-4-20250514 — not hardcoded elsewhere
 *
 * Strategy
 * --------
 * The `@lifeos/shared` module is mocked so no real DB or env vars are needed.
 * The `@anthropic-ai/sdk` Anthropic client is mocked to return controlled
 * responses, enabling us to verify:
 *   - runAgent returns a string text response for a simple message
 *   - the tool loop iterates correctly when stop_reason is "tool_use"
 *   - the system prompt passed to the API contains all five required blocks
 *     in the correct order
 *   - the model ID used is always sourced from env.ANTHROPIC_MODEL (which
 *     defaults to "claude-sonnet-4-20250514")
 *
 * All tests are isolated via vi.resetModules() + vi.doMock() in beforeEach.
 *
 * Note: Anthropic SDK types (TextBlock, ToolUseBlock, Usage) have evolved
 * with new required fields. Since we are mocking the entire Anthropic client
 * and never pass these objects through real SDK validation, we use
 * `as unknown as Anthropic.Message` casts for mock response construction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Shared test state
// ---------------------------------------------------------------------------

/** Latest system prompt captured from the Anthropic mock create() call. */
let capturedSystemPrompt = "";

/** All model IDs used in mock create() calls. */
let capturedModelIds: string[] = [];

/** All messages arrays passed to mock create() calls. */
let capturedMessageArrays: unknown[][] = [];

/** Number of times the Anthropic create() was called. */
let anthropicCreateCallCount = 0;

function resetCaptures() {
  capturedSystemPrompt = "";
  capturedModelIds = [];
  capturedMessageArrays = [];
  anthropicCreateCallCount = 0;
}

// ---------------------------------------------------------------------------
// Helpers to build Anthropic-style response objects
// These are plain objects cast to Anthropic.Message since we mock the SDK.
// ---------------------------------------------------------------------------

function makeTextResponse(text: string): Anthropic.Message {
  return {
    id: "msg_test_text",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text, citations: null }],
    model: "claude-sonnet-4-20250514",
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
  } as unknown as Anthropic.Message;
}

function makeToolUseResponse(
  toolId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
): Anthropic.Message {
  return {
    id: "msg_test_tool",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: toolId,
        name: toolName,
        input: toolInput,
        caller: { type: "direct" },
      },
    ],
    model: "claude-sonnet-4-20250514",
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
  } as unknown as Anthropic.Message;
}

function makeEmptyContentResponse(): Anthropic.Message {
  return {
    id: "msg_no_text",
    type: "message",
    role: "assistant",
    content: [],
    model: "claude-sonnet-4-20250514",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 5,
      output_tokens: 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      inference_geo: null,
      server_tool_use: null,
      service_tier: null,
    },
  } as unknown as Anthropic.Message;
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/** Build a silent logger mock */
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

/** Build a pool mock that returns empty rows (context not needed for T-10 tests) */
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

/**
 * Build an Anthropic SDK mock with a configurable response sequence.
 * Each call to messages.create() pops the next response from the queue.
 *
 * IMPORTANT: The AnthropicMockClass must be a real `function` (not an arrow
 * function) so that `new Anthropic(...)` in agent.ts works correctly.
 * vi.fn() arrow-function mocks cannot be used as constructors.
 */
function buildAnthropicMock(responses: Anthropic.Message[]) {
  const queue = [...responses];

  const createMock = vi.fn().mockImplementation(
    (params: { system: string; model: string; messages: unknown[] }) => {
      anthropicCreateCallCount++;
      capturedSystemPrompt = params.system;
      capturedModelIds.push(params.model);
      capturedMessageArrays.push(params.messages);

      const response = queue.shift();
      if (!response) {
        return Promise.resolve(makeTextResponse("(no more responses queued)"));
      }
      return Promise.resolve(response);
    },
  );

  // Must be a real function (not an arrow function) to work with `new`.
  const capturedCreateMock = createMock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: capturedCreateMock };
  }

  return { AnthropicMockClass, createMock };
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("T-10 — runAgent agent core", () => {
  beforeEach(() => {
    resetCaptures();
    vi.resetModules();
  });

  // =========================================================================
  // AC1: Agent returns a text response for a plain 'hello' message
  // =========================================================================

  describe("AC1 — runAgent returns a text response for a plain hello message", () => {
    it("returns a non-empty string for a hello message", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeTextResponse("Hello! How can I help you today?"),
      ]);

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
        chat_id: 1,
        text: "hello",
        message_id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns the exact text from the API response TextBlock", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeTextResponse("Hello! How can I help you today?"),
      ]);

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
        chat_id: 2,
        text: "hello",
        message_id: 2,
      });

      expect(result).toBe("Hello! How can I help you today?");
    });

    it("returns a fallback string when the response has no text block", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeEmptyContentResponse()]);

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
        chat_id: 3,
        text: "hello",
        message_id: 3,
      });

      // Should return the fallback string (non-empty)
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("passes the user message as the last message to the API", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeTextResponse("Hi there!"),
      ]);

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

      await runAgent({
        chat_id: 4,
        text: "hello",
        message_id: 4,
      });

      // The messages array passed to create() should end with the user's message
      const firstCallMessages = capturedMessageArrays[0] as Anthropic.MessageParam[];
      expect(firstCallMessages).toBeDefined();
      const lastMessage = firstCallMessages[firstCallMessages.length - 1];
      expect(lastMessage).toBeDefined();
      expect(lastMessage!.role).toBe("user");
      expect(lastMessage!.content).toBe("hello");
    });

    it("calls messages.create() exactly once for a simple message", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass, createMock } = buildAnthropicMock([
        makeTextResponse("Hi!"),
      ]);

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

      await runAgent({ chat_id: 5, text: "hello", message_id: 5 });

      expect(createMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // AC2: Tool loop executes tools and feeds results back until no more tool_use blocks
  // =========================================================================

  describe("AC2 — tool loop executes tools and feeds results back", () => {
    it("calls the API again when the first response has stop_reason='tool_use'", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass, createMock } = buildAnthropicMock([
        makeToolUseResponse("tool_001", "get_weather", { location: "London" }),
        makeTextResponse("It is sunny in London."),
      ]);

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

      const result = await runAgent({ chat_id: 10, text: "What is the weather?", message_id: 10 });

      // Should have called create() twice: initial + once after tool result
      expect(createMock).toHaveBeenCalledTimes(2);
      expect(result).toBe("It is sunny in London.");
    });

    it("appends tool_result messages to the conversation before re-calling the API", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse("tool_002", "search_calendar", { query: "meetings" }),
        makeTextResponse("You have 3 meetings tomorrow."),
      ]);

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

      await runAgent({ chat_id: 11, text: "What meetings do I have?", message_id: 11 });

      // Second call's messages should contain a user message with tool_result content
      const secondCallMessages = capturedMessageArrays[1] as Anthropic.MessageParam[];
      expect(secondCallMessages).toBeDefined();

      // Find a user message with tool_result content
      const toolResultMessage = secondCallMessages.find(
        (m) =>
          m.role === "user" &&
          Array.isArray(m.content) &&
          (m.content as Anthropic.ToolResultBlockParam[]).some(
            (block) => block.type === "tool_result",
          ),
      );
      expect(toolResultMessage).toBeDefined();
    });

    it("the tool_result includes the correct tool_use_id", async () => {
      const TOOL_ID = "tool_abc123";
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse(TOOL_ID, "list_events", { date: "2026-04-20" }),
        makeTextResponse("Here are your events."),
      ]);

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

      await runAgent({ chat_id: 12, text: "List my events", message_id: 12 });

      // Find the tool_result in the second call's messages
      const secondCallMessages = capturedMessageArrays[1] as Anthropic.MessageParam[];
      const userMessages = secondCallMessages.filter((m) => m.role === "user");
      const toolResultUserMsg = userMessages.find(
        (m) =>
          Array.isArray(m.content) &&
          (m.content as Anthropic.ToolResultBlockParam[]).some(
            (b) => b.type === "tool_result",
          ),
      );
      expect(toolResultUserMsg).toBeDefined();

      const toolResultContent = (toolResultUserMsg!.content as Anthropic.ToolResultBlockParam[]).find(
        (b) => b.type === "tool_result",
      );
      expect(toolResultContent).toBeDefined();
      expect(toolResultContent!.tool_use_id).toBe(TOOL_ID);
    });

    it("continues the tool loop for multiple sequential tool calls", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass, createMock } = buildAnthropicMock([
        makeToolUseResponse("tool_001", "tool_one", {}),
        makeToolUseResponse("tool_002", "tool_two", {}),
        makeTextResponse("Done with both tools."),
      ]);

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

      const result = await runAgent({ chat_id: 13, text: "Use both tools", message_id: 13 });

      // Should have called create() three times: initial + two tool loops
      expect(createMock).toHaveBeenCalledTimes(3);
      expect(result).toBe("Done with both tools.");
    });

    it("does NOT call the API again when stop_reason is end_turn (no tool_use)", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass, createMock } = buildAnthropicMock([
        makeTextResponse("Simple answer, no tools needed."),
      ]);

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

      await runAgent({ chat_id: 14, text: "What is 2+2?", message_id: 14 });

      // Only the initial call — no tool loop
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("returns the final text after multiple tool iterations", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse("t1", "tool_a", { x: 1 }),
        makeToolUseResponse("t2", "tool_b", { y: 2 }),
        makeToolUseResponse("t3", "tool_c", { z: 3 }),
        makeTextResponse("Final answer after 3 tools."),
      ]);

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

      const result = await runAgent({ chat_id: 15, text: "Do complex task", message_id: 15 });

      expect(result).toBe("Final answer after 3 tools.");
    });

    it("appends the assistant tool_use response to messages before feeding tool_result", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse("t_check", "my_tool", { key: "value" }),
        makeTextResponse("Done."),
      ]);

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
      await runAgent({ chat_id: 16, text: "trigger tool", message_id: 16 });

      // The second call's messages must include an assistant message with the tool_use block
      const secondCallMsgs = capturedMessageArrays[1] as Anthropic.MessageParam[];
      const assistantWithToolUse = secondCallMsgs.find(
        (m) =>
          m.role === "assistant" &&
          Array.isArray(m.content) &&
          (m.content as Anthropic.ContentBlock[]).some((b) => b.type === "tool_use"),
      );
      expect(assistantWithToolUse).toBeDefined();
    });
  });

  // =========================================================================
  // AC3: System prompt contains all five blocks in correct order
  // =========================================================================

  describe("AC3 — system prompt contains all five blocks in correct order", () => {
    it("system prompt contains all five required section headers", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 20, text: "hello", message_id: 20 });

      expect(capturedSystemPrompt).toContain("## Identity");
      expect(capturedSystemPrompt).toContain("## Live Context");
      expect(capturedSystemPrompt).toContain("## People Index");
      expect(capturedSystemPrompt).toContain("## Pending Nudges");
      expect(capturedSystemPrompt).toContain("## Active Automations");
    });

    it("blocks appear in the correct order: Identity → Live Context → People Index → Pending Nudges → Active Automations", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 21, text: "hello", message_id: 21 });

      const prompt = capturedSystemPrompt;
      const idxIdentity = prompt.indexOf("## Identity");
      const idxLiveContext = prompt.indexOf("## Live Context");
      const idxPeopleIndex = prompt.indexOf("## People Index");
      const idxPendingNudges = prompt.indexOf("## Pending Nudges");
      const idxActiveAutomations = prompt.indexOf("## Active Automations");

      // All blocks must be present
      expect(idxIdentity).toBeGreaterThanOrEqual(0);
      expect(idxLiveContext).toBeGreaterThanOrEqual(0);
      expect(idxPeopleIndex).toBeGreaterThanOrEqual(0);
      expect(idxPendingNudges).toBeGreaterThanOrEqual(0);
      expect(idxActiveAutomations).toBeGreaterThanOrEqual(0);

      // Correct ordering
      expect(idxIdentity).toBeLessThan(idxLiveContext);
      expect(idxLiveContext).toBeLessThan(idxPeopleIndex);
      expect(idxPeopleIndex).toBeLessThan(idxPendingNudges);
      expect(idxPendingNudges).toBeLessThan(idxActiveAutomations);
    });

    it("Live Context block contains current datetime (ISO 8601) and timezone", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 22, text: "hello", message_id: 22 });

      // Live Context block should contain datetime info and timezone
      const liveContextStart = capturedSystemPrompt.indexOf("## Live Context");
      const liveContextEnd = capturedSystemPrompt.indexOf("## People Index");
      const liveContextBlock = capturedSystemPrompt.slice(liveContextStart, liveContextEnd);

      // Should contain a timezone reference
      expect(liveContextBlock).toContain("Europe/London");
      // Should contain some form of datetime (ISO 8601 format: YYYY-MM-DDTHH:MM:SS)
      expect(liveContextBlock).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("People Index block indicates empty state in Phase 1", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 23, text: "hello", message_id: 23 });

      const peopleStart = capturedSystemPrompt.indexOf("## People Index");
      const pendingStart = capturedSystemPrompt.indexOf("## Pending Nudges");
      const peopleBlock = capturedSystemPrompt.slice(peopleStart, pendingStart);

      // Should indicate Phase 1 empty state
      expect(peopleBlock.toLowerCase()).toMatch(/phase 1|empty|no people/i);
    });

    it("Pending Nudges block indicates empty state in Phase 1", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 24, text: "hello", message_id: 24 });

      const nudgesStart = capturedSystemPrompt.indexOf("## Pending Nudges");
      const autoStart = capturedSystemPrompt.indexOf("## Active Automations");
      const nudgesBlock = capturedSystemPrompt.slice(nudgesStart, autoStart);

      expect(nudgesBlock.toLowerCase()).toMatch(/phase 1|empty|no pending/i);
    });

    it("Active Automations block indicates empty state in Phase 1", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 25, text: "hello", message_id: 25 });

      const autoStart = capturedSystemPrompt.indexOf("## Active Automations");
      const autoBlock = capturedSystemPrompt.slice(autoStart);

      expect(autoBlock.toLowerCase()).toMatch(/phase 1|empty|no active/i);
    });

    it("system prompt is a non-empty string passed as 'system' to messages.create()", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("OK")]);

      vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
      vi.doMock("@lifeos/shared", () => ({
        pool: poolMock.pool,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "UTC",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: buildLoggerMock(),
      }));

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 26, text: "hi", message_id: 26 });

      // system prompt should be a non-empty string
      expect(typeof capturedSystemPrompt).toBe("string");
      expect(capturedSystemPrompt.length).toBeGreaterThan(100);
    });

    it("system prompt contains exactly five top-level ## headers", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("OK")]);

      vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
      vi.doMock("@lifeos/shared", () => ({
        pool: poolMock.pool,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "UTC",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: buildLoggerMock(),
      }));

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 27, text: "hi", message_id: 27 });

      // Count top-level ## headers (lines starting with "## ")
      const h2Headers = capturedSystemPrompt.match(/^## .+/gm) ?? [];
      expect(h2Headers).toHaveLength(5);
    });
  });

  // =========================================================================
  // AC4: Model ID is claude-sonnet-4-20250514 — not hardcoded elsewhere
  // =========================================================================

  describe("AC4 — model ID is sourced from env.ANTHROPIC_MODEL", () => {
    it("uses the model ID from env.ANTHROPIC_MODEL (default: claude-sonnet-4-20250514)", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

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
      await runAgent({ chat_id: 30, text: "hello", message_id: 30 });

      expect(capturedModelIds[0]).toBe("claude-sonnet-4-20250514");
    });

    it("uses the model ID from env even when overridden to a different value", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([makeTextResponse("Hi!")]);

      vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
      vi.doMock("@lifeos/shared", () => ({
        pool: poolMock.pool,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-opus-4-20251001", // custom override
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: buildLoggerMock(),
      }));

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 31, text: "hello", message_id: 31 });

      // Should use the env value, NOT a hardcoded string
      expect(capturedModelIds[0]).toBe("claude-opus-4-20251001");
    });

    it("uses the same model ID in all tool loop iterations", async () => {
      const MODEL = "claude-sonnet-4-20250514";
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse("t1", "some_tool", {}),
        makeTextResponse("Done."),
      ]);

      vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
      vi.doMock("@lifeos/shared", () => ({
        pool: poolMock.pool,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: MODEL,
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: buildLoggerMock(),
      }));

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 32, text: "trigger tool", message_id: 32 });

      // Two API calls (initial + tool loop) — both must use the same model ID
      expect(capturedModelIds).toHaveLength(2);
      expect(capturedModelIds[0]).toBe(MODEL);
      expect(capturedModelIds[1]).toBe(MODEL);
    });

    it("model ID in all API calls matches env.ANTHROPIC_MODEL exactly", async () => {
      const CUSTOM_MODEL = "claude-haiku-4-20251001";
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeToolUseResponse("t1", "tool_a", {}),
        makeToolUseResponse("t2", "tool_b", {}),
        makeTextResponse("Final."),
      ]);

      vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
      vi.doMock("@lifeos/shared", () => ({
        pool: poolMock.pool,
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: CUSTOM_MODEL,
          TZ: "UTC",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: buildLoggerMock(),
      }));

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 33, text: "do things", message_id: 33 });

      // 3 API calls total — all must use the env-sourced model
      expect(capturedModelIds).toHaveLength(3);
      for (const modelId of capturedModelIds) {
        expect(modelId).toBe(CUSTOM_MODEL);
      }
    });

    it("agent.ts source does not use the model ID as an operational hardcoded value (only in comments)", async () => {
      // Read the agent.ts source code and verify the model string "claude-sonnet-4-20250514"
      // does not appear outside of comments — it should only be read from env.ANTHROPIC_MODEL.
      // Comments are stripped before checking, so doc comments explaining the default are allowed.
      const fs = await import("fs");
      const agentSource = fs.readFileSync(
        "/Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts",
        "utf8",
      );

      // Strip line comments (// ...) and block comments (/* ... */) from the source
      const sourceWithoutComments = agentSource
        .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
        .replace(/\/\/[^\n]*/g, "");       // line comments

      // After removing comments, the model ID should not appear as a string literal
      const modelLiteralPattern = /"claude-sonnet-4-20250514"/g;
      const matches = sourceWithoutComments.match(modelLiteralPattern);

      expect(matches).toBeNull();
    });

    it("env.ts (shared) contains the claude-sonnet-4-20250514 default as the canonical definition", async () => {
      // The canonical source of the model ID default should be in shared/src/env.ts
      const fs = await import("fs");
      const envSource = fs.readFileSync(
        "/Users/jamie/Documents/jamie-lifeos/packages/shared/src/env.ts",
        "utf8",
      );
      expect(envSource).toContain("claude-sonnet-4-20250514");
    });
  });

  // =========================================================================
  // Integration: context loading and message persistence
  // =========================================================================

  describe("Integration — context and message persistence", () => {
    it("loads context via pool.query before calling the Anthropic API", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass, createMock } = buildAnthropicMock([
        makeTextResponse("Hello!"),
      ]);

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
      await runAgent({ chat_id: 40, text: "hi", message_id: 40 });

      // pool.query should have been called (for loadContext SELECT)
      expect(poolMock.pool.query).toHaveBeenCalled();

      // And Anthropic create() should also have been called
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("saves the user message and assistant reply after the agent loop", async () => {
      const poolMock = buildPoolMock();
      const { AnthropicMockClass } = buildAnthropicMock([
        makeTextResponse("The assistant reply."),
      ]);

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
      await runAgent({ chat_id: 41, text: "save this", message_id: 41 });

      // pool.connect should have been called twice: once for user message, once for assistant
      expect(poolMock.pool.connect).toHaveBeenCalledTimes(2);
    });
  });
});
