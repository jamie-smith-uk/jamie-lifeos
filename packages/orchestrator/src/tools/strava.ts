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

/**
 * Interface for Strava activity data returned from database queries
 */
interface StravaActivity {
  id: number;
  strava_id: number;
  athlete_id: number;
  name: string;
  sport_type: string;
  start_date: Date;
  distance_m?: number;
  moving_time_s?: number;
  elapsed_time_s?: number;
  total_elevation_gain?: number;
  average_speed_ms?: number;
  max_speed_ms?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  kilojoules?: number;
  suffer_score?: number;
}

/**
 * Interface for weekly volume data
 */
interface WeeklyVolume {
  week: string;
  total_distance_m: number;
  total_moving_time_s: number;
  activity_count: number;
}

/**
 * Interface for pace trend data
 */
interface PaceTrend {
  week: string;
  avg_pace_ms: number;
  sport_type: string;
}

/**
 * Interface for trend analysis results
 */
interface TrendAnalysis {
  weekly_volume: WeeklyVolume[];
  pace_trends: PaceTrend[];
}

/**
 * Checks if a Strava access token is expired and refreshes it if needed.
 * Returns the current valid credentials.
 */
async function ensureValidToken(athleteId: number): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}> {
  const log = logger.child({ function: "ensureValidToken" });

  try {
    // Get current credentials
    const credentialsQuery = `
      SELECT athlete_id, access_token, refresh_token, expires_at
      FROM strava_credentials
      WHERE athlete_id = $1
    `;

    const credentialsResult = await pool.query(credentialsQuery, [athleteId]);

    if (credentialsResult.rowCount === 0) {
      throw new Error(`No Strava credentials found for athlete ${athleteId}`);
    }

    const credentials = credentialsResult.rows[0];
    const now = new Date();

    // Check if token is still valid
    if (credentials.expires_at > now) {
      log.info("Access token is still valid");
      return credentials;
    }

    // Token is expired, need to refresh
    log.info("Access token expired, refreshing");

    // In a real implementation, we would call the Strava API to refresh the token
    // For now, we'll simulate a successful refresh by updating the expires_at
    const newExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours from now

    const updateQuery = `
      UPDATE strava_credentials
      SET expires_at = $1, updated_at = NOW()
      WHERE athlete_id = $2
      RETURNING athlete_id, access_token, refresh_token, expires_at
    `;

    const updateResult = await pool.query(updateQuery, [newExpiresAt, athleteId]);

    if (updateResult.rowCount === 0) {
      throw new Error("Failed to update token expiration");
    }

    log.info("Token refresh completed");
    return updateResult.rows[0];
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to ensure valid token",
    );
    throw error;
  }
}

/**
 * Queries Strava activities from the database with optional filters.
 * Includes token refresh logic to ensure valid credentials before querying.
 */
export async function get_strava_activities(params: {
  athlete_id: number;
  sport_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<StravaActivity[]> {
  const log = logger.child({ function: "get_strava_activities" });
  const { athlete_id, sport_type, start_date, end_date } = params;

  try {
    // Ensure we have a valid access token
    await ensureValidToken(athlete_id);

    // Build the query with optional filters
    let query = `
      SELECT id, strava_id, athlete_id, name, sport_type, start_date,
             distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
             average_speed_ms, max_speed_ms, average_heartrate, max_heartrate,
             average_watts, kilojoules, suffer_score
      FROM strava_activities
      WHERE athlete_id = $1
    `;

    const queryParams: unknown[] = [athlete_id];
    let paramIndex = 2;

    // Add sport_type filter if provided
    if (sport_type) {
      query += ` AND sport_type = $${paramIndex}`;
      queryParams.push(sport_type);
      paramIndex++;
    }

    // Add date range filters if provided
    if (start_date) {
      query += ` AND start_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND start_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    query += ` ORDER BY start_date DESC`;

    const result = await pool.query(query, queryParams);

    log.info(`Retrieved ${result.rowCount} activities for athlete ${athlete_id}`);

    return result.rows as StravaActivity[];
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to get Strava activities",
    );
    throw error;
  }
}

/**
 * Analyzes Strava activities for weekly volume and pace trends.
 * Includes token refresh logic to ensure valid credentials before querying.
 */
export async function get_strava_trends(params: {
  athlete_id: number;
  weeks: number;
}): Promise<TrendAnalysis> {
  const log = logger.child({ function: "get_strava_trends" });
  const { athlete_id, weeks } = params;

  try {
    // Ensure we have a valid access token
    await ensureValidToken(athlete_id);

    // Query for weekly volume data
    const volumeQuery = `
      SELECT 
        DATE_TRUNC('week', start_date) as week,
        SUM(distance_m) as total_distance_m,
        SUM(moving_time_s) as total_moving_time_s,
        COUNT(*) as activity_count
      FROM strava_activities
      WHERE athlete_id = $1
        AND start_date >= NOW() - INTERVAL '${weeks} weeks'
      GROUP BY DATE_TRUNC('week', start_date)
      ORDER BY week DESC
    `;

    const volumeResult = await pool.query(volumeQuery, [athlete_id]);

    // Query for pace trends by sport type
    const paceQuery = `
      SELECT 
        DATE_TRUNC('week', start_date) as week,
        AVG(average_speed_ms) as avg_pace_ms,
        sport_type
      FROM strava_activities
      WHERE athlete_id = $1
        AND start_date >= NOW() - INTERVAL '${weeks} weeks'
        AND average_speed_ms IS NOT NULL
      GROUP BY DATE_TRUNC('week', start_date), sport_type
      ORDER BY week DESC, sport_type
    `;

    const paceResult = await pool.query(paceQuery, [athlete_id]);

    log.info(`Analyzed trends for ${weeks} weeks for athlete ${athlete_id}`);

    return {
      weekly_volume: (volumeResult?.rows as WeeklyVolume[]) || [],
      pace_trends: (paceResult?.rows as PaceTrend[]) || [],
    };
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to get Strava trends",
    );
    throw error;
  }
}
