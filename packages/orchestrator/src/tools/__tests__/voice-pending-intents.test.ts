/**
 * voice-pending-intents.test.ts — Tests for pending voice intent database operations
 *
 * Tests for create_pending_voice_intent and consume_pending_voice_intent functions
 * that manage voice transcription confirmations with TTL expiration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Pending Voice Intents", () => {
  let voiceModule: typeof import("../voice.js");
  let mockPoolQuery: ReturnType<typeof vi.fn>;
  let mockChildLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let mockLoggerChild: ReturnType<typeof vi.fn>;

  function setupMocks(): void {
    mockChildLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
    mockLoggerChild = vi.fn(() => mockChildLogger);
    mockPoolQuery = vi.fn();

    vi.doMock("@lifeos/shared", () => ({
      env: {
        TELEGRAM_BOT_TOKEN: "test-token",
        OPENAI_API_KEY: "test-key",
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        child: mockLoggerChild,
      },
      pool: {
        query: mockPoolQuery,
      },
    }));
  }

  beforeEach(async () => {
    vi.resetModules();
    setupMocks();
    voiceModule = await import("../voice.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create_pending_voice_intent", () => {
    it("should write to pending_voice_intents table with required fields", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Hello world",
            telegram_file_id: "file_123",
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            created_at: new Date(),
          },
        ],
      });

      const result = await voiceModule.create_pending_voice_intent({
        chat_id: 12345,
        transcription: "Hello world",
        telegram_file_id: "file_123",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.chat_id).toBe(12345);
      expect(result.transcription).toBe("Hello world");
      expect(result.telegram_file_id).toBe("file_123");
    });

    it("should set expires_at to 5 minutes from creation time", async () => {
      const beforeTime = Date.now();
      const expectedExpireTime = beforeTime + 5 * 60 * 1000;

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Test",
            telegram_file_id: "file_123",
            expires_at: new Date(expectedExpireTime),
            created_at: new Date(beforeTime),
          },
        ],
      });

      const result = await voiceModule.create_pending_voice_intent({
        chat_id: 12345,
        transcription: "Test",
        telegram_file_id: "file_123",
      });

      const expiresAtTime = result.expires_at.getTime();
      const createdAtTime = result.created_at.getTime();
      const diffMs = expiresAtTime - createdAtTime;

      // Should be approximately 5 minutes (300000 ms)
      expect(diffMs).toBeGreaterThanOrEqual(5 * 60 * 1000 - 1000); // Allow 1 second tolerance
      expect(diffMs).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
    });

    it("should execute INSERT query with correct SQL", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Hello",
            telegram_file_id: "file_123",
            expires_at: new Date(),
            created_at: new Date(),
          },
        ],
      });

      await voiceModule.create_pending_voice_intent({
        chat_id: 12345,
        transcription: "Hello",
        telegram_file_id: "file_123",
      });

      expect(mockPoolQuery).toHaveBeenCalled();
      const callArgs = mockPoolQuery.mock.calls[0];
      const sql = callArgs[0];

      // Should contain INSERT statement
      expect(sql).toMatch(/INSERT/i);
      expect(sql).toMatch(/pending_voice_intents/i);
      expect(sql).toMatch(/chat_id/i);
      expect(sql).toMatch(/transcription/i);
      expect(sql).toMatch(/telegram_file_id/i);
      expect(sql).toMatch(/expires_at/i);
    });

    it("should use parameterized query to prevent SQL injection", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Test",
            telegram_file_id: "file_123",
            expires_at: new Date(),
            created_at: new Date(),
          },
        ],
      });

      await voiceModule.create_pending_voice_intent({
        chat_id: 12345,
        transcription: "Test'; DROP TABLE pending_voice_intents; --",
        telegram_file_id: "file_123",
      });

      expect(mockPoolQuery).toHaveBeenCalled();
      const callArgs = mockPoolQuery.mock.calls[0];

      // Should have parameters array (second argument)
      expect(callArgs.length).toBeGreaterThan(1);
      expect(Array.isArray(callArgs[1])).toBe(true);
    });

    it("should return object with id, chat_id, transcription, telegram_file_id, expires_at, created_at", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            chat_id: 99999,
            transcription: "Test transcription",
            telegram_file_id: "AgADAgADr6cxG_test",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const result = await voiceModule.create_pending_voice_intent({
        chat_id: 99999,
        transcription: "Test transcription",
        telegram_file_id: "AgADAgADr6cxG_test",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("chat_id");
      expect(result).toHaveProperty("transcription");
      expect(result).toHaveProperty("telegram_file_id");
      expect(result).toHaveProperty("expires_at");
      expect(result).toHaveProperty("created_at");
    });

    it("should handle database errors gracefully", async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(
        voiceModule.create_pending_voice_intent({
          chat_id: 12345,
          transcription: "Test",
          telegram_file_id: "file_123",
        }),
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle constraint violations", async () => {
      mockPoolQuery.mockRejectedValueOnce(
        new Error("duplicate key value violates unique constraint"),
      );

      await expect(
        voiceModule.create_pending_voice_intent({
          chat_id: 12345,
          transcription: "Test",
          telegram_file_id: "file_123",
        }),
      ).rejects.toThrow();
    });

    it("should accept various chat_id values", async () => {
      const testChatIds = [1, 12345, 999999999, -1];

      for (const chatId of testChatIds) {
        mockPoolQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              chat_id: chatId,
              transcription: "Test",
              telegram_file_id: "file_123",
              expires_at: new Date(),
              created_at: new Date(),
            },
          ],
        });

        const result = await voiceModule.create_pending_voice_intent({
          chat_id: chatId,
          transcription: "Test",
          telegram_file_id: "file_123",
        });

        expect(result.chat_id).toBe(chatId);
      }
    });

    it("should accept various transcription lengths", async () => {
      const testTranscriptions = [
        "a",
        "Hello world",
        "This is a longer transcription with multiple words and punctuation!",
        "x".repeat(1000), // 1000 character transcription
      ];

      for (const transcription of testTranscriptions) {
        mockPoolQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              chat_id: 12345,
              transcription,
              telegram_file_id: "file_123",
              expires_at: new Date(),
              created_at: new Date(),
            },
          ],
        });

        const result = await voiceModule.create_pending_voice_intent({
          chat_id: 12345,
          transcription,
          telegram_file_id: "file_123",
        });

        expect(result.transcription).toBe(transcription);
      }
    });
  });

  describe("consume_pending_voice_intent", () => {
    it("should read and delete intent by ID", async () => {
      const intentData = {
        id: 1,
        chat_id: 12345,
        transcription: "Hello world",
        telegram_file_id: "file_123",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        created_at: new Date(),
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [intentData],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(result).toEqual(intentData);
      expect(mockPoolQuery).toHaveBeenCalled();
    });

    it("should return null if intent is expired", async () => {
      const expiredTime = new Date(Date.now() - 1000); // 1 second in the past

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Hello world",
            telegram_file_id: "file_123",
            expires_at: expiredTime,
            created_at: new Date(Date.now() - 10 * 60 * 1000),
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(result).toBeNull();
    });

    it("should return null if intent does not exist", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 999,
      });

      expect(result).toBeNull();
    });

    it("should delete the intent from database after reading", async () => {
      const intentData = {
        id: 1,
        chat_id: 12345,
        transcription: "Hello world",
        telegram_file_id: "file_123",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        created_at: new Date(),
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [intentData],
      });

      await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(mockPoolQuery).toHaveBeenCalled();
      const callArgs = mockPoolQuery.mock.calls[0];
      const sql = callArgs[0];

      // Should contain DELETE statement
      expect(sql).toMatch(/DELETE/i);
      expect(sql).toMatch(/pending_voice_intents/i);
    });

    it("should use parameterized query to prevent SQL injection", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      });

      await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(mockPoolQuery).toHaveBeenCalled();
      const callArgs = mockPoolQuery.mock.calls[0];

      // Should have parameters array
      expect(callArgs.length).toBeGreaterThan(1);
      expect(Array.isArray(callArgs[1])).toBe(true);
    });

    it("should return intent object with all fields when not expired", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            chat_id: 99999,
            transcription: "Test transcription",
            telegram_file_id: "AgADAgADr6cxG_test",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 42,
      });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("id", 42);
      expect(result).toHaveProperty("chat_id", 99999);
      expect(result).toHaveProperty("transcription", "Test transcription");
      expect(result).toHaveProperty("telegram_file_id", "AgADAgADr6cxG_test");
      expect(result).toHaveProperty("expires_at");
      expect(result).toHaveProperty("created_at");
    });

    it("should check expiration at consumption time, not creation time", async () => {
      // Intent created 4 minutes ago, expires in 1 minute
      const createdAt = new Date(Date.now() - 4 * 60 * 1000);
      const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Test",
            telegram_file_id: "file_123",
            expires_at: expiresAt,
            created_at: createdAt,
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      // Should not be null because expires_at is in the future
      expect(result).not.toBeNull();
    });

    it("should return null when expires_at equals current time", async () => {
      const now = new Date();

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Test",
            telegram_file_id: "file_123",
            expires_at: now,
            created_at: new Date(now.getTime() - 5 * 60 * 1000),
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      // Should be null because expires_at is not in the future
      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(
        voiceModule.consume_pending_voice_intent({
          id: 1,
        }),
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle various ID values", async () => {
      const testIds = [1, 100, 999999];

      for (const id of testIds) {
        mockPoolQuery.mockResolvedValueOnce({
          rows: [],
        });

        await voiceModule.consume_pending_voice_intent({
          id,
        });

        expect(mockPoolQuery).toHaveBeenCalled();
      }
    });

    it("should execute query with correct WHERE clause for ID", async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      });

      await voiceModule.consume_pending_voice_intent({
        id: 42,
      });

      expect(mockPoolQuery).toHaveBeenCalled();
      const callArgs = mockPoolQuery.mock.calls[0];
      const sql = callArgs[0];
      const params = callArgs[1];

      // Should have WHERE clause for ID
      expect(sql).toMatch(/WHERE/i);
      expect(sql).toMatch(/id/i);

      // ID should be in parameters
      expect(params).toContain(42);
    });

    it("should return null for very old expired intents", async () => {
      const veryOldExpireTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Old intent",
            telegram_file_id: "file_123",
            expires_at: veryOldExpireTime,
            created_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(result).toBeNull();
    });

    it("should return intent just before expiration", async () => {
      const almostExpiredTime = new Date(Date.now() + 100); // 100ms in the future

      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Almost expired",
            telegram_file_id: "file_123",
            expires_at: almostExpiredTime,
            created_at: new Date(Date.now() - 5 * 60 * 1000),
          },
        ],
      });

      const result = await voiceModule.consume_pending_voice_intent({
        id: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.transcription).toBe("Almost expired");
    });
  });

  describe("Integration scenarios", () => {
    it("should create and then consume a pending intent", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      // Mock create
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Hello world",
            telegram_file_id: "file_123",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const created = await voiceModule.create_pending_voice_intent({
        chat_id: 12345,
        transcription: "Hello world",
        telegram_file_id: "file_123",
      });

      expect(created.id).toBe(1);

      // Mock consume
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 12345,
            transcription: "Hello world",
            telegram_file_id: "file_123",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const consumed = await voiceModule.consume_pending_voice_intent({
        id: created.id,
      });

      expect(consumed).not.toBeNull();
      expect(consumed?.transcription).toBe("Hello world");
    });

    it("should handle multiple pending intents for different chats", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      // Create intent for chat 1
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            chat_id: 111,
            transcription: "Chat 1 message",
            telegram_file_id: "file_1",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const intent1 = await voiceModule.create_pending_voice_intent({
        chat_id: 111,
        transcription: "Chat 1 message",
        telegram_file_id: "file_1",
      });

      // Create intent for chat 2
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            chat_id: 222,
            transcription: "Chat 2 message",
            telegram_file_id: "file_2",
            expires_at: expiresAt,
            created_at: now,
          },
        ],
      });

      const intent2 = await voiceModule.create_pending_voice_intent({
        chat_id: 222,
        transcription: "Chat 2 message",
        telegram_file_id: "file_2",
      });

      expect(intent1.chat_id).toBe(111);
      expect(intent2.chat_id).toBe(222);
      expect(intent1.id).not.toBe(intent2.id);
    });
  });
});
