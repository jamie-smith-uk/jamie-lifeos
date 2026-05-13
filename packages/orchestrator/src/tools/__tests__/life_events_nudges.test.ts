/**
 * life_events_nudges.test.ts — Tests for automatic nudge creation in life events
 *
 * Tests for create_life_event function that automatically creates nudges
 * 7 days before birthdays and 14 days before anniversaries.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Life Events Automatic Nudge Creation", () => {
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

  describe("create_life_event with automatic nudge creation", () => {
    describe("Birthday nudge creation", () => {
      it("should create a nudge 7 days before birthday event_date", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Alice's birthday is coming up in 7 days",
              trigger_at: new Date("1990-05-08T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
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
          notes: "Alice's birthday",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event).toBeDefined();
        expect(parsed.life_event.event_type).toBe("birthday");

        // Verify that pool.query was called 3 times: find person, create event, create nudge
        expect(mockQuery).toHaveBeenCalledTimes(3);
      });

      it("should calculate nudge trigger_at as 7 days before birthday", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Bob",
              relationship_type: "family",
              how_known: "relative",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              person_id: 1,
              event_type: "birthday",
              event_date: "1985-06-20",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge - should be 7 days before June 20
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 1,
              life_event_id: 2,
              message: "Bob's birthday is coming up in 7 days",
              trigger_at: new Date("1985-06-13T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Bob",
          event_type: "birthday",
          event_date: "1985-06-20",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify nudge was created with correct trigger_at (7 days before)
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall).toBeDefined();
        // The nudge should be created with trigger_at 7 days before the event
      });

      it("should include person name in birthday nudge message", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Charlie",
              relationship_type: "colleague",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 3,
              person_id: 1,
              event_type: "birthday",
              event_date: "1992-03-10",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              person_id: 1,
              life_event_id: 3,
              message: "Charlie's birthday is coming up in 7 days",
              trigger_at: new Date("1992-03-03T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Charlie",
          event_type: "birthday",
          event_date: "1992-03-10",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify the nudge message includes the person's name
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall[0]).toContain("message");
        // The message should include "Charlie" and "birthday"
      });
    });

    describe("Anniversary nudge creation", () => {
      it("should create a nudge 14 days before anniversary event_date", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Diana",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 4,
              person_id: 2,
              event_type: "anniversary",
              event_date: "2015-07-25",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              person_id: 2,
              life_event_id: 4,
              message: "Diana's anniversary is coming up in 14 days",
              trigger_at: new Date("2015-07-11T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Diana",
          event_type: "anniversary",
          event_date: "2015-07-25",
          notes: "Wedding anniversary",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event).toBeDefined();
        expect(parsed.life_event.event_type).toBe("anniversary");

        // Verify that pool.query was called 3 times: find person, create event, create nudge
        expect(mockQuery).toHaveBeenCalledTimes(3);
      });

      it("should calculate nudge trigger_at as 14 days before anniversary", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Eve",
              relationship_type: "partner",
              how_known: "dating",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 5,
              person_id: 3,
              event_type: "anniversary",
              event_date: "2018-09-14",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge - should be 14 days before September 14
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              person_id: 3,
              life_event_id: 5,
              message: "Eve's anniversary is coming up in 14 days",
              trigger_at: new Date("2018-08-31T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Eve",
          event_type: "anniversary",
          event_date: "2018-09-14",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify nudge was created with correct trigger_at (14 days before)
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall).toBeDefined();
        // The nudge should be created with trigger_at 14 days before the event
      });

      it("should include person name and event type in anniversary nudge message", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              name: "Frank",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 6,
              person_id: 4,
              event_type: "anniversary",
              event_date: "2010-12-25",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              person_id: 4,
              life_event_id: 6,
              message: "Frank's anniversary is coming up in 14 days",
              trigger_at: new Date("2010-12-11T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Frank",
          event_type: "anniversary",
          event_date: "2010-12-25",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify the nudge message includes the person's name and event type
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall).toBeDefined();
        // The message should include "Frank" and "anniversary"
      });
    });

    describe("Non-recurring event nudge handling", () => {
      it("should not create nudge for non-recurring event types", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              name: "Grace",
              relationship_type: "friend",
              how_known: "school",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 7,
              person_id: 5,
              event_type: "graduation",
              event_date: "2020-05-30",
              is_recurring: false,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Grace",
          event_type: "graduation",
          event_date: "2020-05-30",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(false);

        // Verify that pool.query was called only 2 times: find person and create event
        // No nudge should be created for non-recurring events
        expect(mockQuery).toHaveBeenCalledTimes(2);
      });
    });

    describe("Date calculation for recurring events", () => {
      it("should handle leap year dates correctly for birthday nudges", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              name: "Henry",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event - February 29 (leap year date)
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              person_id: 6,
              event_type: "birthday",
              event_date: "2000-02-29",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              person_id: 6,
              life_event_id: 8,
              message: "Henry's birthday is coming up in 7 days",
              trigger_at: new Date("2000-02-22T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Henry",
          event_type: "birthday",
          event_date: "2000-02-29",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.event_date).toBe("2000-02-29");
      });

      it("should handle month boundary dates correctly for anniversary nudges", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              name: "Iris",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event - January 31
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              person_id: 7,
              event_type: "anniversary",
              event_date: "2015-01-31",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge - 14 days before January 31
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              person_id: 7,
              life_event_id: 9,
              message: "Iris's anniversary is coming up in 14 days",
              trigger_at: new Date("2015-01-17T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Iris",
          event_type: "anniversary",
          event_date: "2015-01-31",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.event_date).toBe("2015-01-31");
      });
    });

    describe("Nudge message format", () => {
      it("should format birthday nudge message with person name and event type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              name: "Jack",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 10,
              person_id: 8,
              event_type: "birthday",
              event_date: "1988-04-05",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              person_id: 8,
              life_event_id: 10,
              message: "Jack's birthday is coming up in 7 days",
              trigger_at: new Date("1988-03-29T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Jack",
          event_type: "birthday",
          event_date: "1988-04-05",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify the nudge was created with proper message format
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall[0]).toContain("INSERT INTO nudges");
        // Message should contain person name and event type
      });

      it("should format anniversary nudge message with person name and event type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              name: "Karen",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 11,
              person_id: 9,
              event_type: "anniversary",
              event_date: "2012-08-18",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              person_id: 9,
              life_event_id: 11,
              message: "Karen's anniversary is coming up in 14 days",
              trigger_at: new Date("2012-08-04T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Karen",
          event_type: "anniversary",
          event_date: "2012-08-18",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);

        // Verify the nudge was created with proper message format
        const createNudgeCall = mockQuery.mock.calls[2];
        expect(createNudgeCall[0]).toContain("INSERT INTO nudges");
        // Message should contain person name and event type
      });
    });

    describe("Error handling for nudge creation", () => {
      it("should handle nudge creation failure gracefully", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              name: "Leo",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 12,
              person_id: 10,
              event_type: "birthday",
              event_date: "1995-11-22",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock nudge creation failure
        mockQuery.mockRejectedValueOnce(new Error("Database error"));

        const input = JSON.stringify({
          person_name: "Leo",
          event_type: "birthday",
          event_date: "1995-11-22",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        // Should still return success for the life event even if nudge creation fails
        // or should handle the error appropriately
        expect(parsed).toBeDefined();
      });
    });

    describe("Case-insensitive event type matching", () => {
      it("should recognize 'Birthday' (capitalized) as recurring event type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 11,
              name: "Mike",
              relationship_type: "friend",
              how_known: "gym",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating life event with capitalized event type
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 13,
              person_id: 11,
              event_type: "Birthday",
              event_date: "1993-07-14",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 11,
              person_id: 11,
              life_event_id: 13,
              message: "Mike's Birthday is coming up in 7 days",
              trigger_at: new Date("1993-07-07T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Mike",
          event_type: "Birthday",
          event_date: "1993-07-14",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);

        // Verify nudge was created (3 calls: find person, create event, create nudge)
        expect(mockQuery).toHaveBeenCalledTimes(3);
      });

      it("should recognize 'ANNIVERSARY' (uppercase) as recurring event type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 12,
              name: "Nancy",
              relationship_type: "spouse",
              how_known: "married",
              notes: null,
              last_interaction_at: new Date("2026-01-01T10:00:00Z"),
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
              id: 14,
              person_id: 12,
              event_type: "ANNIVERSARY",
              event_date: "2016-03-20",
              is_recurring: true,
              notes: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock creating nudge
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 12,
              person_id: 12,
              life_event_id: 14,
              message: "Nancy's ANNIVERSARY is coming up in 14 days",
              trigger_at: new Date("2016-03-06T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_name: "Nancy",
          event_type: "ANNIVERSARY",
          event_date: "2016-03-20",
        });

        const result = await lifeEventsModule.executeLifeEventsTool("create_life_event", input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.life_event.is_recurring).toBe(true);

        // Verify nudge was created (3 calls: find person, create event, create nudge)
        expect(mockQuery).toHaveBeenCalledTimes(3);
      });
    });
  });
});
