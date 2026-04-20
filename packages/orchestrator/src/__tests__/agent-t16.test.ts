/**
 * Tests for packages/orchestrator/src/agent.ts — T-16
 *
 * Acceptance criteria:
 *   AC1: saveConfirmation upserts payload for chat_id
 *   AC2: loadConfirmation returns null if no pending confirmation
 *   AC3: loadConfirmation returns null if confirmation is older than 10 minutes
 *   AC4: clearConfirmation sets column to null
 *   AC5: Only one active confirmation per chat_id — new proposal overwrites old
 *
 * Strategy
 * --------
 * The `pool` singleton from @lifeos/shared is mocked so no real PostgreSQL
 * database is required. The in-memory store simulates the behaviour of the
 * active_confirmation JSONB column on conversation_context rows, matching the
 * UPDATE / INSERT / SELECT SQL issued by agent.ts.
 *
 * The Anthropic SDK and external APIs are also mocked — no real calls.
 * All tests use vi.resetModules() + vi.doMock() for full module isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfirmationPayload } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// In-memory store used by the pool mock
// ---------------------------------------------------------------------------

interface StoredRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: Date;
  active_confirmation: ConfirmationPayload | null;
}

let store: StoredRow[] = [];
let nextId = 1;

function resetStore(): void {
  store = [];
  nextId = 1;
}

/**
 * Simulates the behaviour of the SQL statements issued by the T-16 functions
 * in agent.ts (saveConfirmation, loadConfirmation, clearConfirmation) as well
 * as the pre-existing saveMessage / loadContext queries so that the full
 * in-memory store works end-to-end.
 */
function handleQuery(
  text: string,
  values: unknown[],
): { rows: StoredRow[]; rowCount: number } {
  const normalised = text.replace(/\s+/g, " ").trim().toUpperCase();

  // Transaction control — no rows
  if (normalised === "BEGIN" || normalised === "COMMIT" || normalised === "ROLLBACK") {
    return { rows: [], rowCount: 0 };
  }

  // INSERT INTO conversation_context (chat_id, role, content, active_confirmation)
  // — used by saveConfirmation when no existing row exists.
  // The SQL is: INSERT INTO conversation_context (chat_id, role, content, active_confirmation)
  //             VALUES ($1, 'assistant', '', $2)
  // So values has 2 elements: [chatId, jsonPayload]
  if (
    normalised.startsWith("INSERT INTO CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string | null;
    const confirmation =
      confirmationRaw !== null ? (JSON.parse(confirmationRaw) as ConfirmationPayload) : null;
    const row: StoredRow = {
      id: nextId++,
      chat_id: chatId,
      role: "assistant",
      content: "",
      created_at: new Date(),
      active_confirmation: confirmation,
    };
    store.push(row);
    return { rows: [], rowCount: 1 };
  }

  // INSERT INTO conversation_context (chat_id, role, content)
  // — used by saveMessage (3 value parameters: chatId, role, content)
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
      active_confirmation: null,
    };
    store.push(row);
    return { rows: [], rowCount: 1 };
  }

  // UPDATE conversation_context SET active_confirmation = $2 WHERE id = (SELECT ... LIMIT 1)
  // — used by saveConfirmation to set the payload on the newest row
  if (
    normalised.startsWith("UPDATE CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION") &&
    !normalised.includes("NULL")
  ) {
    const chatId = values[0] as number;
    const confirmationRaw = values[1] as string;
    const confirmation = JSON.parse(confirmationRaw) as ConfirmationPayload;

    // Find the newest row for this chat_id
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });

    if (forChat.length === 0) {
      return { rows: [], rowCount: 0 };
    }

    const newestRow = forChat[0]!;
    // Update in-place in the store
    const storeRow = store.find((r) => r.id === newestRow.id)!;
    storeRow.active_confirmation = confirmation;
    return { rows: [], rowCount: 1 };
  }

  // UPDATE conversation_context SET active_confirmation = NULL WHERE id = (SELECT ... LIMIT 1)
  // — used by clearConfirmation
  if (
    normalised.startsWith("UPDATE CONVERSATION_CONTEXT") &&
    normalised.includes("ACTIVE_CONFIRMATION") &&
    normalised.includes("NULL")
  ) {
    const chatId = values[0] as number;

    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });

    if (forChat.length === 0) {
      return { rows: [], rowCount: 0 };
    }

    const newestRow = forChat[0]!;
    const storeRow = store.find((r) => r.id === newestRow.id)!;
    storeRow.active_confirmation = null;
    return { rows: [], rowCount: 1 };
  }

  // DELETE FROM conversation_context … NOT IN (SELECT id … LIMIT $2)
  // — used by saveMessage pruning
  if (normalised.startsWith("DELETE FROM CONVERSATION_CONTEXT")) {
    const chatId = values[0] as number;
    const limit = values[1] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });
    const keepIds = new Set(forChat.slice(0, limit).map((r) => r.id));
    store = store.filter((r) => r.chat_id !== chatId || keepIds.has(r.id));
    return { rows: [], rowCount: 0 };
  }

  // SELECT active_confirmation FROM conversation_context WHERE chat_id = $1 ORDER BY ... LIMIT 1
  // — used by loadConfirmation
  if (
    normalised.startsWith("SELECT ACTIVE_CONFIRMATION") ||
    (normalised.startsWith("SELECT") && normalised.includes("ACTIVE_CONFIRMATION"))
  ) {
    const chatId = values[0] as number;
    const forChat = store
      .filter((r) => r.chat_id === chatId)
      .sort((a, b) => {
        const timeDiff = b.created_at.getTime() - a.created_at.getTime();
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });

    if (forChat.length === 0) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [forChat[0]!] as StoredRow[],
      rowCount: 1,
    };
  }

  // SELECT … FROM (SELECT … ORDER BY created_at DESC LIMIT $2) — used by loadContext
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
    return { rows: forChat, rowCount: forChat.length };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Build pool mock
// ---------------------------------------------------------------------------

function buildPoolMock() {
  const clientQueryMock = vi.fn().mockImplementation(
    (text: string, values?: unknown[]) =>
      Promise.resolve(handleQuery(text, values ?? [])),
  );

  const clientMock = {
    query: clientQueryMock,
    release: vi.fn(),
  };

  const poolQueryMock = vi.fn().mockImplementation(
    (text: string, values?: unknown[]) =>
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

/** Builds a fresh ConfirmationPayload with proposed_at set to NOW (valid). */
function makeFreshPayload(overrides?: Partial<ConfirmationPayload>): ConfirmationPayload {
  return {
    action: "create_event",
    proposed_at: new Date().toISOString(),
    summary: "Create Team Standup at 9 AM",
    data: {
      title: "Team Standup",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    },
    ...overrides,
  };
}

/** Builds a ConfirmationPayload with proposed_at set 11 minutes ago (expired). */
function makeExpiredPayload(): ConfirmationPayload {
  const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
  return makeFreshPayload({ proposed_at: elevenMinutesAgo.toISOString() });
}

/** Builds a ConfirmationPayload with proposed_at set exactly 9 minutes 59 seconds ago (not yet expired). */
function makeNearExpiryPayload(): ConfirmationPayload {
  const nineMinutes59Ago = new Date(Date.now() - (10 * 60 * 1000 - 1000));
  return makeFreshPayload({ proposed_at: nineMinutes59Ago.toISOString() });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("T-16 — agent.ts confirmation record storage", () => {
  let mocks: ReturnType<typeof buildPoolMock>;

  beforeEach(() => {
    resetStore();
    vi.resetModules();
    mocks = buildPoolMock();

    vi.doMock("@lifeos/shared", () => ({
      pool: mocks.pool,
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

  // =========================================================================
  // AC1 — saveConfirmation upserts payload for chat_id
  // =========================================================================

  describe("AC1 — saveConfirmation upserts payload for chat_id", () => {
    it("saveConfirmation persists payload when a prior message row exists", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      // Create a row first so the UPDATE path is exercised
      await saveMessage(100, "user", "hello");
      const payload = makeFreshPayload();
      await saveConfirmation(100, payload);

      const loaded = await loadConfirmation(100);
      expect(loaded).not.toBeNull();
      expect(loaded?.action).toBe("create_event");
      expect(loaded?.summary).toBe("Create Team Standup at 9 AM");
    });

    it("saveConfirmation persists payload via INSERT when no prior rows exist for chat_id", async () => {
      const { saveConfirmation, loadConfirmation } = await import("../agent.js");
      const payload = makeFreshPayload({ summary: "New chat confirmation" });
      await saveConfirmation(999, payload);

      const loaded = await loadConfirmation(999);
      expect(loaded).not.toBeNull();
      expect(loaded?.summary).toBe("New chat confirmation");
    });

    it("saveConfirmation stores the full ConfirmationPayload including data fields", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(200, "user", "schedule something");
      const payload: ConfirmationPayload = {
        action: "create_event",
        proposed_at: new Date().toISOString(),
        summary: "Create Dentist Appointment",
        data: {
          title: "Dentist",
          start: "2026-04-25T10:00:00+01:00",
          end: "2026-04-25T11:00:00+01:00",
          location: "Dental Clinic, 12 High Street",
        },
      };
      await saveConfirmation(200, payload);

      const loaded = await loadConfirmation(200);
      expect(loaded).not.toBeNull();
      expect(loaded?.data).toEqual(payload.data);
    });

    it("saveConfirmation works for update_event action", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(300, "user", "update meeting");
      const payload: ConfirmationPayload = {
        action: "update_event",
        proposed_at: new Date().toISOString(),
        summary: "Update meeting time to 3 PM",
        data: {
          eventId: "evt_abc123",
          start: "2026-04-22T15:00:00+01:00",
          end: "2026-04-22T16:00:00+01:00",
        },
      };
      await saveConfirmation(300, payload);

      const loaded = await loadConfirmation(300);
      expect(loaded?.action).toBe("update_event");
      expect((loaded?.data as { eventId: string }).eventId).toBe("evt_abc123");
    });

    it("saveConfirmation works for delete_event action", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(400, "user", "delete the standup");
      const payload: ConfirmationPayload = {
        action: "delete_event",
        proposed_at: new Date().toISOString(),
        summary: "Delete Team Standup on Tuesday",
        data: { eventId: "evt_standup_001" },
      };
      await saveConfirmation(400, payload);

      const loaded = await loadConfirmation(400);
      expect(loaded?.action).toBe("delete_event");
      expect((loaded?.data as { eventId: string }).eventId).toBe("evt_standup_001");
    });

    it("saveConfirmation uses a transaction (BEGIN / UPDATE or INSERT / COMMIT)", async () => {
      const { saveMessage, saveConfirmation } = await import("../agent.js");
      await saveMessage(500, "user", "test");
      await saveConfirmation(500, makeFreshPayload());

      const calls = mocks.clientQueryMock.mock.calls.map(([sql]) =>
        (sql as string).trim().toUpperCase(),
      );
      // saveMessage uses BEGIN/COMMIT; saveConfirmation uses BEGIN/COMMIT too
      const beginCount = calls.filter((c) => c === "BEGIN").length;
      const commitCount = calls.filter((c) => c === "COMMIT").length;
      expect(beginCount).toBeGreaterThanOrEqual(1);
      expect(commitCount).toBeGreaterThanOrEqual(1);
    });

    it("saveConfirmation UPDATE uses parameterised $1/$2 — no string interpolation", async () => {
      const { saveMessage, saveConfirmation } = await import("../agent.js");
      await saveMessage(600, "user", "test");
      await saveConfirmation(600, makeFreshPayload());

      const updateCall = mocks.clientQueryMock.mock.calls.find(
        ([sql]) =>
          typeof sql === "string" &&
          sql.toUpperCase().includes("UPDATE") &&
          sql.toUpperCase().includes("ACTIVE_CONFIRMATION"),
      );
      expect(updateCall).toBeDefined();

      const [updateSql, updateValues] = updateCall as [string, unknown[]];
      expect(updateSql).toMatch(/\$1/);
      expect(updateSql).toMatch(/\$2/);
      expect(updateSql).not.toContain("600");
      expect(updateValues).toContain(600);
    });

    it("saveConfirmation ROLLBACK is called when UPDATE throws", async () => {
      mocks.clientQueryMock.mockImplementation((text: string) => {
        const norm = text.trim().toUpperCase();
        if (norm === "BEGIN" || norm === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (norm.startsWith("UPDATE") && norm.includes("ACTIVE_CONFIRMATION")) {
          return Promise.reject(new Error("simulated DB error"));
        }
        // Allow the INSERT from saveMessage
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const { saveConfirmation } = await import("../agent.js");
      await expect(saveConfirmation(700, makeFreshPayload())).rejects.toThrow(
        "simulated DB error",
      );

      const calls = mocks.clientQueryMock.mock.calls.map(([sql]) =>
        (sql as string).trim().toUpperCase(),
      );
      expect(calls).toContain("ROLLBACK");
    });

    it("saveConfirmation releases the client even when it throws", async () => {
      mocks.clientQueryMock.mockImplementation((text: string) => {
        const norm = text.trim().toUpperCase();
        if (norm === "BEGIN" || norm === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (norm.startsWith("UPDATE") && norm.includes("ACTIVE_CONFIRMATION")) {
          return Promise.reject(new Error("DB failure"));
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const { saveConfirmation } = await import("../agent.js");
      await expect(saveConfirmation(800, makeFreshPayload())).rejects.toThrow();
      expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // AC2 — loadConfirmation returns null if no pending confirmation
  // =========================================================================

  describe("AC2 — loadConfirmation returns null when no pending confirmation", () => {
    it("returns null when no rows exist at all for the chat_id", async () => {
      const { loadConfirmation } = await import("../agent.js");
      const result = await loadConfirmation(1234);
      expect(result).toBeNull();
    });

    it("returns null when rows exist but active_confirmation is NULL", async () => {
      const { saveMessage, loadConfirmation } = await import("../agent.js");
      await saveMessage(1100, "user", "hello");
      // Do NOT call saveConfirmation — active_confirmation remains null
      const result = await loadConfirmation(1100);
      expect(result).toBeNull();
    });

    it("returns null after clearConfirmation has been called", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation, loadConfirmation } =
        await import("../agent.js");
      await saveMessage(1200, "user", "create event");
      await saveConfirmation(1200, makeFreshPayload());
      await clearConfirmation(1200);
      const result = await loadConfirmation(1200);
      expect(result).toBeNull();
    });

    it("returns null when pool query returns zero rows", async () => {
      // Override poolQueryMock to return zero rows for SELECT
      mocks.poolQueryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const { loadConfirmation } = await import("../agent.js");
      const result = await loadConfirmation(9999);
      expect(result).toBeNull();
    });

    it("returns null when the active_confirmation field in the row is null", async () => {
      // Override poolQueryMock to return a row with active_confirmation = null
      mocks.poolQueryMock.mockResolvedValueOnce({
        rows: [{ active_confirmation: null }],
        rowCount: 1,
      });
      const { loadConfirmation } = await import("../agent.js");
      const result = await loadConfirmation(1300);
      expect(result).toBeNull();
    });

    it("loadConfirmation SELECT uses parameterised $1 — no string interpolation", async () => {
      const { loadConfirmation } = await import("../agent.js");
      await loadConfirmation(5555);

      const selectCall = mocks.poolQueryMock.mock.calls.find(
        ([sql]) =>
          typeof sql === "string" &&
          sql.toUpperCase().includes("SELECT") &&
          sql.toUpperCase().includes("ACTIVE_CONFIRMATION"),
      );
      expect(selectCall).toBeDefined();

      const [selectSql, selectValues] = selectCall as [string, unknown[]];
      expect(selectSql).toMatch(/\$1/);
      expect(selectSql).not.toContain("5555");
      expect(selectValues).toContain(5555);
    });
  });

  // =========================================================================
  // AC3 — loadConfirmation returns null if confirmation is older than 10 min
  // =========================================================================

  describe("AC3 — loadConfirmation returns null when confirmation is older than 10 minutes", () => {
    it("returns null when proposed_at is 11 minutes ago", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2000, "user", "hello");
      await saveConfirmation(2000, makeExpiredPayload());
      const result = await loadConfirmation(2000);
      expect(result).toBeNull();
    });

    it("returns null when proposed_at is exactly 10 minutes + 1 second ago", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2001, "user", "hi");
      const tenMinutesOneSec = new Date(Date.now() - (10 * 60 * 1000 + 1000));
      await saveConfirmation(
        2001,
        makeFreshPayload({ proposed_at: tenMinutesOneSec.toISOString() }),
      );
      const result = await loadConfirmation(2001);
      expect(result).toBeNull();
    });

    it("returns null when proposed_at is 60 minutes ago", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2002, "user", "old proposal");
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await saveConfirmation(
        2002,
        makeFreshPayload({ proposed_at: oneHourAgo.toISOString() }),
      );
      const result = await loadConfirmation(2002);
      expect(result).toBeNull();
    });

    it("returns null when proposed_at is a date from yesterday", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2003, "user", "yesterday");
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await saveConfirmation(
        2003,
        makeFreshPayload({ proposed_at: yesterday.toISOString() }),
      );
      const result = await loadConfirmation(2003);
      expect(result).toBeNull();
    });

    it("returns the payload when proposed_at is only 9 minutes 59 seconds ago (not expired)", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2100, "user", "recent");
      const nearExpiry = makeNearExpiryPayload();
      await saveConfirmation(2100, nearExpiry);
      const result = await loadConfirmation(2100);
      expect(result).not.toBeNull();
      expect(result?.action).toBe("create_event");
    });

    it("returns the payload when proposed_at is 1 second ago (fresh)", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2101, "user", "fresh proposal");
      const oneSecondAgo = new Date(Date.now() - 1000);
      const freshPayload = makeFreshPayload({ proposed_at: oneSecondAgo.toISOString() });
      await saveConfirmation(2101, freshPayload);
      const result = await loadConfirmation(2101);
      expect(result).not.toBeNull();
    });

    it("expired payload is not written to DB by loadConfirmation (read-only expiry check)", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(2200, "user", "check expiry");
      await saveConfirmation(2200, makeExpiredPayload());

      const updateCallCountBefore = mocks.poolQueryMock.mock.calls.filter(
        ([sql]) =>
          typeof sql === "string" &&
          sql.toUpperCase().startsWith("UPDATE") &&
          sql.toUpperCase().includes("ACTIVE_CONFIRMATION = NULL"),
      ).length;

      await loadConfirmation(2200); // should return null but NOT issue an UPDATE

      const updateCallCountAfter = mocks.poolQueryMock.mock.calls.filter(
        ([sql]) =>
          typeof sql === "string" &&
          sql.toUpperCase().startsWith("UPDATE") &&
          sql.toUpperCase().includes("ACTIVE_CONFIRMATION = NULL"),
      ).length;

      // loadConfirmation must not have issued a NULL-setting UPDATE
      expect(updateCallCountAfter).toBe(updateCallCountBefore);
    });
  });

  // =========================================================================
  // AC4 — clearConfirmation sets column to null
  // =========================================================================

  describe("AC4 — clearConfirmation sets active_confirmation column to null", () => {
    it("clearConfirmation nulls the active_confirmation column after saveConfirmation", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation, loadConfirmation } =
        await import("../agent.js");
      await saveMessage(3000, "user", "clear me");
      await saveConfirmation(3000, makeFreshPayload());

      // Confirm payload is there before clearing
      const beforeClear = await loadConfirmation(3000);
      expect(beforeClear).not.toBeNull();

      await clearConfirmation(3000);

      const afterClear = await loadConfirmation(3000);
      expect(afterClear).toBeNull();

      // Verify the store row's active_confirmation is actually null
      const row = store.find((r) => r.chat_id === 3000);
      expect(row).toBeDefined();
      expect(row?.active_confirmation).toBeNull();
    });

    it("clearConfirmation is a no-op when no rows exist for chat_id (does not throw)", async () => {
      const { clearConfirmation } = await import("../agent.js");
      await expect(clearConfirmation(8888)).resolves.toBeUndefined();
    });

    it("clearConfirmation is idempotent — calling it twice does not throw", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation } =
        await import("../agent.js");
      await saveMessage(3100, "user", "idempotent");
      await saveConfirmation(3100, makeFreshPayload());
      await clearConfirmation(3100);
      await expect(clearConfirmation(3100)).resolves.toBeUndefined();
    });

    it("clearConfirmation UPDATE uses parameterised $1 — no string interpolation", async () => {
      const { saveMessage, clearConfirmation } = await import("../agent.js");
      await saveMessage(3200, "user", "test");
      await clearConfirmation(3200);

      const updateCall = mocks.poolQueryMock.mock.calls.find(
        ([sql]) =>
          typeof sql === "string" &&
          sql.toUpperCase().includes("UPDATE") &&
          sql.toUpperCase().includes("ACTIVE_CONFIRMATION") &&
          sql.toUpperCase().includes("NULL"),
      );
      expect(updateCall).toBeDefined();

      const [updateSql, updateValues] = updateCall as [string, unknown[]];
      expect(updateSql).toMatch(/\$1/);
      expect(updateSql).not.toContain("3200");
      expect(updateValues).toContain(3200);
    });

    it("clearConfirmation targets the newest row for the chat_id", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation, loadConfirmation } =
        await import("../agent.js");
      // Multiple rows — newest has the confirmation
      await saveMessage(3300, "user", "msg 1");
      await saveMessage(3300, "assistant", "msg 2");
      await saveConfirmation(3300, makeFreshPayload({ summary: "Clear newest" }));

      await clearConfirmation(3300);
      const result = await loadConfirmation(3300);
      expect(result).toBeNull();
    });

    it("clearConfirmation on expired confirmation also sets to null", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation } =
        await import("../agent.js");
      await saveMessage(3400, "user", "old proposal");
      await saveConfirmation(3400, makeExpiredPayload());
      await expect(clearConfirmation(3400)).resolves.toBeUndefined();

      // Row should have active_confirmation = null
      const row = store.find((r) => r.chat_id === 3400);
      expect(row?.active_confirmation).toBeNull();
    });
  });

  // =========================================================================
  // AC5 — Only one active confirmation per chat_id — new proposal overwrites old
  // =========================================================================

  describe("AC5 — only one active confirmation per chat_id; new proposal overwrites old", () => {
    it("second saveConfirmation overwrites the first payload", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(4000, "user", "first");

      const first = makeFreshPayload({ summary: "First proposal" });
      await saveConfirmation(4000, first);

      const second = makeFreshPayload({ summary: "Second proposal" });
      await saveConfirmation(4000, second);

      const loaded = await loadConfirmation(4000);
      expect(loaded?.summary).toBe("Second proposal");
    });

    it("overwrite works for different action types (create → delete)", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(4100, "user", "change of mind");

      const createPayload: ConfirmationPayload = {
        action: "create_event",
        proposed_at: new Date().toISOString(),
        summary: "Create standup",
        data: {
          title: "Standup",
          start: "2026-04-21T09:00:00+01:00",
          end: "2026-04-21T09:30:00+01:00",
        },
      };
      await saveConfirmation(4100, createPayload);

      const deletePayload: ConfirmationPayload = {
        action: "delete_event",
        proposed_at: new Date().toISOString(),
        summary: "Delete standup",
        data: { eventId: "evt_standup_old" },
      };
      await saveConfirmation(4100, deletePayload);

      const loaded = await loadConfirmation(4100);
      expect(loaded?.action).toBe("delete_event");
      expect(loaded?.summary).toBe("Delete standup");
    });

    it("multiple overwrites still leave exactly one active confirmation", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(4200, "user", "multi overwrite");

      for (let i = 1; i <= 5; i++) {
        await saveConfirmation(4200, makeFreshPayload({ summary: `Proposal ${i}` }));
      }

      const loaded = await loadConfirmation(4200);
      expect(loaded?.summary).toBe("Proposal 5");
    });

    it("overwriting an expired confirmation stores a fresh one", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(4300, "user", "refresh");

      await saveConfirmation(4300, makeExpiredPayload());
      // Expired — loadConfirmation returns null
      const expired = await loadConfirmation(4300);
      expect(expired).toBeNull();

      // Overwrite with a fresh payload
      await saveConfirmation(4300, makeFreshPayload({ summary: "Fresh overwrite" }));
      const fresh = await loadConfirmation(4300);
      expect(fresh).not.toBeNull();
      expect(fresh?.summary).toBe("Fresh overwrite");
    });

    it("confirmations for different chat_ids are independent", async () => {
      const { saveMessage, saveConfirmation, loadConfirmation } = await import("../agent.js");
      await saveMessage(5000, "user", "chat 5000");
      await saveMessage(5001, "user", "chat 5001");

      await saveConfirmation(5000, makeFreshPayload({ summary: "Chat 5000 proposal" }));
      await saveConfirmation(5001, makeFreshPayload({ summary: "Chat 5001 proposal" }));

      const result5000 = await loadConfirmation(5000);
      const result5001 = await loadConfirmation(5001);

      expect(result5000?.summary).toBe("Chat 5000 proposal");
      expect(result5001?.summary).toBe("Chat 5001 proposal");
    });

    it("clearing one chat_id does not affect another chat_id", async () => {
      const { saveMessage, saveConfirmation, clearConfirmation, loadConfirmation } =
        await import("../agent.js");
      await saveMessage(5100, "user", "keep");
      await saveMessage(5101, "user", "clear");

      await saveConfirmation(5100, makeFreshPayload({ summary: "Keep this" }));
      await saveConfirmation(5101, makeFreshPayload({ summary: "Clear this" }));

      await clearConfirmation(5101);

      const kept = await loadConfirmation(5100);
      const cleared = await loadConfirmation(5101);

      expect(kept?.summary).toBe("Keep this");
      expect(cleared).toBeNull();
    });

    it("the store never accumulates extra rows solely from saveConfirmation calls", async () => {
      const { saveMessage, saveConfirmation } = await import("../agent.js");
      await saveMessage(5200, "user", "one row only");

      const rowsBefore = store.filter((r) => r.chat_id === 5200).length;
      // Save 5 confirmations — should all UPDATE the same row
      for (let i = 1; i <= 5; i++) {
        await saveConfirmation(5200, makeFreshPayload({ summary: `Payload ${i}` }));
      }
      const rowsAfter = store.filter((r) => r.chat_id === 5200).length;
      // Row count must not grow beyond the rows that existed before
      expect(rowsAfter).toBe(rowsBefore);
    });
  });
});
