/**
 * nudges.ts — Nudges database tools
 *
 * Provides functions to create and dismiss nudges for reminding users
 * about important life events and interactions.
 *
 * All functions return JSON strings and never throw exceptions.
 * All database queries use parameterized statements.
 */

import { logger, pool } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NudgeInfo {
  id: string;
  person_id: number | null;
  life_event_id: number | null;
  message: string;
  trigger_at: string;
  status: string;
  sent_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

/**
 * Validates string input length constraints for security.
 */
function validateStringLength(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }

  if (value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }

  return null;
}

/**
 * Validates person_id input.
 */
function validatePersonId(person_id: unknown): string | null {
  if (person_id === undefined || person_id === null) {
    return "'person_id' is required";
  }

  if (typeof person_id !== "number" || !Number.isInteger(person_id)) {
    return "'person_id' must be an integer";
  }

  return null;
}

/**
 * Validates life_event_id input.
 */
function validateLifeEventId(life_event_id: unknown): string | null {
  if (life_event_id !== null && life_event_id !== undefined) {
    if (typeof life_event_id !== "number" || !Number.isInteger(life_event_id)) {
      return "'life_event_id' must be an integer or null";
    }
  }

  return null;
}

/**
 * Validates message input.
 */
function validateMessage(message: unknown): string | null {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return "'message' is required and cannot be empty";
  }

  return validateStringLength(message, "message", 10000);
}

/**
 * Validates trigger_at input.
 */
function validateTriggerAt(trigger_at: unknown): string | null {
  if (!trigger_at || typeof trigger_at !== "string" || trigger_at.trim().length === 0) {
    return "'trigger_at' is required and cannot be empty";
  }

  const triggerDate = new Date(trigger_at);
  if (Number.isNaN(triggerDate.getTime())) {
    return "'trigger_at' must be a valid ISO date string";
  }

  return null;
}

/**
 * Validates inputs for create_nudge.
 */
function validateCreateNudgeInputs(params: {
  person_id?: unknown;
  life_event_id?: unknown;
  message?: unknown;
  trigger_at?: unknown;
}): string | null {
  const personIdError = validatePersonId(params.person_id);
  if (personIdError) return personIdError;

  const lifeEventIdError = validateLifeEventId(params.life_event_id);
  if (lifeEventIdError) return lifeEventIdError;

  const messageError = validateMessage(params.message);
  if (messageError) return messageError;

  const triggerAtError = validateTriggerAt(params.trigger_at);
  if (triggerAtError) return triggerAtError;

  return null;
}

/**
 * Validates inputs for dismiss_nudge.
 */
function validateDismissNudgeInputs(params: { nudge_id?: unknown }): string | null {
  // Validate nudge_id (required, must be number)
  if (params.nudge_id === undefined || params.nudge_id === null) {
    return "'nudge_id' is required";
  }

  if (typeof params.nudge_id !== "number" || !Number.isInteger(params.nudge_id)) {
    return "'nudge_id' must be an integer";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Converts a database row to a NudgeInfo object.
 */
function rowToNudgeInfo(row: {
  id: number;
  person_id: number | null;
  life_event_id: number | null;
  message: string;
  trigger_at: Date;
  status: string;
  sent_at: Date | null;
  dismissed_at: Date | null;
  created_at: Date;
}): NudgeInfo {
  return {
    id: String(row.id),
    person_id: row.person_id,
    life_event_id: row.life_event_id,
    message: row.message,
    trigger_at: row.trigger_at.toISOString(),
    status: row.status,
    sent_at: row.sent_at?.toISOString() || null,
    dismissed_at: row.dismissed_at?.toISOString() || null,
    created_at: row.created_at.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tool Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new nudge record.
 */
async function createNudge(input: string): Promise<string> {
  const log = logger.child({ tool: "create_nudge" });

  try {
    const params = JSON.parse(input);
    const { person_id, life_event_id, message, trigger_at } = params;

    // Validate all inputs
    const validationError = validateCreateNudgeInputs(params);
    if (validationError) {
      return JSON.stringify({ success: false, error: `create_nudge: ${validationError}` });
    }

    // Create the nudge record
    const result = await pool.query(
      `INSERT INTO nudges (person_id, life_event_id, message, trigger_at, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, person_id, life_event_id, message, trigger_at, status, sent_at, dismissed_at, created_at`,
      [person_id, life_event_id || null, message.trim(), trigger_at],
    );

    const nudge = rowToNudgeInfo(result.rows[0]);
    log.info({ nudge_id: nudge.id }, "Nudge created");

    return JSON.stringify({
      success: true,
      nudge,
      message: "Nudge created successfully",
    });
  } catch (err) {
    log.error({ err: String(err) }, "create_nudge failed");
    return JSON.stringify({ success: false, error: "create_nudge failed" });
  }
}

/**
 * Dismisses a nudge by setting status to 'dismissed' and dismissed_at timestamp.
 */
async function dismissNudge(input: string): Promise<string> {
  const log = logger.child({ tool: "dismiss_nudge" });

  try {
    const params = JSON.parse(input);
    const { nudge_id } = params;

    // Validate inputs
    const validationError = validateDismissNudgeInputs(params);
    if (validationError) {
      return JSON.stringify({ success: false, error: `dismiss_nudge: ${validationError}` });
    }

    // Update the nudge record
    const result = await pool.query(
      `UPDATE nudges 
       SET status = 'dismissed', dismissed_at = now()
       WHERE id = $1
       RETURNING id, person_id, life_event_id, message, trigger_at, status, sent_at, dismissed_at, created_at`,
      [nudge_id],
    );

    if (result.rows.length === 0) {
      return JSON.stringify({
        success: false,
        error: `No nudge found with id ${nudge_id}`,
      });
    }

    const nudge = rowToNudgeInfo(result.rows[0]);
    log.info({ nudge_id: nudge.id }, "Nudge dismissed");

    return JSON.stringify({
      success: true,
      nudge,
      message: "Nudge dismissed successfully",
    });
  } catch (err) {
    log.error({ err: String(err) }, "dismiss_nudge failed");
    return JSON.stringify({ success: false, error: "dismiss_nudge failed" });
  }
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

/**
 * Executes nudges tool operations.
 */
export async function executeNudgesTool(input: string): Promise<string> {
  try {
    const params = JSON.parse(input);
    const { operation } = params;

    // Route based on operation field, default to create_nudge if not specified
    if (operation === "dismiss_nudge") {
      return dismissNudge(input);
    }

    // Default to create_nudge operation
    return createNudge(input);
  } catch (_err) {
    return JSON.stringify({ success: false, error: "Invalid JSON input" });
  }
}
