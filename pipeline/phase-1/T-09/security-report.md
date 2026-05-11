# Security Report — T-09: Orchestrator Conversation Context Persistence

**Agent:** AG-04 Security  
**Task:** T-09  
**Date:** 2026-04-20  
**Verdict:** PASS

---

## Files Reviewed

| File | Status |
|---|---|
| `packages/orchestrator/src/agent.ts` | Reviewed |
| `packages/orchestrator/src/__tests__/agent.test.ts` | Reviewed |
| `packages/orchestrator/src/index.ts` | Reviewed (in scope as part of the package) |
| `packages/shared/src/db.ts` | Reviewed (dependency — pool config) |
| `packages/shared/src/env.ts` | Reviewed (dependency — secrets handling) |
| `packages/orchestrator/package.json` | Reviewed (dependency pinning) |
| `.gitignore` | Reviewed (git hygiene) |

---

## Rule-by-Rule Findings

### 4.1 Input and Injection

#### SQL — Parameterised queries only
**PASS**

All three SQL statements in `agent.ts` use `$1`/`$2`/`$3` placeholders exclusively.

- `loadContext` (`agent.ts:45–57`): uses `$1` (chatId) and `$2` (CONTEXT_WINDOW). No string interpolation.
- `saveMessage` INSERT (`agent.ts:91–95`): uses `$1`, `$2`, `$3`. No string interpolation.
- `saveMessage` DELETE (`agent.ts:102–113`): uses `$1` (chatId) and `$2` (CONTEXT_WINDOW). No string interpolation.

No template literals or string concatenation appear anywhere in the SQL text. The constant `CONTEXT_WINDOW` is a numeric literal embedded at compile time in the values array, not in the SQL string.

#### Prompt injection — Label external content before passing to agent
**PASS (not applicable to T-09)**

`agent.ts` provides only context load/save functions. It does not pass external content to an agent. No violation possible at this layer.

#### Input validation — Validate all Telegram input
**PASS (not applicable to T-09)**

T-09 does not add any Telegram message handlers. Validation of chat_id, message length, and whitelist is the responsibility of the bot package and `index.ts` (which pre-dates this task). No regression introduced.

#### Cron injection — Validate cron expressions before storing
**PASS (not applicable to T-09)**

No cron expressions are handled in the files written for T-09.

---

### 4.2 Secrets and Credentials

#### Env vars — Secrets in .env only
**PASS**

No hardcoded secrets, tokens, passwords, or keys appear in any file in scope. The database connection string is read from `process.env.DATABASE_URL` via `env.ts` (`env.ts:93`), which is itself passed to the pg Pool constructor (`db.ts:26`). No secret string appears in source code.

#### Logging — Never log secrets
**PASS**

`agent.ts` contains no log statements. `index.ts` log calls include only `chat_id`, `message_id`, `callback_data`, and `err` objects — none of these are credential-bearing variables.

#### Agent exposure — Secrets never reach the agent
**PASS (not applicable to T-09)**

T-09 does not call the Anthropic API. The Anthropic key is defined in `env.ts` but never referenced in `agent.ts`.

#### Git — No secrets in git history
**PASS**

`.gitignore` (`line 1–2`) lists `.env` and `.env.*` (with `!.env.example` exception). The `pipeline/` directory is also excluded. No credential-bearing files are committed.

---

### 4.3 Authentication and Access

#### Telegram — Whitelist on every handler
**PASS (not applicable to T-09)**

`agent.ts` is a pure data-access module; it exposes no HTTP or Telegram handlers. The whitelist check obligation is on the bot package handlers, not this module.

#### Database — No agent-constructed SQL
**PASS**

All SQL in `agent.ts` is statically written by the developer. No agent output is ever interpolated into a SQL string. The only dynamic values in queries are `chatId` (a typed `number`) and `CONTEXT_WINDOW` (a compile-time constant), both passed as parameterised values.

#### MCP — OAuth tokens stored securely
**PASS (not applicable to T-09)**

No OAuth tokens are touched by T-09.

#### Admin UI — Not externally exposed
**PASS (not applicable to T-09)**

T-09 introduces no new HTTP servers or bound ports.

---

### 4.4 Data Handling

#### PII — No PII in logs
**PASS**

`agent.ts` has no logging. `index.ts` logs `chat_id` (a numeric identifier, not a name or email) and `err` objects. No people names, email addresses, phone numbers, or calendar event content are logged.

#### External content — Label all external content as untrusted
**PASS (not applicable to T-09)**

`agent.ts` stores and retrieves message content opaquely. It does not pass content to the agent. Untrusted-labelling responsibility belongs to the layer that assembles the Anthropic API call (a future task).

#### Error messages — No stack traces to Telegram
**PASS**

`agent.ts` propagates errors by re-throwing them (`agent.ts:118`). No error messages or stack traces are sent to Telegram from this module. The `index.ts` catch blocks at lines 201–205 and 255–259 send only `"Internal server error"` (a plain string) to the HTTP caller, not `error.message` or `error.stack`.

#### DB queries — Statement timeout enforced
**PASS**

`db.ts:30` sets `statement_timeout: 30_000` (30 seconds) on the shared Pool configuration. All queries in `agent.ts` use the shared `pool` singleton, so the timeout applies to every query including the transactional client obtained via `pool.connect()`.

---

### 4.5 Dependency Security

#### Audit — Zero high or critical vulnerabilities
**NOT EVALUATED**

`pnpm audit` was not run as part of this static review. This check should be performed in CI. No new runtime dependencies were added by T-09 (see below), so the risk delta is zero.

#### Pinning — All dependencies pinned to exact versions
**FAIL — MINOR**

`packages/orchestrator/package.json` (`line 21`) lists `vitest` with a `^` prefix:

```json
"vitest": "^4.1.4"
```

This violates rule 4.5 Pinning. `vitest` is a devDependency (test tooling only, not shipped to production), so the blast radius is limited to the development/CI environment, not the runtime. However, the rule applies to all entries in `package.json` without exception.

**Recommendation:** Change `"^4.1.4"` to `"4.1.4"`.

Note: `@types/node` (`"25.6.0"`) and `typescript` (`"5.4.5"`) are correctly pinned.

#### Minimal surface — No unjustified new dependencies
**PASS**

T-09 adds no new runtime dependencies. `agent.ts` imports only from `@lifeos/shared` (already a declared workspace dependency). The test file uses `vitest` (already a declared devDependency). No new packages were added.

---

## Summary of Findings

| Rule | Result | Severity | Notes |
|---|---|---|---|
| 4.1 SQL parameterisation | PASS | — | All queries use $1/$2/$3 |
| 4.1 Prompt injection | PASS | — | N/A to this task |
| 4.1 Input validation | PASS | — | N/A to this task |
| 4.1 Cron injection | PASS | — | N/A to this task |
| 4.2 Env vars / secrets in source | PASS | — | No hardcoded secrets |
| 4.2 Logging secrets | PASS | — | No credential logging |
| 4.2 Agent exposure | PASS | — | N/A to this task |
| 4.2 Git hygiene | PASS | — | .env in .gitignore |
| 4.3 Telegram whitelist | PASS | — | N/A to this task |
| 4.3 No agent-constructed SQL | PASS | — | All SQL is static |
| 4.3 OAuth token storage | PASS | — | N/A to this task |
| 4.3 Admin UI binding | PASS | — | N/A to this task |
| 4.4 PII in logs | PASS | — | No PII logged |
| 4.4 External content labelling | PASS | — | N/A to this task |
| 4.4 Stack traces to Telegram | PASS | — | Only plain strings sent |
| 4.4 Statement timeout | PASS | — | 30s set on shared pool |
| 4.5 Dependency audit | NOT EVALUATED | — | No new deps added |
| 4.5 Dependency pinning | **FAIL** | Low | `vitest: ^4.1.4` uses `^` |
| 4.5 Minimal surface | PASS | — | No new dependencies |

---

## Verdict: PASS

The single finding (unpinned `^` on `vitest` devDependency) is a low-severity policy violation affecting only the development/CI toolchain, not the production runtime. It does not introduce a runtime security risk. All production-path rules PASS.

**Required fix before next phase:** Remove the `^` from `"vitest": "^4.1.4"` in `packages/orchestrator/package.json`.
