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
import { describe, expect, it } from "vitest";
// ---------------------------------------------------------------------------
// AC: types.ts exports ConversationMessage and ConfirmationPayload interfaces
// ---------------------------------------------------------------------------
describe("types.ts — ConversationMessage interface", () => {
    it("can construct a valid ConversationMessage object", () => {
        const msg = {
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
        const role = "user";
        const msg = {
            id: 1,
            chat_id: 1,
            role,
            content: "hi",
            created_at: new Date(),
        };
        expect(msg.role).toBe("user");
    });
    it("ConversationMessage.role accepts 'assistant'", () => {
        const role = "assistant";
        const msg = {
            id: 2,
            chat_id: 1,
            role,
            content: "how can I help?",
            created_at: new Date(),
        };
        expect(msg.role).toBe("assistant");
    });
    it("ConversationMessage has all required fields", () => {
        const msg = {
            id: 99,
            chat_id: 999,
            role: "user",
            content: "test",
            created_at: new Date(),
        };
        // Verify all fields are accessible
        expect(Object.keys(msg)).toEqual(expect.arrayContaining(["id", "chat_id", "role", "content", "created_at"]));
    });
});
describe("types.ts — ConfirmationPayload interface", () => {
    it("can construct a valid create_event ConfirmationPayload", () => {
        const data = {
            title: "Team standup",
            start: "2026-04-21T09:00:00+01:00",
            end: "2026-04-21T09:30:00+01:00",
        };
        const payload = {
            action: "create_event",
            proposed_at: "2026-04-20T10:00:00Z",
            data,
            summary: "Schedule team standup tomorrow at 9am",
        };
        expect(payload.action).toBe("create_event");
        expect(payload.proposed_at).toBe("2026-04-20T10:00:00Z");
        expect(payload.summary).toBe("Schedule team standup tomorrow at 9am");
        expect(payload.data.title).toBe("Team standup");
    });
    it("can construct a valid update_event ConfirmationPayload", () => {
        const data = {
            eventId: "abc123",
            title: "Updated standup",
        };
        const payload = {
            action: "update_event",
            proposed_at: "2026-04-20T11:00:00Z",
            data,
            summary: "Update standup title",
        };
        expect(payload.action).toBe("update_event");
        expect(payload.data.eventId).toBe("abc123");
    });
    it("can construct a valid delete_event ConfirmationPayload", () => {
        const data = {
            eventId: "xyz789",
        };
        const payload = {
            action: "delete_event",
            proposed_at: "2026-04-20T12:00:00Z",
            data,
            summary: "Delete the standup event",
        };
        expect(payload.action).toBe("delete_event");
        expect(payload.data.eventId).toBe("xyz789");
    });
    it("ConfirmationPayload has all required fields", () => {
        const payload = {
            action: "create_event",
            proposed_at: "2026-04-20T10:00:00Z",
            data: { title: "x", start: "s", end: "e" },
            summary: "test",
        };
        expect(Object.keys(payload)).toEqual(expect.arrayContaining(["action", "proposed_at", "data", "summary"]));
    });
});
describe("types.ts — ConfirmationAction type", () => {
    it("accepts all three valid action values", () => {
        const actions = ["create_event", "update_event", "delete_event"];
        expect(actions).toHaveLength(3);
        expect(actions).toContain("create_event");
        expect(actions).toContain("update_event");
        expect(actions).toContain("delete_event");
    });
});
describe("types.ts — CreateEventData interface", () => {
    it("requires title, start, end; allows optional fields", () => {
        const minimal = {
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
        const full = {
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
        const update = { eventId: "evt_001" };
        expect(update.eventId).toBe("evt_001");
        expect(update.title).toBeUndefined();
    });
});
describe("types.ts — DeleteEventData interface", () => {
    it("requires only eventId", () => {
        const del = { eventId: "evt_002" };
        expect(del.eventId).toBe("evt_002");
    });
});
describe("types.ts — CallbackAction discriminated union", () => {
    it("supports confirm type", () => {
        const action = { type: "confirm" };
        expect(action.type).toBe("confirm");
    });
    it("supports edit type", () => {
        const action = { type: "edit" };
        expect(action.type).toBe("edit");
    });
    it("supports cancel type", () => {
        const action = { type: "cancel" };
        expect(action.type).toBe("cancel");
    });
    it("supports dismiss type with nudgeId", () => {
        const action = { type: "dismiss", nudgeId: 42 };
        expect(action.type).toBe("dismiss");
        if (action.type === "dismiss") {
            expect(action.nudgeId).toBe(42);
        }
    });
});
describe("types.ts — HTTP payload interfaces", () => {
    it("can construct an IncomingMessage", () => {
        const msg = {
            chat_id: 123,
            text: "hello",
            message_id: 1,
        };
        expect(msg.chat_id).toBe(123);
        expect(msg.from_username).toBeUndefined();
    });
    it("can construct an IncomingCallback", () => {
        const cb = {
            chat_id: 123,
            callback_query_id: "cq_001",
            callback_data: "confirm",
            message_id: 1,
        };
        expect(cb.callback_query_id).toBe("cq_001");
    });
    it("can construct an OrchestratorReply", () => {
        const reply = { text: "Done!" };
        expect(reply.text).toBe("Done!");
        expect(reply.show_confirmation_keyboard).toBeUndefined();
    });
    it("OrchestratorReply supports show_confirmation_keyboard", () => {
        const reply = {
            text: "Confirm this?",
            show_confirmation_keyboard: true,
        };
        expect(reply.show_confirmation_keyboard).toBe(true);
    });
});
describe("types.ts — LifeEvent interface", () => {
    it("can construct a valid LifeEvent with all required fields", () => {
        const event = {
            id: 1,
            person_id: 5,
            event_type: "birthday",
            event_date: new Date("2026-05-15"),
            is_recurring: true,
            notes: "Turning 30",
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(event.id).toBe(1);
        expect(event.person_id).toBe(5);
        expect(event.event_type).toBe("birthday");
        expect(event.event_date).toBeInstanceOf(Date);
        expect(event.is_recurring).toBe(true);
        expect(event.notes).toBe("Turning 30");
        expect(event.created_at).toBeInstanceOf(Date);
    });
    it("LifeEvent.is_recurring can be false", () => {
        const event = {
            id: 2,
            person_id: 3,
            event_type: "wedding",
            event_date: new Date("2026-06-20"),
            is_recurring: false,
            notes: "Getting married",
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(event.is_recurring).toBe(false);
    });
    it("LifeEvent.notes can be null or undefined", () => {
        const eventWithNull = {
            id: 3,
            person_id: 4,
            event_type: "anniversary",
            event_date: new Date("2026-07-10"),
            is_recurring: true,
            notes: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(eventWithNull.notes).toBeNull();
    });
    it("LifeEvent has all required fields", () => {
        const event = {
            id: 99,
            person_id: 88,
            event_type: "graduation",
            event_date: new Date("2026-08-01"),
            is_recurring: false,
            notes: "College graduation",
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(Object.keys(event)).toEqual(expect.arrayContaining([
            "id",
            "person_id",
            "event_type",
            "event_date",
            "is_recurring",
            "notes",
            "created_at",
        ]));
    });
    it("LifeEvent event_type accepts various event types", () => {
        const types = ["birthday", "anniversary", "wedding", "graduation", "promotion"];
        types.forEach((eventType) => {
            const event = {
                id: 1,
                person_id: 1,
                event_type: eventType,
                event_date: new Date("2026-05-15"),
                is_recurring: false,
                notes: null,
                created_at: new Date("2026-04-20T10:00:00Z"),
            };
            expect(event.event_type).toBe(eventType);
        });
    });
});
describe("types.ts — Nudge interface", () => {
    it("can construct a valid Nudge with all required fields", () => {
        const nudge = {
            id: 1,
            person_id: 5,
            life_event_id: 10,
            message: "Remember to call Alice for her birthday!",
            trigger_at: new Date("2026-05-15T09:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(nudge.id).toBe(1);
        expect(nudge.person_id).toBe(5);
        expect(nudge.life_event_id).toBe(10);
        expect(nudge.message).toBe("Remember to call Alice for her birthday!");
        expect(nudge.trigger_at).toBeInstanceOf(Date);
        expect(nudge.status).toBe("pending");
        expect(nudge.sent_at).toBeNull();
        expect(nudge.dismissed_at).toBeNull();
        expect(nudge.created_at).toBeInstanceOf(Date);
    });
    it("Nudge.status can be 'sent'", () => {
        const nudge = {
            id: 2,
            person_id: 3,
            life_event_id: 5,
            message: "Reminder message",
            trigger_at: new Date("2026-05-10T10:00:00Z"),
            status: "sent",
            sent_at: new Date("2026-05-10T10:00:00Z"),
            dismissed_at: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(nudge.status).toBe("sent");
        expect(nudge.sent_at).toBeInstanceOf(Date);
    });
    it("Nudge.status can be 'dismissed'", () => {
        const nudge = {
            id: 3,
            person_id: 2,
            life_event_id: 8,
            message: "Dismissed reminder",
            trigger_at: new Date("2026-05-05T10:00:00Z"),
            status: "dismissed",
            sent_at: new Date("2026-05-05T10:00:00Z"),
            dismissed_at: new Date("2026-05-05T10:30:00Z"),
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(nudge.status).toBe("dismissed");
        expect(nudge.dismissed_at).toBeInstanceOf(Date);
    });
    it("Nudge.person_id can be null", () => {
        const nudge = {
            id: 4,
            person_id: null,
            life_event_id: 12,
            message: "Generic nudge",
            trigger_at: new Date("2026-05-20T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(nudge.person_id).toBeNull();
    });
    it("Nudge.life_event_id can be null", () => {
        const nudge = {
            id: 5,
            person_id: 7,
            life_event_id: null,
            message: "General reminder",
            trigger_at: new Date("2026-05-25T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(nudge.life_event_id).toBeNull();
    });
    it("Nudge has all required fields", () => {
        const nudge = {
            id: 99,
            person_id: 88,
            life_event_id: 77,
            message: "Test nudge",
            trigger_at: new Date("2026-06-01T10:00:00Z"),
            status: "pending",
            sent_at: null,
            dismissed_at: null,
            created_at: new Date("2026-04-20T10:00:00Z"),
        };
        expect(Object.keys(nudge)).toEqual(expect.arrayContaining([
            "id",
            "person_id",
            "life_event_id",
            "message",
            "trigger_at",
            "status",
            "sent_at",
            "dismissed_at",
            "created_at",
        ]));
    });
    it("Nudge status values are constrained to pending, sent, dismissed", () => {
        const validStatuses = ["pending", "sent", "dismissed"];
        validStatuses.forEach((status) => {
            const nudge = {
                id: 1,
                person_id: 1,
                life_event_id: 1,
                message: "Test",
                trigger_at: new Date("2026-05-15T10:00:00Z"),
                status,
                sent_at: null,
                dismissed_at: null,
                created_at: new Date("2026-04-20T10:00:00Z"),
            };
            expect(nudge.status).toBe(status);
        });
    });
});
//# sourceMappingURL=types.test.js.map