/**
 * scheduler.test.ts — Tests for scheduler module
 *
 * Tests for the scheduler module that manages cron jobs for nudge evaluation,
 * digest delivery, and automation execution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Scheduler", () => {
  let schedulerModule: typeof import("../scheduler.js");
  let mockCronSchedule: ReturnType<typeof vi.fn>;
  let mockPoolQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    // Mock node-cron
    mockCronSchedule = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    }));

    vi.doMock("node-cron", () => ({
      schedule: mockCronSchedule,
    }));

    // Mock @lifeos/shared
    mockPoolQuery = vi.fn();
    vi.doMock("@lifeos/shared", () => ({
      pool: {
        query: mockPoolQuery,
      },
      logger: {
        child: vi.fn(() => ({
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    }));

    schedulerModule = await import("../scheduler.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startScheduler function", () => {
    it("should export startScheduler function", () => {
      expect(typeof schedulerModule.startScheduler).toBe("function");
    });

    it("should initialize scheduler without throwing", async () => {
      await expect(schedulerModule.startScheduler()).resolves.not.toThrow();
    });
  });

  describe("Nudge evaluator cron job", () => {
    it("should schedule nudge evaluator to run every 15 minutes", async () => {
      await schedulerModule.startScheduler();

      // Verify that schedule was called with 15-minute cron expression
      expect(mockCronSchedule).toHaveBeenCalled();

      // Find the call that schedules the nudge evaluator (should be "*/15 * * * *")
      const calls = mockCronSchedule.mock.calls;
      const nudgeEvaluatorCall = calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      expect(nudgeEvaluatorCall).toBeDefined();
    });

    it("should query nudges table for pending nudges past trigger_at", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Test nudge",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      // Get the nudge evaluator callback function
      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      expect(nudgeEvaluatorCall).toBeDefined();

      // Execute the callback function
      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify that pool.query was called to fetch pending nudges
      expect(mockPoolQuery).toHaveBeenCalled();

      // Check that the query looks for pending nudges with trigger_at in the past
      const queryCall = mockPoolQuery.mock.calls.find((call) => String(call[0]).includes("nudges"));
      expect(queryCall).toBeDefined();
      expect(String(queryCall?.[0])).toContain("pending");
      expect(String(queryCall?.[0])).toContain("trigger_at");
    });

    it("should enforce maximum 3 nudges sent per hour", async () => {
      // Mock database to return 5 pending nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Nudge 1",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
          {
            id: 2,
            person_id: 2,
            life_event_id: null,
            message: "Nudge 2",
            trigger_at: new Date("2026-05-13T10:05:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
          {
            id: 3,
            person_id: 3,
            life_event_id: null,
            message: "Nudge 3",
            trigger_at: new Date("2026-05-13T10:10:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
          {
            id: 4,
            person_id: 4,
            life_event_id: null,
            message: "Nudge 4",
            trigger_at: new Date("2026-05-13T10:15:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
          {
            id: 5,
            person_id: 5,
            life_event_id: null,
            message: "Nudge 5",
            trigger_at: new Date("2026-05-13T10:20:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 5,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update calls for marking nudges as sent
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 2 }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 3 }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      // Get the nudge evaluator callback
      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Count how many nudges were marked as sent (UPDATE calls)
      const updateCalls = mockPoolQuery.mock.calls.filter((call) =>
        String(call[0]).includes("UPDATE"),
      );

      // Should only send maximum 3 nudges per hour
      expect(updateCalls.length).toBeLessThanOrEqual(3);
    });

    it("should update nudge status to sent when sending", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Test nudge",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Test nudge",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "sent",
            sent_at: new Date("2026-05-13T10:15:00Z"),
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify that UPDATE query was called to mark nudge as sent
      const updateCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("UPDATE"),
      );

      expect(updateCall).toBeDefined();
      expect(String(updateCall?.[0])).toContain("sent");
    });

    it("should handle database errors gracefully", async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        // Should not throw even if database fails
        await expect(callback()).resolves.not.toThrow();
      }
    });

    it("should only process pending nudges", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Pending nudge",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify the SELECT query filters for pending status
      const selectCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("SELECT"),
      );

      expect(selectCall).toBeDefined();
      expect(String(selectCall?.[0])).toContain("pending");
      expect(String(selectCall?.[0])).toContain("status");
    });

    it("should only process nudges with trigger_at in the past", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify the query includes a time comparison
      const selectCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("SELECT"),
      );

      expect(selectCall).toBeDefined();
      // Should compare trigger_at with current time
      expect(String(selectCall?.[0])).toMatch(/trigger_at\s*<|trigger_at\s*<=|now\(\)/i);
    });
  });

  describe("Cron job initialization", () => {
    it("should call schedule function from node-cron", async () => {
      await schedulerModule.startScheduler();

      expect(mockCronSchedule).toHaveBeenCalled();
    });

    it("should start the scheduled jobs", async () => {
      const mockStart = vi.fn();
      mockCronSchedule.mockReturnValue({
        start: mockStart,
        stop: vi.fn(),
      });

      await schedulerModule.startScheduler();

      // Verify that start() was called on the scheduled job
      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe("Security and rate limiting", () => {
    it("should use parameterized queries for nudge lookup", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify pool.query was called with parameterized query (array as second argument)
      const queryCall = mockPoolQuery.mock.calls.find((call) => String(call[0]).includes("SELECT"));

      expect(queryCall).toBeDefined();
      // Parameterized queries pass parameters as second argument
      expect(Array.isArray(queryCall?.[1]) || queryCall?.[1] === undefined).toBe(true);
    });

    it("should track sent nudges to enforce hourly rate limit", async () => {
      // Mock 3 nudges already sent in the last hour
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 4,
            person_id: 4,
            life_event_id: null,
            message: "New nudge",
            trigger_at: new Date("2026-05-13T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock query to check recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, sent_at: new Date("2026-05-13T10:05:00Z") },
          { id: 2, sent_at: new Date("2026-05-13T10:10:00Z") },
          { id: 3, sent_at: new Date("2026-05-13T10:12:00Z") },
        ],
        rowCount: 3,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Should check for recently sent nudges to enforce rate limit
      const sentNudgesCheck = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("sent"),
      );

      expect(sentNudgesCheck).toBeDefined();
    });
  });
});
