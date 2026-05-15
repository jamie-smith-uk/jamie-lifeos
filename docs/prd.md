# Life OS — Product Requirements Document
# v1.0 | April 2026

## Document purpose
This PRD defines the product requirements for Life OS v1 — a personal AI agent that acts as the intelligence layer across a single user's daily life. It is written for implementation by coding agents.

## North star
One place to ask "what do I need to know and do today?" and get a complete, contextualised, actionable answer.

## Technical stack
- Runtime: Node.js 20 LTS
- Language: TypeScript (strict mode)
- Telegram library: node-telegram-bot-api
- AI model: claude-sonnet-4-20250514 via Anthropic API
- Calendar integration: Google Calendar MCP
- Email integration: Gmail MCP
- Task integration: Todoist REST API v2
- Voice transcription: OpenAI Whisper API (whisper-1)
- Database: PostgreSQL 16 via pg (node-postgres), raw parameterised SQL only
- Scheduler: node-cron
- Infrastructure: Railway (bot service + orchestrator service + PostgreSQL)
- Package manager: pnpm
- Testing: Vitest

## Build sequence

Phases must be completed in order. Do not start a phase until the previous phase validation-report.md contains PASS.

---

## Phase 1 — Foundation

### Exit criteria
- User can message the bot and receive a response from Claude within 8 seconds
- Bot silently drops messages from any chat_id not matching TELEGRAM_ALLOWED_CHAT_ID
- User can ask "what have I got today?" and receive a formatted list of calendar events
- User can ask about events on a specific date or range
- Conversation context persists across messages (rolling 20-message window)
- Bot sends typing indicator while agent is processing
- User can create a calendar event from natural language with confirmation
- User can update an existing calendar event with confirmation
- User can delete a calendar event with confirmation
- User can ask if they are free at a given time

### Smoke tests
1. Send "hello" to the bot — Claude responds within 8 seconds
2. Send a message from a different chat_id — bot does not respond
3. Send "what have I got today?" — calendar events returned
4. Send "add a meeting with Tom at 3pm Friday" — agent proposes event with full details, Confirm/Edit/Cancel buttons appear
5. Tap Confirm — event created in Google Calendar
6. Send "move my 3pm Friday to 4pm" — agent proposes update, user confirms
7. Send "delete my 3pm Friday" — agent proposes deletion, user confirms
8. Send "am I free Thursday afternoon?" — agent checks calendar and responds

### Epics in scope
EP-01, EP-02

---

## Phase 2 — Tasks and Email

### Exit criteria
- User can ask "what tasks do I have today?" and receive a formatted list
- User can create a task from natural language with confirmation
- User can complete a task by name with confirmation
- User can delete a task with confirmation
- User can update a task due date or priority with confirmation
- User can see all overdue tasks
- User can ask "what needs my attention in my inbox?" and receive a classified email summary
- User can ask about a specific email or thread
- Agent spots implied calendar events or tasks in emails and proposes adding them
- Emails from known people are linked to the people graph

### Smoke tests
1. Send "what tasks do I have today?" — Todoist tasks returned grouped by priority
2. Send "add a task to call the dentist Thursday" — task proposed with confirmation
3. Confirm — task created in Todoist
4. Send "complete call dentist" — task marked done with confirmation
5. Send "what needs my attention in my inbox?" — email digest returned classified by type
6. Send "what did Sarah say about the invoice?" — specific thread summarised

### Epics in scope
EP-03, EP-04

---

## Phase 3 — People, Life Events, and Nudges

### Exit criteria
- User can add a person to the people graph by describing them
- Agent automatically recognises people mentioned in snippets
- User can ask what the agent knows about a person
- User can log an interaction with a person
- User can update information about a person
- User can ask who they have not spoken to recently
- User can record a life event for a person
- User can see upcoming life events
- Nudge scheduler fires every 15 minutes and sends nudges when due
- Agent drafts a personalised message for a birthday or anniversary
- Agent suggests gift ideas using people context

### Smoke tests
1. Send "Tom is a friend I met at university, he works in finance" — person created
2. Send "what do you know about Tom?" — full record returned
3. Send "Tom's birthday is 15 March" — life event created
4. Send "draft a birthday message for Tom" — personalised message generated
5. Send "who haven't I spoken to recently?" — list returned sorted by last interaction
6. Wait for nudge scheduler — confirm nudge fires within 15 minutes of trigger_at

### Epics in scope
EP-05, EP-06, EP-07 (partial — nudge scheduler only)

---

## Phase 4 — Strava Integration

### Exit criteria
- User can connect their Strava account by following an OAuth link from the bot
- Activities from the last 90 days are synced on first connection
- New activities sync automatically every 30 minutes via a background job
- Token refresh happens automatically before any Strava API call
- User can ask "what did I do this week?" and receive a formatted activity summary
- User can ask for distance or time totals by sport and date range
- User can ask about training trends and receive a plain-language pattern analysis
- Activity data (last 7 days summary) is included in the agent system prompt so it factors into day planning answers

### Smoke tests
1. Send "connect Strava" — OAuth URL returned
2. Complete OAuth flow — confirmation sent with athlete name, last 90 days of activities synced
3. Send "what did I do this week?" — activities listed with sport, name, distance, duration, date
4. Send "how far did I run this month?" — distance total returned
5. Send "how's my training consistency?" — plain-language trend analysis returned
6. Log a run in Strava — appears in bot query within 30 minutes

### Epics in scope
EP-10

---

## Phase 5 — Morning Digest and Day Planning

### Exit criteria
- Morning digest fires automatically at configured time every day
- Digest includes: today's calendar events, priority tasks, upcoming life events, suggested day shape
- User can ask "plan my day" and receive a time-blocked suggestion
- User can ask "what should I do next?" and receive a single clear recommendation
- User can paste a multi-intent snippet and all implied actions are extracted and proposed
- Smart nudges fire with a maximum of 3 per hour
- Nudge messages include a Dismiss button
- Dismissed nudges do not re-fire

### Smoke tests
1. Wait for 7am — digest arrives in Telegram
2. Verify digest has all four sections
3. Send "plan my day" — time-blocked plan returned respecting calendar
4. Send "what should I do next?" — single recommendation returned
5. Paste "Dinner with Jess Friday 8pm at Dishoom" — calendar event proposed and Jess linked
6. Receive a nudge — tap Dismiss — confirm it does not re-fire

### Epics in scope
EP-07 (full), EP-08

---

## Phase 6 — Voice Message Input

### Exit criteria
- User can send a Telegram voice message and receive a transcription confirmation within 3 seconds
- Bot replies: "Here's what I heard: [paraphrase]. Shall I do that?" with Yes / No inline keyboard
- Tapping Yes executes the intent through the existing agent loop as if the user had typed the text
- Tapping No cancels and replies "OK, cancelled."
- Pending voice intents expire after 5 minutes; tapping Yes/No on an expired intent replies "That request expired — please send your voice message again."
- Transcription is added to conversation context as a `[voice]`-prefixed user message so history remains coherent
- Voice messages from any chat_id not matching TELEGRAM_ALLOWED_CHAT_ID are silently dropped
- Transcription errors (Whisper API failure) are caught and a friendly error is sent to the user

### Smoke tests
1. Send a voice note saying "add a task to book the dentist for next week" — bot replies with transcription confirmation within 3 seconds
2. Tap Yes — task creation flow begins as if text was typed
3. Send a voice note saying "what have I got today?" — bot replies with transcription confirmation
4. Tap Yes — calendar events returned
5. Tap No on a confirmation — bot replies "OK, cancelled." and no action is taken
6. Send a voice note then wait 6 minutes — tap Yes — bot replies with expiry message
7. Send a voice note from an unauthorised chat_id — bot does not respond

### Epics in scope
EP-11

---

## User stories

### EP-01 — Foundation

- EP-01-01: Bot receives message and responds via Claude within 8 seconds. No tools needed yet.
- EP-01-02: Messages from any chat_id not matching TELEGRAM_ALLOWED_CHAT_ID are silently dropped and logged at WARN level.
- EP-01-03: User asks "what have I got today?" — agent calls get_todays_events via Calendar MCP and returns formatted list. Handle empty calendar gracefully.
- EP-01-04: User asks about events on a specific date or range — agent calls get_events_range. Handle natural language dates: "next Tuesday", "this week".
- EP-01-05: Agent loads last 20 messages from conversation_context table on each request. Rolling window — trim to 20 on save.
- EP-01-06: Bot sends sendChatAction "typing" before each API call and clears it on response.

### EP-02 — Calendar Write

- EP-02-01: User describes a meeting — agent extracts who, what, when, where, duration and proposes a structured event with full details.
- EP-02-02: Telegram inline keyboard shows Confirm / Edit / Cancel buttons. Confirm creates the event. Cancel dismisses. Edit prompts for changes. active_confirmation stored in DB between messages.
- EP-02-03: User describes a change to an existing event — agent identifies the event, proposes update with before/after summary, user confirms.
- EP-02-04: User asks to delete an event — agent identifies it, proposes deletion with event summary, user confirms. If ambiguous match, list options.
- EP-02-05: User asks if they are free at a given time — agent checks calendar and returns free/busy status with adjacent events.

### EP-03 — Tasks

- EP-03-01: User asks for today's tasks — agent calls Todoist API with filter "today" and returns list grouped by priority. Include overdue tasks.
- EP-03-02: User describes a task — agent extracts name, due date, priority and proposes creation with confirmation.
- EP-03-03: User names a task to complete — agent finds it (fuzzy match), proposes completion, user confirms.
- EP-03-04: User names a task to delete — agent finds it, proposes deletion, user confirms. Distinguish clearly from complete.
- EP-03-05: User asks to update a task's due date or priority — agent identifies task, proposes change, user confirms.
- EP-03-06: User asks to see overdue tasks — agent fetches and presents options: reschedule, complete, or delete for each.

### EP-04 — Email Intelligence

- EP-04-01: User asks for inbox summary — agent calls Gmail MCP, classifies emails by type (action required / FYI / waiting on), returns digest grouped by type. Maximum 10 emails.
- EP-04-02: User asks about a specific email or thread — agent fetches and summarises in plain language.
- EP-04-03: Agent identifies implied actions in emails (flight confirmations, meeting invites, deadlines) and proposes adding to calendar or Todoist. User confirms each.
- EP-04-04: When email is from or about a known person, agent mentions the link and offers to log the interaction.

### EP-05 — People Graph

- EP-05-01: User describes a person — agent extracts name, relationship_type, how_known, notes and creates a people record.
- EP-05-02: When a name matches a known person, agent uses their record as context automatically. Case-insensitive fuzzy match.
- EP-05-03: User asks what the agent knows about a person — full record returned including last interaction date and upcoming life events.
- EP-05-04: User describes an interaction — agent logs it against the person and updates notes.
- EP-05-05: User updates information about a person — agent merges with existing notes, does not overwrite.
- EP-05-06: User asks who they have not spoken to recently — query interactions table, return people sorted by last_interaction_at ascending. Default threshold 30 days.

### EP-06 — Life Events

- EP-06-01: User records a life event for a person — agent creates life_event record. Birthdays and anniversaries default to is_recurring: true.
- EP-06-02: User asks for upcoming life events — agent queries within the requested date window, adjusts recurring events to current year.
- EP-06-03: Nudge scheduler creates a nudge 7 days before each upcoming life event. Lead time: 7 days for birthdays, 14 days for anniversaries.
- EP-06-04: User asks for a drafted birthday or anniversary message — agent generates personalised message using person's record as context. Tone matches relationship_type.
- EP-06-05: User asks for a gift suggestion — agent uses person's notes (interests, life context) to generate 3 specific suggestions with approximate price ranges.

### EP-07 — Proactive

- EP-07-01: node-cron fires at DIGEST_CRON time. Orchestrator builds and sends digest to TELEGRAM_ALLOWED_CHAT_ID within 60 seconds.
- EP-07-02: Digest section 1 — today's events in chronological order. Flag back-to-back meetings or gaps shorter than 15 minutes.
- EP-07-03: Digest section 2 — today's and overdue tasks sorted by priority. Maximum 7 tasks.
- EP-07-04: Digest section 3 — life events in the next 7 days with suggested actions. Only include if nudge not already sent this cycle.
- EP-07-05: Digest section 4 — 3-4 sentence synthesis suggesting what to focus on and when. Specific and actionable.
- EP-07-06: Nudge evaluator runs every 15 minutes. Checks nudges table for pending nudges past trigger_at. Sends and marks as sent. Maximum 3 nudges per hour.
- EP-07-07: Every nudge message includes a Dismiss button. Pressing it sets nudge status to dismissed. Dismissed nudges do not re-fire.

### EP-08 — Day Planning

- EP-08-01: User asks "plan my day" — agent synthesises calendar and tasks into a time-blocked plan. Respects existing events. Suggests task slots in free time only.
- EP-08-02: Day plan prioritises tasks by priority, deadline proximity, and estimated effort. Flags if more tasks than available time.
- EP-08-03: User asks "what should I do next?" — agent checks current time, remaining calendar, and open tasks. Returns single clear recommendation.
- EP-08-04: User pastes a multi-intent snippet — agent extracts all implied actions and proposes each. "Dinner with Jess Friday 8pm at Dishoom" creates calendar event and logs interaction with Jess if she is in the people graph.

### EP-11 — Voice Message Input

- EP-11-01: Bot detects incoming Telegram voice messages (`message.voice`). Downloads the `.oga` audio file using the Telegram file download endpoint (authenticated with `TELEGRAM_BOT_TOKEN`). Sends it to OpenAI Whisper API (`whisper-1` model, `multipart/form-data` POST to `https://api.openai.com/v1/audio/transcriptions`). Returns transcription text.
- EP-11-02: Bot writes a pending voice intent to `pending_voice_intents` table with `chat_id`, `transcription`, `telegram_file_id`, and `expires_at` (5 minutes from now). Then replies to the user with: "Here's what I heard: [transcription]. Shall I do that?" and an inline keyboard with buttons `[✓ Yes, do it]` and `[✗ No, cancel]` — callback data: `voice_yes_[id]` and `voice_no_[id]`.
- EP-11-03: Callback handler handles `voice_yes_[id]`. Loads the pending intent from the DB. If `expires_at` is in the past, replies "That request expired — please send your voice message again." and deletes the row. If valid, deletes the row and passes the transcription to the agent as a regular message (prefixed `[voice] ` in conversation context so history is coherent).
- EP-11-04: Callback handler handles `voice_no_[id]`. Deletes the pending intent row. Replies "OK, cancelled." No further action.
- EP-11-05: Whisper API errors (non-200 response, network failure, empty transcription) are caught. User receives: "Sorry, I couldn't transcribe that voice message — please try again or type your request." No row is written to `pending_voice_intents`.
- EP-11-06: `OPENAI_API_KEY` added to env config validation in `packages/shared/src/env.ts`. Added to `.env.example` with a comment. No other changes to the shared env schema.

### EP-10 — Strava Integration

- EP-10-01: User sends "connect Strava" — bot returns an OAuth authorisation URL with scope `activity:read_all`. URL includes a state token stored server-side for CSRF protection.
- EP-10-02: OAuth callback endpoint receives the authorisation code, exchanges it for tokens via Strava API, and upserts access_token, refresh_token, expires_at, athlete_id, and scope into strava_credentials. Sends Telegram confirmation with the authenticated athlete name.
- EP-10-03: On successful OAuth connection, bot fetches all activities from the last 90 days (paginated, 30 per page) and upserts into strava_activities. Sends a Telegram message when sync is complete with the count of activities imported.
- EP-10-04: Sync job runs every 30 minutes via node-cron. Fetches activities updated since last_synced_at and upserts into strava_activities. Before every Strava API call, checks expires_at — if expired, exchanges refresh_token for a new access_token and updates strava_credentials.
- EP-10-05: User asks about recent activities ("what did I do this week?", "show my runs") — agent calls get_strava_activities with appropriate date filter and returns a formatted list: sport emoji, name, distance, moving time, date. Handle case where no activities exist yet.
- EP-10-06: User asks for totals by sport and/or date range ("how far did I run this month?", "total cycling distance this year") — agent calls get_strava_activities with filters and returns aggregated distance and time totals per sport.
- EP-10-07: User asks about training trends or consistency ("how's my training?", "am I getting faster?") — agent calls get_strava_trends and returns plain-language analysis covering: weekly volume for last 8 weeks, average pace trend for runs, rest days per week.
- EP-10-08: Agent system prompt includes a brief activity snapshot (last 7 days: activity count, total moving time, last activity sport and date) so exercise load is available as context in day planning and "what should I do next?" answers.
