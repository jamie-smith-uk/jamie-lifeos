# Test Report — T-22: Railway service configuration and deployment

**Result: FAIL**
**Date:** 2026-04-20
**Tester:** AG-05

---

## Summary

| Acceptance Criterion | Tests | Pass | Fail | Status |
|---|---|---|---|---|
| AC-1: Both services deploy to Railway without build errors | 24 | 0 | 24 | FAIL |
| AC-2: Bot reaches orchestrator via ORCHESTRATOR_URL on Railway private network | 4 | 0 | 4 | FAIL |
| AC-3: All environment variables documented in .env.example | 13 | 13 | 0 | PASS |
| AC-4: No .env files committed to repository | 6 | 6 | 0 | PASS |
| **Total** | **47** | **19** | **28** | **FAIL** |

---

## Test File

`pipeline/phase-1/T-22/t22.test.mjs`  
Run with: `node --test pipeline/phase-1/T-22/t22.test.mjs`

---

## Failing Criteria

### AC-1: Both services deploy to Railway without build errors — FAIL

**Root cause:** Three required files are absent from the working tree on disk:
- `railway.json` — not present (not at repo root)
- `packages/bot/Dockerfile` — not present
- `packages/orchestrator/Dockerfile` — not present

The developer agent recorded writing these files in `dev-output.md`, and they appeared in `git status` as untracked (`??`) at the time of the security review. They are no longer present on disk and have never been committed to git (`git ls-files` returns nothing for them). The `.env.example` update also appears to have been partially reverted — the file on disk is 762 bytes (minimal version) rather than the 4956-byte documented version, though the minimal version does satisfy AC-3.

**Failing tests:**

```
✖ railway.json exists at the repository root
  AssertionError: railway.json not found at repo root

✖ railway.json parses as valid JSON
  Error: File not found: railway.json

✖ railway.json declares a 'bot' service
  Error: File not found: railway.json

✖ railway.json declares an 'orchestrator' service
  Error: File not found: railway.json

✖ bot service uses DOCKERFILE builder
  Error: File not found: railway.json

✖ orchestrator service uses DOCKERFILE builder
  Error: File not found: railway.json

✖ bot Dockerfile path in railway.json points to existing file
  Error: File not found: railway.json

✖ orchestrator Dockerfile path in railway.json points to existing file
  Error: File not found: railway.json

✖ packages/bot/Dockerfile exists
  AssertionError: packages/bot/Dockerfile not found

✖ packages/orchestrator/Dockerfile exists
  AssertionError: packages/orchestrator/Dockerfile not found

✖ bot Dockerfile uses node:20-alpine base image
  Error: File not found: packages/bot/Dockerfile

✖ orchestrator Dockerfile uses node:20-alpine base image
  Error: File not found: packages/orchestrator/Dockerfile

✖ bot Dockerfile is a multi-stage build (has AS builder stage)
  Error: File not found: packages/bot/Dockerfile

✖ orchestrator Dockerfile is a multi-stage build (has AS builder stage)
  Error: File not found: packages/orchestrator/Dockerfile

✖ bot Dockerfile runs pnpm install --frozen-lockfile
  Error: File not found: packages/bot/Dockerfile

✖ orchestrator Dockerfile runs pnpm install --frozen-lockfile
  Error: File not found: packages/orchestrator/Dockerfile

✖ bot Dockerfile CMD starts the bot service
  Error: File not found: packages/bot/Dockerfile

✖ orchestrator Dockerfile CMD starts the orchestrator service
  Error: File not found: packages/orchestrator/Dockerfile

✖ bot Dockerfile build context is set to '.' (monorepo root) in railway.json
  Error: File not found: railway.json

✖ orchestrator Dockerfile build context is set to '.' (monorepo root) in railway.json
  Error: File not found: railway.json

✖ bot Dockerfile runs as non-root user
  Error: File not found: packages/bot/Dockerfile

✖ orchestrator Dockerfile runs as non-root user
  Error: File not found: packages/orchestrator/Dockerfile

✖ orchestrator service has restart policy ON_FAILURE in railway.json
  Error: File not found: railway.json

✖ bot service has restart policy ON_FAILURE in railway.json
  Error: File not found: railway.json
```

### AC-2: Bot service can reach orchestrator via ORCHESTRATOR_URL on Railway private network — FAIL

**Root cause:** All 4 tests depend on `railway.json`, which is absent from disk.

**Failing tests:**

```
✖ bot service variables include ORCHESTRATOR_URL in railway.json
  Error: File not found: railway.json

✖ ORCHESTRATOR_URL value references orchestrator Railway private domain
  Error: File not found: railway.json

✖ orchestrator service exposes healthcheck endpoint in railway.json
  Error: File not found: railway.json

✖ orchestrator service sets PORT variable in railway.json
  Error: File not found: railway.json
```

---

## Passing Criteria

### AC-3: All environment variables documented in .env.example — PASS

All 13 tests pass. The `.env.example` on disk contains `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `ANTHROPIC_API_KEY`, and `ORCHESTRATOR_URL`, each with a preceding comment line. Both `DATABASE_URL` (postgresql:// scheme) and `ORCHESTRATOR_URL` (http scheme with localhost default) are correctly formatted.

```
✔ .env.example file exists
✔ .env.example defines DATABASE_URL
✔ .env.example has a description comment for DATABASE_URL
✔ .env.example defines TELEGRAM_BOT_TOKEN
✔ .env.example has a description comment for TELEGRAM_BOT_TOKEN
✔ .env.example defines TELEGRAM_ALLOWED_CHAT_ID
✔ .env.example has a description comment for TELEGRAM_ALLOWED_CHAT_ID
✔ .env.example defines ANTHROPIC_API_KEY
✔ .env.example has a description comment for ANTHROPIC_API_KEY
✔ .env.example defines ORCHESTRATOR_URL
✔ .env.example has a description comment for ORCHESTRATOR_URL
✔ .env.example DATABASE_URL uses postgresql:// scheme
✔ .env.example ORCHESTRATOR_URL uses http scheme and localhost default
```

### AC-4: No .env files committed to repository — PASS

All 6 tests pass. `.gitignore` ignores `.env` and `.env.*` with a `!.env.example` exception. `git ls-files` confirms only `.env.example` is tracked; no populated `.env` file is committed.

```
✔ .gitignore exists and ignores .env files
✔ .gitignore ignores .env.* variants
✔ .gitignore explicitly excludes .env.example from gitignore
✔ no .env files (other than .env.example) are tracked by git
✔ .env.example is tracked by git (it should be committed)
✔ no .env file exists at the repository root committed to git
```

---

## What needs to be fixed

The developer must re-create (or restore) the three missing files and ensure they are present on disk before re-running tests:

1. **`railway.json`** — Root-level Railway project configuration declaring `bot` and `orchestrator` services with DOCKERFILE builder, correct `dockerfilePath`, `buildContext: "."`, `restartPolicyType: "ON_FAILURE"`, and `ORCHESTRATOR_URL: "${{orchestrator.RAILWAY_PRIVATE_DOMAIN}}"` in the bot service variables.

2. **`packages/bot/Dockerfile`** — Multi-stage build (`AS builder` + runtime stage), `FROM node:20-alpine`, `pnpm install --frozen-lockfile`, `CMD ["node", "packages/bot/dist/index.js"]`, non-root user.

3. **`packages/orchestrator/Dockerfile`** — Same pattern as bot, with `CMD ["node", "packages/orchestrator/dist/index.js"]`, `EXPOSE 3001`, non-root user, and migration files copied.

These files were authored by the developer (contents recorded in `dev-output.md`) but are no longer present on disk and have never been committed. The fix is to recreate them and commit.

---

## Raw test output

```
▶ AC-1: Railway and Dockerfile configuration is valid for deployment
  ✖ railway.json exists at the repository root (1.168583ms)
  ✖ railway.json parses as valid JSON (0.06975ms)
  ✖ railway.json declares a 'bot' service (0.055083ms)
  ✖ railway.json declares an 'orchestrator' service (0.057875ms)
  ✖ bot service uses DOCKERFILE builder (0.045666ms)
  ✖ orchestrator service uses DOCKERFILE builder (0.040125ms)
  ✖ bot Dockerfile path in railway.json points to existing file (0.039542ms)
  ✖ orchestrator Dockerfile path in railway.json points to existing file (0.049791ms)
  ✖ packages/bot/Dockerfile exists (0.083458ms)
  ✖ packages/orchestrator/Dockerfile exists (0.096459ms)
  ✖ bot Dockerfile uses node:20-alpine base image (0.107708ms)
  ✖ orchestrator Dockerfile uses node:20-alpine base image (0.049ms)
  ✖ bot Dockerfile is a multi-stage build (has AS builder stage) (0.029291ms)
  ✖ orchestrator Dockerfile is a multi-stage build (has AS builder stage) (0.030125ms)
  ✖ bot Dockerfile runs pnpm install --frozen-lockfile (0.044375ms)
  ✖ orchestrator Dockerfile runs pnpm install --frozen-lockfile (0.04225ms)
  ✖ bot Dockerfile CMD starts the bot service (0.045375ms)
  ✖ orchestrator Dockerfile CMD starts the orchestrator service (0.044083ms)
  ✖ bot Dockerfile build context is set to '.' (monorepo root) in railway.json (0.04ms)
  ✖ orchestrator Dockerfile build context is set to '.' (monorepo root) in railway.json (0.037417ms)
  ✖ bot Dockerfile runs as non-root user (0.037917ms)
  ✖ orchestrator Dockerfile runs as non-root user (0.045584ms)
  ✖ orchestrator service has restart policy ON_FAILURE in railway.json (0.048209ms)
  ✖ bot service has restart policy ON_FAILURE in railway.json (0.047625ms)
✖ AC-1: Railway and Dockerfile configuration is valid for deployment (3.0955ms)
▶ AC-2: Bot service ORCHESTRATOR_URL references Railway private network
  ✖ bot service variables include ORCHESTRATOR_URL in railway.json (0.072917ms)
  ✖ ORCHESTRATOR_URL value references orchestrator Railway private domain (0.05125ms)
  ✖ orchestrator service exposes healthcheck endpoint in railway.json (0.053459ms)
  ✖ orchestrator service sets PORT variable in railway.json (0.04375ms)
✖ AC-2: Bot service ORCHESTRATOR_URL references Railway private network (0.277792ms)
▶ AC-3: Required environment variables are documented in .env.example
  ✔ .env.example file exists (0.065292ms)
  ✔ .env.example defines DATABASE_URL (0.435166ms)
  ✔ .env.example has a description comment for DATABASE_URL (0.102625ms)
  ✔ .env.example defines TELEGRAM_BOT_TOKEN (0.061666ms)
  ✔ .env.example has a description comment for TELEGRAM_BOT_TOKEN (0.050875ms)
  ✔ .env.example defines TELEGRAM_ALLOWED_CHAT_ID (0.062291ms)
  ✔ .env.example has a description comment for TELEGRAM_ALLOWED_CHAT_ID (0.049459ms)
  ✔ .env.example defines ANTHROPIC_API_KEY (0.056292ms)
  ✔ .env.example has a description comment for ANTHROPIC_API_KEY (0.04725ms)
  ✔ .env.example defines ORCHESTRATOR_URL (0.050292ms)
  ✔ .env.example has a description comment for ORCHESTRATOR_URL (0.044667ms)
  ✔ .env.example DATABASE_URL uses postgresql:// scheme (0.045958ms)
  ✔ .env.example ORCHESTRATOR_URL uses http scheme and localhost default (0.0495ms)
✔ AC-3: Required environment variables are documented in .env.example (1.260458ms)
▶ AC-4: No .env files are committed to the repository
  ✔ .gitignore exists and ignores .env files (0.104625ms)
  ✔ .gitignore ignores .env.* variants (0.108ms)
  ✔ .gitignore explicitly excludes .env.example from gitignore (0.065333ms)
  ✔ no .env files (other than .env.example) are tracked by git (37.818958ms)
  ✔ .env.example is tracked by git (it should be committed) (27.269084ms)
  ✔ no .env file exists at the repository root committed to git (26.852375ms)
✔ AC-4: No .env files are committed to the repository (92.3235ms)
ℹ tests 47
ℹ suites 4
ℹ pass 19
ℹ fail 28
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 186.753125
```
