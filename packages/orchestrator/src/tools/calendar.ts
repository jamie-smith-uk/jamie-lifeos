/**
 * calendar.ts — Google Calendar MCP tool wrappers for the orchestrator agent.
 *
 * T-12: Read operations
 *   - get_todays_events   — fetch all events for today (no parameters)
 *   - get_events_range    — fetch events between two ISO 8601 datetimes
 *
 * T-13: 'What have I got today?' intent
 *   - getTodaysEvents empty-state message updated to "You have nothing scheduled today."
 *     so the agent can relay this clearly to the user.
 *   - Tool descriptions updated to guide the model to format results as a
 *     readable chronological list with start time, title, and location.
 *
 * T-14: Events on a specific date or range
 *   - getEventsRangeTool description extended with explicit natural language date
 *     resolution rules: 'next Tuesday', 'this week' (Mon–Sun), 'tomorrow', etc.
 *   - Tool description instructs the model to use the TZ from the system prompt
 *     Live Context block (not UTC) when resolving date boundaries.
 *   - Week boundary rule: 'this week' = Monday 00:00:00 local → Sunday 23:59:59 local.
 *   - Single-day queries use 00:00:00 → 23:59:59 in the local timezone.
 *
 * T-15: Write operations (confirmation-gated — NOT called directly by the agent)
 *   - create_event    — create a new calendar event
 *   - update_event    — update fields on an existing event by eventId
 *   - delete_event    — delete an existing event by eventId
 *   - check_free_busy — query free/busy status for a time range
 *
 *   These write tools are included in the agent's tool definitions array so
 *   the model is aware of them, but they MUST NOT be executed directly by the
 *   agent. The orchestrator's confirmation executor calls them only after the
 *   user explicitly confirms the proposed mutation.
 *
 * Each tool is represented in two forms:
 *   1. An Anthropic tool definition object (Tool) that is included in the
 *      messages.create() call so the model knows it can invoke the tool.
 *   2. An async executor function that calls the Google Calendar MCP server
 *      and returns a human-readable string result.
 *
 * The MCP server is called via the Model Context Protocol HTTP transport.
 * The MCP server URL is sourced from process.env.GOOGLE_CALENDAR_MCP_URL
 * (defaults to "https://gcal.mcp.claude.com"). No API keys are embedded in
 * this file — all secrets remain in environment variables.
 *
 * Empty calendar responses are handled gracefully: getTodaysEvents returns
 * "You have nothing scheduled today." so the agent can relay this to the
 * user without special-casing.
 *
 * Security rules applied:
 *   - No secrets hard-coded; MCP URL read from process.env only.
 *   - Input parameters are validated (ISO 8601 format check) before
 *     being forwarded to the MCP server.
 *   - All external errors are caught and returned as structured error
 *     strings so the agent loop never crashes on a calendar failure.
 *   - No SQL, no DB access — this module is pure MCP client code.
 *   - Write tools are never executed directly by the agent; only called
 *     by the confirmation executor after explicit user approval.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { env, logger } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = logger.child({ service: "calendar-tools" });

// ---------------------------------------------------------------------------
// MCP client helpers
// ---------------------------------------------------------------------------

/**
 * Base URL for the Google Calendar MCP server.
 * Sourced exclusively from process.env — never hard-coded.
 */
function getMcpBaseUrl(): string {
  return (process.env["GOOGLE_CALENDAR_MCP_URL"] ?? "https://gcal.mcp.claude.com").replace(
    /\/+$/,
    "",
  );
}

/**
 * Validate that a string is an ISO 8601 datetime.
 * Accepts the common subset used by the MCP contract:
 *   YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, YYYY-MM-DDTHH:MM:SSZ,
 *   YYYY-MM-DDTHH:MM:SS+HH:MM, etc.
 *
 * Returns true if the string looks like a valid ISO 8601 value.
 */
function isIso8601(value: string): boolean {
  // ISO 8601 date or datetime pattern (lenient but covers the MCP contract)
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([.,]\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
    value,
  );
}

/**
 * Shared MCP tool-call helper.
 *
 * Sends a JSON-RPC 2.0 "tools/call" request to the MCP server and returns
 * the parsed result content. Throws on HTTP errors or MCP-level errors.
 *
 * @param toolName  The MCP tool name (e.g. "get_todays_events").
 * @param params    Tool input parameters (already validated by the caller).
 * @returns         The raw result string from the MCP server.
 */
async function callMcpTool(
  toolName: string,
  params: Record<string, unknown>,
): Promise<string> {
  const url = `${getMcpBaseUrl()}/mcp`;

  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: params,
    },
  };

  log.info({ toolName, params }, "Calling Google Calendar MCP tool");

  const token = env.GOOGLE_CALENDAR_MCP_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    log.warn("GOOGLE_CALENDAR_MCP_TOKEN is not set — MCP requests will be unauthenticated");
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `MCP server returned HTTP ${response.status}: ${errorText}`,
    );
  }

  const json = (await response.json()) as {
    result?: { content?: Array<{ type: string; text?: string }> };
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
  }

  // Extract text content from the MCP result
  const content = json.result?.content ?? [];
  const textParts = content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string);

  return textParts.join("\n").trim();
}

// ---------------------------------------------------------------------------
// Tool: get_todays_events
// ---------------------------------------------------------------------------

/**
 * Anthropic tool definition for get_todays_events.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "get_todays_events"
 *   description:  Returns all calendar events for today in chronological order.
 *   input_schema: No required parameters.
 *
 * T-13: Description updated to instruct the model to format results as a
 * readable chronological list with start time, title, and location (if present).
 * If the tool returns no events, the agent should respond with
 * "You have nothing scheduled today."
 */
export const getTodaysEventsTool: Anthropic.Tool = {
  name: "get_todays_events",
  description:
    "Returns all calendar events for today in chronological order. " +
    "Use this when the user asks about today's schedule, what they have on today, " +
    "or any variation of 'what do I have today?'. " +
    "When presenting the result to the user, format each event as a list item with " +
    "the start time, event title, and location (if present). " +
    "Events must be in chronological order (earliest first). " +
    "If there are no events, respond with 'You have nothing scheduled today.'",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

/**
 * Execute the get_todays_events tool.
 *
 * Calls the Google Calendar MCP server with no parameters and returns a
 * formatted string of today's events. If the calendar is empty, returns the
 * graceful empty-state message "You have nothing scheduled today." so the
 * agent can relay this clearly to the user.
 *
 * T-13: Empty-state message updated to "You have nothing scheduled today."
 * to match the acceptance criteria.
 *
 * @returns Human-readable string of today's events, or the empty-state message.
 */
export async function getTodaysEvents(): Promise<string> {
  try {
    const result = await callMcpTool("get_todays_events", {});

    if (!result || result.trim() === "") {
      return "You have nothing scheduled today.";
    }

    return result;
  } catch (err) {
    log.error({ err }, "get_todays_events MCP call failed");
    return JSON.stringify({
      error: "Failed to fetch today's events",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool: get_events_range
// ---------------------------------------------------------------------------

/**
 * Anthropic tool definition for get_events_range.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "get_events_range"
 *   description:  Returns calendar events between a start and end datetime.
 *   input_schema: start (ISO 8601), end (ISO 8601) — both required.
 *
 * T-14: Description extended with natural language date resolution rules.
 * The model must resolve relative date references using the current datetime
 * and timezone provided in the Live Context block of the system prompt.
 */
export const getEventsRangeTool: Anthropic.Tool = {
  name: "get_events_range",
  description:
    "Returns all calendar events between a start and end datetime. " +
    "Use this when the user asks about events on a specific date, a date range, " +
    "or uses natural language like 'next Tuesday', 'this week', 'tomorrow', " +
    "'next week', 'this weekend', or any named day of the week. " +
    "\n\n" +
    "IMPORTANT — Date resolution rules (T-14):\n" +
    "Always resolve natural language date references using the current datetime AND " +
    "timezone from the Live Context block in the system prompt. Never use UTC as the " +
    "local timezone unless the system prompt explicitly states the timezone is UTC.\n" +
    "\n" +
    "Single-day queries (e.g. 'next Tuesday', 'tomorrow', 'Friday'):\n" +
    "  start = YYYY-MM-DDT00:00:00<tz-offset>  (midnight at start of that day in local TZ)\n" +
    "  end   = YYYY-MM-DDT23:59:59<tz-offset>  (last second of that day in local TZ)\n" +
    "\n" +
    "Week queries (e.g. 'this week', 'next week'):\n" +
    "  'This week' = Monday of the current ISO week at 00:00:00 local TZ through " +
    "Sunday of the same week at 23:59:59 local TZ.\n" +
    "  'Next week' = Monday of the next ISO week at 00:00:00 local TZ through " +
    "Sunday of that week at 23:59:59 local TZ.\n" +
    "\n" +
    "Examples (assuming TZ is Europe/London at UTC+1 on Monday 2026-04-20):\n" +
    "  'next Tuesday'  → start='2026-04-21T00:00:00+01:00', end='2026-04-21T23:59:59+01:00'\n" +
    "  'this week'     → start='2026-04-20T00:00:00+01:00', end='2026-04-26T23:59:59+01:00'\n" +
    "  'tomorrow'      → start='2026-04-21T00:00:00+01:00', end='2026-04-21T23:59:59+01:00'\n" +
    "\n" +
    "Both start and end must be ISO 8601 datetime strings with the local timezone offset " +
    "(e.g. '2026-04-21T00:00:00+01:00'), not UTC Z-suffix, unless the configured TZ is UTC. " +
    "When presenting results, format each event as a list item with start time, title, and " +
    "location (if present). If no events are found, say so clearly.",
  input_schema: {
    type: "object" as const,
    properties: {
      start: {
        type: "string",
        description:
          "Start of the date/time range in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T00:00:00+01:00'). " +
          "Resolve natural language dates using the current datetime and TZ from the " +
          "system prompt Live Context block. For a single-day query, use midnight (T00:00:00) " +
          "of that day in the local timezone.",
      },
      end: {
        type: "string",
        description:
          "End of the date/time range in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T23:59:59+01:00'). " +
          "For a single-day query, use 23:59:59 of that day in the local timezone. " +
          "For 'this week', use Sunday at 23:59:59 local TZ. Must be after start.",
      },
    },
    required: ["start", "end"],
  },
};

/**
 * Execute the get_events_range tool.
 *
 * Validates that start and end are ISO 8601 strings before calling the MCP
 * server. Returns a formatted string of events in the range, or a graceful
 * "No events" message if the calendar is empty for that period.
 *
 * @param start  ISO 8601 datetime string for the range start.
 * @param end    ISO 8601 datetime string for the range end.
 * @returns      Human-readable string of events in range, or a "No events" message.
 */
export async function getEventsRange(start: string, end: string): Promise<string> {
  // Validate ISO 8601 format before forwarding to MCP server.
  if (!isIso8601(start)) {
    log.warn({ start }, "get_events_range: invalid ISO 8601 start parameter");
    return JSON.stringify({
      error: "Invalid start parameter — must be an ISO 8601 datetime string",
      received: start,
    });
  }

  if (!isIso8601(end)) {
    log.warn({ end }, "get_events_range: invalid ISO 8601 end parameter");
    return JSON.stringify({
      error: "Invalid end parameter — must be an ISO 8601 datetime string",
      received: end,
    });
  }

  try {
    const result = await callMcpTool("get_events_range", { start, end });

    if (!result || result.trim() === "") {
      return `No events found between ${start} and ${end}.`;
    }

    return result;
  } catch (err) {
    log.error({ err, start, end }, "get_events_range MCP call failed");
    return JSON.stringify({
      error: "Failed to fetch events for the requested range",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool: create_event  (T-15 — write, confirmation-gated)
// ---------------------------------------------------------------------------

/**
 * TypeScript types for the create_event tool parameters.
 * Matches the Google Calendar MCP "create_event" contract.
 */
export interface CreateEventParams {
  /** Event title (required). */
  title: string;
  /** ISO 8601 datetime for event start (required). */
  start: string;
  /** ISO 8601 datetime for event end (required). */
  end: string;
  /** Optional location string. */
  location?: string;
  /** Optional plain-text event description. */
  description?: string;
  /** Optional list of attendee email addresses. */
  attendees?: string[];
}

/**
 * Anthropic tool definition for create_event.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "create_event"
 *   input_schema: title, start, end (required); location, description,
 *                 attendees (optional).
 *
 * IMPORTANT: This tool definition is included in the agent's tool list so
 * the model can propose a creation, but it MUST NOT be executed directly
 * by the agent. The confirmation executor in the orchestrator calls
 * createEvent() only after the user explicitly confirms.
 */
export const createEventTool: Anthropic.Tool = {
  name: "create_event",
  description:
    "Creates a new event on the user's Google Calendar. " +
    "Use this when the user asks to schedule, book, or add an event. " +
    "IMPORTANT: Do NOT execute this tool immediately — first present a summary " +
    "of the event details to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval. " +
    "Required fields: title, start (ISO 8601 with TZ offset), end (ISO 8601 with TZ offset). " +
    "Optional fields: location, description, attendees (array of email strings).",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "The event title or summary.",
      },
      start: {
        type: "string",
        description:
          "Event start datetime in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T10:00:00+01:00'). Use the TZ from the Live Context block.",
      },
      end: {
        type: "string",
        description:
          "Event end datetime in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T11:00:00+01:00'). Must be after start.",
      },
      location: {
        type: "string",
        description: "Optional location or address for the event.",
      },
      description: {
        type: "string",
        description: "Optional plain-text description or notes for the event.",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of attendee email addresses.",
      },
    },
    required: ["title", "start", "end"],
  },
};

/**
 * Execute the create_event tool.
 *
 * Validates required parameters and ISO 8601 format before forwarding to
 * the Google Calendar MCP server.
 *
 * NOTE: This function is intended to be called only by the orchestrator's
 * confirmation executor — NEVER directly by the agent.
 *
 * @param params  CreateEventParams — title, start, end, and optional fields.
 * @returns       Human-readable confirmation string, or a structured error string.
 */
export async function createEvent(params: CreateEventParams): Promise<string> {
  const { title, start, end, location, description, attendees } = params;

  if (!title || title.trim() === "") {
    return JSON.stringify({ error: "create_event: 'title' is required and must not be empty" });
  }

  if (!isIso8601(start)) {
    log.warn({ start }, "create_event: invalid ISO 8601 start parameter");
    return JSON.stringify({
      error: "Invalid start parameter — must be an ISO 8601 datetime string",
      received: start,
    });
  }

  if (!isIso8601(end)) {
    log.warn({ end }, "create_event: invalid ISO 8601 end parameter");
    return JSON.stringify({
      error: "Invalid end parameter — must be an ISO 8601 datetime string",
      received: end,
    });
  }

  // Validate attendees are strings if provided.
  if (attendees !== undefined) {
    const invalid = attendees.filter((a) => typeof a !== "string" || a.trim() === "");
    if (invalid.length > 0) {
      return JSON.stringify({
        error: "create_event: all attendees must be non-empty email strings",
        invalid,
      });
    }
  }

  // Build MCP params — omit undefined optional fields.
  const mcpParams: Record<string, unknown> = { title, start, end };
  if (location !== undefined) mcpParams["location"] = location;
  if (description !== undefined) mcpParams["description"] = description;
  if (attendees !== undefined && attendees.length > 0) mcpParams["attendees"] = attendees;

  try {
    const result = await callMcpTool("create_event", mcpParams);

    if (!result || result.trim() === "") {
      return `Event "${title}" created successfully.`;
    }

    return result;
  } catch (err) {
    log.error({ err, title, start, end }, "create_event MCP call failed");
    return JSON.stringify({
      error: "Failed to create event",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool: update_event  (T-15 — write, confirmation-gated)
// ---------------------------------------------------------------------------

/**
 * TypeScript types for the update_event tool parameters.
 * Matches the Google Calendar MCP "update_event" contract.
 */
export interface UpdateEventParams {
  /** The Google Calendar event ID to update (required). */
  eventId: string;
  /** New event title. */
  title?: string;
  /** New ISO 8601 start datetime. */
  start?: string;
  /** New ISO 8601 end datetime. */
  end?: string;
  /** New location. */
  location?: string;
  /** New plain-text description. */
  description?: string;
  /** Replacement list of attendee email addresses. */
  attendees?: string[];
}

/**
 * Anthropic tool definition for update_event.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "update_event"
 *   input_schema: eventId (required); all other fields optional (partial update).
 *
 * IMPORTANT: This tool definition is included in the agent's tool list so
 * the model can propose an update, but it MUST NOT be executed directly
 * by the agent. The confirmation executor calls updateEvent() only after
 * the user explicitly confirms.
 */
export const updateEventTool: Anthropic.Tool = {
  name: "update_event",
  description:
    "Updates one or more fields on an existing Google Calendar event. " +
    "Use this when the user asks to reschedule, rename, or modify an event. " +
    "IMPORTANT: Do NOT execute this tool immediately — first present the proposed " +
    "changes to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval. " +
    "Required field: eventId. Provide only the fields you want to change (partial update). " +
    "Datetime fields must be ISO 8601 with local timezone offset.",
  input_schema: {
    type: "object" as const,
    properties: {
      eventId: {
        type: "string",
        description: "The Google Calendar event ID of the event to update.",
      },
      title: {
        type: "string",
        description: "New event title or summary.",
      },
      start: {
        type: "string",
        description:
          "New event start datetime in ISO 8601 format with local timezone offset.",
      },
      end: {
        type: "string",
        description:
          "New event end datetime in ISO 8601 format with local timezone offset. Must be after start.",
      },
      location: {
        type: "string",
        description: "New location or address for the event.",
      },
      description: {
        type: "string",
        description: "New plain-text description or notes for the event.",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Replacement list of attendee email addresses.",
      },
    },
    required: ["eventId"],
  },
};

/**
 * Execute the update_event tool.
 *
 * Validates required and optional parameters before forwarding to the
 * Google Calendar MCP server. Only fields that are explicitly provided
 * are sent (partial update semantics).
 *
 * NOTE: This function is intended to be called only by the orchestrator's
 * confirmation executor — NEVER directly by the agent.
 *
 * @param params  UpdateEventParams — eventId required, all other fields optional.
 * @returns       Human-readable confirmation string, or a structured error string.
 */
export async function updateEvent(params: UpdateEventParams): Promise<string> {
  const { eventId, title, start, end, location, description, attendees } = params;

  if (!eventId || eventId.trim() === "") {
    return JSON.stringify({ error: "update_event: 'eventId' is required and must not be empty" });
  }

  // Validate any provided datetime fields.
  if (start !== undefined && !isIso8601(start)) {
    log.warn({ start }, "update_event: invalid ISO 8601 start parameter");
    return JSON.stringify({
      error: "Invalid start parameter — must be an ISO 8601 datetime string",
      received: start,
    });
  }

  if (end !== undefined && !isIso8601(end)) {
    log.warn({ end }, "update_event: invalid ISO 8601 end parameter");
    return JSON.stringify({
      error: "Invalid end parameter — must be an ISO 8601 datetime string",
      received: end,
    });
  }

  // Validate attendees if provided.
  if (attendees !== undefined) {
    const invalid = attendees.filter((a) => typeof a !== "string" || a.trim() === "");
    if (invalid.length > 0) {
      return JSON.stringify({
        error: "update_event: all attendees must be non-empty email strings",
        invalid,
      });
    }
  }

  // Build MCP params — always include eventId, then only changed fields.
  const mcpParams: Record<string, unknown> = { eventId };
  if (title !== undefined) mcpParams["title"] = title;
  if (start !== undefined) mcpParams["start"] = start;
  if (end !== undefined) mcpParams["end"] = end;
  if (location !== undefined) mcpParams["location"] = location;
  if (description !== undefined) mcpParams["description"] = description;
  if (attendees !== undefined) mcpParams["attendees"] = attendees;

  try {
    const result = await callMcpTool("update_event", mcpParams);

    if (!result || result.trim() === "") {
      return `Event ${eventId} updated successfully.`;
    }

    return result;
  } catch (err) {
    log.error({ err, eventId }, "update_event MCP call failed");
    return JSON.stringify({
      error: "Failed to update event",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool: delete_event  (T-15 — write, confirmation-gated)
// ---------------------------------------------------------------------------

/**
 * TypeScript types for the delete_event tool parameters.
 */
export interface DeleteEventParams {
  /** The Google Calendar event ID to delete (required). */
  eventId: string;
}

/**
 * Anthropic tool definition for delete_event.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "delete_event"
 *   input_schema: eventId (required).
 *
 * IMPORTANT: This tool definition is included in the agent's tool list so
 * the model can propose a deletion, but it MUST NOT be executed directly
 * by the agent. The confirmation executor calls deleteEvent() only after
 * the user explicitly confirms.
 */
export const deleteEventTool: Anthropic.Tool = {
  name: "delete_event",
  description:
    "Permanently deletes an event from the user's Google Calendar by its event ID. " +
    "Use this when the user asks to cancel, remove, or delete a calendar event. " +
    "IMPORTANT: Do NOT execute this tool immediately — this action is irreversible. " +
    "First present the event details to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval. " +
    "Required field: eventId (obtained from a prior get_todays_events or get_events_range call).",
  input_schema: {
    type: "object" as const,
    properties: {
      eventId: {
        type: "string",
        description:
          "The Google Calendar event ID of the event to delete. " +
          "Obtain this from a prior get_todays_events or get_events_range call.",
      },
    },
    required: ["eventId"],
  },
};

/**
 * Execute the delete_event tool.
 *
 * Validates the eventId before forwarding the deletion request to the
 * Google Calendar MCP server.
 *
 * NOTE: This function is intended to be called only by the orchestrator's
 * confirmation executor — NEVER directly by the agent.
 *
 * @param params  DeleteEventParams — eventId of the event to delete.
 * @returns       Human-readable confirmation string, or a structured error string.
 */
export async function deleteEvent(params: DeleteEventParams): Promise<string> {
  const { eventId } = params;

  if (!eventId || eventId.trim() === "") {
    return JSON.stringify({ error: "delete_event: 'eventId' is required and must not be empty" });
  }

  try {
    const result = await callMcpTool("delete_event", { eventId });

    if (!result || result.trim() === "") {
      return `Event ${eventId} deleted successfully.`;
    }

    return result;
  } catch (err) {
    log.error({ err, eventId }, "delete_event MCP call failed");
    return JSON.stringify({
      error: "Failed to delete event",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool: check_free_busy  (T-15 — read-like query, confirmation-gated)
// ---------------------------------------------------------------------------

/**
 * TypeScript types for the check_free_busy tool parameters.
 */
export interface CheckFreeBusyParams {
  /** ISO 8601 datetime for the query range start (required). */
  start: string;
  /** ISO 8601 datetime for the query range end (required). */
  end: string;
}

/**
 * Anthropic tool definition for check_free_busy.
 *
 * Matches the Google Calendar MCP contract:
 *   name:         "check_free_busy"
 *   input_schema: start (ISO 8601), end (ISO 8601) — both required.
 *
 * NOTE: Although check_free_busy is a query (not a mutation), it is grouped
 * with the write tools because it is used as a pre-flight check before
 * scheduling confirmations and is managed by the confirmation executor.
 * It is included in the agent's tool definitions array.
 */
export const checkFreeBusyTool: Anthropic.Tool = {
  name: "check_free_busy",
  description:
    "Queries the user's Google Calendar to determine whether they are free or busy " +
    "during a specified time range. " +
    "Use this as a pre-flight check before proposing to create or move an event, " +
    "to avoid double-booking the user. " +
    "Both start and end must be ISO 8601 datetime strings with the local timezone offset " +
    "(e.g. '2026-04-21T10:00:00+01:00'). " +
    "Use the current datetime and timezone from the Live Context block to resolve " +
    "relative time references.",
  input_schema: {
    type: "object" as const,
    properties: {
      start: {
        type: "string",
        description:
          "Start of the time window to check in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T10:00:00+01:00').",
      },
      end: {
        type: "string",
        description:
          "End of the time window to check in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T11:00:00+01:00'). Must be after start.",
      },
    },
    required: ["start", "end"],
  },
};

/**
 * Execute the check_free_busy tool.
 *
 * Validates ISO 8601 format for start and end before querying the MCP server.
 *
 * @param params  CheckFreeBusyParams — start and end of the query window.
 * @returns       Human-readable free/busy result string, or a structured error string.
 */
export async function checkFreeBusy(params: CheckFreeBusyParams): Promise<string> {
  const { start, end } = params;

  if (!isIso8601(start)) {
    log.warn({ start }, "check_free_busy: invalid ISO 8601 start parameter");
    return JSON.stringify({
      error: "Invalid start parameter — must be an ISO 8601 datetime string",
      received: start,
    });
  }

  if (!isIso8601(end)) {
    log.warn({ end }, "check_free_busy: invalid ISO 8601 end parameter");
    return JSON.stringify({
      error: "Invalid end parameter — must be an ISO 8601 datetime string",
      received: end,
    });
  }

  try {
    const result = await callMcpTool("check_free_busy", { start, end });

    if (!result || result.trim() === "") {
      return `Free/busy query for ${start} to ${end} returned no data.`;
    }

    return result;
  } catch (err) {
    log.error({ err, start, end }, "check_free_busy MCP call failed");
    return JSON.stringify({
      error: "Failed to check free/busy status",
      detail: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Tool registry — all read-operation tool definitions for Phase 1 (T-12)
// ---------------------------------------------------------------------------

/**
 * All calendar read tool definitions to be included in the Anthropic API call.
 * Import this array and spread it into TOOL_DEFINITIONS in agent.ts.
 */
export const calendarReadToolDefinitions: Anthropic.Tool[] = [
  getTodaysEventsTool,
  getEventsRangeTool,
];

// ---------------------------------------------------------------------------
// Tool registry — write-operation tool definitions (T-15)
// ---------------------------------------------------------------------------

/**
 * All calendar write (and confirmation-gated) tool definitions.
 *
 * These are included in the agent's TOOL_DEFINITIONS array so the model is
 * aware of them and can propose mutations, but they are ONLY executed by the
 * orchestrator's confirmation executor after explicit user approval.
 *
 * Import this array and spread it into TOOL_DEFINITIONS in agent.ts alongside
 * calendarReadToolDefinitions.
 */
export const calendarWriteToolDefinitions: Anthropic.Tool[] = [
  createEventTool,
  updateEventTool,
  deleteEventTool,
];

export const calendarFreeBusyToolDefinitions: Anthropic.Tool[] = [
  checkFreeBusyTool,
];

// ---------------------------------------------------------------------------
// Tool executor — called by the agent tool loop in agent.ts
// ---------------------------------------------------------------------------

/**
 * Execute a calendar read tool by name.
 *
 * This function is the single integration point between the agent's generic
 * tool loop and the calendar tool implementations. The agent.ts executeTool()
 * function should delegate to this when toolName is a known calendar tool.
 *
 * Write tools (create_event, update_event, delete_event, check_free_busy) are
 * also handled here for cases where the confirmation executor calls them via
 * the same dispatch path. The agent's tool loop itself should NOT invoke write
 * tools without the confirmation gate.
 *
 * @param toolName   The tool name as specified in the Anthropic tool definition.
 * @param toolInput  The validated input object from the Anthropic API response.
 * @returns          A string result to feed back to the model as a tool_result.
 */
export async function executeCalendarTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    // -----------------------------------------------------------------------
    // Read tools (T-12 / T-14)
    // -----------------------------------------------------------------------

    case "get_todays_events": {
      return getTodaysEvents();
    }

    case "get_events_range": {
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";

      if (!start || !end) {
        return JSON.stringify({
          error: "get_events_range requires both 'start' and 'end' parameters",
        });
      }

      return getEventsRange(start, end);
    }

    // -----------------------------------------------------------------------
    // Write tools (T-15) — confirmation-gated; called by confirmation executor
    // -----------------------------------------------------------------------

    case "create_event": {
      const title = typeof toolInput["title"] === "string" ? toolInput["title"] : "";
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";

      if (!title || !start || !end) {
        return JSON.stringify({
          error: "create_event requires 'title', 'start', and 'end' parameters",
        });
      }

      // Build params without setting optional keys to undefined (exactOptionalPropertyTypes).
      const createParams: CreateEventParams = { title, start, end };
      if (typeof toolInput["location"] === "string") createParams.location = toolInput["location"];
      if (typeof toolInput["description"] === "string") createParams.description = toolInput["description"];
      if (Array.isArray(toolInput["attendees"])) createParams.attendees = toolInput["attendees"] as string[];

      return createEvent(createParams);
    }

    case "update_event": {
      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";

      if (!eventId) {
        return JSON.stringify({ error: "update_event requires an 'eventId' parameter" });
      }

      // Build params without setting optional keys to undefined (exactOptionalPropertyTypes).
      const updateParams: UpdateEventParams = { eventId };
      if (typeof toolInput["title"] === "string") updateParams.title = toolInput["title"];
      if (typeof toolInput["start"] === "string") updateParams.start = toolInput["start"];
      if (typeof toolInput["end"] === "string") updateParams.end = toolInput["end"];
      if (typeof toolInput["location"] === "string") updateParams.location = toolInput["location"];
      if (typeof toolInput["description"] === "string") updateParams.description = toolInput["description"];
      if (Array.isArray(toolInput["attendees"])) updateParams.attendees = toolInput["attendees"] as string[];

      return updateEvent(updateParams);
    }

    case "delete_event": {
      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";

      if (!eventId) {
        return JSON.stringify({ error: "delete_event requires an 'eventId' parameter" });
      }

      return deleteEvent({ eventId });
    }

    case "check_free_busy": {
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";

      if (!start || !end) {
        return JSON.stringify({
          error: "check_free_busy requires both 'start' and 'end' parameters",
        });
      }

      return checkFreeBusy({ start, end });
    }

    default: {
      return JSON.stringify({ error: `Unknown calendar tool: ${toolName}` });
    }
  }
}
