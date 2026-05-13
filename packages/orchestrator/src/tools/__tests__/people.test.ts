/**
 * people.test.ts — Tests for people module functions
 *
 * Tests for log_interaction function that creates interaction records
 * and updates last_interaction_at on person records.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("People Tools", () => {
  let peopleModule: typeof import("../people.js");

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
    peopleModule = await import("../people.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log_interaction", () => {
    describe("Input validation", () => {
      it("should accept person name and interaction notes as input", async () => {
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              notes: "Had coffee and discussed new job",
              interacted_at: new Date("2026-05-12T10:00:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: "Loves hiking",
              last_interaction_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
          notes: "Had coffee and discussed new job",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("interaction");
        expect(parsed).toHaveProperty("person");
      });

      it("should return error when name is missing", async () => {
        const input = JSON.stringify({
          notes: "Had coffee",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("name");
      });

      it("should return error when name is empty string", async () => {
        const input = JSON.stringify({
          name: "",
          notes: "Had coffee",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error when name is not a string", async () => {
        const input = JSON.stringify({
          name: 123,
          notes: "Had coffee",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should accept optional notes parameter", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
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

        // Mock creating interaction record with null notes
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              notes: null,
              interacted_at: new Date("2026-05-12T10:00:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: "Bob Smith",
              relationship_type: "colleague",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Bob Smith",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
      });
    });

    describe("Fuzzy name matching", () => {
      it("should find person using fuzzy matching with partial name", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person with fuzzy match
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              person_id: 5,
              notes: "Quick chat",
              interacted_at: new Date("2026-05-12T10:00:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              name: "Alice Johnson",
              relationship_type: "friend",
              how_known: "college",
              notes: "Loves hiking",
              last_interaction_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "alice",
          notes: "Quick chat",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person.name).toBe("Alice Johnson");
      });

      it("should return error when person not found", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding no person
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "NonexistentPerson",
          notes: "Some notes",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", false);
        expect(parsed).toHaveProperty("message");
        expect(parsed.message).toContain("No person found");
      });

      it("should prioritize exact name match over partial match", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person with exact match prioritization
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              name: "John",
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 15,
              person_id: 7,
              notes: "Exact match test",
              interacted_at: new Date("2026-05-12T10:00:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              name: "John",
              relationship_type: "friend",
              how_known: "school",
              notes: null,
              last_interaction_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "John",
          notes: "Exact match test",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person.name).toBe("John");
      });
    });

    describe("Interaction record creation", () => {
      it("should create new interaction record with interacted_at timestamp", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const interactionTime = new Date("2026-05-12T14:30:00Z");

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Charlie Brown",
              relationship_type: "friend",
              how_known: "childhood",
              notes: "Good friend",
              last_interaction_at: new Date("2026-04-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              person_id: 2,
              notes: "Lunch meeting",
              interacted_at: interactionTime,
              created_at: interactionTime,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: "Charlie Brown",
              relationship_type: "friend",
              how_known: "childhood",
              notes: "Good friend",
              last_interaction_at: interactionTime,
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Charlie Brown",
          notes: "Lunch meeting",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("interaction");
        expect(parsed.interaction).toHaveProperty("id");
        expect(parsed.interaction).toHaveProperty("person_id", 2);
        expect(parsed.interaction).toHaveProperty("notes", "Lunch meeting");
        expect(parsed.interaction).toHaveProperty("interacted_at");
      });

      it("should include created_at timestamp in interaction record", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const now = new Date("2026-05-12T15:00:00Z");

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Diana Prince",
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 25,
              person_id: 3,
              notes: "Project discussion",
              interacted_at: now,
              created_at: now,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              name: "Diana Prince",
              relationship_type: "colleague",
              how_known: "work",
              notes: null,
              last_interaction_at: now,
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Diana Prince",
          notes: "Project discussion",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.interaction).toHaveProperty("created_at");
      });

      it("should store interaction notes in the record", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const notes = "Discussed Q2 roadmap and team expansion plans";

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              name: "Eve Wilson",
              relationship_type: "manager",
              how_known: "work",
              notes: "Direct report",
              last_interaction_at: new Date("2026-05-05T09:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 30,
              person_id: 4,
              notes,
              interacted_at: new Date("2026-05-12T16:00:00Z"),
              created_at: new Date("2026-05-12T16:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              name: "Eve Wilson",
              relationship_type: "manager",
              how_known: "work",
              notes: "Direct report",
              last_interaction_at: new Date("2026-05-12T16:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Eve Wilson",
          notes,
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.interaction.notes).toBe(notes);
      });
    });

    describe("Person last_interaction_at update", () => {
      it("should update person.last_interaction_at to current timestamp", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const updateTime = new Date("2026-05-12T17:00:00Z");

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              name: "Frank Castle",
              relationship_type: "friend",
              how_known: "gym",
              notes: "Workout buddy",
              last_interaction_at: new Date("2026-03-15T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 35,
              person_id: 6,
              notes: "Gym session",
              interacted_at: updateTime,
              created_at: updateTime,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              name: "Frank Castle",
              relationship_type: "friend",
              how_known: "gym",
              notes: "Workout buddy",
              last_interaction_at: updateTime,
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Frank Castle",
          notes: "Gym session",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person).toHaveProperty("last_interaction_at");
        expect(parsed.person.last_interaction_at).toBeDefined();
      });

      it("should update last_interaction_at even when person had no previous interaction", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const firstInteractionTime = new Date("2026-05-12T18:00:00Z");

        // Mock finding the person with no previous interaction
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              name: "Grace Hopper",
              relationship_type: "mentor",
              how_known: "conference",
              notes: null,
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 40,
              person_id: 8,
              notes: "First meeting",
              interacted_at: firstInteractionTime,
              created_at: firstInteractionTime,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              name: "Grace Hopper",
              relationship_type: "mentor",
              how_known: "conference",
              notes: null,
              last_interaction_at: firstInteractionTime,
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Grace Hopper",
          notes: "First meeting",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person.last_interaction_at).toBeDefined();
        expect(parsed.person.last_interaction_at).not.toBeNull();
      });

      it("should return updated person record after logging interaction", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              name: "Henry Ford",
              relationship_type: "business_contact",
              how_known: "networking",
              notes: "Potential investor",
              last_interaction_at: new Date("2026-02-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 45,
              person_id: 9,
              notes: "Pitch meeting",
              interacted_at: new Date("2026-05-12T19:00:00Z"),
              created_at: new Date("2026-05-12T19:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 9,
              name: "Henry Ford",
              relationship_type: "business_contact",
              how_known: "networking",
              notes: "Potential investor",
              last_interaction_at: new Date("2026-05-12T19:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Henry Ford",
          notes: "Pitch meeting",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("person");
        expect(parsed.person).toHaveProperty("id");
        expect(parsed.person).toHaveProperty("name");
        expect(parsed.person).toHaveProperty("relationship_type");
        expect(parsed.person).toHaveProperty("last_interaction_at");
      });
    });

    describe("Error handling", () => {
      it("should return error object on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock database error
        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          name: "Test Person",
          notes: "Some notes",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("log_interaction failed");
      });

      it("should return error on invalid JSON input", async () => {
        const input = "invalid json";

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should handle whitespace-only name as invalid", async () => {
        const input = JSON.stringify({
          name: "   ",
          notes: "Some notes",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });
    });

    describe("Response format", () => {
      it("should return JSON string response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              name: "Iris West",
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 50,
              person_id: 10,
              notes: "Coffee chat",
              interacted_at: new Date("2026-05-12T20:00:00Z"),
              created_at: new Date("2026-05-12T20:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              name: "Iris West",
              relationship_type: "friend",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-05-12T20:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Iris West",
          notes: "Coffee chat",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);

        expect(typeof result).toBe("string");
        expect(() => JSON.parse(result)).not.toThrow();
      });

      it("should include success flag in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 11,
              name: "Jack Ryan",
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 55,
              person_id: 11,
              notes: "Caught up",
              interacted_at: new Date("2026-05-12T21:00:00Z"),
              created_at: new Date("2026-05-12T21:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 11,
              name: "Jack Ryan",
              relationship_type: "friend",
              how_known: "college",
              notes: null,
              last_interaction_at: new Date("2026-05-12T21:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Jack Ryan",
          notes: "Caught up",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success");
        expect(typeof parsed.success).toBe("boolean");
      });

      it("should include message in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 12,
              name: "Karen Page",
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

        // Mock creating interaction record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 60,
              person_id: 12,
              notes: "Team meeting",
              interacted_at: new Date("2026-05-12T22:00:00Z"),
              created_at: new Date("2026-05-12T22:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock updating person's last_interaction_at
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 12,
              name: "Karen Page",
              relationship_type: "colleague",
              how_known: "work",
              notes: null,
              last_interaction_at: new Date("2026-05-12T22:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Karen Page",
          notes: "Team meeting",
        });

        const result = await peopleModule.executePeopleTool("log_interaction", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("message");
        expect(typeof parsed.message).toBe("string");
      });
    });
  });

  describe("get_person", () => {
    describe("Input validation", () => {
      it("should accept person name as input", async () => {
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed).toHaveProperty("person");
      });

      it("should return error when name is missing", async () => {
        const input = JSON.stringify({});

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("name");
      });

      it("should return error when name is empty string", async () => {
        const input = JSON.stringify({
          name: "",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error when name is not a string", async () => {
        const input = JSON.stringify({
          name: 123,
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });
    });

    describe("Life events inclusion", () => {
      it("should include life_events array in response", async () => {
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

        // Mock getting life events
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person).toHaveProperty("life_events");
        expect(Array.isArray(parsed.person.life_events)).toBe(true);
      });

      it("should return empty life_events array when person has no events", async () => {
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

        // Mock getting life events (empty)
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Bob Smith",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events).toEqual([]);
      });

      it("should include multiple life events in response", async () => {
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
              notes: "Close sister",
              last_interaction_at: null,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock getting multiple life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 3,
              event_type: "birthday",
              event_date: "1992-03-20",
              is_recurring: true,
              notes: "Carol's birthday",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
            {
              id: 2,
              person_id: 3,
              event_type: "anniversary",
              event_date: "2015-06-15",
              is_recurring: true,
              notes: "Carol's wedding anniversary",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
            {
              id: 3,
              person_id: 3,
              event_type: "promotion",
              event_date: "2026-05-10",
              is_recurring: false,
              notes: "Got promoted at work",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 3,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Carol Davis",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events).toHaveLength(3);
      });
    });

    describe("Life event fields", () => {
      it("should include event_type in life events", async () => {
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

        // Mock getting life events
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0]).toHaveProperty("event_type", "birthday");
      });

      it("should include event_date in life events", async () => {
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

        // Mock getting life events
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0]).toHaveProperty("event_date", "1990-05-15");
      });

      it("should include is_recurring in life events", async () => {
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

        // Mock getting life events with both recurring and non-recurring
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
              person_id: 1,
              event_type: "graduation",
              event_date: "2012-06-01",
              is_recurring: false,
              notes: "College graduation",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0]).toHaveProperty("is_recurring", true);
        expect(parsed.person.life_events[1]).toHaveProperty("is_recurring", false);
      });

      it("should include notes in life events", async () => {
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "birthday",
              event_date: "1990-05-15",
              is_recurring: true,
              notes: "Alice's birthday - loves chocolate cake",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0]).toHaveProperty(
          "notes",
          "Alice's birthday - loves chocolate cake",
        );
      });

      it("should handle life events with null notes", async () => {
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

        // Mock getting life events with null notes
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
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        // When notes is null, it should be undefined in the response
        expect(parsed.person.life_events[0].notes).toBeUndefined();
      });
    });

    describe("Database query efficiency", () => {
      it("should query life_events table using person_id", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 42,
              name: "Test Person",
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Test Person",
        });

        await peopleModule.executePeopleTool("get_person", input);

        // Verify that the second query (life events) uses person_id
        const secondCall = mockQuery.mock.calls[1];
        expect(secondCall[0]).toContain("WHERE person_id = $1");
        expect(secondCall[1]).toEqual([42]);
      });

      it("should order life events by event_date", async () => {
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        await peopleModule.executePeopleTool("get_person", input);

        // Verify that the second query orders by event_date
        const secondCall = mockQuery.mock.calls[1];
        expect(secondCall[0]).toContain("ORDER BY event_date");
      });
    });

    describe("Fuzzy name matching", () => {
      it("should find person using fuzzy matching with partial name", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person with fuzzy match
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 5,
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "alice",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person.name).toBe("Alice Johnson");
      });

      it("should return error when person not found", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding no person
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "NonexistentPerson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", false);
        expect(parsed).toHaveProperty("message");
        expect(parsed.message).toContain("No person found");
      });
    });

    describe("Error handling", () => {
      it("should return error when database query fails", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock database error
        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("get_person failed");
      });

      it("should return error when JSON parsing fails", async () => {
        const result = await peopleModule.executePeopleTool("get_person", "invalid json");
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
      });

      it("should return error when name exceeds max length", async () => {
        const longName = "a".repeat(256);
        const input = JSON.stringify({
          name: longName,
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("error");
        expect(parsed.error).toContain("exceeds maximum length");
      });
    });

    describe("Backward compatibility", () => {
      it("should maintain all existing person fields in response", async () => {
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
              last_interaction_at: new Date("2026-05-10T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        // Verify all existing person fields are still present
        expect(parsed.person).toHaveProperty("id");
        expect(parsed.person).toHaveProperty("name", "Alice Johnson");
        expect(parsed.person).toHaveProperty("relationship_type", "friend");
        expect(parsed.person).toHaveProperty("how_known", "college");
        expect(parsed.person).toHaveProperty("notes", "Loves hiking");
        expect(parsed.person).toHaveProperty("last_interaction_at");
      });

      it("should include life_events as new field without breaking existing fields", async () => {
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
              last_interaction_at: new Date("2026-05-10T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock getting life events
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        // Verify both old and new fields exist
        expect(parsed.person).toHaveProperty("id");
        expect(parsed.person).toHaveProperty("name");
        expect(parsed.person).toHaveProperty("relationship_type");
        expect(parsed.person).toHaveProperty("how_known");
        expect(parsed.person).toHaveProperty("notes");
        expect(parsed.person).toHaveProperty("last_interaction_at");
        expect(parsed.person).toHaveProperty("life_events");
      });
    });

    describe("Recurring event handling", () => {
      it("should preserve original event_date for recurring events", async () => {
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

        // Mock getting life events with recurring birthday
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        // Verify recurring event preserves original date
        expect(parsed.person.life_events[0].event_date).toBe("1990-05-15");
        expect(parsed.person.life_events[0].is_recurring).toBe(true);
      });

      it("should mark birthday events as recurring", async () => {
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

        // Mock getting life events
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
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0].event_type).toBe("birthday");
        expect(parsed.person.life_events[0].is_recurring).toBe(true);
      });

      it("should mark anniversary events as recurring", async () => {
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "anniversary",
              event_date: "2015-06-15",
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0].event_type).toBe("anniversary");
        expect(parsed.person.life_events[0].is_recurring).toBe(true);
      });

      it("should mark non-recurring events correctly", async () => {
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              event_type: "graduation",
              event_date: "2012-06-01",
              is_recurring: false,
              notes: "College graduation",
              created_at: new Date("2026-01-01T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.life_events[0].event_type).toBe("graduation");
        expect(parsed.person.life_events[0].is_recurring).toBe(false);
      });
    });

    describe("Response format", () => {
      it("should return success response with person object", async () => {
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
              last_interaction_at: new Date("2026-05-10T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed).toHaveProperty("success", true);
        expect(parsed.person).toHaveProperty("id");
        expect(parsed.person).toHaveProperty("name");
        expect(parsed.person).toHaveProperty("relationship_type");
        expect(parsed.person).toHaveProperty("how_known");
        expect(parsed.person).toHaveProperty("notes");
        expect(parsed.person).toHaveProperty("last_interaction_at");
        expect(parsed.person).toHaveProperty("life_events");
      });

      it("should convert timestamps to ISO strings", async () => {
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
              last_interaction_at: new Date("2026-05-10T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock getting life events
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(typeof parsed.person.last_interaction_at).toBe("string");
        expect(parsed.person.last_interaction_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(typeof parsed.person.life_events[0].created_at).toBe("string");
        expect(parsed.person.life_events[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it("should convert numeric IDs to strings", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding the person
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 42,
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

        // Mock getting life events
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 99,
              person_id: 42,
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
          name: "Alice Johnson",
        });

        const result = await peopleModule.executePeopleTool("get_person", input);
        const parsed = JSON.parse(result);

        expect(parsed.person.id).toBe("42");
        expect(typeof parsed.person.id).toBe("string");
        expect(parsed.person.life_events[0].id).toBe("99");
        expect(typeof parsed.person.life_events[0].id).toBe("string");
      });
    });
  });
});
