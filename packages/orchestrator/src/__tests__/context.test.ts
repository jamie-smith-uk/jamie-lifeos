/**
 * Tests for packages/orchestrator/src/context.ts — task-9a
 *
 * Acceptance criteria:
 *   AC1: System prompt includes last 7 days activity count
 *   AC2: System prompt includes total moving time for last 7 days
 *   AC3: System prompt includes last activity sport and date
 *   AC4: Handles case where no activities exist gracefully
 *
 * Strategy
 * --------
 * The `pool` singleton from @lifeos/shared is mocked so no real PostgreSQL
 * database is required. The mock records all query calls and returns
 * configurable row sets so we can verify:
 *   - correct parameterised SQL is issued for querying last 7 days
 *   - the system prompt context includes activity count, moving time, and
 *     last activity details
 *   - when no activities exist, the system prompt handles it gracefully
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store for activities
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

let store: StoredActivity[] = [];
let nextId = 1;

function resetStore(): void {
  store = [];
  nextId = 1;
}

/**
 * Simulates the behaviour of each SQL statement issued by context.ts.
 * Returns `{ rows }` shaped like a pg QueryResult.
 */
function handleQuery(text: string, values: unknown[]): { rows: StoredActivity[] } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  // INSERT INTO strava_activities (for test setup)
  if (normalised.startsWith("INSERT INTO STRAVA_ACTIVITIES")) {
    const [athleteId, stravaId, name, sportType, startDate, distanceM, movingTimeS] = values;
    const row: StoredActivity = {
      id: nextId++,
      strava_id: stravaId as number,
      athlete_id: athleteId as number,
      name: name as string,
      sport_type: sportType as string,
      start_date: startDate as string,
      distance_m: distanceM as number,
      moving_time_s: movingTimeS as number,
      elapsed_time_s: 0,
      total_elevation_gain: 0,
      average_speed_ms: 0,
      max_speed_ms: 0,
      average_heartrate: null,
      max_heartrate: null,
      average_watts: null,
      kilojoules: null,
      suffer_score: null,
    };
    store.push(row);
    return { rows: [] };
  }

  // SELECT … FROM strava_activities WHERE athlete_id = $1 AND start_date >= NOW() - INTERVAL '7 days'
  if (normalised.startsWith("SELECT")) {
    const athleteId = values[0] as number;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const forAthlete = store
      .filter((r) => r.athlete_id === athleteId)
      .filter((r) => new Date(r.start_date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    return { rows: forAthlete };
  }

  return { rows: [] };
}

// ---------------------------------------------------------------------------
// Build pool mock
// ---------------------------------------------------------------------------

function buildPoolMock() {
  const poolQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  return {
    pool: {
      query: poolQueryMock,
    },
    poolQueryMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("task-9a — context.ts Strava activity summary", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1: System prompt includes last 7 days activity count
  // -------------------------------------------------------------------------

  describe("AC1 — System prompt includes last 7 days activity count", () => {
    it("returns activity count of 0 when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("0");
      expect(summary.toLowerCase()).toContain("activit");
    });

    it("returns activity count of 1 when one activity exists in last 7 days", async () => {
      const today = new Date().toISOString().split("T")[0];
      store.push({
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("1");
      expect(summary.toLowerCase()).toContain("activit");
    });

    it("returns activity count of 3 when three activities exist in last 7 days", async () => {
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        store.push({
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("3");
      expect(summary.toLowerCase()).toContain("activit");
    });

    it("excludes activities older than 7 days from the count", async () => {
      const today = new Date();
      const eightDaysAgo = new Date(today);
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const eightDaysAgoStr = eightDaysAgo.toISOString().split("T")[0];

      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

      // Add activity from 8 days ago (should be excluded)
      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Old Activity",
        sport_type: "Run",
        start_date: eightDaysAgoStr,
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

      // Add activity from 2 days ago (should be included)
      store.push({
        id: 2,
        strava_id: 101,
        athlete_id: 42,
        name: "Recent Activity",
        sport_type: "Run",
        start_date: twoDaysAgoStr,
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("1");
      expect(summary).not.toContain("Old Activity");
    });
  });

  // -------------------------------------------------------------------------
  // AC2: System prompt includes total moving time for last 7 days
  // -------------------------------------------------------------------------

  describe("AC2 — System prompt includes total moving time for last 7 days", () => {
    it("returns 0 moving time when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary.toLowerCase()).toContain("moving time");
      expect(summary).toContain("0");
    });

    it("returns correct moving time for single activity", async () => {
      const today = new Date().toISOString().split("T")[0];
      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Morning Run",
        sport_type: "Run",
        start_date: today,
        distance_m: 5000,
        moving_time_s: 1800, // 30 minutes
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary.toLowerCase()).toContain("moving time");
      expect(summary).toContain("30");
    });

    it("returns sum of moving times for multiple activities", async () => {
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        store.push({
          id: i + 1,
          strava_id: 100 + i,
          athlete_id: 42,
          name: `Activity ${i + 1}`,
          sport_type: "Run",
          start_date: dateStr,
          distance_m: 5000,
          moving_time_s: 1800, // 30 minutes each
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary.toLowerCase()).toContain("moving time");
      expect(summary).toContain("90"); // 3 * 30 minutes
    });

    it("formats moving time in human-readable format (minutes or hours)", async () => {
      const today = new Date().toISOString().split("T")[0];
      store.push({
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary.toLowerCase()).toContain("moving time");
      // Should contain either "2 hour" or "120 minute" or similar
      expect(summary).toMatch(/\d+\s*(hour|minute)/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC3: System prompt includes last activity sport and date
  // -------------------------------------------------------------------------

  describe("AC3 — System prompt includes last activity sport and date", () => {
    it("returns empty string for sport and date when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      // Should handle gracefully - either empty or "none" or similar
      expect(typeof summary).toBe("string");
    });

    it("returns sport type of the most recent activity", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Yesterday Run",
        sport_type: "Run",
        start_date: yesterday.toISOString().split("T")[0],
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

      store.push({
        id: 2,
        strava_id: 101,
        athlete_id: 42,
        name: "Today Ride",
        sport_type: "Ride",
        start_date: today.toISOString().split("T")[0],
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("Ride");
    });

    it("returns date of the most recent activity", async () => {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Today Activity",
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      // Should contain the date in some format
      expect(summary).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}|\d{1,2}\s+\w+/);
    });

    it("identifies most recent activity when multiple exist", async () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Old Activity",
        sport_type: "Run",
        start_date: threeDaysAgo.toISOString().split("T")[0],
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

      store.push({
        id: 2,
        strava_id: 101,
        athlete_id: 42,
        name: "Recent Activity",
        sport_type: "Ride",
        start_date: today.toISOString().split("T")[0],
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

      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary).toContain("Ride");
      expect(summary).not.toContain("Run");
    });
  });

  // -------------------------------------------------------------------------
  // AC4: Handles case where no activities exist gracefully
  // -------------------------------------------------------------------------

  describe("AC4 — Handles case where no activities exist gracefully", () => {
    it("returns a valid string when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("does not throw an error when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");

      await expect(getActivitySummary(42)).resolves.not.toThrow();
    });

    it("returns sensible defaults when no activities exist", async () => {
      const { getActivitySummary } = await import("../context.js");
      const summary = await getActivitySummary(42);

      expect(summary.toLowerCase()).toContain("0");
      expect(summary.toLowerCase()).toContain("activit");
    });

    it("returns different athlete data for different athlete_ids", async () => {
      const today = new Date().toISOString().split("T")[0];

      store.push({
        id: 1,
        strava_id: 100,
        athlete_id: 42,
        name: "Athlete 42 Activity",
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

      store.push({
        id: 2,
        strava_id: 101,
        athlete_id: 99,
        name: "Athlete 99 Activity",
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

      const { getActivitySummary } = await import("../context.js");
      const summary42 = await getActivitySummary(42);
      const summary99 = await getActivitySummary(99);

      expect(summary42).toContain("1");
      expect(summary99).toContain("1");
      expect(summary42).toContain("Run");
      expect(summary99).toContain("Ride");
    });
  });

  // -------------------------------------------------------------------------
  // Parameterised queries
  // -------------------------------------------------------------------------

  describe("Parameterised queries", () => {
    it("uses parameterised queries with $1 placeholder for athlete_id", async () => {
      const { getActivitySummary } = await import("../context.js");
      await getActivitySummary(42);

      const selectCall = mocks.poolQueryMock.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.trim().toUpperCase().startsWith("SELECT"),
      );
      expect(selectCall).toBeDefined();

      const [selectSql, selectValues] = selectCall as [string, unknown[]];
      expect(selectSql).toMatch(/\$1/);
      expect(selectSql).not.toContain("42");
      expect(selectValues).toContain(42);
    });

    it("does not use string interpolation for athlete_id", async () => {
      const { getActivitySummary } = await import("../context.js");
      await getActivitySummary(999);

      const selectCall = mocks.poolQueryMock.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.trim().toUpperCase().startsWith("SELECT"),
      );
      expect(selectCall).toBeDefined();

      const [selectSql] = selectCall as [string, unknown[]];
      expect(selectSql).not.toContain("999");
    });
  });
});
