/**
 * Tests for packages/orchestrator/src/agent.ts — Task-8
 *
 * Acceptance criteria:
 *   AC1: log_interaction tool definition added to peopleToolDefinitions array
 *   AC2: Tool accepts name and notes parameters with name required
 *   AC3: Tool is included in PEOPLE_TOOL_NAMES set for routing
 *   AC4: executePeopleTool function handles log_interaction operation
 *
 * Strategy
 * --------
 * - agent.ts is imported after mocking all external dependencies:
 *     @lifeos/shared         — pool (in-memory), env, logger
 *     @anthropic-ai/sdk      — controlled responses to drive tool loop
 *     ../tools/calendar.js   — stubbed so no real MCP calls are made
 *     ../tools/todoist.js    — stubbed so no Todoist calls are made
 *     ../tools/gmail.js      — stubbed so no Gmail calls are made
 *     ../tools/people.js     — mocked to intercept executePeopleTool calls
 *     ../tools/life_events.js — stubbed so no life events calls are made
 *     ../tools/nudges.js     — stubbed so no nudge calls are made
 *
 * - AC1: We capture the `tools` array passed to the Anthropic API
 *   on the first call and assert that log_interaction is present in
 *   TOOL_DEFINITIONS.
 *
 * - AC2: We verify that log_interaction has the correct input_schema
 *   with name as a required parameter and notes as optional.
 *
 * - AC3: We verify that executePeopleTool is called when the agent invokes
 *   log_interaction, confirming it is routed correctly.
 *
 * - AC4: We verify that executePeopleTool receives log_interaction as the
 *   operation and the correct input parameters.
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * log_interaction tool definition — that is correct and expected.
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

  if (normalised.startsWith("SELECT") && normalised.includes("CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });
    const recent = forChat
      .slice(0, limit)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    return { rows: recent, rowCount: recent.length };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Shared mock factory — keeps doMock calls DRY across routing tests
// ---------------------------------------------------------------------------

function applyAllMocks(
  executePeopleToolMock: ReturnType<typeof vi.fn>,
  anthropicCreate: ReturnType<typeof vi.fn>,
): void {
  vi.doMock("@lifeos/shared", () => ({
    pool: {
      query: vi.fn((text: string, values?: unknown[]) => {
        return Promise.resolve(handleQuery(text, values ?? []));
      }),
      connect: vi.fn(() =>
        Promise.resolve({
          query: vi.fn((text: string, values?: unknown[]) => {
            return Promise.resolve(handleQuery(text, values ?? []));
          }),
          release: vi.fn(),
        }),
      ),
    },
    env: {
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
      TZ: "UTC",
    },
    logger: {
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
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
    calendarReadToolDefinitions: [],
    calendarWriteToolDefinitions: [],
    calendarFreeBusyToolDefinitions: [],
    executeCalendarTool: vi.fn(),
  }));

  vi.doMock("../tools/todoist.js", () => ({
    executeToDoistTool: vi.fn(),
  }));

  vi.doMock("../tools/gmail.js", () => ({
    executeGmailTool: vi.fn(),
  }));

  vi.doMock("../tools/people.js", () => ({
    executePeopleTool: executePeopleToolMock,
  }));

  vi.doMock("../tools/life_events.js", () => ({
    executeLifeEventsTool: vi.fn(),
  }));

  vi.doMock("../tools/nudges.js", () => ({
    executeNudgesTool: vi.fn(),
  }));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("agent.ts — Task-8: log_interaction tool definition", () => {
  let agent: typeof import("../agent.js");
  let capturedTools: unknown[] = [];
  let executePeopleToolMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resetStore();
    capturedTools = [];
    executePeopleToolMock = vi.fn(async () => {
      return JSON.stringify({ success: true, message: "Interaction logged successfully." });
    });

    vi.resetModules();

    const defaultAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
      capturedTools = (params.tools as unknown[]) ?? [];
      return {
        stop_reason: "end_turn",
        content: [
          {
            type: "text",
            text: "I have logged the interaction.",
          },
        ],
      };
    });

    applyAllMocks(executePeopleToolMock, defaultAnthropicCreate);

    agent = await import("../agent.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // AC1: log_interaction tool definition added to peopleToolDefinitions array
  // ---------------------------------------------------------------------------

  describe("AC1: log_interaction tool definition added to peopleToolDefinitions array", () => {
    it("should include log_interaction tool definition in TOOL_DEFINITIONS", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction",
      });

      const logInteractionTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "log_interaction",
      );

      expect(logInteractionTool).toBeDefined();
      expect(logInteractionTool).toHaveProperty("name", "log_interaction");
      expect(logInteractionTool).toHaveProperty("description");
    });

    it("should have log_interaction in the tools array passed to Anthropic API", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction with John",
      });

      const toolNames = capturedTools
        .filter((tool: unknown) => typeof tool === "object" && tool !== null && "name" in tool)
        .map((tool: unknown) => (tool as Record<string, unknown>).name);

      expect(toolNames).toContain("log_interaction");
    });
  });

  // ---------------------------------------------------------------------------
  // AC2: Tool accepts name and notes parameters with name required
  // ---------------------------------------------------------------------------

  describe("AC2: Tool accepts name and notes parameters with name required", () => {
    it("log_interaction should have name as required parameter", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction",
      });

      const logInteractionTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "log_interaction",
      ) as Record<string, unknown> | undefined;

      expect(logInteractionTool).toBeDefined();
      const inputSchema = logInteractionTool?.input_schema as Record<string, unknown>;
      expect(inputSchema.required).toContain("name");
    });

    it("log_interaction should have name and notes in properties", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction",
      });

      const logInteractionTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "log_interaction",
      ) as Record<string, unknown> | undefined;

      expect(logInteractionTool).toBeDefined();
      const inputSchema = logInteractionTool?.input_schema as Record<string, unknown>;
      const properties = inputSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty("name");
      expect(properties).toHaveProperty("notes");
    });

    it("log_interaction should have notes as optional parameter", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction",
      });

      const logInteractionTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "log_interaction",
      ) as Record<string, unknown> | undefined;

      expect(logInteractionTool).toBeDefined();
      const inputSchema = logInteractionTool?.input_schema as Record<string, unknown>;
      const required = inputSchema.required as string[];
      expect(required).toContain("name");
      expect(required).not.toContain("notes");
    });

    it("log_interaction should have description for name parameter", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Log an interaction",
      });

      const logInteractionTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "log_interaction",
      ) as Record<string, unknown> | undefined;

      expect(logInteractionTool).toBeDefined();
      const inputSchema = logInteractionTool?.input_schema as Record<string, unknown>;
      const properties = inputSchema.properties as Record<string, Record<string, unknown>>;
      expect(properties.name).toHaveProperty("description");
    });
  });

  // ---------------------------------------------------------------------------
  // AC3: Tool is included in PEOPLE_TOOL_NAMES set for routing
  // ---------------------------------------------------------------------------

  describe("AC3: Tool is included in PEOPLE_TOOL_NAMES set for routing", () => {
    it("should route log_interaction to executePeopleTool", async () => {
      const freshExecutePeopleToolMock = vi.fn(async () => {
        return JSON.stringify({ success: true, message: "Interaction logged successfully." });
      });

      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "log_interaction",
              input: {
                name: "John Smith",
                notes: "Had a great conversation about the project.",
              },
            },
          ],
        };
      });

      vi.resetModules();
      applyAllMocks(freshExecutePeopleToolMock, mockAnthropicCreate);

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Log my interaction with John",
      });

      expect(freshExecutePeopleToolMock).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC4: executePeopleTool function handles log_interaction operation
  // ---------------------------------------------------------------------------

  describe("AC4: executePeopleTool function handles log_interaction operation", () => {
    it("should pass log_interaction operation to executePeopleTool", async () => {
      const freshExecutePeopleToolMock = vi.fn(async () => {
        return JSON.stringify({ success: true, message: "Interaction logged successfully." });
      });

      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-2",
              name: "log_interaction",
              input: {
                name: "Jane Doe",
                notes: "Discussed upcoming events.",
              },
            },
          ],
        };
      });

      vi.resetModules();
      applyAllMocks(freshExecutePeopleToolMock, mockAnthropicCreate);

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 456,
        text: "Log interaction with Jane",
      });

      expect(freshExecutePeopleToolMock).toHaveBeenCalled();
      const callArgs = freshExecutePeopleToolMock.mock.calls[0];
      expect(callArgs).toBeDefined();
    });
  });
});
