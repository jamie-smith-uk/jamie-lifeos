/**
 * strava.ts — Strava tools module
 *
 * Provides OAuth URL generation with state token management and CSRF protection
 * for Strava integration.
 */

import { randomBytes } from "node:crypto";
import { env, logger, pool } from "@lifeos/shared";

/**
 * Generates a Strava OAuth authorization URL with a state token for CSRF protection.
 * The state token is stored in the database with a 10-minute expiration.
 */
export async function get_strava_oauth_url(_params: Record<string, unknown>): Promise<string> {
  const log = logger.child({ function: "get_strava_oauth_url" });

  try {
    // Generate a cryptographically secure state token
    const stateToken = randomBytes(32).toString("hex");

    // Store the state token in the database with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const insertQuery = `
      INSERT INTO strava_oauth_state (state_token, expires_at)
      VALUES ($1, $2)
      RETURNING id, state_token, created_at, expires_at
    `;

    const result = await pool.query(insertQuery, [stateToken, expiresAt]);

    if (result.rowCount === 0) {
      throw new Error("Failed to store OAuth state token");
    }

    const storedToken = result.rows[0].state_token;

    // Build the OAuth authorization URL
    const authUrl = new URL("https://www.strava.com/oauth/authorize");
    authUrl.searchParams.set("client_id", env.STRAVA_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", env.STRAVA_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "activity:read_all");
    authUrl.searchParams.set("state", storedToken);

    log.info("Generated Strava OAuth URL");

    return authUrl.toString();
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to generate Strava OAuth URL",
    );
    throw error;
  }
}

/**
 * Validates an OAuth state token for CSRF protection.
 * Returns true if the token exists and hasn't expired, false otherwise.
 * Deletes the token after validation to prevent reuse.
 */
export async function validate_oauth_state(params: { state: string }): Promise<boolean> {
  const log = logger.child({ function: "validate_oauth_state" });
  const { state } = params;

  try {
    // Find the state token and check if it's still valid
    const selectQuery = `
      SELECT id, state_token, created_at, expires_at
      FROM strava_oauth_state
      WHERE state_token = $1
    `;

    const result = await pool.query(selectQuery, [state]);

    if (result.rowCount === 0) {
      log.warn("OAuth state token not found");
      return false;
    }

    const tokenRecord = result.rows[0];
    const now = new Date();

    // Check if the token has expired
    if (tokenRecord.expires_at < now) {
      log.warn("OAuth state token expired");

      // Clean up expired token
      await pool.query("DELETE FROM strava_oauth_state WHERE id = $1", [tokenRecord.id]);

      return false;
    }

    // Token is valid, delete it to prevent reuse
    await pool.query("DELETE FROM strava_oauth_state WHERE id = $1", [tokenRecord.id]);

    log.info("OAuth state token validated and consumed");

    return true;
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to validate OAuth state",
    );
    throw error;
  }
}
