# Life OS

A personal AI assistant that acts as the intelligence layer across daily life. One place to ask "what do I need to know and do today?" and get a complete, contextualised, actionable answer.

Built on Telegram, Claude, and PostgreSQL. Deployed on Railway.

---

## What it does

- **Calendar** — ask what's on today, create/update/delete events from natural language, check free/busy
- **Tasks** — view, create, complete, and reschedule Todoist tasks by conversation
- **Email** — classified inbox digest, thread summaries, implied actions extracted automatically
- **People** — a personal knowledge graph of relationships, interactions, and life events
- **Nudges** — proactive reminders for birthdays, anniversaries, and lapsed contacts
- **Morning digest** — daily briefing with calendar, tasks, life events, and a suggested day shape
- **Day planning** — time-blocked plan, "what should I do next?", multi-intent snippet parsing
- **Automations** — create named recurring automations with natural language schedules

---

## Stack

| Layer | Technology |
|---|---|
| Interface | Telegram (node-telegram-bot-api) |
| AI | Claude claude-sonnet-4-20250514 via Anthropic API |
| Calendar | Google Calendar MCP |
| Email | Gmail MCP |
| Tasks | Todoist REST API v2 |
| Database | PostgreSQL 16 (Railway) via pg — raw parameterised SQL |
| Scheduler | node-cron |
| Runtime | Node.js 20 LTS, TypeScript strict mode |
| Package manager | pnpm workspaces |
| Testing | Vitest |
| Infrastructure | Railway (bot + orchestrator + PostgreSQL) |

---

## Repository structure

```
packages/
  bot/          — Telegram bot service (message handler, callbacks, keyboards)
  orchestrator/ — Agent loop, scheduler, tool integrations
  shared/       — DB pool, logger, env config, shared types

docs/
  prd.md        — Product requirements (5 phases, 9 epics, all user stories)
  architecture.md — Technical architecture, DB schemas, tool definitions

orchestrator/
  run-phase.sh     — Pipeline runner (invoke to build a phase)
  telegram-gate.sh — Human approval gate via Telegram polling

.opencode/
  agents/       — System prompts for all 8 pipeline agents
  rules/        — Always-active security and TypeScript rules
  config.json   — OpenCode agent configuration

migrations/     — SQL migration files
pipeline/       — Runtime pipeline working files (gitignored)
```

---

## Build pipeline

Life OS is built by an automated agent pipeline. Each phase is planned, implemented, security-reviewed, tested, and validated before moving to the next.

```
AG-01 Architect   → task manifest
AG-02 Reviewer    → human approval gate (via Telegram)
AG-03 Tester      → test scaffolding and strategy
AG-04 Developer   → implementation
AG-05 Migration   → database migrations
AG-06 Refactor    → code quality pass
AG-07 Security    → security audit (hard gate)
AG-08 Validator   → phase sign-off, git tag, Telegram notification
```

To run a phase:

```bash
./orchestrator/run-phase.sh --phase 1
```

The pipeline pauses at the human gate and sends you a Telegram message summarising the task manifest. Reply `approve`, `changes: [what to change]`, or `stop`.

---

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation — bot, calendar read/write, conversation context | In progress |
| 2 | Tasks and Email | Pending |
| 3 | People, Life Events, and Nudges | Pending |
| 4 | Morning Digest and Day Planning | Pending |
| 5 | Automations | Pending |

---

## Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 9+
- PostgreSQL 16 (or a Railway PostgreSQL instance)
- OpenCode CLI (`npm install -g opencode`)
- A Telegram bot token (from @BotFather)
- An Anthropic API key
- A Todoist API token

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

Required variables:

```
TELEGRAM_BOT_TOKEN         — from @BotFather
TELEGRAM_ALLOWED_CHAT_ID   — your personal chat ID
ANTHROPIC_API_KEY          — from console.anthropic.com
TODOIST_API_TOKEN          — from todoist.com/prefs/integrations
DATABASE_URL               — PostgreSQL connection string
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_HOST
POSTGRES_PORT
DIGEST_CRON                — cron expression for morning digest (e.g. '0 7 * * *')
NUDGE_EVAL_CRON            — cron for nudge evaluation (e.g. '*/15 * * * *')
TIMEZONE                   — e.g. Europe/London
```

### Run migrations

```bash
pnpm --filter @lifeos/shared migrate
```

### Develop

```bash
pnpm dev
```

---

## Security

- All secrets in environment variables — never logged, never passed to the AI as values
- Telegram messages from any chat ID other than `TELEGRAM_ALLOWED_CHAT_ID` are silently dropped
- Parameterised SQL queries only — no string concatenation
- Every pipeline task is security-audited by AG-07 before tests run
- See `.opencode/agents/security-rules.md` for the full ruleset

---

## Pipeline source

The agent pipeline is maintained separately at `github.com/jamie-smith-uk/jamie-agent-pipeline`.

To update the pipeline scripts and agent prompts in this repo:

```bash
cd ~/Documents/jamie-agent-pipeline && ./orchestrator/sync-pipeline.sh --target ~/Documents/jamie-lifeos
```
