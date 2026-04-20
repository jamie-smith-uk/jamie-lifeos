# Life OS — Technical Architecture
# v1.0 | April 2026

---

## System overview

Life OS is structured in four layers:

- **Interface** — Telegram. All user interaction is via a single Telegram bot. No web UI.
- **Agent** — Claude (claude-sonnet-4-20250514) via the Anthropic API. All interpretation, reasoning, and response generation happens here.
- **Integration** — Google Calendar MCP, Gmail MCP, and Todoist REST API v2. The agent calls these as tools.
- **Data** — PostgreSQL on Railway. All persistent state: conversation context, people graph, nudges, automations.

---

## Component map

| Component | Technology | Responsibility |
|---|---|---|
| Bot service | Node.js / node-telegram-bot-api | Receives messages and handles inline keyboard callbacks |
| Orchestrator service | Node.js / Anthropic API | Interprets intent, runs agent, executes scheduler |
| Google Calendar MCP | gcal.mcp.claude.com | Read and write calendar events |
| Gmail MCP | gmail.mcp.claude.com | Read inbox and extract implied actions |
| Todoist integration | Todoist REST API v2 | Full task CRUD |
| PostgreSQL | Railway managed | All persistent state |
| Scheduler | node-cron inside orchestrator | Digest, nudge, and automation execution |

---

## Repository structure

    packages/
      bot/
        src/
          index.ts          — bot entrypoint, message handler, callback handler
          middleware.ts     — chat_id whitelist enforcement
          keyboard.ts       — inline keyboard builders
      orchestrator/
        src/
          index.ts          — orchestrator entrypoint
          agent.ts          — Anthropic API client and tool loop
          scheduler.ts      — node-cron jobs: digest, nudge evaluator, automation executor
          digest.ts         — morning digest builder
          tools/
            calendar.ts     — Calendar MCP tool wrappers
            gmail.ts        — Gmail MCP tool wrappers
            todoist.ts      — Todoist REST API client
            people.ts       — people graph queries
            nudges.ts       — nudge creation and dismissal
            automations.ts  — automation CRUD and execution
      shared/
        src/
          db.ts             — pg Pool initialisation
          types.ts          — shared TypeScript types
          logger.ts         — structured logger (pino)
          env.ts            — validated environment config

---

## Database schema

### migrations

    CREATE TABLE migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### people

    CREATE TABLE people (
        id                  SERIAL PRIMARY KEY,
        name                TEXT        NOT NULL,
        relationship_type   TEXT        NOT NULL,
        how_known           TEXT,
        notes               TEXT,
        last_interaction_at TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### life_events

    CREATE TABLE life_events (
        id           SERIAL PRIMARY KEY,
        person_id    INTEGER     NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        event_type   TEXT        NOT NULL,
        event_date   DATE        NOT NULL,
        is_recurring BOOLEAN     NOT NULL DEFAULT false,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### interactions

    CREATE TABLE interactions (
        id           SERIAL PRIMARY KEY,
        person_id    INTEGER     NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        notes        TEXT,
        interacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

### nudges

    CREATE TABLE nudges (
        id            SERIAL PRIMARY KEY,
        person_id     INTEGER     REFERENCES people(id) ON DELETE SET NULL,
        life_event_id INTEGER     REFERENCES life_events(id) ON DELETE SET NULL,
        message       TEXT        NOT NULL,
        trigger_at    TIMESTAMPTZ NOT NULL,
        status        TEXT        NOT NULL DEFAULT 'pending',
        sent_at       TIMESTAMPTZ,
        dismissed_at  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT nudges_status_check CHECK (status IN ('pending', 'sent', 'dismissed'))
    );

### conversation_context

    CREATE TABLE conversation_context (
        id         SERIAL PRIMARY KEY,
        chat_id    BIGINT      NOT NULL,
        role       TEXT        NOT NULL,
        content    TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT conversation_context_role_check CHECK (role IN ('user', 'assistant'))
    );

    CREATE INDEX idx_conversation_context_chat_id_created_at
        ON conversation_context (chat_id, created_at DESC);

### automations

    CREATE TABLE automations (
        id               SERIAL PRIMARY KEY,
        name             TEXT        NOT NULL,
        description      TEXT,
        prompt           TEXT        NOT NULL,
        cron_expression  TEXT        NOT NULL,
        schedule_english TEXT        NOT NULL,
        is_active        BOOLEAN     NOT NULL DEFAULT true,
        last_run_at      TIMESTAMPTZ,
        next_run_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

---

## Agent system prompt structure

Each request to the Anthropic API is assembled from five blocks in this order:

1. **Identity** — who the agent is, what it does, its tone, and its hard constraints (security rules, confirmation pattern, never reveal env vars).
2. **Live context** — current datetime, timezone, and a brief snapshot of today's calendar if relevant to the message.
3. **People index** — names and relationship types of all known people, so the agent recognises references without a tool call.
4. **Pending nudges** — any nudges that are due or overdue, so the agent can surface them if relevant.
5. **Active automations** — names and schedules of all active automations, so the agent can answer questions about them without a DB query.

The conversation history (last 20 messages) is appended as the `messages` array in the API request, separate from the system prompt.

---

## Tool definitions

### Calendar tools (Google Calendar MCP)
- `get_todays_events` — returns all events for today in chronological order
- `get_events_range` — returns events between two dates; accepts natural language resolved to ISO 8601
- `create_event` — creates an event; requires title, start, end; optional: location, description, attendees
- `update_event` — updates an existing event by event ID; accepts partial fields
- `delete_event` — deletes an event by event ID
- `check_free_busy` — returns free/busy status for a time range with adjacent event context

### Email tools (Gmail MCP)
- `get_inbox_summary` — returns up to 10 recent unread emails with sender, subject, and one-line summary
- `get_thread` — returns full thread by thread ID with plain-text content
- `extract_implied_actions` — agent-side reasoning; no MCP call — uses email content already in context

### Task tools (Todoist REST API v2)
- `get_tasks` — fetches tasks by filter string (e.g. "today", "overdue")
- `create_task` — creates a task with content, due date, and priority
- `complete_task` — closes a task by ID
- `delete_task` — permanently deletes a task by ID
- `update_task` — updates due date or priority by task ID

### People tools (internal DB)
- `create_person` — inserts a new people record
- `get_person` — returns full record by name (fuzzy match) including life events and last interaction
- `update_person` — merges new notes into existing record
- `log_interaction` — inserts an interactions record and updates last_interaction_at
- `get_lapsed_contacts` — returns people sorted by last_interaction_at ascending, filtered by threshold

### Life event tools (internal DB)
- `create_life_event` — inserts a life_events record; sets is_recurring based on event_type
- `get_upcoming_life_events` — returns life events within a given date window, recurring events adjusted to current year

### Nudge tools (internal DB)
- `create_nudge` — inserts a nudges record with trigger_at and message
- `dismiss_nudge` — sets status to dismissed by nudge ID

### Automation tools (internal DB)
- `create_automation` — validates cron expression, inserts automations record, computes next_run_at
- `list_automations` — returns all automations with name, schedule_english, is_active
- `update_automation` — updates prompt or cron_expression, recomputes next_run_at
- `pause_automation` — sets is_active false
- `resume_automation` — sets is_active true, recomputes next_run_at
- `delete_automation` — permanently removes record
- `run_automation_now` — executes stored prompt immediately without affecting next_run_at

---

## Confirmation pattern

Any action that creates, modifies, or deletes external state requires a two-step confirmation:

1. **Propose** — the agent presents a structured summary of what it intends to do and writes a pending record to `active_confirmations` in the DB (keyed by chat_id).
2. **Confirm** — the bot renders an inline keyboard with Confirm / Edit / Cancel. On Confirm, the orchestrator reads the pending record and executes the action. On Cancel, the record is deleted. On Edit, the agent prompts for changes and proposes again.

The pending action is stored as a JSONB object in the active_confirmation column of the conversation_context table — it is not a separate table.

Rules:
- Only one active confirmation per chat_id at a time. A new proposal replaces any existing pending confirmation.
- Confirmations expire after 10 minutes. Expired confirmations are dropped silently.
- The agent never executes a write action without a confirmation step, even if the user says "just do it".

---

## Non-functional requirements

| Requirement | Target |
|---|---|
| Response latency | P95 < 8 seconds from message receipt to first Telegram reply |
| Digest delivery | Within 60 seconds of DIGEST_CRON fire time |
| Nudge latency | Within 15 minutes of trigger_at |
| Uptime | 99.5% monthly (Railway SLA) |
| Single user | All rate limits, DB queries, and context windows sized for one user |
| Secret handling | All secrets in environment variables; never logged, never passed to the AI as values |
| SQL safety | Parameterised queries only; no string concatenation in any query |

---

## Infrastructure

Life OS runs on Railway with three services:

- **bot** — always-on Node.js process. Handles incoming Telegram webhooks. Forwards messages to the orchestrator over an internal Railway private network call.
- **orchestrator** — always-on Node.js process. Runs the agent loop, scheduler jobs, and all tool calls. The only service with outbound access to Anthropic API, MCP servers, and Todoist.
- **PostgreSQL** — Railway managed Postgres 16. Accessible only from within the Railway private network.

Environment variables are set per-service in Railway. No `.env` files are deployed. The `.env.example` in the repo documents all required variables.

Deployments are triggered by pushes to `main`. Each phase completion is tagged `phase-N-complete` by the Validator agent.
