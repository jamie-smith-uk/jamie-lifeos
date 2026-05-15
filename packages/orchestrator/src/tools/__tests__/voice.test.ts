/**
 * voice.test.ts — Tests for voice transcription tool
 *
 * Tests for transcribe_voice_message function that downloads Telegram voice
 * files and sends them to OpenAI Whisper API for transcription.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Voice Tools", () => {
  let voiceModule: typeof import("../voice.js");

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock("@lifeos/shared", () => ({
      env: {
        TELEGRAM_BOT_TOKEN: "test-bot-token-123",
        OPENAI_API_KEY: "test-openai-key-456",
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        child: vi.fn(() => ({
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        })),
      },
    }));
    voiceModule = await import("../voice.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("transcribe_voice_message", () => {
    describe("Telegram file download", () => {
      it("should download Telegram voice file using bot token", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        // Mock Telegram file download response
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

        // Verify Telegram download was called with correct URL
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("https://api.telegram.org/bottest-bot-token-123/getFile"),
          expect.any(Object),
        );

        expect(result).toBeDefined();
      });

      it("should construct correct Telegram file download URL with file_id", async () => {
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

        // First call should be to getFile endpoint
        const firstCall = fetchMock.mock.calls[0];
        expect(firstCall[0]).toContain("getFile");
        expect(firstCall[0]).toContain("AgADAgADr6cxG_test_file_id");
      });

      it("should handle Telegram file download errors gracefully", async () => {
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

        expect(result).toContain("error") || expect(result).toContain("Error");
      });

      it("should handle network errors during file download", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toContain("error") || expect(result).toContain("Error");
      });
    });

    describe("OpenAI Whisper API integration", () => {
      it("should send audio file to OpenAI Whisper API with whisper-1 model", async () => {
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

        // Mock Whisper API response
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: "Hello world" }),
        });

        await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        // Verify Whisper API was called
        const whisperCall = fetchMock.mock.calls[2];
        expect(whisperCall[0]).toContain("https://api.openai.com/v1/audio/transcriptions");
      });

      it("should use whisper-1 model in Whisper API request", async () => {
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
        const requestBody = whisperCall[1];

        // Check that the request includes the whisper-1 model
        expect(requestBody).toBeDefined();
        // The model should be in the FormData or request body
        expect(JSON.stringify(requestBody)).toContain("whisper-1") ||
          expect(requestBody.toString()).toContain("whisper-1");
      });

      it("should include OpenAI API key in Whisper API request headers", async () => {
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
        expect(options.headers.Authorization).toContain("Bearer test-openai-key-456");
      });

      it("should handle Whisper API errors gracefully", async () => {
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

        expect(result).toContain("error") || expect(result).toContain("Error");
      });

      it("should handle Whisper API network errors", async () => {
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

        expect(result).toContain("error") || expect(result).toContain("Error");
      });
    });

    describe("Transcription result handling", () => {
      it("should return transcription text on success", async () => {
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

        expect(result).toContain(expectedTranscription);
      });

      it("should return string result", async () => {
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
      });

      it("should handle empty transcription response", async () => {
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
      });
    });

    describe("Error handling and resilience", () => {
      it("should handle malformed Telegram response", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: false, error_code: 400 }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toContain("error") || expect(result).toContain("Error");
      });

      it("should handle malformed OpenAI response", async () => {
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
          json: async () => ({ error: "Invalid request" }),
        });

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(typeof result).toBe("string");
      });

      it("should handle JSON parsing errors gracefully", async () => {
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

        expect(result).toContain("error") || expect(result).toContain("Error");
      });

      it("should handle timeout errors", async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;

        fetchMock.mockRejectedValueOnce(new Error("Request timeout"));

        const result = await voiceModule.transcribe_voice_message({
          file_id: "AgADAgADr6cxG_test_file_id",
        });

        expect(result).toContain("error") || expect(result).toContain("Error");
      });

      it("should handle rate limit errors from OpenAI", async () => {
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

        expect(result).toContain("error") || expect(result).toContain("Error");
      });
    });

    describe("Function signature and input validation", () => {
      it("should accept file_id parameter", async () => {
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
      });

      it("should be an async function", async () => {
        expect(voiceModule.transcribe_voice_message).toBeDefined();
        const result = voiceModule.transcribe_voice_message({
          file_id: "test",
        });
        expect(result).toBeInstanceOf(Promise);
      });
    });
  });
});
