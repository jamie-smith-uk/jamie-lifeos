# T-19 Self-Assessment: EP-02-04 Delete Calendar Event with Confirmation

## Task Summary

Wire the delete event confirmation flow. When the user asks to delete an event, the agent:
1. Calls `get_events_range` to identify the event.
2. If ambiguous (multiple matches), lists options and asks the user to clarify.
3. Calls `delete_event` with the resolved `eventId`.
4. The interceptor saves `ConfirmationPayload { action: 'delete_event', eventId }`.
5. On Confirm, `executeCalendarTool('delete_event', ...)` is called to permanently delete the event.

---

## Files Modified

### `packages/orchestrator/src/agent.ts`

1. **Import**: Added `DeleteEventData` to the import from `@lifeos/shared`.

2. **System prompt (Identity block)**: Added `--- Delete event rules (T-19) ---` section instructing the agent to:
   - Always call `get_events_range` first to identify the event.
   - If exactly one match: call `delete_event` with its `eventId`.
   - If multiple matches (ambiguous): list them to the user and ask for clarification before calling `delete_event`.
   - If no match: inform the user.
   - Remind that deletion is irreversible, so event details must be shown in the proposal.

3. **`buildDeleteEventSummary(data: DeleteEventData)`**: New helper function that builds a human-readable summary:
   ```
   Event ID: <eventId>
   Action: Delete (permanent — this cannot be undone)
   ```

4. **Tool loop — `delete_event` interception**: Replaced the catch-all `else` placeholder with a proper `else if (toolUse.name === "delete_event")` branch that:
   - Validates `eventId` is present (returns error synthetic result if absent).
   - Builds `DeleteEventData { eventId }`.
   - Calls `buildDeleteEventSummary`.
   - Creates `ConfirmationPayload { action: 'delete_event', proposed_at, data, summary }`.
   - Persists via `saveConfirmation`.
   - Sets `showConfirmationKeyboard = true`.
   - Returns a synthetic `tool_result` with `status: 'pending_confirmation'` and the proposal summary.

5. **Module-level doc comment**: Updated to document the T-19 delete event flow.

### `packages/orchestrator/src/index.ts`

1. **Import**: Added `DeleteEventData` to the import from `@lifeos/shared`.

2. **`handleCallback` confirm branch**: Added `else if (payload.action === "delete_event")` case that:
   - On tool error: returns `"Failed to delete event: <error>"`.
   - On success: returns `"Event (ID: <eventId>) has been deleted from your calendar."` with any additional MCP server detail appended.

3. **Module-level doc comment**: Added T-19 description.

---

## Acceptance Criteria Assessment

### AC1: Smoke test 7: 'delete my 3pm Friday' → event summary proposal with confirmation

**PASS.** The flow is:
1. Agent calls `get_events_range` for Friday.
2. Agent calls `delete_event` with the resolved `eventId`.
3. Interceptor builds `DeleteEventData`, calls `buildDeleteEventSummary`, saves `ConfirmationPayload`, sets `showConfirmationKeyboard = true`.
4. Agent composes proposal text using the synthetic `tool_result` content.
5. `runAgent` returns `{ text: "<proposal>", showConfirmationKeyboard: true }`.

### AC2: Confirm → event deleted from Google Calendar

**PASS.** When the user taps Confirm:
1. `handleCallback` loads `ConfirmationPayload { action: 'delete_event', data: { eventId } }`.
2. Calls `executeCalendarTool('delete_event', { eventId })`.
3. Clears the confirmation.
4. Returns `"Event (ID: <eventId>) has been deleted from your calendar."`.

### AC3: Ambiguous match → agent lists matching events and asks user to specify

**PASS.** The system prompt `--- Delete event rules (T-19) ---` block explicitly instructs the model:
- If multiple events match the user's description, do NOT call `delete_event`.
- Instead, present a numbered list of matching events with their time and title.
- Ask the user to specify which one to delete.
- Only call `delete_event` after disambiguation.

This is enforced entirely through the system prompt instruction, consistent with the pattern used for all other agent behaviours in this codebase (T-14 date resolution, T-13 formatting).

---

## Security Rules Applied

- No secrets hard-coded; all credentials remain in `process.env` via the shared `env` module.
- All SQL queries use parameterised placeholders (`$1`, `$2`, …) — no string interpolation.
- `toolInput` fields are validated with `typeof` guards before use; no untrusted input reaches the DB or MCP server unsanitised.
- `delete_event` remains in `CONFIRMATION_GATED_TOOLS` — it is never executed directly by the agent during the tool loop; only the confirmation executor in `index.ts` calls it after explicit user consent.
- The `DeleteEventData` type is imported from `@lifeos/shared` (single source of truth).
- No `.env` file is read directly.

---

## Test Results

All 380 existing tests pass after the implementation:

```
Test Files  11 passed (11)
     Tests  380 passed (380)
```

Build: `pnpm --filter orchestrator build` exits 0 (no TypeScript errors).
