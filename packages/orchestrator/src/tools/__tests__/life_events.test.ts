/**
 * life_events.test.ts — Tests for life_events module functions
 *
 * Tests for create_life_event function that creates life event records
 * with automatic recurring flag for birthdays and anniversaries.
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

  describe("create_life_event", () => {
    describe("Input validation and parameters", () => {
      it("should accept person name, event_type, event_date, and optional notes", async () => {
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

        // Mock creating life event record
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
        expect(parsed.life_event).toBeDefined();
        expect(parsed.life_event.person_id).toBe(1);
        expect(parsed.life_event.event_type).toBe("birthday");
        expect(parsed.life_event.event_date).toBe("1990-05-15");
      });

      it("should accept optional notes parameter", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Bob Smith",
              relationship_type: "colleague",
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

        // Mock creating life event record with notes
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2015-06-20",
              is_recurring: true,
              notes: "Wedding anniversary",
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
          event_date: "2015-06-20",
          notes: "Wedding anniversary",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.notes).toBe("Wedding anniversary");
      });
    });

    describe("Automatic recurring flag for birthdays and anniversaries", () => {
      it("should automatically set is_recurring to true for birthday event_type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Carol Davis",
              relationship_type: "family",
              how_known: "sister",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event record with is_recurring true
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              person_id: 3,
              event_type: "birthday",
              event_date: "1988-03-10",
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
          person_name: "Carol Davis",
          event_type: "birthday",
          event_date: "1988-03-10",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });

      it("should automatically set is_recurring to true for anniversary event_type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              name: "David Wilson",
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

        // Mock creating life event record with is_recurring true
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              person_id: 4,
              event_type: "anniversary",
              event_date: "2010-07-25",
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
          person_name: "David Wilson",
          event_type: "anniversary",
          event_date: "2010-07-25",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);
      });

      it("should set is_recurring to false for non-birthday/anniversary event types", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              name: "Eve Martinez",
              relationship_type: "friend",
              how_known: "university",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event record with is_recurring false
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              person_id: 5,
              event_type: "graduation",
              event_date: "2015-05-20",
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
          person_name: "Eve Martinez",
          event_type: "graduation",
          event_date: "2015-05-20",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(false);
      });
    });

    describe("Fuzzy person name matching", () => {
      it("should use fuzzy matching to find person by name", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person with fuzzy match
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              name: "Frank Johnson",
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

        // Mock creating life event record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              person_id: 6,
              event_type: "birthday",
              event_date: "1985-12-01",
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
          person_name: "frank johnson",
          event_type: "birthday",
          event_date: "1985-12-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.person_id).toBe(6);
      });

      it("should return error when person not found with fuzzy matching", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock person not found
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
          event_date: "1990-01-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain("No person found");
      });
    });

    describe("JSON response format", () => {
      it("should return JSON response with created event details on success", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              name: "Grace Lee",
              relationship_type: "friend",
              how_known: "school",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              person_id: 7,
              event_type: "birthday",
              event_date: "1992-08-14",
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
          person_name: "Grace Lee",
          event_type: "birthday",
          event_date: "1992-08-14",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success");
        expect(parsed).toHaveProperty("life_event");
        expect(parsed).toHaveProperty("message");
        expect(parsed.success).toBe(true);
        expect(parsed.life_event).toHaveProperty("id");
        expect(parsed.life_event).toHaveProperty("person_id");
        expect(parsed.life_event).toHaveProperty("event_type");
        expect(parsed.life_event).toHaveProperty("event_date");
        expect(parsed.life_event).toHaveProperty("is_recurring");
        expect(parsed.life_event).toHaveProperty("created_at");
      });

      it("should return JSON response with error message on failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock person not found
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "UnknownPerson",
          event_type: "birthday",
          event_date: "1990-01-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success");
        expect(parsed).toHaveProperty("message");
        expect(parsed.success).toBe(false);
      });

      it("should include human-readable message in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              name: "Henry Brown",
              relationship_type: "colleague",
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

        // Mock creating life event record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              person_id: 8,
              event_type: "birthday",
              event_date: "1987-11-22",
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
          person_name: "Henry Brown",
          event_type: "birthday",
          event_date: "1987-11-22",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.message).toBeDefined();
        expect(typeof parsed.message).toBe("string");
        expect(parsed.message.length).toBeGreaterThan(0);
      });
    });

    describe("Error handling", () => {
      it("should return error JSON when database query fails", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock database error
        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          person_name: "Test Person",
          event_type: "birthday",
          event_date: "1990-01-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("create_life_event failed");
      });

      it("should return error JSON when input is invalid JSON", async () => {
        const input = "invalid json";

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error when required parameters are missing", async () => {
        const input = JSON.stringify({
          person_name: "Test Person",
          // missing event_type and event_date
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });
    });

    describe("Tool executor routing", () => {
      it("should route create_life_event operation correctly", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              name: "Iris Chen",
              relationship_type: "friend",
              how_known: "online",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              person_id: 9,
              event_type: "birthday",
              event_date: "1995-02-28",
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
          person_name: "Iris Chen",
          event_type: "birthday",
          event_date: "1995-02-28",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
      });

      it("should return error for unknown operation", async () => {
        const input = JSON.stringify({
          person_name: "Test Person",
          event_type: "birthday",
          event_date: "1990-01-01",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("unknown_operation", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("Unknown");
      });
    });
  });
});
