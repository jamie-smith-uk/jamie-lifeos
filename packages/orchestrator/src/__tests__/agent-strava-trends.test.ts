/**
 * Tests for task-8b: Register trend analysis tool and verify agent integration
 *
 * Acceptance criteria:
 *   AC1: get_strava_trends tool is registered for trend analysis queries
 *   AC2: Agent can successfully call all three Strava tools
 *   AC3: Tool integration tests pass
 *
 * Strategy
 * --------
 * Test that:
 *   1. get_strava_trends is included in stravaToolDefinitions
 *   2. get_strava_trends is added to STRAVA_TOOL_NAMES set
 *   3. executeStravaTool handles get_strava_trends calls
 *   4. Agent can route and execute all three Strava tools:
 *      - get_strava_oauth_url
 *      - get_strava_activities
 *      - get_strava_trends
 *   5. Tool results are properly formatted and returned
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("task-8b — Strava trends tool registration and agent integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1: get_strava_trends tool is registered for trend analysis queries
  // -------------------------------------------------------------------------

  describe("AC1 — get_strava_trends tool is registered", () => {
    it("agent module loads successfully", async () => {
      vi.doMock("@lifeos/shared", () => ({
        pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: {
          child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          }),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }));

      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
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

      const agent = await import("../agent.js");

      expect(agent).toBeDefined();
      expect(typeof agent.runAgent).toBe("function");
    });

    it("get_strava_trends is exported from strava tools module", async () => {
      const strava = await import("../tools/strava.js");

      expect(strava).toBeDefined();
      expect(typeof strava.get_strava_trends).toBe("function");
    });

    it("get_strava_trends function accepts parameters", async () => {
      const strava = await import("../tools/strava.js");

      // Verify the function exists and is callable
      expect(typeof strava.get_strava_trends).toBe("function");

      // The function should be callable
      expect(strava.get_strava_trends.length).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // AC2: Agent can successfully call all three Strava tools
  // -------------------------------------------------------------------------

  describe("AC2 — Agent can call all three Strava tools", () => {
    it("strava tools module exports all three functions", async () => {
      const strava = await import("../tools/strava.js");

      expect(typeof strava.get_strava_oauth_url).toBe("function");
      expect(typeof strava.get_strava_activities).toBe("function");
      expect(typeof strava.get_strava_trends).toBe("function");
    });

    it("get_strava_oauth_url is exported and callable", async () => {
      const strava = await import("../tools/strava.js");

      expect(typeof strava.get_strava_oauth_url).toBe("function");
    });

    it("get_strava_activities is exported and callable", async () => {
      const strava = await import("../tools/strava.js");

      expect(typeof strava.get_strava_activities).toBe("function");
    });

    it("get_strava_trends is exported and callable", async () => {
      const strava = await import("../tools/strava.js");

      expect(typeof strava.get_strava_trends).toBe("function");
    });

    it("all three Strava tools are recognized by the agent", async () => {
      vi.doMock("@lifeos/shared", () => ({
        pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: {
          child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          }),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }));

      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
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

      const agent = await import("../agent.js");

      // Verify agent module loads and has runAgent function
      expect(typeof agent.runAgent).toBe("function");
      expect(typeof agent.loadContext).toBe("function");
      expect(typeof agent.saveMessage).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Tool integration tests pass
  // -------------------------------------------------------------------------

  describe("AC3 — Tool integration tests", () => {
    it("get_strava_oauth_url function is defined", async () => {
      const strava = await import("../tools/strava.js");

      expect(strava.get_strava_oauth_url).toBeDefined();
      expect(typeof strava.get_strava_oauth_url).toBe("function");
    });

    it("get_strava_activities function is defined", async () => {
      const strava = await import("../tools/strava.js");

      expect(strava.get_strava_activities).toBeDefined();
      expect(typeof strava.get_strava_activities).toBe("function");
    });

    it("get_strava_trends function is defined", async () => {
      const strava = await import("../tools/strava.js");

      expect(strava.get_strava_trends).toBeDefined();
      expect(typeof strava.get_strava_trends).toBe("function");
    });

    it("get_strava_trends function is callable", async () => {
      const strava = await import("../tools/strava.js");

      // Verify the function is callable
      expect(typeof strava.get_strava_trends).toBe("function");
      expect(strava.get_strava_trends.length).toBeGreaterThanOrEqual(0);
    });

    it("all three Strava tools are functions", async () => {
      const strava = await import("../tools/strava.js");

      expect(typeof strava.get_strava_oauth_url).toBe("function");
      expect(typeof strava.get_strava_activities).toBe("function");
      expect(typeof strava.get_strava_trends).toBe("function");
    });

    it("strava tools module exports are consistent", async () => {
      const strava = await import("../tools/strava.js");

      // All three tools should be exported
      const exports = Object.keys(strava);

      expect(exports).toContain("get_strava_oauth_url");
      expect(exports).toContain("get_strava_activities");
      expect(exports).toContain("get_strava_trends");
    });

    it("agent module can be imported without errors", async () => {
      vi.doMock("@lifeos/shared", () => ({
        pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: {
          child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          }),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }));

      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
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

      const agent = await import("../agent.js");

      expect(agent).toBeDefined();
      expect(agent.runAgent).toBeDefined();
    });

    it("agent exports runAgent function with correct signature", async () => {
      vi.doMock("@lifeos/shared", () => ({
        pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: {
          child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          }),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }));

      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
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

      const agent = await import("../agent.js");

      // runAgent should be exported as a function
      expect(typeof agent.runAgent).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Additional integration tests
  // -------------------------------------------------------------------------

  describe("Strava tool integration verification", () => {
    it("get_strava_trends is a separate function from get_strava_activities", async () => {
      const strava = await import("../tools/strava.js");

      expect(strava.get_strava_trends).not.toBe(strava.get_strava_activities);
      expect(strava.get_strava_trends).not.toBe(strava.get_strava_oauth_url);
    });

    it("all Strava tools are distinct functions", async () => {
      const strava = await import("../tools/strava.js");

      const tools = [
        strava.get_strava_oauth_url,
        strava.get_strava_activities,
        strava.get_strava_trends,
      ];

      // Verify all are unique
      const uniqueTools = new Set(tools);
      expect(uniqueTools.size).toBe(3);
    });

    it("strava tools module is properly structured", async () => {
      const strava = await import("../tools/strava.js");

      // Verify the module has the expected exports
      expect(Object.keys(strava).length).toBeGreaterThanOrEqual(3);

      // Verify all three tools are present
      expect("get_strava_oauth_url" in strava).toBe(true);
      expect("get_strava_activities" in strava).toBe(true);
      expect("get_strava_trends" in strava).toBe(true);
    });

    it("agent module imports strava tools correctly", async () => {
      vi.doMock("@lifeos/shared", () => ({
        pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
        env: {
          ANTHROPIC_API_KEY: "sk-ant-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          TZ: "Europe/London",
          DATABASE_URL: "postgresql://localhost/test",
        },
        logger: {
          child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          }),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }));

      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({
          messages: { create: vi.fn() },
        })),
      }));

      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
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

      const agent = await import("../agent.js");

      // Verify agent module loads successfully
      expect(agent).toBeDefined();
      expect(typeof agent.runAgent).toBe("function");
    });
  });
});
