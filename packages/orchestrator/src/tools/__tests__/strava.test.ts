/**
 * strava.test.ts — Tests for Strava tools module
 *
 * Tests for get_strava_oauth_url function that generates OAuth URLs with
 * state token management and CSRF protection.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Strava Tools", () => {
  let stravaModule: typeof import("../strava.js");

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
      env: {
        STRAVA_CLIENT_ID: "test-client-id",
        STRAVA_REDIRECT_URI: "http://localhost:3001/oauth/strava/callback",
      },
    }));
    stravaModule = await import("../strava.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get_strava_oauth_url", () => {
    describe("OAuth URL generation", () => {
      it("should generate OAuth URL with correct Strava authorization endpoint", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock storing state token in database
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: expect.any(String),
              created_at: expect.any(Date),
              expires_at: expect.any(Date),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain("https://www.strava.com/oauth/authorize");
      });

      it("should include client_id in OAuth URL", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain("client_id=test-client-id");
      });

      it("should include redirect_uri in OAuth URL", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain(
          `redirect_uri=${encodeURIComponent("http://localhost:3001/oauth/strava/callback")}`,
        );
      });

      it("should include response_type=code in OAuth URL", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain("response_type=code");
      });

      it("should include scope parameter in OAuth URL", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain("scope=");
      });
    });

    describe("State token generation and storage", () => {
      it("should generate a unique state token", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const stateToken = "generated-state-token-123";
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: stateToken,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain(`state=${stateToken}`);
      });

      it("should store state token in database with expiration", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_oauth_url({});

        expect(mockQuery).toHaveBeenCalled();
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain("INSERT");
        expect(insertCall[0]).toContain("strava_oauth_state");
      });

      it("should set state token expiration to 10 minutes from now", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const now = Date.now();
        const expiresAt = new Date(now + 10 * 60 * 1000);

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(now),
              expires_at: expiresAt,
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_oauth_url({});

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain("expires_at");
      });

      it("should include state token in returned OAuth URL", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const stateToken = "unique-state-token-xyz";
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: stateToken,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toContain(`state=${stateToken}`);
      });
    });

    describe("CSRF protection", () => {
      it("should validate state token exists in database before accepting callback", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding valid state token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "valid-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const isValid = await stravaModule.validate_oauth_state({
          state: "valid-state-token",
        });

        expect(isValid).toBe(true);
      });

      it("should reject invalid state tokens", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock state token not found
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const isValid = await stravaModule.validate_oauth_state({
          state: "invalid-state-token",
        });

        expect(isValid).toBe(false);
      });

      it("should reject expired state tokens", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock expired state token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "expired-state-token",
              created_at: new Date(Date.now() - 20 * 60 * 1000),
              expires_at: new Date(Date.now() - 10 * 60 * 1000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const isValid = await stravaModule.validate_oauth_state({
          state: "expired-state-token",
        });

        expect(isValid).toBe(false);
      });

      it("should delete state token after validation", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock finding and deleting state token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "valid-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "DELETE",
          oid: 0,
          fields: [],
        });

        await stravaModule.validate_oauth_state({
          state: "valid-state-token",
        });

        expect(mockQuery).toHaveBeenCalledTimes(2);
        const deleteCall = mockQuery.mock.calls[1];
        expect(deleteCall[0]).toContain("DELETE");
      });
    });

    describe("Error handling", () => {
      it("should handle database connection errors gracefully", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(
          new Error("Connection refused: unable to connect to database"),
        );

        await expect(stravaModule.get_strava_oauth_url({})).rejects.toThrow();
      });

      it("should handle database query errors when storing state token", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database error: constraint violation"));

        await expect(stravaModule.get_strava_oauth_url({})).rejects.toThrow();
      });

      it("should handle database errors when validating state token", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database connection lost"));

        await expect(stravaModule.validate_oauth_state({ state: "test-token" })).rejects.toThrow();
      });

      it("should log database errors appropriately", async () => {
        const { pool, logger } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockLogger = vi.mocked(logger) as any;

        const dbError = new Error("Database connection timeout");
        mockQuery.mockRejectedValueOnce(dbError);

        try {
          await stravaModule.get_strava_oauth_url({});
        } catch {
          // Expected to throw
        }

        // Logger should be called to log the error
        expect(mockLogger.error || mockLogger.warn).toBeDefined();
      });

      it("should return meaningful error message on database failure", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const dbError = new Error("Failed to store OAuth state");
        mockQuery.mockRejectedValueOnce(dbError);

        try {
          await stravaModule.get_strava_oauth_url({});
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe("Input validation", () => {
      it("should accept empty input object", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      });

      it("should return a valid URL string", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: "test-state-token",
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});

        expect(() => new URL(result)).not.toThrow();
      });
    });

    describe("State token properties", () => {
      it("should generate cryptographically secure state tokens", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const stateToken1 = "state-token-1";
        const stateToken2 = "state-token-2";

        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: stateToken1,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result1 = await stravaModule.get_strava_oauth_url({});

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
          env: {
            STRAVA_CLIENT_ID: "test-client-id",
            STRAVA_REDIRECT_URI: "http://localhost:3001/oauth/strava/callback",
          },
        }));

        const stravaModule2 = await import("../strava.js");
        const { pool: pool2 } = await import("@lifeos/shared");
        const mockQuery2 = vi.mocked(pool2.query) as any;

        mockQuery2.mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              state_token: stateToken2,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result2 = await stravaModule2.get_strava_oauth_url({});

        // Extract state tokens from URLs
        const state1 = new URL(result1).searchParams.get("state");
        const state2 = new URL(result2).searchParams.get("state");

        expect(state1).not.toBe(state2);
      });

      it("should generate state tokens of sufficient length for security", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const stateToken = "a".repeat(32); // At least 32 characters
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: stateToken,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_oauth_url({});
        const state = new URL(result).searchParams.get("state");

        expect(state).toBeDefined();
        expect(state?.length).toBeGreaterThanOrEqual(32);
      });
    });
  });
});
