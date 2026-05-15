/**
 * Tests for packages/orchestrator/src/agent.ts — task-9b
 *
 * Acceptance criteria:
 *   AC1: Activity snapshot is formatted for agent context
 *   AC2: System prompt properly includes formatted activity data
 *   AC3: Agent receives activity context in all planning sessions
 *
 * Strategy
 * --------
 * The `pool` singleton from @lifeos/shared is mocked so no real PostgreSQL
 * database is required. The mock records all query calls and returns
 * configurable row sets so we can verify:
 *   - buildSystemPrompt() includes the activity snapshot block
 *   - the activity snapshot is properly formatted with activity count,
 *     moving time, and last activity details
 *   - runAgent() includes the activity snapshot in the system prompt
 *     passed to the Anthropic API
 *   - the activity snapshot is included in all planning sessions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store for activities and credentials
// ---------------------------------------------------------------------------

interface StoredActivity {
  id: number;
  strava_id: number;
  athlete_id: number;
  name: string;
  sport_type: string;
  start_date: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  total_elevation_gain: number;
  average_speed_ms: number;
  max_speed_ms: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_watts: number | null;
  kilojoules: number | null;
  suffer_score: number | null;
}

interface StoredCredential {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface StoredMessage {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: Date;
}

let activityStore: StoredActivity[] = [];
let credentialStore: StoredCredential[] = [];
let messageStore: StoredMessage[] = [];
let nextMessageId = 1;

function resetStores(): void {
  activityStore = [];
  credentialStore = [];
  messageStore = [];
  nextMessageId = 1;
}

/**
 * Simulates the behaviour of each SQL statement issued by agent.ts.
 * Returns `{ rows }` shaped like a pg QueryResult.
 */
function handleQuery(text: string, values: unknown[]): { rows: unknown[] } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  // Transaction control
  if (normalised === "BEGIN" || normalised === "COMMIT" || normalised === "ROLLBACK") {
    return { rows: [] };
  }

  // SELECT FROM strava_credentials
  if (
    normalised.startsWith("SELECT ATHLETE_ID FROM STRAVA_CREDENTIALS") ||
    (normalised.startsWith("SELECT") &&
      normalised.includes("STRAVA_CREDENTIALS") &&
      normalised.includes("ATHLETE_ID"))
  ) {
    return { rows: credentialStore.slice(0, 1) };
  }

  // SELECT FROM people
  if (
    normalised.startsWith("SELECT NAME, RELATIONSHIP_TYPE") &&
    normalised.includes("FROM PEOPLE")
  ) {
    return { rows: [] };
  }

  // SELECT FROM strava_activities (for activity summary)
  if (
    normalised.startsWith("SELECT") &&
    normalised.includes("FROM STRAVA_ACTIVITIES") &&
    normalised.includes("ATHLETE_ID")
  ) {
    const athleteId = values[0] as number;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const forAthlete = activityStore
      .filter((r) => r.athlete_id === athleteId)
      .filter((r) => new Date(r.start_date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    return { rows: forAthlete };
  }

  // INSERT INTO conversation_context
  if (normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const role = values[1] as string;
    const content = values[2] as string;
    const row: StoredMessage = {
      id: nextMessageId++,
      chat_id: chatId,
      role,
      content,
      created_at: new Date(),
    };
    messageStore.push(row);
    return { rows: [] };
  }

  // DELETE FROM conversation_context
  if (normalised.startsWith("DELETE FROM CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = messageStore
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });
    const keepIds = new Set(forChat.slice(0, limit).map((r) => r.id));
    messageStore = messageStore.filter((r) => r.chat_id !== chatId || keepIds.has(r.id));
    return { rows: [] };
  }

  // SELECT FROM conversation_context (load context)
  if (normalised.startsWith("SELECT") && normalised.includes("CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = messageStore
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      })
      .slice(0, limit)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    return { rows: forChat };
  }

  return { rows: [] };
}

// ---------------------------------------------------------------------------
// Build mocks
// ---------------------------------------------------------------------------

function buildMocks() {
  const poolQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const clientQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const clientMock = {
    query: clientQueryMock,
    release: vi.fn(),
  };

  const connectMock = vi.fn().mockResolvedValue(clientMock);

  const anthropicCreateMock = vi.fn().mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Test response" }],
  });

  const anthropicMock = vi.fn(() => ({
    messages: { create: anthropicCreateMock },
  }));

  return {
    pool: { 
      query: poolQueryMock,
      connect: connectMock,
    },
    poolQueryMock,
    clientQueryMock,
    clientMock,
    connectMock,
    anthropicMock,
    anthropicCreateMock,
  };
}

function applyAllMocks(mocks: ReturnType<typeof buildMocks>): void {
  vi.doMock("@lifeos/shared", () => ({
    pool: mocks.pool,
    env: {
      ANTHROPIC_API_KEY: "sk-ant-test",
      ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
      TZ: "Europe/London",
      DATABASE_URL: "postgresql://localhost/test",
    },
    logger: {
      child: () => ({
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      }),
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
  }));

  vi.doMock("@anthropic-ai/sdk", () => ({
    default: mocks.anthropicMock,
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

  vi.doMock("../tools/strava.js", () => ({
    get_strava_oauth_url: vi.fn(),
    get_strava_activities: vi.fn(),
    get_strava_trends: vi.fn(),
  }));

  vi.doMock("../tools/todoist.js", () => ({
    executeToDoistTool: vi.fn(),
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("task-9b — Activity snapshot integration into agent system prompt", () => {
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(() => {
    resetStores();
    vi.resetModules();
    mocks = buildMocks();
    applyAllMocks(mocks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1: Activity snapshot is formatted for agent context
  // -------------------------------------------------------------------------

  describe("AC1 — Activity snapshot is formatted for agent context", () => {
    it("formats activity count in the snapshot", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt).toContain("1");
      expect(systemPrompt.toLowerCase()).toContain("activit");
    });

    it("formats moving time in human-readable format", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Long Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 20000,
        moving_time_s: 7200, // 2 hours
        elapsed_time_s: 7500,
        total_elevation_gain: 200,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt.toLowerCase()).toContain("moving time");
      expect(systemPrompt).toMatch(/\d+\s*(hour|minute)/i);
    });

    it("includes last activity sport type in snapshot", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Ride",
        sport_type: "Ride",
        start_date: today,
        distance_m: 30000,
        moving_time_s: 5400,
        elapsed_time_s: 5500,
        total_elevation_gain: 500,
        average_speed_ms: 5.56,
        max_speed_ms: 10.0,
        average_heartrate: 140,
        max_heartrate: 170,
        average_watts: 200,
        kilojoules: 1080,
        suffer_score: 150,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt).toContain("Ride");
    });

    it("includes last activity date in snapshot", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Today Activity",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("handles no activities gracefully with default message", async () => {
      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt).toContain("0");
    });

    it("handles no Strava connection with appropriate message", async () => {
      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("Activity Snapshot");
      expect(systemPrompt.toLowerCase()).toContain("strava");
    });
  });

  // -------------------------------------------------------------------------
  // AC2: System prompt properly includes formatted activity data
  // -------------------------------------------------------------------------

  describe("AC2 — System prompt properly includes formatted activity data", () => {
    it("includes Activity Snapshot block in system prompt", async () => {
      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("## Activity Snapshot");
    });

    it("places Activity Snapshot block after People Index", async () => {
      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      const peopleIndex = systemPrompt.indexOf("## People Index");
      const activitySnapshot = systemPrompt.indexOf("## Activity Snapshot");

      expect(peopleIndex).toBeGreaterThan(-1);
      expect(activitySnapshot).toBeGreaterThan(-1);
      expect(activitySnapshot).toBeGreaterThan(peopleIndex);
    });

    it("includes all required blocks in system prompt", async () => {
      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("## Identity");
      expect(systemPrompt).toContain("## Live Context");
      expect(systemPrompt).toContain("## People Index");
      expect(systemPrompt).toContain("## Pending Nudges");
      expect(systemPrompt).toContain("## Activity Snapshot");
    });

    it("formats activity snapshot with proper structure", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      const activitySection = systemPrompt.substring(systemPrompt.indexOf("## Activity Snapshot"));

      expect(activitySection).toContain("Last 7 days");
      expect(activitySection).toContain("activit");
      expect(activitySection).toContain("moving time");
    });

    it("includes multiple activities in summary when they exist", async () => {
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        activityStore.push({
          id: i + 1,
          strava_id: 100 + i,
          athlete_id: 42,
          name: `Activity ${i + 1}`,
          sport_type: "Run",
          start_date: dateStr,
          distance_m: 5000,
          moving_time_s: 1800,
          elapsed_time_s: 1900,
          total_elevation_gain: 50,
          average_speed_ms: 2.78,
          max_speed_ms: 4.5,
          average_heartrate: 150,
          max_heartrate: 180,
          average_watts: null,
          kilojoules: null,
          suffer_score: null,
        });
      }

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { buildSystemPrompt } = await import("../agent.js");
      const systemPrompt = await buildSystemPrompt();

      expect(systemPrompt).toContain("3");
      expect(systemPrompt).toContain("activit");
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Agent receives activity context in all planning sessions
  // -------------------------------------------------------------------------

  describe("AC3 — Agent receives activity context in all planning sessions", () => {
    it("passes system prompt with activity snapshot to Anthropic API", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 1, text: "What did I do this week?" });

      expect(mocks.anthropicCreateMock).toHaveBeenCalled();
      const callArgs = mocks.anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.system).toContain("## Activity Snapshot");
      expect(callArgs.system).toContain("Last 7 days");
    });

    it("includes activity snapshot in system prompt for every agent call", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { runAgent } = await import("../agent.js");

      // First call
      await runAgent({ chat_id: 1, text: "Hello" });
      let callArgs = mocks.anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.system).toContain("## Activity Snapshot");

      // Reset mock for second call
      mocks.anthropicCreateMock.mockClear();

      // Second call
      await runAgent({ chat_id: 1, text: "What about my activities?" });
      callArgs = mocks.anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.system).toContain("## Activity Snapshot");
    });

    it("includes activity data in system prompt when Strava is connected", async () => {
      const today = new Date().toISOString().split("T")[0];
      activityStore.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800,
        elapsed_time_s: 1900,
        total_elevation_gain: 50,
        average_speed_ms: 2.78,
        max_speed_ms: 4.5,
        average_heartrate: 150,
        max_heartrate: 180,
        average_watts: null,
        kilojoules: null,
        suffer_score: null,
      });

      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 1, text: "Tell me about my activities" });

      expect(mocks.anthropicCreateMock).toHaveBeenCalled();
      const callArgs = mocks.anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.system).toContain("Activity Snapshot");
      expect(callArgs.system).toContain("Last 7 days");
      expect(callArgs.system).toContain("1");
    });

    it("includes default activity message when no Strava connection", async () => {
      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 1, text: "Hello" });

      expect(mocks.anthropicCreateMock).toHaveBeenCalled();
      const callArgs = mocks.anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.system).toContain("## Activity Snapshot");
      expect(callArgs.system.toLowerCase()).toContain("strava");
    });

    it("queries strava_credentials table to check for connection", async () => {
      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 1, text: "Hello" });

      const credentialQueries = mocks.poolQueryMock.mock.calls.filter(
        ([sql]) => typeof sql === "string" && sql.toUpperCase().includes("STRAVA_CREDENTIALS"),
      );

      expect(credentialQueries.length).toBeGreaterThan(0);
    });

    it("queries strava_activities table when credentials exist", async () => {
      credentialStore.push({
        athlete_id: 42,
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 1, text: "Hello" });

      const activityQueries = mocks.poolQueryMock.mock.calls.filter(
        ([sql]) => typeof sql === "string" && sql.toUpperCase().includes("STRAVA_ACTIVITIES"),
      );

      expect(activityQueries.length).toBeGreaterThan(0);
    });
  });
});
