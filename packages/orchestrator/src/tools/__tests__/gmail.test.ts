/**
 * gmail.test.ts — Tests for Gmail tool implementations
 *
 * Tests for extract_implied_actions function that parses email content
 * and extracts implied calendar events and tasks with structured data.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { executeGmailTool } from "../gmail";

describe("Gmail Tools", () => {
  describe("extract_implied_actions", () => {
    describe("Flight confirmation parsing", () => {
      it("should extract flight details from flight confirmation email", async () => {
        const flightEmail = `
          Confirmation Number: ABC123
          Flight: UA456 from SFO to NYC
          Departure: 2026-05-20 at 10:30 AM
          Arrival: 2026-05-20 at 6:45 PM
          Seat: 12A
          Gate: TBD
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: flightEmail,
          subject: "Your flight confirmation",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("calendar_events");
        expect(parsed).toHaveProperty("tasks");
        expect(parsed.calendar_events).toBeInstanceOf(Array);
        expect(parsed.calendar_events.length).toBeGreaterThan(0);

        const flightEvent = parsed.calendar_events.find(
          (e: { type: string }) => e.type === "flight"
        );
        expect(flightEvent).toBeDefined();
        expect(flightEvent).toHaveProperty("confirmation_number", "ABC123");
        expect(flightEvent).toHaveProperty("departure_time");
        expect(flightEvent).toHaveProperty("arrival_time");
        expect(flightEvent).toHaveProperty("from", "SFO");
        expect(flightEvent).toHaveProperty("to", "NYC");
      });

      it("should extract multiple flight segments from itinerary", async () => {
        const itineraryEmail = `
          Outbound Flight:
          UA456 SFO to NYC on 2026-05-20 at 10:30 AM
          
          Return Flight:
          UA789 NYC to SFO on 2026-05-27 at 2:00 PM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: itineraryEmail,
          subject: "Round trip flight confirmation",
        });

        const parsed = JSON.parse(result);
        expect(parsed.calendar_events).toBeInstanceOf(Array);
        expect(parsed.calendar_events.length).toBeGreaterThanOrEqual(2);

        const flightEvents = parsed.calendar_events.filter(
          (e: { type: string }) => e.type === "flight"
        );
        expect(flightEvents.length).toBeGreaterThanOrEqual(2);
      });

      it("should create reminder task for flight check-in", async () => {
        const flightEmail = `
          Confirmation Number: ABC123
          Flight: UA456 from SFO to NYC
          Departure: 2026-05-20 at 10:30 AM
          Check-in opens 24 hours before departure
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: flightEmail,
          subject: "Flight confirmation",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);

        const checkInTask = parsed.tasks.find(
          (t: { title: string }) =>
            t.title.toLowerCase().includes("check-in") ||
            t.title.toLowerCase().includes("checkin")
        );
        expect(checkInTask).toBeDefined();
        expect(checkInTask).toHaveProperty("due_date");
      });
    });

    describe("Meeting invite parsing", () => {
      it("should extract meeting details from calendar invite", async () => {
        const meetingEmail = `
          Meeting: Q2 Planning Session
          Date: 2026-05-22
          Time: 2:00 PM - 3:30 PM
          Location: Conference Room B
          Organizer: alice@company.com
          Attendees: bob@company.com, charlie@company.com
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: meetingEmail,
          subject: "Meeting invite: Q2 Planning Session",
        });

        const parsed = JSON.parse(result);
        expect(parsed.calendar_events).toBeInstanceOf(Array);

        const meetingEvent = parsed.calendar_events.find(
          (e: { type: string }) => e.type === "meeting"
        );
        expect(meetingEvent).toBeDefined();
        expect(meetingEvent).toHaveProperty("title", "Q2 Planning Session");
        expect(meetingEvent).toHaveProperty("start_time");
        expect(meetingEvent).toHaveProperty("end_time");
        expect(meetingEvent).toHaveProperty("location", "Conference Room B");
        expect(meetingEvent).toHaveProperty("attendees");
        expect(meetingEvent.attendees).toBeInstanceOf(Array);
      });

      it("should extract meeting with timezone information", async () => {
        const meetingEmail = `
          Meeting: Team Standup
          Date: 2026-05-21
          Time: 9:00 AM PT
          Location: Zoom
          Link: https://zoom.us/j/123456
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: meetingEmail,
          subject: "Team Standup",
        });

        const parsed = JSON.parse(result);
        const meetingEvent = parsed.calendar_events.find(
          (e: { type: string }) => e.type === "meeting"
        );
        expect(meetingEvent).toBeDefined();
        expect(meetingEvent).toHaveProperty("timezone");
      });

      it("should create task for meeting preparation", async () => {
        const meetingEmail = `
          Meeting: Budget Review
          Date: 2026-05-25
          Time: 10:00 AM
          Please prepare Q2 budget report before the meeting
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: meetingEmail,
          subject: "Budget Review Meeting",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);

        const prepTask = parsed.tasks.find(
          (t: { title: string }) =>
            t.title.toLowerCase().includes("prepare") ||
            t.title.toLowerCase().includes("budget")
        );
        expect(prepTask).toBeDefined();
      });
    });

    describe("Deadline parsing", () => {
      it("should extract deadline from email with explicit date", async () => {
        const deadlineEmail = `
          Project: Website Redesign
          Deadline: 2026-06-15
          Please submit your design mockups by this date.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: deadlineEmail,
          subject: "Website Redesign - Deadline",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);

        const deadlineTask = parsed.tasks.find(
          (t: { title: string }) =>
            t.title.toLowerCase().includes("redesign") ||
            t.title.toLowerCase().includes("mockup")
        );
        expect(deadlineTask).toBeDefined();
        expect(deadlineTask).toHaveProperty("due_date");
      });

      it("should extract deadline from relative date references", async () => {
        const deadlineEmail = `
          Please review and approve by end of day Friday.
          This is urgent and needs immediate attention.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: deadlineEmail,
          subject: "Urgent: Review needed",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);
        expect(parsed.tasks.length).toBeGreaterThan(0);

        const task = parsed.tasks[0];
        expect(task).toHaveProperty("due_date");
        expect(task).toHaveProperty("priority");
      });

      it("should mark high-priority deadlines", async () => {
        const urgentEmail = `
          URGENT: Contract signature required
          Deadline: 2026-05-18 by 5:00 PM
          This is critical and must be completed ASAP.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: urgentEmail,
          subject: "URGENT: Contract signature",
        });

        const parsed = JSON.parse(result);
        const task = parsed.tasks.find(
          (t: { title: string }) =>
            t.title.toLowerCase().includes("contract") ||
            t.title.toLowerCase().includes("signature")
        );
        expect(task).toBeDefined();
        expect(task).toHaveProperty("priority");
        expect(["high", "urgent"]).toContain(task.priority);
      });
    });

    describe("Date and time parsing", () => {
      it("should parse ISO 8601 dates", async () => {
        const email = `
          Event: Conference
          Date: 2026-05-20
          Time: 14:30:00
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Conference",
        });

        const parsed = JSON.parse(result);
        expect(parsed.calendar_events).toBeInstanceOf(Array);
        const event = parsed.calendar_events[0];
        expect(event).toHaveProperty("start_time");
      });

      it("should parse common date formats", async () => {
        const email = `
          Meeting on May 22, 2026 at 2:00 PM
          Another meeting 5/25/2026 10:00 AM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Meetings",
        });

        const parsed = JSON.parse(result);
        expect(parsed.calendar_events).toBeInstanceOf(Array);
        expect(parsed.calendar_events.length).toBeGreaterThanOrEqual(1);
      });

      it("should parse time ranges", async () => {
        const email = `
          Meeting: Team Sync
          Time: 2:00 PM - 3:00 PM
          Date: 2026-05-21
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Team Sync",
        });

        const parsed = JSON.parse(result);
        const event = parsed.calendar_events[0];
        expect(event).toHaveProperty("start_time");
        expect(event).toHaveProperty("end_time");
      });

      it("should handle all-day events", async () => {
        const email = `
          Event: Company Holiday
          Date: 2026-05-26
          All day event
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Company Holiday",
        });

        const parsed = JSON.parse(result);
        const event = parsed.calendar_events[0];
        expect(event).toHaveProperty("all_day");
        expect(event.all_day).toBe(true);
      });
    });

    describe("Location parsing", () => {
      it("should extract physical location from email", async () => {
        const email = `
          Meeting: Board Meeting
          Location: 123 Main St, Conference Room A
          Date: 2026-05-20 at 10:00 AM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Board Meeting",
        });

        const parsed = JSON.parse(result);
        const event = parsed.calendar_events[0];
        expect(event).toHaveProperty("location");
        expect(event.location).toContain("Conference Room A");
      });

      it("should extract virtual meeting links", async () => {
        const email = `
          Meeting: Remote Standup
          Location: Zoom
          Join: https://zoom.us/j/123456789
          Date: 2026-05-21 at 9:00 AM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Remote Standup",
        });

        const parsed = JSON.parse(result);
        const event = parsed.calendar_events[0];
        expect(event).toHaveProperty("location");
        expect(event).toHaveProperty("meeting_link");
      });
    });

    describe("Action item extraction", () => {
      it("should extract explicit action items from email", async () => {
        const email = `
          Action items:
          - Review the proposal document
          - Send feedback to the team
          - Schedule follow-up meeting
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Action items from meeting",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);
        expect(parsed.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it("should extract action items from imperative language", async () => {
        const email = `
          Please review the attached document.
          Confirm your attendance by Friday.
          Send the report to the client.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Action required",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);
        expect(parsed.tasks.length).toBeGreaterThan(0);
      });

      it("should assign priority based on language", async () => {
        const email = `
          URGENT: Please approve this immediately.
          Standard: Review when you have time.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Mixed priorities",
        });

        const parsed = JSON.parse(result);
        expect(parsed.tasks).toBeInstanceOf(Array);

        const urgentTask = parsed.tasks.find(
          (t: { priority: string }) =>
            t.priority === "high" || t.priority === "urgent"
        );
        expect(urgentTask).toBeDefined();
      });
    });

    describe("Structured data output", () => {
      it("should return calendar_events array with required fields", async () => {
        const email = `
          Meeting: Team Sync
          Date: 2026-05-21
          Time: 2:00 PM
          Location: Room 101
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Team Sync",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("calendar_events");
        expect(Array.isArray(parsed.calendar_events)).toBe(true);

        if (parsed.calendar_events.length > 0) {
          const event = parsed.calendar_events[0];
          expect(event).toHaveProperty("type");
          expect(event).toHaveProperty("title");
          expect(event).toHaveProperty("start_time");
        }
      });

      it("should return tasks array with required fields", async () => {
        const email = `
          Please review the document by Friday.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Review needed",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("tasks");
        expect(Array.isArray(parsed.tasks)).toBe(true);

        if (parsed.tasks.length > 0) {
          const task = parsed.tasks[0];
          expect(task).toHaveProperty("title");
          expect(task).toHaveProperty("due_date");
        }
      });

      it("should include confidence scores for extracted items", async () => {
        const email = `
          Meeting: Q2 Planning
          Date: 2026-05-22
          Time: 2:00 PM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Q2 Planning",
        });

        const parsed = JSON.parse(result);
        if (parsed.calendar_events.length > 0) {
          const event = parsed.calendar_events[0];
          expect(event).toHaveProperty("confidence");
          expect(typeof event.confidence).toBe("number");
          expect(event.confidence).toBeGreaterThanOrEqual(0);
          expect(event.confidence).toBeLessThanOrEqual(1);
        }
      });

      it("should include source information for extracted items", async () => {
        const email = `
          Meeting: Team Standup
          Date: 2026-05-21
          Time: 9:00 AM
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Team Standup",
        });

        const parsed = JSON.parse(result);
        if (parsed.calendar_events.length > 0) {
          const event = parsed.calendar_events[0];
          expect(event).toHaveProperty("source");
        }
      });
    });

    describe("Complex email scenarios", () => {
      it("should handle email with multiple event types", async () => {
        const email = `
          Flight Confirmation: UA456 SFO to NYC on 2026-05-20 at 10:30 AM
          
          Meeting: Client Presentation
          Date: 2026-05-21
          Time: 2:00 PM
          Location: NYC Office
          
          Action items:
          - Prepare presentation slides
          - Review client feedback
          - Schedule follow-up call by 2026-05-23
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Trip and meetings",
        });

        const parsed = JSON.parse(result);
        expect(parsed.calendar_events).toBeInstanceOf(Array);
        expect(parsed.tasks).toBeInstanceOf(Array);

        const flightEvent = parsed.calendar_events.find(
          (e: { type: string }) => e.type === "flight"
        );
        const meetingEvent = parsed.calendar_events.find(
          (e: { type: string }) => e.type === "meeting"
        );

        expect(flightEvent).toBeDefined();
        expect(meetingEvent).toBeDefined();
        expect(parsed.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it("should handle email with no implied actions", async () => {
        const email = `
          This is just a regular informational email.
          No specific actions or events are mentioned.
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "FYI",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("calendar_events");
        expect(parsed).toHaveProperty("tasks");
        expect(Array.isArray(parsed.calendar_events)).toBe(true);
        expect(Array.isArray(parsed.tasks)).toBe(true);
      });

      it("should handle malformed or incomplete data gracefully", async () => {
        const email = `
          Meeting: Incomplete
          Date: TBD
          Time: TBD
        `;

        const result = await executeGmailTool("extract_implied_actions", {
          email_content: email,
          subject: "Incomplete meeting",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("calendar_events");
        expect(parsed).toHaveProperty("tasks");
      });
    });

    describe("Error handling", () => {
      it("should return valid JSON on error", async () => {
        const result = await executeGmailTool("extract_implied_actions", {
          email_content: null,
          subject: null,
        });

        expect(() => JSON.parse(result)).not.toThrow();
      });

      it("should handle empty email content", async () => {
        const result = await executeGmailTool("extract_implied_actions", {
          email_content: "",
          subject: "",
        });

        const parsed = JSON.parse(result);
        expect(parsed).toHaveProperty("calendar_events");
        expect(parsed).toHaveProperty("tasks");
      });

      it("should handle very long email content", async () => {
        const longContent = "A".repeat(10000);
        const result = await executeGmailTool("extract_implied_actions", {
          email_content: longContent,
          subject: "Long email",
        });

        expect(() => JSON.parse(result)).not.toThrow();
      });
    });
  });
});
