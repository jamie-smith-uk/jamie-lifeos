/**
 * calendar.ts — Google Calendar REST API tool implementations.
 *
 * Uses the Google Calendar REST API v3 with OAuth2 (refresh token flow).
 * Replaces the original MCP-based approach which required a Claude.ai session.
 *
 * Authentication:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   Access tokens are fetched automatically and cached in memory with expiry.
 *
 * Tool definitions (Anthropic.Tool objects) are unchanged — the agent sees
 * the same interface regardless of the underlying transport.
 *
 * Security:
 *   - No secrets hard-coded — all credentials from environment variables.
 *   - Access token never logged.
 *   - Parameterised URL construction — no string interpolation of user input
 *     into SQL or shell; all user data goes into JSON bodies or query params
 *     via URLSearchParams.
 *   - Write tools remain confirmation-gated — not callable directly by agent.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { env, logger } from "@lifeos/shared";

const log = logger.child({ service: "calendar-tools" });

const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// ---------------------------------------------------------------------------
// OAuth2 token management
// ---------------------------------------------------------------------------

interface AccessToken {
  token: string;
  expiresAt: number; // epoch ms
}

let cachedToken: AccessToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar credentials not configured. " +
        "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Failed to refresh Google access token: HTTP ${response.status} — ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    error?: string;
  };

  if (data.error) {
    throw new Error(`Google token error: ${data.error}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Google Calendar REST helpers
// ---------------------------------------------------------------------------

async function calendarGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const url = new URL(`${GOOGLE_CALENDAR_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Google Calendar API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function calendarPost(path: string, body: unknown): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Google Calendar API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function calendarPatch(path: string, body: unknown): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Google Calendar API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function calendarDelete(path: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(`Google Calendar API error ${response.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Response formatting
// ---------------------------------------------------------------------------

interface GCalEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  attendees?: Array<{ email: string }>;
}

interface GCalEventList {
  items?: GCalEvent[];
}

function formatEvents(items: GCalEvent[]): string {
  if (items.length === 0) return "";

  return items
    .map((e) => {
      const title = e.summary ?? "(No title)";
      const startRaw = e.start?.dateTime ?? e.start?.date ?? "";
      const start = startRaw ? new Date(startRaw).toLocaleString() : "(no time)";
      const loc = e.location ? ` @ ${e.location}` : "";
      return `• ${start} — ${title}${loc} [id: ${e.id}]`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isIso8601(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([.,]\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value);
}

// ---------------------------------------------------------------------------
// Tool: get_todays_events
// ---------------------------------------------------------------------------

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

export async function getTodaysEvents(): Promise<string> {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return getEventsRange(start.toISOString(), end.toISOString());
  } catch (err) {
    log.error({ err }, "get_todays_events failed");
    return JSON.stringify({ error: "Failed to fetch today's events", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool: get_events_range
// ---------------------------------------------------------------------------

export const getEventsRangeTool: Anthropic.Tool = {
  name: "get_events_range",
  description:
    "Returns all calendar events between a start and end datetime. " +
    "Use this when the user asks about events on a specific date, a date range, " +
    "or uses natural language like 'next Tuesday', 'this week', 'tomorrow', " +
    "'next week', 'this weekend', or any named day of the week. " +
    "\n\n" +
    "IMPORTANT — Date resolution rules:\n" +
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
    "\n" +
    "Both start and end must be ISO 8601 datetime strings with the local timezone offset.",
  input_schema: {
    type: "object" as const,
    properties: {
      start: {
        type: "string",
        description:
          "Start of the date/time range in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T00:00:00+01:00').",
      },
      end: {
        type: "string",
        description:
          "End of the date/time range in ISO 8601 format with local timezone offset " +
          "(e.g. '2026-04-21T23:59:59+01:00'). Must be after start.",
      },
    },
    required: ["start", "end"],
  },
};

export async function getEventsRange(start: string, end: string): Promise<string> {
  if (!isIso8601(start)) {
    return JSON.stringify({ error: "Invalid start — must be ISO 8601", received: start });
  }
  if (!isIso8601(end)) {
    return JSON.stringify({ error: "Invalid end — must be ISO 8601", received: end });
  }

  try {
    const data = (await calendarGet("/calendars/primary/events", {
      timeMin: start,
      timeMax: end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    })) as GCalEventList;

    const items = data.items ?? [];
    if (items.length === 0) return `No events found between ${start} and ${end}.`;
    return formatEvents(items);
  } catch (err) {
    log.error({ err, start, end }, "get_events_range failed");
    return JSON.stringify({ error: "Failed to fetch events", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool: create_event  (confirmation-gated)
// ---------------------------------------------------------------------------

export interface CreateEventParams {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: string[];
}

export const createEventTool: Anthropic.Tool = {
  name: "create_event",
  description:
    "Creates a new event on the user's Google Calendar. " +
    "IMPORTANT: Do NOT execute this tool immediately — first present a summary " +
    "of the event details to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval. " +
    "Required fields: title, start (ISO 8601 with TZ offset), end (ISO 8601 with TZ offset). " +
    "Optional fields: location, description, attendees (array of email strings).",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "The event title or summary." },
      start: {
        type: "string",
        description: "Event start datetime in ISO 8601 format with local timezone offset.",
      },
      end: {
        type: "string",
        description: "Event end datetime in ISO 8601 format with local timezone offset.",
      },
      location: { type: "string", description: "Optional location for the event." },
      description: { type: "string", description: "Optional plain-text description." },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of attendee email addresses.",
      },
    },
    required: ["title", "start", "end"],
  },
};

export async function createEvent(params: CreateEventParams): Promise<string> {
  const { title, start, end, location, description, attendees } = params;

  if (!title?.trim()) return JSON.stringify({ error: "create_event: 'title' is required" });
  if (!isIso8601(start)) return JSON.stringify({ error: "Invalid start — must be ISO 8601" });
  if (!isIso8601(end)) return JSON.stringify({ error: "Invalid end — must be ISO 8601" });

  const body: Record<string, unknown> = {
    summary: title,
    start: { dateTime: start },
    end: { dateTime: end },
  };
  if (location) body["location"] = location;
  if (description) body["description"] = description;
  if (attendees?.length) {
    body["attendees"] = attendees.map((email) => ({ email }));
  }

  try {
    const event = (await calendarPost("/calendars/primary/events", body)) as GCalEvent;
    return `Event "${title}" created successfully (id: ${event.id}).`;
  } catch (err) {
    log.error({ err, title, start, end }, "create_event failed");
    return JSON.stringify({ error: "Failed to create event", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool: update_event  (confirmation-gated)
// ---------------------------------------------------------------------------

export interface UpdateEventParams {
  eventId: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  attendees?: string[];
}

export const updateEventTool: Anthropic.Tool = {
  name: "update_event",
  description:
    "Updates one or more fields on an existing Google Calendar event. " +
    "IMPORTANT: Do NOT execute this tool immediately — first present the proposed " +
    "changes to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval. " +
    "Required field: eventId. Provide only the fields you want to change.",
  input_schema: {
    type: "object" as const,
    properties: {
      eventId: { type: "string", description: "The Google Calendar event ID to update." },
      title: { type: "string", description: "New event title." },
      start: { type: "string", description: "New start datetime in ISO 8601 format." },
      end: { type: "string", description: "New end datetime in ISO 8601 format." },
      location: { type: "string", description: "New location." },
      description: { type: "string", description: "New plain-text description." },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Replacement list of attendee email addresses.",
      },
    },
    required: ["eventId"],
  },
};

export async function updateEvent(params: UpdateEventParams): Promise<string> {
  const { eventId, title, start, end, location, description, attendees } = params;

  if (!eventId?.trim()) return JSON.stringify({ error: "update_event: 'eventId' is required" });
  if (start !== undefined && !isIso8601(start)) {
    return JSON.stringify({ error: "Invalid start — must be ISO 8601" });
  }
  if (end !== undefined && !isIso8601(end)) {
    return JSON.stringify({ error: "Invalid end — must be ISO 8601" });
  }

  const body: Record<string, unknown> = {};
  if (title !== undefined) body["summary"] = title;
  if (start !== undefined) body["start"] = { dateTime: start };
  if (end !== undefined) body["end"] = { dateTime: end };
  if (location !== undefined) body["location"] = location;
  if (description !== undefined) body["description"] = description;
  if (attendees !== undefined) body["attendees"] = attendees.map((email) => ({ email }));

  try {
    await calendarPatch(`/calendars/primary/events/${encodeURIComponent(eventId)}`, body);
    return `Event ${eventId} updated successfully.`;
  } catch (err) {
    log.error({ err, eventId }, "update_event failed");
    return JSON.stringify({ error: "Failed to update event", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool: delete_event  (confirmation-gated)
// ---------------------------------------------------------------------------

export interface DeleteEventParams {
  eventId: string;
}

export const deleteEventTool: Anthropic.Tool = {
  name: "delete_event",
  description:
    "Permanently deletes an event from the user's Google Calendar by its event ID. " +
    "IMPORTANT: Do NOT execute this tool immediately — this action is irreversible. " +
    "First present the event details to the user and ask for confirmation. " +
    "Only the confirmation executor will call this tool after explicit user approval.",
  input_schema: {
    type: "object" as const,
    properties: {
      eventId: {
        type: "string",
        description: "The Google Calendar event ID of the event to delete.",
      },
    },
    required: ["eventId"],
  },
};

export async function deleteEvent(params: DeleteEventParams): Promise<string> {
  const { eventId } = params;

  if (!eventId?.trim()) return JSON.stringify({ error: "delete_event: 'eventId' is required" });

  try {
    await calendarDelete(`/calendars/primary/events/${encodeURIComponent(eventId)}`);
    return `Event ${eventId} deleted successfully.`;
  } catch (err) {
    log.error({ err, eventId }, "delete_event failed");
    return JSON.stringify({ error: "Failed to delete event", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool: check_free_busy
// ---------------------------------------------------------------------------

export interface CheckFreeBusyParams {
  start: string;
  end: string;
}

export const checkFreeBusyTool: Anthropic.Tool = {
  name: "check_free_busy",
  description:
    "Queries the user's Google Calendar to determine whether they are free or busy " +
    "during a specified time range. Use this as a pre-flight check before proposing " +
    "to create or move an event. Both start and end must be ISO 8601 datetimes.",
  input_schema: {
    type: "object" as const,
    properties: {
      start: {
        type: "string",
        description: "Start of the time window in ISO 8601 format with timezone offset.",
      },
      end: {
        type: "string",
        description: "End of the time window in ISO 8601 format with timezone offset.",
      },
    },
    required: ["start", "end"],
  },
};

export async function checkFreeBusy(params: CheckFreeBusyParams): Promise<string> {
  const { start, end } = params;

  if (!isIso8601(start)) return JSON.stringify({ error: "Invalid start — must be ISO 8601" });
  if (!isIso8601(end)) return JSON.stringify({ error: "Invalid end — must be ISO 8601" });

  try {
    const data = (await calendarPost("/freeBusy", {
      timeMin: start,
      timeMax: end,
      items: [{ id: "primary" }],
    })) as { calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } } };

    const busy = data.calendars?.primary?.busy ?? [];
    if (busy.length === 0) return `You are free between ${start} and ${end}.`;

    const slots = busy
      .map((b) => `  • ${new Date(b.start).toLocaleString()} – ${new Date(b.end).toLocaleString()}`)
      .join("\n");
    return `You have ${busy.length} busy slot(s) between ${start} and ${end}:\n${slots}`;
  } catch (err) {
    log.error({ err, start, end }, "check_free_busy failed");
    return JSON.stringify({ error: "Failed to check free/busy status", detail: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool registries
// ---------------------------------------------------------------------------

export const calendarReadToolDefinitions: Anthropic.Tool[] = [
  getTodaysEventsTool,
  getEventsRangeTool,
];

export const calendarWriteToolDefinitions: Anthropic.Tool[] = [
  createEventTool,
  updateEventTool,
  deleteEventTool,
];

export const calendarFreeBusyToolDefinitions: Anthropic.Tool[] = [checkFreeBusyTool];

// ---------------------------------------------------------------------------
// Unified executor — called by agent.ts tool loop and confirmation executor
// ---------------------------------------------------------------------------

export async function executeCalendarTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "get_todays_events":
      return getTodaysEvents();

    case "get_events_range": {
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
      if (!start || !end) {
        return JSON.stringify({ error: "get_events_range requires 'start' and 'end'" });
      }
      return getEventsRange(start, end);
    }

    case "create_event": {
      const title = typeof toolInput["title"] === "string" ? toolInput["title"] : "";
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
      if (!title || !start || !end) {
        return JSON.stringify({ error: "create_event requires 'title', 'start', and 'end'" });
      }
      const p: CreateEventParams = { title, start, end };
      if (typeof toolInput["location"] === "string") p.location = toolInput["location"];
      if (typeof toolInput["description"] === "string") p.description = toolInput["description"];
      if (Array.isArray(toolInput["attendees"])) p.attendees = toolInput["attendees"] as string[];
      return createEvent(p);
    }

    case "update_event": {
      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
      if (!eventId) return JSON.stringify({ error: "update_event requires 'eventId'" });
      const p: UpdateEventParams = { eventId };
      if (typeof toolInput["title"] === "string") p.title = toolInput["title"];
      if (typeof toolInput["start"] === "string") p.start = toolInput["start"];
      if (typeof toolInput["end"] === "string") p.end = toolInput["end"];
      if (typeof toolInput["location"] === "string") p.location = toolInput["location"];
      if (typeof toolInput["description"] === "string") p.description = toolInput["description"];
      if (Array.isArray(toolInput["attendees"])) p.attendees = toolInput["attendees"] as string[];
      return updateEvent(p);
    }

    case "delete_event": {
      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
      if (!eventId) return JSON.stringify({ error: "delete_event requires 'eventId'" });
      return deleteEvent({ eventId });
    }

    case "check_free_busy": {
      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
      if (!start || !end) {
        return JSON.stringify({ error: "check_free_busy requires 'start' and 'end'" });
      }
      return checkFreeBusy({ start, end });
    }

    default:
      return JSON.stringify({ error: `Unknown calendar tool: ${toolName}` });
  }
}
