/**
 * Tests for Strava tool registration in agent.ts — task-8a
 *
 * Acceptance criteria:
 *   AC1: get_strava_oauth_url tool is registered with proper schema
 *   AC2: get_strava_activities tool is registered with sport_type and date filters
 *   AC3: Tool schemas include required parameters and descriptions
 *
 * Strategy
 * --------
 * Mock the @lifeos/shared module and all tool execution modules, then call
 * runAgent and verify that the Anthropic API is called with TOOL_DEFINITIONS
 * that includes the Strava tools with correct schemas, required parameters,
 * and descriptions.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Strava tools registration in agent.ts", () => {
  let agent: typeof import("../agent.js");
  let anthropicCreateMock: ReturnType<typeof vi.fn>;

  function applyAllMocks(createMock: ReturnType<typeof vi.fn>): void {
    vi.doMock("@lifeos/shared", () => ({
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
      pool: {
        query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
        connect: vi.fn(async () => ({
          query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
          release: vi.fn(),
        })),
      },
      telegramBot: {
        sendMessage: vi.fn(),
      },
    }));

    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn(() => ({
        messages: {
          create: createMock,
        },
      })),
    }));

    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));

    vi.doMock("../tools/gmail.js", () => ({
      executeGmailTool: vi.fn(),
    }));

    vi.doMock("../tools/life_events.js", () => ({
      executeLifeEventsTool: vi.fn(),
    }));

    vi.doMock("../tools/nudges.js", () => ({
      executeNudgesTool: vi.fn(),
    }));

    vi.doMock("../tools/people.js", () => ({
      executePeopleTool: vi.fn(),
    }));

    vi.doMock("../tools/todoist.js", () => ({
      executeToDoistTool: vi.fn(),
    }));

    vi.doMock("../tools/strava.js", () => ({
      get_strava_oauth_url: vi.fn(),
      get_strava_activities: vi.fn(),
    }));
  }

  beforeEach(async () => {
    vi.resetModules();
    anthropicCreateMock = vi.fn(async () => ({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Test response" }],
    }));
    applyAllMocks(anthropicCreateMock);
    agent = await import("../agent.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AC1: get_strava_oauth_url tool registration", () => {
    it("should register get_strava_oauth_url tool with proper schema", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      expect(anthropicCreateMock).toHaveBeenCalled();
      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      expect(callArgs.tools).toBeDefined();

      const stravaOAuthTool = callArgs.tools?.find((t) => t.name === "get_strava_oauth_url");
      expect(stravaOAuthTool).toBeDefined();
      expect(stravaOAuthTool?.name).toBe("get_strava_oauth_url");
      expect(stravaOAuthTool?.description).toBeDefined();
      expect(typeof stravaOAuthTool?.description).toBe("string");
      expect(stravaOAuthTool?.description?.length).toBeGreaterThan(0);
    });

    it("should have get_strava_oauth_url with input_schema", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaOAuthTool = callArgs.tools?.find((t) => t.name === "get_strava_oauth_url");

      expect(stravaOAuthTool?.input_schema).toBeDefined();
      expect(stravaOAuthTool?.input_schema?.type).toBe("object");
    });
  });

  describe("AC2: get_strava_activities tool registration", () => {
    it("should register get_strava_activities tool with sport_type filter", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      expect(stravaActivitiesTool).toBeDefined();
      expect(stravaActivitiesTool?.name).toBe("get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        properties?: Record<string, unknown>;
      };
      expect(schema?.properties?.sport_type).toBeDefined();
    });

    it("should register get_strava_activities tool with date filters", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        properties?: Record<string, unknown>;
      };
      expect(schema?.properties?.start_date).toBeDefined();
      expect(schema?.properties?.end_date).toBeDefined();
    });

    it("should have get_strava_activities with description", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      expect(stravaActivitiesTool?.description).toBeDefined();
      expect(typeof stravaActivitiesTool?.description).toBe("string");
      expect(stravaActivitiesTool?.description?.length).toBeGreaterThan(0);
    });
  });

  describe("AC3: Tool schemas include required parameters and descriptions", () => {
    it("should have get_strava_oauth_url with required parameters", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaOAuthTool = callArgs.tools?.find((t) => t.name === "get_strava_oauth_url");

      const schema = stravaOAuthTool?.input_schema as {
        required?: string[];
      };
      // get_strava_oauth_url takes no required parameters (it's a parameterless tool)
      expect(schema?.required).toBeDefined();
    });

    it("should have get_strava_activities with required parameters", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        required?: string[];
        properties?: Record<string, { description?: string }>;
      };
      expect(schema?.required).toBeDefined();
      expect(Array.isArray(schema?.required)).toBe(true);
    });

    it("should have sport_type property with description", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        properties?: Record<string, { description?: string }>;
      };
      const sportTypeProperty = schema?.properties?.sport_type as { description?: string };
      expect(sportTypeProperty?.description).toBeDefined();
      expect(typeof sportTypeProperty?.description).toBe("string");
    });

    it("should have start_date property with description", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        properties?: Record<string, { description?: string }>;
      };
      const startDateProperty = schema?.properties?.start_date as { description?: string };
      expect(startDateProperty?.description).toBeDefined();
      expect(typeof startDateProperty?.description).toBe("string");
    });

    it("should have end_date property with description", async () => {
      await agent.runAgent({ chat_id: 1, text: "test message" });

      const callArgs = anthropicCreateMock.mock.calls[0]?.[0] as {
        tools?: Anthropic.Tool[];
      };
      const stravaActivitiesTool = callArgs.tools?.find((t) => t.name === "get_strava_activities");

      const schema = stravaActivitiesTool?.input_schema as {
        properties?: Record<string, { description?: string }>;
      };
      const endDateProperty = schema?.properties?.end_date as { description?: string };
      expect(endDateProperty?.description).toBeDefined();
      expect(typeof endDateProperty?.description).toBe("string");
    });
  });
});
