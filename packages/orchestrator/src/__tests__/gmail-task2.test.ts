/**
 * Tests for packages/orchestrator/src/tools/gmail.ts — Task-2 (Phase 2)
 *
 * Acceptance criteria:
 *   AC1: gmail.ts exports executeGmailTool function that handles inbox and thread operations
 *   AC2: get_inbox_summary returns up to 10 recent unread emails with sender, subject, one-line summary
 *   AC3: get_thread accepts thread ID and returns full thread with plain-text content
 *   AC4: Emails are classified into categories: action required, FYI, waiting on
 *   AC5: Integration uses Gmail MCP server at gmail.mcp.claude.com
 *   AC6: Proper error handling for MCP connection and API failures
 *   AC7: Response format matches agent expectations with JSON serialization
 *
 * Strategy
 * --------
 * - The Gmail MCP server (fetch-based transport) is fully mocked — no real network calls.
 * - @lifeos/shared env and logger are mocked with silent stubs.
 * - Each describe block uses vi.resetModules() + vi.doMock() in beforeEach for
 *   full module isolation, matching the established pattern in todoist and calendar tests.
 * - Tests FAIL in the RED phase because gmail.ts does not yet exist — that is correct.
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

/** Shared env mock. Gmail uses MCP so no dedicated API token is required in env. */
function buildEnvMock(overrides: Record<string, string> = {}) {
  return {
    ANTHROPIC_API_KEY: "sk-ant-test",
    ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
    TZ: "Europe/London",
    DATABASE_URL: "postgresql://localhost/test",
    TODOIST_API_TOKEN: "test-todoist-token",
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

/** Build a fetch mock that returns a successful MCP JSON-RPC response body. */
function buildMcpSuccessFetch(result: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result,
      }),
    text: () => Promise.resolve(JSON.stringify({ jsonrpc: "2.0", id: 1, result })),
  } as unknown as Response);
}

/** Build a fetch mock that returns an MCP JSON-RPC error response. */
function buildMcpErrorFetch(code: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        error: { code, message },
      }),
    text: () =>
      Promise.resolve(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code, message } })),
  } as unknown as Response);
}

/** Build a fetch mock that returns a non-OK HTTP response (transport failure). */
function buildHttpErrorFetch(status: number, body = "") {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error("not JSON")),
    text: () => Promise.resolve(body || `HTTP ${status} error`),
  } as unknown as Response);
}

/** Build a fetch mock that rejects with a network error. */
function buildNetworkErrorFetch(message = "ECONNREFUSED: gmail.mcp.claude.com unreachable") {
  return vi.fn().mockRejectedValue(new Error(message));
}

/** Minimal email message object as returned by Gmail MCP. */
function makeEmail(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-001",
    threadId: "thread-abc",
    from: "alice@example.com",
    subject: "Project update",
    snippet: "Here is the latest status on the project.",
    date: "2026-04-21T09:00:00Z",
    isUnread: true,
    labels: ["INBOX", "UNREAD"],
    ...overrides,
  };
}

/** Minimal thread object as returned by Gmail MCP. */
function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: "thread-abc",
    messages: [
      {
        id: "msg-001",
        from: "alice@example.com",
        subject: "Project update",
        date: "2026-04-21T09:00:00Z",
        body: "Here is the latest status on the project.\n\nBest,\nAlice",
      },
      {
        id: "msg-002",
        from: "bob@example.com",
        subject: "Re: Project update",
        date: "2026-04-21T10:30:00Z",
        body: "Thanks Alice, looks good. Can you send the report?\n\nBob",
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC1 — executeGmailTool is exported and routes inbox and thread operations
// ---------------------------------------------------------------------------

describe("AC1 — executeGmailTool exported and routes inbox and thread operations", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("gmail.ts exports executeGmailTool as a function", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const mod = await import("../tools/gmail.js");
    expect(typeof mod.executeGmailTool).toBe("function");
  });

  it("executeGmailTool handles 'get_inbox_summary' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({ emails: [makeEmail()] });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeGmailTool handles 'get_thread' operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({ thread: makeThread() });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-abc" });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("executeGmailTool returns JSON error for unknown operation", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("unknown_gmail_operation", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(parsed.error.toLowerCase()).toMatch(/unknown/);
  });
});

// ---------------------------------------------------------------------------
// AC2 — get_inbox_summary: up to 10 unread emails with sender, subject, summary
// ---------------------------------------------------------------------------

describe("AC2 — get_inbox_summary: up to 10 unread emails with sender, subject, one-line summary", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_inbox_summary returns a string containing sender email", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [makeEmail({ from: "alice@example.com", subject: "Hello" })],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result).toContain("alice@example.com");
  });

  it("get_inbox_summary returns a string containing subject line", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [makeEmail({ subject: "Q2 planning review" })],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result).toContain("Q2 planning review");
  });

  it("get_inbox_summary includes a one-line summary/snippet for each email", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          snippet: "Please review the attached proposal by Friday.",
          subject: "Proposal",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    // The result should include a meaningful snippet/summary, not just the subject
    expect(result).toMatch(/proposal|review|friday/i);
  });

  it("get_inbox_summary limits results to at most 10 emails", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    // Provide 15 unread emails — only 10 should appear in the output
    const emails = Array.from({ length: 15 }, (_, i) =>
      makeEmail({ id: `msg-${i}`, subject: `Email subject ${i}`, from: `sender${i}@example.com` }),
    );
    global.fetch = buildMcpSuccessFetch({ emails });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    // Count occurrences of sender pattern in result — should be at most 10
    const matches = result.match(/@example\.com/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(10);
  });

  it("get_inbox_summary returns a graceful message when inbox is empty", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({ emails: [] });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
    expect(result.toLowerCase()).toMatch(/no (unread )?emails?|inbox.*empty|nothing|0 email/);
  });

  it("get_inbox_summary includes thread ID or message ID for traceability", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [makeEmail({ threadId: "thread-xyz-789", id: "msg-xyz-789" })],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    // The result should include a thread or message identifier
    expect(result).toMatch(/thread-xyz-789|msg-xyz-789/);
  });

  it("get_inbox_summary only returns unread emails", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    // The MCP call itself should filter for unread — verify the request targets unread
    const fetchMock = buildMcpSuccessFetch({ emails: [makeEmail({ isUnread: true })] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    // Verify that at least one fetch call was made
    expect(fetchMock).toHaveBeenCalled();
    const callStr = JSON.stringify(fetchMock.mock.calls);
    // The request should mention unread in some form (query param, body, or URL)
    expect(callStr.toLowerCase()).toMatch(/unread|is:unread|label.*unread/);
  });

  it("get_inbox_summary handles multiple emails and lists all of them (up to 10)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({ id: "m1", from: "alice@acme.com", subject: "Budget Q2" }),
        makeEmail({ id: "m2", from: "bob@corp.com", subject: "Team lunch" }),
        makeEmail({ id: "m3", from: "carol@org.io", subject: "PR review needed" }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result).toContain("alice@acme.com");
    expect(result).toContain("bob@corp.com");
    expect(result).toContain("carol@org.io");
  });
});

// ---------------------------------------------------------------------------
// AC3 — get_thread: accepts thread ID and returns full thread with plain-text content
// ---------------------------------------------------------------------------

describe("AC3 — get_thread: accepts thread ID and returns full thread with plain-text content", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_thread returns the content of all messages in the thread", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      thread: makeThread({
        messages: [
          {
            id: "msg-1",
            from: "alice@example.com",
            subject: "Kickoff",
            date: "2026-04-20T08:00:00Z",
            body: "Let's kick off the project next Monday.",
          },
          {
            id: "msg-2",
            from: "bob@example.com",
            subject: "Re: Kickoff",
            date: "2026-04-20T09:15:00Z",
            body: "Sounds good! I'll send the agenda.",
          },
        ],
      }),
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-abc" });
    expect(result).toContain("alice@example.com");
    expect(result).toContain("bob@example.com");
    expect(result).toContain("kick off");
    expect(result).toContain("agenda");
  });

  it("get_thread sends the thread_id to the MCP server", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ thread: makeThread() });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_thread", { thread_id: "thread-specific-99" });

    const callStr = JSON.stringify(fetchMock.mock.calls);
    expect(callStr).toContain("thread-specific-99");
  });

  it("get_thread returns plain-text content (not raw HTML)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      thread: makeThread({
        messages: [
          {
            id: "msg-plain",
            from: "carol@example.com",
            subject: "Plain text only",
            date: "2026-04-21T08:00:00Z",
            body: "This is plain text content. No HTML tags here.",
          },
        ],
      }),
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-plain" });
    // Result should not contain raw HTML tags like <div>, <span>, <br>
    expect(result).not.toMatch(/<(div|span|br|p|html|body)[^>]*>/i);
    expect(result).toContain("plain text content");
  });

  it("get_thread returns error JSON when thread_id is missing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("get_thread returns error JSON when thread_id is an empty string", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "" });
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("get_thread includes message dates in the output", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      thread: makeThread({
        messages: [
          {
            id: "msg-date",
            from: "dave@example.com",
            subject: "Date test",
            date: "2026-04-19T14:30:00Z",
            body: "Some content here.",
          },
        ],
      }),
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-dates" });
    // Should include some date indicator (year, month, or ISO fragment)
    expect(result).toMatch(/2026|Apr|april|19/i);
  });

  it("get_thread includes subject lines from messages", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      thread: makeThread({
        messages: [
          {
            id: "msg-subj",
            from: "eve@example.com",
            subject: "Quarterly review feedback",
            date: "2026-04-21T11:00:00Z",
            body: "Please see the attached feedback.",
          },
        ],
      }),
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-subj" });
    expect(result).toMatch(/quarterly review feedback/i);
  });
});

// ---------------------------------------------------------------------------
// AC4 — Email classification: action required, FYI, waiting on
// ---------------------------------------------------------------------------

describe("AC4 — Email classification into action required, FYI, waiting on categories", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_inbox_summary classifies emails that require action as 'action required'", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          subject: "Please review and approve the contract",
          snippet: "Action needed: approve the attached contract by end of day.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result.toLowerCase()).toMatch(/action.?required|action.?needed/);
  });

  it("get_inbox_summary classifies informational emails as 'FYI'", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          subject: "FYI: Office is closed on Monday",
          snippet: "Just a heads up — the office will be closed on Monday April 27.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result.toLowerCase()).toMatch(/fyi|for your information|informational/);
  });

  it("get_inbox_summary classifies emails awaiting response as 'waiting on'", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          subject: "Re: Project proposal — waiting for your feedback",
          snippet: "Still waiting on your thoughts about the proposal sent last week.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result.toLowerCase()).toMatch(/waiting.?on|awaiting/);
  });

  it("get_inbox_summary assigns exactly one classification per email", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          id: "m-class-1",
          subject: "Please approve the budget",
          snippet: "Please approve the Q2 budget by Friday.",
        }),
        makeEmail({
          id: "m-class-2",
          subject: "FYI: new HR policy",
          snippet: "The new HR policy document is now live.",
        }),
        makeEmail({
          id: "m-class-3",
          subject: "Re: design review — still waiting",
          snippet: "Waiting on your reply from last Thursday.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    // All three categories should appear in the output for the three emails
    expect(result.toLowerCase()).toMatch(/action.?required|action.?needed/);
    expect(result.toLowerCase()).toMatch(/fyi|informational/);
    expect(result.toLowerCase()).toMatch(/waiting.?on|awaiting/);
  });

  it("classification is present for all emails in the inbox summary", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          id: "e1",
          subject: "Please respond ASAP",
          snippet: "Urgent: need your reply.",
        }),
        makeEmail({
          id: "e2",
          subject: "Newsletter digest",
          snippet: "Here's your weekly digest.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    // At least one classification label must be present for each email presented
    const classificationPattern =
      /action.?required|action.?needed|fyi|informational|waiting.?on|awaiting/gi;
    const matches = result.match(classificationPattern) ?? [];
    // With 2 emails we expect at least 2 classification labels
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// AC5 — Integration uses Gmail MCP server at gmail.mcp.claude.com
// ---------------------------------------------------------------------------

describe("AC5 — Integration targets Gmail MCP server at gmail.mcp.claude.com", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_inbox_summary makes a fetch call to gmail.mcp.claude.com", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ emails: [] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
    const url = typeof callArgs[0] === "string" ? callArgs[0] : String(callArgs[0]);
    expect(url).toMatch(/gmail\.mcp\.claude\.com/);
  });

  it("get_thread makes a fetch call to gmail.mcp.claude.com", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ thread: makeThread() });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_thread", { thread_id: "thread-mcp-check" });

    expect(fetchMock).toHaveBeenCalled();
    const callStr = JSON.stringify(fetchMock.mock.calls);
    expect(callStr).toMatch(/gmail\.mcp\.claude\.com/);
  });

  it("MCP requests use HTTPS (not plain HTTP)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ emails: [] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit?];
    const url = typeof callArgs[0] === "string" ? callArgs[0] : String(callArgs[0]);
    expect(url).toMatch(/^https:\/\//);
  });

  it("MCP requests use JSON-RPC 2.0 protocol format", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ emails: [] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = callArgs[1]?.body;
    if (body) {
      const parsed = JSON.parse(body as string) as Record<string, unknown>;
      expect(parsed["jsonrpc"]).toBe("2.0");
      expect(parsed["method"]).toBeDefined();
    }
  });

  it("MCP requests send Content-Type: application/json header", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ emails: [] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string> | undefined;
    if (headers) {
      const contentType = headers["Content-Type"] ?? headers["content-type"] ?? "";
      expect(contentType).toMatch(/application\/json/);
    }
  });

  it("MCP requests use HTTP POST method", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const fetchMock = buildMcpSuccessFetch({ emails: [] });
    global.fetch = fetchMock;
    const { executeGmailTool } = await import("../tools/gmail.js");

    await executeGmailTool("get_inbox_summary", {});

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1]?.method?.toUpperCase()).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// AC6 — Proper error handling for MCP connection and API failures
// ---------------------------------------------------------------------------

describe("AC6 — Proper error handling for MCP connection and API failures", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    savedFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it("get_inbox_summary handles network error gracefully (returns error JSON, no throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetch();
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_thread handles network error gracefully (returns error JSON, no throw)", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetch();
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-err" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_inbox_summary handles HTTP 401 Unauthorized from MCP server gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetch(401, "Unauthorized");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_inbox_summary handles HTTP 503 Service Unavailable from MCP server gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetch(503, "Service Unavailable");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_thread handles HTTP 500 Internal Server Error from MCP server gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildHttpErrorFetch(500, "Internal Server Error");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-500" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_inbox_summary handles MCP JSON-RPC error response gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpErrorFetch(-32000, "Gmail API quota exceeded");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("get_thread handles MCP JSON-RPC error response gracefully", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpErrorFetch(-32001, "Thread not found");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-missing" });
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });

  it("executeGmailTool never throws — all errors are returned as strings", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetch("catastrophic failure");
    const { executeGmailTool } = await import("../tools/gmail.js");

    // Both operations must not throw even on catastrophic failure
    await expect(executeGmailTool("get_inbox_summary", {})).resolves.not.toThrow();
    await expect(executeGmailTool("get_thread", { thread_id: "t" })).resolves.not.toThrow();
  });

  it("error response contains a meaningful message describing the failure", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetch("ECONNREFUSED: gmail.mcp.claude.com unreachable");
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeTruthy();
    expect(parsed.error.length).toBeGreaterThan(10);
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

  it("executeGmailTool always returns a string — never undefined or null", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const { executeGmailTool } = await import("../tools/gmail.js");

    const ops: Array<[string, Record<string, unknown>]> = [
      ["get_inbox_summary", {}],
      ["get_thread", { thread_id: "t1" }],
    ];

    for (const [op, input] of ops) {
      global.fetch = buildMcpSuccessFetch(
        op === "get_inbox_summary" ? { emails: [makeEmail()] } : { thread: makeThread() },
      );
      const result = await executeGmailTool(op, input);
      expect(typeof result).toBe("string");
      expect(result).not.toBeUndefined();
      expect(result).not.toBe("null");
    }
  });

  it("error responses are valid JSON with an 'error' key", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildNetworkErrorFetch();
    const { executeGmailTool } = await import("../tools/gmail.js");

    const failOps: Array<[string, Record<string, unknown>]> = [
      ["get_inbox_summary", {}],
      ["get_thread", { thread_id: "t1" }],
    ];

    for (const [op, input] of failOps) {
      global.fetch = buildNetworkErrorFetch();
      const result = await executeGmailTool(op, input);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result);
      }).not.toThrow();

      expect((parsed as Record<string, unknown>)["error"]).toBeDefined();
    }
  });

  it("get_inbox_summary success response is human-readable text, not a raw JSON array", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({ from: "frank@example.com", subject: "Follow up on proposal" }),
        makeEmail({ from: "grace@example.com", subject: "Weekly standup notes" }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result).toContain("frank@example.com");
    expect(result).toContain("grace@example.com");
    // Should not be a raw JSON array starting with '['
    expect(result.trimStart()).not.toMatch(/^\[/);
  });

  it("get_thread success response is human-readable text containing message bodies", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      thread: makeThread({
        messages: [
          {
            id: "msg-readable",
            from: "hank@example.com",
            subject: "Design feedback",
            date: "2026-04-21T12:00:00Z",
            body: "Love the new design direction. Please proceed.",
          },
        ],
      }),
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_thread", { thread_id: "thread-readable" });
    expect(result).toContain("hank@example.com");
    expect(result).toContain("Love the new design direction");
  });

  it("unknown operation error response is valid JSON with 'error' key", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("not_a_real_gmail_op", {});
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(result);
    }).not.toThrow();
    expect((parsed as Record<string, unknown>)["error"]).toBeDefined();
  });

  it("get_inbox_summary response is parseable by agent for downstream processing", async () => {
    vi.doMock("@lifeos/shared", () => ({
      env: buildEnvMock(),
      logger: buildLoggerMock(),
    }));
    global.fetch = buildMcpSuccessFetch({
      emails: [
        makeEmail({
          id: "msg-agent-1",
          threadId: "thread-agent-1",
          from: "ivan@example.com",
          subject: "Quarterly targets",
          snippet: "Please confirm the Q3 targets by Thursday.",
        }),
      ],
    });
    const { executeGmailTool } = await import("../tools/gmail.js");

    const result = await executeGmailTool("get_inbox_summary", {});
    expect(result.trim().length).toBeGreaterThan(0);
    // Must not return "undefined" or "null" strings
    expect(result).not.toBe("undefined");
    expect(result).not.toBe("null");
    // Should be parseable context for the agent
    expect(result).toContain("ivan@example.com");
  });
});
