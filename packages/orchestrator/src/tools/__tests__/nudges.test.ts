/**
 * nudges.test.ts — Tests for nudges module functions
 *
 * Tests for create_nudge and dismiss_nudge functions that manage nudges
 * for reminding users about important life events and interactions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Nudges Tools", () => {
  let nudgesModule: typeof import("../nudges.js");

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
    nudgesModule = await import("../nudges.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create_nudge", () => {
    describe("Input validation", () => {
      it("should accept person_id, life_event_id, message, and trigger_at timestamp", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock creating nudge record
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.nudge).toBeDefined();
        expect(parsed.nudge.person_id).toBe(1);
        expect(parsed.nudge.life_event_id).toBe(1);
        expect(parsed.nudge.message).toBe("Remember Alice's birthday is coming up");
        expect(parsed.nudge.trigger_at).toBe("2026-05-20T09:00:00Z");
        expect(parsed.nudge.status).toBe("pending");
      });

      it("should return error for missing person_id", async () => {
        const input = JSON.stringify({
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
        expect(parsed.error).toContain("person_id");
      });

      it("should return error for missing message", async () => {
        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
        expect(parsed.error).toContain("message");
      });

      it("should return error for missing trigger_at", async () => {
        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
        expect(parsed.error).toContain("trigger_at");
      });

      it("should return error for empty message", async () => {
        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });

      it("should return error for invalid trigger_at format", async () => {
        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "not-a-date",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });

      it("should allow null life_event_id", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              person_id: 1,
              life_event_id: null,
              message: "General reminder",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: null,
          message: "General reminder",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.nudge.life_event_id).toBeNull();
      });
    });

    describe("Response format", () => {
      it("should return JSON response with success flag and nudge object", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(typeof result).toBe("string");
        expect(parsed.success).toBe(true);
        expect(parsed.nudge).toBeDefined();
        expect(parsed.message).toBeDefined();
      });

      it("should include nudge id as string in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 42,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.nudge.id).toBe("42");
        expect(typeof parsed.nudge.id).toBe("string");
      });

      it("should convert timestamps to ISO strings in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.nudge.trigger_at).toBe("2026-05-20T09:00:00.000Z");
        expect(parsed.nudge.created_at).toBe("2026-05-12T10:00:00.000Z");
      });

      it("should set status to pending for new nudges", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "pending",
              sent_at: null,
              dismissed_at: null,
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.nudge.status).toBe("pending");
      });
    });

    describe("Error handling", () => {
      it("should return error on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          person_id: 1,
          life_event_id: 1,
          message: "Remember Alice's birthday is coming up",
          trigger_at: "2026-05-20T09:00:00Z",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });

      it("should return error on invalid JSON input", async () => {
        const input = "not valid json";

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });
    });
  });

  describe("dismiss_nudge", () => {
    describe("Input validation", () => {
      it("should accept nudge_id and set status to dismissed with timestamp", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "dismissed",
              sent_at: null,
              dismissed_at: new Date("2026-05-12T10:30:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 1,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.nudge).toBeDefined();
        expect(parsed.nudge.status).toBe("dismissed");
        expect(parsed.nudge.dismissed_at).toBeDefined();
      });

      it("should return error for missing nudge_id", async () => {
        const input = JSON.stringify({
          operation: "dismiss_nudge",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
        expect(parsed.error).toContain("nudge_id");
      });

      it("should return error for invalid nudge_id type", async () => {
        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: "not-a-number",
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });
    });

    describe("Response format", () => {
      it("should return JSON response with success flag and updated nudge", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "dismissed",
              sent_at: null,
              dismissed_at: new Date("2026-05-12T10:30:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 1,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(typeof result).toBe("string");
        expect(parsed.success).toBe(true);
        expect(parsed.nudge).toBeDefined();
        expect(parsed.message).toBeDefined();
      });

      it("should convert dismissed_at timestamp to ISO string", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "dismissed",
              sent_at: null,
              dismissed_at: new Date("2026-05-12T10:30:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 1,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.nudge.dismissed_at).toBe("2026-05-12T10:30:00.000Z");
      });

      it("should include nudge id as string in response", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 42,
              person_id: 1,
              life_event_id: 1,
              message: "Remember Alice's birthday is coming up",
              trigger_at: new Date("2026-05-20T09:00:00Z"),
              status: "dismissed",
              sent_at: null,
              dismissed_at: new Date("2026-05-12T10:30:00Z"),
              created_at: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 42,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.nudge.id).toBe("42");
        expect(typeof parsed.nudge.id).toBe("string");
      });
    });

    describe("Error handling", () => {
      it("should return error on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 1,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });

      it("should return error on invalid JSON input", async () => {
        const input = "not valid json";

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });

      it("should return error when nudge not found", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const input = JSON.stringify({
          operation: "dismiss_nudge",
          nudge_id: 999,
        });

        const result = await nudgesModule.executeNudgesTool(input);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      });
    });
  });

  describe("executeNudgesTool", () => {
    it("should route to create_nudge when operation is not specified", async () => {
      const { pool } = await import("@lifeos/shared");
      const mockQuery = vi.mocked(pool.query) as any;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: 1,
            message: "Remember Alice's birthday is coming up",
            trigger_at: new Date("2026-05-20T09:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "INSERT",
        oid: 0,
        fields: [],
      });

      const input = JSON.stringify({
        person_id: 1,
        life_event_id: 1,
        message: "Remember Alice's birthday is coming up",
        trigger_at: "2026-05-20T09:00:00Z",
      });

      const result = await nudgesModule.executeNudgesTool(input);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.nudge).toBeDefined();
    });

    it("should route to dismiss_nudge when operation is dismiss_nudge", async () => {
      const { pool } = await import("@lifeos/shared");
      const mockQuery = vi.mocked(pool.query) as any;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: 1,
            message: "Remember Alice's birthday is coming up",
            trigger_at: new Date("2026-05-20T09:00:00Z"),
            status: "dismissed",
            sent_at: null,
            dismissed_at: new Date("2026-05-12T10:30:00Z"),
            created_at: new Date("2026-05-12T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      const input = JSON.stringify({
        operation: "dismiss_nudge",
        nudge_id: 1,
      });

      const result = await nudgesModule.executeNudgesTool(input);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.nudge.status).toBe("dismissed");
    });
  });
});
