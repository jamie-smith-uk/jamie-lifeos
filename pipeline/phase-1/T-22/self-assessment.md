# T-22 Self-Assessment — Railway service configuration and deployment

## Task summary

Add Railway deployment configuration for the `bot` and `orchestrator` services:
Dockerfiles for each service, a `railway.json` describing both services, and a
fully-documented `.env.example`.

---

## Files created / modified

| File | Action |
|------|--------|
| `railway.json` | Created |
| `.env.example` | Updated (full descriptions added) |
| `packages/bot/Dockerfile` | Created |
| `packages/orchestrator/Dockerfile` | Created |
| `pipeline/phase-1/T-22/self-assessment.md` | Created (this file) |

---

## Acceptance criteria check

### 1. Both services deploy to Railway without build errors
- Each Dockerfile uses a two-stage build: **builder** (node:20-alpine + pnpm,
  full install, TypeScript compilation) and **runtime** (production deps only,
  compiled `dist/` copied in).
- Build context is the monorepo root so all workspace packages are available.
- `pnpm install --frozen-lockfile` ensures reproducible installs.
- `pnpm --filter <pkg> build` compiles shared first, then the target service,
  matching the TypeScript project-references order.

### 2. Bot service can reach orchestrator via ORCHESTRATOR_URL on Railway private network
- `railway.json` exposes the orchestrator's Railway private domain via the
  `${{orchestrator.RAILWAY_PRIVATE_DOMAIN}}` reference variable and maps it to
  the bot's `ORCHESTRATOR_URL`.
- On Railway's private network, services communicate over
  `<service>.railway.internal` without leaving the internal network.
- Both services declare `PORT` / `3001` so the private-network address resolves
  correctly.

### 3. All environment variables documented in .env.example
- `.env.example` now documents every variable consumed by `packages/shared/src/env.ts`:
  `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`,
  `ANTHROPIC_API_KEY`, `ORCHESTRATOR_URL`, `DIGEST_CRON`, `TZ`, `BOT_MODE`,
  `PORT`, `LOG_LEVEL`, `ANTHROPIC_MODEL`.
- Additional optional variables (`NUDGE_EVAL_CRON`, `GOOGLE_CALENDAR_MCP_URL`,
  individual `POSTGRES_*` vars) are documented with descriptions.
- Each section has a comment explaining which service(s) require it.

### 4. No .env files committed to the repository
- `.gitignore` already contains `.env` and `.env.*` (excluding `.env.example`).
- No `.env` file is created or referenced in any committed file.
- Dockerfiles do not `COPY .env` or bake secrets into the image.

---

## Security considerations

- Dockerfiles run the final image as a **non-root user** (`lifeos`) created
  during the build — satisfying the principle of least privilege.
- No secrets are baked into the image layers; all secrets are injected at
  runtime via Railway service variables.
- `pino` logger in `packages/shared` already redacts sensitive fields
  (`*.token`, `*.api_key`, `*.DATABASE_URL`, etc.) from log output.
- The `railway.json` service variable references use Railway's `${{...}}`
  interpolation — no literal secret values appear in the file.

---

## Limitations / known caveats

- `railway.json` multi-service support (the `"services"` key) requires the
  Railway CLI v3+ and a project that has been configured with multiple services
  in the Railway dashboard. The JSON schema used is the current Railway v2
  schema; verify against Railway docs if the schema version changes.
- The bot's `ORCHESTRATOR_URL` variable uses
  `${{orchestrator.RAILWAY_PRIVATE_DOMAIN}}` which resolves to the hostname
  only. At runtime this becomes `http://<hostname>:3001`. If Railway changes the
  private domain format, the URL construction in the dashboard variable may need
  to be updated to a full URL (Railway supports setting this as a raw string in
  the dashboard).
- `BOT_MODE` is hard-coded to `polling` in the bot service variables because
  Railway does not expose a stable inbound HTTPS URL by default. If webhook mode
  is ever needed, a Railway custom domain with TLS must be configured and
  `BOT_MODE` updated to `webhook`.
