/**
 * context.ts — System prompt context assembly for the orchestrator.
 *
 * Task-9a: Provides getActivitySummary function to query and format last 7 days
 * Strava activity summary for inclusion in the system prompt.
 *
 * The activity summary includes:
 * - Activity count for the last 7 days
 * - Total moving time for the last 7 days
 * - Last activity sport type and date
 * - Graceful handling when no activities exist
 */

import { logger, pool } from "@lifeos/shared";

/**
 * Interface for Strava activity data returned from database queries
 */
interface StravaActivity {
  id: number;
  strava_id: number;
  athlete_id: number;
  name: string;
  sport_type: string;
  start_date: string;
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
 * Formats moving time in seconds to a human-readable format.
 * Returns time in minutes for durations under 2 hours, otherwise in hours.
 *
 * @param totalSeconds  Total moving time in seconds
 * @returns             Formatted time string (e.g., "30 minutes", "2 hours")
 */
function formatMovingTime(totalSeconds: number): string {
  if (totalSeconds === 0) {
    return "0 minutes";
  }

  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 120) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.round(totalMinutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Formats a date string to a human-readable format.
 *
 * @param dateStr  Date string in YYYY-MM-DD format
 * @returns        Formatted date string
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0];
}

/**
 * Query and format last 7 days Strava activity summary for system prompt inclusion.
 *
 * Returns a formatted string containing:
 * - Activity count for the last 7 days
 * - Total moving time for the last 7 days in human-readable format
 * - Last activity sport type and date (if any activities exist)
 *
 * Handles the case where no activities exist gracefully by returning appropriate
 * default values.
 *
 * @param athleteId  The Strava athlete ID to query activities for
 * @returns          Formatted activity summary string
 */
export async function getActivitySummary(athleteId: number): Promise<string> {
  const log = logger.child({ function: "getActivitySummary" });

  try {
    // Query activities from the last 7 days
    const query = `
      SELECT id, strava_id, athlete_id, name, sport_type, start_date,
             distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
             average_speed_ms, max_speed_ms, average_heartrate, max_heartrate,
             average_watts, kilojoules, suffer_score
      FROM strava_activities
      WHERE athlete_id = $1
        AND start_date >= NOW() - INTERVAL '7 days'
      ORDER BY start_date DESC
    `;

    const result = await pool.query(query, [athleteId]);
    const activities = result.rows as StravaActivity[];

    // Calculate summary statistics
    const activityCount = activities.length;
    const totalMovingTimeS = activities.reduce((sum, activity) => {
      return sum + (activity.moving_time_s || 0);
    }, 0);

    // Format moving time
    const formattedMovingTime = formatMovingTime(totalMovingTimeS);

    // Get last activity details
    let lastActivityInfo = "";
    if (activities.length > 0) {
      const lastActivity = activities[0]; // Already sorted by start_date DESC
      const formattedDate = formatDate(lastActivity.start_date);
      lastActivityInfo = ` Last activity: ${lastActivity.sport_type} on ${formattedDate}.`;
    }

    // Build summary string
    const summary = `Last 7 days: ${activityCount} activit${activityCount === 1 ? "y" : "ies"}, ${formattedMovingTime} total moving time.${lastActivityInfo}`;

    log.info(`Generated activity summary for athlete ${athleteId}: ${activityCount} activities`);

    return summary;
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error), athlete_id: athleteId },
      "Failed to get activity summary",
    );

    // Return graceful fallback on error
    return "Last 7 days: 0 activities, 0 minutes total moving time.";
  }
}
