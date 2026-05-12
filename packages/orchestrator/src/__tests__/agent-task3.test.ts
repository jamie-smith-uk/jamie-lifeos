/**
 * Tests for packages/orchestrator/src/agent.ts — Task-3 (Phase 2)
 *
 * Acceptance criteria:
 *   AC1: TOOL_DEFINITIONS includes all 5 Todoist tools with proper parameter schemas
 *   AC2: TODOIST_TOOL_NAMES set created with all tool names
 *   AC3: executeTool function routes Todoist tools to executeToDoistTool
 *   AC4: Tool definitions specify required parameters (content, due_date, priority, task_id, filter)
 *   AC5: Agent can successfully call Todoist tools in tool loop
 *
 * Strategy
 * --------
 * - agent.ts is imported after mocking all external dependencies:
 *     @lifeos/shared   — pool (in-memory), env, logger
 *     @anthropic-ai/sdk — controlled responses to drive tool loop
 *     ../tools/calendar.js — stubbed so no real MCP calls are made
 *     ../tools/todoist.js  — mocked to intercept executeToDoistTool calls
 *
 * - AC1 and AC4: We capture the `tools` array passed to the Anthropic API
 *   on the first call and assert on tool names and input_schema properties.
 *
 * - AC2: We import agent.ts (which does not export TODOIST_TOOL_NAMES directly)
 *   and verify correct routing behaviour. We also verify via tool name presence
 *   in TOOL_DEFINITIONS that all 5 names are registered.
 *
 * - AC3: An Anthropic mock that produces a tool_use block for each Todoist
 *   tool name verifies that executeToDoistTool is called (and not the unknown
 *   tool error path).
 *
 * - AC5: End-to-end runAgent smoke tests — one per Todoist tool — verify the
 *   agent completes the tool loop and returns a non-empty text reply.
 *
 * Tests are isolated via vi.resetModules() + vi.doMock() in beforeEach, matching
 * the patterns established in agent-t17.test.ts through agent-t20.test.ts.
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * Todoist tool definitions — that is correct and expected.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store shared by pool mock (mirrors agent-t20.test.ts pattern)
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
// Shared env / logger mock values
// ---------------------------------------------------------------------------

const MOCK_ENV = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
  TZ: "Europe/London",
  DATABASE_URL: "postgresql://localhost/test",
  TODOIST_API_TOKEN: "test-todoist-token",
  TELEGRAM_BOT_TOKEN: "123:test",
  TELEGRAM_ALLOWED_CHAT_ID: "100",
  DIGEST_CRON: "0 8 * * *",
  ORCHESTRATOR_URL: "http://localhost:3001",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  GOOGLE_REFRESH_TOKEN: "",
  BOT_MODE: "polling",
  LOG_LEVEL: "silent",
  PORT: "3001",
};

const MOCK_LOGGER = {
  child: () => MOCK_LOGGER,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

// ---------------------------------------------------------------------------
// Stub calendar tools (no-op stubs; all tests focus on Todoist wiring)
// ---------------------------------------------------------------------------

const STUB_CALENDAR_MOCKS = {
  calendarReadToolDefinitions: [],
  calendarWriteToolDefinitions: [],
  calendarFreeBusyToolDefinitions: [],
  executeCalendarTool: vi.fn().mockResolvedValue("calendar stub"),
};

// ---------------------------------------------------------------------------
// Anthropic mock factories
// ---------------------------------------------------------------------------

/**
 * Build an Anthropic mock that captures the `tools` array on the first API
 * call and always returns a plain text response (no tool loop).
 */
function buildAnthropicCapturingToolsMock(replyText = "OK") {
  let capturedTools: Array<{ name: string; description?: string; input_schema?: unknown }> = [];

  const createMock = vi
    .fn()
    .mockImplementation(
      (params: {
        tools?: Array<{ name: string; description?: string; input_schema?: unknown }>;
        model?: string;
      }) => {
        if (capturedTools.length === 0 && params.tools) {
          capturedTools = [...params.tools];
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
      },
    );

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

/**
 * Build a 2-step Anthropic mock:
 *   1st call → tool_use block for the given tool name
 *   2nd call → end_turn with the given reply text
 *
 * Used to verify the tool loop routes the Todoist call to executeToDoistTool.
 */
function buildAnthropicToolCallMock(
  toolName: string,
  toolInput: Record<string, unknown>,
  replyText = "Done.",
) {
  const toolUseResponse = {
    id: "msg_tool",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: `tu_${toolName}`,
        name: toolName,
        input: toolInput,
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 50,
      output_tokens: 20,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const finalResponse = {
    id: "msg_final",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: replyText, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    model: MOCK_ENV.ANTHROPIC_MODEL,
    usage: {
      input_tokens: 100,
      output_tokens: 40,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  };

  const responses = [toolUseResponse, finalResponse];

  const createMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();
    return Promise.resolve(response ?? finalResponse);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnthropicMockClass(this: any, _opts: unknown) {
    this.messages = { create: createMock };
  }

  return { AnthropicMockClass, createMock };
}

// ===========================================================================
// AC1 — TOOL_DEFINITIONS includes all 5 Todoist tools with proper parameter schemas
// ===========================================================================

describe("AC1 — TOOL_DEFINITIONS includes all 5 Todoist tools with proper parameter schemas", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'get_tasks' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("tasks"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1001, text: "hello", message_id: 1 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("get_tasks");
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'create_task' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("created"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1002, text: "hello", message_id: 2 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("create_task");
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'complete_task' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("completed"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1003, text: "hello", message_id: 3 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("complete_task");
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'delete_task' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("deleted"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1004, text: "hello", message_id: 4 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("delete_task");
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'update_task' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("updated"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1005, text: "hello", message_id: 5 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("update_task");
  });

  it("all 5 Todoist tool names are present in TOOL_DEFINITIONS simultaneously", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1006, text: "hello", message_id: 6 });

    const toolNames = getCapturedTools().map((t) => t.name);
    const expectedNames = [
      "get_tasks",
      "create_task",
      "complete_task",
      "delete_task",
      "update_task",
    ];
    for (const name of expectedNames) {
      expect(toolNames).toContain(name);
    }
  });

  it("'get_tasks' tool definition has an input_schema object", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1007, text: "hello", message_id: 7 });

    const tool = getCapturedTools().find((t) => t.name === "get_tasks");
    expect(tool).toBeDefined();
    expect(tool?.input_schema).toBeDefined();
    expect(typeof tool?.input_schema).toBe("object");
  });

  it("'create_task' tool definition has an input_schema object", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1008, text: "hello", message_id: 8 });

    const tool = getCapturedTools().find((t) => t.name === "create_task");
    expect(tool).toBeDefined();
    expect(tool?.input_schema).toBeDefined();
  });

  it("each Todoist tool definition has a non-empty description", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1009, text: "hello", message_id: 9 });

    const todoistNames = [
      "get_tasks",
      "create_task",
      "complete_task",
      "delete_task",
      "update_task",
    ];
    const tools = getCapturedTools();

    for (const name of todoistNames) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `Tool '${name}' should be in TOOL_DEFINITIONS`).toBeDefined();
      expect(
        (tool as { description?: string })?.description?.trim().length,
        `Tool '${name}' should have a non-empty description`,
      ).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// AC2 — TODOIST_TOOL_NAMES set created with all tool names
// ===========================================================================

describe("AC2 — TODOIST_TOOL_NAMES set contains all 5 Todoist tool names", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * We verify the TODOIST_TOOL_NAMES set indirectly: if a tool name is in the
   * set, the tool loop must route it to executeToDoistTool rather than returning
   * the "Unknown tool" error. We verify this for each of the 5 tool names.
   */

  it("'get_tasks' is in TODOIST_TOOL_NAMES — routing reaches executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("tasks list here");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "Here are your tasks.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2001, text: "show me my tasks today", message_id: 1 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("get_tasks", expect.any(Object));
  });

  it("'create_task' is in TODOIST_TOOL_NAMES — routing reaches executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task created (id: t1)");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "create_task",
      { content: "Buy milk", priority: 1 },
      "Task created.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2002, text: "add a task to buy milk", message_id: 2 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("create_task", expect.any(Object));
  });

  it("'complete_task' is in TODOIST_TOOL_NAMES — routing reaches executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-99 completed.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "complete_task",
      { task_id: "t-99" },
      "Marked as done.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2003, text: "complete task t-99", message_id: 3 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("complete_task", expect.any(Object));
  });

  it("'delete_task' is in TODOIST_TOOL_NAMES — routing reaches executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-77 deleted.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "delete_task",
      { task_id: "t-77" },
      "Task deleted.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2004, text: "delete task t-77", message_id: 4 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("delete_task", expect.any(Object));
  });

  it("'update_task' is in TODOIST_TOOL_NAMES — routing reaches executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-55 updated.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "update_task",
      { task_id: "t-55", priority: 4 },
      "Task updated.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2005, text: "update task t-55 to urgent", message_id: 5 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("update_task", expect.any(Object));
  });

  it("an unknown tool name is NOT routed to executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("should not be called");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "completely_unknown_xyz",
      {},
      "Unknown tool response.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2006, text: "trigger unknown tool", message_id: 6 });

    // executeToDoistTool must NOT be called for an unknown tool
    expect(executeToDoistToolMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AC3 — executeTool routes Todoist tools to executeToDoistTool
// ===========================================================================

describe("AC3 — executeTool routes all 5 Todoist tools to executeToDoistTool", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routing: agent loop calls executeToDoistTool with correct tool name for 'get_tasks'", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("2 tasks today");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "You have 2 tasks.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3001,
      text: "what tasks do I have today?",
      message_id: 1,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("get_tasks", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("routing: agent loop calls executeToDoistTool with correct tool name for 'create_task'", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task created (id: new-1)");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "create_task",
      { content: "Write tests", due_date: "2026-04-25", priority: 2 },
      "Task added.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3002,
      text: "add task write tests due next Friday",
      message_id: 2,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("create_task", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("routing: agent loop calls executeToDoistTool with correct tool name for 'complete_task'", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task completed.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "complete_task",
      { task_id: "t-done-1" },
      "Done!",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3003,
      text: "mark task t-done-1 as complete",
      message_id: 3,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("complete_task", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("routing: agent loop calls executeToDoistTool with correct tool name for 'delete_task'", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task deleted.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "delete_task",
      { task_id: "t-del-2" },
      "Deleted.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3004,
      text: "delete task t-del-2",
      message_id: 4,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("delete_task", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("routing: agent loop calls executeToDoistTool with correct tool name for 'update_task'", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task updated.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "update_task",
      { task_id: "t-upd-3", priority: 3 },
      "Updated.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3005,
      text: "update task t-upd-3 to high priority",
      message_id: 5,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("update_task", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("executeToDoistTool receives the tool input forwarded from the agent's tool loop", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("tasks found");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "overdue" },
      "You have overdue tasks.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 3006,
      text: "what tasks are overdue?",
      message_id: 6,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith(
      "get_tasks",
      expect.objectContaining({ filter: "overdue" }),
    );
  });

  it("calendar tools are still routed to executeCalendarTool, not executeToDoistTool", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("should not be called");
    const executeCalendarToolMock = vi.fn().mockResolvedValue("calendar result");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_todays_events",
      {},
      "Your calendar is clear.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [
        {
          name: "get_todays_events",
          description: "Get today's events",
          input_schema: { type: "object", properties: {}, required: [] },
        },
      ],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: executeCalendarToolMock,
    }));
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 3007, text: "what's on my calendar today?", message_id: 7 });

    expect(executeCalendarToolMock).toHaveBeenCalledWith("get_todays_events", expect.any(Object));
    expect(executeToDoistToolMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AC4 — Tool definitions specify required parameters
// ===========================================================================

describe("AC4 — Tool definitions specify required parameters", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("'get_tasks' tool definition includes 'filter' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4001, text: "hello", message_id: 1 });

    const tool = getCapturedTools().find((t) => t.name === "get_tasks");
    expect(tool).toBeDefined();
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect(schema.properties).toBeDefined();
    expect("filter" in (schema.properties ?? {})).toBe(true);
  });

  it("'create_task' tool definition includes 'content' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4002, text: "hello", message_id: 2 });

    const tool = getCapturedTools().find((t) => t.name === "create_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("content" in (schema.properties ?? {})).toBe(true);
  });

  it("'create_task' tool definition includes 'due_date' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4003, text: "hello", message_id: 3 });

    const tool = getCapturedTools().find((t) => t.name === "create_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("due_date" in (schema.properties ?? {})).toBe(true);
  });

  it("'create_task' tool definition includes 'priority' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4004, text: "hello", message_id: 4 });

    const tool = getCapturedTools().find((t) => t.name === "create_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("priority" in (schema.properties ?? {})).toBe(true);
  });

  it("'create_task' tool definition marks 'content' as a required property", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4005, text: "hello", message_id: 5 });

    const tool = getCapturedTools().find((t) => t.name === "create_task");
    const schema = tool?.input_schema as { required?: string[] };
    expect(schema.required).toBeDefined();
    expect(schema.required).toContain("content");
  });

  it("'complete_task' tool definition includes 'task_id' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4006, text: "hello", message_id: 6 });

    const tool = getCapturedTools().find((t) => t.name === "complete_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("task_id" in (schema.properties ?? {})).toBe(true);
  });

  it("'complete_task' tool definition marks 'task_id' as a required property", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4007, text: "hello", message_id: 7 });

    const tool = getCapturedTools().find((t) => t.name === "complete_task");
    const schema = tool?.input_schema as { required?: string[] };
    expect(schema.required).toContain("task_id");
  });

  it("'delete_task' tool definition includes 'task_id' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4008, text: "hello", message_id: 8 });

    const tool = getCapturedTools().find((t) => t.name === "delete_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("task_id" in (schema.properties ?? {})).toBe(true);
  });

  it("'delete_task' tool definition marks 'task_id' as a required property", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4009, text: "hello", message_id: 9 });

    const tool = getCapturedTools().find((t) => t.name === "delete_task");
    const schema = tool?.input_schema as { required?: string[] };
    expect(schema.required).toContain("task_id");
  });

  it("'update_task' tool definition includes 'task_id', 'due_date', and 'priority' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4010, text: "hello", message_id: 10 });

    const tool = getCapturedTools().find((t) => t.name === "update_task");
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect("task_id" in (schema.properties ?? {})).toBe(true);
    expect("due_date" in (schema.properties ?? {})).toBe(true);
    expect("priority" in (schema.properties ?? {})).toBe(true);
  });

  it("'update_task' tool definition marks 'task_id' as a required property", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4011, text: "hello", message_id: 11 });

    const tool = getCapturedTools().find((t) => t.name === "update_task");
    const schema = tool?.input_schema as { required?: string[] };
    expect(schema.required).toContain("task_id");
  });

  it("all Todoist tool input_schema types are 'object'", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4012, text: "hello", message_id: 12 });

    const todoistNames = [
      "get_tasks",
      "create_task",
      "complete_task",
      "delete_task",
      "update_task",
    ];
    const tools = getCapturedTools();

    for (const name of todoistNames) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `${name} should be in TOOL_DEFINITIONS`).toBeDefined();
      const schema = tool?.input_schema as { type?: string };
      expect(schema.type, `${name} input_schema.type should be 'object'`).toBe("object");
    }
  });
});

// ===========================================================================
// AC5 — Agent can successfully call Todoist tools in tool loop
// ===========================================================================

describe("AC5 — Agent successfully calls Todoist tools in the tool loop", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("agent completes get_tasks tool loop and returns non-empty text reply", async () => {
    const executeToDoistToolMock = vi
      .fn()
      .mockResolvedValue(
        "• [t1] Buy groceries | Due: 2026-04-21\n• [t2] Call dentist | Due: 2026-04-22",
      );
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "You have 2 tasks today: buy groceries and call dentist.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5001,
      text: "what tasks do I have today?",
      message_id: 1,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("get_tasks", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent completes create_task tool loop and returns non-empty text reply", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task created (id: new-42)");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "create_task",
      { content: "Write report", due_date: "2026-04-30", priority: 2 },
      "Task 'Write report' has been added.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5002,
      text: "add task write report due April 30",
      message_id: 2,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("create_task", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent completes complete_task tool loop and returns non-empty text reply", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-88 completed successfully.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "complete_task",
      { task_id: "t-88" },
      "Marked task t-88 as done.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5003,
      text: "complete task t-88",
      message_id: 3,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("complete_task", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent completes delete_task tool loop and returns non-empty text reply", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-55 deleted successfully.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "delete_task",
      { task_id: "t-55" },
      "Task t-55 has been deleted.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5004,
      text: "delete task t-55",
      message_id: 4,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("delete_task", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent completes update_task tool loop and returns non-empty text reply", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task t-33 updated successfully.");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "update_task",
      { task_id: "t-33", priority: 4, due_date: "2026-05-01" },
      "Updated task t-33 to urgent priority due May 1.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5005,
      text: "update task t-33 to urgent due May 1",
      message_id: 5,
    });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("update_task", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("showConfirmationKeyboard is false after Todoist tool calls (Todoist tools are not confirmation-gated)", async () => {
    const executeToDoistToolMock = vi.fn().mockResolvedValue("Task created (id: t-new)");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "create_task",
      { content: "Book dentist", priority: 1 },
      "Task added.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5006,
      text: "add task book dentist",
      message_id: 6,
    });

    // Todoist tasks are not calendar mutations — they must not trigger the confirmation keyboard
    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("tool result from executeToDoistTool is fed back to the API in the next iteration", async () => {
    const todoistResult = "• [task-feedback-1] Test result feedback";
    const executeToDoistToolMock = vi.fn().mockResolvedValue(todoistResult);

    // Script the Anthropic mock to produce a 2-step sequence
    const { AnthropicMockClass, createMock } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "Based on your tasks, you should focus on testing.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 5007,
      text: "show tasks",
      message_id: 7,
    });

    // The second API call (after the tool result) must have been made
    expect(createMock).toHaveBeenCalledTimes(2);

    // The second call's messages array must contain the tool result content
    const secondCallParams = createMock.mock.calls[1]?.[0] as {
      messages: Array<{
        role: string;
        content: string | Array<{ type: string; content?: string }>;
      }>;
    };
    const messagesStr = JSON.stringify(secondCallParams.messages);
    expect(messagesStr).toContain(todoistResult);
  });

  it("agent handles executeToDoistTool error response gracefully and still returns text", async () => {
    const executeToDoistToolMock = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ error: "Todoist API error 401: Unauthorized" }));
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "I could not retrieve your tasks due to an authentication error.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: executeToDoistToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5008,
      text: "show my tasks",
      message_id: 8,
    });

    // Agent must complete the loop and return a non-empty response even when Todoist errors
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
