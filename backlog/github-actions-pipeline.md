---
title: Move pipeline execution to GitHub Actions
security_sensitive: false
complexity: low
files:
  - orchestrator/run-phase.sh
  - .github/workflows/agent-pipeline.yml
criteria:
  - run-phase.sh exits cleanly after AG-02 Reviewer when ARCHITECT_ONLY=1 is set, before wait_for_approval() is called
  - run-phase.sh skips AG-01, AG-02, and wait_for_approval() when SKIP_ARCHITECT=1 is set, proceeding directly to the task loop — and halts if task-manifest.json is missing
  - .github/workflows/agent-pipeline.yml exists and is valid YAML with three jobs: architect, approve, implement
  - The workflow triggers on issues labeled "agent-ready" and on workflow_dispatch with a phase input
  - The architect job runs with ARCHITECT_ONLY=1 and uploads pipeline/ as a GitHub artifact
  - The approve job declares environment: pipeline-approval, causing GitHub to pause for manual approval
  - The implement job downloads the pipeline artifact, then runs run-phase.sh with SKIP_ARCHITECT=1
  - The implement job has a PostgreSQL service container using the env vars from .env.example
  - All secrets (ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_CHAT_ID, POSTGRES_PASSWORD, TODOIST_API_TOKEN) are referenced as ${{ secrets.X }} — never hardcoded
  - The implement job commits and pushes any changed files back to the repo on success
  - The workflow sends a Telegram notification on completion (success or failure) with a link to the Actions run
---

## Context

The pipeline currently runs as a blocking process in the developer's terminal
(orchestrator/run-phase.sh). This means the machine must stay on for the
entire duration of a phase. We want to move execution to GitHub Actions so the
pipeline runs on GitHub's infrastructure and the developer's machine can be off.

The human approval gate (currently wait_for_approval() polling for approval.json,
and telegram-gate.sh doing a 24-hour long-poll) is replaced by a GitHub
Environment named "pipeline-approval". GitHub natively pauses the workflow and
sends a notification when a job requires environment approval. No Telegram
reply needed — the developer approves with one click in the GitHub Actions UI.

Telegram is still used for notifications (pipeline started, manifest ready,
pipeline complete/failed) but NOT for the approval gate.

## Exact changes required

### 1. orchestrator/run-phase.sh — add two flags

The file already has a PIPELINE_LIB_ONLY guard at the bottom of the functions
block (around line 624):

  [[ "${PIPELINE_LIB_ONLY:-}" == "1" ]] && return 0 2>/dev/null || true

Add ARCHITECT_ONLY and SKIP_ARCHITECT handling in the main execution section.

**ARCHITECT_ONLY=1**

Insert immediately after the AG-02 Reviewer block completes and
reviewer-summary.md is confirmed to exist (around line 956, before the
"# ── Human gate ──" comment):

  if [[ "${ARCHITECT_ONLY:-}" == "1" ]]; then
    log "ARCHITECT_ONLY=1 — planning complete, exiting before human gate"
    log "Manifest and reviewer summary written to $PIPELINE_DIR/"
    exit 0
  fi

**SKIP_ARCHITECT=1**

Insert immediately after the phase gate check (around line 638, after the
previous-phase validation block, before "# ── Header ──"):

  if [[ "${SKIP_ARCHITECT:-}" == "1" ]]; then
    log "SKIP_ARCHITECT=1 — skipping AG-01, AG-02, and human gate"
    if [ ! -f "$PIPELINE_DIR/task-manifest.json" ]; then
      halt "task-manifest.json not found" "orchestrator" \
        "SKIP_ARCHITECT=1 requires task-manifest.json to already exist in $PIPELINE_DIR/"
    fi
    log "task-manifest.json found — proceeding to task execution"
    # Jump to task loop: the code below will handle the rest
  fi

Then wrap the entire AG-01 through human-gate section (from the Header comment
through the end of the changes revision loop) in:

  if [[ "${SKIP_ARCHITECT:-}" != "1" ]]; then
    # ... existing AG-01, AG-02, human gate, and changes loop code ...
  fi

### 2. .github/workflows/agent-pipeline.yml — the workflow file

The file has already been written to .github/workflows/agent-pipeline.yml.
Verify it is present and valid YAML. Do not overwrite it unless it is missing
or malformed.

If it needs to be created, the structure is:

  name: Agent Pipeline
  on:
    issues:
      types: [labeled]
    workflow_dispatch:
      inputs:
        phase: { description: "Phase number", required: true, default: "1" }

  jobs:
    architect:
      runs-on: ubuntu-latest
      if: label is "agent-ready" or workflow_dispatch
      services:
        postgres: { image: postgres:16, env: POSTGRES_USER/PASSWORD/DB, ports: 5432 }
      steps:
        - checkout, setup-node@v4 (node 20), pnpm install, install opencode-ai
        - run: ARCHITECT_ONLY=1 ./orchestrator/run-phase.sh --phase $PHASE
          env: ANTHROPIC_API_KEY, DATABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_CHAT_ID
        - send Telegram message: "Manifest ready. Approve at: $RUN_URL"
        - upload-artifact: path pipeline/, name pipeline-phase-N

    approve:
      needs: architect
      runs-on: ubuntu-latest
      environment: pipeline-approval    # GitHub pauses here for manual approval
      steps:
        - run: echo "Approved"

    implement:
      needs: [architect, approve]
      runs-on: ubuntu-latest
      timeout-minutes: 340
      services:
        postgres: { same as architect job }
      steps:
        - checkout, setup-node, pnpm install, install opencode-ai
        - download-artifact: pipeline-phase-N → path pipeline/
        - run pnpm migrations if available
        - run: SKIP_ARCHITECT=1 ./orchestrator/run-phase.sh --phase $PHASE
          env: all secrets + DATABASE_URL constructed from POSTGRES_* vars
        - git config + git add -A + git commit + git push (on success)
        - send Telegram: "✅ Phase N complete" or "❌ Phase N failed — $RUN_URL" (always)

## What NOT to change

- Do not modify run-task.sh — it is not involved in this change
- Do not modify telegram-gate.sh — it is no longer called from the GitHub
  Actions flow, but keep it in place for local use
- Do not modify any agent files in .opencode/agents/
- Do not change the wait_for_approval() function — it remains intact for
  local runs (where approval.json is still written by approve.sh)
- Do not add tests — this is infrastructure/config, not application logic
