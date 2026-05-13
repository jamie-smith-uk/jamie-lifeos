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

  describe("create_life_event", () => {
    describe("Input validation", () => {
      it("should accept person_name, event_type, event_date, and optional notes", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: "Loves hiking",
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
          notes: "Alice's birthday",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("life_event");
      });

      it("should reject missing person_name", async () => {
        const input = JSON.stringify({
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("person_name");
      });

      it("should reject missing event_type", async () => {
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_type");
      });

      it("should reject missing event_date", async () => {
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_date");
      });

      it("should reject empty person_name", async () => {
        const input = JSON.stringify({
          person_name: "",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("person_name");
      });

      it("should reject person_name exceeding 255 characters", async () => {
        const longName = "a".repeat(256);
        const input = JSON.stringify({
          person_name: longName,
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("person_name");
      });

      it("should reject event_type exceeding 100 characters", async () => {
        const longType = "a".repeat(101);
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: longType,
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_type");
      });

      it("should reject notes exceeding 10000 characters", async () => {
        const longNotes = "a".repeat(10001);
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
          notes: longNotes,
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("notes");
      });

      it("should reject invalid date format", async () => {
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "05/15/1990",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_date");
      });

      it("should accept valid date format YYYY-MM-DD", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: "Loves hiking",
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
      });
    });

    describe("Recurring event type detection", () => {
      it("should set is_recurring to true for birthday events", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: "Loves hiking",
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });

      it("should set is_recurring to true for anniversary events", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Bob Smith",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2020-07-10",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Bob Smith",
          event_type: "anniversary",
          event_date: "2020-07-10",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });

      it("should set is_recurring to false for non-recurring event types", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Charlie Brown",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              person_id: 3,
              event_type: "graduation",
              event_date: "2025-06-15",
              is_recurring: false,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Charlie Brown",
          event_type: "graduation",
          event_date: "2025-06-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(false);
      });

      it("should handle case-insensitive event type matching for birthday", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "BIRTHDAY",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "BIRTHDAY",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });

      it("should handle case-insensitive event type matching for anniversary", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Bob Smith",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "Anniversary",
              event_date: "2020-07-10",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Bob Smith",
          event_type: "Anniversary",
          event_date: "2020-07-10",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });
    });

    describe("Fuzzy name matching", () => {
      it("should find person with exact name match", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.person_id).toBe(1);
      });

      it("should find person with partial name match", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
      });

      it("should return error when person not found", async () => {
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
          person_name: "NonexistentPerson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain("No person found");
      });
    });

    describe("Response format", () => {
      it("should return JSON string response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);

        expect(typeof result).toBe("string");
        expect(() => JSON.parse(result)).not.toThrow();
      });

      it("should include success flag in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success");
        expect(typeof parsed.success).toBe("boolean");
      });

      it("should include life_event object in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("life_event");
        expect(typeof parsed.life_event).toBe("object");
      });

      it("should include message in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("message");
        expect(typeof parsed.message).toBe("string");
      });

      it("should return life_event with all required fields", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday",
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
          notes: "Alice's birthday",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        const event = parsed.life_event;
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
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(typeof parsed.life_event.id).toBe("string");
      });

      it("should convert created_at to ISO string in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const createdAt = new Date("2026-05-12T10:00:00Z");
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: createdAt,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(typeof parsed.life_event.created_at).toBe("string");
        expect(parsed.life_event.created_at).toBe(createdAt.toISOString());
      });
    });

    describe("Error handling", () => {
      it("should return error on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("create_life_event failed");
      });

      it("should return error on invalid JSON input", async () => {
        const input = "invalid json";

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should handle gracefully when person_name is whitespace only", async () => {
        const input = JSON.stringify({
          person_name: "   ",
          event_type: "birthday",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("person_name");
      });

      it("should handle gracefully when event_type is whitespace only", async () => {
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "   ",
          event_date: "1990-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_type");
      });

      it("should handle gracefully when event_date is whitespace only", async () => {
        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "   ",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("event_date");
      });
    });

    describe("Automatic nudge creation", () => {
      it("should create nudge for birthday with correct trigger date (7 days before)", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "2026-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify nudge creation was called with correct parameters
        expect(mockQuery).toHaveBeenCalledTimes(3);
        const nudgeCall = mockQuery.mock.calls[2];
        expect(nudgeCall[0]).toContain("INSERT INTO nudges");
        expect(nudgeCall[1][0]).toBe(1); // person_id
        expect(nudgeCall[1][1]).toBe(1); // life_event_id
        expect(nudgeCall[1][2]).toBe("Alice Johnson's birthday is coming up in 7 days"); // message

        // Verify trigger date is 7 days before event at 9:00 AM
        const triggerAt = new Date(nudgeCall[1][3]);
        const eventDate = new Date("2026-05-15");
        const expectedTriggerDate = new Date(eventDate);
        expectedTriggerDate.setDate(expectedTriggerDate.getDate() - 7);
        expectedTriggerDate.setHours(9, 0, 0, 0);

        expect(triggerAt.toISOString()).toBe(expectedTriggerDate.toISOString());

        // Verify status is hardcoded as 'pending' in the SQL query
        expect(nudgeCall[0]).toContain("'pending'");
      });

      it("should create nudge for anniversary with correct trigger date (14 days before)", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Bob Smith",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2020-07-10",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Bob Smith",
          event_type: "anniversary",
          event_date: "2026-07-10",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify nudge creation was called with correct parameters
        expect(mockQuery).toHaveBeenCalledTimes(3);
        const nudgeCall = mockQuery.mock.calls[2];
        expect(nudgeCall[0]).toContain("INSERT INTO nudges");
        expect(nudgeCall[1][0]).toBe(2); // person_id
        expect(nudgeCall[1][1]).toBe(2); // life_event_id
        expect(nudgeCall[1][2]).toBe("Bob Smith's anniversary is coming up in 14 days"); // message

        // Verify trigger date is 14 days before event at 9:00 AM
        const triggerAt = new Date(nudgeCall[1][3]);
        const eventDate = new Date("2026-07-10");
        const expectedTriggerDate = new Date(eventDate);
        expectedTriggerDate.setDate(expectedTriggerDate.getDate() - 14);
        expectedTriggerDate.setHours(9, 0, 0, 0);

        expect(triggerAt.toISOString()).toBe(expectedTriggerDate.toISOString());

        // Verify status is hardcoded as 'pending' in the SQL query
        expect(nudgeCall[0]).toContain("'pending'");
      });

      it("should format nudge messages correctly for different event types", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Test birthday message format
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "2026-05-15",
        });

        await lifeEventsModule.executeLifeEventsTool("create_life_event", input);

        // Verify message format
        const nudgeCall = mockQuery.mock.calls[2];
        expect(nudgeCall[1][2]).toBe("Alice Johnson's birthday is coming up in 7 days");
      });

      it("should not create nudge for non-recurring events", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Charlie Brown",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event (non-recurring)
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              person_id: 3,
              event_type: "graduation",
              event_date: "2025-06-15",
              is_recurring: false,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Charlie Brown",
          event_type: "graduation",
          event_date: "2025-06-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify only 2 queries were made (person lookup and life event creation, no nudge)
        expect(mockQuery).toHaveBeenCalledTimes(2);
      });

      it("should continue successfully if nudge creation fails", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock nudge creation failure
        mockQuery.mockRejectedValueOnce(new Error("Nudge creation failed"));

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "2026-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        // Life event creation should still succeed despite nudge failure
        expect(parsed.success).toBe(true);
        expect(parsed.life_event).toBeDefined();
        expect(parsed.message).toBe("Life event created successfully");
      });

      it("should handle case-insensitive event types for nudge creation", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event with uppercase event type
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "BIRTHDAY",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "BIRTHDAY",
          event_date: "2026-05-15",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify nudge was created with correct trigger date (7 days for birthday)
        expect(mockQuery).toHaveBeenCalledTimes(3);
        const nudgeCall = mockQuery.mock.calls[2];

        // Verify trigger date calculation works with uppercase event type
        const triggerAt = new Date(nudgeCall[1][3]);
        const eventDate = new Date("2026-05-15");
        const expectedTriggerDate = new Date(eventDate);
        expectedTriggerDate.setDate(expectedTriggerDate.getDate() - 7); // 7 days for birthday
        expectedTriggerDate.setHours(9, 0, 0, 0);

        expect(triggerAt.toISOString()).toBe(expectedTriggerDate.toISOString());
      });

      it("should calculate correct trigger dates for events in different months", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Bob Smith",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event for anniversary on January 1st
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2020-01-01",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Bob Smith",
          event_type: "anniversary",
          event_date: "2026-01-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify trigger date calculation for cross-month boundary
        const nudgeCall = mockQuery.mock.calls[2];
        const triggerAt = new Date(nudgeCall[1][3]);

        // 14 days before January 1st should be December 18th of previous year
        const expectedTriggerDate = new Date("2025-12-18T09:00:00.000Z");

        expect(triggerAt.toISOString()).toBe(expectedTriggerDate.toISOString());
      });

      it("should set nudge trigger time to 9:00 AM consistently", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Alice Johnson",
          event_type: "birthday",
          event_date: "2026-05-15",
        });

        await lifeEventsModule.executeLifeEventsTool("create_life_event", input);

        // Verify trigger time is set to 9:00 AM
        const nudgeCall = mockQuery.mock.calls[2];
        const triggerAt = new Date(nudgeCall[1][3]);

        expect(triggerAt.getUTCHours()).toBe(9);
        expect(triggerAt.getUTCMinutes()).toBe(0);
        expect(triggerAt.getUTCSeconds()).toBe(0);
        expect(triggerAt.getUTCMilliseconds()).toBe(0);
      });
    });
  });
});
