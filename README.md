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
- **Strava** — OAuth connection to your Strava account, activity sync, and conversation queries over your training data
- **Voice** — send a voice note; bot transcribes it via Whisper, confirms what it heard, then actions on approval

---

## Stack

| Layer | Technology |
|---|---|
| Interface | Telegram (node-telegram-bot-api) |
| AI | Claude (claude-sonnet-4-20250514 default, configurable via `ANTHROPIC_MODEL`) |
| Voice transcription | OpenAI Whisper API (whisper-1) |
| Voice synthesis | ElevenLabs TTS (eleven_multilingual_v2) |
| Calendar | Google Calendar MCP |
| Email | Gmail MCP |
| Tasks | Todoist API v1 |
| Fitness | Strava API v3 (OAuth 2.0) |
| Database | PostgreSQL 16 (Railway) via pg — raw parameterised SQL |
| Scheduler | node-cron |
| Runtime | Node.js 20 LTS, TypeScript strict mode |
| Package manager | pnpm workspaces |
| Testing | Vitest |
| Infrastructure | Railway (bot service + orchestrator service + PostgreSQL) |

---

## Repository structure

```
packages/
  bot/          — Telegram bot service (message handler, OAuth callback, inline keyboards)
  orchestrator/ — Agent loop, tool integrations, scheduler, context management
  shared/       — DB pool, logger, env config, migration runner, shared types

db/
  migrations/   — SQL migration files (applied at startup by runMigrations())

docs/
  prd.md        — Product requirements (5 phases, all user stories)
  architecture.md — Technical architecture, DB schemas, tool definitions

orchestrator/
  run-phase.sh  — Legacy shell runner (deprecated; use npx tsx orchestrator/src/index.ts)
  approve.sh    — Human approval gate helper

.opencode/
  agents/       — System prompts for all pipeline agents
  rules/        — Always-active security and TypeScript rules
  config.json   — OpenCode agent configuration

pipeline/       — Pipeline working files and phase artifacts (tracked in git)
```

---

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation — bot, calendar read/write, conversation context | ✅ Complete |
| 2 | Tasks and Email | ✅ Complete |
| 3 | People, Life Events, and Nudges | ✅ Complete |
| 4 | Strava Integration | 🔄 In progress (6/11 tasks done) |
| 5 | Voice Message Input | Pending |
| 6 | Personality and Voice Output | Pending |
| 7 | Morning Digest and Day Planning | Pending |

---

## Build pipeline

Life OS is built by an automated agent pipeline from [jamie-agent-pipeline](https://github.com/jamie-smith-uk/jamie-agent-pipeline). Each phase is planned, implemented, security-reviewed, tested, and validated before moving to the next.

```
AG-01 Architect   → task manifest + acceptance criteria
AG-02 Reviewer    → human approval gate
AG-09 Splitter    → breaks complex tasks into sub-tasks
AG-03 Tester      → failing tests (RED)
AG-04 Developer   → implementation (GREEN)
AG-05 Migration   → database migrations
AG-06 Refactor    → code quality pass
AG-07 Security    → security audit (hard gate)
AG-08 Validator   → phase sign-off, git tag
```

To run a phase:

```bash
npx tsx orchestrator/src/index.ts --phase 4
```

The pipeline pauses at the human gate. Approve via:

```bash
./orchestrator/approve.sh --phase 4
```

---

## Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 9+
- PostgreSQL 16 (or a Railway PostgreSQL instance)
- A Telegram bot token (from @BotFather)
- An Anthropic API key
- A Todoist API token
- A Strava app (for OAuth)

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
TELEGRAM_BOT_TOKEN           — from @BotFather
TELEGRAM_ALLOWED_CHAT_ID     — your personal Telegram chat ID
ANTHROPIC_API_KEY            — from console.anthropic.com
ANTHROPIC_MODEL              — optional, defaults to claude-sonnet-4-20250514
TODOIST_API_TOKEN            — from todoist.com/prefs/integrations
DATABASE_URL                 — PostgreSQL connection string
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_HOST
POSTGRES_PORT
DIGEST_CRON                  — cron expression for morning digest (e.g. '0 7 * * *')
NUDGE_EVAL_CRON              — cron for nudge evaluation (e.g. '*/15 * * * *')
TIMEZONE                     — e.g. Europe/London
STRAVA_CLIENT_ID             — from strava.com/settings/api
STRAVA_CLIENT_SECRET         — from strava.com/settings/api
STRAVA_REDIRECT_URI          — OAuth callback URL for your bot service
OPENAI_API_KEY               — from platform.openai.com (used for Whisper voice transcription)
ELEVENLABS_API_KEY           — from elevenlabs.io (used for persona voice synthesis)
```

### Run migrations

Migrations run automatically at orchestrator startup. To run manually:

```bash
pnpm --filter @lifeos/shared migrate
```

Migrations live in `db/migrations/` and are tracked in the `migrations` table — each file is applied exactly once.

### Develop

```bash
pnpm dev
```

---

## Security

- All secrets in environment variables — never logged, never passed to the AI as values
- Telegram messages from any chat ID other than `TELEGRAM_ALLOWED_CHAT_ID` are silently dropped
- Parameterised SQL queries only — no string concatenation
- Every pipeline task is security-audited by AG-07 before merging
- See `.opencode/agents/security-rules.md` for the full ruleset

---

## Pipeline source

The agent pipeline is maintained separately at [github.com/jamie-smith-uk/jamie-agent-pipeline](https://github.com/jamie-smith-uk/jamie-agent-pipeline).

To update pipeline scripts and agent prompts in this repo:

```bash
cd ~/Documents/jamie-agent-pipeline
./orchestrator/sync-pipeline.sh --target ~/Documents/jamie-lifeos
```
