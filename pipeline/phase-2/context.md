## task-1 — Create Todoist API client tool module

**Files:** packages/shared/dist/env.d.ts.map, packages/shared/src/env.ts, packages/orchestrator/src/tools/todoist.ts, packages/shared/dist/env.d.ts, packages/shared/dist/env.js


---
## task-3 — Add Todoist tool definitions to agent

**Files:** packages/orchestrator/src/agent.ts


---
## task-4 — Add Gmail tool definitions to agent

**Files:** packages/orchestrator/src/agent.ts


---
## task-5a — Implement email content parsing for implied actions

**Files:** packages/orchestrator/src/tools/gmail.ts, packages/shared/vitest.config.ts

- **Email parsing patterns**: The `extract_implied_actions` function in `packages/orchestrator/src/tools/gmail.ts` uses regex patterns for date/time extraction. Key patterns are stored in `DATE_PATTERNS` and `TIME_PATTERNS` constants for reusability.

- **Structured data format**: All extracted calendar events and tasks include `confidence` scores (0.0-1.0) and `source` fields set to "email_content" for traceability. This pattern should be maintained for consistency.

- **Security content limits**: Email content is truncated to 10,000 characters before processing to prevent performance issues and potential security risks. This limit is applied in the `extractImpliedActions` function.

- **Helper function pattern**: Complex parsing functions were broken down into smaller helpers (e.g., `parseRelativeDate`, `calculateCheckInDate`) to maintain code complexity under Biome's limit of 10. Use this pattern for future parsing logic.

- **Error handling**: All parsing functions return empty arrays or null values on errors rather than throwing exceptions, ensuring the tool always returns valid JSON to the agent.

---
## task-5b — Integrate email implied actions with agent confirmation flows

**Files:** packages/orchestrator/src/agent.ts

⚠ task-5b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-6a — Implement email sender matching against people graph

**Files:** packages/orchestrator/src/tools/gmail.ts

⚠ task-6a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-6b — Integrate email interactions with people logging

**Files:** packages/orchestrator/src/tools/gmail.ts

- **People mention detection**: The `extractPeopleMentions` function uses regex patterns to find people names in email content. Patterns include "talked with [Name]", "met with [Name]", "discussed with [Name]", and "email from [Name]". Names are validated to be 2-50 characters and not common words.

- **Database people queries**: All people database queries use the existing `people` table with `id`, `name`, and `relationship_type` columns. Use `findPersonByEmail` for sender matching and `findPersonByName` for content-based mentions. Both functions return `PersonInfo` objects with optional `id` field.

- **log_interaction tool**: The tool accepts `thread_id` (Gmail thread ID), `people` (array of person IDs or names), optional `interaction_type` (defaults to "email"), and optional `notes`. It creates records in the `interactions` table and updates `last_interaction_at` on people records. All operations are wrapped in database transactions.

- **Enhanced email functions**: Both `get_inbox_summary` and `get_thread` now detect people from senders and content, including "Known people" and "People IDs" lines in their output. This allows the agent to offer the `log_interaction` tool when appropriate.

- **Security patterns**: All email content processing maintains the existing `<untrusted>` tag wrapping for external data. People detection functions handle malformed input gracefully and log errors without crashing.

---
