/**
 * Tests for packages/orchestrator/src/agent.ts — Task-7a
 *
 * Acceptance criteria:
 *   AC1: Life events tool definitions added: create_life_event, get_upcoming_life_events
 *   AC2: Tool definitions include proper parameter descriptions
 *   AC3: Tool name sets updated to include new tools
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
 *     ../tools/life_events.js — mocked to intercept executeLifeEventsTool calls
 *
 * - AC1: We capture the `tools` array passed to the Anthropic API
 *   on the first call and assert that create_life_event and get_upcoming_life_events
 *   are present in TOOL_DEFINITIONS.
 *
 * - AC2: We verify that both tool definitions have proper input_schema with
 *   parameter descriptions for all required and optional fields.
 *
 * - AC3: We verify that executeLifeEventsTool is called when the agent invokes
 *   these tools, confirming they are routed correctly (not to unknown-tool handler).
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * life events tool definitions — that is correct and expected.
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
      })
      .slice(0, limit)
      .sort((a, b) => {
        const diff = a.created_at.getTime() - b.created_at.getTime();
        return diff !== 0 ? diff : a.id - b.id;
      });
    return { rows: forChat, rowCount: forChat.length };
  }

  if (normalised.startsWith("SELECT") && normalised.includes("FROM PEOPLE")) {
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("agent.ts — Task-7a: Life events tool definitions", () => {
  let agent: typeof import("../agent.js");
  let capturedTools: unknown[] = [];
  let executeLifeEventsToolMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resetStore();
    capturedTools = [];
    executeLifeEventsToolMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        message: "Life event operation completed",
      }),
    );

    vi.resetModules();

    // Mock @lifeos/shared
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

    // Mock Anthropic SDK
    vi.doMock("@anthropic-ai/sdk", () => {
      return {
        default: vi.fn(() => ({
          messages: {
            create: vi.fn(async (params: Record<string, unknown>) => {
              capturedTools = (params.tools as unknown[]) ?? [];
              return {
                stop_reason: "end_turn",
                content: [
                  {
                    type: "text",
                    text: "I have noted the life event information.",
                  },
                ],
              };
            }),
          },
        })),
      };
    });

    // Mock calendar tools
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    // Mock Todoist tools
    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn(),
    }));

    // Mock Gmail tools
    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn(),
    }));

    // Mock people tools
    vi.doMock("../tools/people.js", () => ({
      executePeopleTool: vi.fn(),
    }));

    // Mock life events tools
    vi.doMock("../tools/life_events.js", () => ({
      executeLifeEventsTool: executeLifeEventsToolMock,
    }));

    agent = await import("../agent.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // AC1: Life events tool definitions added
  // ---------------------------------------------------------------------------

  describe("AC1: Life events tool definitions added to TOOL_DEFINITIONS", () => {
    it("should include create_life_event tool definition", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Create a life event",
      });

      const createLifeEventTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "create_life_event",
      );

      expect(createLifeEventTool).toBeDefined();
    });

    it("should include get_upcoming_life_events tool definition", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Get upcoming life events",
      });

      const getUpcomingTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "get_upcoming_life_events",
      );

      expect(getUpcomingTool).toBeDefined();
    });

    it("should have both life events tools in TOOL_DEFINITIONS", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Test life events",
      });

      const toolNames = capturedTools
        .filter((tool: unknown) => typeof tool === "object" && tool !== null && "name" in tool)
        .map((tool: unknown) => (tool as Record<string, unknown>).name);

      expect(toolNames).toContain("create_life_event");
      expect(toolNames).toContain("get_upcoming_life_events");
    });
  });

  // ---------------------------------------------------------------------------
  // AC2: Tool definitions include proper parameter descriptions
  // ---------------------------------------------------------------------------

  describe("AC2: Tool definitions include proper parameter descriptions", () => {
    it("create_life_event should have input_schema with parameter descriptions", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Create a life event",
      });

      const createLifeEventTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "create_life_event",
      ) as Record<string, unknown> | undefined;

      expect(createLifeEventTool).toBeDefined();
      expect(createLifeEventTool?.input_schema).toBeDefined();

      const schema = createLifeEventTool?.input_schema as Record<string, unknown>;
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();

      const properties = schema.properties as Record<string, unknown>;
      expect(properties.person_name).toBeDefined();
      expect(properties.event_type).toBeDefined();
      expect(properties.event_date).toBeDefined();

      // Verify descriptions exist
      const personNameProp = properties.person_name as Record<string, unknown>;
      expect(personNameProp.description).toBeDefined();
      expect(typeof personNameProp.description).toBe("string");

      const eventTypeProp = properties.event_type as Record<string, unknown>;
      expect(eventTypeProp.description).toBeDefined();
      expect(typeof eventTypeProp.description).toBe("string");

      const eventDateProp = properties.event_date as Record<string, unknown>;
      expect(eventDateProp.description).toBeDefined();
      expect(typeof eventDateProp.description).toBe("string");
    });

    it("get_upcoming_life_events should have input_schema with parameter descriptions", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Get upcoming life events",
      });

      const getUpcomingTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "get_upcoming_life_events",
      ) as Record<string, unknown> | undefined;

      expect(getUpcomingTool).toBeDefined();
      expect(getUpcomingTool?.input_schema).toBeDefined();

      const schema = getUpcomingTool?.input_schema as Record<string, unknown>;
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();

      const properties = schema.properties as Record<string, unknown>;
      expect(properties.start_date).toBeDefined();
      expect(properties.end_date).toBeDefined();

      // Verify descriptions exist
      const startDateProp = properties.start_date as Record<string, unknown>;
      expect(startDateProp.description).toBeDefined();
      expect(typeof startDateProp.description).toBe("string");

      const endDateProp = properties.end_date as Record<string, unknown>;
      expect(endDateProp.description).toBeDefined();
      expect(typeof endDateProp.description).toBe("string");
    });

    it("create_life_event should have description field", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Create a life event",
      });

      const createLifeEventTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "create_life_event",
      ) as Record<string, unknown> | undefined;

      expect(createLifeEventTool?.description).toBeDefined();
      expect(typeof createLifeEventTool?.description).toBe("string");
      expect((createLifeEventTool?.description as string).length).toBeGreaterThan(0);
    });

    it("get_upcoming_life_events should have description field", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Get upcoming life events",
      });

      const getUpcomingTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "get_upcoming_life_events",
      ) as Record<string, unknown> | undefined;

      expect(getUpcomingTool?.description).toBeDefined();
      expect(typeof getUpcomingTool?.description).toBe("string");
      expect((getUpcomingTool?.description as string).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // AC3: Tool name sets updated to include new tools
  // ---------------------------------------------------------------------------

  describe("AC3: Tool name sets updated to include new tools", () => {
    it("should route create_life_event to executeLifeEventsTool", async () => {
      vi.resetModules();

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

      vi.doMock("@anthropic-ai/sdk", () => {
        return {
          default: vi.fn(() => ({
            messages: {
              create: vi.fn(async (_params: Record<string, unknown>) => {
                return {
                  stop_reason: "tool_use",
                  content: [
                    {
                      type: "tool_use",
                      id: "tool-1",
                      name: "create_life_event",
                      input: {
                        person_name: "Alice",
                        event_type: "birthday",
                        event_date: "1990-05-15",
                      },
                    },
                  ],
                };
              }),
            },
          })),
        };
      });

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
        executePeopleTool: vi.fn(),
      }));

      const lifeEventsExecuteMock = vi.fn().mockResolvedValue(
        JSON.stringify({
          success: true,
          message: "Life event created",
        }),
      );

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: lifeEventsExecuteMock,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Create a life event for Alice",
      });

      expect(lifeEventsExecuteMock).toHaveBeenCalled();
    });

    it("should route get_upcoming_life_events to executeLifeEventsTool", async () => {
      vi.resetModules();

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

      vi.doMock("@anthropic-ai/sdk", () => {
        return {
          default: vi.fn(() => ({
            messages: {
              create: vi.fn(async (_params: Record<string, unknown>) => {
                return {
                  stop_reason: "tool_use",
                  content: [
                    {
                      type: "tool_use",
                      id: "tool-2",
                      name: "get_upcoming_life_events",
                      input: {
                        start_date: "2026-05-01",
                        end_date: "2026-05-31",
                      },
                    },
                  ],
                };
              }),
            },
          })),
        };
      });

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
        executePeopleTool: vi.fn(),
      }));

      const lifeEventsExecuteMock = vi.fn().mockResolvedValue(
        JSON.stringify({
          success: true,
          events: [],
          message: "No upcoming life events",
        }),
      );

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: lifeEventsExecuteMock,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Get upcoming life events",
      });

      expect(lifeEventsExecuteMock).toHaveBeenCalled();
    });
  });
});
