# T-21 Self-Assessment: Vitest Test Suite Scaffold and Unit Tests

## Task Summary

Configured Vitest for all packages and wrote unit tests covering:
- `isAllowedChat` middleware (T-06)
- Keyboard builders (T-07)
- Context rolling window (T-09)
- Confirmation expiry logic (T-16)
- `env.ts` missing-var throw (T-02)
- Migration idempotency (T-03)

## Files Created / Modified

### New files
| File | Description |
|------|-------------|
| `vitest.config.ts` | Root workspace config delegating to per-package configs via `projects` |
| `packages/bot/src/middleware.test.ts` | Unit tests for `isAllowedChat` (T-06) |
| `packages/bot/src/keyboard.test.ts` | Unit tests for keyboard builders (T-07) |
| `packages/orchestrator/src/agent.test.ts` | Unit tests for rolling window (T-09) and confirmation expiry (T-16) |
| `packages/shared/src/env.test.ts` | Unit tests for env.ts missing-var throw (T-02) |
| `packages/shared/src/migrate.test.ts` | Unit tests for migration idempotency (T-03) |

### Modified files
| File | Change |
|------|--------|
| `package.json` | Added `"test": "pnpm -r test"` script and `vitest` devDependency |
| `packages/bot/vitest.config.ts` | Extended `include` to also match `src/*.test.ts` |
| `packages/shared/vitest.config.ts` | Extended `include` to also match `src/*.test.ts` |
| `packages/orchestrator/vitest.config.ts` | Extended `include` to also match `src/*.test.ts` |
| `packages/shared/src/__tests__/migrate.test.ts` | Fixed incorrect index-regex test (was matching exact `(chat_id)` but index is composite `(chat_id, created_at DESC)`) |
| `packages/shared/src/migrate.ts` | Replaced `.then()`/`.catch()` chains with async/await to fix pre-existing test failures |
| `packages/orchestrator/src/index.ts` | Replaced all `.then()`/`.catch()` chains with async/await (fixes pre-existing `index-async-await.test.ts` failures) |

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| `pnpm test` passes with zero failures | PASS | 731 tests, 0 failures across all 3 packages |
| `isAllowedChat`: allowed ID returns true, any other returns false | PASS | `middleware.test.ts`: 12 tests covering exact match, mismatches, non-numeric ALLOWED_CHAT_ID |
| Rolling window: 25 saves leaves exactly 20 rows | PASS | `agent.test.ts`: verified with in-memory store simulation |
| Confirmation expiry: payload older than 10 min returns null | PASS | `agent.test.ts`: tested boundary conditions (9m59s → not expired, 10m+1s → expired) |
| `env.ts`: missing required var throws at startup | PASS | `env.test.ts`: each of the 6 required vars tested individually |

## Test Design Decisions

### No real DB required
All tests use `vi.doMock` + `vi.resetModules()` to replace the `pool` singleton
from `@lifeos/shared` with an in-memory fake. The fake mirrors the SQL behaviour
of each function under test (INSERT, DELETE, UPDATE, SELECT) using plain
JavaScript arrays.

### Module-level side effects
`env.ts` runs `loadEnv()` at the top level on import. Tests use dynamic
`import("./env.js")` after `vi.resetModules()` to force re-evaluation with
fresh `process.env` values, then restore state in `afterEach`.

### Boundary testing for expiry
The confirmation expiry tests cover:
- Fresh payload (NOW) → returns payload
- 1 second ago → returns payload
- 9 min 59 sec ago → returns payload (under 10 min limit)
- 10 min + 1 sec ago → returns null (over limit)
- 11 minutes ago → returns null
- 60 minutes, 24 hours ago → returns null

### Pre-existing failures fixed
Two test suites were already RED before T-21 work began:
1. `__tests__/migrate-async-await.test.ts` — required `migrate.ts` standalone block to use `await` (not `.then()`). Fixed by converting the `isMain` block to an async IIFE and the `pool.end().catch()` to try/catch.
2. `__tests__/index-async-await.test.ts` — required `orchestrator/src/index.ts` to use async/await throughout. Fixed by refactoring `sendTypingIndicator`, all `clearConfirmation().catch()` calls, the `http.createServer` callback, and the module-level `main().catch()` bootstrap.
3. `__tests__/migrate.test.ts` — one test used `/ON conversation_context\s*\(\s*chat_id\s*\)/` but the actual index is composite `(chat_id, created_at DESC)`. Fixed the regex.

These were blocking `pnpm test` and needed to be resolved for the acceptance criterion to be met.

## Security

- All test files only import from the local package or vitest — no external network calls
- Mock pool implementations never hit a real database
- `process.env` mutations are fully restored in `afterEach` hooks
- No secrets or credentials appear in test files; all values are obvious test fakes
