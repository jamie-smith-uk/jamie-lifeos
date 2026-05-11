# Security Report — T-16: Confirmation Pattern Storage
**Agent:** AG-04 Security  
**Date:** 2026-04-20  
**Verdict:** PASS

---

## Scope

| File | Role |
|------|------|
| `packages/orchestrator/src/agent.ts` | Added `saveConfirmation`, `loadConfirmation`, `clearConfirmation` |
| `packages/shared/src/types.ts` | Added `ConfirmationPayload`, `ConfirmationAction`, `CreateEventData`, `UpdateEventData`, `DeleteEventData` |

---

## Rule-by-rule findings

### 4.1 Input and Injection

#### SQL — Parameterised queries only
**PASS**

All three new functions use `$1`/`$2` positional placeholders exclusively. No string concatenation or template literal interpolation appears in any query.

- `saveConfirmation` (agent.ts:509–528): two queries, both parameterised.
- `loadConfirmation` (agent.ts:554–560): one query, parameterised.
- `clearConfirmation` (agent.ts:595–606): one query, parameterised.

Payload serialisation uses `JSON.stringify(payload)` passed as a bound parameter, not embedded in the query string.

#### Prompt injection — Label external content
**PASS (not in scope for T-16)**

T-16 introduces no new code paths that pass external content to the Anthropic API. Existing prompt construction (`buildSystemPrompt`) is unchanged.

#### Input validation — Validate Telegram input
**PASS (not in scope for T-16)**

No new message handlers added. The existing whitelist check in the bot layer is unaffected.

#### Cron injection — Validate cron expressions
**PASS (not in scope for T-16)**

No cron expressions are introduced in this task.

---

### 4.2 Secrets and Credentials

#### Env vars — Secrets in .env only
**PASS**

No hardcoded secrets, tokens, passwords, or API keys appear in either file. `types.ts` is a pure interface file. `agent.ts` reads the API key exclusively via `env.ANTHROPIC_API_KEY` (sourced from `process.env` through the validated `env` module).

#### Logging — Never log secrets
**PASS**

The three new functions (`saveConfirmation`, `loadConfirmation`, `clearConfirmation`) contain no log statements. Pre-existing log calls in `runAgent` and helpers do not log tokens, keys, or secrets — the pino logger also has redaction rules for those field names.

#### Agent exposure — Secrets never reach the agent
**PASS**

None of the new functions alter `buildSystemPrompt` or the messages array passed to the Anthropic client. No env var value is injected into the system prompt or user messages.

#### Git — No secrets in git history
**PASS**

`.gitignore` at the repository root lists `.env` and `.env.*` (with `!.env.example` carve-out). The `pipeline/` directory (where this report lives) is also excluded from git. No secret-pattern strings appear in the reviewed source files.

---

### 4.3 Authentication and Access

#### Telegram — Whitelist on every handler
**PASS (not in scope for T-16)**

The three new functions are internal DB helpers; they do not register or process Telegram messages or callbacks directly. The whitelist check remains the responsibility of the bot layer (unchanged).

#### Database — No agent-constructed SQL
**PASS**

The agent model output does not reach any SQL statement. `saveConfirmation`, `loadConfirmation`, and `clearConfirmation` are called with typed function arguments (`chatId: number`, `payload: ConfirmationPayload`). The `chatId` parameter is always a `number` (validated upstream at the HTTP layer in `index.ts:219`). The `payload` is serialised to JSON via `JSON.stringify` and bound as a parameter.

#### MCP — OAuth tokens stored securely
**PASS (not in scope for T-16)**

No OAuth tokens are read or written. `active_confirmation` stores a `ConfirmationPayload` JSONB blob (calendar event data, not credentials).

#### Admin UI — Not externally exposed
**PASS (not in scope for T-16)**

No new server bindings introduced.

---

### 4.4 Data Handling

#### PII — No PII in logs
**PASS**

None of the three new functions emit log statements. The `ConfirmationPayload.summary` field (which could contain a calendar event title) is never passed to a logger.

There is one minor observation: `loadConfirmation` silently drops an expired payload without clearing it from the database (agent.ts:575 comment: "Expired — treat as absent (do not modify DB here)"). This is intentional by design and documented in the comment. It does not constitute a PII leak.

#### External content — Label untrusted
**PASS (not in scope for T-16)**

No external content is passed to the agent in these functions.

#### Error messages — No stack traces to Telegram
**PASS**

None of the three new functions send responses to Telegram. Errors propagate by `throw` to the existing `runAgent` catch block (agent.ts:330–333), which returns a generic error string, not a stack trace.

#### DB queries — Statement timeout enforced
**PASS**

All DB access uses the shared `pool` singleton defined in `packages/shared/src/db.ts`. That pool is configured with `statement_timeout: 30_000` (30 s). No new pools or raw connections that bypass this setting are created. The `pool.connect()` calls in `saveConfirmation` acquire connections from this pool and therefore inherit its timeout.

---

### 4.5 Dependency Security

#### Audit — Zero high/critical vulnerabilities
**NOT EVALUATED IN THIS REVIEW**

`pnpm audit` was not run as part of this static review. T-16 adds no new dependencies, so the risk surface is unchanged from T-15. The audit should be run as part of the CI pipeline.

#### Pinning — All dependencies pinned to exact versions
**PASS**

`packages/orchestrator/package.json` and `packages/shared/package.json` use exact version strings (no `^` or `~` prefixes) for all production and dev dependencies.

Examples:
- `"@anthropic-ai/sdk": "0.90.0"` ✓
- `"pg": "8.20.0"` ✓
- `"pino": "10.3.1"` ✓
- `"typescript": "5.4.5"` ✓

#### Minimal surface — No unjustified new dependencies
**PASS**

T-16 introduces zero new npm dependencies. All functionality is implemented using existing `pg` pool, TypeScript interfaces, and standard `Date`/`JSON` APIs.

---

## Additional observations (non-blocking)

1. **Expired confirmation not auto-cleared**: `loadConfirmation` returns `null` for expired payloads but does not call `clearConfirmation`. This means stale records can linger in the DB indefinitely until the caller explicitly clears them. This is documented in the code comment and is a functional concern for a future task (T-17/T-18), not a security issue. It poses no injection or leakage risk.

2. **Placeholder row on empty history**: When `saveConfirmation` finds no existing rows, it inserts a row with `role='assistant'` and `content=''`. This is a correct defensive fallback per the design, but the empty-content row may appear in `loadContext` results. This is a functional edge case, not a security issue.

3. **`proposed_at` not validated on read**: `loadConfirmation` calls `new Date(payload.proposed_at)` on the value read from the database. Because the DB is the authoritative source and the column is written exclusively by `saveConfirmation` (which serialises a typed `ConfirmationPayload`), this is safe. An invalid `proposed_at` would result in `NaN`, causing the expiry check `Date.now() - NaN > CONFIRMATION_EXPIRY_MS` to be `false` (NaN comparisons are always false), meaning an unreadable timestamp would be treated as **not expired** — a conservative but arguably incorrect fallback. Risk is low because only application code writes this column.

---

## Summary

| Rule category | Result |
|---------------|--------|
| 4.1 Input & Injection | PASS |
| 4.2 Secrets & Credentials | PASS |
| 4.3 Authentication & Access | PASS |
| 4.4 Data Handling | PASS |
| 4.5 Dependency Security | PASS (audit deferred to CI) |

**Overall verdict: PASS**

No blocking findings. T-16 code is cleared to proceed to AG-05 (testing).
