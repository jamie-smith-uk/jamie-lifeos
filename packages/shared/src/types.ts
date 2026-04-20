/**
 * types.ts — Shared TypeScript interfaces used across all packages.
 */

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

/** Role of a message participant in a conversation thread. */
export type MessageRole = "user" | "assistant";

/**
 * A single message stored in / retrieved from the conversation_context table.
 */
export interface ConversationMessage {
  /** Auto-incremented row ID from the database. */
  id: number;
  /** Telegram chat ID that owns this message. */
  chat_id: number;
  /** Who authored the message. */
  role: MessageRole;
  /** Plain-text content of the message. */
  content: string;
  /** UTC timestamp when the row was inserted. */
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Confirmation pattern
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all actions that require user confirmation before
 * being executed against the Google Calendar.
 */
export type ConfirmationAction =
  | "create_event"
  | "update_event"
  | "delete_event";

/**
 * Payload stored in the active_confirmation JSONB column while waiting for
 * the user to tap Confirm / Edit / Cancel.
 */
export interface ConfirmationPayload {
  /** The calendar operation to execute on confirmation. */
  action: ConfirmationAction;
  /** ISO 8601 timestamp (UTC) when this confirmation was proposed. */
  proposed_at: string;
  /**
   * For create_event: the full event fields to pass to the Calendar API.
   * For update_event: { eventId, ...patchFields }.
   * For delete_event: { eventId }.
   */
  data: CreateEventData | UpdateEventData | DeleteEventData;
  /**
   * Human-readable summary shown to the user in the proposal message.
   * Used to display context in the confirmation request.
   */
  summary: string;
}

// ---------------------------------------------------------------------------
// Calendar event data shapes
// ---------------------------------------------------------------------------

export interface CreateEventData {
  title: string;
  /** ISO 8601 datetime string (e.g. "2026-04-25T15:00:00+01:00") */
  start: string;
  /** ISO 8601 datetime string */
  end: string;
  location?: string;
  description?: string;
  /** List of attendee email addresses */
  attendees?: string[];
}

export interface UpdateEventData {
  /** Google Calendar event ID to patch */
  eventId: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  attendees?: string[];
}

export interface DeleteEventData {
  /** Google Calendar event ID to remove */
  eventId: string;
}

// ---------------------------------------------------------------------------
// Callback query routing
// ---------------------------------------------------------------------------

/** Parsed representation of an inline-keyboard callback_data value. */
export type CallbackAction =
  | { type: "confirm" }
  | { type: "edit" }
  | { type: "cancel" }
  | { type: "dismiss"; nudgeId: number };

// ---------------------------------------------------------------------------
// HTTP message payloads (bot → orchestrator)
// ---------------------------------------------------------------------------

/** Body sent by the bot to POST /message on the orchestrator. */
export interface IncomingMessage {
  chat_id: number;
  text: string;
  message_id: number;
  from_username?: string;
}

/** Body sent by the bot to POST /callback on the orchestrator. */
export interface IncomingCallback {
  chat_id: number;
  callback_query_id: string;
  callback_data: string;
  message_id: number;
}

/** Response envelope returned by the orchestrator to the bot. */
export interface OrchestratorReply {
  text: string;
  /**
   * If present, the bot should render this inline keyboard markup alongside
   * the reply text (i.e. a confirmation proposal).
   */
  show_confirmation_keyboard?: boolean;
}
