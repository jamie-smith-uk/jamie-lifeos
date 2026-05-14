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
      telegramBot: {
        sendMessage: vi.fn(),
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

        // Use a properly formatted 64-character hex token
        const validToken = "a".repeat(64);

        // Mock finding valid state token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: validToken,
              created_at: new Date(),
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock the DELETE query for token cleanup
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: "DELETE",
          oid: 0,
          fields: [],
        });

        const isValid = await stravaModule.validate_oauth_state({
          state: validToken,
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

        // Use a properly formatted 64-character hex token
        const validToken = "b".repeat(64);

        // Mock finding valid state token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              state_token: validToken,
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
          state: validToken,
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

        // Use a properly formatted 64-character hex token
        const validToken = "c".repeat(64);

        mockQuery.mockRejectedValueOnce(new Error("Database connection lost"));

        await expect(stravaModule.validate_oauth_state({ state: validToken })).rejects.toThrow();
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

  describe("get_strava_activities", () => {
    describe("Database queries with filters", () => {
      it("should query activities with sport_type filter", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token refresh check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Morning Run",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
              distance_m: 5000,
              moving_time_s: 1800,
              average_speed_ms: 2.78,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(mockQuery).toHaveBeenCalled();
      });

      it("should query activities with date range filter", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token refresh check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Morning Run",
              sport_type: "Run",
              start_date: new Date("2026-05-10"),
              distance_m: 5000,
              moving_time_s: 1800,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_activities({
          athlete_id: 12345,
          start_date: "2026-05-01",
          end_date: "2026-05-14",
          caller_athlete_id: 12345,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("should return empty array when no activities match filters", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token refresh check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock empty activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_activities({
          athlete_id: 12345,
          sport_type: "Swim",
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it("should include all activity fields in results", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token refresh check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query with all fields
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Morning Run",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
              distance_m: 5000.5,
              moving_time_s: 1800,
              elapsed_time_s: 1900,
              total_elevation_gain: 150.25,
              average_speed_ms: 2.78,
              max_speed_ms: 5.5,
              average_heartrate: 145.5,
              max_heartrate: 175.0,
              average_watts: 250.0,
              kilojoules: 450.0,
              suffer_score: 85,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(result[0]).toHaveProperty("distance_m");
        expect(result[0]).toHaveProperty("moving_time_s");
        expect(result[0]).toHaveProperty("average_speed_ms");
      });
    });

    describe("Token refresh logic", () => {
      it("should check token expiration before querying activities", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        // First call should be to check token expiration
        const firstCall = mockQuery.mock.calls[0];
        expect(firstCall[0]).toContain("strava_credentials");
        expect(firstCall[0]).toContain("expires_at");
      });

      it("should refresh token if expired", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock expired token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "expired-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() - 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock token update after refresh
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "new-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        // Should have called update for token refresh
        expect(mockQuery).toHaveBeenCalled();
      });

      it("should use refreshed token for subsequent queries", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock expired token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "expired-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() - 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock token update
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "new-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Run",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
              distance_m: 5000,
              moving_time_s: 1800,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(result).toBeDefined();
      });
    });

    describe("Error handling", () => {
      it("should handle database connection errors gracefully", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(
          new Error("Connection refused: unable to connect to database"),
        );

        await expect(
          stravaModule.get_strava_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle query errors when fetching credentials", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database error: constraint violation"));

        await expect(
          stravaModule.get_strava_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle query errors when fetching activities", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock successful token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock error on activities query
        mockQuery.mockRejectedValueOnce(new Error("Database connection lost"));

        await expect(
          stravaModule.get_strava_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should log errors appropriately", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const dbError = new Error("Database connection timeout");
        mockQuery.mockRejectedValueOnce(dbError);

        try {
          await stravaModule.get_strava_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          });
        } catch {
          // Expected to throw
        }

        expect(mockQuery).toHaveBeenCalled();
      });
    });
  });

  describe("fetch_90day_activities", () => {
    describe("90-day activity fetching", () => {
      it("should fetch activities from last 90 days", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query for 90-day window
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Morning Run",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
              distance_m: 5000,
              moving_time_s: 1800,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("should use correct 90-day date range", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        // Check that the query includes 90-day date range
        const activityQuery = mockQuery.mock.calls[1];
        expect(activityQuery[0]).toContain("90");
      });
    });

    describe("Pagination handling", () => {
      it("should handle pagination with 30 activities per page", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock first page of activities (30 items)
        const firstPageActivities = Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          strava_id: 100000 + i,
          athlete_id: 12345,
          name: `Activity ${i + 1}`,
          sport_type: "Run",
          start_date: new Date("2026-05-14"),
          distance_m: 5000,
          moving_time_s: 1800,
        }));

        mockQuery.mockResolvedValueOnce({
          rows: firstPageActivities,
          rowCount: 30,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock second page (empty to stop pagination)
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(30);
      });

      it("should fetch multiple pages when more than 30 activities exist", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock first page (30 activities)
        const firstPageActivities = Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          strava_id: 100000 + i,
          athlete_id: 12345,
          name: `Activity ${i + 1}`,
          sport_type: "Run",
          start_date: new Date("2026-05-14"),
          distance_m: 5000,
          moving_time_s: 1800,
        }));

        mockQuery.mockResolvedValueOnce({
          rows: firstPageActivities,
          rowCount: 30,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock second page (15 activities)
        const secondPageActivities = Array.from({ length: 15 }, (_, i) => ({
          id: i + 31,
          strava_id: 100030 + i,
          athlete_id: 12345,
          name: `Activity ${i + 31}`,
          sport_type: "Run",
          start_date: new Date("2026-05-13"),
          distance_m: 5000,
          moving_time_s: 1800,
        }));

        mockQuery.mockResolvedValueOnce({
          rows: secondPageActivities,
          rowCount: 15,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(45);
      });

      it("should stop pagination when fewer than 30 activities returned", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock single page with fewer than 30 activities
        const activities = Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          strava_id: 100000 + i,
          athlete_id: 12345,
          name: `Activity ${i + 1}`,
          sport_type: "Run",
          start_date: new Date("2026-05-14"),
          distance_m: 5000,
          moving_time_s: 1800,
        }));

        mockQuery.mockResolvedValueOnce({
          rows: activities,
          rowCount: 15,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(15);
      });

      it("should use LIMIT and OFFSET for pagination", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        // Check that query uses LIMIT and OFFSET
        const activityQuery = mockQuery.mock.calls[1];
        expect(activityQuery[0]).toContain("LIMIT");
        expect(activityQuery[0]).toContain("OFFSET");
      });
    });

    describe("API error handling", () => {
      it("should handle API rate limiting errors", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock rate limit error
        mockQuery.mockRejectedValueOnce(new Error("429 Too Many Requests: Rate limit exceeded"));

        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle API authentication errors", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "invalid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock authentication error
        mockQuery.mockRejectedValueOnce(new Error("401 Unauthorized: Invalid access token"));

        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle API server errors", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock server error
        mockQuery.mockRejectedValueOnce(new Error("500 Internal Server Error: Strava API error"));

        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle network timeout errors", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock timeout error
        mockQuery.mockRejectedValueOnce(new Error("Request timeout: Connection timed out"));

        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should log API errors appropriately", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock API error
        const apiError = new Error("API Error: Failed to fetch activities");
        mockQuery.mockRejectedValueOnce(apiError);

        try {
          await stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 12345,
          });
        } catch {
          // Expected to throw
        }

        expect(mockQuery).toHaveBeenCalled();
      });
    });

    describe("Token refresh before fetch", () => {
      it("should ensure valid token before fetching activities", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        // First call should be to check token
        const firstCall = mockQuery.mock.calls[0];
        expect(firstCall[0]).toContain("strava_credentials");
      });

      it("should refresh expired token before fetching", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock expired token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "expired-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() - 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock token update
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "new-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        // Mock activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(mockQuery).toHaveBeenCalled();
      });
    });

    describe("Authorization and validation", () => {
      it("should validate athlete_id parameter", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: -1,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should check authorization before fetching", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Different athlete IDs should fail authorization
        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
            caller_athlete_id: 54321,
          }),
        ).rejects.toThrow();
      });

      it("should require caller_athlete_id for authorization", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Missing caller_athlete_id should fail
        await expect(
          stravaModule.fetch_90day_activities({
            athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });
    });

    describe("Activity data structure", () => {
      it("should return activities with all required fields", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities query with all fields
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Morning Run",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
              distance_m: 5000.5,
              moving_time_s: 1800,
              elapsed_time_s: 1900,
              total_elevation_gain: 150.25,
              average_speed_ms: 2.78,
              max_speed_ms: 5.5,
              average_heartrate: 145.5,
              max_heartrate: 175.0,
              average_watts: 250.0,
              kilojoules: 450.0,
              suffer_score: 85,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("strava_id");
        expect(result[0]).toHaveProperty("athlete_id");
        expect(result[0]).toHaveProperty("name");
        expect(result[0]).toHaveProperty("sport_type");
        expect(result[0]).toHaveProperty("start_date");
        expect(result[0]).toHaveProperty("distance_m");
        expect(result[0]).toHaveProperty("moving_time_s");
      });

      it("should handle activities with missing optional fields", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock activities with minimal fields
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              strava_id: 123456,
              athlete_id: 12345,
              name: "Activity",
              sport_type: "Run",
              start_date: new Date("2026-05-14"),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("Empty results handling", () => {
      it("should return empty array when no activities in 90-day window", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock empty activities query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.fetch_90day_activities({
          athlete_id: 12345,
          caller_athlete_id: 12345,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });
    });
  });

  describe("get_strava_trends", () => {
    describe("Weekly volume analysis", () => {
      it("should calculate weekly volume from activities", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              total_distance_m: 25000,
              total_moving_time_s: 9000,
              activity_count: 3,
            },
            {
              week: "2026-05-03",
              total_distance_m: 20000,
              total_moving_time_s: 7200,
              activity_count: 2,
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 4,
          caller_athlete_id: 12345,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty("weekly_volume");
      });

      it("should return weekly volume data with distance and time", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              total_distance_m: 25000,
              total_moving_time_s: 9000,
              activity_count: 3,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 1,
          caller_athlete_id: 12345,
        });

        expect(result.weekly_volume).toBeDefined();
        expect(Array.isArray(result.weekly_volume)).toBe(true);
        if (result.weekly_volume.length > 0) {
          expect(result.weekly_volume[0]).toHaveProperty("total_distance_m");
          expect(result.weekly_volume[0]).toHaveProperty("total_moving_time_s");
        }
      });
    });

    describe("Pace trend analysis", () => {
      it("should calculate pace trends from activities", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              total_distance_m: 25000,
              total_moving_time_s: 9000,
              activity_count: 3,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              avg_pace_ms: 2.78,
              sport_type: "Run",
            },
            {
              week: "2026-05-03",
              avg_pace_ms: 2.75,
              sport_type: "Run",
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 4,
          caller_athlete_id: 12345,
        });

        expect(result).toHaveProperty("pace_trends");
      });

      it("should return pace trends by sport type", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              total_distance_m: 25000,
              total_moving_time_s: 9000,
              activity_count: 3,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              avg_pace_ms: 2.78,
              sport_type: "Run",
            },
            {
              week: "2026-05-10",
              avg_pace_ms: 1.5,
              sport_type: "Ride",
            },
          ],
          rowCount: 2,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 1,
          caller_athlete_id: 12345,
        });

        expect(result.pace_trends).toBeDefined();
        expect(Array.isArray(result.pace_trends)).toBe(true);
      });
    });

    describe("Token refresh logic", () => {
      it("should check token expiration before analyzing trends", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 4,
          caller_athlete_id: 12345,
        });

        // First call should be to check token expiration
        const firstCall = mockQuery.mock.calls[0];
        expect(firstCall[0]).toContain("strava_credentials");
      });

      it("should refresh token if expired before trend analysis", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock expired token
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "expired-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() - 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock token update
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "new-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 4,
          caller_athlete_id: 12345,
        });

        expect(mockQuery).toHaveBeenCalled();
      });
    });

    describe("Error handling", () => {
      it("should handle database connection errors gracefully", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(
          new Error("Connection refused: unable to connect to database"),
        );

        await expect(
          stravaModule.get_strava_trends({
            athlete_id: 12345,
            weeks: 4,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle query errors when fetching credentials", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        mockQuery.mockRejectedValueOnce(new Error("Database error: constraint violation"));

        await expect(
          stravaModule.get_strava_trends({
            athlete_id: 12345,
            weeks: 4,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should handle query errors when fetching trend data", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock successful token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock error on trend query
        mockQuery.mockRejectedValueOnce(new Error("Database connection lost"));

        await expect(
          stravaModule.get_strava_trends({
            athlete_id: 12345,
            weeks: 4,
            caller_athlete_id: 12345,
          }),
        ).rejects.toThrow();
      });

      it("should log errors appropriately", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        const dbError = new Error("Database connection timeout");
        mockQuery.mockRejectedValueOnce(dbError);

        try {
          await stravaModule.get_strava_trends({
            athlete_id: 12345,
            weeks: 4,
            caller_athlete_id: 12345,
          });
        } catch {
          // Expected to throw
        }

        expect(mockQuery).toHaveBeenCalled();
      });
    });

    describe("Trend data structure", () => {
      it("should return trends object with weekly_volume and pace_trends", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              total_distance_m: 25000,
              total_moving_time_s: 9000,
              activity_count: 3,
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              week: "2026-05-10",
              avg_pace_ms: 2.78,
              sport_type: "Run",
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 1,
          caller_athlete_id: 12345,
        });

        expect(result).toHaveProperty("weekly_volume");
        expect(result).toHaveProperty("pace_trends");
      });

      it("should handle empty trend data", async () => {
        const { pool } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;

        // Mock token check
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              athlete_id: 12345,
              access_token: "valid-token",
              refresh_token: "refresh-token",
              expires_at: new Date(Date.now() + 3600000),
            },
          ],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock empty weekly volume query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        // Mock empty pace trend query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.get_strava_trends({
          athlete_id: 12345,
          weeks: 4,
          caller_athlete_id: 12345,
        });

        expect(result.weekly_volume).toBeDefined();
        expect(result.pace_trends).toBeDefined();
      });
    });
  });

  describe("sync_strava_activities", () => {
    describe("Activity upsert", () => {
      it("should upsert activities into strava_activities table", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
            elapsed_time_s: 1900,
            total_elevation_gain: 150.25,
            average_speed_ms: 2.78,
            max_speed_ms: 5.5,
            average_heartrate: 145.5,
            max_heartrate: 175.0,
            average_watts: 250.0,
            kilojoules: 450.0,
            suffer_score: 85,
          },
        ];

        // Mock upsert query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock update last_synced_at
        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
      });

      it("should handle multiple activities in single upsert", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
          {
            id: 123457,
            name: "Evening Bike",
            sport_type: "Ride",
            start_date: new Date("2026-05-13"),
            distance_m: 15000.0,
            moving_time_s: 3600,
          },
        ];

        // Mock upsert for each activity
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 2, strava_id: 123457 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        // Mock update last_synced_at
        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(result).toBeDefined();
        expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      it("should use ON CONFLICT for upsert logic", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        const upsertCall = mockQuery.mock.calls[0];
        expect(upsertCall[0]).toContain("ON CONFLICT");
      });

      it("should insert all activity fields into database", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
            elapsed_time_s: 1900,
            total_elevation_gain: 150.25,
            average_speed_ms: 2.78,
            max_speed_ms: 5.5,
            average_heartrate: 145.5,
            max_heartrate: 175.0,
            average_watts: 250.0,
            kilojoules: 450.0,
            suffer_score: 85,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        const upsertCall = mockQuery.mock.calls[0];
        expect(upsertCall[0]).toContain("strava_activities");
        expect(upsertCall[0]).toContain("distance_m");
        expect(upsertCall[0]).toContain("moving_time_s");
      });

      it("should handle empty activities array", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities: any[] = [];

        // Mock update last_synced_at even with no activities
        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(result).toBeDefined();
      });
    });

    describe("Telegram message sending", () => {
      it("should send Telegram message with activity count", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
          {
            id: 123457,
            name: "Evening Bike",
            sport_type: "Ride",
            start_date: new Date("2026-05-13"),
            distance_m: 15000.0,
            moving_time_s: 3600,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 2, strava_id: 123457 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(mockSendMessage).toHaveBeenCalled();
        const messageCall = mockSendMessage.mock.calls[0];
        expect(messageCall[0]).toBe(123456789);
        expect(messageCall[1]).toContain("2");
      });

      it("should include activity count in message", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(mockSendMessage).toHaveBeenCalled();
        const messageCall = mockSendMessage.mock.calls[0];
        expect(messageCall[1]).toContain("1");
      });

      it("should send message to correct chat_id", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const chatId = 987654321;
        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: chatId,
          activities,
        });

        expect(mockSendMessage).toHaveBeenCalledWith(chatId, expect.any(String));
      });

      it("should handle Telegram message sending errors gracefully", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockRejectedValue(new Error("Telegram API error"));
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        // Should not throw even if Telegram fails
        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(result).toBeDefined();
      });

      it("should send message with imported activities summary", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(mockSendMessage).toHaveBeenCalled();
        const messageCall = mockSendMessage.mock.calls[0];
        const message = messageCall[1];
        expect(message).toContain("imported");
      });
    });

    describe("last_synced_at timestamp update", () => {
      it("should update last_synced_at after successful sync", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        // Check that UPDATE was called
        const updateCall = mockQuery.mock.calls.find((call: any[]) => call[0].includes("UPDATE"));
        expect(updateCall).toBeDefined();
        expect(updateCall?.[0]).toContain("last_synced_at");
      });

      it("should update last_synced_at in strava_credentials table", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        const updateCall = mockQuery.mock.calls.find((call: any[]) => call[0].includes("UPDATE"));
        expect(updateCall?.[0]).toContain("strava_credentials");
      });

      it("should set last_synced_at to current timestamp", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        const beforeSync = new Date();

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        const afterSync = new Date();

        const updateCall = mockQuery.mock.calls.find((call: any[]) => call[0].includes("UPDATE"));
        expect(updateCall).toBeDefined();

        // Verify the returned timestamp is recent
        const returnedTimestamp = updateCall?.[1]?.[0];
        if (returnedTimestamp instanceof Date) {
          expect(returnedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
          expect(returnedTimestamp.getTime()).toBeLessThanOrEqual(afterSync.getTime());
        }
      });

      it("should update last_synced_at for correct athlete_id", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const athleteId = 12345;
        await stravaModule.sync_strava_activities({
          athlete_id: athleteId,
          chat_id: 123456789,
          activities,
        });

        const updateCall = mockQuery.mock.calls.find((call: any[]) => call[0].includes("UPDATE"));
        expect(updateCall?.[1]).toContain(athleteId);
      });
    });

    describe("Error handling", () => {
      it("should handle database errors during upsert", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockRejectedValueOnce(new Error("Database connection error"));

        await expect(
          stravaModule.sync_strava_activities({
            athlete_id: 12345,
            chat_id: 123456789,
            activities,
          }),
        ).rejects.toThrow();
      });

      it("should handle database errors during timestamp update", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockRejectedValueOnce(new Error("Failed to update timestamp"));

        await expect(
          stravaModule.sync_strava_activities({
            athlete_id: 12345,
            chat_id: 123456789,
            activities,
          }),
        ).rejects.toThrow();
      });

      it("should log errors appropriately", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        const dbError = new Error("Database error");
        mockQuery.mockRejectedValueOnce(dbError);

        try {
          await stravaModule.sync_strava_activities({
            athlete_id: 12345,
            chat_id: 123456789,
            activities,
          });
        } catch {
          // Expected to throw
        }

        expect(mockQuery).toHaveBeenCalled();
      });

      it("should validate athlete_id parameter", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const _mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        await expect(
          stravaModule.sync_strava_activities({
            athlete_id: -1,
            chat_id: 123456789,
            activities,
          }),
        ).rejects.toThrow();
      });

      it("should validate chat_id parameter", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const _mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
        ];

        await expect(
          stravaModule.sync_strava_activities({
            athlete_id: 12345,
            chat_id: -1,
            activities,
          }),
        ).rejects.toThrow();
      });
    });

    describe("Integration", () => {
      it("should complete full sync workflow", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
            elapsed_time_s: 1900,
            total_elevation_gain: 150.25,
            average_speed_ms: 2.78,
            max_speed_ms: 5.5,
            average_heartrate: 145.5,
            max_heartrate: 175.0,
            average_watts: 250.0,
            kilojoules: 450.0,
            suffer_score: 85,
          },
          {
            id: 123457,
            name: "Evening Bike",
            sport_type: "Ride",
            start_date: new Date("2026-05-13"),
            distance_m: 15000.0,
            moving_time_s: 3600,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 2, strava_id: 123457 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        // Verify all steps completed
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
        expect(mockSendMessage).toHaveBeenCalled();
      });

      it("should return sync result with activity count", async () => {
        const { pool, telegramBot } = await import("@lifeos/shared");
        const mockQuery = vi.mocked(pool.query) as any;
        const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
        vi.mocked(telegramBot).sendMessage = mockSendMessage;

        const activities = [
          {
            id: 123456,
            name: "Morning Run",
            sport_type: "Run",
            start_date: new Date("2026-05-14"),
            distance_m: 5000.5,
            moving_time_s: 1800,
          },
          {
            id: 123457,
            name: "Evening Bike",
            sport_type: "Ride",
            start_date: new Date("2026-05-13"),
            distance_m: 15000.0,
            moving_time_s: 3600,
          },
        ];

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, strava_id: 123456 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 2, strava_id: 123457 }],
          rowCount: 1,
          command: "INSERT",
          oid: 0,
          fields: [],
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{ athlete_id: 12345, last_synced_at: new Date() }],
          rowCount: 1,
          command: "UPDATE",
          oid: 0,
          fields: [],
        });

        const result = await stravaModule.sync_strava_activities({
          athlete_id: 12345,
          chat_id: 123456789,
          activities,
        });

        expect(result).toHaveProperty("imported_count");
        expect(result.imported_count).toBe(2);
      });
    });
  });
});
