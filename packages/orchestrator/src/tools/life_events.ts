/**
 * life_events.ts — Life events database tools
 *
 * Provides functions to create and manage life events for people.
 * Supports automatic recurring flag for birthdays and anniversaries.
 *
 * All functions return JSON strings and never throw exceptions.
 * All database queries use parameterized statements.
 */

import { logger, pool } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LifeEventInfo {
  id: string;
  person_id: number;
  event_type: string;
  event_date: string;
  is_recurring: boolean;
  notes?: string;
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
 * Validates all string inputs for a life event record.
 */
function validateLifeEventInputs(params: {
  person_name?: string;
  event_type?: string;
  event_date?: string;
  notes?: string;
}): string | null {
  // Validate person_name (required, max 255 chars)
  if (
    !params.person_name ||
    typeof params.person_name !== "string" ||
    params.person_name.trim().length === 0
  ) {
    return "'person_name' is required and cannot be empty";
  }

  const nameError = validateStringLength(params.person_name, "person_name", 255);
  if (nameError) return nameError;

  // Validate event_type (required, max 100 chars)
  if (
    !params.event_type ||
    typeof params.event_type !== "string" ||
    params.event_type.trim().length === 0
  ) {
    return "'event_type' is required and cannot be empty";
  }

  const eventTypeError = validateStringLength(params.event_type, "event_type", 100);
  if (eventTypeError) return eventTypeError;

  // Validate event_date (required, must be valid date format)
  if (
    !params.event_date ||
    typeof params.event_date !== "string" ||
    params.event_date.trim().length === 0
  ) {
    return "'event_date' is required and cannot be empty";
  }

  // Basic date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.event_date)) {
    return "'event_date' must be in YYYY-MM-DD format";
  }

  // Validate optional notes field
  const notesError = validateStringLength(params.notes, "notes", 10000);
  if (notesError) return notesError;

  return null;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Converts a database row to a LifeEventInfo object.
 */
function rowToLifeEventInfo(row: {
  id: number;
  person_id: number;
  event_type: string;
  event_date: string;
  is_recurring: boolean;
  notes?: string;
  created_at: Date;
}): LifeEventInfo {
  return {
    id: String(row.id),
    person_id: row.person_id,
    event_type: row.event_type,
    event_date: row.event_date,
    is_recurring: row.is_recurring,
    notes: row.notes || undefined,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Performs fuzzy name matching using ILIKE with wildcards.
 */
function buildFuzzyNameQuery(name: string): string {
  // Remove extra spaces and convert to lowercase for matching
  const cleanName = name.trim().toLowerCase();
  return `%${cleanName}%`;
}

/**
 * Finds a person by name using fuzzy matching.
 */
async function findPersonByName(name: string): Promise<{
  id: number;
  name: string;
  relationship_type?: string;
  how_known?: string;
  notes?: string;
  last_interaction_at?: Date;
} | null> {
  const fuzzyName = buildFuzzyNameQuery(name);
  const findResult = await pool.query(
    `SELECT id, name, relationship_type, how_known, notes, last_interaction_at
     FROM people
     WHERE name ILIKE $1
     ORDER BY 
       CASE WHEN LOWER(name) = LOWER($2) THEN 1 ELSE 2 END,
       name
     LIMIT 1`,
    [fuzzyName, name.trim()],
  );

  return findResult.rows.length > 0 ? findResult.rows[0] : null;
}

/**
 * Determines if an event type should be recurring.
 */
function isRecurringEventType(eventType: string): boolean {
  const recurringTypes = ["birthday", "anniversary"];
  return recurringTypes.includes(eventType.toLowerCase());
}

// ---------------------------------------------------------------------------
// Tool Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new life event record.
 */
async function createLifeEvent(input: string): Promise<string> {
  const log = logger.child({ tool: "create_life_event" });

  try {
    const params = JSON.parse(input);
    const { person_name, event_type, event_date, notes } = params;

    // Validate all string inputs for length constraints
    const validationError = validateLifeEventInputs(params);
    if (validationError) {
      return JSON.stringify({ error: `create_life_event: ${validationError}` });
    }

    // Find the person using fuzzy matching
    const person = await findPersonByName(person_name);
    if (!person) {
      return JSON.stringify({
        success: false,
        message: `No person found matching "${person_name}"`,
      });
    }

    // Determine if this event type should be recurring
    const isRecurring = isRecurringEventType(event_type);

    // Create the life event record
    const result = await pool.query(
      `INSERT INTO life_events (person_id, event_type, event_date, is_recurring, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, person_id, event_type, event_date, is_recurring, notes, created_at`,
      [person.id, event_type.trim(), event_date, isRecurring, notes || null],
    );

    const lifeEvent = rowToLifeEventInfo(result.rows[0]);
    log.info({ person_id: person.id, life_event_id: lifeEvent.id }, "Life event created");

    return JSON.stringify({
      success: true,
      life_event: lifeEvent,
      message: "Life event created successfully",
    });
  } catch (err) {
    log.error({ err: String(err) }, "create_life_event failed");
    return JSON.stringify({ error: "create_life_event failed" });
  }
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

/**
 * Executes life events tool operations.
 */
export async function executeLifeEventsTool(operation: string, input: string): Promise<string> {
  switch (operation) {
    case "create_life_event":
      return createLifeEvent(input);

    default:
      return JSON.stringify({ error: `Unknown life events operation: ${operation}` });
  }
}
