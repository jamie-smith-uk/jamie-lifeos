/**
 * Tests for types.ts — shared TypeScript interfaces.
 *
 * TypeScript interfaces are compile-time constructs; at runtime we validate:
 *   - All expected exports exist (named exports are importable)
 *   - Interface shapes are correct by constructing conformant objects
 *   - Type narrowing and discriminated unions behave as expected
 *
 * These tests serve as both runtime checks and living documentation of the
 * interface contracts.
 */

import { describe, it, expect } from "vitest";

// We import types as type-only to verify they are exported; runtime objects
// are constructed inline to verify structural conformance.
import type {
  ConversationMessage,
  ConfirmationPayload,
  ConfirmationAction,
  MessageRole,
  CreateEventData,
  UpdateEventData,
  DeleteEventData,
  CallbackAction,
  IncomingMessage,
  IncomingCallback,
  OrchestratorReply,
} from "../types.js";

// ---------------------------------------------------------------------------
// AC: types.ts exports ConversationMessage and ConfirmationPayload interfaces
// ---------------------------------------------------------------------------

describe("types.ts — ConversationMessage interface", () => {
  it("can construct a valid ConversationMessage object", () => {
    const msg: ConversationMessage = {
      id: 1,
      chat_id: 123456,
      role: "user",
      content: "Hello, world!",
      created_at: new Date("2026-04-20T10:00:00Z"),
    };

    expect(msg.id).toBe(1);
    expect(msg.chat_id).toBe(123456);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello, world!");
    expect(msg.created_at).toBeInstanceOf(Date);
  });

  it("ConversationMessage.role accepts 'user'", () => {
    const role: MessageRole = "user";
    const msg: ConversationMessage = {
      id: 1,
      chat_id: 1,
      role,
      content: "hi",
      created_at: new Date(),
    };
    expect(msg.role).toBe("user");
  });

  it("ConversationMessage.role accepts 'assistant'", () => {
    const role: MessageRole = "assistant";
    const msg: ConversationMessage = {
      id: 2,
      chat_id: 1,
      role,
      content: "how can I help?",
      created_at: new Date(),
    };
    expect(msg.role).toBe("assistant");
  });

  it("ConversationMessage has all required fields", () => {
    const msg: ConversationMessage = {
      id: 99,
      chat_id: 999,
      role: "user",
      content: "test",
      created_at: new Date(),
    };
    // Verify all fields are accessible
    expect(Object.keys(msg)).toEqual(
      expect.arrayContaining(["id", "chat_id", "role", "content", "created_at"]),
    );
  });
});

describe("types.ts — ConfirmationPayload interface", () => {
  it("can construct a valid create_event ConfirmationPayload", () => {
    const data: CreateEventData = {
      title: "Team standup",
      start: "2026-04-21T09:00:00+01:00",
      end: "2026-04-21T09:30:00+01:00",
    };

    const payload: ConfirmationPayload = {
      action: "create_event",
      proposed_at: "2026-04-20T10:00:00Z",
      data,
      summary: "Schedule team standup tomorrow at 9am",
    };

    expect(payload.action).toBe("create_event");
    expect(payload.proposed_at).toBe("2026-04-20T10:00:00Z");
    expect(payload.summary).toBe("Schedule team standup tomorrow at 9am");
    expect((payload.data as CreateEventData).title).toBe("Team standup");
  });

  it("can construct a valid update_event ConfirmationPayload", () => {
    const data: UpdateEventData = {
      eventId: "abc123",
      title: "Updated standup",
    };

    const payload: ConfirmationPayload = {
      action: "update_event",
      proposed_at: "2026-04-20T11:00:00Z",
      data,
      summary: "Update standup title",
    };

    expect(payload.action).toBe("update_event");
    expect((payload.data as UpdateEventData).eventId).toBe("abc123");
  });

  it("can construct a valid delete_event ConfirmationPayload", () => {
    const data: DeleteEventData = {
      eventId: "xyz789",
    };

    const payload: ConfirmationPayload = {
      action: "delete_event",
      proposed_at: "2026-04-20T12:00:00Z",
      data,
      summary: "Delete the standup event",
    };

    expect(payload.action).toBe("delete_event");
    expect((payload.data as DeleteEventData).eventId).toBe("xyz789");
  });

  it("ConfirmationPayload has all required fields", () => {
    const payload: ConfirmationPayload = {
      action: "create_event",
      proposed_at: "2026-04-20T10:00:00Z",
      data: { title: "x", start: "s", end: "e" },
      summary: "test",
    };
    expect(Object.keys(payload)).toEqual(
      expect.arrayContaining(["action", "proposed_at", "data", "summary"]),
    );
  });
});

describe("types.ts — ConfirmationAction type", () => {
  it("accepts all three valid action values", () => {
    const actions: ConfirmationAction[] = [
      "create_event",
      "update_event",
      "delete_event",
    ];
    expect(actions).toHaveLength(3);
    expect(actions).toContain("create_event");
    expect(actions).toContain("update_event");
    expect(actions).toContain("delete_event");
  });
});

describe("types.ts — CreateEventData interface", () => {
  it("requires title, start, end; allows optional fields", () => {
    const minimal: CreateEventData = {
      title: "Dentist",
      start: "2026-05-01T10:00:00Z",
      end: "2026-05-01T11:00:00Z",
    };
    expect(minimal.title).toBe("Dentist");
    expect(minimal.location).toBeUndefined();
    expect(minimal.description).toBeUndefined();
    expect(minimal.attendees).toBeUndefined();
  });

  it("accepts full optional fields", () => {
    const full: CreateEventData = {
      title: "Meeting",
      start: "2026-05-01T10:00:00Z",
      end: "2026-05-01T11:00:00Z",
      location: "Office",
      description: "Monthly sync",
      attendees: ["alice@example.com", "bob@example.com"],
    };
    expect(full.location).toBe("Office");
    expect(full.attendees).toHaveLength(2);
  });
});

describe("types.ts — UpdateEventData interface", () => {
  it("requires only eventId; all other fields are optional", () => {
    const update: UpdateEventData = { eventId: "evt_001" };
    expect(update.eventId).toBe("evt_001");
    expect(update.title).toBeUndefined();
  });
});

describe("types.ts — DeleteEventData interface", () => {
  it("requires only eventId", () => {
    const del: DeleteEventData = { eventId: "evt_002" };
    expect(del.eventId).toBe("evt_002");
  });
});

describe("types.ts — CallbackAction discriminated union", () => {
  it("supports confirm type", () => {
    const action: CallbackAction = { type: "confirm" };
    expect(action.type).toBe("confirm");
  });

  it("supports edit type", () => {
    const action: CallbackAction = { type: "edit" };
    expect(action.type).toBe("edit");
  });

  it("supports cancel type", () => {
    const action: CallbackAction = { type: "cancel" };
    expect(action.type).toBe("cancel");
  });

  it("supports dismiss type with nudgeId", () => {
    const action: CallbackAction = { type: "dismiss", nudgeId: 42 };
    expect(action.type).toBe("dismiss");
    if (action.type === "dismiss") {
      expect(action.nudgeId).toBe(42);
    }
  });
});

describe("types.ts — HTTP payload interfaces", () => {
  it("can construct an IncomingMessage", () => {
    const msg: IncomingMessage = {
      chat_id: 123,
      text: "hello",
      message_id: 1,
    };
    expect(msg.chat_id).toBe(123);
    expect(msg.from_username).toBeUndefined();
  });

  it("can construct an IncomingCallback", () => {
    const cb: IncomingCallback = {
      chat_id: 123,
      callback_query_id: "cq_001",
      callback_data: "confirm",
      message_id: 1,
    };
    expect(cb.callback_query_id).toBe("cq_001");
  });

  it("can construct an OrchestratorReply", () => {
    const reply: OrchestratorReply = { text: "Done!" };
    expect(reply.text).toBe("Done!");
    expect(reply.show_confirmation_keyboard).toBeUndefined();
  });

  it("OrchestratorReply supports show_confirmation_keyboard", () => {
    const reply: OrchestratorReply = {
      text: "Confirm this?",
      show_confirmation_keyboard: true,
    };
    expect(reply.show_confirmation_keyboard).toBe(true);
  });
});
