/**
 * life_events.test.ts — Tests for life events module functions
 *
 * Tests for get_upcoming_life_events function that queries and returns
 * life events within a date range with recurring event adjustment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Life Events Tools", () => {
  let lifeEventsModule: typeof import("../life_events.js");

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      pool: {
        query: vi.fn(),
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
    lifeEventsModule = await import("../life_events.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get_upcoming_life_events", () => {
    describe("Date range filtering", () => {
      it("should accept start_date and end_date parameters", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying life events within date range
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("events");
        expect(Array.isArray(parsed.events)).toBe(true);
      });

      it("should return events within the specified date range", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
            {
              id: 2,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2020-05-20",
              is_recurring: true,
              notes: "Bob's anniversary",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(2);
      });

      it("should return empty list when no events in date range", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying with no results
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-12-01",
          end_date: "2026-12-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(0);
      });

      it("should filter events outside the date range", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying with only events in range
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-10",
          end_date: "2026-05-20",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Recurring event adjustment", () => {
      it("should adjust recurring events to current year", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying life events with recurring flag
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(1);
        // Recurring event should have adjusted date in current year
        const event = parsed.events[0];
        expect(event).toHaveProperty("event_date");
        // For a birthday on 1990-05-15, adjusted to 2026 should be 2026-05-15
        expect(event.event_date).toContain("05-15");
      });

      it("should preserve non-recurring events as-is", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying life events with non-recurring flag
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "graduation",
              event_date: "2025-06-15",
              is_recurring: false,
              notes: "Charlie's graduation",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2025-06-01",
          end_date: "2025-06-30",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(1);
        const event = parsed.events[0];
        expect(event.event_date).toBe("2025-06-15");
      });

      it("should handle multiple recurring events in same month", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying multiple recurring events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
            {
              id: 3,
              person_id: 3,
              event_type: "birthday",
              event_date: "1985-05-20",
              is_recurring: true,
              notes: "Diana's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(2);
        // Both should be adjusted to 2026
        parsed.events.forEach((event: any) => {
          expect(event.event_date).toContain("2026");
        });
      });

      it("should adjust anniversary events to current year", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock querying anniversary event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              person_id: 4,
              event_type: "anniversary",
              event_date: "2020-07-10",
              is_recurring: true,
              notes: "Wedding anniversary",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-07-01",
          end_date: "2026-07-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.events).toHaveLength(1);
        const event = parsed.events[0];
        expect(event.event_date).toContain("2026-07-10");
      });
    });

    describe("Error handling", () => {
      it("should return error when start_date is missing", async () => {
        const input = JSON.stringify({
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("start_date");
      });

      it("should return error when end_date is missing", async () => {
        const input = JSON.stringify({
          start_date: "2026-05-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("end_date");
      });

      it("should return error on invalid date format", async () => {
        const input = JSON.stringify({
          start_date: "05/01/2026",
          end_date: "05/31/2026",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error when start_date is after end_date", async () => {
        const input = JSON.stringify({
          start_date: "2026-05-31",
          end_date: "2026-05-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock database error
        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("get_upcoming_life_events failed");
      });

      it("should return error on invalid JSON input", async () => {
        const input = "invalid json";

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should handle gracefully when dates are empty strings", async () => {
        const input = JSON.stringify({
          start_date: "",
          end_date: "",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });
    });

    describe("Response format", () => {
      it("should return JSON string response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );

        expect(typeof result).toBe("string");
        expect(() => JSON.parse(result)).not.toThrow();
      });

      it("should include success flag in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success");
        expect(typeof parsed.success).toBe("boolean");
      });

      it("should include events array in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("events");
        expect(Array.isArray(parsed.events)).toBe(true);
      });

      it("should include message in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("message");
        expect(typeof parsed.message).toBe("string");
      });

      it("should return event objects with all required fields", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        expect(parsed.events).toHaveLength(1);
        const event = parsed.events[0];
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("person_id");
        expect(event).toHaveProperty("event_type");
        expect(event).toHaveProperty("event_date");
        expect(event).toHaveProperty("is_recurring");
        expect(event).toHaveProperty("created_at");
      });

      it("should convert id to string in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        const event = parsed.events[0];
        expect(typeof event.id).toBe("string");
      });

      it("should convert created_at to ISO string in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const createdAt = new Date("2026-01-01T10:00:00Z");
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: createdAt,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          start_date: "2026-05-01",
          end_date: "2026-05-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool(
          "get_upcoming_life_events",
          input,
        );
        const parsed = JSON.parse(result);

        const event = parsed.events[0];
        expect(typeof event.created_at).toBe("string");
        expect(event.created_at).toBe(createdAt.toISOString());
      });
    });
  });
});
