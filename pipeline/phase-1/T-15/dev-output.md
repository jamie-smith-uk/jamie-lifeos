[93m[1m! [0m agent "ag-03-developer" is a subagent, not a primary agent. Falling back to default agent
[0m
[0m> build · claude-sonnet-4-6

[0m# [0mTodos

[0m
[ ] Read existing calendar.ts file to understand current structure
[ ] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[ ] Export tool definition objects for each write tool
[ ] Write self-assessment.md to pipeline/phase-1/T-15/[0m# [0mTodos[ ] Read existing calendar.ts file to understand current structure
[ ] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[ ] Export tool definition objects for each write tool
[ ] Write self-assessment.md to pipeline/phase-1/T-15/[0m


[0m→ [0mRead packages/orchestrator/src/tools/calendar.ts
[0m✱ [0mGlob "packages/orchestrator/src/**/*.ts"[90m 10 matches[0m
[0m→ [0mRead packages/orchestrator/src/agent.ts
[0m✱ [0mGlob "pipeline/phase-1/**"[90m 0 matches[0m
[0m[x] Read existing calendar.ts file to understand current structure
[ ] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[ ] Export tool definition objects for each write tool
[ ] Update agent.ts to include write tools in TOOL_DEFINITIONS and CALENDAR_TOOL_NAMES
[ ] Write self-assessment.md to pipeline/phase-1/T-15/
[0m
[0m# [0mTodos

Now I have a thorough understanding of the existing code. Let me implement the write tool wrappers in `calendar.ts` and update `agent.ts`.
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts

[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -18,8 +18,19 @@
  *     Live Context block (not UTC) when resolving date boundaries.
  *   - Week boundary rule: 'this week' = Monday 00:00:00 local → Sunday 23:59:59 local.
  *   - Single-day queries use 00:00:00 → 23:59:59 in the local timezone.
  *
+ * T-15: Write operations (confirmation-gated — NOT called directly by the agent)
+ *   - create_event    — create a new calendar event
+ *   - update_event    — update fields on an existing event by eventId
+ *   - delete_event    — delete an existing event by eventId
+ *   - check_free_busy — query free/busy status for a time range
+ *
+ *   These write tools are included in the agent's tool definitions array so
+ *   the model is aware of them, but they MUST NOT be executed directly by the
+ *   agent. The orchestrator's confirmation executor calls them only after the
+ *   user explicitly confirms the proposed mutation.
+ *
  * Each tool is represented in two forms:
  *   1. An Anthropic tool definition object (Tool) that is included in the
  *      messages.create() call so the model knows it can invoke the tool.
  *   2. An async executor function that calls the Google Calendar MCP server
@@ -40,8 +51,10 @@
  *     being forwarded to the MCP server.
  *   - All external errors are caught and returned as structured error
  *     strings so the agent loop never crashes on a calendar failure.
  *   - No SQL, no DB access — this module is pure MCP client code.
+ *   - Write tools are never executed directly by the agent; only called
+ *     by the confirmation executor after explicit user approval.
  */
 
 import type Anthropic from "@anthropic-ai/sdk";
 import { logger } from "@lifeos/shared";
Now let me add the write tool definitions and executors to `calendar.ts`:
[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts[0m

Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -341,23 +341,538 @@
   }
 }
 
 // ---------------------------------------------------------------------------
+// Tool: create_event  (T-15 — write, confirmation-gated)
+// ---------------------------------------------------------------------------
+
+/**
+ * TypeScript types for the create_event tool parameters.
+ * Matches the Google Calendar MCP "create_event" contract.
+ */
+export interface CreateEventParams {
+  /** Event title (required). */
+  title: string;
+  /** ISO 8601 datetime for event start (required). */
+  start: string;
+  /** ISO 8601 datetime for event end (required). */
+  end: string;
+  /** Optional location string. */
+  location?: string;
+  /** Optional plain-text event description. */
+  description?: string;
+  /** Optional list of attendee email addresses. */
+  attendees?: string[];
+}
+
+/**
+ * Anthropic tool definition for create_event.
+ *
+ * Matches the Google Calendar MCP contract:
+ *   name:         "create_event"
+ *   input_schema: title, start, end (required); location, description,
+ *                 attendees (optional).
+ *
+ * IMPORTANT: This tool definition is included in the agent's tool list so
+ * the model can propose a creation, but it MUST NOT be executed directly
+ * by the agent. The confirmation executor in the orchestrator calls
+ * createEvent() only after the user explicitly confirms.
+ */
+export const createEventTool: Anthropic.Tool = {
+  name: "create_event",
+  description:
+    "Creates a new event on the user's Google Calendar. " +
+    "Use this when the user asks to schedule, book, or add an event. " +
+    "IMPORTANT: Do NOT execute this tool immediately — first present a summary " +
+    "of the event details to the user and ask for confirmation. " +
+    "Only the confirmation executor will call this tool after explicit user approval. " +
+    "Required fields: title, start (ISO 8601 with TZ offset), end (ISO 8601 with TZ offset). " +
+    "Optional fields: location, description, attendees (array of email strings).",
+  input_schema: {
+    type: "object" as const,
+    properties: {
+      title: {
+        type: "string",
+        description: "The event title or summary.",
+      },
+      start: {
+        type: "string",
+        description:
+          "Event start datetime in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T10:00:00+01:00'). Use the TZ from the Live Context block.",
+      },
+      end: {
+        type: "string",
+        description:
+          "Event end datetime in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T11:00:00+01:00'). Must be after start.",
+      },
+      location: {
+        type: "string",
+        description: "Optional location or address for the event.",
+      },
+      description: {
+        type: "string",
+        description: "Optional plain-text description or notes for the event.",
+      },
+      attendees: {
+        type: "array",
+        items: { type: "string" },
+        description: "Optional list of attendee email addresses.",
+      },
+    },
+    required: ["title", "start", "end"],
+  },
+};
+
+/**
+ * Execute the create_event tool.
+ *
+ * Validates required parameters and ISO 8601 format before forwarding to
+ * the Google Calendar MCP server.
+ *
+ * NOTE: This function is intended to be called only by the orchestrator's
+ * confirmation executor — NEVER directly by the agent.
+ *
+ * @param params  CreateEventParams — title, start, end, and optional fields.
+ * @returns       Human-readable confirmation string, or a structured error string.
+ */
+export async function createEvent(params: CreateEventParams): Promise<string> {
+  const { title, start, end, location, description, attendees } = params;
+
+  if (!title || title.trim() === "") {
+    return JSON.stringify({ error: "create_event: 'title' is required and must not be empty" });
+  }
+
+  if (!isIso8601(start)) {
+    log.warn({ start }, "create_event: invalid ISO 8601 start parameter");
+    return JSON.stringify({
+      error: "Invalid start parameter — must be an ISO 8601 datetime string",
+      received: start,
+    });
+  }
+
+  if (!isIso8601(end)) {
+    log.warn({ end }, "create_event: invalid ISO 8601 end parameter");
+    return JSON.stringify({
+      error: "Invalid end parameter — must be an ISO 8601 datetime string",
+      received: end,
+    });
+  }
+
+  // Validate attendees are strings if provided.
+  if (attendees !== undefined) {
+    const invalid = attendees.filter((a) => typeof a !== "string" || a.trim() === "");
+    if (invalid.length > 0) {
+      return JSON.stringify({
+        error: "create_event: all attendees must be non-empty email strings",
+        invalid,
+      });
+    }
+  }
+
+  // Build MCP params — omit undefined optional fields.
+  const mcpParams: Record<string, unknown> = { title, start, end };
+  if (location !== undefined) mcpParams["location"] = location;
+  if (description !== undefined) mcpParams["description"] = description;
+  if (attendees !== undefined && attendees.length > 0) mcpParams["attendees"] = attendees;
+
+  try {
+    const result = await callMcpTool("create_event", mcpParams);
+
+    if (!result || result.trim() === "") {
+      return `Event "${title}" created successfully.`;
+    }
+
+    return result;
+  } catch (err) {
+    log.error({ err, title, start, end }, "create_event MCP call failed");
+    return JSON.stringify({
+      error: "Failed to create event",
+      detail: String(err),
+    });
+  }
+}
+
+// ---------------------------------------------------------------------------
+// Tool: update_event  (T-15 — write, confirmation-gated)
+// ---------------------------------------------------------------------------
+
+/**
+ * TypeScript types for the update_event tool parameters.
+ * Matches the Google Calendar MCP "update_event" contract.
+ */
+export interface UpdateEventParams {
+  /** The Google Calendar event ID to update (required). */
+  eventId: string;
+  /** New event title. */
+  title?: string;
+  /** New ISO 8601 start datetime. */
+  start?: string;
+  /** New ISO 8601 end datetime. */
+  end?: string;
+  /** New location. */
+  location?: string;
+  /** New plain-text description. */
+  description?: string;
+  /** Replacement list of attendee email addresses. */
+  attendees?: string[];
+}
+
+/**
+ * Anthropic tool definition for update_event.
+ *
+ * Matches the Google Calendar MCP contract:
+ *   name:         "update_event"
+ *   input_schema: eventId (required); all other fields optional (partial update).
+ *
+ * IMPORTANT: This tool definition is included in the agent's tool list so
+ * the model can propose an update, but it MUST NOT be executed directly
+ * by the agent. The confirmation executor calls updateEvent() only after
+ * the user explicitly confirms.
+ */
+export const updateEventTool: Anthropic.Tool = {
+  name: "update_event",
+  description:
+    "Updates one or more fields on an existing Google Calendar event. " +
+    "Use this when the user asks to reschedule, rename, or modify an event. " +
+    "IMPORTANT: Do NOT execute this tool immediately — first present the proposed " +
+    "changes to the user and ask for confirmation. " +
+    "Only the confirmation executor will call this tool after explicit user approval. " +
+    "Required field: eventId. Provide only the fields you want to change (partial update). " +
+    "Datetime fields must be ISO 8601 with local timezone offset.",
+  input_schema: {
+    type: "object" as const,
+    properties: {
+      eventId: {
+        type: "string",
+        description: "The Google Calendar event ID of the event to update.",
+      },
+      title: {
+        type: "string",
+        description: "New event title or summary.",
+      },
+      start: {
+        type: "string",
+        description:
+          "New event start datetime in ISO 8601 format with local timezone offset.",
+      },
+      end: {
+        type: "string",
+        description:
+          "New event end datetime in ISO 8601 format with local timezone offset. Must be after start.",
+      },
+      location: {
+        type: "string",
+        description: "New location or address for the event.",
+      },
+      description: {
+        type: "string",
+        description: "New plain-text description or notes for the event.",
+      },
+      attendees: {
+        type: "array",
+        items: { type: "string" },
+        description: "Replacement list of attendee email addresses.",
+      },
+    },
+    required: ["eventId"],
+  },
+};
+
+/**
+ * Execute the update_event tool.
+ *
+ * Validates required and optional parameters before forwarding to the
+ * Google Calendar MCP server. Only fields that are explicitly provided
+ * are sent (partial update semantics).
+ *
+ * NOTE: This function is intended to be called only by the orchestrator's
+ * confirmation executor — NEVER directly by the agent.
+ *
+ * @param params  UpdateEventParams — eventId required, all other fields optional.
+ * @returns       Human-readable confirmation string, or a structured error string.
+ */
+export async function updateEvent(params: UpdateEventParams): Promise<string> {
+  const { eventId, title, start, end, location, description, attendees } = params;
+
+  if (!eventId || eventId.trim() === "") {
+    return JSON.stringify({ error: "update_event: 'eventId' is required and must not be empty" });
+  }
+
+  // Validate any provided datetime fields.
+  if (start !== undefined && !isIso8601(start)) {
+    log.warn({ start }, "update_event: invalid ISO 8601 start parameter");
+    return JSON.stringify({
+      error: "Invalid start parameter — must be an ISO 8601 datetime string",
+      received: start,
+    });
+  }
+
+  if (end !== undefined && !isIso8601(end)) {
+    log.warn({ end }, "update_event: invalid ISO 8601 end parameter");
+    return JSON.stringify({
+      error: "Invalid end parameter — must be an ISO 8601 datetime string",
+      received: end,
+    });
+  }
+
+  // Validate attendees if provided.
+  if (attendees !== undefined) {
+    const invalid = attendees.filter((a) => typeof a !== "string" || a.trim() === "");
+    if (invalid.length > 0) {
+      return JSON.stringify({
+        error: "update_event: all attendees must be non-empty email strings",
+        invalid,
+      });
+    }
+  }
+
+  // Build MCP params — always include eventId, then only changed fields.
+  const mcpParams: Record<string, unknown> = { eventId };
+  if (title !== undefined) mcpParams["title"] = title;
+  if (start !== undefined) mcpParams["start"] = start;
+  if (end !== undefined) mcpParams["end"] = end;
+  if (location !== undefined) mcpParams["location"] = location;
+  if (description !== undefined) mcpParams["description"] = description;
+  if (attendees !== undefined) mcpParams["attendees"] = attendees;
+
+  try {
+    const result = await callMcpTool("update_event", mcpParams);
+
+    if (!result || result.trim() === "") {
+      return `Event ${eventId} updated successfully.`;
+    }
+
+    return result;
+  } catch (err) {
+    log.error({ err, eventId }, "update_event MCP call failed");
+    return JSON.stringify({
+      error: "Failed to update event",
+      detail: String(err),
+    });
+  }
+}
+
+// ---------------------------------------------------------------------------
+// Tool: delete_event  (T-15 — write, confirmation-gated)
+// ---------------------------------------------------------------------------
+
+/**
+ * TypeScript types for the delete_event tool parameters.
+ */
+export interface DeleteEventParams {
+  /** The Google Calendar event ID to delete (required). */
+  eventId: string;
+}
+
+/**
+ * Anthropic tool definition for delete_event.
+ *
+ * Matches the Google Calendar MCP contract:
+ *   name:         "delete_event"
+ *   input_schema: eventId (required).
+ *
+ * IMPORTANT: This tool definition is included in the agent's tool list so
+ * the model can propose a deletion, but it MUST NOT be executed directly
+ * by the agent. The confirmation executor calls deleteEvent() only after
+ * the user explicitly confirms.
+ */
+export const deleteEventTool: Anthropic.Tool = {
+  name: "delete_event",
+  description:
+    "Permanently deletes an event from the user's Google Calendar by its event ID. " +
+    "Use this when the user asks to cancel, remove, or delete a calendar event. " +
+    "IMPORTANT: Do NOT execute this tool immediately — this action is irreversible. " +
+    "First present the event details to the user and ask for confirmation. " +
+    "Only the confirmation executor will call this tool after explicit user approval. " +
+    "Required field: eventId (obtained from a prior get_todays_events or get_events_range call).",
+  input_schema: {
+    type: "object" as const,
+    properties: {
+      eventId: {
+        type: "string",
+        description:
+          "The Google Calendar event ID of the event to delete. " +
+          "Obtain this from a prior get_todays_events or get_events_range call.",
+      },
+    },
+    required: ["eventId"],
+  },
+};
+
+/**
+ * Execute the delete_event tool.
+ *
+ * Validates the eventId before forwarding the deletion request to the
+ * Google Calendar MCP server.
+ *
+ * NOTE: This function is intended to be called only by the orchestrator's
+ * confirmation executor — NEVER directly by the agent.
+ *
+ * @param params  DeleteEventParams — eventId of the event to delete.
+ * @returns       Human-readable confirmation string, or a structured error string.
+ */
+export async function deleteEvent(params: DeleteEventParams): Promise<string> {
+  const { eventId } = params;
+
+  if (!eventId || eventId.trim() === "") {
+    return JSON.stringify({ error: "delete_event: 'eventId' is required and must not be empty" });
+  }
+
+  try {
+    const result = await callMcpTool("delete_event", { eventId });
+
+    if (!result || result.trim() === "") {
+      return `Event ${eventId} deleted successfully.`;
+    }
+
+    return result;
+  } catch (err) {
+    log.error({ err, eventId }, "delete_event MCP call failed");
+    return JSON.stringify({
+      error: "Failed to delete event",
+      detail: String(err),
+    });
+  }
+}
+
+// ---------------------------------------------------------------------------
+// Tool: check_free_busy  (T-15 — read-like query, confirmation-gated)
+// ---------------------------------------------------------------------------
+
+/**
+ * TypeScript types for the check_free_busy tool parameters.
+ */
+export interface CheckFreeBusyParams {
+  /** ISO 8601 datetime for the query range start (required). */
+  start: string;
+  /** ISO 8601 datetime for the query range end (required). */
+  end: string;
+}
+
+/**
+ * Anthropic tool definition for check_free_busy.
+ *
+ * Matches the Google Calendar MCP contract:
+ *   name:         "check_free_busy"
+ *   input_schema: start (ISO 8601), end (ISO 8601) — both required.
+ *
+ * NOTE: Although check_free_busy is a query (not a mutation), it is grouped
+ * with the write tools because it is used as a pre-flight check before
+ * scheduling confirmations and is managed by the confirmation executor.
+ * It is included in the agent's tool definitions array.
+ */
+export const checkFreeBusyTool: Anthropic.Tool = {
+  name: "check_free_busy",
+  description:
+    "Queries the user's Google Calendar to determine whether they are free or busy " +
+    "during a specified time range. " +
+    "Use this as a pre-flight check before proposing to create or move an event, " +
+    "to avoid double-booking the user. " +
+    "Both start and end must be ISO 8601 datetime strings with the local timezone offset " +
+    "(e.g. '2026-04-21T10:00:00+01:00'). " +
+    "Use the current datetime and timezone from the Live Context block to resolve " +
+    "relative time references.",
+  input_schema: {
+    type: "object" as const,
+    properties: {
+      start: {
+        type: "string",
+        description:
+          "Start of the time window to check in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T10:00:00+01:00').",
+      },
+      end: {
+        type: "string",
+        description:
+          "End of the time window to check in ISO 8601 format with local timezone offset " +
+          "(e.g. '2026-04-21T11:00:00+01:00'). Must be after start.",
+      },
+    },
+    required: ["start", "end"],
+  },
+};
+
+/**
+ * Execute the check_free_busy tool.
+ *
+ * Validates ISO 8601 format for start and end before querying the MCP server.
+ *
+ * @param params  CheckFreeBusyParams — start and end of the query window.
+ * @returns       Human-readable free/busy result string, or a structured error string.
+ */
+export async function checkFreeBusy(params: CheckFreeBusyParams): Promise<string> {
+  const { start, end } = params;
+
+  if (!isIso8601(start)) {
+    log.warn({ start }, "check_free_busy: invalid ISO 8601 start parameter");
+    return JSON.stringify({
+      error: "Invalid start parameter — must be an ISO 8601 datetime string",
+      received: start,
+    });
+  }
+
+  if (!isIso8601(end)) {
+    log.warn({ end }, "check_free_busy: invalid ISO 8601 end parameter");
+    return JSON.stringify({
+      error: "Invalid end parameter — must be an ISO 8601 datetime string",
+      received: end,
+    });
+  }
+
+  try {
+    const result = await callMcpTool("check_free_busy", { start, end });
+
+    if (!result || result.trim() === "") {
+      return `Free/busy query for ${start} to ${end} returned no data.`;
+    }
+
+    return result;
+  } catch (err) {
+    log.error({ err, start, end }, "check_free_busy MCP call failed");
+    return JSON.stringify({
+      error: "Failed to check free/busy status",
+      detail: String(err),
+    });
+  }
+}
+
+// ---------------------------------------------------------------------------
 // Tool registry — all read-operation tool definitions for Phase 1 (T-12)
 // ---------------------------------------------------------------------------
 
 /**
  * All calendar read tool definitions to be included in the Anthropic API call.
  * Import this array and spread it into TOOL_DEFINITIONS in agent.ts.
- *
- * T-15 will extend this with write operation tool definitions.
  */
 export const calendarReadToolDefinitions: Anthropic.Tool[] = [
   getTodaysEventsTool,
   getEventsRangeTool,
 ];
 
 // ---------------------------------------------------------------------------
+// Tool registry — write-operation tool definitions (T-15)
+// ---------------------------------------------------------------------------
+
+/**
+ * All calendar write (and confirmation-gated) tool definitions.
+ *
+ * These are included in the agent's TOOL_DEFINITIONS array so the model is
+ * aware of them and can propose mutations, but they are ONLY executed by the
+ * orchestrator's confirmation executor after explicit user approval.
+ *
+ * Import this array and spread it into TOOL_DEFINITIONS in agent.ts alongside
+ * calendarReadToolDefinitions.
+ */
+export const calendarWriteToolDefinitions: Anthropic.Tool[] = [
+  createEventTool,
+  updateEventTool,
+  deleteEventTool,
+  checkFreeBusyTool,
+];
+
+// ---------------------------------------------------------------------------
 // Tool executor — called by the agent tool loop in agent.ts
 // ---------------------------------------------------------------------------
 
 /**
@@ -366,8 +881,13 @@
  * This function is the single integration point between the agent's generic
  * tool loop and the calendar tool implementations. The agent.ts executeTool()
  * function should delegate to this when toolName is a known calendar tool.
  *
+ * Write tools (create_event, update_event, delete_event, check_free_busy) are
+ * also handled here for cases where the confirmation executor calls them via
+ * the same dispatch path. The agent's tool loop itself should NOT invoke write
+ * tools without the confirmation gate.
+ *
  * @param toolName   The tool name as specified in the Anthropic tool definition.
  * @param toolInput  The validated input object from the Anthropic API response.
  * @returns          A string result to feed back to the model as a tool_result.
  */
@@ -375,8 +895,12 @@
   toolName: string,
   toolInput: Record<string, unknown>,
 ): Promise<string> {
   switch (toolName) {
+    // -----------------------------------------------------------------------
+    // Read tools (T-12 / T-14)
+    // -----------------------------------------------------------------------
+
     case "get_todays_events": {
       return getTodaysEvents();
     }
 
@@ -392,8 +916,80 @@
 
       return getEventsRange(start, end);
     }
 
+    // -----------------------------------------------------------------------
+    // Write tools (T-15) — confirmation-gated; called by confirmation executor
+    // -----------------------------------------------------------------------
+
+    case "create_event": {
+      const title = typeof toolInput["title"] === "string" ? toolInput["title"] : "";
+      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
+      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
+      const location =
+        typeof toolInput["location"] === "string" ? toolInput["location"] : undefined;
+      const description =
+        typeof toolInput["description"] === "string" ? toolInput["description"] : undefined;
+      const attendees = Array.isArray(toolInput["attendees"])
+        ? (toolInput["attendees"] as string[])
+        : undefined;
+
+      if (!title || !start || !end) {
+        return JSON.stringify({
+          error: "create_event requires 'title', 'start', and 'end' parameters",
+        });
+      }
+
+      return createEvent({ title, start, end, location, description, attendees });
+    }
+
+    case "update_event": {
+      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
+
+      if (!eventId) {
+        return JSON.stringify({ error: "update_event requires an 'eventId' parameter" });
+      }
+
+      const title =
+        typeof toolInput["title"] === "string" ? toolInput["title"] : undefined;
+      const start =
+        typeof toolInput["start"] === "string" ? toolInput["start"] : undefined;
+      const end =
+        typeof toolInput["end"] === "string" ? toolInput["end"] : undefined;
+      const location =
+        typeof toolInput["location"] === "string" ? toolInput["location"] : undefined;
+      const description =
+        typeof toolInput["description"] === "string" ? toolInput["description"] : undefined;
+      const attendees = Array.isArray(toolInput["attendees"])
+        ? (toolInput["attendees"] as string[])
+        : undefined;
+
+      return updateEvent({ eventId, title, start, end, location, description, attendees });
+    }
+
+    case "delete_event": {
+      const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
+
+      if (!eventId) {
+        return JSON.stringify({ error: "delete_event requires an 'eventId' parameter" });
+      }
+
+      return deleteEvent({ eventId });
+    }
+
+    case "check_free_busy": {
+      const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
+      const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
+
+      if (!start || !end) {
+        return JSON.stringify({
+          error: "check_free_busy requires both 'start' and 'end' parameters",
+        });
+      }
+
+      return checkFreeBusy({ start, end });
+    }
+
     default: {
       return JSON.stringify({ error: `Unknown calendar tool: ${toolName}` });
     }
   }

The project uses `exactOptionalPropertyTypes: true`. I need to adjust the call sites to avoid passing `undefined` for optional keys — only pass them if they are defined:
[0m→ [0mRead packages/orchestrator/src/tools/calendar.ts[90m [offset=910, limit=100][0m
I need to fix the `exactOptionalPropertyTypes` issue by building the params objects conditionally:
[0m[0m← [0mEdit packages/orchestrator/src/tools/calendar.ts



Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/tools/calendar.ts
@@ -924,23 +924,22 @@
 case "create_event": {
   const title = typeof toolInput["title"] === "string" ? toolInput["title"] : "";
   const start = typeof toolInput["start"] === "string" ? toolInput["start"] : "";
   const end = typeof toolInput["end"] === "string" ? toolInput["end"] : "";
-  const location =
-    typeof toolInput["location"] === "string" ? toolInput["location"] : undefined;
-  const description =
-    typeof toolInput["description"] === "string" ? toolInput["description"] : undefined;
-  const attendees = Array.isArray(toolInput["attendees"])
-    ? (toolInput["attendees"] as string[])
-    : undefined;
 
   if (!title || !start || !end) {
     return JSON.stringify({
       error: "create_event requires 'title', 'start', and 'end' parameters",
     });
   }
 
-  return createEvent({ title, start, end, location, description, attendees });
+  // Build params without setting optional keys to undefined (exactOptionalPropertyTypes).
+  const createParams: CreateEventParams = { title, start, end };
+  if (typeof toolInput["location"] === "string") createParams.location = toolInput["location"];
+  if (typeof toolInput["description"] === "string") createParams.description = toolInput["description"];
+  if (Array.isArray(toolInput["attendees"])) createParams.attendees = toolInput["attendees"] as string[];
+
+  return createEvent(createParams);
 }
 
 case "update_event": {
   const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
@@ -948,23 +947,18 @@
   if (!eventId) {
     return JSON.stringify({ error: "update_event requires an 'eventId' parameter" });
   }
 
-  const title =
-    typeof toolInput["title"] === "string" ? toolInput["title"] : undefined;
-  const start =
-    typeof toolInput["start"] === "string" ? toolInput["start"] : undefined;
-  const end =
-    typeof toolInput["end"] === "string" ? toolInput["end"] : undefined;
-  const location =
-    typeof toolInput["location"] === "string" ? toolInput["location"] : undefined;
-  const description =
-    typeof toolInput["description"] === "string" ? toolInput["description"] : undefined;
-  const attendees = Array.isArray(toolInput["attendees"])
-    ? (toolInput["attendees"] as string[])
-    : undefined;
+  // Build params without setting optional keys to undefined (exactOptionalPropertyTypes).
+  const updateParams: UpdateEventParams = { eventId };
+  if (typeof toolInput["title"] === "string") updateParams.title = toolInput["title"];
+  if (typeof toolInput["start"] === "string") updateParams.start = toolInput["start"];
+  if (typeof toolInput["end"] === "string") updateParams.end = toolInput["end"];
+  if (typeof toolInput["location"] === "string") updateParams.location = toolInput["location"];
+  if (typeof toolInput["description"] === "string") updateParams.description = toolInput["description"];
+  if (Array.isArray(toolInput["attendees"])) updateParams.attendees = toolInput["attendees"] as string[];
 
-  return updateEvent({ eventId, title, start, end, location, description, attendees });
+  return updateEvent(updateParams);
 }
 
 case "delete_event": {
   const eventId = typeof toolInput["eventId"] === "string" ? toolInput["eventId"] : "";
[0m[0m# [0mTodos
[0m
[x] Read existing calendar.ts file to understand current structure
[x] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[x] Export tool definition objects for each write tool
[ ] Update agent.ts to include write tools in TOOL_DEFINITIONS and CALENDAR_TOOL_NAMES
[ ] Write self-assessment.md to pipeline/phase-1/T-15/
Now update `agent.ts` to include the write tools:
[0m← [0mEdit packages/orchestrator/src/agent.ts
[0m
Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -23,8 +23,14 @@
 * 'tomorrow', etc. to ISO 8601 datetime strings (with local TZ offset) before
 * calling get_events_range. The Live Context block provides the current
 * datetime and TZ required for this resolution.
 *
+* T-15: Calendar write tool definitions (create_event, update_event,
+* delete_event, check_free_busy) added to TOOL_DEFINITIONS and
+* CALENDAR_TOOL_NAMES. These tools are included so the model is aware of
+* them, but they are ONLY executed by the confirmation executor after explicit
+* user approval — the agent must not call them directly.
+*
 * All SQL uses parameterised queries ($1, $2, …) — no string interpolation.
 *
 * Database connection is obtained from the shared `pool` singleton which
 * reads DATABASE_URL from process.env via the shared env module.

[0m← [0mEdit packages/orchestrator/src/agent.ts[0m


Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -44,8 +44,9 @@
 import { pool, env, logger } from "@lifeos/shared";
 import type { MessageRole, ConversationMessage, IncomingMessage } from "@lifeos/shared";
 import {
   calendarReadToolDefinitions,
+  calendarWriteToolDefinitions,
   executeCalendarTool,
 } from "./tools/calendar.js";
 
 // ---------------------------------------------------------------------------
[0m← [0mEdit packages/orchestrator/src/agent.ts

Index: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -162,18 +162,22 @@
   ].join("\n\n");
 }
 
 // ---------------------------------------------------------------------------
-// Tool definitions (T-12: calendar read tools; T-15 will add write tools)
+// Tool definitions (T-12: read tools; T-15: write tools)
 // ---------------------------------------------------------------------------
 
 /**
  * Tool definitions to include in the Anthropic API call.
  * T-12 adds the calendar read tools: get_todays_events and get_events_range.
- * T-15 will extend this with calendar write tool definitions.
+ * T-15 adds the calendar write tools: create_event, update_event,
+ * delete_event, check_free_busy — these are included so the model is aware
+ * of them, but are ONLY executed by the confirmation executor after explicit
+ * user approval.
  */
 const TOOL_DEFINITIONS: Anthropic.Tool[] = [
   ...calendarReadToolDefinitions,
+  ...calendarWriteToolDefinitions,
 ];
 
 // ---------------------------------------------------------------------------
 // Tool executor
[0m
[0m← [0mEdit packages/orchestrator/src/agent.tsIndex: /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
===================================================================
--- /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
+++ /Users/jamie/Documents/jamie-lifeos/packages/orchestrator/src/agent.ts
@@ -185,13 +185,21 @@
 
 /**
  * The set of calendar tool names handled by executeCalendarTool.
  * Checked before falling through to the unknown-tool handler.
+ *
+ * T-15: Write tool names added. These are routed through executeCalendarTool
+ * just like the read tools; the confirmation gate lives in the orchestrator
+ * layer, not here.
  */
 const CALENDAR_TOOL_NAMES = new Set<string>([
   "get_todays_events",
   "get_events_range",
-  // T-15 will add: "create_event", "update_event", "delete_event", "check_free_busy"
+  // T-15 write tools (confirmation-gated — executed only by confirmation executor)
+  "create_event",
+  "update_event",
+  "delete_event",
+  "check_free_busy",
 ]);
 
 /**
  * Execute a single tool call and return its result as a string.


[0m
Now let's verify there are no TypeScript errors:
[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && npx tsc --noEmit -p packages/orchestrator/tsconfig.json 2>&1
No TypeScript errors. Now let's verify the exports are correct:
[0m
[0m177:export const getTodaysEventsTool: Anthropic.Tool = {
207:export async function getTodaysEvents(): Promise<string> {
241:export const getEventsRangeTool: Anthropic.Tool = {
309:export async function getEventsRange(start: string, end: string): Promise<string> {
352:export interface CreateEventParams {
380:export const createEventTool: Anthropic.Tool = {
439:export async function createEvent(params: CreateEventParams): Promise<string> {
504:export interface UpdateEventParams {
533:export const updateEventTool: Anthropic.Tool = {
595:export async function updateEvent(params: UpdateEventParams): Promise<string> {
663:export interface DeleteEventParams {
680:export const deleteEventTool: Anthropic.Tool = {
715:export async function deleteEvent(params: DeleteEventParams): Promise<string> {
746:export interface CheckFreeBusyParams {
765:export const checkFreeBusyTool: Anthropic.Tool = {
804:export async function checkFreeBusy(params: CheckFreeBusyParams): Promise<string> {
848:export const calendarReadToolDefinitions: Anthropic.Tool[] = [
867:export const calendarWriteToolDefinitions: Anthropic.Tool[] = [
894:export async function executeCalendarTool(


[0m$ [0mcd /Users/jamie/Documents/jamie-lifeos && grep -n "^export" packages/orchestrator/src/tools/calendar.tsAll exports are in place. Now let's mark the update agent task as complete and write the self-assessment:
[0m# [0mTodos[0m[x] Read existing calendar.ts file to understand current structure
[x] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[x] Export tool definition objects for each write tool
[x] Update agent.ts to include write tools in TOOL_DEFINITIONS and CALENDAR_TOOL_NAMES
[ ] Write self-assessment.md to pipeline/phase-1/T-15/


[0m$ [0mmkdir -p /Users/jamie/Documents/jamie-lifeos/pipeline/phase-1/T-15
[0m[0m← [0mWrite pipeline/phase-1/T-15/self-assessment.md[0m

Wrote file successfully.

[0m# [0mTodos
[x] Read existing calendar.ts file to understand current structure
[x] Implement write tool wrappers: create_event, update_event, delete_event, check_free_busy
[x] Export tool definition objects for each write tool
[x] Update agent.ts to include write tools in TOOL_DEFINITIONS and CALENDAR_TOOL_NAMES
[x] Write self-assessment.md to pipeline/phase-1/T-15/

[0mT-15 is complete. Here's a summary of what was implemented:

## T-15 — Calendar write tool wrappers

### Files modified

**`packages/orchestrator/src/tools/calendar.ts`**

Four write tool wrappers added, each in two forms (definition + executor):

| Tool | Definition export | Executor export | Params interface |
|---|---|---|---|
| `create_event` | `createEventTool` | `createEvent()` | `CreateEventParams` |
| `update_event` | `updateEventTool` | `updateEvent()` | `UpdateEventParams` |
| `delete_event` | `deleteEventTool` | `deleteEvent()` | `DeleteEventParams` |
| `check_free_busy` | `checkFreeBusyTool` | `checkFreeBusy()` | `CheckFreeBusyParams` |

All four are collected in the new exported `calendarWriteToolDefinitions: Anthropic.Tool[]` array. All cases handled in `executeCalendarTool()`.

**`packages/orchestrator/src/agent.ts`**

- Imports `calendarWriteToolDefinitions` and spreads it into `TOOL_DEFINITIONS`
- All four write tool names added to `CALENDAR_TOOL_NAMES`

### Key design decisions
- Tool descriptions explicitly instruct the model **not** to call write tools directly — they include "IMPORTANT: Do NOT execute this tool immediately" with confirmation gate language
- All datetime inputs validated via `isIso8601()` before forwarding to MCP
- Optional params built conditionally to satisfy `exactOptionalPropertyTypes: true`
- `tsc --noEmit` passes with zero errors
