## task-1 — Create pending_voice_intents table migration

**Files:** db/migrations/0009_pending_voice_intents.sql

⚠ task-1: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-2 — Add OPENAI_API_KEY to environment configuration

**Files:** packages/shared/src/env.ts, packages/shared/tsconfig.json, packages/shared/vitest.config.ts, .env.example

- **OPENAI_API_KEY is now a required environment variable** — All services and tests must provide this variable or they will fail at startup with a descriptive error message
- **Environment validation happens at module load time** — The env.ts module validates all required variables when imported, so any missing variables cause immediate startup failure
- **Test environment setup** — The vitest.config.ts includes a default OPENAI_API_KEY value for tests that don't explicitly provide it, ensuring backward compatibility with existing tests
- **OpenAI integration ready** — The environment configuration now supports OpenAI API integration for voice transcription features (Whisper API)
- **Consistent error messaging** — Missing OPENAI_API_KEY follows the same error pattern as other required variables, directing users to check .env.example

---
## task-3a — Implement voice transcription tool core function

**Files:** packages/orchestrator/src/tools/voice.ts

- **Voice transcription function**: The `transcribe_voice_message` function is fully implemented in `packages/orchestrator/src/tools/voice.ts` and ready for integration into the agent tool system
- **Error handling pattern**: All voice transcription errors return strings prefixed with "error:" to distinguish from successful transcriptions
- **Environment dependencies**: Voice transcription requires both `TELEGRAM_BOT_TOKEN` and `OPENAI_API_KEY` environment variables (already configured in task-2)
- **Logging pattern**: Use `logger.child({ tool: "voice", file_id: params.file_id })` for voice-related operations to maintain consistent structured logging
- **API integration ready**: The function handles all network operations (Telegram file download, OpenAI Whisper API) with proper error handling and is ready to be added to the agent's tool definitions

---
## task-3b — Add voice transcription tool tests and validation

**Files:** packages/orchestrator/src/tools/__tests__/voice.test.ts, packages/orchestrator/tsconfig.json, packages/orchestrator/vitest.config.ts

- **Voice transcription tests are comprehensive** — The voice.test.ts file covers all major scenarios including successful transcription, network errors, API failures, and response validation. Future voice-related features should follow this testing pattern.
- **Mock structure for external APIs** — The test file demonstrates proper mocking of both Telegram Bot API and OpenAI Whisper API using vitest mocks. Use this pattern for testing other external API integrations.
- **Error handling validation** — All voice transcription errors return strings prefixed with "error:" to distinguish from successful transcriptions. Tests verify this pattern is followed consistently.
- **Logger context testing** — Tests verify that `logger.child({ tool: "voice", file_id: params.file_id })` is called correctly for structured logging. This pattern should be maintained for all tool implementations.
- **FormData and file handling** — Tests verify proper FormData construction for OpenAI API requests including model parameter ("whisper-1") and file blob creation. This approach should be used for other file upload scenarios.

---
## task-4a — Implement pending voice intent creation and reading

**Files:** packages/orchestrator/src/tools/voice.ts

⚠ task-4a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-4b — Add pending voice intent management tests

**Files:** packages/orchestrator/src/tools/__tests__/voice.test.ts, packages/orchestrator/tsconfig.json, packages/orchestrator/vitest.config.ts

⚠ task-4b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-5a — Implement voice confirmation keyboard builder

**Files:** packages/bot/src/keyboard.ts

⚠ task-5a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-5b — Add voice keyboard builder tests

**Files:** packages/bot/src/__tests__/keyboard.test.ts, packages/bot/tsconfig.json, packages/bot/vitest.config.ts

⚠ task-5b: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
## task-6a — Implement voice message detection in bot handler

**Files:** packages/bot/src/index.ts

⚠ task-6a: self-assessment.md is missing the '## Notes for future agents' section — future tasks will have no context from this task.

---
