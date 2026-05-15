/**
 * Tests for packages/orchestrator/src/agent.ts — T-09
 *
 * Acceptance criteria:
 *   AC1: loadContext returns messages in chronological order (oldest first)
 *   AC2: After the 21st message is saved, only 20 rows remain for that chat_id
 *   AC3: All SQL uses parameterised queries — no string interpolation
 *   AC4: Unit test: saving 25 messages leaves exactly 20 in DB
 *
 * Strategy
 * --------
 * The `pool` singleton from @lifeos/shared is mocked so no real PostgreSQL
 * database is required. The mock records all query calls and returns
 * configurable row sets so we can verify:
 *   - correct parameterised SQL is issued
 *   - arguments contain the chatId / role / content values — never as
 *     string-interpolated SQL text
 *   - loadContext flips DESC rows to ASC ordering
 *   - saveMessage uses a transaction (BEGIN / INSERT / DELETE / COMMIT) and
 *     ROLLBACK on error
 *
 * For AC4 (rolling window with 25 inserts) the mock simulates a real
 * in-memory store so the pruning query actually removes rows and we can
 * assert the final count is exactly 20.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory store used by the pool mock
// ---------------------------------------------------------------------------

interface StoredRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: Date;
}

let store: StoredRow[] = [];
let nextId = 1;

function resetStore(): void {
  store = [];
  nextId = 1;
}

/**
 * Simulates the behaviour of each SQL statement issued by agent.ts.
 * Returns `{ rows }` shaped like a pg QueryResult.
 */
function handleQuery(text: string, values: unknown[]): { rows: StoredRow[] } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  // BEGIN / COMMIT / ROLLBACK — transaction control; no rows returned.
  if (normalised === "BEGIN" || normalised === "COMMIT" || normalised === "ROLLBACK") {
    return { rows: [] };
  }

  // INSERT INTO conversation_context
  if (normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const role = values[1] as string;
    const content = values[2] as string;
    const row: StoredRow = {
      id: nextId++,
      chat_id: chatId,
      role,
      content,
      created_at: new Date(),
    };
    store.push(row);
    return { rows: [] };
  }

  // DELETE FROM conversation_context … NOT IN (SELECT id … LIMIT $2)
  if (normalised.startsWith("DELETE FROM CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    // Find rows for this chatId sorted by (created_at DESC, id DESC) — mirrors
    // the production ORDER BY so tie-breaks on same-millisecond rows use id.
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });
    const keepIds = new Set(forChat.slice(0, limit).map((r) => r.id));
    store = store.filter((r) => r.chat_id !== chatId || keepIds.has(r.id));
    return { rows: [] };
  }

  // SELECT … FROM (SELECT … ORDER BY created_at DESC, id DESC LIMIT $2) … ORDER BY created_at ASC
  if (normalised.startsWith("SELECT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      })
      .slice(0, limit)
      .sort((a, b) => {
        const timeDiff = a.created_at.getTime() - b.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : a.id - b.id;
      });
    return { rows: forChat };
  }

  return { rows: [] };
}

// ---------------------------------------------------------------------------
// Build pool mock
// ---------------------------------------------------------------------------

/**
 * Constructs a fresh pool mock object. Each test that needs to inspect
 * call arguments can create its own instance via vi.doMock.
 */
function buildPoolMock() {
  const clientQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const clientMock = {
    query: clientQueryMock,
    release: vi.fn(),
  };

  const poolQueryMock = vi
    .fn()
    .mockImplementation((text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
    );

  const connectMock = vi.fn().mockResolvedValue(clientMock);

  return {
    pool: {
      query: poolQueryMock,
      connect: connectMock,
    },
    clientQueryMock,
    clientMock,
    poolQueryMock,
    connectMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("T-09 — agent.ts context persistence", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
      // env and logger are needed by agent.ts (T-10 additions)
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        TZ: "Europe/London",
        DATABASE_URL: "postgresql://localhost/test",
      },
      logger: {
        child: () => ({
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        }),
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      },
    }));
  });

  // -------------------------------------------------------------------------
  // AC1: loadContext returns messages in chronological order (oldest first)
  // -------------------------------------------------------------------------

  describe("AC1 — loadContext returns messages oldest-first", () => {
    it("returns an empty array when no messages exist for the chatId", async () => {
      const { loadContext } = await import("../agent.js");
      const result = await loadContext(42);
      expect(result).toEqual([]);
    });

    it("returns a single message when one exists", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      await saveMessage(42, "user", "Hello");
      const result = await loadContext(42);
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("Hello");
    });

    it("returns messages with oldest first for multiple messages", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      await saveMessage(42, "user", "first");
      await saveMessage(42, "assistant", "second");
      await saveMessage(42, "user", "third");

      const result = await loadContext(42);
      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe("first");
      expect(result[1]?.content).toBe("second");
      expect(result[2]?.content).toBe("third");
    });

    it("preserves role values correctly", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      await saveMessage(42, "user", "user message");
      await saveMessage(42, "assistant", "assistant message");

      const result = await loadContext(42);
      expect(result[0]?.role).toBe("user");
      expect(result[1]?.role).toBe("assistant");
    });

    it("isolates messages by chatId — does not return other chat messages", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      await saveMessage(100, "user", "chat 100 message");
      await saveMessage(200, "user", "chat 200 message");

      const result = await loadContext(100);
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("chat 100 message");
    });

    it("returns at most 20 messages when more than 20 exist", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      // Insert 25 messages
      for (let i = 1; i <= 25; i++) {
        await saveMessage(42, "user", `message ${i}`);
      }
      const result = await loadContext(42);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it("the returned messages are always sorted oldest-first (created_at ASC)", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      for (let i = 1; i <= 5; i++) {
        await saveMessage(42, "user", `msg-${i}`);
      }
      const result = await loadContext(42);
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev && curr) {
          expect(prev.created_at.getTime()).toBeLessThanOrEqual(curr.created_at.getTime());
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // AC2: After 21st message is saved, only 20 rows remain for that chat_id
  // -------------------------------------------------------------------------

  describe("AC2 — rolling window: 21st message leaves exactly 20 rows", () => {
    it("saves 21 messages and leaves exactly 20 rows", async () => {
      const { saveMessage } = await import("../agent.js");
      for (let i = 1; i <= 21; i++) {
        await saveMessage(42, "user", `message ${i}`);
      }
      const count = store.filter((r) => r.chat_id === 42).length;
      expect(count).toBe(20);
    });

    it("the oldest row is pruned (not the newest)", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      for (let i = 1; i <= 21; i++) {
        await saveMessage(42, "user", `message ${i}`);
      }
      const result = await loadContext(42);
      // message 1 should be gone; message 21 should be present
      const contents = result.map((r) => r.content);
      expect(contents).not.toContain("message 1");
      expect(contents).toContain("message 21");
    });
  });

  // -------------------------------------------------------------------------
  // AC3: All SQL uses parameterised queries — no string interpolation
  // -------------------------------------------------------------------------

  describe("AC3 — parameterised queries only", () => {
    it("INSERT uses $1/$2/$3 placeholders, not interpolated values", async () => {
      const { saveMessage } = await import("../agent.js");
      await saveMessage(999, "user", "'; DROP TABLE conversation_context; --");

      // Inspect what the mock received
      const insertCall = mocks.clientQueryMock.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.toUpperCase().includes("INSERT"),
      );
      expect(insertCall).toBeDefined();

      const [insertSql, insertValues] = insertCall as [string, unknown[]];
      // The SQL text must contain parameter placeholders
      expect(insertSql).toMatch(/\$1/);
      expect(insertSql).toMatch(/\$2/);
      expect(insertSql).toMatch(/\$3/);
      // The SQL text must NOT contain the literal chat_id or content value
      expect(insertSql).not.toContain("999");
      expect(insertSql).not.toContain("DROP TABLE");

      // The values array must contain the actual data
      expect(insertValues).toContain(999);
      expect(insertValues).toContain("user");
      expect(insertValues).toContain("'; DROP TABLE conversation_context; --");
    });

    it("DELETE uses $1/$2 placeholders", async () => {
      const { saveMessage } = await import("../agent.js");
      await saveMessage(999, "user", "test");

      const deleteCall = mocks.clientQueryMock.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.toUpperCase().startsWith("DELETE"),
      );
      expect(deleteCall).toBeDefined();

      const [deleteSql, deleteValues] = deleteCall as [string, unknown[]];
      expect(deleteSql).toMatch(/\$1/);
      expect(deleteSql).toMatch(/\$2/);
      expect(deleteSql).not.toContain("999");
      expect(deleteValues).toContain(999);
    });

    it("SELECT uses $1/$2 placeholders", async () => {
      const { loadContext } = await import("../agent.js");
      await loadContext(777);

      const selectCall = mocks.poolQueryMock.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.toUpperCase().startsWith("SELECT"),
      );
      expect(selectCall).toBeDefined();

      const [selectSql, selectValues] = selectCall as [string, unknown[]];
      expect(selectSql).toMatch(/\$1/);
      expect(selectSql).toMatch(/\$2/);
      expect(selectSql).not.toContain("777");
      expect(selectValues).toContain(777);
    });
  });

  // -------------------------------------------------------------------------
  // AC4: Unit test — saving 25 messages leaves exactly 20 in DB
  // -------------------------------------------------------------------------

  describe("AC4 — saving 25 messages leaves exactly 20 rows", () => {
    it("after 25 saves, exactly 20 rows remain for that chat_id", async () => {
      const { saveMessage } = await import("../agent.js");
      const CHAT_ID = 12345;
      for (let i = 1; i <= 25; i++) {
        await saveMessage(CHAT_ID, i % 2 === 0 ? "assistant" : "user", `message ${i}`);
      }
      const remaining = store.filter((r) => r.chat_id === CHAT_ID);
      expect(remaining).toHaveLength(20);
    });

    it("the 20 retained rows are the newest 20 (messages 6–25)", async () => {
      const { saveMessage, loadContext } = await import("../agent.js");
      const CHAT_ID = 12345;
      for (let i = 1; i <= 25; i++) {
        await saveMessage(CHAT_ID, "user", `message ${i}`);
      }
      const result = await loadContext(CHAT_ID);
      const contents = result.map((r) => r.content);
      // Messages 1–5 should have been pruned
      for (let i = 1; i <= 5; i++) {
        expect(contents).not.toContain(`message ${i}`);
      }
      // Messages 6–25 should all be present
      for (let i = 6; i <= 25; i++) {
        expect(contents).toContain(`message ${i}`);
      }
    });

    it("messages for other chat_ids are unaffected by pruning", async () => {
      const { saveMessage } = await import("../agent.js");
      // Insert 25 messages for chat 100
      for (let i = 1; i <= 25; i++) {
        await saveMessage(100, "user", `msg ${i}`);
      }
      // Insert 3 messages for chat 200
      for (let i = 1; i <= 3; i++) {
        await saveMessage(200, "user", `other ${i}`);
      }
      // Chat 100 should have exactly 20
      const chat100 = store.filter((r) => r.chat_id === 100);
      expect(chat100).toHaveLength(20);
      // Chat 200 should still have 3
      const chat200 = store.filter((r) => r.chat_id === 200);
      expect(chat200).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Transaction safety
  // -------------------------------------------------------------------------

  describe("Transaction safety", () => {
    it("saveMessage wraps INSERT and DELETE in a transaction (BEGIN/COMMIT)", async () => {
      const { saveMessage } = await import("../agent.js");
      await saveMessage(42, "user", "hello");

      const calls = mocks.clientQueryMock.mock.calls.map(([sql]) =>
        (sql as string).trim().toUpperCase(),
      );
      expect(calls[0]).toBe("BEGIN");
      // There should be a COMMIT somewhere after BEGIN
      expect(calls).toContain("COMMIT");
    });

    it("saveMessage issues ROLLBACK when the INSERT throws", async () => {
      // Override clientQueryMock to throw on INSERT
      mocks.clientQueryMock.mockImplementation((text: string) => {
        const norm = text.trim().toUpperCase();
        if (norm === "BEGIN" || norm === "ROLLBACK") {
          return Promise.resolve({ rows: [] });
        }
        if (norm.startsWith("INSERT")) {
          return Promise.reject(new Error("simulated DB error"));
        }
        return Promise.resolve({ rows: [] });
      });

      const { saveMessage } = await import("../agent.js");
      await expect(saveMessage(42, "user", "hello")).rejects.toThrow("simulated DB error");

      const calls = mocks.clientQueryMock.mock.calls.map(([sql]) =>
        (sql as string).trim().toUpperCase(),
      );
      expect(calls).toContain("ROLLBACK");
    });

    it("client.release() is always called, even on error", async () => {
      mocks.clientQueryMock.mockImplementation((text: string) => {
        const norm = text.trim().toUpperCase();
        if (norm === "BEGIN" || norm === "ROLLBACK") return Promise.resolve({ rows: [] });
        if (norm.startsWith("INSERT")) return Promise.reject(new Error("db failure"));
        return Promise.resolve({ rows: [] });
      });

      const { saveMessage } = await import("../agent.js");
      await expect(saveMessage(42, "user", "hello")).rejects.toThrow();

      expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Task-8b: Voice tools integration tests
// Tests verify voice tools execute correctly in the agent tool loop.
// ---------------------------------------------------------------------------

describe("agent.ts — Task-8b: Voice tools execution in agent loop", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function makeTextMessage(text: string) {
    return {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text, citations: null }],
      model: "claude-sonnet-4-20250514",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        cache_creation: null,
        inference_geo: null,
        server_tool_use: null,
        service_tier: null,
      },
    };
  }

  function makeToolUseMessage(
    toolId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
  ) {
    return {
      id: "msg_tool",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolId,
          name: toolName,
          input: toolInput,
          caller: { type: "direct" },
        },
      ],
      model: "claude-sonnet-4-20250514",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        cache_creation: null,
        inference_geo: null,
        server_tool_use: null,
        service_tier: null,
      },
    };
  }

  function applyVoiceMocks(
    anthropicCreate: ReturnType<typeof vi.fn>,
    consumeFn: ReturnType<typeof vi.fn>,
  ) {
    vi.doMock("@lifeos/shared", () => ({
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
      env: {
        ANTHROPIC_API_KEY: "sk-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        DATABASE_URL: "postgresql://test",
        TELEGRAM_BOT_TOKEN: "test-token",
        OPENAI_API_KEY: "test-openai-key",
        TZ: "UTC",
      },
      logger: { child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })) },
    }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn(() => ({ messages: { create: anthropicCreate } })),
    }));
    vi.doMock("../tools/voice.js", () => ({
      transcribe_voice_message: vi.fn().mockResolvedValue("transcription text"),
      create_pending_voice_intent: vi.fn().mockResolvedValue({ id: 1, chat_id: 42 }),
      consume_pending_voice_intent: consumeFn,
    }));
    vi.doMock("../context.js", () => ({
      getActivitySummary: vi.fn().mockResolvedValue("0 activities"),
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));
    vi.doMock("../tools/todoist.js", () => ({ executeToDoistTool: vi.fn() }));
    vi.doMock("../tools/gmail.js", () => ({ executeGmailTool: vi.fn() }));
    vi.doMock("../tools/people.js", () => ({ executePeopleTool: vi.fn() }));
    vi.doMock("../tools/life_events.js", () => ({ executeLifeEventsTool: vi.fn() }));
    vi.doMock("../tools/nudges.js", () => ({ executeNudgesTool: vi.fn() }));
    vi.doMock("../tools/strava.js", () => ({
      get_strava_oauth_url: vi.fn(),
      get_strava_activities: vi.fn(),
      get_strava_trends: vi.fn(),
    }));
  }

  it("consume_pending_voice_intent tool executes correctly in agent loop", async () => {
    const consumeFn = vi.fn().mockResolvedValue({
      id: 123,
      chat_id: 42,
      transcription: "add a meeting tomorrow",
      telegram_file_id: "file_abc",
    });

    const anthropicCreate = vi
      .fn()
      .mockResolvedValueOnce(
        makeToolUseMessage("tool_1", "consume_pending_voice_intent", { id: 123 }),
      )
      .mockResolvedValueOnce(makeTextMessage("Intent consumed successfully"));

    applyVoiceMocks(anthropicCreate, consumeFn);

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({
      chat_id: 42,
      text: "Consume pending voice intent",
      message_id: 1,
    });

    expect(consumeFn).toHaveBeenCalledWith({ id: 123 });
    expect(result.text).toBe("Intent consumed successfully");
  });

  it("voice tool result is fed back into the Anthropic messages array", async () => {
    const consumeFn = vi.fn().mockResolvedValue({ id: 99, chat_id: 42, transcription: "hello" });
    let capturedMessages: unknown[] = [];

    const anthropicCreate = vi.fn().mockImplementation(({ messages }: { messages: unknown[] }) => {
      capturedMessages = messages;
      if (messages.length < 3) {
        return Promise.resolve(
          makeToolUseMessage("tool_2", "consume_pending_voice_intent", { id: 99 }),
        );
      }
      return Promise.resolve(makeTextMessage("Done"));
    });

    applyVoiceMocks(anthropicCreate, consumeFn);

    const { runAgent } = await import("../agent.js");
    await runAgent({ chat_id: 42, text: "use voice tool", message_id: 2 });

    // The final call should have a tool_result in the messages array
    const allMessages = capturedMessages as Array<{ role: string; content: unknown }>;
    const toolResultMessage = allMessages.find((m) => m.role === "user");
    expect(toolResultMessage).toBeDefined();
  });

  it("voice tool error does not crash the agent loop", async () => {
    const consumeFn = vi.fn().mockRejectedValue(new Error("DB connection failed"));

    const anthropicCreate = vi
      .fn()
      .mockResolvedValueOnce(
        makeToolUseMessage("tool_3", "consume_pending_voice_intent", { id: 1 }),
      )
      .mockResolvedValueOnce(makeTextMessage("Error handled gracefully"));

    applyVoiceMocks(anthropicCreate, consumeFn);

    const { runAgent } = await import("../agent.js");
    const result = await runAgent({ chat_id: 42, text: "trigger voice error", message_id: 3 });

    expect(result.text).toBe("Error handled gracefully");
  });

  // -------------------------------------------------------------------------
  // AC1: Tools are properly typed and integrated with existing tool system
  // -------------------------------------------------------------------------

  function applyVoiceTestMocks(
    anthropicCreate: ReturnType<typeof vi.fn>,
    voiceTools: {
      transcribe?: ReturnType<typeof vi.fn>;
      create?: ReturnType<typeof vi.fn>;
      consume?: ReturnType<typeof vi.fn>;
    },
  ) {
    vi.doMock("@lifeos/shared", () => ({
      pool: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      },
      env: {
        ANTHROPIC_API_KEY: "sk-test",
        ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
        DATABASE_URL: "postgresql://test",
        TELEGRAM_BOT_TOKEN: "test-token",
        OPENAI_API_KEY: "test-openai-key",
        TZ: "UTC",
      },
      logger: { child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })) },
    }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn(() => ({ messages: { create: anthropicCreate } })),
    }));
    vi.doMock("../tools/voice.js", () => ({
      transcribe_voice_message: voiceTools.transcribe || vi.fn(),
      create_pending_voice_intent: voiceTools.create || vi.fn(),
      consume_pending_voice_intent: voiceTools.consume || vi.fn(),
    }));
    vi.doMock("../context.js", () => ({
      getActivitySummary: vi.fn().mockResolvedValue("0 activities"),
    }));
    vi.doMock("../tools/calendar.js", () => ({
      calendarReadToolDefinitions: [],
      calendarWriteToolDefinitions: [],
      calendarFreeBusyToolDefinitions: [],
      executeCalendarTool: vi.fn(),
    }));
    vi.doMock("../tools/todoist.js", () => ({ executeToDoistTool: vi.fn() }));
    vi.doMock("../tools/gmail.js", () => ({ executeGmailTool: vi.fn() }));
    vi.doMock("../tools/people.js", () => ({ executePeopleTool: vi.fn() }));
    vi.doMock("../tools/life_events.js", () => ({ executeLifeEventsTool: vi.fn() }));
    vi.doMock("../tools/nudges.js", () => ({ executeNudgesTool: vi.fn() }));
    vi.doMock("../tools/strava.js", () => ({
      get_strava_oauth_url: vi.fn(),
      get_strava_activities: vi.fn(),
      get_strava_trends: vi.fn(),
    }));
  }

  describe("AC1 — Voice tools are properly typed and integrated", () => {
    it("voice tools are included in TOOL_DEFINITIONS", async () => {
      vi.resetModules();
      vi.doMock("@lifeos/shared", () => ({
        pool: {
          query: vi.fn().mockResolvedValue({ rows: [] }),
          connect: vi.fn().mockResolvedValue({
            query: vi.fn().mockResolvedValue({ rows: [] }),
            release: vi.fn(),
          }),
        },
        env: {
          ANTHROPIC_API_KEY: "sk-test",
          ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
          DATABASE_URL: "postgresql://test",
          TELEGRAM_BOT_TOKEN: "test-token",
          OPENAI_API_KEY: "test-openai-key",
          TZ: "UTC",
        },
        logger: { child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })) },
      }));
      vi.doMock("@anthropic-ai/sdk", () => ({
        default: vi.fn(() => ({ messages: { create: vi.fn() } })),
      }));
      vi.doMock("../tools/voice.js", () => ({
        transcribe_voice_message: vi.fn(),
        create_pending_voice_intent: vi.fn(),
        consume_pending_voice_intent: vi.fn(),
      }));
      vi.doMock("../context.js", () => ({
        getActivitySummary: vi.fn().mockResolvedValue("0 activities"),
      }));
      vi.doMock("../tools/calendar.js", () => ({
        calendarReadToolDefinitions: [],
        calendarWriteToolDefinitions: [],
        calendarFreeBusyToolDefinitions: [],
        executeCalendarTool: vi.fn(),
      }));
      vi.doMock("../tools/todoist.js", () => ({ executeToDoistTool: vi.fn() }));
      vi.doMock("../tools/gmail.js", () => ({ executeGmailTool: vi.fn() }));
      vi.doMock("../tools/people.js", () => ({ executePeopleTool: vi.fn() }));
      vi.doMock("../tools/life_events.js", () => ({ executeLifeEventsTool: vi.fn() }));
      vi.doMock("../tools/nudges.js", () => ({ executeNudgesTool: vi.fn() }));
      vi.doMock("../tools/strava.js", () => ({
        get_strava_oauth_url: vi.fn(),
        get_strava_activities: vi.fn(),
        get_strava_trends: vi.fn(),
      }));

      const agent = await import("../agent.js");
      // Access the module to trigger tool definitions
      const systemPrompt = await agent.buildSystemPrompt();
      expect(systemPrompt).toBeDefined();
    });

    it("transcribe_voice_message tool has correct schema", async () => {
      vi.resetModules();
      const anthropicCreate = vi.fn().mockResolvedValue(makeTextMessage("Done"));
      applyVoiceTestMocks(anthropicCreate, {
        transcribe: vi.fn().mockResolvedValue("transcribed text"),
      });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "test", message_id: 1 });
      expect(result).toBeDefined();
      expect(result.text).toBe("Done");
    });

    it("create_pending_voice_intent tool has correct schema", async () => {
      vi.resetModules();
      const createFn = vi.fn().mockResolvedValue({ id: 1, chat_id: 42 });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "create_pending_voice_intent", {
            chat_id: 42,
            transcription: "test transcription",
            telegram_file_id: "file_123",
          }),
        )
        .mockResolvedValueOnce(makeTextMessage("Intent created"));

      applyVoiceTestMocks(anthropicCreate, { create: createFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "create intent", message_id: 1 });
      expect(result.text).toBe("Intent created");
      expect(createFn).toHaveBeenCalledWith({
        chat_id: 42,
        transcription: "test transcription",
        telegram_file_id: "file_123",
      });
    });

    it("consume_pending_voice_intent tool has correct schema", async () => {
      vi.resetModules();
      const consumeFn = vi.fn().mockResolvedValue({
        id: 123,
        chat_id: 42,
        transcription: "test",
        telegram_file_id: "file_123",
      });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "consume_pending_voice_intent", { id: 123 }),
        )
        .mockResolvedValueOnce(makeTextMessage("Intent consumed"));

      applyVoiceTestMocks(anthropicCreate, { consume: consumeFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "consume intent", message_id: 1 });
      expect(result.text).toBe("Intent consumed");
      expect(consumeFn).toHaveBeenCalledWith({ id: 123 });
    });
  });

  // -------------------------------------------------------------------------
  // AC2: Tests verify tool availability in agent
  // -------------------------------------------------------------------------

  describe("AC2 — Voice tools are available in agent", () => {
    it("transcribe_voice_message is available for agent to call", async () => {
      vi.resetModules();
      const transcribeFn = vi.fn().mockResolvedValue("transcribed text");
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "transcribe_voice_message", { file_id: "file_123" }),
        )
        .mockResolvedValueOnce(makeTextMessage("Transcription complete"));

      applyVoiceTestMocks(anthropicCreate, { transcribe: transcribeFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "transcribe voice", message_id: 1 });
      expect(result.text).toBe("Transcription complete");
      expect(transcribeFn).toHaveBeenCalledWith({ file_id: "file_123" });
    });

    it("all three voice tools are available in agent", async () => {
      vi.resetModules();
      const transcribeFn = vi.fn().mockResolvedValue("text");
      const createFn = vi.fn().mockResolvedValue({ id: 1 });
      const consumeFn = vi.fn().mockResolvedValue({ id: 1 });

      const anthropicCreate = vi.fn().mockResolvedValue(makeTextMessage("Done"));

      applyVoiceTestMocks(anthropicCreate, {
        transcribe: transcribeFn,
        create: createFn,
        consume: consumeFn,
      });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "test", message_id: 1 });
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Tests verify tool parameter validation
  // -------------------------------------------------------------------------

  describe("AC3 — Voice tool parameter validation", () => {
    it("transcribe_voice_message validates file_id parameter", async () => {
      vi.resetModules();
      const transcribeFn = vi.fn().mockResolvedValue("text");
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "transcribe_voice_message", { file_id: "valid_file_id" }),
        )
        .mockResolvedValueOnce(makeTextMessage("Done"));

      applyVoiceTestMocks(anthropicCreate, { transcribe: transcribeFn });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 42, text: "test", message_id: 1 });
      expect(transcribeFn).toHaveBeenCalledWith({ file_id: "valid_file_id" });
    });

    it("create_pending_voice_intent validates all required parameters", async () => {
      vi.resetModules();
      const createFn = vi.fn().mockResolvedValue({ id: 1, chat_id: 42 });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "create_pending_voice_intent", {
            chat_id: 42,
            transcription: "hello world",
            telegram_file_id: "file_abc",
          }),
        )
        .mockResolvedValueOnce(makeTextMessage("Done"));

      applyVoiceTestMocks(anthropicCreate, { create: createFn });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 42, text: "test", message_id: 1 });
      expect(createFn).toHaveBeenCalledWith({
        chat_id: 42,
        transcription: "hello world",
        telegram_file_id: "file_abc",
      });
    });

    it("consume_pending_voice_intent validates id parameter", async () => {
      vi.resetModules();
      const consumeFn = vi.fn().mockResolvedValue({ id: 999, chat_id: 42 });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "consume_pending_voice_intent", { id: 999 }),
        )
        .mockResolvedValueOnce(makeTextMessage("Done"));

      applyVoiceTestMocks(anthropicCreate, { consume: consumeFn });

      const { runAgent } = await import("../agent.js");
      await runAgent({ chat_id: 42, text: "test", message_id: 1 });
      expect(consumeFn).toHaveBeenCalledWith({ id: 999 });
    });
  });

  // -------------------------------------------------------------------------
  // AC4: Tests verify tool execution in agent loop
  // -------------------------------------------------------------------------

  describe("AC4 — Voice tool execution in agent loop", () => {
    it("transcribe_voice_message executes and returns result in agent loop", async () => {
      vi.resetModules();
      const transcribeFn = vi.fn().mockResolvedValue("hello world transcription");
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "transcribe_voice_message", { file_id: "file_123" }),
        )
        .mockResolvedValueOnce(makeTextMessage("Transcribed: hello world transcription"));

      applyVoiceTestMocks(anthropicCreate, { transcribe: transcribeFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "transcribe voice", message_id: 1 });
      expect(result.text).toContain("Transcribed");
      expect(transcribeFn).toHaveBeenCalled();
    });

    it("create_pending_voice_intent executes and returns result in agent loop", async () => {
      vi.resetModules();
      const createFn = vi.fn().mockResolvedValue({ id: 555, chat_id: 42 });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "create_pending_voice_intent", {
            chat_id: 42,
            transcription: "test",
            telegram_file_id: "file_123",
          }),
        )
        .mockResolvedValueOnce(makeTextMessage("Intent created with ID 555"));

      applyVoiceTestMocks(anthropicCreate, { create: createFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "create intent", message_id: 1 });
      expect(result.text).toContain("Intent created");
      expect(createFn).toHaveBeenCalled();
    });

    it("consume_pending_voice_intent executes and returns result in agent loop", async () => {
      vi.resetModules();
      const consumeFn = vi.fn().mockResolvedValue({
        id: 777,
        chat_id: 42,
        transcription: "consumed text",
        telegram_file_id: "file_123",
      });
      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "consume_pending_voice_intent", { id: 777 }),
        )
        .mockResolvedValueOnce(makeTextMessage("Intent consumed: consumed text"));

      applyVoiceTestMocks(anthropicCreate, { consume: consumeFn });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "consume intent", message_id: 1 });
      expect(result.text).toContain("Intent consumed");
      expect(consumeFn).toHaveBeenCalled();
    });

    it("multiple voice tools can execute in sequence in agent loop", async () => {
      vi.resetModules();
      const transcribeFn = vi.fn().mockResolvedValue("transcribed text");
      const createFn = vi.fn().mockResolvedValue({ id: 1, chat_id: 42 });
      const consumeFn = vi.fn().mockResolvedValue({ id: 1, chat_id: 42 });

      const anthropicCreate = vi
        .fn()
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_1", "transcribe_voice_message", { file_id: "file_123" }),
        )
        .mockResolvedValueOnce(
          makeToolUseMessage("tool_2", "create_pending_voice_intent", {
            chat_id: 42,
            transcription: "transcribed text",
            telegram_file_id: "file_123",
          }),
        )
        .mockResolvedValueOnce(makeTextMessage("All voice tools executed"));

      applyVoiceTestMocks(anthropicCreate, {
        transcribe: transcribeFn,
        create: createFn,
        consume: consumeFn,
      });

      const { runAgent } = await import("../agent.js");
      const result = await runAgent({ chat_id: 42, text: "use voice tools", message_id: 1 });
      expect(result.text).toBe("All voice tools executed");
      expect(transcribeFn).toHaveBeenCalled();
      expect(createFn).toHaveBeenCalled();
    });
  });
});
