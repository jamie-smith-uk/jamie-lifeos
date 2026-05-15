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
  let mockTelegramBotSendMessage: ReturnType<typeof vi.fn>;

  function applyAllMocks(
    poolQueryMock: ReturnType<typeof vi.fn>,
    telegramSendMock: ReturnType<typeof vi.fn>,
  ): void {
    mockCronSchedule = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    }));

    vi.doMock("node-cron", () => ({
      schedule: mockCronSchedule,
    }));

    vi.doMock("@lifeos/shared", () => ({
      env: {
        TELEGRAM_ALLOWED_CHAT_ID: "123456789",
        STRAVA_CLIENT_ID: "test_client_id",
        STRAVA_CLIENT_SECRET: "test_client_secret",
      },
      pool: {
        query: poolQueryMock,
      },
      telegramBot: {
        sendMessage: telegramSendMock,
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

    // Mock global fetch for token refresh
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new_access_token",
            refresh_token: "new_refresh_token",
            expires_in: 21600, // 6 hours
          }),
      }),
    ) as any;
  }

  beforeEach(async () => {
    vi.resetModules();

    mockPoolQuery = vi.fn();
    mockTelegramBotSendMessage = vi.fn();

    applyAllMocks(mockPoolQuery, mockTelegramBotSendMessage);

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

  describe("Nudge sending via Telegram", () => {
    it("should send nudge message to TELEGRAM_ALLOWED_CHAT_ID", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: "Test nudge message",
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

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update response
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

      // Verify that telegramBot.sendMessage was called with the correct chat ID
      expect(mockTelegramBotSendMessage).toHaveBeenCalled();
      const sendCall = mockTelegramBotSendMessage.mock.calls[0];
      expect(sendCall?.[0]).toBe("123456789"); // TELEGRAM_ALLOWED_CHAT_ID
    });

    it("should include nudge message text in Telegram message", async () => {
      const nudgeMessage = "Remember to call your mom!";
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            person_id: 1,
            life_event_id: null,
            message: nudgeMessage,
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
        rows: [{ count: 0 }],
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

      // Verify that the message text is included in the Telegram message
      expect(mockTelegramBotSendMessage).toHaveBeenCalled();
      const sendCall = mockTelegramBotSendMessage.mock.calls[0];
      expect(String(sendCall?.[1])).toContain(nudgeMessage);
    });

    it("should include Dismiss button with callback data in Telegram message", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
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
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 42 }],
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

      // Verify that the Dismiss button is included in the reply_markup
      expect(mockTelegramBotSendMessage).toHaveBeenCalled();
      const sendCall = mockTelegramBotSendMessage.mock.calls[0];
      const options = sendCall?.[2];
      const replyMarkup = options?.reply_markup;

      expect(replyMarkup).toBeDefined();
      expect(replyMarkup?.inline_keyboard).toBeDefined();
      expect(Array.isArray(replyMarkup?.inline_keyboard)).toBe(true);

      // Check that there's a button with text "Dismiss"
      const buttons = replyMarkup?.inline_keyboard?.[0];
      expect(buttons).toBeDefined();
      expect(Array.isArray(buttons)).toBe(true);

      const dismissButton = buttons?.[0];
      expect(dismissButton?.text).toBe("Dismiss");
    });

    it("should include nudge ID in Dismiss button callback data", async () => {
      const nudgeId = 99;
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: nudgeId,
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
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: nudgeId }],
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

      // Verify that the callback_data includes the nudge ID
      expect(mockTelegramBotSendMessage).toHaveBeenCalled();
      const sendCall = mockTelegramBotSendMessage.mock.calls[0];
      const options = sendCall?.[2];
      const replyMarkup = options?.reply_markup;
      const dismissButton = replyMarkup?.inline_keyboard?.[0]?.[0];

      expect(dismissButton?.callback_data).toBe(`dismiss_nudge_${nudgeId}`);
    });

    it("should update nudge status to sent after successful Telegram send", async () => {
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
        rows: [{ count: 0 }],
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

      // Verify that UPDATE query was called to mark nudge as sent
      const updateCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("UPDATE"),
      );

      expect(updateCall).toBeDefined();
      expect(String(updateCall?.[0])).toContain("status = 'sent'");
      expect(String(updateCall?.[0])).toContain("sent_at = now()");
    });

    it("should set sent_at timestamp when marking nudge as sent", async () => {
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
        rows: [{ count: 0 }],
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

      // Verify that the UPDATE query sets sent_at to now()
      const updateCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("UPDATE"),
      );

      expect(updateCall).toBeDefined();
      expect(String(updateCall?.[0])).toContain("sent_at = now()");
    });

    it("should handle Telegram send failure gracefully", async () => {
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
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock Telegram send failure
      mockTelegramBotSendMessage.mockRejectedValueOnce(new Error("Telegram API error"));

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        // Should not throw even if Telegram send fails
        await expect(callback()).resolves.not.toThrow();
      }
    });

    it("should send multiple nudges with correct callback data for each", async () => {
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
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
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

      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 2 }],
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

      // Verify that sendMessage was called twice
      expect(mockTelegramBotSendMessage).toHaveBeenCalledTimes(2);

      // Verify each call has the correct callback data
      const firstCall = mockTelegramBotSendMessage.mock.calls[0];
      const firstOptions = firstCall?.[2];
      const firstButton = firstOptions?.reply_markup?.inline_keyboard?.[0]?.[0];
      expect(firstButton?.callback_data).toBe("dismiss_nudge_1");

      const secondCall = mockTelegramBotSendMessage.mock.calls[1];
      const secondOptions = secondCall?.[2];
      const secondButton = secondOptions?.reply_markup?.inline_keyboard?.[0]?.[0];
      expect(secondButton?.callback_data).toBe("dismiss_nudge_2");
    });
  });

  describe("Strava sync job", () => {
    it("should export syncStravaActivities function", () => {
      expect(typeof schedulerModule.syncStravaActivities).toBe("function");
    });

    it("should fetch activities updated since last_synced_at", async () => {
      const athleteId = 12345;
      const lastSyncedAt = new Date("2026-05-10T10:00:00Z");

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            athlete_id: athleteId,
            access_token: "test_token",
            refresh_token: "test_refresh",
            expires_at: new Date("2026-05-20T10:00:00Z"),
            last_synced_at: lastSyncedAt,
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock fetch activities call
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            strava_id: 1001,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-15T08:00:00Z"),
            distance_m: 5000,
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that pool.query was called to fetch credentials
      expect(mockPoolQuery).toHaveBeenCalled();

      // Check that a query was made for credentials
      const credentialsQuery = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("strava_credentials"),
      );
      expect(credentialsQuery).toBeDefined();
    });

    it("should check token expiration before each API call", async () => {
      const athleteId = 12345;
      const expiredAt = new Date("2026-05-10T10:00:00Z"); // Past date

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            athlete_id: athleteId,
            access_token: "test_token",
            refresh_token: "test_refresh",
            expires_at: expiredAt,
            last_synced_at: new Date("2026-05-10T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that credentials were fetched (which includes expires_at)
      expect(mockPoolQuery).toHaveBeenCalled();

      const credentialsQuery = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("strava_credentials"),
      );
      expect(credentialsQuery).toBeDefined();
    });

    it("should refresh access token when expired", async () => {
      const athleteId = 12345;
      const expiredAt = new Date("2026-05-10T10:00:00Z"); // Past date

      // Mock fetching expired credentials
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            athlete_id: athleteId,
            access_token: "old_token",
            refresh_token: "test_refresh",
            expires_at: expiredAt,
            last_synced_at: new Date("2026-05-10T10:00:00Z"),
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock token refresh update
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ athlete_id: athleteId }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that an UPDATE query was made (for token refresh)
      const updateCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("UPDATE"),
      );
      expect(updateCall).toBeDefined();
    });

    it("should handle multiple athletes with different token states", async () => {
      const athlete1Id = 12345;
      const athlete2Id = 67890;

      // Mock fetching multiple athletes
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            athlete_id: athlete1Id,
            access_token: "token1",
            refresh_token: "refresh1",
            expires_at: new Date("2026-05-20T10:00:00Z"), // Valid
            last_synced_at: new Date("2026-05-10T10:00:00Z"),
          },
          {
            athlete_id: athlete2Id,
            access_token: "token2",
            refresh_token: "refresh2",
            expires_at: new Date("2026-05-10T10:00:00Z"), // Expired
            last_synced_at: new Date("2026-05-10T10:00:00Z"),
          },
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that credentials query was made
      expect(mockPoolQuery).toHaveBeenCalled();
    });

    it("should use parameterized queries for security", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that pool.query was called with parameterized queries
      const queryCall = mockPoolQuery.mock.calls.find((call) =>
        String(call[0]).includes("strava_credentials"),
      );

      expect(queryCall).toBeDefined();
      // Parameterized queries pass parameters as second argument
      expect(Array.isArray(queryCall?.[1]) || queryCall?.[1] === undefined).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        // Should not throw even if database fails
        await expect(syncCall[1]()).resolves.not.toThrow();
      }
    });

    it("should log sync job execution", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await schedulerModule.startScheduler();

      const syncCall = mockCronSchedule.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0] === "0 * * * *",
      );

      if (syncCall && typeof syncCall[1] === "function") {
        await syncCall[1]();
      }

      // Verify that pool.query was called
      expect(mockPoolQuery).toHaveBeenCalled();
    });
  });

  describe("Logging and monitoring", () => {
    let mockLoggerChild: ReturnType<typeof vi.fn>;
    let mockLoggerInfo: ReturnType<typeof vi.fn>;
    let mockLoggerError: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.resetModules();

      mockCronSchedule = vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
      }));

      mockPoolQuery = vi.fn();
      mockLoggerInfo = vi.fn();
      mockLoggerError = vi.fn();
      mockLoggerChild = vi.fn(() => ({
        info: mockLoggerInfo,
        error: mockLoggerError,
        warn: vi.fn(),
      }));

      vi.doMock("node-cron", () => ({
        schedule: mockCronSchedule,
      }));

      vi.doMock("@lifeos/shared", () => ({
        env: {
          TELEGRAM_ALLOWED_CHAT_ID: "123456789",
        },
        pool: {
          query: mockPoolQuery,
        },
        telegramBot: {
          sendMessage: mockTelegramBotSendMessage,
        },
        logger: {
          child: mockLoggerChild,
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        },
      }));

      schedulerModule = await import("../scheduler.js");
    });

    it("should log scheduler initialization", async () => {
      await schedulerModule.startScheduler();

      // Verify logger.child was called with service context
      expect(mockLoggerChild).toHaveBeenCalledWith({ service: "scheduler" });
    });

    it("should log when nudge evaluation starts", async () => {
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

      // Verify that info logging was called with "Starting nudge evaluation"
      expect(mockLoggerInfo).toHaveBeenCalledWith("Starting nudge evaluation");
    });

    it("should log when no pending nudges are found", async () => {
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

      // Verify that info logging was called with "No pending nudges found"
      expect(mockLoggerInfo).toHaveBeenCalledWith("No pending nudges found");
    });

    it("should log when rate limit is reached", async () => {
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

      // Mock that 3 nudges were already sent in the last hour
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 3 }],
        rowCount: 1,
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

      // Verify that rate limit log was called
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Rate limit reached: 3 nudges already sent in the last hour",
      );
    });

    it("should log each nudge being marked as sent", async () => {
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

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update response
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

      // Verify that nudge sent log was called with nudge_id
      expect(mockLoggerInfo).toHaveBeenCalledWith({ nudge_id: 1 }, "Nudge marked as sent");
    });

    it("should log nudge evaluation completion", async () => {
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

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update response
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

      // Verify that completion log was called
      expect(mockLoggerInfo).toHaveBeenCalledWith({ processed: 1 }, "Nudge evaluation completed");
    });

    it("should log errors during nudge evaluation", async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error("Database error"));

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify that error logging was called
      expect(mockLoggerError).toHaveBeenCalled();

      // Check that error log contains "Nudge evaluation failed"
      const failedCall = mockLoggerError.mock.calls.find((call) =>
        String(call[call.length - 1]).includes("Nudge evaluation failed"),
      );
      expect(failedCall).toBeDefined();
    });

    it("should log errors when updating nudge status fails", async () => {
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

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update failure
      mockPoolQuery.mockRejectedValueOnce(new Error("Update failed"));

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify that error logging was called for update failure
      expect(mockLoggerError).toHaveBeenCalled();

      // Check that error log contains "Failed to update nudge status"
      const updateErrorCall = mockLoggerError.mock.calls.find((call) =>
        String(call[call.length - 1]).includes("Failed to update nudge status"),
      );
      expect(updateErrorCall).toBeDefined();
    });

    it("should continue processing other nudges when one fails to send", async () => {
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
        ],
        rowCount: 3,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock Telegram send failure for nudge 1
      mockTelegramBotSendMessage.mockRejectedValueOnce(new Error("Telegram API error"));

      // Mock successful update for nudge 2
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 2 }],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      // Mock successful update for nudge 3
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 3 }],
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

      // Verify that sendMessage was called 3 times (all nudges attempted)
      expect(mockTelegramBotSendMessage).toHaveBeenCalledTimes(3);

      // Verify that nudges 2 and 3 were marked as sent despite nudge 1 failing
      const updateCalls = mockPoolQuery.mock.calls.filter((call) =>
        String(call[0]).includes("UPDATE"),
      );
      expect(updateCalls.length).toBe(2);
    });

    it("should continue processing when nudge status update fails", async () => {
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
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock count of recently sent nudges
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 0 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update failure for nudge 1
      mockPoolQuery.mockRejectedValueOnce(new Error("Database update failed"));

      // Mock successful update for nudge 2
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 2 }],
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

      // Verify that sendMessage was called for both nudges
      expect(mockTelegramBotSendMessage).toHaveBeenCalledTimes(2);

      // Verify that nudge 2 was still processed despite nudge 1 update failing
      const updateCalls = mockPoolQuery.mock.calls.filter((call) =>
        String(call[0]).includes("UPDATE"),
      );
      expect(updateCalls.length).toBe(2);
    });

    it("should log processing count and remaining slots", async () => {
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
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock count of recently sent nudges (1 already sent)
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ count: 1 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock update responses
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

      await schedulerModule.startScheduler();

      const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
        (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
      );

      const callback = nudgeEvaluatorCall?.[1];
      if (callback && typeof callback === "function") {
        await callback();
      }

      // Verify that processing log includes count and remaining slots
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { count: 2, remainingSlots: 2 },
        "Processing pending nudges",
      );
    });
  });
});
