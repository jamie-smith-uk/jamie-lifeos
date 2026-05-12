/**
 * gmail.ts — Gmail REST API v1 tool implementations.
 *
 * Uses Gmail REST API v1 with OAuth2 (refresh token flow). Replaces the
 * MCP-based approach which required a Claude.ai session.
 *
 * Authentication:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (same
 *   credentials as calendar.ts — the refresh token must have Gmail scope
 *   https://www.googleapis.com/auth/gmail.readonly granted at consent time).
 *   Access tokens are fetched automatically and cached in memory with expiry.
 *
 * Security:
 *   - No secrets hard-coded — all credentials from environment variables.
 *   - Access token never logged.
 *   - External MCP-sourced IDs and email content are wrapped in <untrusted>
 *     tags before being returned so the agent can treat them as untrusted.
 *   - All operations return strings (never throws); errors are JSON-serialised.
 *   - HTTPS only.
 */

import { env, logger, pool } from "@lifeos/shared";

const log = logger.child({ service: "gmail-tools" });

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Input length caps (prompt-injection hardening)
const MAX_THREAD_ID_LEN = 256;
const MAX_OPERATION_LEN = 64;

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
      "Gmail credentials not configured. " +
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
    throw new Error(`Failed to refresh Google access token: HTTP ${response.status}`);
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
// Gmail REST helpers
// ---------------------------------------------------------------------------

async function gmailGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const url = new URL(`${GMAIL_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail API error ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Gmail message parsing
// ---------------------------------------------------------------------------

interface GmailApiMessageHeader {
  name: string;
  value: string;
}

interface GmailApiMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailApiMessagePart[];
  headers?: GmailApiMessageHeader[];
}

interface GmailApiMessage {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailApiMessagePart;
}

interface GmailApiThread {
  id?: string;
  messages?: GmailApiMessage[];
}

function getHeader(msg: GmailApiMessage, name: string): string {
  const headers = msg.payload?.headers ?? [];
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function base64UrlDecode(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
function extractPlainText(part: GmailApiMessagePart | undefined): string {
  if (!part) return "";

  if (part.mimeType === "text/plain" && part.body?.data) {
    return base64UrlDecode(part.body.data);
  }

  if (part.parts) {
    for (const sub of part.parts) {
      if (sub.mimeType === "text/plain" && sub.body?.data) {
        return base64UrlDecode(sub.body.data);
      }
    }
    // fall back to HTML stripped
    for (const sub of part.parts) {
      if (sub.mimeType === "text/html" && sub.body?.data) {
        return stripHtml(base64UrlDecode(sub.body.data));
      }
      if (sub.parts) {
        const nested = extractPlainText(sub);
        if (nested) return nested;
      }
    }
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    return stripHtml(base64UrlDecode(part.body.data));
  }

  return "";
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// Email sender matching against people graph
// ---------------------------------------------------------------------------

interface PersonInfo {
  id?: number;
  name: string;
  relationship_type: string | null;
}

// Email validation pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Separators to split email local part into search terms
const EMAIL_SEPARATOR_PATTERN = /[._+-]/g;

/**
 * Extracts email address from various "From" header formats:
 * - user@domain.com
 * - Name <user@domain.com>
 * - "Name" <user@domain.com>
 * - user+tag@domain.com
 * Returns the email address in lowercase for consistent matching.
 */
function extractEmailAddress(fromHeader: string): string | null {
  if (!fromHeader) return null;

  // Handle display name formats: "Name" <email> or Name <email>
  const displayNameMatch = fromHeader.match(/<([^>]+)>/);
  if (displayNameMatch?.[1]) {
    const email = displayNameMatch[1].trim().toLowerCase();
    return EMAIL_REGEX.test(email) ? email : null;
  }

  // Handle plain email format
  const plainEmail = fromHeader.trim().toLowerCase();
  return EMAIL_REGEX.test(plainEmail) ? plainEmail : null;
}

/**
 * Queries the people database to find a person record that matches the given email address.
 * Uses fuzzy matching to handle variations in email formats and names.
 */
async function findPersonByEmail(email: string): Promise<PersonInfo | null> {
  if (!email) return null;

  try {
    // Extract the local part (before @) to match against names
    const localPart = email.split("@")[0];
    if (!localPart) return null;

    // Remove common separators and convert to searchable format
    const searchTerms = localPart
      .replace(EMAIL_SEPARATOR_PATTERN, " ")
      .split(" ")
      .filter(Boolean)
      .map((term) => term.toLowerCase());

    if (searchTerms.length === 0) return null;

    // Query for people whose names might match the email address
    // Use LIKE patterns for safe matching instead of regex to prevent injection
    const likePatterns = searchTerms.map((term) => `%${term}%`);

    const result = await pool.query(
      `SELECT id, name, relationship_type 
       FROM people 
       WHERE LOWER(name) LIKE ANY($1::text[])
       LIMIT 1`,
      [likePatterns],
    );

    if (result.rows.length > 0) {
      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        relationship_type: result.rows[0].relationship_type,
      };
    }

    return null;
  } catch (err) {
    log.error({ err: String(err) }, "Failed to query people database");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Email classification
// ---------------------------------------------------------------------------

type EmailCategory = "action required" | "FYI" | "waiting on";

const WAITING_PATTERNS: RegExp[] = [
  /waiting.?on/,
  /waiting.?for/,
  /awaiting/,
  /still waiting/,
  /pending your/,
];

const ACTION_PATTERNS: RegExp[] = [
  /please review/,
  /please approve/,
  /please respond/,
  /please confirm/,
  /action.?needed/,
  /action.?required/,
  /approve/,
  /approval/,
  /urgent/,
  /asap/,
  /by (end of day|friday|thursday|tomorrow)/,
  /respond/,
  /deadline/,
  /review and/,
  /pr review/,
  /pull request/,
];

function classifyEmail(subject: string, snippet: string): EmailCategory {
  const text = `${subject} ${snippet}`.toLowerCase();

  for (const pattern of WAITING_PATTERNS) {
    if (pattern.test(text)) return "waiting on";
  }
  for (const pattern of ACTION_PATTERNS) {
    if (pattern.test(text)) return "action required";
  }
  return "FYI";
}

// ---------------------------------------------------------------------------
// get_inbox_summary
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
async function getInboxSummary(_input: Record<string, unknown>): Promise<string> {
  try {
    const list = (await gmailGet("/messages", {
      q: "is:unread",
      maxResults: "10",
    })) as { messages?: Array<{ id: string; threadId: string }> };

    const messageRefs = list.messages ?? [];

    if (messageRefs.length === 0) {
      return "No unread emails in your inbox.";
    }

    const emails = await Promise.all(
      messageRefs.slice(0, 10).map(async (ref) => {
        const msg = (await gmailGet(`/messages/${encodeURIComponent(ref.id)}`, {
          format: "metadata",
          "metadataHeaders.0": "From",
          "metadataHeaders.1": "Subject",
        })) as GmailApiMessage;
        return msg;
      }),
    );

    const lines: string[] = [
      `Inbox summary (${emails.length} unread email${emails.length === 1 ? "" : "s"}):`,
      "",
    ];

    for (const msg of emails) {
      const from = getHeader(msg, "From") || "(unknown sender)";
      const { enriched: enrichedFrom, person: senderPerson } =
        await enrichSenderInfoWithPerson(from);
      const subject = getHeader(msg, "Subject") || "(no subject)";
      const snippet = msg.snippet ?? "";
      const threadId = msg.threadId ?? msg.id ?? "";
      const category = classifyEmail(subject, snippet);

      // Detect people mentioned in content
      const mentionedPeople = await findMentionedPeople(`${subject} ${snippet}`);

      // Collect all people for this email (sender + mentions, avoiding duplicates)
      const allPeople: PersonInfo[] = [];
      if (senderPerson) {
        allPeople.push(senderPerson);
      }
      for (const mentioned of mentionedPeople) {
        if (!allPeople.some((p) => p.id === mentioned.id)) {
          allPeople.push(mentioned);
        }
      }

      lines.push(`<untrusted>`);
      lines.push(`From: ${enrichedFrom}`);
      lines.push(`Subject: ${subject}`);
      if (snippet) lines.push(`Summary: ${snippet}`);
      if (threadId) lines.push(`Thread ID: ${threadId}`);
      lines.push(`</untrusted>`);
      lines.push(`Category: ${category}`);

      // Add people information for agent awareness
      if (allPeople.length > 0) {
        const peopleNames = allPeople.map((p) => p.name).join(", ");
        lines.push(`Known people: ${peopleNames}`);
        lines.push(`People IDs: ${allPeople.map((p) => p.id).join(", ")}`);
      }

      lines.push("");
    }

    return lines.join("\n").trimEnd();
  } catch (err) {
    log.error({ err: String(err) }, "get_inbox_summary failed");
    return JSON.stringify({ error: "get_inbox_summary failed" });
  }
}

// ---------------------------------------------------------------------------
// get_thread
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
async function getThread(input: Record<string, unknown>): Promise<string> {
  const threadId = typeof input.thread_id === "string" ? input.thread_id : "";

  if (!threadId.trim() || threadId.length > MAX_THREAD_ID_LEN) {
    return JSON.stringify({ error: "get_thread: invalid 'thread_id'" });
  }

  try {
    const thread = (await gmailGet(`/threads/${encodeURIComponent(threadId)}`, {
      format: "full",
    })) as GmailApiThread;

    const messages = thread.messages ?? [];
    const lines: string[] = [
      `<untrusted>Thread ID: ${thread.id ?? threadId}</untrusted>`,
      `Messages: ${messages.length}`,
      "",
    ];

    // Collect all people mentioned across the entire thread
    const allThreadPeople: PersonInfo[] = [];

    for (const msg of messages) {
      const from = getHeader(msg, "From") || "(unknown)";
      const { enriched: enrichedFrom, person: senderPerson } =
        await enrichSenderInfoWithPerson(from);
      const subject = getHeader(msg, "Subject") || "(no subject)";
      const date = getHeader(msg, "Date");
      const body = extractPlainText(msg.payload);

      // Detect people mentioned in this message
      const mentionedPeople = await findMentionedPeople(`${subject} ${body}`);

      // Add sender to thread people if known
      if (senderPerson && !allThreadPeople.some((p) => p.id === senderPerson.id)) {
        allThreadPeople.push(senderPerson);
      }

      // Add mentioned people to thread people
      for (const mentioned of mentionedPeople) {
        if (!allThreadPeople.some((p) => p.id === mentioned.id)) {
          allThreadPeople.push(mentioned);
        }
      }

      lines.push(`--- Message ---`);
      lines.push(`<untrusted>`);
      lines.push(`From: ${enrichedFrom}`);
      lines.push(`Subject: ${subject}`);
      if (date) lines.push(`Date: ${date}`);
      if (body) {
        lines.push(`Body:`);
        lines.push(body);
      }
      lines.push(`</untrusted>`);
      lines.push("");
    }

    // Add summary of all people detected in the thread
    if (allThreadPeople.length > 0) {
      lines.push(`--- People Detected in Thread ---`);
      lines.push(`Known people: ${allThreadPeople.map((p) => p.name).join(", ")}`);
      lines.push(`People IDs: ${allThreadPeople.map((p) => p.id).join(", ")}`);
      lines.push(`Use log_interaction tool to record this email interaction with these people.`);
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  } catch (err) {
    log.error({ err: String(err), threadId }, "get_thread failed");
    return JSON.stringify({ error: "get_thread failed" });
  }
}

// ---------------------------------------------------------------------------
// extract_implied_actions
// ---------------------------------------------------------------------------

interface CalendarEvent {
  type: string;
  title: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  meeting_link?: string;
  attendees?: string[];
  timezone?: string;
  confirmation_number?: string;
  departure_time?: string;
  arrival_time?: string;
  from?: string;
  to?: string;
  confidence: number;
  source: string;
}

interface Task {
  title: string;
  due_date?: string;
  priority?: string;
  confidence: number;
  source: string;
}

interface ExtractedActions {
  calendar_events: CalendarEvent[];
  tasks: Task[];
}

// Date parsing patterns
const DATE_PATTERNS = [
  // ISO 8601: 2026-05-20
  /(\d{4}-\d{2}-\d{2})/g,
  // US format: 5/25/2026, 05/25/2026
  /(\d{1,2}\/\d{1,2}\/\d{4})/g,
  // Long format: May 22, 2026
  /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
  // Short format: May 22
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/gi,
];

// Time parsing patterns
const TIME_PATTERNS = [
  // 10:30 AM, 2:00 PM, 14:30:00
  /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/g,
];

// Priority indicators
const URGENT_PATTERNS = [/urgent/gi, /asap/gi, /critical/gi, /immediate/gi, /high\s*priority/gi];

function parseRelativeDate(lowerStr: string, today: Date): string | null {
  if (lowerStr.includes("today")) {
    return today.toISOString().split("T")[0] || null;
  }

  if (lowerStr.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0] || null;
  }

  if (lowerStr.includes("friday")) {
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    friday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    return friday.toISOString().split("T")[0] || null;
  }

  return null;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  try {
    const today = new Date();
    const lowerStr = dateStr.toLowerCase().trim();

    // Handle relative dates
    const relativeDate = parseRelativeDate(lowerStr, today);
    if (relativeDate) return relativeDate;

    // Try parsing as standard date
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0] || null;
    }

    return null;
  } catch {
    return null;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: time parsing requires multiple format checks
function parseTime(timeStr: string | undefined): { time: string; timezone?: string } | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*([AP]M)?\s*([A-Z]{2,3})?/i);
  if (!match) return null;

  let [, time, ampm, tz] = match;

  // Convert to 24-hour format if needed
  if (ampm && time) {
    const timeParts = time.split(":");
    const hours = timeParts[0];
    const minutes = timeParts[1];
    if (hours && minutes) {
      let hour24 = parseInt(hours, 10);
      if (ampm.toUpperCase() === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toUpperCase() === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      time = `${hour24.toString().padStart(2, "0")}:${minutes}`;
    }
  }

  if (!time) return null;

  return {
    time: time.length === 5 ? `${time}:00` : time,
    ...(tz && { timezone: tz }),
  };
}

function extractDatesAndTimes(text: string): { dates: string[]; times: string[] } {
  const dates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    dates.push(
      ...Array.from(text.matchAll(pattern))
        .map((m) => m[1])
        .filter((item): item is string => Boolean(item)),
    );
  }

  const times: string[] = [];
  for (const pattern of TIME_PATTERNS) {
    times.push(
      ...Array.from(text.matchAll(pattern))
        .map((m) => m[1])
        .filter((item): item is string => Boolean(item)),
    );
  }

  return { dates, times };
}

function createFlightEvent(
  from: string,
  to: string,
  date: string | null,
  timeInfo: { time: string; timezone?: string } | null,
  confirmationNumber?: string,
): CalendarEvent {
  const event: CalendarEvent = {
    type: "flight",
    title: `Flight ${from} to ${to}`,
    from,
    to,
    confidence: 0.8,
    source: "email_content",
  };

  if (timeInfo && date) {
    event.departure_time = `${date}T${timeInfo.time}`;
    event.start_time = event.departure_time;
    if (timeInfo.timezone) {
      event.timezone = timeInfo.timezone;
    }
  }

  if (confirmationNumber) {
    event.confirmation_number = confirmationNumber;
  }

  return event;
}

function createGenericFlightEvent(
  date: string | null,
  timeInfo: { time: string; timezone?: string } | null,
  confirmationNumber?: string,
): CalendarEvent {
  const event: CalendarEvent = {
    type: "flight",
    title: "Flight",
    confidence: 0.6,
    source: "email_content",
  };

  if (timeInfo && date) {
    event.start_time = `${date}T${timeInfo.time}`;
    if (timeInfo.timezone) {
      event.timezone = timeInfo.timezone;
    }
  }

  if (confirmationNumber) {
    event.confirmation_number = confirmationNumber;
  }

  return event;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: flight parsing requires multiple pattern checks
function extractFlightEvents(content: string, subject: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const text = `${subject}\n${content}`;

  // Look for flight confirmation patterns
  const flightMatches = Array.from(text.matchAll(/flight:?\s*([A-Z]{2}\d+)/gi));
  const confirmationMatches = Array.from(
    text.matchAll(/confirmation\s*(?:number|#):?\s*([A-Z0-9]+)/gi),
  );
  const routeMatches = Array.from(text.matchAll(/(\w{3})\s*(?:to|→)\s*(\w{3})/gi));

  if (flightMatches.length > 0 || confirmationMatches.length > 0 || routeMatches.length > 0) {
    const { dates, times } = extractDatesAndTimes(text);

    // Create flight events
    let eventCount = 0;
    for (const routeMatch of routeMatches) {
      const [, from, to] = routeMatch;
      if (from && to) {
        const date = dates[eventCount] ? parseDate(dates[eventCount]) : null;
        const timeInfo = times[eventCount] ? parseTime(times[eventCount]) : null;

        if (date) {
          const confirmationNumber = confirmationMatches[0] ? confirmationMatches[0][1] : undefined;
          const event = createFlightEvent(from, to, date, timeInfo, confirmationNumber);
          events.push(event);
          eventCount++;
        }
      }
    }

    // If no route matches but we have flight info, create a generic flight event
    if (events.length === 0 && (flightMatches.length > 0 || confirmationMatches.length > 0)) {
      const date = dates[0] ? parseDate(dates[0]) : null;
      const timeInfo = times[0] ? parseTime(times[0]) : null;

      if (date) {
        const confirmationNumber = confirmationMatches[0] ? confirmationMatches[0][1] : undefined;
        const event = createGenericFlightEvent(date, timeInfo, confirmationNumber);
        events.push(event);
      }
    }
  }

  return events;
}

function extractMeetingDetails(text: string): {
  timeRangeMatches: RegExpMatchArray[];
  locationMatches: RegExpMatchArray[];
  linkMatches: RegExpMatchArray[];
  attendeeMatches: RegExpMatchArray[];
} {
  return {
    timeRangeMatches: Array.from(
      text.matchAll(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*[-–]\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/gi),
    ),
    locationMatches: Array.from(text.matchAll(/location:?\s*(.+?)(?:\n|organizer|attendees|$)/gi)),
    linkMatches: Array.from(
      text.matchAll(/(?:zoom|teams|meet|join)\s*(?:link|url)?:?\s*(https?:\/\/[^\s]+)/gi),
    ),
    attendeeMatches: Array.from(text.matchAll(/attendees:?\s*(.+?)(?:\n|$)/gi)),
  };
}

function createMeetingEvent(title: string): CalendarEvent {
  return {
    type: "meeting",
    title,
    confidence: 0.8,
    source: "email_content",
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: time handling requires multiple format checks
function addTimeToEvent(
  event: CalendarEvent,
  date: string,
  timeRangeMatches: RegExpMatchArray[],
  times: string[],
): void {
  if (timeRangeMatches.length > 0) {
    const match = timeRangeMatches[0];
    if (match?.[1] && match[2]) {
      const startTime = match[1];
      const endTime = match[2];
      const startTimeInfo = parseTime(startTime);
      const endTimeInfo = parseTime(endTime);

      if (startTimeInfo) {
        event.start_time = `${date}T${startTimeInfo.time}`;
        if (startTimeInfo.timezone) {
          event.timezone = startTimeInfo.timezone;
        }
      }

      if (endTimeInfo) {
        event.end_time = `${date}T${endTimeInfo.time}`;
      }
    }
  } else if (times.length > 0) {
    const timeInfo = parseTime(times[0]);
    if (timeInfo) {
      event.start_time = `${date}T${timeInfo.time}`;
      if (timeInfo.timezone) {
        event.timezone = timeInfo.timezone;
      }
    }
  }
}

function addLocationAndAttendeesToEvent(
  event: CalendarEvent,
  locationMatches: RegExpMatchArray[],
  linkMatches: RegExpMatchArray[],
  attendeeMatches: RegExpMatchArray[],
): void {
  if (locationMatches.length > 0 && locationMatches[0] && locationMatches[0][1]) {
    event.location = locationMatches[0][1].trim();
  }

  if (linkMatches.length > 0 && linkMatches[0] && linkMatches[0][1]) {
    event.meeting_link = linkMatches[0][1];
    if (!event.location) {
      event.location = "Virtual";
    }
  }

  if (attendeeMatches.length > 0 && attendeeMatches[0] && attendeeMatches[0][1]) {
    const attendeeStr = attendeeMatches[0][1];
    event.attendees = attendeeStr
      .split(/[,;]/)
      .map((email) => email.trim())
      .filter(Boolean);
  }
}

function extractAllDayEvents(text: string, subject: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (text.toLowerCase().includes("all day")) {
    const { dates } = extractDatesAndTimes(text);

    if (dates.length > 0) {
      const date = parseDate(dates[0]);
      if (date) {
        const title = subject.replace(/all\s*day/gi, "").trim() || "All Day Event";
        events.push({
          type: "event",
          title,
          start_time: date,
          all_day: true,
          confidence: 0.7,
          source: "email_content",
        });
      }
    }
  }

  return events;
}

function extractMeetingEvents(content: string, subject: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const text = `${subject}\n${content}`;

  // Look for meeting patterns
  const meetingMatches = Array.from(text.matchAll(/meeting:?\s*(.+?)(?:\n|date|time|$)/gi));

  if (meetingMatches.length > 0 || subject.toLowerCase().includes("meeting")) {
    const { dates, times } = extractDatesAndTimes(text);
    const { timeRangeMatches, locationMatches, linkMatches, attendeeMatches } =
      extractMeetingDetails(text);

    const title = meetingMatches[0]?.[1]
      ? meetingMatches[0][1].trim()
      : subject.replace(/meeting:?\s*/gi, "").trim() || "Meeting";

    const date = dates[0] ? parseDate(dates[0]) : null;

    if (date) {
      const event = createMeetingEvent(title);
      addTimeToEvent(event, date, timeRangeMatches, times);
      addLocationAndAttendeesToEvent(event, locationMatches, linkMatches, attendeeMatches);
      events.push(event);
    }
  }

  // Check for all-day events
  events.push(...extractAllDayEvents(text, subject));

  return events;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: action item parsing requires multiple pattern checks
function extractActionItems(text: string): Task[] {
  const tasks: Task[] = [];
  const actionItemMatches = Array.from(
    text.matchAll(/(?:action\s*items?|todo|to\s*do):?\s*\n?((?:[-•*]\s*.+(?:\n|$))+)/gi),
  );

  for (const match of actionItemMatches) {
    const itemsText = match[1];
    if (itemsText) {
      const items = itemsText
        .split(/\n/)
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);

      for (const item of items) {
        if (item.length > 0) {
          const priority = URGENT_PATTERNS.some((p) => p.test(item)) ? "high" : "normal";

          tasks.push({
            title: item,
            priority,
            confidence: 0.9,
            source: "email_content",
          });
        }
      }
    }
  }

  return tasks;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: imperative task parsing requires multiple pattern checks
function extractImperativeTasks(text: string): Task[] {
  const tasks: Task[] = [];
  const imperativeMatches = Array.from(text.matchAll(/(?:please|kindly)\s+(.+?)(?:\.|by|$)/gi));

  for (const match of imperativeMatches) {
    const action = match[1];
    if (action) {
      const actionText = action.trim();
      if (actionText.length > 0) {
        const priority = URGENT_PATTERNS.some((p) => p.test(actionText)) ? "high" : "normal";

        // Extract deadline if present
        let dueDate: string | null = null;
        const deadlineMatch = actionText.match(/by\s+(.+?)(?:\.|$)/i);
        if (deadlineMatch?.[1]) {
          dueDate = parseDate(deadlineMatch[1]);
        }

        const task: Task = {
          title: actionText,
          priority,
          confidence: 0.8,
          source: "email_content",
          ...(dueDate && { due_date: dueDate }),
        };

        tasks.push(task);
      }
    }
  }

  return tasks;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: deadline task parsing requires multiple pattern checks
function extractDeadlineTasks(text: string): Task[] {
  const tasks: Task[] = [];
  const deadlineMatches = Array.from(text.matchAll(/deadline:?\s*(.+?)(?:\n|$)/gi));

  for (const match of deadlineMatches) {
    const deadlineText = match[1];
    if (deadlineText) {
      const date = parseDate(deadlineText.trim());

      if (date) {
        // Try to extract what the deadline is for
        const matchIndex = match.index || 0;
        const context = text.substring(Math.max(0, matchIndex - 100), matchIndex + 100);
        const projectMatch = context.match(
          /(?:project|task|assignment):?\s*(.+?)(?:\n|deadline)/gi,
        );

        const title = projectMatch?.[0]
          ? projectMatch[0].replace(/(?:project|task|assignment):?\s*/gi, "").trim()
          : "Complete task";

        const priority = URGENT_PATTERNS.some((p) => p.test(context)) ? "high" : "normal";

        tasks.push({
          title,
          due_date: date,
          priority,
          confidence: 0.8,
          source: "email_content",
        });
      }
    }
  }

  return tasks;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: relative deadline parsing requires multiple pattern checks
function extractRelativeDeadlineTasks(text: string): Task[] {
  const tasks: Task[] = [];
  const relativeDeadlineMatches = Array.from(
    text.matchAll(/by\s+(end\s+of\s+day|friday|thursday|tomorrow|today)/gi),
  );

  for (const match of relativeDeadlineMatches) {
    const relativeDate = match[1];
    if (relativeDate) {
      const date = parseDate(relativeDate);

      if (date) {
        // Extract context around the deadline
        const matchIndex = match.index || 0;
        const context = text.substring(Math.max(0, matchIndex - 50), matchIndex);
        const actionMatch = context.match(/(?:review|approve|confirm|send|complete)\s+(.+?)$/i);

        const title = actionMatch?.[0] ? actionMatch[0].trim() : "Complete task";
        const priority = URGENT_PATTERNS.some((p) => p.test(text)) ? "high" : "normal";

        tasks.push({
          title,
          due_date: date,
          priority,
          confidence: 0.7,
          source: "email_content",
        });
      }
    }
  }

  return tasks;
}

function calculateCheckInDate(flightDate: string): string | null {
  const checkInDate = new Date(flightDate);
  checkInDate.setDate(checkInDate.getDate() - 1);
  return checkInDate.toISOString().split("T")[0] || null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: flight check-in parsing requires multiple checks
function extractFlightCheckInTasks(text: string): Task[] {
  const tasks: Task[] = [];

  if (text.toLowerCase().includes("flight") && text.toLowerCase().includes("check")) {
    const { dates } = extractDatesAndTimes(text);

    if (dates.length > 0) {
      const flightDate = parseDate(dates[0]);
      if (flightDate) {
        const checkInDateStr = calculateCheckInDate(flightDate);
        if (checkInDateStr) {
          tasks.push({
            title: "Flight check-in",
            due_date: checkInDateStr,
            priority: "normal",
            confidence: 0.7,
            source: "email_content",
          });
        }
      }
    }
  }

  return tasks;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preparation task parsing requires multiple pattern checks
function extractPreparationTasks(text: string): Task[] {
  const tasks: Task[] = [];

  if (text.toLowerCase().includes("prepare") || text.toLowerCase().includes("preparation")) {
    const prepMatches = Array.from(text.matchAll(/prepare\s+(.+?)(?:\.|before|by|$)/gi));

    for (const match of prepMatches) {
      const prepTask = match[1];
      if (prepTask) {
        const prepTaskText = prepTask.trim();
        if (prepTaskText.length > 0) {
          tasks.push({
            title: `Prepare ${prepTaskText}`,
            priority: "normal",
            confidence: 0.8,
            source: "email_content",
          });
        }
      }
    }
  }

  return tasks;
}

function extractTasks(content: string, subject: string): Task[] {
  const text = `${subject}\n${content}`;
  const tasks: Task[] = [];

  // Extract different types of tasks
  tasks.push(...extractActionItems(text));
  tasks.push(...extractImperativeTasks(text));
  tasks.push(...extractDeadlineTasks(text));
  tasks.push(...extractRelativeDeadlineTasks(text));
  tasks.push(...extractFlightCheckInTasks(text));
  tasks.push(...extractPreparationTasks(text));

  return tasks;
}

async function extractImpliedActions(input: Record<string, unknown>): Promise<string> {
  try {
    const emailContent = typeof input.email_content === "string" ? input.email_content : "";
    const subject = typeof input.subject === "string" ? input.subject : "";

    if (!emailContent && !subject) {
      return JSON.stringify({
        calendar_events: [],
        tasks: [],
      });
    }

    // Limit content length for security
    const maxLength = 10000;
    const truncatedContent =
      emailContent.length > maxLength ? emailContent.substring(0, maxLength) : emailContent;

    const result: ExtractedActions = {
      calendar_events: [],
      tasks: [],
    };

    // Extract different types of events and tasks
    result.calendar_events.push(...extractFlightEvents(truncatedContent, subject));
    result.calendar_events.push(...extractMeetingEvents(truncatedContent, subject));
    result.tasks.push(...extractTasks(truncatedContent, subject));

    return JSON.stringify(result);
  } catch (err) {
    log.error({ err: String(err) }, "extract_implied_actions failed");
    return JSON.stringify({
      calendar_events: [],
      tasks: [],
    });
  }
}

// ---------------------------------------------------------------------------
// People mention detection in email content
// ---------------------------------------------------------------------------

// Patterns to detect people mentions in email content
const PEOPLE_MENTION_PATTERNS = [
  /(?:talked|spoke|met|discussed|chatted|emailed|called)\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /(?:from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /(?:email|message|call|meeting)\s+(?:from|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|mentioned|told|asked|suggested)/gi,
];

/**
 * Validates if a potential name is reasonable and not a common word.
 */
function isValidPersonName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 50) return false;

  const lowerName = name.toLowerCase();
  const commonWords = ["email", "message", "call", "meeting", "from", "with", "said", "told"];
  return !commonWords.includes(lowerName);
}

/**
 * Extracts potential people names from email content using pattern matching.
 * Returns an array of unique names found in the content.
 */
function extractPeopleMentions(content: string): string[] {
  const mentions = new Set<string>();

  for (const pattern of PEOPLE_MENTION_PATTERNS) {
    const matches = Array.from(content.matchAll(pattern));
    for (const match of matches) {
      const name = match[1];
      if (isValidPersonName(name)) {
        mentions.add(name.trim());
      }
    }
  }

  return Array.from(mentions);
}

/**
 * Searches the people database for a person by name using fuzzy matching.
 */
async function findPersonByName(name: string): Promise<PersonInfo | null> {
  if (!name || name.length < 2) return null;

  try {
    // Use ILIKE for case-insensitive partial matching
    const result = await pool.query(
      `SELECT id, name, relationship_type 
       FROM people 
       WHERE LOWER(name) ILIKE $1
       LIMIT 1`,
      [`%${name.toLowerCase()}%`],
    );

    if (result.rows.length > 0) {
      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        relationship_type: result.rows[0].relationship_type,
      };
    }

    return null;
  } catch (err) {
    log.error({ err: String(err), name }, "Failed to query people database by name");
    return null;
  }
}

/**
 * Finds all people mentioned in email content and returns their database records.
 */
async function findMentionedPeople(content: string): Promise<PersonInfo[]> {
  const mentions = extractPeopleMentions(content);
  const people: PersonInfo[] = [];

  for (const mention of mentions) {
    const person = await findPersonByName(mention);
    if (person) {
      // Avoid duplicates
      if (!people.some((p) => p.id === person.id)) {
        people.push(person);
      }
    }
  }

  return people;
}

// ---------------------------------------------------------------------------
// log_interaction tool
// ---------------------------------------------------------------------------

/**
 * Validates log_interaction input parameters.
 */
function validateLogInteractionInput(input: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: { threadId: string; people: string[]; interactionType: string; notes: string };
} {
  const threadId = typeof input.thread_id === "string" ? input.thread_id.trim() : "";
  const people = Array.isArray(input.people) ? input.people : [];
  const interactionType =
    typeof input.interaction_type === "string" ? input.interaction_type : "email";
  const notes = typeof input.notes === "string" ? input.notes : "";

  if (!threadId || threadId.length > MAX_THREAD_ID_LEN) {
    return { valid: false, error: "log_interaction: invalid 'thread_id'" };
  }

  if (!Array.isArray(people) || people.length === 0) {
    return {
      valid: false,
      error: "log_interaction: 'people' array is required and cannot be empty",
    };
  }

  return { valid: true, data: { threadId, people, interactionType, notes } };
}

/**
 * Resolves a person reference (ID or name) to a PersonInfo object.
 */
async function resolvePersonReference(personRef: string): Promise<PersonInfo | null> {
  if (typeof personRef !== "string") return null;

  // Try as ID first (numeric string)
  if (/^\d+$/.test(personRef)) {
    try {
      const result = await pool.query(
        `SELECT id, name, relationship_type FROM people WHERE id = $1`,
        [parseInt(personRef, 10)],
      );
      if (result.rows.length > 0) {
        return {
          id: result.rows[0].id,
          name: result.rows[0].name,
          relationship_type: result.rows[0].relationship_type,
        };
      }
    } catch (err) {
      log.error({ err: String(err), personRef }, "Failed to query person by ID");
    }
  }

  // If not found by ID, try by name
  return findPersonByName(personRef);
}

/**
 * Creates interaction records for all resolved people in a transaction.
 */
async function createInteractionRecords(
  resolvedPeople: PersonInfo[],
  threadId: string,
  notes: string,
): Promise<number[]> {
  const interactionIds: number[] = [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const person of resolvedPeople) {
      // Insert interaction record
      const interactionResult = await client.query(
        `INSERT INTO interactions (person_id, notes, interacted_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [person.id, notes || `Email interaction (thread: ${threadId})`],
      );

      interactionIds.push(interactionResult.rows[0].id);

      // Update last_interaction_at for the person
      await client.query(
        `UPDATE people 
         SET last_interaction_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [person.id],
      );
    }

    await client.query("COMMIT");
    return interactionIds;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Logs an email interaction with specified people in the database.
 * Creates interaction records and updates last_interaction_at for each person.
 */
async function logInteraction(input: Record<string, unknown>): Promise<string> {
  try {
    // Validate input
    const validation = validateLogInteractionInput(input);
    if (!validation.valid) {
      return JSON.stringify({ error: validation.error });
    }

    const { threadId, people, interactionType, notes } = validation.data as {
      threadId: string;
      people: string[];
      interactionType: string;
      notes: string;
    };

    // Resolve all people references
    const resolvedPeople: PersonInfo[] = [];
    for (const personRef of people) {
      const person = await resolvePersonReference(personRef);
      if (person && !resolvedPeople.some((p) => p.id === person.id)) {
        resolvedPeople.push(person);
      }
    }

    if (resolvedPeople.length === 0) {
      return JSON.stringify({
        error: "log_interaction: no valid people found in database",
        provided_people: people,
      });
    }

    // Create interaction records
    const interactionIds = await createInteractionRecords(resolvedPeople, threadId, notes);

    return JSON.stringify({
      success: true,
      message: `Logged email interaction with ${resolvedPeople.length} person(s)`,
      interaction_ids: interactionIds,
      people: resolvedPeople.map((p) => ({ id: p.id, name: p.name })),
      thread_id: threadId,
      interaction_type: interactionType,
    });
  } catch (err) {
    log.error({ err: String(err) }, "log_interaction failed");
    return JSON.stringify({ error: "log_interaction failed" });
  }
}

// ---------------------------------------------------------------------------
// Enhanced email functions with people detection
// ---------------------------------------------------------------------------

/**
 * Enhanced version of enrichSenderInfo that also returns person info for further processing.
 */
async function enrichSenderInfoWithPerson(
  fromHeader: string,
): Promise<{ enriched: string; person: PersonInfo | null }> {
  const email = extractEmailAddress(fromHeader);
  if (!email) return { enriched: fromHeader, person: null };

  const person = await findPersonByEmail(email);
  if (!person?.name) return { enriched: fromHeader, person: null };

  // Build enriched sender info with person details
  const personDetails = person.relationship_type
    ? `${person.name} - ${person.relationship_type}`
    : person.name;

  return {
    enriched: `${fromHeader} (${personDetails})`,
    person: { id: person.id || 0, name: person.name, relationship_type: person.relationship_type },
  };
}

// ---------------------------------------------------------------------------
// Unified executor
// ---------------------------------------------------------------------------

export async function executeGmailTool(
  operation: string,
  input: Record<string, unknown>,
): Promise<string> {
  if (operation.length > MAX_OPERATION_LEN) {
    return JSON.stringify({ error: "Unknown Gmail operation" });
  }

  switch (operation) {
    case "get_inbox_summary":
      return getInboxSummary(input);

    case "get_thread":
      return getThread(input);

    case "extract_implied_actions":
      return extractImpliedActions(input);

    case "log_interaction":
      return logInteraction(input);

    default:
      return JSON.stringify({ error: `Unknown Gmail operation: ${operation}` });
  }
}
