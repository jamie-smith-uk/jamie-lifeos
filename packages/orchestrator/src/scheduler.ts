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
// Scheduler Initialization
// ---------------------------------------------------------------------------

/**
 * Starts the scheduler with all cron jobs.
 * Currently includes:
 * - Nudge evaluator: runs every 15 minutes to check for due nudges
 */
export async function startScheduler(): Promise<void> {
  const log = logger.child({ service: "scheduler" });

  try {
    log.info("Initializing scheduler");

    // Schedule nudge evaluator to run every 15 minutes
    const nudgeEvaluatorJob = cron.schedule("*/15 * * * *", async () => {
      await evaluateNudges();
    });

    // Start the scheduled job
    nudgeEvaluatorJob.start();

    log.info("Scheduler initialized successfully");
    log.info("Nudge evaluator scheduled to run every 15 minutes");
  } catch (err) {
    log.error({ err: String(err) }, "Failed to initialize scheduler");
    throw err;
  }
}
