/**
 * people.ts — People graph database tools
 *
 * Provides functions to create, get, update, and log interactions with people.
 * Supports fuzzy name matching and relationship tracking for email-to-person linking.
 *
 * All functions return JSON strings and never throw exceptions.
 * All database queries use parameterized statements.
 */

import { logger, pool } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonInfo {
  id?: string;
  name: string;
  relationship_type?: string;
  how_known?: string;
  notes?: string;
  last_interaction_at?: string;
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
 * Validates all string inputs for a person record.
 */
function validatePersonInputs(params: {
  name?: string;
  notes?: string;
  relationship_type?: string;
  how_known?: string;
}): string | null {
  // Validate name (required, max 255 chars)
  if (!params.name || typeof params.name !== "string" || params.name.trim().length === 0) {
    return "'name' is required and cannot be empty";
  }

  const nameError = validateStringLength(params.name, "name", 255);
  if (nameError) return nameError;

  // Validate optional fields
  const notesError = validateStringLength(params.notes, "notes", 10000);
  if (notesError) return notesError;

  const relationshipError = validateStringLength(
    params.relationship_type,
    "relationship_type",
    100,
  );
  if (relationshipError) return relationshipError;

  const howKnownError = validateStringLength(params.how_known, "how_known", 500);
  if (howKnownError) return howKnownError;

  return null;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Converts a database row to a PersonInfo object.
 */
function rowToPersonInfo(row: {
  id: number;
  name: string;
  relationship_type?: string;
  how_known?: string;
  notes?: string;
  last_interaction_at?: Date;
}): PersonInfo {
  return {
    id: String(row.id),
    name: row.name,
    relationship_type: row.relationship_type || undefined,
    how_known: row.how_known || undefined,
    notes: row.notes || undefined,
    last_interaction_at: row.last_interaction_at?.toISOString() || undefined,
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
async function findPersonByNameForUpdate(name: string): Promise<{
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
 * Merges new notes with existing notes.
 */
function mergeNotes(existingNotes: string | null, newNotes: string | undefined): string | null {
  if (!newNotes || typeof newNotes !== "string" || newNotes.trim().length === 0) {
    return existingNotes;
  }

  const trimmedNewNotes = newNotes.trim();
  if (existingNotes) {
    return `${existingNotes}\n\n${trimmedNewNotes}`;
  }
  return trimmedNewNotes;
}

// ---------------------------------------------------------------------------
// Tool Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new person record.
 */
async function createPerson(input: string): Promise<string> {
  const log = logger.child({ tool: "create_person" });

  try {
    const params = JSON.parse(input);
    const { name, relationship_type, how_known, notes } = params;

    // Validate all string inputs for length constraints
    const validationError = validatePersonInputs(params);
    if (validationError) {
      return JSON.stringify({ error: `create_person: ${validationError}` });
    }

    const result = await pool.query(
      `INSERT INTO people (name, relationship_type, how_known, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, relationship_type, how_known, notes, last_interaction_at`,
      [name.trim(), relationship_type || null, how_known || null, notes || null],
    );

    const person = rowToPersonInfo(result.rows[0]);
    log.info({ person_id: person.id }, "Person created");

    return JSON.stringify({
      success: true,
      person,
      message: `Created person record for ${person.name}`,
    });
  } catch (err) {
    log.error({ err: String(err) }, "create_person failed");
    return JSON.stringify({ error: "create_person failed" });
  }
}

/**
 * Gets a person record by name using fuzzy matching.
 */
async function getPerson(input: string): Promise<string> {
  const log = logger.child({ tool: "get_person" });

  try {
    const params = JSON.parse(input);
    const { name } = params;

    // Validate name input for length constraints
    const validationError = validatePersonInputs({ name });
    if (validationError) {
      return JSON.stringify({ error: `get_person: ${validationError}` });
    }

    const fuzzyName = buildFuzzyNameQuery(name);
    const result = await pool.query(
      `SELECT id, name, relationship_type, how_known, notes, last_interaction_at
       FROM people
       WHERE name ILIKE $1
       ORDER BY 
         CASE WHEN LOWER(name) = LOWER($2) THEN 1 ELSE 2 END,
         name
       LIMIT 1`,
      [fuzzyName, name.trim()],
    );

    if (result.rows.length === 0) {
      return JSON.stringify({
        success: false,
        message: `No person found matching "${name}"`,
      });
    }

    const person = rowToPersonInfo(result.rows[0]);
    log.info({ person_id: person.id }, "Person retrieved");

    return JSON.stringify({
      success: true,
      person,
    });
  } catch (err) {
    log.error({ err: String(err) }, "get_person failed");
    return JSON.stringify({ error: "get_person failed" });
  }
}

/**
 * Updates a person record by merging new notes into existing record.
 */
async function updatePerson(input: string): Promise<string> {
  const log = logger.child({ tool: "update_person" });

  try {
    const params = JSON.parse(input);
    const { name, notes, relationship_type, how_known } = params;

    // Validate all string inputs for length constraints
    const validationError = validatePersonInputs(params);
    if (validationError) {
      return JSON.stringify({ error: `update_person: ${validationError}` });
    }

    // Find the person using fuzzy matching
    const existingPerson = await findPersonByNameForUpdate(name);
    if (!existingPerson) {
      return JSON.stringify({
        success: false,
        message: `No person found matching "${name}"`,
      });
    }

    // Merge notes if provided
    const mergedNotes = mergeNotes(existingPerson.notes || null, notes);

    // Update the record
    const updateResult = await pool.query(
      `UPDATE people 
       SET relationship_type = COALESCE($2, relationship_type),
           how_known = COALESCE($3, how_known),
           notes = $4
       WHERE id = $1
       RETURNING id, name, relationship_type, how_known, notes, last_interaction_at`,
      [existingPerson.id, relationship_type || null, how_known || null, mergedNotes],
    );

    const updatedPerson = rowToPersonInfo(updateResult.rows[0]);
    log.info({ person_id: updatedPerson.id }, "Person updated");

    return JSON.stringify({
      success: true,
      person: updatedPerson,
      message: `Updated person record for ${updatedPerson.name}`,
    });
  } catch (err) {
    log.error({ err: String(err) }, "update_person failed");
    return JSON.stringify({ error: "update_person failed" });
  }
}

/**
 * Gets people sorted by last_interaction_at with threshold filter.
 */
async function getLapsedContacts(input: string): Promise<string> {
  const log = logger.child({ tool: "get_lapsed_contacts" });

  try {
    const params = JSON.parse(input);
    const { days_threshold = 30 } = params;

    if (typeof days_threshold !== "number" || days_threshold < 0) {
      return JSON.stringify({
        error: "get_lapsed_contacts: 'days_threshold' must be a non-negative number",
      });
    }

    const result = await pool.query(
      `SELECT id, name, relationship_type, how_known, notes, last_interaction_at
       FROM people
       WHERE last_interaction_at IS NULL 
          OR last_interaction_at < (now() - interval '1 day' * $1)
       ORDER BY 
         last_interaction_at ASC NULLS FIRST,
         name ASC`,
      [days_threshold],
    );

    const lapsedContacts = result.rows.map(rowToPersonInfo);

    log.info(
      {
        count: lapsedContacts.length,
        days_threshold,
      },
      "Retrieved lapsed contacts",
    );

    return JSON.stringify({
      success: true,
      lapsed_contacts: lapsedContacts,
      count: lapsedContacts.length,
      days_threshold,
    });
  } catch (err) {
    log.error({ err: String(err) }, "get_lapsed_contacts failed");
    return JSON.stringify({ error: "get_lapsed_contacts failed" });
  }
}

/**
 * Logs an interaction with a person and updates their last_interaction_at.
 */
async function logInteraction(input: string): Promise<string> {
  const log = logger.child({ tool: "log_interaction" });

  try {
    const params = JSON.parse(input);
    const { name, notes } = params;

    // Validate string inputs for length constraints
    const validationError = validatePersonInputs({ name, notes });
    if (validationError) {
      return JSON.stringify({ error: `log_interaction: ${validationError}` });
    }

    // Find the person using fuzzy matching
    const existingPerson = await findPersonByNameForUpdate(name);
    if (!existingPerson) {
      return JSON.stringify({
        success: false,
        message: `No person found matching "${name}"`,
      });
    }

    // Create interaction record
    const interactionResult = await pool.query(
      `INSERT INTO interactions (person_id, notes, interacted_at, created_at)
       VALUES ($1, $2, now(), now())
       RETURNING id, person_id, notes, interacted_at, created_at`,
      [existingPerson.id, notes || null],
    );

    const interaction = interactionResult.rows[0];

    // Update person's last_interaction_at
    const personUpdateResult = await pool.query(
      `UPDATE people 
       SET last_interaction_at = now()
       WHERE id = $1
       RETURNING id, name, relationship_type, how_known, notes, last_interaction_at`,
      [existingPerson.id],
    );

    const updatedPerson = rowToPersonInfo(personUpdateResult.rows[0]);

    log.info(
      {
        person_id: updatedPerson.id,
        interaction_id: interaction.id,
      },
      "Interaction logged",
    );

    return JSON.stringify({
      success: true,
      interaction: {
        id: String(interaction.id),
        person_id: interaction.person_id,
        notes: interaction.notes,
        interacted_at: interaction.interacted_at.toISOString(),
        created_at: interaction.created_at.toISOString(),
      },
      person: updatedPerson,
      message: `Logged interaction with ${updatedPerson.name}`,
    });
  } catch (err) {
    log.error({ err: String(err) }, "log_interaction failed");
    return JSON.stringify({ error: "log_interaction failed" });
  }
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

/**
 * Executes people tool operations.
 */
export async function executePeopleTool(operation: string, input: string): Promise<string> {
  switch (operation) {
    case "create_person":
      return createPerson(input);

    case "get_person":
      return getPerson(input);

    case "update_person":
      return updatePerson(input);

    case "get_lapsed_contacts":
      return getLapsedContacts(input);

    case "log_interaction":
      return logInteraction(input);

    default:
      return JSON.stringify({ error: `Unknown people operation: ${operation}` });
  }
}
