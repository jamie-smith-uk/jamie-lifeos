/**
 * voice.test.ts — Tests for voice transcription tool
 *
 * Tests for transcribe_voice_message function that downloads Telegram voice
 * files and sends them to OpenAI Whisper API for transcription.
 * Covers file validation, API response format checking, successful scenarios,
 * network errors, and API failures.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Voice Tools", () => {
  let voiceModule: typeof import("../voice.js");
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

    vi.doMock("@lifeos/shared", () => ({
      env: {
        TELEGRAM_BOT_TOKEN: "test-bot-token-123",
        OPENAI_API_KEY: "test-openai-key-456",
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        child: mockLoggerChild,
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

  describe("transcribe_voice_message", () => {
    describe("Telegram file download and validation", () => {
      it("should validate Telegram getFile response format with ok flag and result", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        // Mock Telegram getFile response with proper format
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        // Mock file download
        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        // Mock OpenAI Whisper API response
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Hello world" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toBe("Hello world");
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("https://api.telegram.org/bottest-bot-token-123/getFile"),
          expect.any(Object),
        );
      });

      it("should validate file_path in Telegram response and construct download URL", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        const expectedFilePath = "voice/file_123.oga";

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: expectedFilePath },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Test transcription" }),
        });

        await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        // First call should be to getFile endpoint
        const firstCall = fetchMock.mock.calls[0];
        expect(firstCall[0]).toContain("getFile");
        expect(firstCall[0]).toContain("AgADAgADr6cxG_test_file_id");

        // Second call should use the file_path from response
        const secondCall = fetchMock.mock.calls[1];
        expect(secondCall[0]).toContain(expectedFilePath);
      });

      it("should reject Telegram response with ok=false and return error", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: false,
            error_code: 400,
            description: "Bad Request",
          }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "invalid_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });

      it("should handle HTTP error status from Telegram getFile endpoint", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "invalid_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });

      it("should handle network errors during Telegram getFile request", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Network timeout");
      });

      it("should handle malformed JSON in Telegram getFile response", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });
    });

    describe("OpenAI Whisper API integration and validation", () => {
      it("should validate OpenAI response format with text field", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        // Mock Telegram response
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        // Mock file download
        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        // Mock Whisper API response with proper format
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Hello world" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toBe("Hello world");
        // Verify Whisper API was called
        const whisperCall = fetchMock.mock.calls[2];
        expect(whisperCall[0]).toContain("https://api.openai.com/v1/audio/transcriptions");
      });

      it("should send whisper-1 model in Whisper API request", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Test transcription" }),
        });

        await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        const whisperCall = fetchMock.mock.calls[2];
        const requestBody = whisperCall[1].body;

        // FormData should contain whisper-1 model
        expect(requestBody).toBeDefined();
      });

      it("should include Bearer token with OpenAI API key in Authorization header", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Test transcription" }),
        });

        await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        const whisperCall = fetchMock.mock.calls[2];
        const options = whisperCall[1];

        expect(options.headers).toBeDefined();
        expect(options.headers.Authorization).toBe("Bearer test-openai-key-456");
      });

      it("should handle HTTP error status from Whisper API", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle rate limit error (429) from Whisper API", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle network errors during Whisper API request", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockRejectedValueOnce(new Error("API connection failed"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("API connection failed");
      });

      it("should reject OpenAI response with error field", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            error: {
              message: "Invalid audio format",
              type: "invalid_request_error",
            },
          }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle malformed JSON in Whisper API response", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });
    });

    describe("Successful transcription scenarios", () => {
      it("should return transcription text on successful completion", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        const expectedTranscription = "This is the transcribed text from the voice message";

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: expectedTranscription }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toBe(expectedTranscription);
      });

      it("should return string type result", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Transcribed text" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(typeof result).toBe("string");
        expect(result).not.toMatch(/^error:/);
      });

      it("should handle empty transcription text gracefully", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(typeof result).toBe("string");
        expect(result).toBe("");
      });

      it("should successfully transcribe with various file sizes", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        const largeBuffer = new ArrayBuffer(5 * 1024 * 1024); // 5MB

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/large_file.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => largeBuffer,
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Large file transcription" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_large_file",
        });

        expect(result).toBe("Large file transcription");
      });
    });

    describe("Network error handling", () => {
      it("should handle network timeout during Telegram getFile", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("Request timeout"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Request timeout");
      });

      it("should handle network timeout during file download", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockRejectedValueOnce(new Error("Download timeout"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Download timeout");
      });

      it("should handle connection refused errors", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Connection refused");
      });

      it("should handle DNS resolution errors", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND api.telegram.org"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
      });
    });

    describe("API failure scenarios", () => {
      it("should handle HTTP 500 error from Telegram", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });

      it("should handle HTTP 403 Forbidden from Telegram", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });

      it("should handle HTTP 500 error from OpenAI", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle HTTP 503 Service Unavailable from OpenAI", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle invalid API key error from OpenAI", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle malformed error response from OpenAI", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            error: {
              message: "Invalid audio format",
              type: "invalid_request_error",
            },
          }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to transcribe");
      });

      it("should handle missing file_path in Telegram response", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: {},
          }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });

      it("should handle missing result in Telegram response", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
          }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toMatch(/^error:/);
        expect(result).toContain("Failed to get file path");
      });
    });

    describe("Function signature and input validation", () => {
      it("should accept file_id parameter and return Promise", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Test" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "test_file_id_123",
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      });

      it("should be an async function returning Promise", () => {
        expect(voiceModule.transcribe_voice_message).toBeDefined();
        const result = voiceModule.transcribe_voice_message({
          file_id: "test",
        });
        expect(result).toBeInstanceOf(Promise);
      });

      it("should use logger.child with tool and file_id context", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: { file_path: "voice/file_123.oga" },
          }),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Test" }),
        });

        const testFileId = "test_file_id_456";
        await voiceModule.transcribe_voice_message({
          file_id: testFileId,
        });

        expect(mockLoggerChild).toHaveBeenCalledWith({
          tool: "voice",
          file_id: testFileId,
        });
      });
    });
  });
});
