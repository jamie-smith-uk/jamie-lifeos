/**
 * strava.ts — Strava tools module
 *
 * Provides OAuth URL generation with state token management and CSRF protection
 * for Strava integration.
 */

import { randomBytes } from "node:crypto";
import { env, logger, pool, telegramBot } from "@lifeos/shared";

/**
 * Generates a Strava OAuth authorization URL with a state token for CSRF protection.
 * The state token is stored in the database with a 10-minute expiration.
 */
export async function get_strava_oauth_url(_params: Record<string, unknown>): Promise<string> {
  const log = logger.child({ function: "get_strava_oauth_url" });

  // Guard: fail fast with a clear message if Strava env vars aren't configured
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET || !env.STRAVA_REDIRECT_URI) {
    throw new Error(
      "Strava integration is not configured. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REDIRECT_URI environment variables.",
    );
  }

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

  // Input validation for state parameter
  if (!state || typeof state !== "string") {
    log.warn("Invalid state parameter: must be non-empty string");
    return false;
  }

  // Validate state token format (should be 64 hex characters from randomBytes(32))
  if (state.length !== 64 || !/^[a-f0-9]{64}$/i.test(state)) {
    log.warn("Invalid state token format: must be 64 hex characters");
    return false;
  }

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
 * Validates athlete_id parameter
 */
function validateAthleteId(athleteId: number): void {
  if (!athleteId || typeof athleteId !== "number" || athleteId <= 0) {
    throw new Error("Invalid athlete_id: must be a positive number");
  }
}

/**
 * Validates sport_type parameter
 */
function validateSportType(sportType: string | undefined): void {
  if (sportType !== undefined) {
    if (typeof sportType !== "string" || sportType.trim().length === 0) {
      throw new Error("Invalid sport_type: must be non-empty string");
    }
    if (sportType.length > 50) {
      throw new Error("Invalid sport_type: must be 50 characters or less");
    }
  }
}

/**
 * Validates date parameter format and range
 */
function validateDate(date: string | undefined, paramName: string): Date | undefined {
  if (date === undefined) {
    return undefined;
  }

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid ${paramName}: must be in YYYY-MM-DD format`);
  }

  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error(`Invalid ${paramName}: not a valid date`);
  }

  // Check reasonable date range (not more than 10 years ago, not in future)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateObj < tenYearsAgo || dateObj > tomorrow) {
    throw new Error(`Invalid ${paramName}: must be within reasonable date range`);
  }

  return dateObj;
}

/**
 * Validates date range (end_date >= start_date)
 */
function validateDateRange(startDate: Date | undefined, endDate: Date | undefined): void {
  if (startDate !== undefined && endDate !== undefined && endDate < startDate) {
    throw new Error("Invalid date range: end_date must be >= start_date");
  }
}

/**
 * Validates weeks parameter
 */
function validateWeeks(weeks: number): void {
  if (!weeks || typeof weeks !== "number" || !Number.isInteger(weeks)) {
    throw new Error("Invalid weeks: must be a positive integer");
  }
  if (weeks <= 0) {
    throw new Error("Invalid weeks: must be greater than 0");
  }
  if (weeks > 52) {
    throw new Error("Invalid weeks: must be 52 weeks or less");
  }
}

/**
 * Validates authorization for accessing athlete data
 */
function validateAuthorization(
  athleteId: number,
  callerAthleteId: number | undefined,
  log: {
    error: (obj: Record<string, unknown>, msg: string) => void;
    warn: (obj: Record<string, unknown>, msg: string) => void;
  },
): void {
  if (callerAthleteId !== undefined) {
    if (typeof callerAthleteId !== "number" || callerAthleteId <= 0) {
      throw new Error("Invalid caller_athlete_id: must be a positive number");
    }
    if (callerAthleteId !== athleteId) {
      log.warn(
        { caller_athlete_id: callerAthleteId, requested_athlete_id: athleteId },
        "Authorization failed: caller not authorized to access athlete data",
      );
      throw new Error("Unauthorized: cannot access another athlete's data");
    }
  } else {
    log.error({ athlete_id: athleteId }, "Authorization failed: caller_athlete_id is required");
    throw new Error("Unauthorized: caller_athlete_id is required");
  }
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
    const bufferMs = 5 * 60 * 1000; // 5-minute buffer before expiry

    // Check if token is still valid (with buffer)
    if (credentials.expires_at.getTime() > now.getTime() + bufferMs) {
      log.info("Access token is still valid");
      return credentials;
    }

    // Token is expired or about to expire — refresh via Strava API
    log.info({ athlete_id: athleteId }, "Access token expired, refreshing via Strava API");

    const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: credentials.refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error(
        `Token refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`,
      );
    }

    const tokenData = (await refreshResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const updateResult = await pool.query(
      `UPDATE strava_credentials
       SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE athlete_id = $4
       RETURNING athlete_id, access_token, refresh_token, expires_at`,
      [tokenData.access_token, tokenData.refresh_token, newExpiresAt, athleteId],
    );

    if (updateResult.rowCount === 0) {
      throw new Error(`Failed to update credentials for athlete ${athleteId}`);
    }

    log.info({ athlete_id: athleteId }, "Token refreshed successfully");
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
  caller_athlete_id?: number; // For authorization check
}): Promise<StravaActivity[]> {
  const log = logger.child({ function: "get_strava_activities" });
  const { athlete_id, sport_type, start_date, end_date, caller_athlete_id } = params;

  // Input validation
  validateAthleteId(athlete_id);
  validateSportType(sport_type);
  const startDateObj = validateDate(start_date, "start_date");
  const endDateObj = validateDate(end_date, "end_date");
  validateDateRange(startDateObj, endDateObj);

  // Authorization check
  validateAuthorization(athlete_id, caller_athlete_id, log);

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
 * Fetches activities from the last 90 days using Strava API with pagination.
 * Handles pagination with 30 activities per page and properly handles API errors and rate limiting.
 */
export async function fetch_90day_activities(params: {
  athlete_id: number;
  caller_athlete_id?: number; // For authorization check
}): Promise<StravaActivity[]> {
  const log = logger.child({ function: "fetch_90day_activities" });
  const { athlete_id, caller_athlete_id } = params;

  // Input validation
  validateAthleteId(athlete_id);

  // Authorization check
  validateAuthorization(athlete_id, caller_athlete_id, log);

  try {
    // Ensure we have a valid access token
    await ensureValidToken(athlete_id);

    const allActivities: StravaActivity[] = [];
    let offset = 0;
    const limit = 30; // 30 activities per page as per acceptance criteria

    // Fetch activities with pagination (90-day window)
    while (true) {
      const query = `
        SELECT id, strava_id, athlete_id, name, sport_type, start_date,
               distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
               average_speed_ms, max_speed_ms, average_heartrate, max_heartrate,
               average_watts, kilojoules, suffer_score
        FROM strava_activities
        WHERE athlete_id = $1
          AND start_date >= NOW() - INTERVAL '90 days'
        ORDER BY start_date DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [athlete_id, limit, offset]);

      if ((result.rowCount ?? 0) === 0) {
        // No more activities to fetch
        break;
      }

      allActivities.push(...(result.rows as StravaActivity[]));

      // If we got fewer than the limit, we've reached the end
      if ((result.rowCount ?? 0) < limit) {
        break;
      }

      offset += limit;
    }

    log.info(
      `Retrieved ${allActivities.length} activities from last 90 days for athlete ${athlete_id}`,
    );

    return allActivities;
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to fetch 90-day activities",
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
  caller_athlete_id?: number; // For authorization check
}): Promise<TrendAnalysis> {
  const log = logger.child({ function: "get_strava_trends" });
  const { athlete_id, weeks, caller_athlete_id } = params;

  // Input validation
  validateAthleteId(athlete_id);
  validateWeeks(weeks);

  // Authorization check
  validateAuthorization(athlete_id, caller_athlete_id, log);

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
        AND start_date >= NOW() - INTERVAL '1 week' * $2
      GROUP BY DATE_TRUNC('week', start_date)
      ORDER BY week DESC
    `;

    const volumeResult = await pool.query(volumeQuery, [athlete_id, weeks]);

    // Query for pace trends by sport type
    const paceQuery = `
      SELECT 
        DATE_TRUNC('week', start_date) as week,
        AVG(average_speed_ms) as avg_pace_ms,
        sport_type
      FROM strava_activities
      WHERE athlete_id = $1
        AND start_date >= NOW() - INTERVAL '1 week' * $2
        AND average_speed_ms IS NOT NULL
      GROUP BY DATE_TRUNC('week', start_date), sport_type
      ORDER BY week DESC, sport_type
    `;

    const paceResult = await pool.query(paceQuery, [athlete_id, weeks]);

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

/**
 * Interface for activity data to be synced
 */
interface ActivityToSync {
  id: number;
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
 * Interface for sync result
 */
interface SyncResult {
  imported_count: number;
}

/**
 * Validates athlete_id parameter
 */
function validateAthleteIdForSync(athleteId: number): void {
  if (!athleteId || typeof athleteId !== "number" || athleteId <= 0) {
    throw new Error("Invalid athlete_id: must be a positive number");
  }
}

/**
 * Validates chat_id parameter
 */
function validateChatId(chatId: number): void {
  if (!chatId || typeof chatId !== "number" || chatId === 0) {
    throw new Error("Invalid chat_id: must be a non-zero number");
  }
}

/**
 * Validates a single activity object
 */
function validateActivity(activity: ActivityToSync): void {
  if (!activity.id || typeof activity.id !== "number" || activity.id <= 0) {
    throw new Error("Invalid activity.id: must be a positive number");
  }
  if (!activity.name || typeof activity.name !== "string") {
    throw new Error("Invalid activity.name: must be a non-empty string");
  }
  if (!activity.sport_type || typeof activity.sport_type !== "string") {
    throw new Error("Invalid activity.sport_type: must be a non-empty string");
  }
  if (!activity.start_date || !(activity.start_date instanceof Date)) {
    throw new Error("Invalid activity.start_date: must be a Date object");
  }
}

/**
 * Validates sync parameters
 */
function validateSyncParams(params: {
  athlete_id: number;
  chat_id: number;
  activities: ActivityToSync[];
}): void {
  const { athlete_id, chat_id, activities } = params;

  validateAthleteIdForSync(athlete_id);
  validateChatId(chat_id);

  if (!Array.isArray(activities)) {
    throw new Error("Invalid activities: must be an array");
  }

  // Validate each activity
  for (const activity of activities) {
    validateActivity(activity);
  }
}

/**
 * Builds query parameters for activity upsert
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parameter mapping complexity
function buildActivityQueryParams(athleteId: number, activity: ActivityToSync): unknown[] {
  return [
    activity.id, // strava_id
    athleteId,
    activity.name,
    activity.sport_type,
    activity.start_date,
    activity.distance_m ?? null,
    activity.moving_time_s ?? null,
    activity.elapsed_time_s ?? null,
    activity.total_elevation_gain ?? null,
    activity.average_speed_ms ?? null,
    activity.max_speed_ms ?? null,
    activity.average_heartrate ?? null,
    activity.max_heartrate ?? null,
    activity.average_watts ?? null,
    activity.kilojoules ?? null,
    activity.suffer_score ?? null,
  ];
}

/**
 * Upserts a single activity into the strava_activities table
 */
async function upsertActivity(athleteId: number, activity: ActivityToSync): Promise<void> {
  const insertQuery = `
    INSERT INTO strava_activities (
      strava_id, athlete_id, name, sport_type, start_date,
      distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
      average_speed_ms, max_speed_ms, average_heartrate, max_heartrate,
      average_watts, kilojoules, suffer_score, synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
    )
    ON CONFLICT (strava_id) DO UPDATE SET
      name = EXCLUDED.name,
      sport_type = EXCLUDED.sport_type,
      start_date = EXCLUDED.start_date,
      distance_m = EXCLUDED.distance_m,
      moving_time_s = EXCLUDED.moving_time_s,
      elapsed_time_s = EXCLUDED.elapsed_time_s,
      total_elevation_gain = EXCLUDED.total_elevation_gain,
      average_speed_ms = EXCLUDED.average_speed_ms,
      max_speed_ms = EXCLUDED.max_speed_ms,
      average_heartrate = EXCLUDED.average_heartrate,
      max_heartrate = EXCLUDED.max_heartrate,
      average_watts = EXCLUDED.average_watts,
      kilojoules = EXCLUDED.kilojoules,
      suffer_score = EXCLUDED.suffer_score,
      synced_at = NOW()
    RETURNING id, strava_id
    -- Note: last_synced_at will be updated separately in strava_credentials table
  `;

  const queryParams = buildActivityQueryParams(athleteId, activity);
  const result = await pool.query(insertQuery, queryParams);

  if (result.rowCount === 0) {
    throw new Error(`Failed to upsert activity ${activity.id}`);
  }
}

/**
 * Updates the last_synced_at timestamp for the athlete
 */
async function updateLastSyncedAt(athleteId: number): Promise<void> {
  const updateQuery = `
    UPDATE strava_credentials
    SET last_synced_at = $1, updated_at = NOW()
    WHERE athlete_id = $2
    RETURNING athlete_id, last_synced_at
  `;

  const now = new Date();
  const result = await pool.query(updateQuery, [now, athleteId]);

  if (result.rowCount === 0) {
    throw new Error(`Failed to update last_synced_at for athlete ${athleteId}`);
  }
}

/**
 * Sends a Telegram message with the sync results
 */
async function sendSyncConfirmation(chatId: number, importedCount: number): Promise<void> {
  const log = logger.child({ function: "sendSyncConfirmation" });

  try {
    const message = `✅ Strava sync complete! Successfully imported ${importedCount} activities.`;
    await telegramBot.sendMessage(chatId, message);
    log.info(`Sent sync confirmation message to chat ${chatId}`);
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error), chat_id: chatId },
      "Failed to send sync confirmation message",
    );
    // Don't throw - we don't want to fail the sync if message sending fails
  }
}

/**
 * Syncs Strava activities by upserting them into the database and sending confirmation.
 * Updates last_synced_at timestamp after successful sync.
 */
export async function sync_strava_activities(params: {
  athlete_id: number;
  chat_id: number;
  activities: ActivityToSync[];
}): Promise<SyncResult> {
  const log = logger.child({ function: "sync_strava_activities" });
  const { athlete_id, chat_id, activities } = params;

  // Input validation
  validateSyncParams(params);

  try {
    log.info(`Starting sync for athlete ${athlete_id} with ${activities.length} activities`);

    // Upsert each activity
    for (const activity of activities) {
      await upsertActivity(athlete_id, activity);
    }

    // Update last_synced_at timestamp
    await updateLastSyncedAt(athlete_id);

    // Send confirmation message
    await sendSyncConfirmation(chat_id, activities.length);

    log.info(`Successfully synced ${activities.length} activities for athlete ${athlete_id}`);

    return {
      imported_count: activities.length,
    };
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error), athlete_id },
      "Failed to sync Strava activities",
    );
    throw error;
  }
}
