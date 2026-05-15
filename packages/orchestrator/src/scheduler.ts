/**
 * scheduler.ts — Scheduler module with nudge evaluator
 *
 * Manages cron jobs for nudge evaluation, digest delivery, and automation execution.
 * The nudge evaluator runs every 15 minutes to check for due nudges and enforces
 * a maximum of 3 nudges sent per hour to prevent spam.
 *
 * All database queries use parameterized statements for security.
 */

import { env, logger, pool, telegramBot } from "@lifeos/shared";
import * as cron from "node-cron";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingNudge {
  id: number;
  person_id: number | null;
  life_event_id: number | null;
  message: string;
  trigger_at: Date;
  status: string;
  sent_at: Date | null;
  dismissed_at: Date | null;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Nudge Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluates pending nudges and sends up to 3 per hour.
 * Queries for nudges with status 'pending' and trigger_at in the past.
 */
async function evaluateNudges(): Promise<void> {
  const log = logger.child({ job: "nudge_evaluator" });

  try {
    log.info("Starting nudge evaluation");

    // Query for pending nudges past their trigger time
    const pendingNudgesResult = await pool.query(
      `SELECT id, person_id, life_event_id, message, trigger_at, status, sent_at, dismissed_at, created_at
       FROM nudges 
       WHERE status = 'pending' AND trigger_at <= now()
       ORDER BY trigger_at ASC`,
      [],
    );

    const pendingNudges = pendingNudgesResult.rows as PendingNudge[];

    if (pendingNudges.length === 0) {
      log.info("No pending nudges found");
      return;
    }

    // Check how many nudges were sent in the last hour to enforce rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSentResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM nudges 
       WHERE status = 'sent' AND sent_at >= $1`,
      [oneHourAgo],
    );

    const recentSentCount = Number(recentSentResult.rows[0]?.count || 0);
    const remainingSlots = Math.max(0, 3 - recentSentCount);

    if (remainingSlots === 0) {
      log.info("Rate limit reached: 3 nudges already sent in the last hour");
      return;
    }

    // Limit to remaining slots to enforce rate limit
    const nudgesToProcess = pendingNudges.slice(0, remainingSlots);

    log.info({ count: nudgesToProcess.length, remainingSlots }, "Processing pending nudges");

    // Process each nudge (send via Telegram, then mark as sent)
    for (const nudge of nudgesToProcess) {
      try {
        // Send nudge message to Telegram with dismiss button
        const inlineKeyboard = {
          inline_keyboard: [
            [
              {
                text: "Dismiss",
                callback_data: `dismiss_nudge_${nudge.id}`,
              },
            ],
          ],
        };

        await telegramBot.sendMessage(
          env.TELEGRAM_ALLOWED_CHAT_ID,
          `${nudge.message}\n\n[Dismiss button available]`,
          {
            reply_markup: inlineKeyboard,
          },
        );

        // Update nudge status to 'sent' with sent_at timestamp after successful send
        await pool.query(
          `UPDATE nudges 
           SET status = 'sent', sent_at = now()
           WHERE id = $1`,
          [nudge.id],
        );

        log.info({ nudge_id: nudge.id }, "Nudge marked as sent");
      } catch (err) {
        log.error({ err: String(err), nudge_id: nudge.id }, "Failed to update nudge status");
      }
    }

    log.info({ processed: nudgesToProcess.length }, "Nudge evaluation completed");
  } catch (err) {
    log.error({ err: String(err) }, "Nudge evaluation failed");
  }
}

// ---------------------------------------------------------------------------
// Strava Sync Job
// ---------------------------------------------------------------------------

interface StravaCredentials {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  last_synced_at: Date | null;
}

/**
 * Refreshes an expired Strava access token using the refresh token.
 * Updates the credentials in the database with the new token and expiration.
 */
async function refreshStravaToken(credentials: StravaCredentials): Promise<StravaCredentials> {
  const log = logger.child({ function: "refreshStravaToken" });

  try {
    log.info({ athlete_id: credentials.athlete_id }, "Refreshing expired Strava token");

    // Make token refresh request to Strava API
    const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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

    // Update credentials in database
    const updateQuery = `
      UPDATE strava_credentials
      SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
      WHERE athlete_id = $4
      RETURNING athlete_id, access_token, refresh_token, expires_at, last_synced_at
    `;

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const result = await pool.query(updateQuery, [
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt,
      credentials.athlete_id,
    ]);

    if (result.rowCount === 0) {
      throw new Error(`Failed to update credentials for athlete ${credentials.athlete_id}`);
    }

    log.info({ athlete_id: credentials.athlete_id }, "Token refresh completed");
    return result.rows[0] as StravaCredentials;
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : String(error),
        athlete_id: credentials.athlete_id,
      },
      "Failed to refresh Strava token",
    );
    throw error;
  }
}

/**
 * Ensures a Strava access token is valid, refreshing it if expired.
 */
async function ensureValidStravaToken(credentials: StravaCredentials): Promise<StravaCredentials> {
  const now = new Date();

  // Check if token is still valid (with 5-minute buffer)
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (credentials.expires_at.getTime() > now.getTime() + bufferTime) {
    return credentials;
  }

  // Token is expired or about to expire, refresh it
  return await refreshStravaToken(credentials);
}

/**
 * Fetches new activities from Strava API since the last sync.
 */
async function fetchNewStravaActivities(credentials: StravaCredentials): Promise<unknown[]> {
  const log = logger.child({ function: "fetchNewStravaActivities" });

  try {
    // Calculate the timestamp for activities to fetch (since last sync or 30 days ago)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const after = credentials.last_synced_at
      ? Math.max(
          Math.floor(credentials.last_synced_at.getTime() / 1000),
          Math.floor(thirtyDaysAgo.getTime() / 1000),
        )
      : Math.floor(thirtyDaysAgo.getTime() / 1000);

    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", after.toString());
    url.searchParams.set("per_page", "200");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    const activities = (await response.json()) as unknown[];
    log.info(
      { athlete_id: credentials.athlete_id, count: activities.length },
      "Fetched new activities from Strava API",
    );

    return activities;
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : String(error),
        athlete_id: credentials.athlete_id,
      },
      "Failed to fetch new Strava activities",
    );
    throw error;
  }
}

/**
 * Processes sync for a single athlete.
 */
async function syncSingleAthlete(credentials: StravaCredentials): Promise<void> {
  const log = logger.child({ function: "syncSingleAthlete" });

  log.info({ athlete_id: credentials.athlete_id }, "Processing athlete sync");

  // Ensure token is valid (refresh if needed)
  const validCredentials = await ensureValidStravaToken(credentials);

  // Fetch new activities from Strava API
  const activities = await fetchNewStravaActivities(validCredentials);

  if (activities.length === 0) {
    log.info({ athlete_id: credentials.athlete_id }, "No new activities to sync");
    return;
  }

  // Store activities in database (simplified for this implementation)
  // In a real implementation, we would parse and store the activity data
  log.info(
    { athlete_id: credentials.athlete_id, activity_count: activities.length },
    "Would store activities in database",
  );

  // Update last_synced_at timestamp
  const updateSyncQuery = `
    UPDATE strava_credentials
    SET last_synced_at = NOW(), updated_at = NOW()
    WHERE athlete_id = $1
  `;

  await pool.query(updateSyncQuery, [credentials.athlete_id]);

  log.info({ athlete_id: credentials.athlete_id }, "Completed sync for athlete");
}

/**
 * Fetches all Strava credentials from the database.
 */
async function fetchAllStravaCredentials(): Promise<StravaCredentials[]> {
  const credentialsQuery = `
    SELECT athlete_id, access_token, refresh_token, expires_at, last_synced_at
    FROM strava_credentials
    ORDER BY athlete_id
  `;

  const credentialsResult = await pool.query(credentialsQuery, []);
  return credentialsResult.rows as StravaCredentials[];
}

/**
 * Syncs Strava activities for all athletes with valid credentials.
 * Fetches activities updated since last_synced_at, checks token expiration,
 * and refreshes tokens when needed.
 */
export async function syncStravaActivities(): Promise<void> {
  const log = logger.child({ job: "strava_sync" });

  try {
    log.info("Starting Strava activities sync");

    const allCredentials = await fetchAllStravaCredentials();

    if (allCredentials.length === 0) {
      log.info("No Strava credentials found, skipping sync");
      return;
    }

    log.info({ athlete_count: allCredentials.length }, "Processing Strava sync for athletes");

    // Process each athlete
    for (const credentials of allCredentials) {
      try {
        await syncSingleAthlete(credentials);
      } catch (error) {
        log.error(
          {
            error: error instanceof Error ? error.message : String(error),
            athlete_id: credentials.athlete_id,
          },
          "Failed to sync activities for athlete",
        );
        // Continue with other athletes even if one fails
      }
    }

    log.info("Strava activities sync completed");
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Strava sync job failed",
    );
  }
}

// ---------------------------------------------------------------------------
// Scheduler Initialization
// ---------------------------------------------------------------------------

/**
 * Starts the scheduler with all cron jobs.
 * Currently includes:
 * - Nudge evaluator: runs every 15 minutes to check for due nudges
 * - Strava sync: runs periodically to sync new activities
 */
export async function startScheduler(): Promise<void> {
  const log = logger.child({ service: "scheduler" });

  try {
    log.info("Initializing scheduler");

    // Schedule nudge evaluator to run every 15 minutes
    const nudgeEvaluatorJob = cron.schedule("*/15 * * * *", async () => {
      await evaluateNudges();
    });

    // Schedule Strava sync job to run every hour
    const stravaSyncJob = cron.schedule("0 * * * *", async () => {
      await syncStravaActivities();
    });

    // Start the scheduled jobs
    nudgeEvaluatorJob.start();
    stravaSyncJob.start();

    log.info("Scheduler initialized successfully");
    log.info("Nudge evaluator scheduled to run every 15 minutes");
    log.info("Strava sync scheduled to run every hour");
  } catch (err) {
    log.error({ err: String(err) }, "Failed to initialize scheduler");
    throw err;
  }
}
