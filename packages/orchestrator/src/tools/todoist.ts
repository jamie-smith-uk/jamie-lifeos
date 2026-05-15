/**
 * todoist.ts — Todoist API v1 tool implementations.
 *
 * Uses the Todoist unified API v1 with Bearer token authentication.
 * Supports get_tasks, get_projects, get_labels, get_sections,
 * create_task, complete_task, delete_task, and update_task.
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
  section_id?: string | null;
  labels?: string[];
}

interface TodoistProject {
  id: string;
  name: string;
  is_inbox_project?: boolean;
}

interface TodoistLabel {
  id: string;
  name: string;
}

interface TodoistSection {
  id: string;
  project_id: string;
  name: string;
  order?: number;
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

async function httpErrorResponse(
  response: Response,
  operation: string,
  context?: Record<string, unknown>,
): Promise<string> {
  const errorText = await response.text().catch(() => "(unreadable)");
  log.error({ status: response.status, ...context }, `${operation} HTTP error`);
  return JSON.stringify({ error: `Todoist API error ${response.status}: ${errorText}` });
}

function extractResults<T>(body: T[] | { results: T[] }): T[] {
  return Array.isArray(body) ? body : body.results;
}

// ---------------------------------------------------------------------------
// Project map (used by get_tasks to resolve project IDs to names)
// ---------------------------------------------------------------------------

async function fetchProjectMap(token: string): Promise<Map<string, string>> {
  try {
    const response = await fetch(`${TODOIST_API_BASE}/projects`, {
      headers: buildAuthHeaders(token),
    });
    if (!response.ok) return new Map();
    const projects = extractResults(
      (await response.json()) as TodoistProject[] | { results: TodoistProject[] },
    );
    return new Map(projects.map((p) => [p.id, p.name]));
  } catch {
    return new Map();
  }
}

async function fetchSectionMap(token: string, projectId: string): Promise<Map<string, string>> {
  try {
    const url = new URL(`${TODOIST_API_BASE}/sections`);
    url.searchParams.set("project_id", projectId);
    const response = await fetch(url.toString(), { headers: buildAuthHeaders(token) });
    if (!response.ok) return new Map();
    const sections = extractResults(
      (await response.json()) as TodoistSection[] | { results: TodoistSection[] },
    );
    return new Map(sections.map((s) => [s.id, s.name]));
  } catch {
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

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

function formatTask(task: TodoistTask, projectMap?: Map<string, string>): string {
  const due = task.due?.date ?? task.due?.datetime ?? null;
  const projectName = task.project_id && projectMap ? projectMap.get(task.project_id) : undefined;
  const projectStr = projectName ? ` | Project: ${projectName}` : "";
  const labelsStr = task.labels?.length
    ? ` | Labels: ${task.labels.map((l) => `@${l}`).join(", ")}`
    : "";
  const dueStr = due ? ` | Due: ${due}` : "";
  const priorityStr =
    task.priority !== undefined ? ` | Priority: ${priorityLabel(task.priority)}` : "";
  return `• [${task.id}] ${task.content}${projectStr}${labelsStr}${dueStr}${priorityStr}`;
}

function formatTasks(tasks: TodoistTask[], projectMap?: Map<string, string>): string {
  if (tasks.length === 0) return "No tasks found.";
  return tasks.map((t) => formatTask(t, projectMap)).join("\n");
}

function groupBySectionId(tasks: TodoistTask[]): Map<string | null, TodoistTask[]> {
  const groups = new Map<string | null, TodoistTask[]>();
  for (const task of tasks) {
    const key = task.section_id ?? null;
    const group = groups.get(key) ?? [];
    group.push(task);
    groups.set(key, group);
  }
  return groups;
}

function formatTasksBySection(
  tasks: TodoistTask[],
  sectionMap: Map<string, string>,
  projectMap?: Map<string, string>,
): string {
  if (tasks.length === 0) return "No tasks found.";

  const groups = groupBySectionId(tasks);
  const lines: string[] = [];

  const unsectioned = groups.get(null);
  if (unsectioned?.length) {
    for (const t of unsectioned) lines.push(formatTask(t, projectMap));
  }

  for (const [sectionId, sectionTasks] of groups) {
    if (sectionId === null) continue;
    const sectionName = sectionMap.get(sectionId) ?? sectionId;
    lines.push(`\n── ${sectionName} (${sectionTasks.length}) ──`);
    for (const t of sectionTasks) lines.push(formatTask(t, projectMap));
  }

  return lines.join("\n").trim();
}

// ---------------------------------------------------------------------------
// get_tasks
// ---------------------------------------------------------------------------

async function getTasks(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const filter = typeof input.filter === "string" ? input.filter : undefined;
  const projectId = typeof input.project_id === "string" ? input.project_id : undefined;

  const tasksUrl = new URL(`${TODOIST_API_BASE}/tasks`);
  if (filter) tasksUrl.searchParams.set("filter", filter);
  if (projectId) tasksUrl.searchParams.set("project_id", projectId);

  // When browsing a specific project, also fetch its sections so we can group
  // tasks by section (board/column view). Otherwise just resolve project names.
  const sectionsPromise = projectId ? fetchSectionMap(token, projectId) : Promise.resolve(null);

  try {
    const [tasksResponse, projectMap, sectionMap] = await Promise.all([
      fetch(tasksUrl.toString(), { headers: buildAuthHeaders(token) }),
      fetchProjectMap(token),
      sectionsPromise,
    ]);

    if (!tasksResponse.ok) return httpErrorResponse(tasksResponse, "get_tasks");

    const tasks = extractResults(
      (await tasksResponse.json()) as TodoistTask[] | { results: TodoistTask[] },
    );

    if (sectionMap && sectionMap.size > 0) {
      return formatTasksBySection(tasks, sectionMap, projectMap);
    }
    return formatTasks(tasks, projectMap);
  } catch (err) {
    log.error({ err }, "get_tasks failed");
    return JSON.stringify({ error: `get_tasks failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// get_projects
// ---------------------------------------------------------------------------

async function getProjects(): Promise<string> {
  const token = getTodoistToken();
  try {
    const response = await fetch(`${TODOIST_API_BASE}/projects`, {
      headers: buildAuthHeaders(token),
    });
    if (!response.ok) return httpErrorResponse(response, "get_projects");
    const projects = extractResults(
      (await response.json()) as TodoistProject[] | { results: TodoistProject[] },
    );
    if (projects.length === 0) return "No projects found.";
    return projects
      .map((p) => `• [${p.id}] ${p.name}${p.is_inbox_project ? " (Inbox)" : ""}`)
      .join("\n");
  } catch (err) {
    log.error({ err }, "get_projects failed");
    return JSON.stringify({ error: `get_projects failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// get_labels
// ---------------------------------------------------------------------------

async function getLabels(): Promise<string> {
  const token = getTodoistToken();
  try {
    const response = await fetch(`${TODOIST_API_BASE}/labels`, {
      headers: buildAuthHeaders(token),
    });
    if (!response.ok) return httpErrorResponse(response, "get_labels");
    const labels = extractResults(
      (await response.json()) as TodoistLabel[] | { results: TodoistLabel[] },
    );
    if (labels.length === 0) return "No labels found.";
    return labels.map((l) => `• @${l.name}`).join("\n");
  } catch (err) {
    log.error({ err }, "get_labels failed");
    return JSON.stringify({ error: `get_labels failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// get_sections
// ---------------------------------------------------------------------------

async function getSections(input: Record<string, unknown>): Promise<string> {
  const token = getTodoistToken();
  const projectId = typeof input.project_id === "string" ? input.project_id : undefined;

  const url = new URL(`${TODOIST_API_BASE}/sections`);
  if (projectId) url.searchParams.set("project_id", projectId);

  try {
    const response = await fetch(url.toString(), { headers: buildAuthHeaders(token) });
    if (!response.ok) return httpErrorResponse(response, "get_sections");
    const sections = extractResults(
      (await response.json()) as TodoistSection[] | { results: TodoistSection[] },
    );
    if (sections.length === 0)
      return projectId ? "No sections found in that project." : "No sections found.";
    return sections.map((s) => `• [${s.id}] ${s.name}`).join("\n");
  } catch (err) {
    log.error({ err }, "get_sections failed");
    return JSON.stringify({ error: `get_sections failed: ${String(err)}` });
  }
}

// ---------------------------------------------------------------------------
// Shared optional-field parser for create/update
function parseTaskFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (typeof input.due_date === "string") fields.due_date = input.due_date;
  if (typeof input.priority === "number") fields.priority = input.priority;
  if (typeof input.project_id === "string") fields.project_id = input.project_id;
  if (typeof input.section_id === "string") fields.section_id = input.section_id;
  if (Array.isArray(input.labels)) {
    fields.labels = input.labels.filter((l): l is string => typeof l === "string");
  }
  return fields;
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

  const body: Record<string, unknown> = { content, ...parseTaskFields(input) };

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) return httpErrorResponse(response, "create_task");

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

    if (!response.ok) return httpErrorResponse(response, "complete_task", { taskId });

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

    if (!response.ok) return httpErrorResponse(response, "delete_task", { taskId });

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

  const body: Record<string, unknown> = parseTaskFields(input);

  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) return httpErrorResponse(response, "update_task", { taskId });

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

export async function executeToDoistTool(
  operation: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (operation) {
    case "get_tasks":
      return getTasks(input);
    case "get_projects":
      return getProjects();
    case "get_labels":
      return getLabels();
    case "get_sections":
      return getSections(input);
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
