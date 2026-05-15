/**
 * todoist.ts — Todoist API v1 tool implementations.
 *
 * Uses the Todoist unified API v1 with Bearer token authentication.
 * Supports get_tasks, create_task, complete_task, delete_task, and update_task.
 *
 * Authentication:
 *   TODOIST_API_TOKEN — Bearer token for Todoist API v1.
 *
 * Security:
 *   - No secrets hard-coded — all credentials from environment variables.
 *   - API token is NEVER logged.
 *   - All user data goes into JSON bodies or URL query params.
 *   - All operations return strings (never throws); errors are JSON-serialised.
 */

import { env, logger } from "@lifeos/shared";

const log = logger.child({ service: "todoist-tools" });

// TODOIST_API_TOKEN is declared in EnvConfig and populated by the shared env
// loader (with an empty-string default when unset).  Read it directly.
function getTodoistToken(): string {
  return env.TODOIST_API_TOKEN;
}

const TODOIST_API_BASE = "https://api.todoist.com/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  is_completed?: boolean;
  priority?: number;
  due?: { date?: string; datetime?: string; string?: string } | null;
  url?: string;
  project_id?: string;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Handle a non-OK HTTP response: reads the body text, logs the status, and
 * returns a JSON-serialised error string.  Never throws.
 */
async function httpErrorResponse(
  response: Response,
  operation: string,
  context?: Record<string, unknown>,
): Promise<string> {
  const errorText = await response.text().catch(() => "(unreadable)");
  log.error({ status: response.status, ...context }, `${operation} HTTP error`);
  return JSON.stringify({ error: `Todoist API error ${response.status}: ${errorText}` });
}

// ---------------------------------------------------------------------------
// Response formatting
// ---------------------------------------------------------------------------

/** Convert Todoist priority number to human-readable label.
 * Todoist API: 1=normal (p4 in UI), 2=medium (p3), 3=high (p2), 4=urgent (p1).
 */
function priorityLabel(priority: number | undefined): string {
  switch (priority) {
    case 4:
      return "p1 (urgent)";
    case 3:
      return "p2 (high)";
    case 2:
      return "p3 (medium)";
    default:
      return "p4 (normal)";
  }
}

function formatTask(task: TodoistTask): string {
  const due = task.due?.date ?? task.due?.datetime ?? null;
  const priority =
    task.priority !== undefined ? ` | Priority: ${priorityLabel(task.priority)}` : "";
  const dueStr = due ? ` | Due: ${due}` : "";
  return `• [${task.id}] ${task.content}${dueStr}${priority}`;
}

function formatTasks(tasks: TodoistTask[]): string {
  if (tasks.length === 0) return "No tasks found matching the filter.";
  return tasks.map(formatTask).join("\n");
}

// ---------------------------------------------------------------------------
// get_tasks
// ---------------------------------------------------------------------------

async function getTasks(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const filter = typeof input.filter === "string" ? input.filter : undefined;

  const url = new URL(`${TODOIST_API_BASE}/tasks`);
  if (filter) {
    url.searchParams.set("filter", filter);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      return httpErrorResponse(response, "get_tasks");
    }

    const body = (await response.json()) as TodoistTask[] | { results: TodoistTask[] };
    const tasks = Array.isArray(body) ? body : body.results;
    return formatTasks(tasks);
  } catch (err) {
    log.error({ err }, "get_tasks failed");
    return JSON.stringify({ error: `get_tasks failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// create_task
// ---------------------------------------------------------------------------

async function createTask(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const content = typeof input.content === "string" ? input.content : undefined;

  if (!content?.trim()) {
    return JSON.stringify({ error: "create_task: 'content' is required" });
  }

  const body: Record<string, unknown> = { content };

  const dueDate = typeof input.due_date === "string" ? input.due_date : undefined;
  if (dueDate !== undefined) {
    body.due_date = dueDate;
  }

  const priority = typeof input.priority === "number" ? input.priority : undefined;
  if (priority !== undefined) {
    body.priority = priority;
  }

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return httpErrorResponse(response, "create_task");
    }

    const task = (await response.json()) as TodoistTask;
    return `Task created successfully (id: ${task.id}): ${task.content}`;
  } catch (err) {
    log.error({ err }, "create_task failed");
    return JSON.stringify({ error: `create_task failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// complete_task
// ---------------------------------------------------------------------------

async function completeTask(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const taskId = typeof input.task_id === "string" ? input.task_id : undefined;

  if (!taskId?.trim()) {
    return JSON.stringify({ error: "complete_task: 'task_id' is required" });
  }

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(taskId)}/close`, {
      method: "POST",
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      return httpErrorResponse(response, "complete_task", { taskId });
    }

    return `Task ${taskId} completed successfully.`;
  } catch (err) {
    log.error({ err }, "complete_task failed");
    return JSON.stringify({ error: `complete_task failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// delete_task
// ---------------------------------------------------------------------------

async function deleteTask(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const taskId = typeof input.task_id === "string" ? input.task_id : undefined;

  if (!taskId?.trim()) {
    return JSON.stringify({ error: "delete_task: 'task_id' is required" });
  }

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      return httpErrorResponse(response, "delete_task", { taskId });
    }

    return `Task ${taskId} deleted successfully.`;
  } catch (err) {
    log.error({ err }, "delete_task failed");
    return JSON.stringify({ error: `delete_task failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// update_task
// ---------------------------------------------------------------------------

async function updateTask(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const taskId = typeof input.task_id === "string" ? input.task_id : undefined;

  if (!taskId?.trim()) {
    return JSON.stringify({ error: "update_task: 'task_id' is required" });
  }

  const body: Record<string, unknown> = {};

  const dueDate = typeof input.due_date === "string" ? input.due_date : undefined;
  if (dueDate !== undefined) {
    body.due_date = dueDate;
  }

  const priority = typeof input.priority === "number" ? input.priority : undefined;
  if (priority !== undefined) {
    body.priority = priority;
  }

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return httpErrorResponse(response, "update_task", { taskId });
    }

    const task = (await response.json()) as TodoistTask;
    return `Task ${task.id ?? taskId} updated successfully.`;
  } catch (err) {
    log.error({ err }, "update_task failed");
    return JSON.stringify({ error: `update_task failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// Unified executor
// ---------------------------------------------------------------------------

/**
 * executeToDoistTool — routes Todoist tool calls by operation name.
 *
 * Always returns a string; never throws.
 * Error responses are JSON-serialised with an "error" key.
 */
export async function executeToDoistTool(
  operation: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (operation) {
    case "get_tasks":
      return getTasks(input);

    case "create_task":
      return createTask(input);

    case "complete_task":
      return completeTask(input);

    case "delete_task":
      return deleteTask(input);

    case "update_task":
      return updateTask(input);

    default:
      return JSON.stringify({ error: `Unknown Todoist operation: ${operation}` });
  }
}
