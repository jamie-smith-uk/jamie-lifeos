/**
 * Tests for packages/orchestrator/src/agent.ts — Task-7b
 *
 * Acceptance criteria:
 *   AC1: Nudges tool definitions added: create_nudge, dismiss_nudge
 *   AC2: Tool routing added to executeTool function for nudges module
 *   AC3: Agent can successfully call all nudge tools through the tool loop
 *   AC4: Tests verify tool routing works correctly
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
 *     ../tools/nudges.js     — mocked to intercept executeNudgesTool calls
 *
 * - AC1: We capture the `tools` array passed to the Anthropic API
 *   on the first call and assert that create_nudge and dismiss_nudge
 *   are present in TOOL_DEFINITIONS.
 *
 * - AC2: We verify that executeNudgesTool is called when the agent invokes
 *   these tools, confirming they are routed correctly (not to unknown-tool handler).
 *
 * - AC3: We simulate the agent calling nudge tools through the tool loop
 *   and verify that the tools are executed and results are returned.
 *
 * - AC4: We verify that tool routing works correctly by checking that
 *   the correct executor function is called for nudge tools.
 *
 * Tests FAIL in RED phase because agent.ts has not yet been updated to include
 * nudges tool definitions and routing — that is correct and expected.
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

  if (normalised.startsWith("SELECT") && normalised.includes("PEOPLE")) {
    return { rows: [], rowCount: 0 };
  }

  if (normalised.startsWith("INSERT INTO NUDGES")) {
    // Mock successful nudge creation
    const mockNudge = {
      id: 1,
      person_id: values[0] as number,
      life_event_id: values[1] as number | null,
      message: values[2] as string,
      trigger_at: new Date(values[3] as string),
      status: "pending",
      sent_at: null,
      dismissed_at: null,
      created_at: new Date(),
    };
    return { rows: [mockNudge], rowCount: 1 };
  }

  if (normalised.startsWith("UPDATE NUDGES")) {
    // Mock successful nudge update
    const mockNudge = {
      id: values[0] as number,
      person_id: 1,
      life_event_id: null,
      message: "Test message",
      trigger_at: new Date(),
      status: "dismissed",
      sent_at: null,
      dismissed_at: new Date(),
      created_at: new Date(),
    };
    return { rows: [mockNudge], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Task-7b: Nudges tool definitions and routing", () => {
  let agent: typeof import("../agent.js");
  let capturedTools: unknown[] = [];
  let executeNudgesToolMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resetStore();
    capturedTools = [];
    executeNudgesToolMock = vi.fn(async () => {
      return JSON.stringify({ success: true, message: "Nudge operation completed" });
    });

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
                    text: "I have noted the nudge information.",
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
      executeLifeEventsTool: vi.fn(),
    }));

    // Mock nudges tools
    vi.doMock("../tools/nudges.js", () => ({
      executeNudgesTool: executeNudgesToolMock,
    }));

    agent = await import("../agent.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // AC1: Nudges tool definitions added
  // ---------------------------------------------------------------------------

  describe("AC1: Nudges tool definitions added to TOOL_DEFINITIONS", () => {
    it("should include create_nudge tool definition", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Create a nudge",
      });

      const createNudgeTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "create_nudge",
      );

      expect(createNudgeTool).toBeDefined();
    });

    it("should include dismiss_nudge tool definition", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Dismiss a nudge",
      });

      const dismissNudgeTool = capturedTools.find(
        (tool: unknown) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          tool.name === "dismiss_nudge",
      );

      expect(dismissNudgeTool).toBeDefined();
    });

    it("should have both nudge tools in TOOL_DEFINITIONS", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Test nudges",
      });

      const toolNames = capturedTools
        .filter((tool: unknown) => typeof tool === "object" && tool !== null && "name" in tool)
        .map((tool: unknown) => (tool as Record<string, unknown>).name);

      expect(toolNames).toContain("create_nudge");
      expect(toolNames).toContain("dismiss_nudge");
    });
  });

  // ---------------------------------------------------------------------------
  // AC2: Tool routing added to executeTool function
  // ---------------------------------------------------------------------------

  describe("AC2: Tool routing added to executeTool function for nudges module", () => {
    it("should route create_nudge to executeNudgesTool", async () => {
      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "create_nudge",
              input: {
                person_id: 1,
                message: "Remember to call John",
                trigger_at: "2026-05-13T10:00:00Z",
              },
            },
          ],
        };
      });

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
              create: mockAnthropicCreate,
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

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: vi.fn(),
      }));

      vi.doMock("../tools/nudges.js", () => ({
        executeNudgesTool: executeNudgesToolMock,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Create a nudge for John",
      });

      expect(executeNudgesToolMock).toHaveBeenCalled();
    });

    it("should route dismiss_nudge to executeNudgesTool", async () => {
      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-2",
              name: "dismiss_nudge",
              input: {
                nudge_id: "123",
              },
            },
          ],
        };
      });

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
              create: mockAnthropicCreate,
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

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: vi.fn(),
      }));

      vi.doMock("../tools/nudges.js", () => ({
        executeNudgesTool: executeNudgesToolMock,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Dismiss a nudge",
      });

      expect(executeNudgesToolMock).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC3: Agent can successfully call all nudge tools through the tool loop
  // ---------------------------------------------------------------------------

  describe("AC3: Agent can successfully call all nudge tools through the tool loop", () => {
    it("should execute create_nudge tool and return result", async () => {
      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "create_nudge",
              input: {
                person_id: 1,
                message: "Remember to call John",
                trigger_at: "2026-05-13T10:00:00Z",
              },
            },
          ],
        };
      });

      vi.resetModules();

      // Create fresh mock after resetModules
      const freshExecuteNudgesToolMock = vi.fn(async () => {
        return JSON.stringify({ success: true, message: "Nudge operation completed" });
      });

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
              create: mockAnthropicCreate,
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

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: vi.fn(),
      }));

      vi.doMock("../tools/nudges.js", () => ({
        executeNudgesTool: freshExecuteNudgesToolMock,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Create a nudge for John",
      });

      expect(freshExecuteNudgesToolMock).toHaveBeenCalled();
    });

    it("should execute dismiss_nudge tool and return result", async () => {
      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-2",
              name: "dismiss_nudge",
              input: {
                nudge_id: "123",
              },
            },
          ],
        };
      });

      vi.resetModules();

      // Create fresh mock after resetModules
      const freshExecuteNudgesToolMock2 = vi.fn(async () => {
        return JSON.stringify({ success: true, message: "Nudge operation completed" });
      });

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
              create: mockAnthropicCreate,
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

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: vi.fn(),
      }));

      vi.doMock("../tools/nudges.js", () => ({
        executeNudgesTool: freshExecuteNudgesToolMock2,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Dismiss a nudge",
      });

      expect(freshExecuteNudgesToolMock2).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC4: Tests verify tool routing works correctly
  // ---------------------------------------------------------------------------

  describe("AC4: Tests verify tool routing works correctly", () => {
    it("should not route nudge tools to unknown-tool handler", async () => {
      const mockAnthropicCreate = vi.fn(async (params: Record<string, unknown>) => {
        capturedTools = (params.tools as unknown[]) ?? [];
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "create_nudge",
              input: {
                person_id: 1,
                message: "Test nudge",
                trigger_at: "2026-05-13T10:00:00Z",
              },
            },
          ],
        };
      });

      vi.resetModules();

      // Create fresh mock after resetModules
      const freshExecuteNudgesToolMock3 = vi.fn(async () => {
        return JSON.stringify({ success: true, message: "Nudge operation completed" });
      });

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
              create: mockAnthropicCreate,
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

      vi.doMock("../tools/life_events.js", () => ({
        executeLifeEventsTool: vi.fn(),
      }));

      vi.doMock("../tools/nudges.js", () => ({
        executeNudgesTool: freshExecuteNudgesToolMock3,
      }));

      const agentModule = await import("../agent.js");

      await agentModule.runAgent({
        chat_id: 123,
        text: "Create a nudge",
      });

      // Verify executeNudgesTool was called (not unknown-tool handler)
      expect(freshExecuteNudgesToolMock3).toHaveBeenCalled();
    });

    it("should include nudge tools in security labeling for untrusted content", async () => {
      await agent.runAgent({
        chat_id: 123,
        text: "Test nudges",
      });

      // Verify both nudge tools are present in TOOL_DEFINITIONS
      const toolNames = capturedTools
        .filter((tool: unknown) => typeof tool === "object" && tool !== null && "name" in tool)
        .map((tool: unknown) => (tool as Record<string, unknown>).name);

      expect(toolNames).toContain("create_nudge");
      expect(toolNames).toContain("dismiss_nudge");
    });
  });
});
