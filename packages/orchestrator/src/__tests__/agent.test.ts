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
