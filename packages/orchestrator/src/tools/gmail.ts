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

import { env, logger } from "@lifeos/shared";

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
      const subject = getHeader(msg, "Subject") || "(no subject)";
      const snippet = msg.snippet ?? "";
      const threadId = msg.threadId ?? msg.id ?? "";
      const category = classifyEmail(subject, snippet);

      lines.push(`<untrusted>`);
      lines.push(`From: ${from}`);
      lines.push(`Subject: ${subject}`);
      if (snippet) lines.push(`Summary: ${snippet}`);
      if (threadId) lines.push(`Thread ID: ${threadId}`);
      lines.push(`</untrusted>`);
      lines.push(`Category: ${category}`);
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

    for (const msg of messages) {
      const from = getHeader(msg, "From") || "(unknown)";
      const subject = getHeader(msg, "Subject") || "(no subject)";
      const date = getHeader(msg, "Date");
      const body = extractPlainText(msg.payload);

      lines.push(`--- Message ---`);
      lines.push(`<untrusted>`);
      lines.push(`From: ${from}`);
      lines.push(`Subject: ${subject}`);
      if (date) lines.push(`Date: ${date}`);
      if (body) {
        lines.push(`Body:`);
        lines.push(body);
      }
      lines.push(`</untrusted>`);
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  } catch (err) {
    log.error({ err: String(err), threadId }, "get_thread failed");
    return JSON.stringify({ error: "get_thread failed" });
  }
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

    default:
      return JSON.stringify({ error: `Unknown Gmail operation: ${operation}` });
  }
}
