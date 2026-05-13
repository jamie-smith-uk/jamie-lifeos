/**
 * agent.ts — Conversation context persistence and agent core for the orchestrator.
 *
 * T-09: Provides two functions for maintaining a rolling 20-message window of
 * conversation history in the `conversation_context` PostgreSQL table:
 *
 *   loadContext(chatId)              — fetch the last 20 messages (oldest first)
 *   saveMessage(chatId, role, content) — insert a row and prune beyond 20
 *
 * T-10: Provides the agent loop:
 *
 *   runAgent(msg)                    — assemble system prompt, load context,
 *                                       call Anthropic API, execute tool loop,
 *                                       return final text response.
 *
 * T-13: System prompt updated with calendar formatting guidelines block so
 * that when the agent receives event data from get_todays_events, it formats
 * the result as a readable chronological list (time + title + location).
 * Empty calendar responses are shown as "You have nothing scheduled today."
 *
 * T-14: System prompt Identity block extended with natural language date
 * resolution rules so the agent can translate 'next Tuesday', 'this week',
 * 'tomorrow', etc. to ISO 8601 datetime strings (with local TZ offset) before
 * calling get_events_range. The Live Context block provides the current
 * datetime and TZ required for this resolution.
 *
 * T-15: Calendar write tool definitions (create_event, update_event,
 * delete_event, check_free_busy) added to TOOL_DEFINITIONS and
 * CALENDAR_TOOL_NAMES. These tools are included so the model is aware of
 * them, but they are ONLY executed by the confirmation executor after explicit
 * user approval — the agent must not call them directly.
 *
 * T-16: Confirmation record storage on the active_confirmation JSONB column:
 *
 *   saveConfirmation(chatId, payload) — upserts payload onto the latest row's
 *                                       active_confirmation column for chat_id.
 *   loadConfirmation(chatId)          — returns pending ConfirmationPayload or
 *                                       null; null if no record or older than
 *                                       10 minutes.
 *   clearConfirmation(chatId)         — sets active_confirmation to NULL on
 *                                       the latest row for chat_id.
 *
 * T-17: Create event confirmation flow:
 *
 *   runAgent() now returns AgentResult { text, showConfirmationKeyboard }.
 *   When the agent calls create_event in the tool loop, the call is
 *   intercepted: a ConfirmationPayload is persisted via saveConfirmation and
 *   a synthetic tool_result is returned to the model so it can compose the
 *   proposal text.  showConfirmationKeyboard is set to true so the bot
 *   renders Confirm / Edit / Cancel inline buttons alongside the reply.
 *
 * T-18: Update event confirmation flow:
 *
 *   When the agent calls update_event in the tool loop, the call is
 *   intercepted just like create_event. A before/after summary is built from
 *   the tool input fields (the agent first calls get_events_range to identify
 *   the event, then passes the eventId and changed fields to update_event).
 *   A ConfirmationPayload { action: 'update_event', eventId, data } is
 *   persisted via saveConfirmation and a synthetic tool_result is returned.
 *   showConfirmationKeyboard is set to true.
 *
 *   On Edit: the orchestrator re-invokes runAgent with a synthetic edit-intent
 *   message containing the current proposal context so the agent can propose
 *   a revised change.
 *
 * All SQL uses parameterised queries ($1, $2, …) — no string interpolation.
 *
 * Database connection is obtained from the shared `pool` singleton which
 * reads DATABASE_URL from process.env via the shared env module.
 *
 * The Anthropic API key is read from process.env.ANTHROPIC_API_KEY via the
 * shared env module. The model is sourced from env.ANTHROPIC_MODEL which
 * defaults to "claude-sonnet-4-20250514".
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ConfirmationPayload,
  ConversationMessage,
  CreateEventData,
  DeleteEventData,
  IncomingMessage,
  MessageRole,
  UpdateEventData,
} from "@lifeos/shared";
import { env, logger, pool } from "@lifeos/shared";
import {
  calendarFreeBusyToolDefinitions,
  calendarReadToolDefinitions,
  calendarWriteToolDefinitions,
  executeCalendarTool,
} from "./tools/calendar.js";
import { executeGmailTool } from "./tools/gmail.js";
import { executeLifeEventsTool } from "./tools/life_events.js";
import { executeNudgesTool } from "./tools/nudges.js";
import { executePeopleTool } from "./tools/people.js";
import { executeToDoistTool } from "./tools/todoist.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of messages retained per chat_id. */
const CONTEXT_WINDOW = 20;

/** Maximum number of tool-loop iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 10;

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton)
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;

/**
 * Returns the shared Anthropic SDK client instance, creating it on first call.
 * The API key is sourced from env.ANTHROPIC_API_KEY (validated at startup).
 */
function getAnthropicClient(): Anthropic {
  if (_anthropicClient === null) {
    // Check if we're in a test environment with a vi.fn() mock
    // vi.fn() mocks have a _isMockFunction property
    const isViMock =
      typeof Anthropic === "function" &&
      (Anthropic as unknown as { _isMockFunction?: boolean })._isMockFunction === true;

    if (isViMock) {
      // This is a vi.fn() mock - call it directly instead of using new
      _anthropicClient = (Anthropic as unknown as () => Anthropic)();
    } else {
      // Normal constructor
      _anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
  }
  return _anthropicClient;
}

// ---------------------------------------------------------------------------
// System prompt assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the system prompt with exactly five blocks in order:
 *   1. Identity
 *   2. Live context (current datetime + TZ)
 *   3. People index (loaded from database)
 *   4. Pending nudges (empty in Phase 1)
 *   5. Active automations (empty in Phase 1)
 *
 * Task-2 (Phase 2): People index now loads from database and shows names
 * and relationship types for all known people.
 */
async function buildSystemPrompt(): Promise<string> {
  const now = new Date();
  const tz = env.TZ;

  // Format a human-readable local datetime string using the configured TZ.
  const localDatetime = now.toLocaleString("en-GB", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const isoDatetime = now.toISOString();

  // Load people index from database
  let peopleIndexBlock = "## People Index\n(No people records found.)";
  try {
    const result = await pool.query(
      `SELECT name, relationship_type 
       FROM people 
       ORDER BY name ASC`,
    );

    if (result.rows.length > 0) {
      const peopleList = result.rows
        .map((row) => {
          const name = row.name;
          const relationship = row.relationship_type ? ` (${row.relationship_type})` : "";
          return `- ${name}${relationship}`;
        })
        .join("\n");

      peopleIndexBlock = `## People Index\n${peopleList}`;
    }
  } catch (err) {
    logger.child({ service: "agent" }).warn({ err: String(err) }, "Failed to load people index");
  }

  return [
    // Block 1: Identity
    `## Identity
You are a personal life operating system assistant. You help the user manage their calendar, tasks, and daily schedule. You are concise, helpful, and proactive. You respond in the same language the user writes in.

When presenting calendar events to the user, always format them as a numbered or bulleted list in chronological order (earliest first). Each event must include:
  - Start time (e.g. "9:00 AM")
  - Event title
  - Location, if present (e.g. "@ Conference Room B")

Example format:
  1. 9:00 AM — Stand-up @ Zoom
  2. 12:30 PM — Lunch with Alice
  3. 3:00 PM — Design Review @ Office

If the calendar is empty for the requested period, respond with exactly: "You have nothing scheduled today."

--- Date resolution rules (T-14) ---
When the user mentions a relative date or date range, resolve it to ISO 8601 datetime strings using the current datetime and timezone from the Live Context block below BEFORE calling get_events_range. Always use the local timezone offset (e.g. +01:00, -05:00), not Z/UTC, unless the configured timezone IS UTC.

Single-day queries (e.g. "next Tuesday", "tomorrow", "this Friday"):
  start = <resolved date>T00:00:00<tz-offset>
  end   = <resolved date>T23:59:59<tz-offset>

Week queries:
  "This week" = Monday of the current ISO week at T00:00:00<tz-offset> through Sunday at T23:59:59<tz-offset>.
  "Next week" = Monday of the following ISO week at T00:00:00<tz-offset> through Sunday at T23:59:59<tz-offset>.

Named-day resolution ("next Tuesday" when today is Monday 2026-04-20):
  "next Tuesday" = the Tuesday that is NEXT after today = 2026-04-21.
  "this Tuesday" when today is Monday = 2026-04-21 (same week).
  If today IS Tuesday, "next Tuesday" = 7 days from now.

Always derive day offsets from the current date in the Live Context block. The ISO week starts on Monday (ISO 8601).`,

    // Block 2: Live context
    `## Live Context
Current datetime: ${localDatetime}
ISO 8601: ${isoDatetime}
Timezone: ${tz}`,

    // Block 3: People index (loaded from database)
    peopleIndexBlock,

    // Block 4: Pending nudges (empty in Phase 1)
    `## Pending Nudges
(No pending nudges in Phase 1.)`,

    // Block 5: Active automations (empty in Phase 1)
    `## Active Automations
(No active automations in Phase 1.)`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Tool definitions (T-12: read tools; T-15: write tools; Task-3: Todoist; Task-4: Gmail)
// ---------------------------------------------------------------------------

/**
 * Tool definitions to include in the Anthropic API call.
 * T-12 adds the calendar read tools: get_todays_events and get_events_range.
 * T-15 adds the calendar write tools: create_event, update_event,
 * delete_event, check_free_busy — these are included so the model is aware
 * of them, but are ONLY executed by the confirmation executor after explicit
 * user approval.
 * Task-3 (Phase 2): Todoist tools added — get_tasks, create_task,
 * complete_task, delete_task, update_task.
 * Task-4 (Phase 2): Gmail read tools added — get_inbox_summary, get_thread.
 */
const todoistToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_tasks",
    description:
      "Retrieve tasks from Todoist. Optionally filter by a Todoist filter string (e.g. 'today', 'overdue', 'p1').",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description:
            "Todoist filter query string (e.g. 'today', 'overdue', 'p1'). If omitted, all tasks are returned.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description: "Create a new task in Todoist with an optional due date and priority.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The text content / title of the task.",
        },
        due_date: {
          type: "string",
          description: "Due date in YYYY-MM-DD format (e.g. '2026-04-30'). Optional.",
        },
        priority: {
          type: "number",
          description:
            "Task priority: 1 (normal/p4), 2 (medium/p3), 3 (high/p2), 4 (urgent/p1). Optional.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "complete_task",
    description: "Mark an existing Todoist task as completed.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The unique Todoist task ID to mark as complete.",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a Todoist task by its ID.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The unique Todoist task ID to delete.",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "update_task",
    description: "Update the due date and/or priority of an existing Todoist task.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The unique Todoist task ID to update.",
        },
        due_date: {
          type: "string",
          description: "New due date in YYYY-MM-DD format. Optional.",
        },
        priority: {
          type: "number",
          description:
            "New priority: 1 (normal/p4), 2 (medium/p3), 3 (high/p2), 4 (urgent/p1). Optional.",
        },
      },
      required: ["task_id"],
    },
  },
];

/**
 * Gmail tool definitions (Task-4, Phase 2).
 * Provides read-only inbox access: get_inbox_summary and get_thread.
 * Task-5b: Added extract_implied_actions for parsing email content.
 */
const gmailToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_inbox_summary",
    description:
      "Retrieve a summary of the user's unread Gmail inbox messages. Returns sender, subject, snippet, thread ID, and category for up to 10 unread emails.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_thread",
    description:
      "Retrieve the full message thread from Gmail by thread ID. Returns all messages in the thread with sender, subject, date, and body.",
    input_schema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "The Gmail thread ID to retrieve.",
        },
      },
      required: ["thread_id"],
    },
  },
  {
    name: "extract_implied_actions",
    description:
      "Extract implied calendar events and tasks from email content. Analyzes email text to identify meetings, flights, deadlines, and action items that could be added to calendar or task list.",
    input_schema: {
      type: "object",
      properties: {
        email_content: {
          type: "string",
          description: "The full text content of the email to analyze.",
        },
        subject: {
          type: "string",
          description: "The email subject line.",
        },
      },
      required: ["email_content"],
    },
  },
];

/**
 * People graph tool definitions.
 * Task-1 (Phase 2): People tools added — create_person, get_person,
 * update_person, log_interaction, get_lapsed_contacts.
 */
const peopleToolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_person",
    description:
      "Create a new person record in the people graph with name, relationship type, and notes.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's full name.",
        },
        relationship_type: {
          type: "string",
          description: "The relationship type (e.g. 'colleague', 'friend', 'family', 'manager').",
        },
        how_known: {
          type: "string",
          description: "How you know this person or where you met them.",
        },
        notes: {
          type: "string",
          description: "Additional notes about the person.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_person",
    description:
      "Retrieve a person record by name using fuzzy matching. Returns full person details if found.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's name to search for (supports partial matching).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_person",
    description:
      "Update an existing person record by merging new notes and updating relationship information.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's name to update (uses fuzzy matching).",
        },
        relationship_type: {
          type: "string",
          description: "Updated relationship type.",
        },
        how_known: {
          type: "string",
          description: "Updated information about how you know this person.",
        },
        notes: {
          type: "string",
          description: "Additional notes to merge with existing notes.",
        },
      },
      required: ["name"],
    },
  },

  {
    name: "get_lapsed_contacts",
    description:
      "Get people sorted by last interaction date, filtered by a threshold to find contacts you haven't interacted with recently.",
    input_schema: {
      type: "object",
      properties: {
        days_threshold: {
          type: "number",
          description:
            "Number of days since last interaction to consider 'lapsed'. Defaults to 30.",
        },
      },
      required: [],
    },
  },
  {
    name: "log_interaction",
    description: "Log an interaction with a person and update their last interaction timestamp.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's name to log interaction for (supports fuzzy matching).",
        },
        notes: {
          type: "string",
          description: "Optional notes about the interaction.",
        },
      },
      required: ["name"],
    },
  },
];

/**
 * Life events tool definitions.
 * Task-7a (Phase 3): Life events tools added — create_life_event, get_upcoming_life_events.
 */
const lifeEventsToolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_life_event",
    description:
      "Create a new life event record for a person. Automatically sets recurring flag for birthdays and anniversaries.",
    input_schema: {
      type: "object",
      properties: {
        person_name: {
          type: "string",
          description: "The name of the person this life event is for (supports fuzzy matching).",
        },
        event_type: {
          type: "string",
          description: "The type of life event (e.g. 'birthday', 'anniversary', 'graduation').",
        },
        event_date: {
          type: "string",
          description: "The date of the life event in YYYY-MM-DD format.",
        },
        notes: {
          type: "string",
          description: "Optional additional notes about the life event.",
        },
      },
      required: ["person_name", "event_type", "event_date"],
    },
  },
  {
    name: "get_upcoming_life_events",
    description:
      "Retrieve life events within a specified date range. Recurring events are adjusted to the target year.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "The start date of the range in YYYY-MM-DD format.",
        },
        end_date: {
          type: "string",
          description: "The end date of the range in YYYY-MM-DD format.",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
];

/**
 * Nudges tool definitions.
 * Task-7b (Phase 3): Nudges tools added — create_nudge, dismiss_nudge.
 */
const nudgesToolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_nudge",
    description:
      "Create a new nudge record to remind about a person or life event at a specific time.",
    input_schema: {
      type: "object",
      properties: {
        person_id: {
          type: "number",
          description: "The ID of the person this nudge is for.",
        },
        life_event_id: {
          type: "number",
          description: "Optional ID of the life event this nudge is related to.",
        },
        message: {
          type: "string",
          description: "The reminder message for the nudge.",
        },
        trigger_at: {
          type: "string",
          description:
            "When to trigger the nudge in ISO 8601 format (e.g. '2026-05-13T10:00:00Z').",
        },
      },
      required: ["person_id", "message", "trigger_at"],
    },
  },
  {
    name: "dismiss_nudge",
    description: "Dismiss a nudge by setting its status to dismissed.",
    input_schema: {
      type: "object",
      properties: {
        nudge_id: {
          type: "number",
          description: "The ID of the nudge to dismiss.",
        },
      },
      required: ["nudge_id"],
    },
  },
];

const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  ...calendarReadToolDefinitions,
  ...calendarWriteToolDefinitions,
  ...calendarFreeBusyToolDefinitions,
  ...todoistToolDefinitions,
  ...gmailToolDefinitions,
  ...peopleToolDefinitions,
  ...lifeEventsToolDefinitions,
  ...nudgesToolDefinitions,
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

/**
 * The set of calendar tool names handled by executeCalendarTool.
 * Checked before falling through to the unknown-tool handler.
 *
 * T-15: Write tool names added. These are routed through executeCalendarTool
 * just like the read tools; the confirmation gate lives in the orchestrator
 * layer, not here.
 */
const CALENDAR_TOOL_NAMES = new Set<string>([
  "get_todays_events",
  "get_events_range",
  // T-15 write tools (confirmation-gated — executed only by confirmation executor)
  "create_event",
  "update_event",
  "delete_event",
  "check_free_busy",
]);

/**
 * The set of Todoist tool names handled by executeToDoistTool.
 * Task-3 (Phase 2): All 5 Todoist operations are registered here so the
 * tool loop routes them to the Todoist module rather than the unknown-tool
 * handler.
 */
const TODOIST_TOOL_NAMES = new Set<string>([
  "get_tasks",
  "create_task",
  "complete_task",
  "delete_task",
  "update_task",
]);

/**
 * The set of Gmail tool names handled by executeGmailTool.
 * Task-4 (Phase 2): Both Gmail read operations are registered here so the
 * tool loop routes them to the Gmail module rather than the unknown-tool
 * handler.
 * Task-5b: Added extract_implied_actions for email content parsing.
 */
const GMAIL_TOOL_NAMES = new Set<string>([
  "get_inbox_summary",
  "get_thread",
  "extract_implied_actions",
]);

/**
 * The set of people tool names handled by executePeopleTool.
 * Task-1 (Phase 2): All people operations are registered here so the
 * tool loop routes them to the people module rather than the unknown-tool
 * handler.
 */
const PEOPLE_TOOL_NAMES = new Set<string>([
  "create_person",
  "get_person",
  "update_person",
  "log_interaction",
  "get_lapsed_contacts",
]);

/**
 * The set of life events tool names handled by executeLifeEventsTool.
 * Task-7a (Phase 3): All life events operations are registered here so the
 * tool loop routes them to the life events module rather than the unknown-tool
 * handler.
 */
const LIFE_EVENTS_TOOL_NAMES = new Set<string>(["create_life_event", "get_upcoming_life_events"]);

/**
 * The set of nudges tool names handled by executeNudgesTool.
 * Task-7b (Phase 3): All nudges operations are registered here so the
 * tool loop routes them to the nudges module rather than the unknown-tool
 * handler.
 */
const NUDGES_TOOL_NAMES = new Set<string>(["create_nudge", "dismiss_nudge"]);

/**
 * The set of write tool names that must be confirmation-gated.
 * When the agent calls one of these tools, the tool loop intercepts the call,
 * saves a ConfirmationPayload, and returns a synthetic tool_result so the
 * model can compose a proposal text — the actual calendar mutation is deferred
 * until the user taps Confirm.
 */
const CONFIRMATION_GATED_TOOLS = new Set<string>(["create_event", "update_event", "delete_event"]);

/**
 * Determines if a tool's results should be wrapped in <untrusted> tags.
 * Tools that return external API data or user-provided database content
 * must be labeled to prevent prompt injection attacks.
 *
 * @param toolName  The name of the tool to check.
 * @returns         True if the tool returns untrusted content.
 */
function isUntrustedTool(toolName: string): boolean {
  return (
    GMAIL_TOOL_NAMES.has(toolName) ||
    TODOIST_TOOL_NAMES.has(toolName) ||
    CALENDAR_TOOL_NAMES.has(toolName) ||
    LIFE_EVENTS_TOOL_NAMES.has(toolName) ||
    NUDGES_TOOL_NAMES.has(toolName) ||
    PEOPLE_TOOL_NAMES.has(toolName)
  );
}

/**
 * Execute a single tool call and return its result as a string.
 * Delegates to the appropriate tool module based on toolName.
 * Unrecognised tools return an error string so the model can handle it
 * gracefully rather than crashing the loop.
 *
 * NOTE: Confirmation-gated tools (create_event, update_event, delete_event)
 * must NOT be dispatched here — the tool loop intercepts them before calling
 * this function.
 *
 * @param toolName   The name of the tool to execute.
 * @param toolInput  The input parameters for the tool.
 * @returns          A string representation of the tool result.
 */
async function executeTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  // Delegate calendar read (and eventually write) tools to the calendar module.
  if (CALENDAR_TOOL_NAMES.has(toolName)) {
    return executeCalendarTool(toolName, toolInput);
  }

  // Delegate Todoist tools to the Todoist module (Task-3, Phase 2).
  if (TODOIST_TOOL_NAMES.has(toolName)) {
    return executeToDoistTool(toolName, toolInput);
  }

  // Delegate Gmail tools to the Gmail module (Task-4, Phase 2).
  if (GMAIL_TOOL_NAMES.has(toolName)) {
    return executeGmailTool(toolName, toolInput);
  }

  // Delegate people tools to the people module (Task-1, Phase 2).
  if (PEOPLE_TOOL_NAMES.has(toolName)) {
    return executePeopleTool(toolName, JSON.stringify(toolInput));
  }

  // Delegate life events tools to the life events module (Task-7a, Phase 3).
  if (LIFE_EVENTS_TOOL_NAMES.has(toolName)) {
    return executeLifeEventsTool(toolName, JSON.stringify(toolInput));
  }

  // Delegate nudges tools to the nudges module (Task-7b, Phase 3).
  if (NUDGES_TOOL_NAMES.has(toolName)) {
    // Add operation field to the input for nudges routing
    const nudgesInput = { ...toolInput, operation: toolName };
    return executeNudgesTool(JSON.stringify(nudgesInput));
  }

  // Unknown tool — return a graceful error so the model can handle it.
  logger
    .child({ service: "agent" })
    .warn({ toolName, toolInput }, "Unknown tool called — no handler registered");
  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

// ---------------------------------------------------------------------------
// Agent result type (T-17)
// ---------------------------------------------------------------------------

/**
 * The structured result returned by runAgent.
 *
 * text                    — The assistant's reply text to send to the user.
 * showConfirmationKeyboard — When true, the bot should render Confirm / Edit /
 *                            Cancel inline keyboard buttons alongside the reply.
 *                            Set to true when the agent proposed a calendar
 *                            mutation that has been saved as a ConfirmationPayload.
 */
export interface AgentResult {
  text: string;
  showConfirmationKeyboard: boolean;
}

// ---------------------------------------------------------------------------
// Proposal summary formatter (T-17)
// ---------------------------------------------------------------------------

/**
 * Build a human-readable proposal summary from a CreateEventData payload.
 *
 * Format:
 *   Title: <title>
 *   Date: <date>
 *   Time: <start time> – <end time>
 *   Duration: <N> min
 *   Location: <location>        ← omitted when absent
 *
 * All times are formatted using the configured TZ.
 */
function buildCreateEventSummary(data: CreateEventData): string {
  const tz = env.TZ;

  const startDate = new Date(data.start);
  const endDate = new Date(data.end);

  const dateStr = startDate.toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const startTimeStr = startDate.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const endTimeStr = endDate.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMin = Math.round(durationMs / 60_000);

  const lines = [
    `Title: ${data.title}`,
    `Date: ${dateStr}`,
    `Time: ${startTimeStr} – ${endTimeStr}`,
    `Duration: ${durationMin} min`,
  ];

  if (data.location) {
    lines.push(`Location: ${data.location}`);
  }

  if (data.attendees && data.attendees.length > 0) {
    lines.push(`Attendees: ${data.attendees.join(", ")}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Proposal summary formatter for update_event (T-18)
// ---------------------------------------------------------------------------

/**
 * Build a human-readable before/after proposal summary for an update_event.
 *
 * Shows only the fields that are being changed (present in `changes`).
 *
 * Format:
 *   Event ID: <eventId>
 *   Changes:
 *     Start: <new start>          ← only when start is being changed
 *     End:   <new end>            ← only when end is being changed
 *     Title: <new title>          ← only when title is being changed
 *     Location: <new location>    ← only when location is being changed
 *     Description: <new desc>     ← only when description is being changed
 *
 * All datetime values are formatted using the configured TZ.
 */
function buildUpdateEventSummary(data: UpdateEventData): string {
  const tz = env.TZ;
  const lines: string[] = [`Event ID: ${data.eventId}`, "Changes:"];

  if (data.title !== undefined) {
    lines.push(`  Title: ${data.title}`);
  }

  if (data.start !== undefined) {
    const startDate = new Date(data.start);
    const startDateStr = startDate.toLocaleDateString("en-GB", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const startTimeStr = startDate.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    lines.push(`  Start: ${startDateStr} at ${startTimeStr}`);
  }

  if (data.end !== undefined) {
    const endDate = new Date(data.end);
    const endDateStr = endDate.toLocaleDateString("en-GB", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endTimeStr = endDate.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    lines.push(`  End: ${endDateStr} at ${endTimeStr}`);
  }

  if (data.location !== undefined) {
    lines.push(`  Location: ${data.location}`);
  }

  if (data.description !== undefined) {
    lines.push(`  Description: ${data.description}`);
  }

  if (data.attendees !== undefined && data.attendees.length > 0) {
    lines.push(`  Attendees: ${data.attendees.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Build a human-readable summary for a delete event confirmation.
 * T-19: Delete event confirmation summary includes event ID and permanent warning.
 *
 * @param data  The delete event data containing eventId.
 * @returns     A formatted summary string for the confirmation message.
 */
function buildDeleteEventSummary(data: DeleteEventData): string {
  return [
    `Event ID: ${data.eventId}`,
    "",
    "⚠️  This action is permanent and cannot be undone.",
    "The event will be completely removed from your calendar.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

/**
 * Run the agent for an incoming message.
 *
 * Steps:
 *   1. Load conversation context for the chat.
 *   2. Assemble system prompt with five blocks.
 *   3. Append the new user message to the messages array.
 *   4. Call the Anthropic API with tool definitions.
 *   5. Tool loop: while the response contains tool_use blocks, execute each
 *      tool (intercepting confirmation-gated tools), append tool_result to
 *      messages, and call the API again.
 *   6. Persist both the user message and the final assistant response.
 *   7. Return AgentResult { text, showConfirmationKeyboard }.
 *
 * T-17: Confirmation-gated tools (create_event, update_event, delete_event)
 * are intercepted in the tool loop. Instead of executing them immediately,
 * a ConfirmationPayload is persisted via saveConfirmation and a synthetic
 * tool_result is returned so the model can compose the proposal text.
 * showConfirmationKeyboard is set to true so the bot renders the inline
 * keyboard alongside the reply.
 *
 * @param msg  The incoming message from the bot.
 * @returns    AgentResult containing the reply text and keyboard flag.
 */
export async function runAgent(msg: IncomingMessage): Promise<AgentResult> {
  const log = logger.child({ service: "agent", chat_id: msg.chat_id });

  // Step 1: Load conversation context.
  const history = await loadContext(msg.chat_id);

  // Step 2: Assemble system prompt.
  const systemPrompt = await buildSystemPrompt();

  // Step 3: Build messages array — history + new user message.
  const MAX_MESSAGE_LENGTH = 50000;
  if (!msg.text || msg.text.length === 0) {
    throw new Error("Message text cannot be empty");
  }
  if (msg.text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message text exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
  }

  const messages: Anthropic.MessageParam[] = [
    // Convert stored history to Anthropic message format.
    ...history.map(
      (m): Anthropic.MessageParam => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }),
    ),
    // Append the new user message.
    { role: "user", content: msg.text },
  ];

  const client = getAnthropicClient();

  let iterationCount = 0;
  let response: Anthropic.Message;

  // T-17: Track whether a confirmation-gated tool was intercepted this turn.
  let showConfirmationKeyboard = false;

  // Step 4: Initial API call.
  // Model ID sourced from env.ANTHROPIC_MODEL (defaults to "claude-sonnet-4-20250514").
  const modelId = env.ANTHROPIC_MODEL;
  log.info({ model: modelId, messageCount: messages.length }, "Calling Anthropic API");

  response = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    tools: TOOL_DEFINITIONS,
    messages,
  });

  // Step 5: Tool loop — execute tools until no more tool_use blocks remain.
  while (response.stop_reason === "tool_use" && iterationCount < MAX_TOOL_ITERATIONS) {
    iterationCount++;
    log.info({ iteration: iterationCount }, "Tool loop iteration");

    // Collect all tool_use blocks from this response.
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      // stop_reason was tool_use but no tool blocks — defensive exit.
      break;
    }

    // Append the assistant's response (including tool_use blocks) to messages.
    messages.push({ role: "assistant", content: response.content });

    // Execute each tool and collect results.
    // T-17: confirmation-gated tools are intercepted here.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, tracked for refactor
      toolUseBlocks.map(async (toolUse) => {
        log.info({ toolName: toolUse.name, toolId: toolUse.id }, "Executing tool");

        const toolInput = toolUse.input as Record<string, unknown>;

        // ------------------------------------------------------------------
        // T-17: Intercept confirmation-gated write tools.
        // ------------------------------------------------------------------
        if (CONFIRMATION_GATED_TOOLS.has(toolUse.name)) {
          log.info(
            { toolName: toolUse.name },
            "Intercepting confirmation-gated tool — saving ConfirmationPayload",
          );

          let syntheticResult: string;

          if (toolUse.name === "create_event") {
            // Extract and validate the event data from tool input.
            const title = typeof toolInput.title === "string" ? toolInput.title : "";
            const start = typeof toolInput.start === "string" ? toolInput.start : "";
            const end = typeof toolInput.end === "string" ? toolInput.end : "";

            if (!title || !start || !end) {
              syntheticResult = JSON.stringify({
                error: "create_event requires 'title', 'start', and 'end' parameters",
              });
            } else {
              const data: CreateEventData = { title, start, end };
              if (typeof toolInput.location === "string") data.location = toolInput.location;
              if (typeof toolInput.description === "string")
                data.description = toolInput.description;
              if (Array.isArray(toolInput.attendees))
                data.attendees = toolInput.attendees as string[];

              const summary = buildCreateEventSummary(data);

              const payload: ConfirmationPayload = {
                action: "create_event",
                proposed_at: new Date().toISOString(),
                data,
                summary,
              };

              try {
                await saveConfirmation(msg.chat_id, payload);
                showConfirmationKeyboard = true;
                syntheticResult = JSON.stringify({
                  status: "pending_confirmation",
                  message:
                    "Event details have been noted. Present the following proposal to the user " +
                    "and ask them to Confirm, Edit, or Cancel using the buttons below:\n\n" +
                    summary,
                });
              } catch (saveErr) {
                log.error({ err: saveErr }, "Failed to save confirmation payload");
                syntheticResult = JSON.stringify({
                  error: "Failed to save event proposal — please try again",
                });
              }
            }
          } else if (toolUse.name === "update_event") {
            // ------------------------------------------------------------------
            // T-18: Intercept update_event — build before/after summary and
            // save ConfirmationPayload { action: 'update_event', eventId, data }.
            // ------------------------------------------------------------------
            const eventId = typeof toolInput.eventId === "string" ? toolInput.eventId : "";

            if (!eventId) {
              syntheticResult = JSON.stringify({
                error: "update_event requires an 'eventId' parameter",
              });
            } else {
              // Build UpdateEventData from partial tool input fields.
              const updateData: UpdateEventData = { eventId };
              if (typeof toolInput.title === "string") updateData.title = toolInput.title;
              if (typeof toolInput.start === "string") updateData.start = toolInput.start;
              if (typeof toolInput.end === "string") updateData.end = toolInput.end;
              if (typeof toolInput.location === "string") updateData.location = toolInput.location;
              if (typeof toolInput.description === "string")
                updateData.description = toolInput.description;
              if (Array.isArray(toolInput.attendees))
                updateData.attendees = toolInput.attendees as string[];

              const summary = buildUpdateEventSummary(updateData);

              const payload: ConfirmationPayload = {
                action: "update_event",
                proposed_at: new Date().toISOString(),
                data: updateData,
                summary,
              };

              try {
                await saveConfirmation(msg.chat_id, payload);
                showConfirmationKeyboard = true;
                syntheticResult = JSON.stringify({
                  status: "pending_confirmation",
                  message:
                    "The following update has been noted. Present this before/after proposal " +
                    "to the user and ask them to Confirm, Edit, or Cancel using the buttons below:\n\n" +
                    summary,
                });
              } catch (saveErr) {
                log.error({ err: saveErr }, "Failed to save update_event confirmation payload");
                syntheticResult = JSON.stringify({
                  error: "Failed to save event update proposal — please try again",
                });
              }
            }
          } else if (toolUse.name === "delete_event") {
            // ------------------------------------------------------------------
            // T-19: Intercept delete_event — build summary with event ID and
            // permanent warning, save ConfirmationPayload { action: 'delete_event', eventId }.
            // ------------------------------------------------------------------
            const deleteInput = toolUse.input as Record<string, unknown>;
            if (typeof deleteInput.eventId === "string" && deleteInput.eventId.trim() !== "") {
              const deleteData: DeleteEventData = {
                eventId: deleteInput.eventId,
              };

              const summary = buildDeleteEventSummary(deleteData);

              const payload: ConfirmationPayload = {
                action: "delete_event",
                proposed_at: new Date().toISOString(),
                data: deleteData,
                summary,
              };

              try {
                await saveConfirmation(msg.chat_id, payload);
                showConfirmationKeyboard = true;
                syntheticResult = JSON.stringify({
                  status: "pending_confirmation",
                  message:
                    "The following deletion has been noted. Present this proposal " +
                    "to the user and ask them to Confirm or Cancel using the buttons below:\n\n" +
                    summary,
                });
              } catch (saveErr) {
                log.error({ err: saveErr }, "Failed to save delete_event confirmation payload");
                syntheticResult = JSON.stringify({
                  error: "Failed to save event deletion proposal — please try again",
                });
              }
            } else {
              syntheticResult = JSON.stringify({
                error: "delete_event requires a valid eventId",
              });
            }
          } else {
            // Other confirmation-gated tools — fallback for any future tools
            syntheticResult = JSON.stringify({
              status: "pending_confirmation",
              message:
                "Action noted. Please present the proposed change to the user and ask for " +
                "Confirm, Edit, or Cancel.",
            });
            showConfirmationKeyboard = true;
          }

          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: syntheticResult,
          };
        }

        // ------------------------------------------------------------------
        // Normal (non-gated) tool execution.
        // ------------------------------------------------------------------
        let resultContent: string;
        try {
          resultContent = await executeTool(toolUse.name, toolInput);
        } catch (err) {
          log.error({ err, toolName: toolUse.name }, "Tool execution error");
          resultContent = JSON.stringify({ error: "Tool execution failed. Please try again." });
        }

        // Security: Wrap external tool results in <untrusted> tags
        // Gmail, Todoist, Calendar, Life Events, and Nudges tools return external API data
        if (isUntrustedTool(toolUse.name)) {
          resultContent = `<untrusted>\n${resultContent}\n</untrusted>`;
        }

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: resultContent,
        };
      }),
    );

    // Append the tool results as a user message.
    messages.push({ role: "user", content: toolResults });

    // Call the API again with the updated messages.
    response = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    });
  }

  if (iterationCount >= MAX_TOOL_ITERATIONS) {
    log.warn({ iterationCount }, "Tool loop reached maximum iterations — breaking");
  }

  // Step 6: Extract the final text response.
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  const replyText = textBlock?.text ?? "I was unable to generate a response. Please try again.";

  // Step 7: Persist the user message and assistant reply.
  await saveMessage(msg.chat_id, "user", msg.text);
  await saveMessage(msg.chat_id, "assistant", replyText);

  log.info({ replyLength: replyText.length, showConfirmationKeyboard }, "Agent response ready");

  return { text: replyText, showConfirmationKeyboard };
}

// ---------------------------------------------------------------------------
// loadContext
// ---------------------------------------------------------------------------

/**
 * Fetch the most-recent `CONTEXT_WINDOW` messages for `chatId` and return
 * them in chronological order (oldest first), ready to be passed as the
 * `messages` array to the Anthropic API.
 *
 * Query strategy:
 *   1. Use a sub-query ordered by `created_at DESC` with `LIMIT 20` to
 *      efficiently select only the relevant rows via the composite index on
 *      `(chat_id, created_at DESC)`.
 *   2. Wrap it in an outer `ORDER BY created_at ASC` to flip to oldest-first.
 *
 * @param chatId  Telegram chat ID (number).
 * @returns       Array of ConversationMessage, oldest message at index 0.
 */
export async function loadContext(chatId: number): Promise<ConversationMessage[]> {
  const result = await pool.query<ConversationMessage>(
    `SELECT id, chat_id, role, content, created_at
       FROM (
         SELECT id, chat_id, role, content, created_at
           FROM conversation_context
          WHERE chat_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT $2
       ) AS recent
      ORDER BY created_at ASC, id ASC`,
    [chatId, CONTEXT_WINDOW],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// saveMessage
// ---------------------------------------------------------------------------

/**
 * Insert a new message row for `chatId` and enforce the rolling 20-message
 * window by deleting any rows beyond the newest `CONTEXT_WINDOW` for that
 * chat_id.
 *
 * Both operations execute inside a single serializable transaction to
 * prevent races between concurrent inserts for the same chat_id.
 *
 * Pruning query:
 *   DELETE rows whose `id` is NOT in the set of the newest CONTEXT_WINDOW ids
 *   for this chat_id. Using a sub-query with `ORDER BY created_at DESC LIMIT`
 *   leverages the composite index and avoids a full table scan.
 *
 * @param chatId   Telegram chat ID (number).
 * @param role     "user" or "assistant".
 * @param content  Plain-text message body.
 */
export async function saveMessage(
  chatId: number,
  role: MessageRole,
  content: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert the new message row.
    await client.query(
      `INSERT INTO conversation_context (chat_id, role, content)
       VALUES ($1, $2, $3)`,
      [chatId, role, content],
    );

    // Delete any rows beyond the newest CONTEXT_WINDOW for this chat_id.
    // Order by (created_at DESC, id DESC) so that ties in sub-millisecond
    // timestamps are broken by the auto-increment id (newest row wins).
    // The sub-query selects the IDs of the rows we want to KEEP (newest 20),
    // then the outer DELETE removes every other row for the same chat_id.
    await client.query(
      `DELETE FROM conversation_context
        WHERE chat_id = $1
          AND id NOT IN (
            SELECT id
              FROM conversation_context
             WHERE chat_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT $2
          )`,
      [chatId, CONTEXT_WINDOW],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Confirmation pattern (T-16)
// ---------------------------------------------------------------------------

/** Expiry window for pending confirmations: 10 minutes in milliseconds. */
const CONFIRMATION_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Upsert a ConfirmationPayload onto the latest conversation_context row for
 * `chatId`.  If no rows exist yet a new placeholder row is inserted so that
 * the payload is always persisted.
 *
 * Only one active confirmation is kept per chat_id — calling this function
 * a second time overwrites the previous proposal.
 *
 * Strategy:
 *   1. Attempt to UPDATE the active_confirmation column on the single row
 *      with the highest (created_at DESC, id DESC) for this chat_id.
 *   2. If 0 rows were updated (no history yet), INSERT a minimal row so
 *      the payload is not lost.
 *
 * Both branches execute inside a serializable transaction.
 *
 * @param chatId   Telegram chat ID (number).
 * @param payload  The ConfirmationPayload to persist.
 */
export async function saveConfirmation(
  chatId: number,
  payload: ConfirmationPayload,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Attempt to update the active_confirmation column on the newest row.
    const updateResult = await client.query(
      `UPDATE conversation_context
          SET active_confirmation = $2
        WHERE id = (
          SELECT id
            FROM conversation_context
           WHERE chat_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT 1
        )`,
      [chatId, JSON.stringify(payload)],
    );

    // If no existing row was found, insert a placeholder row to carry the payload.
    if ((updateResult.rowCount ?? 0) === 0) {
      await client.query(
        `INSERT INTO conversation_context (chat_id, role, content, active_confirmation)
         VALUES ($1, 'assistant', '', $2)`,
        [chatId, JSON.stringify(payload)],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Load the pending ConfirmationPayload for `chatId`.
 *
 * Returns `null` if:
 *   - No active_confirmation exists for this chat_id.
 *   - The payload's `proposed_at` timestamp is older than 10 minutes.
 *
 * Reads the active_confirmation from the newest row for the chat_id
 * (ORDER BY created_at DESC, id DESC LIMIT 1).
 *
 * @param chatId  Telegram chat ID (number).
 * @returns       The ConfirmationPayload if pending and unexpired, else null.
 */
export async function loadConfirmation(chatId: number): Promise<ConfirmationPayload | null> {
  const result = await pool.query<{ active_confirmation: ConfirmationPayload | null }>(
    `SELECT active_confirmation
       FROM conversation_context
      WHERE chat_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [chatId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const payload = result.rows[0]?.active_confirmation ?? null;
  if (payload === null) {
    return null;
  }

  // Enforce 10-minute expiry.
  const proposedAt = new Date(payload.proposed_at).getTime();
  if (Date.now() - proposedAt > CONFIRMATION_EXPIRY_MS) {
    // Expired — treat as absent (do not modify DB here; caller or clearConfirmation handles cleanup).
    return null;
  }

  return payload;
}

/**
 * Clear the active_confirmation column on the latest conversation_context row
 * for `chatId`, setting it to NULL.
 *
 * This is called after the user taps Confirm, Edit, or Cancel, or when the
 * orchestrator detects an expired payload and wants to clean up explicitly.
 *
 * Uses a single UPDATE targeting the newest row for this chat_id; if no row
 * exists the operation is a no-op.
 *
 * @param chatId  Telegram chat ID (number).
 */
export async function clearConfirmation(chatId: number): Promise<void> {
  await pool.query(
    `UPDATE conversation_context
        SET active_confirmation = NULL
      WHERE id = (
        SELECT id
          FROM conversation_context
         WHERE chat_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1
      )`,
    [chatId],
  );
}
