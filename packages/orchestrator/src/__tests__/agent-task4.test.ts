/**
 * Tests for packages/orchestrator/src/agent.ts — Task-4 (Phase 2)
 *
 * Acceptance criteria:
 *   AC1: TOOL_DEFINITIONS includes Gmail tools (get_inbox_summary, get_thread) with proper schemas
 *   AC2: GMAIL_TOOL_NAMES set created with tool names
 *   AC3: executeTool function routes Gmail tools to executeGmailTool
 *   AC4: Tool definitions specify required parameters (thread_id for get_thread)
 *   AC5: Agent can successfully call Gmail tools in tool loop
 *
 * Strategy
 * --------
 * - agent.ts is imported after mocking all external dependencies:
 *     @lifeos/shared         — pool (in-memory), env, logger
 *     @anthropic-ai/sdk      — controlled responses to drive tool loop
 *     ../tools/calendar.js   — stubbed so no real MCP calls are made
 *     ../tools/todoist.js    — stubbed so no Todoist calls are made
 *     ../tools/gmail.js      — mocked to intercept executeGmailTool calls
 *
 * - AC1 and AC4: We capture the `tools` array passed to the Anthropic API
 *   on the first call and assert on tool names and input_schema properties.
 *
 * - AC2: GMAIL_TOOL_NAMES is not exported directly; we verify correct routing
 *   behaviour (tools routed to executeGmailTool, not the unknown-tool path).
 *   We also confirm both names are present in TOOL_DEFINITIONS.
 *
 * - AC3: An Anthropic mock that produces a tool_use block for each Gmail tool
 *   name verifies that executeGmailTool is called (and not the unknown-tool
 *   error path).
 *
 * - AC5: End-to-end runAgent smoke tests verify the agent completes the tool
 *   loop and returns a non-empty text reply.
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * Gmail tool definitions — that is correct and expected.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store shared by pool mock (mirrors agent-task3.test.ts pattern)
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
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REFRESH_TOKEN: "test-refresh-token",
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
// Stub calendar and Todoist tools (no-op stubs; all tests focus on Gmail wiring)
// ---------------------------------------------------------------------------

const STUB_CALENDAR_MOCKS = {
  calendarReadToolDefinitions: [],
  calendarWriteToolDefinitions: [],
  calendarFreeBusyToolDefinitions: [],
  executeCalendarTool: vi.fn().mockResolvedValue("calendar stub"),
};

const STUB_TODOIST_MOCKS = {
  executeToDoistTool: vi.fn().mockResolvedValue("todoist stub"),
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
 * Used to verify the tool loop routes Gmail tool calls to executeGmailTool.
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
// AC1 — TOOL_DEFINITIONS includes Gmail tools with proper schemas
// ===========================================================================

describe("AC1 — TOOL_DEFINITIONS includes Gmail tools with proper schemas", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'get_inbox_summary' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("inbox stub"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1001, text: "hello", message_id: 1 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("get_inbox_summary");
  });

  it("TOOL_DEFINITIONS passed to Anthropic API includes 'get_thread' tool", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("thread stub"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1002, text: "hello", message_id: 2 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("get_thread");
  });

  it("both Gmail tool names are present in TOOL_DEFINITIONS simultaneously", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1003, text: "hello", message_id: 3 });

    const toolNames = getCapturedTools().map((t) => t.name);
    expect(toolNames).toContain("get_inbox_summary");
    expect(toolNames).toContain("get_thread");
  });

  it("'get_inbox_summary' tool definition has an input_schema object", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1004, text: "hello", message_id: 4 });

    const tool = getCapturedTools().find((t) => t.name === "get_inbox_summary");
    expect(tool).toBeDefined();
    expect(tool?.input_schema).toBeDefined();
    expect(typeof tool?.input_schema).toBe("object");
  });

  it("'get_thread' tool definition has an input_schema object", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1005, text: "hello", message_id: 5 });

    const tool = getCapturedTools().find((t) => t.name === "get_thread");
    expect(tool).toBeDefined();
    expect(tool?.input_schema).toBeDefined();
    expect(typeof tool?.input_schema).toBe("object");
  });

  it("each Gmail tool definition has a non-empty description", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1006, text: "hello", message_id: 6 });

    const gmailNames = ["get_inbox_summary", "get_thread"];
    const tools = getCapturedTools();

    for (const name of gmailNames) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `Tool '${name}' should be in TOOL_DEFINITIONS`).toBeDefined();
      expect(
        (tool as { description?: string })?.description?.trim().length,
        `Tool '${name}' should have a non-empty description`,
      ).toBeGreaterThan(0);
    }
  });

  it("Gmail tool input_schema types are 'object'", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 1007, text: "hello", message_id: 7 });

    const gmailNames = ["get_inbox_summary", "get_thread"];
    const tools = getCapturedTools();

    for (const name of gmailNames) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `${name} should be in TOOL_DEFINITIONS`).toBeDefined();
      const schema = tool?.input_schema as { type?: string };
      expect(schema.type, `${name} input_schema.type should be 'object'`).toBe("object");
    }
  });
});

// ===========================================================================
// AC2 — GMAIL_TOOL_NAMES set created with tool names
// ===========================================================================

describe("AC2 — GMAIL_TOOL_NAMES set contains Gmail tool names", () => {
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
   * We verify GMAIL_TOOL_NAMES indirectly: if a name is in the set, the tool
   * loop routes it to executeGmailTool rather than the "Unknown tool" error.
   */

  it("'get_inbox_summary' is in GMAIL_TOOL_NAMES — routing reaches executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("inbox summary here");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "Here is your inbox.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2001, text: "show me my inbox", message_id: 1 });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_inbox_summary", expect.any(Object));
  });

  it("'get_thread' is in GMAIL_TOOL_NAMES — routing reaches executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("thread contents here");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_thread",
      { thread_id: "thread-abc-123" },
      "Here is the email thread.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2002, text: "show me thread thread-abc-123", message_id: 2 });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_thread", expect.any(Object));
  });

  it("an unknown tool name is NOT routed to executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("should not be called");
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
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2003, text: "trigger unknown tool", message_id: 3 });

    expect(executeGmailToolMock).not.toHaveBeenCalled();
  });

  it("Todoist tool names are NOT routed to executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("should not be called");
    const executeToDoistToolMock = vi.fn().mockResolvedValue("tasks list");
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
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 2004, text: "what are my tasks?", message_id: 4 });

    expect(executeGmailToolMock).not.toHaveBeenCalled();
    expect(executeToDoistToolMock).toHaveBeenCalledWith("get_tasks", expect.any(Object));
  });
});

// ===========================================================================
// AC3 — executeTool routes Gmail tools to executeGmailTool
// ===========================================================================

describe("AC3 — executeTool routes Gmail tools to executeGmailTool", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routing: agent loop calls executeGmailTool with correct tool name for 'get_inbox_summary'", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("3 unread emails");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "You have 3 unread emails.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3001,
      text: "check my email",
      message_id: 1,
    });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_inbox_summary", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("routing: agent loop calls executeGmailTool with correct tool name for 'get_thread'", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("thread messages here");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_thread",
      { thread_id: "th-xyz-789" },
      "Here is the thread.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 3002,
      text: "show me email thread th-xyz-789",
      message_id: 2,
    });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_thread", expect.any(Object));
    expect(typeof result.text).toBe("string");
  });

  it("executeGmailTool receives the tool input forwarded from the agent's tool loop", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("thread content");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_thread",
      { thread_id: "forwarded-thread-id" },
      "Here are the thread messages.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 3003,
      text: "show me email thread forwarded-thread-id",
      message_id: 3,
    });

    expect(executeGmailToolMock).toHaveBeenCalledWith(
      "get_thread",
      expect.objectContaining({ thread_id: "forwarded-thread-id" }),
    );
  });

  it("calendar tools are still routed to executeCalendarTool, not executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("should not be called");
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
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 3004, text: "what's on my calendar today?", message_id: 4 });

    expect(executeCalendarToolMock).toHaveBeenCalledWith("get_todays_events", expect.any(Object));
    expect(executeGmailToolMock).not.toHaveBeenCalled();
  });

  it("Todoist tools are still routed to executeToDoistTool, not executeGmailTool", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("should not be called");
    const executeToDoistToolMock = vi.fn().mockResolvedValue("tasks");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_tasks",
      { filter: "today" },
      "Your tasks for today.",
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
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 3005, text: "show me my tasks", message_id: 5 });

    expect(executeToDoistToolMock).toHaveBeenCalledWith("get_tasks", expect.any(Object));
    expect(executeGmailToolMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AC4 — Tool definitions specify required parameters (thread_id for get_thread)
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

  it("'get_thread' tool definition includes 'thread_id' in its properties", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4001, text: "hello", message_id: 1 });

    const tool = getCapturedTools().find((t) => t.name === "get_thread");
    expect(tool).toBeDefined();
    const schema = tool?.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect(schema.properties).toBeDefined();
    expect("thread_id" in (schema.properties ?? {})).toBe(true);
  });

  it("'get_thread' tool definition marks 'thread_id' as a required property", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4002, text: "hello", message_id: 2 });

    const tool = getCapturedTools().find((t) => t.name === "get_thread");
    expect(tool).toBeDefined();
    const schema = tool?.input_schema as { required?: string[] };
    expect(schema.required).toBeDefined();
    expect(schema.required).toContain("thread_id");
  });

  it("'get_inbox_summary' tool definition has no required parameters", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4003, text: "hello", message_id: 3 });

    const tool = getCapturedTools().find((t) => t.name === "get_inbox_summary");
    expect(tool).toBeDefined();
    const schema = tool?.input_schema as { required?: string[] };
    // Either no required array, or an empty one — inbox summary takes no required params
    const required = schema.required ?? [];
    expect(required.length).toBe(0);
  });

  it("'get_thread' 'thread_id' property is typed as a string", async () => {
    const { AnthropicMockClass, getCapturedTools } = buildAnthropicCapturingToolsMock("Sure!");

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn().mockResolvedValue("ok"),
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 4004, text: "hello", message_id: 4 });

    const tool = getCapturedTools().find((t) => t.name === "get_thread");
    expect(tool).toBeDefined();
    const schema = tool?.input_schema as {
      properties?: Record<string, { type?: string }>;
    };
    expect(schema.properties?.thread_id?.type).toBe("string");
  });
});

// ===========================================================================
// AC5 — Agent can successfully call Gmail tools in tool loop
// ===========================================================================

describe("AC5 — Agent successfully calls Gmail tools in the tool loop", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("agent completes get_inbox_summary tool loop and returns non-empty text reply", async () => {
    const executeGmailToolMock = vi
      .fn()
      .mockResolvedValue(
        "Inbox summary (2 unread emails):\n\n<untrusted>\nFrom: alice@example.com\nSubject: Q2 Report\n</untrusted>\nCategory: FYI",
      );
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "You have 2 unread emails: a Q2 report from Alice.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5001,
      text: "what emails do I have?",
      message_id: 1,
    });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_inbox_summary", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("agent completes get_thread tool loop and returns non-empty text reply", async () => {
    const executeGmailToolMock = vi
      .fn()
      .mockResolvedValue(
        "<untrusted>Thread ID: thread-444</untrusted>\nMessages: 2\n\n--- Message ---\n<untrusted>\nFrom: bob@example.com\nSubject: Project update\n</untrusted>",
      );
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_thread",
      { thread_id: "thread-444" },
      "The thread contains 2 messages from Bob about the project.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5002,
      text: "show me thread thread-444",
      message_id: 2,
    });

    expect(executeGmailToolMock).toHaveBeenCalledWith("get_thread", expect.any(Object));
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("showConfirmationKeyboard is false after Gmail tool calls (Gmail tools are not confirmation-gated)", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("inbox content");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "Your inbox is empty.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5003,
      text: "check my email",
      message_id: 3,
    });

    // Gmail reads are not calendar mutations — they must not trigger the confirmation keyboard
    expect(result.showConfirmationKeyboard).toBe(false);
  });

  it("tool result from executeGmailTool is fed back to the API in the next iteration", async () => {
    const gmailResult =
      "Inbox summary (1 unread email):\n\n<untrusted>\nFrom: test@example.com\nSubject: Feedback\n</untrusted>\nCategory: action required";
    const executeGmailToolMock = vi.fn().mockResolvedValue(gmailResult);

    const { AnthropicMockClass, createMock } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "You have an action-required email from test@example.com.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    await runAgent({
      chat_id: 5004,
      text: "what's in my inbox?",
      message_id: 4,
    });

    // The API should be called twice: once to trigger the tool, once with the result
    expect(createMock).toHaveBeenCalledTimes(2);

    // The second call should include the tool result in messages
    const secondCallMessages = createMock.mock.calls[1]?.[0]?.messages as
      | Array<{ role: string; content: unknown }>
      | undefined;
    expect(secondCallMessages).toBeDefined();

    // Look for a user message containing the tool result
    const toolResultMessage = secondCallMessages?.find(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        (m.content as Array<{ type: string; content?: string }>).some(
          (c) => c.type === "tool_result",
        ),
    );
    expect(toolResultMessage).toBeDefined();
  });

  it("agent returns AgentResult shape (text string + showConfirmationKeyboard boolean) after Gmail tool call", async () => {
    const executeGmailToolMock = vi.fn().mockResolvedValue("email summary");
    const { AnthropicMockClass } = buildAnthropicToolCallMock(
      "get_inbox_summary",
      {},
      "Checked your email.",
    );

    vi.doMock("@anthropic-ai/sdk", () => ({ default: AnthropicMockClass }));
    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      env: MOCK_ENV,
      logger: MOCK_LOGGER,
    }));
    vi.doMock("../tools/calendar.js", () => STUB_CALENDAR_MOCKS);
    vi.doMock("../tools/todoist.js", () => STUB_TODOIST_MOCKS);
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: executeGmailToolMock,
    }));

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 5005,
      text: "summarise my inbox",
      message_id: 5,
    });

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("showConfirmationKeyboard");
    expect(typeof result.text).toBe("string");
    expect(typeof result.showConfirmationKeyboard).toBe("boolean");
  });
});
