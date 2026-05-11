# T-21 Test Report — Vitest Test Suite Scaffold and Unit Tests

**Date:** 2026-04-20  
**Agent:** AG-05 Tester  
**Task:** T-21 — Vitest test suite scaffold and unit tests  
**Result:** PASS

---

## Summary

`pnpm test` passes with zero failures across all three packages.

| Package | Test Files | Tests | Status |
|---|---|---|---|
| `@lifeos/shared` | 9 | 172 | PASS |
| `@lifeos/bot` | 4 | 103 | PASS |
| `@lifeos/orchestrator` | 16 | 456 | PASS |
| **Total** | **29** | **731** | **PASS** |

---

## Acceptance Criteria Verification

### AC-1: `pnpm test` passes with zero failures

```
> jamie-lifeos@0.0.1 test /Users/jamie/Documents/jamie-lifeos
> pnpm -r test

Scope: 3 of 4 workspace projects
packages/shared test:  Test Files  9 passed (9)
packages/shared test:       Tests  172 passed (172)
packages/bot test:  Test Files  4 passed (4)
packages/bot test:       Tests  103 passed (103)
packages/orchestrator test:  Test Files  16 passed (16)
packages/orchestrator test:       Tests  456 passed (456)
```

**Status: PASS** — Zero failures.

---

### AC-2: `isAllowedChat`: allowed ID returns true, any other returns false

**Test file:** `packages/bot/src/middleware.test.ts`

Key tests:

- `AC-1: isAllowedChat returns true for the configured chat ID`
  - `returns true when chatId exactly matches TELEGRAM_ALLOWED_CHAT_ID` ✓
  - `returns true for a large numeric chat ID` ✓
  - `returns true when TELEGRAM_ALLOWED_CHAT_ID has surrounding whitespace` ✓

- `AC-2: isAllowedChat returns false for any other chatId`
  - `returns false for a chatId that differs by 1` ✓
  - `returns false for chatId 0 when allowed is non-zero` ✓
  - `returns false for a negative chatId` ✓
  - `returns false for a completely different chatId` ✓

- `AC-3: isAllowedChat returns false (safe-fail) for non-numeric TELEGRAM_ALLOWED_CHAT_ID`
  - `returns false when TELEGRAM_ALLOWED_CHAT_ID is 'not-a-number'` ✓
  - `returns false when TELEGRAM_ALLOWED_CHAT_ID is an empty string` ✓
  - `returns false when TELEGRAM_ALLOWED_CHAT_ID is 'abc123'` ✓

**Status: PASS**

---

### AC-3: Rolling window: 25 saves leaves exactly 20 rows

**Test file:** `packages/orchestrator/src/agent.test.ts`

Key tests (T-09 suite):

- `after 25 saves, exactly 20 rows remain for that chat_id` ✓
- `the retained 20 rows are the newest 20 (messages 6–25)` ✓
- `saving exactly 20 messages leaves all 20 rows intact` ✓
- `saving 21 messages leaves exactly 20 rows (oldest pruned)` ✓
- `pruning for one chat_id does not affect another chat_id` ✓
- `loadContext returns at most 20 messages` ✓
- `loadContext returns messages in chronological order (oldest first)` ✓

Strategy: `pool` singleton mocked with in-memory store that mirrors SQL behaviour.  
No real database required. All Anthropic API calls mocked.

**Status: PASS**

---

### AC-4: Confirmation expiry: payload older than 10 min returns null

**Test file:** `packages/orchestrator/src/agent.test.ts`

Key tests (T-16 suite):

- `returns the payload when proposed_at is NOW (fresh)` ✓
- `returns the payload when proposed_at is 1 second ago` ✓
- `returns the payload when proposed_at is 9 min 59 sec ago (not yet expired)` ✓
- `returns null when proposed_at is exactly 10 min + 1 sec ago (expired)` ✓
- `returns null when proposed_at is 11 minutes ago` ✓
- `returns null when proposed_at is 60 minutes ago` ✓
- `returns null when proposed_at is from yesterday` ✓
- `returns null when no rows exist for chat_id` ✓
- `returns null when active_confirmation is null on the row` ✓
- `returns null after clearConfirmation is called` ✓
- `expiry check is read-only — does not issue an UPDATE` ✓

**Status: PASS**

---

### AC-5: `env.ts`: missing required var throws at startup

**Test file:** `packages/shared/src/env.test.ts`

Key tests:

- `throws when TELEGRAM_BOT_TOKEN is missing` ✓
- `throws when TELEGRAM_ALLOWED_CHAT_ID is missing` ✓
- `throws when ANTHROPIC_API_KEY is missing` ✓
- `throws when DATABASE_URL is missing` ✓
- `throws when DIGEST_CRON is missing` ✓
- `throws when TZ is missing` ✓
- `throws when a required var is set to whitespace only` ✓
- `error message lists both vars when two are missing` ✓
- `error message mentions .env file` ✓
- `resolves when all required vars are set` ✓
- `ANTHROPIC_MODEL defaults to 'claude-sonnet-4-20250514'` ✓
- `BOT_MODE defaults to 'polling'` ✓

Strategy: `vi.resetModules()` + dynamic import isolates each test so `loadEnv()` 
re-runs with mutated `process.env`. No database connection required.

**Status: PASS**

---

## Coverage of Additional Test Files

### `packages/shared/src/migrate.test.ts` — Migration idempotency (T-03)

- **AC-1:** Idempotency — migrations applied exactly once (6 tests) ✓
- **AC-2:** 0001_init.sql schema correctness — SQL file content verified (12 tests) ✓
- **AC-3:** Failure handling — `process.exit(1)` called on error (5 tests) ✓
- **File filtering** — non-standard files ignored (2 tests) ✓

### `packages/bot/src/keyboard.test.ts` — Keyboard builders (T-07)

- **AC-1:** `buildConfirmKeyboard` — correct structure (10 tests) ✓
- **AC-2:** `buildDismissKeyboard` — correct structure (8 tests) ✓
- **AC-3:** `callback_data` exact values: `confirm`, `edit`, `cancel`, `dismiss:<nudgeId>` (10 tests) ✓

---

## Vitest Configuration

**Root `vitest.config.ts`** delegates to per-package configs via `projects` field:

```ts
test: {
  projects: [
    "packages/bot/vitest.config.ts",
    "packages/orchestrator/vitest.config.ts",
    "packages/shared/vitest.config.ts",
  ],
}
```

Each package config uses:
- `environment: "node"`
- `isolate: true` — per-file module isolation prevents cross-test env pollution
- `pool: "forks"` — fresh module registry per test file
- `include: ["src/__tests__/**/*.test.ts", "src/*.test.ts"]`

---

## Mock Strategy

All external services are mocked — no real API calls are made:

| Service | Mock approach |
|---|---|
| Telegram API | `vi.doMock("@lifeos/shared")` with fake env; `@lifeos/bot` index tests mock `TelegramBot` constructor |
| Anthropic API | `vi.doMock("@anthropic-ai/sdk")` with fake `messages.create()` |
| PostgreSQL pool | In-memory `StoredRow[]` store with `handleQuery()` dispatcher |
| Google Calendar MCP | `global.fetch` mocked in calendar tool tests |
| Gmail MCP | Not invoked in Phase 1 — no mock needed |

---

## pnpm test Full Output (final run)

```
> jamie-lifeos@0.0.1 test /Users/jamie/Documents/jamie-lifeos
> pnpm -r test

Scope: 3 of 4 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test:  RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/shared
packages/shared test:  Test Files  9 passed (9)
packages/shared test:       Tests  172 passed (172)
packages/shared test:    Start at  18:02:19
packages/shared test:    Duration  564ms (transform 320ms, setup 0ms, import 377ms, tests 679ms, environment 1ms)
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test:  RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator
packages/bot test:  RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/bot
packages/bot test:  Test Files  4 passed (4)
packages/bot test:       Tests  103 passed (103)
packages/bot test:    Start at  18:02:20
packages/bot test:    Duration  1.32s (transform 144ms, setup 0ms, import 165ms, tests 1.04s, environment 0ms)
packages/bot test: Done
packages/orchestrator test:  Test Files  16 passed (16)
packages/orchestrator test:       Tests  456 passed (456)
packages/orchestrator test:    Start at  18:02:20
packages/orchestrator test:    Duration  2.33s (transform 988ms, setup 0ms, import 1.33s, tests 5.57s, environment 1ms)
packages/orchestrator test: Done
```

---

## Verdict

**PASS** — All 5 acceptance criteria satisfied. 731 tests pass, 0 failures, 0 skipped.
