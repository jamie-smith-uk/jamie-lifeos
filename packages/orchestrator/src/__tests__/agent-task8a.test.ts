/**
 * Tests for packages/orchestrator/src/agent.ts — Task-8a
 *
 * Acceptance criteria:
 *   AC1: Voice tools are imported and registered in agent tool definitions
 *   AC2: transcribe_voice_message tool is available to agent
 *   AC3: create_pending_voice_intent tool is available to agent
 *   AC4: consume_pending_voice_intent tool is available to agent
 *
 * Strategy
 * --------
 * - agent.ts is imported after mocking all external dependencies:
 *     @lifeos/shared         — pool (in-memory), env, logger
 *     @anthropic-ai/sdk      — controlled responses to drive tool loop
 *     ../tools/calendar.js   — stubbed so no real MCP calls are made
 *     ../tools/todoist.js    — stubbed so no Todoist calls are made
 *     ../tools/gmail.js      — stubbed so no Gmail calls are made
 *     ../tools/people.js     — stubbed so no people calls are made
 *     ../tools/life_events.js — stubbed so no life events calls are made
 *     ../tools/nudges.js     — stubbed so no nudge calls are made
 *     ../tools/strava.js     — stubbed so no Strava calls are made
 *     ../tools/voice.js      — mocked to intercept voice tool calls
 *
 * - AC1: We verify that voice tool definitions are included in TOOL_DEFINITIONS
 *   by capturing the tools array passed to the Anthropic API.
 *
 * - AC2: We verify that transcribe_voice_message tool definition exists with
 *   correct input_schema (file_id parameter required).
 *
 * - AC3: We verify that create_pending_voice_intent tool definition exists with
 *   correct input_schema (chat_id, transcription, telegram_file_id required).
 *
 * - AC4: We verify that consume_pending_voice_intent tool definition exists with
 *   correct input_schema (id parameter required).
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * voice tool definitions — that is correct and expected.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store shared by pool mock
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

  if (normalised.startsWith("SELECT NAME, RELATIONSHIP_TYPE")) {
    return { rows: [], rowCount: 0 };
  }

  if (normalised.startsWith("SELECT ATHLETE_ID FROM STRAVA_CREDENTIALS")) {
    return { rows: [], rowCount: 0 };
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

  if (normalised.startsWith("DELETE FROM CONVERSATION_CONTEXT")) {
    return { rows: [], rowCount: 0 };
  }

  if (normalised.startsWith("SELECT ID, CHAT_ID, ROLE, CONTENT, CREATED_AT")) {
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Mock setup helper
// ---------------------------------------------------------------------------

function applyAllMocks(
  transcribeVoiceMock: ReturnType<typeof vi.fn>,
  createPendingVoiceMock: ReturnType<typeof vi.fn>,
  consumePendingVoiceMock: ReturnType<typeof vi.fn>,
  anthropicCreate: ReturnType<typeof vi.fn>,
): void {
  vi.doMock("@lifeos/shared", () => ({
    pool: {
      query: vi.fn((text: string, values: unknown[]) => {
        const result = handleQuery(text, values);
        return Promise.resolve(result);
      }),
      connect: vi.fn(async () => ({
        query: vi.fn(async (text: string, values?: unknown[]) => {
          const result = handleQuery(text, values || []);
          return result;
        }),
        release: vi.fn(),
      })),
    },
    env: {
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
      DATABASE_URL: "postgresql://test",
      TELEGRAM_BOT_TOKEN: "test-token",
      OPENAI_API_KEY: "test-openai-key",
      TZ: "UTC",
    },
    logger: {
      child: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      })),
    },
  }));

  vi.doMock("@anthropic-ai/sdk", () => ({
    default: vi.fn(() => ({
      messages: {
        create: anthropicCreate,
      },
    })),
  }));

  vi.doMock("../tools/calendar.js", () => ({
    calendarReadToolDefinitions: [
      {
        name: "get_todays_events",
        description: "Mock calendar read tool",
        input_schema: { type: "object", properties: {}, required: [] },
      },
    ],
    calendarWriteToolDefinitions: [
      {
        name: "create_event",
        description: "Mock calendar write tool",
        input_schema: { type: "object", properties: {}, required: [] },
      },
    ],
    calendarFreeBusyToolDefinitions: [
      {
        name: "check_free_busy",
        description: "Mock calendar free/busy tool",
        input_schema: { type: "object", properties: {}, required: [] },
      },
    ],
    executeCalendarTool: vi.fn(),
  }));

  vi.doMock("../tools/todoist.js", () => ({
    executeToDoistTool: vi.fn(),
  }));

  vi.doMock("../tools/gmail.js", () => ({
    executeGmailTool: vi.fn(),
  }));

  vi.doMock("../tools/people.js", () => ({
    executePeopleTool: vi.fn(),
  }));

  vi.doMock("../tools/life_events.js", () => ({
    executeLifeEventsTool: vi.fn(),
  }));

  vi.doMock("../tools/nudges.js", () => ({
    executeNudgesTool: vi.fn(),
  }));

  vi.doMock("../tools/strava.js", () => ({
    get_strava_oauth_url: vi.fn(),
    get_strava_activities: vi.fn(),
    get_strava_trends: vi.fn(),
  }));

  vi.doMock("../tools/voice.js", () => ({
    transcribe_voice_message: transcribeVoiceMock,
    create_pending_voice_intent: createPendingVoiceMock,
    consume_pending_voice_intent: consumePendingVoiceMock,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("agent.ts — Task-8a: Voice tools registration", () => {
  let agent: typeof import("../agent.js");
  let capturedTools: unknown[] = [];

  beforeEach(async () => {
    resetStore();
    capturedTools = [];

    const transcribeVoiceMock = vi.fn(async () => "transcribed text");
    const createPendingVoiceMock = vi.fn(async () => ({
      id: 1,
      chat_id: 123,
      transcription: "test",
      telegram_file_id: "file123",
      expires_at: new Date(),
      created_at: new Date(),
    }));
    const consumePendingVoiceMock = vi.fn(async () => ({
      id: 1,
      chat_id: 123,
      transcription: "test",
      telegram_file_id: "file123",
      expires_at: new Date(),
      created_at: new Date(),
    }));

    const anthropicCreate = vi.fn(async (params: unknown) => {
      const p = params as { tools?: unknown[] };
      if (p.tools) {
        capturedTools = p.tools;
      }
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Test response" }],
      };
    });

    vi.resetModules();
    applyAllMocks(
      transcribeVoiceMock,
      createPendingVoiceMock,
      consumePendingVoiceMock,
      anthropicCreate,
    );
    agent = await import("../agent.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC1: Voice tools are imported and registered in agent tool definitions", async () => {
    // Run agent to capture tools passed to Anthropic API
    await agent.runAgent({
      chat_id: 123,
      text: "Hello",
    });

    // Verify that voice tools are in the captured tools array
    expect(capturedTools.length).toBeGreaterThan(0);

    const toolNames = (capturedTools as Array<{ name?: string }>).map((t) => t.name);
    expect(toolNames).toContain("transcribe_voice_message");
    expect(toolNames).toContain("create_pending_voice_intent");
    expect(toolNames).toContain("consume_pending_voice_intent");
  });

  it("AC2: transcribe_voice_message tool is available to agent", async () => {
    // Run agent to capture tools
    await agent.runAgent({
      chat_id: 123,
      text: "Hello",
    });

    // Find the transcribe_voice_message tool
    const transcribeTool = (capturedTools as Array<{ name?: string; input_schema?: unknown }>).find(
      (t) => t.name === "transcribe_voice_message",
    );

    expect(transcribeTool).toBeDefined();
    expect(transcribeTool?.name).toBe("transcribe_voice_message");

    // Verify input schema has file_id as required parameter
    const schema = transcribeTool?.input_schema as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema?.type).toBe("object");
    expect(schema?.properties).toHaveProperty("file_id");
    expect(schema?.required).toContain("file_id");
  });

  it("AC3: create_pending_voice_intent tool is available to agent", async () => {
    // Run agent to capture tools
    await agent.runAgent({
      chat_id: 123,
      text: "Hello",
    });

    // Find the create_pending_voice_intent tool
    const createTool = (capturedTools as Array<{ name?: string; input_schema?: unknown }>).find(
      (t) => t.name === "create_pending_voice_intent",
    );

    expect(createTool).toBeDefined();
    expect(createTool?.name).toBe("create_pending_voice_intent");

    // Verify input schema has required parameters
    const schema = createTool?.input_schema as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema?.type).toBe("object");
    expect(schema?.properties).toHaveProperty("chat_id");
    expect(schema?.properties).toHaveProperty("transcription");
    expect(schema?.properties).toHaveProperty("telegram_file_id");
    expect(schema?.required).toContain("chat_id");
    expect(schema?.required).toContain("transcription");
    expect(schema?.required).toContain("telegram_file_id");
  });

  it("AC4: consume_pending_voice_intent tool is available to agent", async () => {
    // Run agent to capture tools
    await agent.runAgent({
      chat_id: 123,
      text: "Hello",
    });

    // Find the consume_pending_voice_intent tool
    const consumeTool = (capturedTools as Array<{ name?: string; input_schema?: unknown }>).find(
      (t) => t.name === "consume_pending_voice_intent",
    );

    expect(consumeTool).toBeDefined();
    expect(consumeTool?.name).toBe("consume_pending_voice_intent");

    // Verify input schema has id as required parameter
    const schema = consumeTool?.input_schema as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema?.type).toBe("object");
    expect(schema?.properties).toHaveProperty("id");
    expect(schema?.required).toContain("id");
  });

  it("Voice tools are routed correctly in tool execution", async () => {
    const transcribeVoiceMock = vi.fn(async () => "transcribed text");
    const createPendingVoiceMock = vi.fn(async () => ({
      id: 1,
      chat_id: 123,
      transcription: "test",
      telegram_file_id: "file123",
      expires_at: new Date(),
      created_at: new Date(),
    }));
    const consumePendingVoiceMock = vi.fn(async () => ({
      id: 1,
      chat_id: 123,
      transcription: "test",
      telegram_file_id: "file123",
      expires_at: new Date(),
      created_at: new Date(),
    }));

    let callCount = 0;
    const anthropicCreate = vi.fn(async (params: unknown) => {
      const p = params as { tools?: unknown[] };
      if (p.tools) {
        capturedTools = p.tools;
      }

      callCount++;

      // First call: return tool_use for transcribe_voice_message
      if (callCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool1",
              name: "transcribe_voice_message",
              input: { file_id: "test_file_id" },
            },
          ],
        };
      }

      // Second call: return end_turn
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Transcription complete" }],
      };
    });

    vi.resetModules();
    applyAllMocks(
      transcribeVoiceMock,
      createPendingVoiceMock,
      consumePendingVoiceMock,
      anthropicCreate,
    );
    agent = await import("../agent.js");

    // Run agent with tool_use response
    await agent.runAgent({
      chat_id: 123,
      text: "Transcribe this voice message",
    });

    // Verify transcribe_voice_message was called
    expect(transcribeVoiceMock).toHaveBeenCalledWith({ file_id: "test_file_id" });
  });
});
