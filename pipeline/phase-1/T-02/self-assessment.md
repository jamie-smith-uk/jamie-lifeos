# T-02 Self-Assessment — Shared: db, logger, env, types

**Agent:** AG-03 Developer  
**Task:** T-02 — Shared: db, logger, env, types  
**Date:** 2026-04-20  
**Revision:** 2 (security fixes applied after AG-04 FAIL)

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `db.ts` exports a `Pool` instance; Pool is created once and reused | PASS | `createPool()` is called once at module load time; result assigned to `export const pool`. No other code path creates a Pool. |
| 2 | `env.ts` throws a descriptive error if any required variable is missing at startup | PASS | `loadEnv()` collects all missing keys into a `missing[]` array and throws `"[env] Missing required environment variable(s): X, Y. Check your .env file against .env.example."` before any module that imports `env` can proceed. |
| 3 | `logger.ts` exports a pino logger with level configurable via `LOG_LEVEL` env var | PASS | `pino({ level: process.env["LOG_LEVEL"] ?? "info" })` — level read directly from `process.env` (not from `env`) so the logger itself does not depend on env validation, avoiding a circular initialisation risk. |
| 4 | `types.ts` exports `ConversationMessage` and `ConfirmationPayload` interfaces | PASS | Both interfaces exported. `ConfirmationPayload` uses a discriminated `ConfirmationAction` union; `ConversationMessage` matches the `conversation_context` schema specified in the architecture. |

**Overall verdict: PASS**

---

## Security Fixes Applied (Revision 2)

The initial submission received a **FAIL** from AG-04 Security with one finding:

| Finding | Rule | Fix Applied |
|---------|------|-------------|
| `db.ts` Pool config missing `statement_timeout` | 4.4 DB queries — Statement timeout enforced | Added `statement_timeout: 30_000` to the Pool constructor options in `packages/shared/src/db.ts:29` |
| `package.json` dependencies used `^` and `~` prefixes | 4.5 Pinning — All dependencies pinned to exact versions | Removed all `^` prefixes from `pg`, `pino`, `@types/node`, and `@types/pg` in `packages/shared/package.json` |

---

## Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `packages/shared/src/env.ts` | Created | Validates `REQUIRED_VARS` at startup; throws on missing or empty values; provides typed defaults for optional vars |
| `packages/shared/src/types.ts` | Created | `ConversationMessage`, `ConfirmationPayload`, `ConfirmationAction`, `CreateEventData`, `UpdateEventData`, `DeleteEventData`, `CallbackAction`, `IncomingMessage`, `IncomingCallback`, `OrchestratorReply` |
| `packages/shared/src/db.ts` | Created + fixed | `pool` singleton (pg Pool) using `DATABASE_URL`; configures SSL for non-local hosts; exports `closePool()` for graceful shutdown; `statement_timeout: 30_000` added in rev 2 |
| `packages/shared/src/logger.ts` | Created | pino v10 logger; `LOG_LEVEL` env var; ISO timestamps; `level` formatter uses string labels; `redact` removes sensitive fields (password, token, api_key, etc.) |
| `packages/shared/src/index.ts` | Modified | Re-exports all four modules via `export * from "./X.js"` |
| `packages/shared/package.json` | Modified + fixed | Added runtime deps: `pg`, `pino`; added devDeps: `@types/node`, `@types/pg`; all versions pinned to exact values in rev 2 |
| `packages/shared/tsconfig.json` | Modified | Added `"types": ["node", "pg"]` to satisfy strict type-checking for `process` and pg types |

---

## Technical Decisions

### env.ts — no third-party schema library
The task specifies "validated env config using a schema". A deliberate choice was made to implement validation with plain TypeScript rather than adding a dependency like `zod` or `envalid`. Rationale:
- Keeps the dependency surface small for a foundation package.
- Throws descriptive errors that name all missing variables in a single pass (not one-at-a-time).
- Produces a fully-typed `EnvConfig` interface without runtime schema overhead.
- T-21 (test suite) can exercise the throw behaviour trivially by temporarily unsetting env vars.

### logger.ts — reads `process.env` directly rather than importing `env`
If `logger.ts` imported `env`, a circular dependency would be created when `env.ts` fails to validate and tries to throw — before the logger is ready. Reading `LOG_LEVEL` directly from `process.env` (with a safe fallback) breaks this dependency cycle and ensures the logger is always available, even during env-validation failures.

### db.ts — SSL handling
`rejectUnauthorized: false` is used for non-local connections. This is the correct setting for Railway Postgres, which uses self-signed certificates. A stricter option can be introduced when the CA cert is available.

### db.ts — statement_timeout
`statement_timeout: 30_000` (30 seconds) is set on the Pool to prevent runaway queries from holding connections indefinitely. This satisfies security rule 4.4 and is appropriate for an interactive Telegram bot where response latency matters.

### Pool singleton — module-level instantiation
The `Pool` is created at module import time (not lazily). This fails fast if `DATABASE_URL` is invalid and ensures all callers share a single connection pool, satisfying the "created once and reused" acceptance criterion.

### types.ts — forward-looking interfaces
In addition to the two required interfaces (`ConversationMessage`, `ConfirmationPayload`), the file defines all HTTP payload types (`IncomingMessage`, `IncomingCallback`, `OrchestratorReply`) and calendar data shapes (`CreateEventData`, `UpdateEventData`, `DeleteEventData`). These are needed by T-05 through T-17 and placing them in `shared` avoids duplication across packages.

---

## Security Notes

- No secrets are present in any source file. All sensitive values are read from environment variables at runtime.
- `logger.ts` includes a `redact` configuration that censors `password`, `token`, `api_key`, `apiKey`, `secret`, `authorization`, and `DATABASE_URL` fields from log output, preventing accidental credential leakage through structured logs.
- `env.ts` does not log the values of environment variables, only their names when missing.
- SSL is enabled for all non-localhost database connections.
- `statement_timeout: 30_000` prevents long-running queries from holding pool connections (rule 4.4).
- All package.json dependency versions are pinned to exact values — no `^` or `~` (rule 4.5).
- `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` compiler flags are inherited from `tsconfig.base.json`, preventing a class of runtime errors at type-check time.

---

## Verification

```
pnpm --filter @lifeos/shared typecheck   # zero errors
pnpm typecheck                           # zero errors across all 3 packages
```

Both commands exit 0 with no TypeScript diagnostics (verified in revision 2 after security fixes).

---

## Risks / Blockers for Downstream Tasks

- None. `@lifeos/shared` exposes `env`, `pool`, `logger`, and all shared types via the package entry point. T-03 (migrations runner), T-05 (bot), and T-08 (orchestrator) can all import from `@lifeos/shared` immediately.
- Downstream tasks that run in test environments (T-21) must set all `REQUIRED_VARS` in the test environment or mock the `env` module, otherwise `env.ts` will throw at import time.
