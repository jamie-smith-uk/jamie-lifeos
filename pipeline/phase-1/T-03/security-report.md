# Security Report — T-03: Database Migrations Runner

**Verdict: PASS**

**Reviewer:** AG-04 Security Agent  
**Date:** 2026-04-20  
**Files reviewed:**
- `packages/shared/src/migrate.ts`
- `db/migrations/0001_init.sql`
- Supporting files examined: `packages/shared/src/db.ts`, `packages/shared/src/logger.ts`, `packages/shared/package.json`, `.gitignore`

---

## Rule-by-Rule Findings

### 4.1 Input and Injection

#### SQL — Parameterised queries only
**PASS**

All SQL statements use parameterised queries:
- `CREATE TABLE IF NOT EXISTS migrations (...)` — DDL with no user input; safe.
- `SELECT name FROM migrations ORDER BY name` — no interpolation.
- `INSERT INTO migrations (name) VALUES ($1)` (`migrate.ts:146`) — filename inserted via `$1` placeholder. The filename is also pre-validated by `MIGRATION_FILENAME_RE` before reaching this point.
- The migration SQL body is read from disk and executed as-is (`migrate.ts:143`). This is by design for a migrations runner; the SQL files are developer-controlled, not user-supplied input. The strict filename regex (`/^(\d{4,})_[a-zA-Z0-9_-]+\.sql$/`) and path-traversal guard (`migrate.ts:190-194`) bound the attack surface to files already committed to the repository.

No string concatenation or template literals appear in any query.

#### Prompt injection — Label external content
**PASS (not applicable)**

`migrate.ts` and `0001_init.sql` do not interact with the AI agent or pass any external content to an agent.

#### Input validation — Validate all Telegram input
**PASS (not applicable)**

No Telegram handlers in scope for this task.

#### Cron injection — Validate cron expressions
**PASS (not applicable)**

No cron expressions handled in scope for this task.

---

### 4.2 Secrets and Credentials

#### Env vars — Secrets in .env only
**PASS**

No hardcoded secrets, tokens, passwords, or key strings are present in either file. Database credentials are consumed via `env.DATABASE_URL` in `db.ts`, which reads from environment variables.

#### Logging — Never log secrets
**PASS**

Log calls in `migrate.ts` emit only:
- `migrationsDir` (a filesystem path)
- `count` (an integer)
- `migration` (a validated filename matching `MIGRATION_FILENAME_RE`)
- `err` (error object, passed to pino's structured `err` field)

The shared `logger.ts` is configured with a `redact` list covering `*.password`, `*.token`, `*.api_key`, `*.apiKey`, `*.secret`, `*.authorization`, and `*.DATABASE_URL`. No env var values or credential-named variables are logged.

#### Agent exposure — Secrets never reach the agent
**PASS (not applicable)**

No Anthropic API calls in scope for this task.

#### Git — No secrets in git history
**PASS**

`.gitignore` contains `.env` and `.env.*` (with `!.env.example` exclusion correctly in place). No secrets detected in the reviewed files.

---

### 4.3 Authentication and Access

#### Telegram — Whitelist on every handler
**PASS (not applicable)**

No Telegram handlers in scope for this task.

#### Database — No agent-constructed SQL
**PASS**

No agent output is used to construct any SQL statement. All SQL is either static DDL/DML or uses `$1` parameterised placeholders with developer-controlled values (validated filenames).

#### MCP — OAuth tokens stored securely
**PASS (not applicable)**

No OAuth tokens handled in scope for this task.

#### Admin UI — Not externally exposed
**PASS (not applicable)**

No HTTP server or admin UI in scope for this task.

---

### 4.4 Data Handling

#### PII — No PII in logs
**PASS**

No people names, email addresses, phone numbers, or calendar event details appear in any log call. Log fields are limited to structural metadata (directory paths, migration filenames, counts, error objects).

#### External content — Label all external content as untrusted
**PASS (not applicable)**

No external content is ingested or passed to an agent in scope for this task.

#### Error messages — No stack traces to Telegram
**PASS (not applicable)**

No Telegram messaging in scope. Errors are logged with `log.error({ err }, ...)` (structured, server-side only) and result in `process.exit(1)` — never forwarded to any external channel.

#### DB queries — Statement timeout enforced
**PASS**

`packages/shared/src/db.ts:30` sets `statement_timeout: 30_000` on the shared pool. All queries in `migrate.ts` use this shared pool (`pool` imported from `./db.js`), so the timeout applies automatically to every connection acquired via `pool.connect()`.

---

### 4.5 Dependency Security

#### Audit — Zero high or critical vulnerabilities
**PASS (deferred to CI)**

No new runtime dependencies are introduced by this task. The existing dependencies (`pg@8.20.0`, `pino@10.3.1`) were cleared under T-02. A fresh `pnpm audit` should be run in CI to confirm continued compliance; no new packages were added here.

#### Pinning — All dependencies pinned to exact versions
**FAIL (pre-existing, not introduced by T-03)**

`packages/shared/package.json:19` contains:
```
"vitest": "^4.1.4"
```
This `^` prefix violates the pinning rule. However, this dependency was introduced prior to T-03 (it appears in the dev dependencies alongside T-02's `db.ts`). T-03 did not add or modify this entry. **This finding is flagged for tracking but is not attributable to T-03.**

All other dependencies remain exact-version pinned (`pg@8.20.0`, `pino@10.3.1`, `typescript@5.4.5`, `@types/node@25.6.0`, `@types/pg@8.20.0`).

#### Minimal surface — No unjustified new dependencies
**PASS**

T-03 introduces no new dependencies. `migrate.ts` imports only from Node built-ins (`fs`, `path`, `url`) and existing internal modules (`./db.js`, `./logger.js`).

---

## Summary of Findings

| Rule | Result | Note |
|------|--------|------|
| 4.1 SQL parameterised queries | PASS | All queries use `$1` or are static DDL/DML |
| 4.1 Prompt injection | N/A | No agent interaction |
| 4.1 Telegram input validation | N/A | No Telegram code |
| 4.1 Cron injection | N/A | No cron code |
| 4.2 Secrets in .env only | PASS | No hardcoded secrets |
| 4.2 No logging of secrets | PASS | Logger redacts sensitive fields |
| 4.2 Secrets never reach agent | N/A | No Anthropic API calls |
| 4.2 .env in .gitignore | PASS | Present and correct |
| 4.3 Telegram whitelist | N/A | No Telegram code |
| 4.3 No agent-constructed SQL | PASS | All SQL is static or parameterised |
| 4.3 MCP OAuth stored securely | N/A | No OAuth code |
| 4.3 Admin UI not exposed | N/A | No HTTP server |
| 4.4 No PII in logs | PASS | Only structural metadata logged |
| 4.4 External content labelled | N/A | No external content |
| 4.4 No stack traces to Telegram | N/A | No Telegram code |
| 4.4 Statement timeout enforced | PASS | `statement_timeout: 30_000` in pool config |
| 4.5 Zero high/critical vulns | PASS (deferred) | No new deps; CI audit required |
| 4.5 Dependencies pinned | PRE-EXISTING FAIL | `vitest: "^4.1.4"` predates T-03 |
| 4.5 No unjustified new deps | PASS | No new packages added |

---

## Additional Security Observations (Positive)

The following security-hardening measures were observed beyond the minimum ruleset requirements:

1. **Filename validation regex** (`migrate.ts:40`): Strict `MIGRATION_FILENAME_RE` prevents non-standard filenames from being executed, including any filename containing path separators or shell metacharacters.
2. **Path-traversal guard** (`migrate.ts:190-194`): Resolved path is checked to remain within `resolvedDir` before the file is read, closing the theoretical gap between filename validation and filesystem access.
3. **Transactional atomicity** (`migrate.ts:141-156`): Each migration runs in a transaction; failure rolls back the migration SQL and the corresponding `migrations` table insert atomically, preventing partial-apply states.
4. **Concurrent startup protection** (`migrate.ts:69-77`): `ensureMigrationsTable` runs inside an explicit `BEGIN/COMMIT` block, reducing the window for race conditions on simultaneous process startup.

---

## Action Required

- **Pre-existing `vitest: "^4.1.4"` pinning violation** should be remediated in a dedicated chore task (pin to exact version `4.1.4`). This is not introduced by T-03 and does not block this task's sign-off.

**Overall verdict for T-03: PASS**
