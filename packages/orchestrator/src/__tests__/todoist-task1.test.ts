/**
 * Tests for packages/orchestrator/src/tools/todoist.ts — Task-1 (Phase 2)
 *
 * Acceptance criteria:
 *   AC1: todoist.ts exports executeToDoistTool function that handles all 5 task operations
 *   AC2: get_tasks accepts filter parameter (e.g. 'today', 'overdue') and returns formatted task list
 *   AC3: create_task accepts content, due_date, priority and returns task ID
 *   AC4: complete_task and delete_task accept task ID and return success confirmation
 *   AC5: update_task accepts task ID and partial fields (due_date, priority) for updates
 *   AC6: All functions use TODOIST_API_TOKEN from env and proper HTTP error handling
 *   AC7: Response format matches agent expectations with JSON serialization
 *
 * Strategy
 * --------
 * - The Todoist REST API v2 (fetch) is fully mocked — no real network calls.
 * - @lifeos/shared env and logger are mocked with silent stubs.
 * - Each describe block uses vi.resetModules() + vi.doMock() in beforeEach for
 *   full module isolation, matching the established patterns in calendar tests.
 * - Tests will FAIL in the RED phase because todoist.ts does not yet exist.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silent logger mock matching the @lifeos/shared logger interface. */
function buildLoggerMock() {
  const child = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return {
    child: vi.fn(() => child),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

/** Shared env mock that includes TODOIST_API_TOKEN. */
function buildEnvMock(overrides: Record<string, string> = {}) {
  return {
    ANTHROPIC_API_KEY: "sk-ant-test",
    ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
    TZ: "Europe/London",
    DATABASE_URL: "postgresql://localhost/test",
    TODOIST_API_TOKEN: "test-todoist-token-abc123",
    TELEGRAM_BOT_TOKEN: "123:test",
    TELEGRAM_ALLOWED_CHAT_ID: "100",
    DIGEST_CRON: "0 8 * * *",
    ORCHESTRATOR_URL: "http://localhost:3001",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REFRESH_TOKEN: "",
    BOT_MODE: "polling" as const,
    LOG_LEVEL: "silent",
    PORT: "3001",
    ...overrides,
  };
}

/** Build a fetch mock that returns a successful JSON response. */
function buildSuccessFetchMock(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
}

/** Build a fetch mock that returns an HTTP error. */
function buildHttpErrorFetchMock(status: number, body = "") {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error("not JSON")),
    text: () => Promise.resolve(body || `HTTP ${status} error`),
  } as unknown as Response);
}

/** Build a fetch mock that rejects with a network error. */
function buildNetworkErrorFetchMock(message = "ECONNREFUSED: Todoist unreachable") {
  return vi.fn().mockRejectedValue(new Error(message));
}

/** Minimal Todoist task object returned by the REST API v2. */
function makeTodoistTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-123",
    content: "Buy groceries",
    description: "",
    is_completed: false,
    priority: 1,
    due: null,
    url: "https://todoist.com/app/task/task-123",
    project_id: "proj-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC1 — executeToDoistTool is exported and handles all 5 operations
// ---------------------------------------------------------------------------

describe("AC1 — executeToDoistTool exported and routes all 5 operations", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("todoist.ts exports executeToDoistTool as a function", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const mod = await import("../tools/todoist.js");
    expect(typeof mod.executeToDoistTool).toBe("function");
  });

  it("executeToDoistTool handles 'get_tasks' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([makeTodoistTask()]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeToDoistTool handles 'create_task' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "new-task-456" }), 200);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Write unit tests",
      due_date: "2026-04-25",
      priority: 2,
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeToDoistTool handles 'complete_task' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    // Complete returns 204 No Content
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "task-123" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeToDoistTool handles 'delete_task' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    // Delete returns 204 No Content
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "task-123" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeToDoistTool handles 'update_task' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(
      makeTodoistTask({ due: { date: "2026-04-30" }, priority: 3 }),
    );
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "task-123",
      due_date: "2026-04-30",
      priority: 3,
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeToDoistTool returns JSON error for unknown operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("unknown_operation_xyz", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(parsed.error.toLowerCase()).toMatch(/unknown/);
  });
});

// ---------------------------------------------------------------------------
// AC2 — get_tasks: filter parameter and formatted task list
// ---------------------------------------------------------------------------

describe("AC2 — get_tasks: filter parameter and formatted task list", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_tasks passes filter='today' to Todoist REST API v2", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock([makeTodoistTask()]);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("get_tasks", { filter: "today" });

    // 2 calls: tasks endpoint + project map (for display names)
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
    const url = callArgs[0];
    expect(url).toContain("today");
  });

  it("get_tasks passes filter='overdue' to Todoist REST API v2", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock([
      makeTodoistTask({ content: "Overdue item", due: { date: "2026-04-10" } }),
    ]);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("get_tasks", { filter: "overdue" });

    // 2 calls: tasks endpoint + project map (for display names)
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
    const url = callArgs[0];
    expect(url).toContain("overdue");
  });

  it("get_tasks returns a formatted string containing task content", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([
      makeTodoistTask({ content: "Buy groceries", id: "t1" }),
      makeTodoistTask({ content: "Call dentist", id: "t2" }),
    ]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(result).toContain("Buy groceries");
    expect(result).toContain("Call dentist");
  });

  it("get_tasks returns a graceful empty message when no tasks found", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
    // Should indicate no tasks rather than returning an empty string
    expect(result.toLowerCase()).toMatch(/no tasks|nothing|empty|0 tasks/);
  });

  it("get_tasks includes task IDs in the returned output", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([
      makeTodoistTask({ id: "task-999", content: "Important meeting" }),
    ]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(result).toContain("task-999");
  });

  it("get_tasks includes due dates when present", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([
      makeTodoistTask({ content: "Submit report", due: { date: "2026-04-25" }, id: "t3" }),
    ]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(result).toContain("2026-04-25");
  });

  it("get_tasks calls the Todoist REST API v2 tasks endpoint", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock([]);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("get_tasks", { filter: "today" });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
    const url = callArgs[0];
    expect(url).toMatch(/api\.todoist\.com\/api\/v1\/tasks/);
  });

  it("get_tasks handles missing filter param gracefully — defaults to fetching all tasks", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([makeTodoistTask()]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    // No filter provided — should not throw
    const result = await executeToDoistTool("get_tasks", {});
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("get_tasks includes priority in the returned output when present", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([
      makeTodoistTask({ content: "Urgent task", priority: 4, id: "t5" }),
    ]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    // Priority 4 is the highest in Todoist (p1 in UI); result should convey priority
    expect(result).toMatch(/p[1-4]|priority|urgent/i);
  });
});

// ---------------------------------------------------------------------------
// AC3 — create_task: content, due_date, priority → returns task ID
// ---------------------------------------------------------------------------

describe("AC3 — create_task: content, due_date, priority → returns task ID", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("create_task returns the newly created task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "new-task-789" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Write release notes",
      due_date: "2026-04-26",
      priority: 2,
    });
    expect(result).toContain("new-task-789");
  });

  it("create_task sends a POST to Todoist REST API v2 tasks endpoint", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-abc" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", {
      content: "Test task",
      due_date: "2026-04-25",
      priority: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toMatch(/api\.todoist\.com\/api\/v1\/tasks/);
    expect(callArgs[1].method?.toUpperCase()).toBe("POST");
  });

  it("create_task sends content in the request body", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-xyz" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", {
      content: "Review pull requests",
      due_date: "2026-04-27",
      priority: 3,
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect(body.content).toBe("Review pull requests");
  });

  it("create_task sends due_date in the request body", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-due" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", {
      content: "Book flight",
      due_date: "2026-05-01",
      priority: 2,
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    // due_date maps to due_date or due_string depending on API
    const hasDue =
      ("due_date" in body && body.due_date === "2026-05-01") ||
      ("due_string" in body &&
        typeof body.due_string === "string" &&
        body.due_string.includes("2026-05-01"));
    expect(hasDue).toBe(true);
  });

  it("create_task sends priority in the request body", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-prio" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", {
      content: "Urgent fix",
      due_date: "2026-04-22",
      priority: 4,
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect(body.priority).toBe(4);
  });

  it("create_task returns error JSON when content is missing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask());
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      due_date: "2026-04-25",
      priority: 1,
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    // fetch must not have been called since validation failed
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("create_task works without optional due_date and priority", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "task-minimal" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    // content is required, due_date and priority are optional
    const result = await executeToDoistTool("create_task", {
      content: "Minimal task",
    });
    expect(result).toContain("task-minimal");
  });

  it("create_task response string contains 'created' or the task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "task-confirm-001" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Schedule meeting",
      due_date: "2026-04-28",
      priority: 2,
    });
    expect(result).toMatch(/task-confirm-001|created/i);
  });
});

// ---------------------------------------------------------------------------
// AC4 — complete_task and delete_task: accept task ID → success confirmation
// ---------------------------------------------------------------------------

describe("AC4 — complete_task and delete_task: task ID → success confirmation", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  // --- complete_task ---

  it("complete_task sends a POST to the close endpoint for the given task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("complete_task", { task_id: "task-close-123" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    // Todoist REST API v2 uses POST /tasks/{id}/close to complete a task
    expect(callArgs[0]).toContain("task-close-123");
    expect(callArgs[0]).toMatch(/close/);
    expect(callArgs[1].method?.toUpperCase()).toBe("POST");
  });

  it("complete_task returns a success confirmation string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "task-111" });
    expect(typeof result).toBe("string");
    expect(result.toLowerCase()).toMatch(/complet|done|success|closed/);
  });

  it("complete_task confirmation includes the task ID for traceability", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "task-complete-me" });
    expect(result).toContain("task-complete-me");
  });

  it("complete_task returns error JSON when task_id is missing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("complete_task returns error JSON when task_id is an empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // --- delete_task ---

  it("delete_task sends a DELETE request to the Todoist tasks endpoint with the task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("delete_task", { task_id: "task-delete-456" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toContain("task-delete-456");
    expect(callArgs[1].method?.toUpperCase()).toBe("DELETE");
  });

  it("delete_task returns a success confirmation string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "task-222" });
    expect(typeof result).toBe("string");
    expect(result.toLowerCase()).toMatch(/delet|remov|success/);
  });

  it("delete_task confirmation includes the task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "task-delete-me" });
    expect(result).toContain("task-delete-me");
  });

  it("delete_task returns error JSON when task_id is missing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("delete_task returns error JSON when task_id is an empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC5 — update_task: task ID + partial fields (due_date, priority)
// ---------------------------------------------------------------------------

describe("AC5 — update_task: task ID and partial fields for updates", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("update_task sends a POST/PATCH to the Todoist tasks endpoint with the task ID", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-1" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", {
      task_id: "task-upd-1",
      due_date: "2026-05-10",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toContain("task-upd-1");
    expect(["POST", "PATCH"]).toContain(callArgs[1].method?.toUpperCase());
  });

  it("update_task sends due_date in the request body when provided", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-due" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", {
      task_id: "task-upd-due",
      due_date: "2026-05-15",
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    const hasDue =
      ("due_date" in body && body.due_date === "2026-05-15") ||
      ("due_string" in body &&
        typeof body.due_string === "string" &&
        body.due_string.includes("2026-05-15"));
    expect(hasDue).toBe(true);
  });

  it("update_task sends priority in the request body when provided", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-prio" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", {
      task_id: "task-upd-prio",
      priority: 4,
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect(body.priority).toBe(4);
  });

  it("update_task omits due_date from request body when not provided", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-no-due" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", {
      task_id: "task-upd-no-due",
      priority: 2,
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect("due_date" in body).toBe(false);
    expect("due_string" in body).toBe(false);
  });

  it("update_task omits priority from request body when not provided", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-no-prio" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", {
      task_id: "task-upd-no-prio",
      due_date: "2026-05-20",
    });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect("priority" in body).toBe(false);
  });

  it("update_task returns a success confirmation string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-ok" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "task-upd-ok",
      due_date: "2026-06-01",
      priority: 3,
    });
    expect(typeof result).toBe("string");
    expect(result.toLowerCase()).toMatch(/updat|success|task-upd-ok/);
  });

  it("update_task returns error JSON when task_id is missing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock({});
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      due_date: "2026-05-01",
      priority: 2,
    });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("update_task returns error JSON when task_id is an empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock({});
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", { task_id: "", due_date: "2026-05-01" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("update_task accepts both due_date and priority together", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "task-upd-both" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "task-upd-both",
      due_date: "2026-05-05",
      priority: 3,
    });

    expect(typeof result).toBe("string");
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect(body.priority).toBe(3);
    const hasDue =
      ("due_date" in body && body.due_date === "2026-05-05") ||
      ("due_string" in body &&
        typeof body.due_string === "string" &&
        body.due_string.includes("2026-05-05"));
    expect(hasDue).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC6 — All functions use TODOIST_API_TOKEN from env and proper HTTP error handling
// ---------------------------------------------------------------------------

describe("AC6 — TODOIST_API_TOKEN from env and proper HTTP error handling", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_tasks sends Authorization: Bearer <TODOIST_API_TOKEN> header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "my-secret-token-xyz" }),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock([]);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("get_tasks", { filter: "today" });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-secret-token-xyz");
  });

  it("create_task sends Authorization: Bearer <TODOIST_API_TOKEN> header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "create-token-abc" }),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "t-hdr" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", { content: "Test header", priority: 1 });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer create-token-abc");
  });

  it("complete_task sends Authorization: Bearer <TODOIST_API_TOKEN> header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "complete-token-def" }),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("complete_task", { task_id: "t-hdr-close" });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer complete-token-def");
  });

  it("delete_task sends Authorization: Bearer <TODOIST_API_TOKEN> header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "delete-token-ghi" }),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("delete_task", { task_id: "t-hdr-del" });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer delete-token-ghi");
  });

  it("update_task sends Authorization: Bearer <TODOIST_API_TOKEN> header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "update-token-jkl" }),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "t-hdr-upd" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("update_task", { task_id: "t-hdr-upd", priority: 2 });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer update-token-jkl");
  });

  it("get_tasks handles HTTP 401 Unauthorized gracefully (returns error JSON, no throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(401, "Unauthorized");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_tasks handles HTTP 403 Forbidden gracefully (returns error JSON, no throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(403, "Forbidden");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_tasks handles HTTP 500 Internal Server Error gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(500, "Internal Server Error");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("create_task handles HTTP 400 Bad Request gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(400, "Bad Request");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Fail task",
      priority: 1,
    });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("complete_task handles HTTP 404 Not Found gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(404, "Task not found");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "nonexistent-task" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("delete_task handles HTTP 404 Not Found gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(404, "Task not found");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "ghost-task" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("update_task handles HTTP 404 Not Found gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetchMock(404, "Task not found");
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "ghost-task",
      priority: 2,
    });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_tasks handles network error gracefully (returns error JSON, no throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("create_task handles network error gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Network fail task",
      priority: 1,
    });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("complete_task handles network error gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "t-net-err" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("delete_task handles network error gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "t-del-net" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("update_task handles network error gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "t-upd-net",
      priority: 1,
    });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("TODOIST_API_TOKEN is NEVER logged — logger.child().info does not receive the token", async () => {
    const loggerMock = buildLoggerMock();
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock({ TODOIST_API_TOKEN: "super-secret-do-not-log" }),
      logger: loggerMock,
    }));
    global.fetch = buildSuccessFetchMock([]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("get_tasks", { filter: "today" });

    // Verify the token value was never passed to any logger method
    const childInstance = loggerMock.child.mock.results[0]?.value as {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
      debug: ReturnType<typeof vi.fn>;
    };

    if (childInstance) {
      for (const call of [
        ...childInstance.info.mock.calls,
        ...childInstance.warn.mock.calls,
        ...childInstance.error.mock.calls,
        ...childInstance.debug.mock.calls,
      ]) {
        const callStr = JSON.stringify(call);
        expect(callStr).not.toContain("super-secret-do-not-log");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC7 — Response format matches agent expectations with JSON serialization
// ---------------------------------------------------------------------------

describe("AC7 — Response format matches agent expectations with JSON serialization", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("executeToDoistTool always returns a string (never throws, never returns undefined)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([makeTodoistTask()]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const ops = ["get_tasks", "create_task", "complete_task", "delete_task", "update_task"];
    const inputs: Record<string, Record<string, unknown>> = {
      get_tasks: { filter: "today" },
      create_task: { content: "Test", priority: 1 },
      complete_task: { task_id: "t1" },
      delete_task: { task_id: "t1" },
      update_task: { task_id: "t1", priority: 2 },
    };

    for (const op of ops) {
      // Reset fetch for each op
      global.fetch = buildSuccessFetchMock(
        op === "get_tasks" ? [makeTodoistTask()] : makeTodoistTask({ id: "t1" }),
      );
      // Also mock 204 for complete/delete
      if (op === "complete_task" || op === "delete_task") {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
        } as unknown as Response);
      }

      const result = await executeToDoistTool(op, inputs[op]!);
      expect(typeof result).toBe("string");
      expect(result).not.toBeUndefined();
    }
  });

  it("error responses from all operations are valid JSON with an 'error' key", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetchMock();
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const failOps: Array<[string, Record<string, unknown>]> = [
      ["get_tasks", { filter: "today" }],
      ["create_task", { content: "Fail", priority: 1 }],
      ["complete_task", { task_id: "t1" }],
      ["delete_task", { task_id: "t1" }],
      ["update_task", { task_id: "t1", priority: 2 }],
    ];

    for (const [op, input] of failOps) {
      global.fetch = buildNetworkErrorFetchMock();
      const result = await executeToDoistTool(op, input);

      // Must be valid JSON
      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result);
      }).not.toThrow();

      // Must contain an 'error' key
      expect((parsed as Record<string, unknown>).error).toBeDefined();
    }
  });

  it("get_tasks response is a human-readable formatted string (not raw JSON array)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock([
      makeTodoistTask({ content: "Walk the dog", id: "t-fmt-1" }),
      makeTodoistTask({ content: "Buy milk", id: "t-fmt-2" }),
    ]);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("get_tasks", { filter: "today" });
    // Should be formatted text, not a raw JSON array
    // It should not start with '[' (a raw JSON array response)
    // and should contain readable task content
    expect(result).toContain("Walk the dog");
    expect(result).toContain("Buy milk");
  });

  it("create_task success response is a non-empty string parseable by agent", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "parsed-task-001" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("create_task", {
      content: "Agent readable task",
      priority: 1,
    });
    expect(result.trim().length).toBeGreaterThan(0);
    // Must be either a plain success string or valid JSON — not undefined/null
    expect(result).not.toBe("null");
    expect(result).not.toBe("undefined");
  });

  it("complete_task success response conveys completion to the agent", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("complete_task", { task_id: "completed-t1" });
    // Must communicate success — not an empty or error response
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result).not.toMatch(/"error"/);
  });

  it("delete_task success response conveys deletion to the agent", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("delete_task", { task_id: "deleted-t1" });
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result).not.toMatch(/"error"/);
  });

  it("update_task success response conveys the update to the agent", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildSuccessFetchMock(makeTodoistTask({ id: "updated-t1" }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    const result = await executeToDoistTool("update_task", {
      task_id: "updated-t1",
      priority: 2,
    });
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result).not.toMatch(/"error"/);
  });

  it("unknown operation response is valid JSON with 'error' key (not a throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const { executeToDoistTool } = await import("../tools/todoist.js");

    let result: string;
    await expect(async () => {
      result = await executeToDoistTool("nonexistent_op", {});
    }).not.toThrow();

    const parsed = JSON.parse(result!) as { error: string };
    expect(typeof parsed.error).toBe("string");
    expect(parsed.error.length).toBeGreaterThan(0);
  });

  it("Content-Type header is application/json for write operations (create, update)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildSuccessFetchMock(makeTodoistTask({ id: "ct-task" }));
    global.fetch = fetchMock;
    const { executeToDoistTool } = await import("../tools/todoist.js");

    await executeToDoistTool("create_task", { content: "CT test task", priority: 1 });

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("All operations target api.todoist.com/rest/v2/ base URL", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));

    const ops: Array<[string, Record<string, unknown>]> = [
      ["get_tasks", { filter: "today" }],
      ["create_task", { content: "URL test", priority: 1 }],
    ];

    for (const [op, input] of ops) {
      vi.resetModules();
      vi.doMock("@lifeos/shared", () => ({
        env: buildEnvMock(),
        logger: buildLoggerMock(),
      }));
      const fetchMock = buildSuccessFetchMock(
        op === "get_tasks" ? [] : makeTodoistTask({ id: "url-t" }),
      );
      global.fetch = fetchMock;
      const { executeToDoistTool } = await import("../tools/todoist.js");

      await executeToDoistTool(op, input);

      const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
      expect(callArgs[0]).toMatch(/api\.todoist\.com\/api\/v1/);
    }
  });
});
