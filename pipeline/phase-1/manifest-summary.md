# Phase 1 Task Manifest — Summary
**Produced by:** AG-01 Architect
**Date:** 2026-04-20
**Epics in scope:** EP-01 (Foundation), EP-02 (Calendar Write)

---

## What Phase 1 delivers

A working Telegram bot backed by Claude that can hold a conversation, persist context across messages, read and write Google Calendar, and enforce user-level security — all running on Railway with a PostgreSQL backend.

---

## Task overview

| ID | Title | Epic | Depends on |
|----|-------|------|------------|
| T-01 | Repository and monorepo scaffold | EP-00 | — |
| T-02 | Shared: db, logger, env, types | EP-00 | T-01 |
| T-03 | Database migrations runner | EP-00 | T-02 |
| T-04 | conversation_context schema migration | EP-00 | T-03 |
| T-05 | Bot service: entrypoint and message handler | EP-01 | T-02 |
| T-06 | Bot service: chat_id whitelist middleware | EP-01 | T-05 |
| T-07 | Bot service: inline keyboard builder | EP-01 | T-05 |
| T-08 | Orchestrator service: entrypoint and HTTP server | EP-01 | T-03, T-02 |
| T-09 | Orchestrator: conversation context persistence | EP-01 | T-04, T-08 |
| T-10 | Orchestrator: agent core — Anthropic API client and tool loop | EP-01 | T-09 |
| T-11 | Bot: typing indicator | EP-01 | T-08, T-10 |
| T-12 | Calendar tool wrappers: read operations | EP-01 | T-10 |
| T-13 | EP-01-03: 'What have I got today?' intent | EP-01 | T-12 |
| T-14 | EP-01-04: Events on a specific date or range | EP-01 | T-13 |
| T-15 | Calendar tool wrappers: write operations | EP-02 | T-12 |
| T-16 | Confirmation pattern: active_confirmation storage | EP-02 | T-09, T-15 |
| T-17 | EP-02-01/02: Create calendar event with confirmation | EP-02 | T-16, T-07 |
| T-18 | EP-02-03: Update calendar event with confirmation | EP-02 | T-17 |
| T-19 | EP-02-04: Delete calendar event with confirmation | EP-02 | T-17 |
| T-20 | EP-02-05: Free/busy check | EP-02 | T-15 |
| T-21 | Vitest test suite scaffold and unit tests | EP-00 | T-06, T-07, T-09, T-16, T-02, T-03 |
| T-22 | Railway service configuration and deployment | EP-00 | T-08, T-05 |

**Total tasks: 22**

---

## Dependency graph (critical path)

```
T-01 → T-02 → T-03 → T-04 → T-09 → T-10 → T-12 → T-13 → T-14
                                              ↓
                             T-15 → T-16 → T-17 → T-18
                                              ↓     → T-19
                                    T-20 ←───┘
         T-02 → T-05 → T-06
                      → T-07 → T-17
         T-03 → T-08 → T-09
                      → T-11
```

The critical path runs through the shared foundation (T-01 → T-02 → T-03 → T-04), then the orchestrator and agent core (T-08 → T-09 → T-10), then calendar read (T-12 → T-13), then calendar write and confirmations (T-15 → T-16 → T-17).

---

## Parallel tracks available after T-01/T-02

Once T-01 and T-02 are complete, three tracks can proceed in parallel:

- **Bot service track** — T-05, T-06, T-07
- **Shared DB track** — T-03, T-04 (unblocks orchestrator)
- **Orchestrator track** — T-08 (can start alongside T-03 once T-02 is done)

---

## Key architectural decisions captured

### Confirmation pattern
All write operations (create, update, delete calendar events) require a two-step Confirm/Edit/Cancel flow. The pending action is stored as a JSONB payload in the `active_confirmation` column of `conversation_context`, keyed by `chat_id`. Confirmations expire after 10 minutes. The agent never executes write operations directly — the orchestrator's callback handler executes them after confirmation.

### Context window
Conversation history is a rolling 20-message window stored in `conversation_context`. Loaded oldest-first for the Anthropic API `messages` array. On every save, rows beyond 20 are trimmed.

### Security
The chat_id whitelist check is enforced in `middleware.ts` before any message reaches the orchestrator. Unauthorised messages are silently dropped with a WARN log. No reply is ever sent to the unauthorised sender.

### System prompt structure
Five blocks in fixed order: Identity → Live context → People index → Pending nudges → Active automations. In Phase 1, blocks 3–5 are empty placeholders; they will be populated in later phases.

### SQL safety
All database queries use parameterised pg queries only. No string interpolation anywhere in query construction.

---

## Smoke tests mapped to tasks

| Smoke test | Scenario | Covered by |
|------------|----------|------------|
| ST-01 | 'hello' → Claude responds < 8s | T-05, T-10, T-11 |
| ST-02 | Wrong chat_id → no response | T-06 |
| ST-03 | 'what have I got today?' → event list | T-13 |
| ST-04 | 'add meeting with Tom 3pm Friday' → proposal + buttons | T-17 |
| ST-05 | Confirm → event created in Google Calendar | T-17 |
| ST-06 | 'move 3pm Friday to 4pm' → before/after proposal | T-18 |
| ST-07 | 'delete 3pm Friday' → deletion proposal | T-19 |
| ST-08 | 'am I free Thursday afternoon?' → free/busy | T-20 |

---

## Files this phase creates

```
pnpm-workspace.yaml
package.json
tsconfig.json
.env.example
railway.json
db/migrations/0001_init.sql
packages/
  shared/src/
    db.ts
    logger.ts
    env.ts
    types.ts
    migrate.ts
  bot/src/
    index.ts
    middleware.ts
    middleware.test.ts
    keyboard.ts
    keyboard.test.ts
    Dockerfile
  orchestrator/src/
    index.ts
    agent.ts
    agent.test.ts
    tools/
      calendar.ts
    Dockerfile
vitest.config.ts
```

---

## Phase 1 exit criteria (from PRD)

- [ ] User can message the bot and receive a response from Claude within 8 seconds
- [ ] Bot silently drops messages from any chat_id not matching TELEGRAM_ALLOWED_CHAT_ID
- [ ] User can ask "what have I got today?" and receive a formatted list of calendar events
- [ ] User can ask about events on a specific date or range
- [ ] Conversation context persists across messages (rolling 20-message window)
- [ ] Bot sends typing indicator while agent is processing
- [ ] User can create a calendar event from natural language with confirmation
- [ ] User can update an existing calendar event with confirmation
- [ ] User can delete a calendar event with confirmation
- [ ] User can ask if they are free at a given time

**Phase 2 must not start until the Validator agent has written a validation-report.md containing PASS.**
