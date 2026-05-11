# T-08 Self-Assessment: Orchestrator service — entrypoint and HTTP server

## Implementation

**Files written/modified:**

| File | Change |
|---|---|
| `packages/orchestrator/src/index.ts` | Full implementation (replaced empty stub) |
| `packages/orchestrator/package.json` | Added `"type": "module"`, added `@types/node` devDependency |

---

## Architecture

### HTTP server

Plain `node:http` module — no framework. A single `requestHandler` async function is wrapped in a `.catch()` guard on every request so an unhandled promise rejection can never silently crash the process.

### Route table

| Method | Path | Handler |
|---|---|---|
| POST | `/message` | Parse `IncomingMessage`, call `handleMessage`, return `{ text }` |
| POST | `/callback` | Parse `IncomingCallback`, route by `callback_data`, return `{ text }` |
| * | * | 404 plain-text response |

### Request body safety

- `readBody()` enforces a 1 MiB body size limit. Requests exceeding this are destroyed and a 400 is returned.
- JSON is parsed with `JSON.parse`; malformed bodies return 400 before any business logic runs.
- Required fields are validated by type-checking each key before casting to the shared interface type.

### Callback routing (`handleCallback`)

| `callback_data` | Action |
|---|---|
| `confirm` | Stub — returns 200 (T-17 will execute pending action) |
| `edit` | Stub — returns 200 (T-18 will re-prompt agent) |
| `cancel` | Returns 200 "Cancelled." (clearConfirmation stub) |
| `dismiss:<nudgeId>` | Validates nudgeId is a positive integer; returns 200 |
| anything else | Returns 400 |

`dismiss:<nudgeId>` parses the suffix and rejects non-positive-integer values to prevent invalid data from reaching future persistence logic.

### Agent stub

`handleMessage` is an inline async stub returning `"Agent not yet implemented."`. A `// TODO(T-09)` comment marks the exact line to replace with `runAgent(msg)` once `agent.ts` exists. The function signature matches the contract T-09/T-10 must satisfy — this keeps the HTTP layer independently compilable and testable without the agent.

### Startup sequence

1. `runMigrations()` from `@lifeos/shared` — blocks server `listen()` until complete.
2. `env.PORT` is validated to be a finite integer in [1, 65535]; process exits with code 1 if invalid.
3. `server.listen(port)` — server begins accepting requests only after migrations succeed.
4. `log.info({ port })` confirms the port at startup.

### Graceful shutdown

`SIGTERM` and `SIGINT` handlers call `server.close()` and then `process.exit(0)` to drain in-flight requests before exiting.

---

## Acceptance criteria checklist

- [x] **POST /message with valid body returns 200 and a text reply** — validated: `chat_id`, `text`, `message_id` required; on success returns `{ text: "..." }` with status 200.
- [x] **POST /callback with `callback_data` 'cancel' returns 200** — `handleCallback` matches `"cancel"` and returns `{ status: 200, text: "Cancelled." }`.
- [x] **Migrations run before first request is handled** — `runMigrations()` is `await`-ed before `server.listen()` is called.
- [x] **Server listens on PORT env var, defaults to 3001** — reads `env.PORT` (which defaults to `"3001"` in `env.ts`); coerces to `Number` and validates range.

---

## TypeScript

```
npx tsc --noEmit --project packages/orchestrator/tsconfig.json
```
Zero errors. `"type": "module"` added to `packages/orchestrator/package.json` to match the ESM output of `@lifeos/shared`.

---

## Security notes

- **No `.env` file read.** `process.env` is accessed only via the `env` singleton from `@lifeos/shared`.
- **Input validation before cast.** Every required field is type-checked before the raw `unknown` parse result is cast to a typed interface. Unknown or malformed payloads return 4xx before reaching any handler logic.
- **Body size limit.** 1 MiB cap prevents memory exhaustion from oversized request bodies.
- **No secrets in logs.** The logger is the shared pino instance with its redact configuration; `chat_id` and `message_id` are the only per-request fields logged.
- **No string interpolation in SQL.** No SQL is executed in this file; all DB access is deferred to `runMigrations()` and future agent.ts.
- **Callback `dismiss` integer validation.** The `nudgeId` suffix is converted with `Number()` and checked with `Number.isInteger` and `> 0` to reject non-integer or negative values before they reach future persistence logic.
- **No process.env.DATABASE_URL read directly.** Database URL is consumed only inside `@lifeos/shared` (pool singleton and migrate.ts).

---

## Scope compliance

Only the following files were modified:

- `packages/orchestrator/src/index.ts` — created (replacing empty stub).
- `packages/orchestrator/package.json` — `"type": "module"` and `@types/node` added (required for ESM compatibility with `@lifeos/shared`).

No other files were created or modified.
