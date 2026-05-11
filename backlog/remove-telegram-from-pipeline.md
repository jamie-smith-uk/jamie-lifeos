---
title: Remove Telegram from build pipeline notifications
security_sensitive: false
complexity: low
files:
  - orchestrator/status.sh
  - orchestrator/telegram-gate.sh
  - .github/workflows/agent-pipeline.yml
criteria:
  - orchestrator/status.sh sends no curl requests to Telegram — both sendMessage calls are removed
  - orchestrator/status.sh still prints status to stdout (the echo lines are kept)
  - orchestrator/status.sh no longer references TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_CHAT_ID
  - orchestrator/telegram-gate.sh is moved to orchestrator/_archive/telegram-gate.sh
  - .github/workflows/agent-pipeline.yml has no "Notify Telegram" steps in the architect job
  - .github/workflows/agent-pipeline.yml has no "Notify Telegram" steps in the implement job
  - TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID are removed from the architect job env block
  - TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID are removed from the implement job env block
  - packages/bot/ is untouched — application Telegram code is not affected
  - .env.example TELEGRAM_* entries remain but gain a comment: "# Used by packages/bot only — not used by the build pipeline"
---

## Context

The LifeOS application uses Telegram as its user-facing interface (packages/bot/).
The build pipeline (orchestrator/) also sends Telegram notifications — for pipeline
status, manifest-ready alerts, and completion messages. This creates noise in the
same Telegram channel where real application interactions happen.

The approval gate has already been replaced by a GitHub Environment (pipeline-approval),
so Telegram is no longer needed for that. The remaining Telegram calls in the build
pipeline are pure notifications, and GitHub Actions provides those natively via email
and the Actions UI.

Remove all Telegram calls from the build pipeline. Leave the application Telegram code
(packages/bot/) completely untouched.

## Exact changes required

### 1. orchestrator/status.sh — remove two curl calls

**First removal (around line 40):**

Remove this block:
```bash
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "text=$TEXT" \
    -d "chat_id=${TELEGRAM_ALLOWED_CHAT_ID}" > /dev/null
```

Keep the `echo "$TEXT"` and `exit 0` lines immediately after it. The full block
before and after should look like:

```bash
if [ ! -f "$MANIFEST" ]; then
  TEXT="❌ Phase $PHASE has not started — no task manifest found."
  echo "$TEXT"
  exit 0
fi
```

**Second removal (around line 130):**

Remove the entire "Send to Telegram" section:
```bash
# ── Send to Telegram ──────────────────────────────────────────────────────────
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "text=$MESSAGE" \
  -d "chat_id=${TELEGRAM_ALLOWED_CHAT_ID}" > /dev/null
```

Keep the `echo "$MESSAGE"` line that follows it. The file should end with:
```bash
echo "$MESSAGE"
```

### 2. orchestrator/telegram-gate.sh — archive

Move the file:
```bash
mkdir -p orchestrator/_archive
git mv orchestrator/telegram-gate.sh orchestrator/_archive/telegram-gate.sh
```

Do not delete it — it may be useful for reference if local Telegram-gated approval
is ever wanted again.

### 3. .github/workflows/agent-pipeline.yml — remove Telegram steps and env vars

**In the architect job:**

Remove these two lines from the `env` block under "Run AG-01 Architect + AG-02 Reviewer":
```yaml
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_ALLOWED_CHAT_ID: ${{ secrets.TELEGRAM_ALLOWED_CHAT_ID }}
```

Remove the entire "Notify Telegram — manifest ready" step:
```yaml
      - name: Notify Telegram — manifest ready
        if: success()
        run: |
          RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          MESSAGE="Life OS pipeline — Phase ${PHASE} manifest ready.%0AApprove at: ${RUN_URL}"
          curl -s -X POST \
            "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d "chat_id=${{ secrets.TELEGRAM_ALLOWED_CHAT_ID }}&text=${MESSAGE}"
```

**In the implement job:**

Remove these two lines from the `env` block under "Run implementation (AG-03 → AG-08)":
```yaml
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_ALLOWED_CHAT_ID: ${{ secrets.TELEGRAM_ALLOWED_CHAT_ID }}
```

Remove the entire "Notify Telegram — success" step:
```yaml
      - name: Notify Telegram — success
        if: success()
        run: |
          RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          MESSAGE="Life OS pipeline — Phase ${PHASE} complete.%0ARun: ${RUN_URL}"
          curl -s -X POST \
            "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d "chat_id=${{ secrets.TELEGRAM_ALLOWED_CHAT_ID }}&text=${MESSAGE}"
```

Remove the entire "Notify Telegram — failure" step:
```yaml
      - name: Notify Telegram — failure
        if: failure()
        run: |
          RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          MESSAGE="Life OS pipeline — Phase ${PHASE} FAILED.%0ASee: ${RUN_URL}"
          curl -s -X POST \
            "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d "chat_id=${{ secrets.TELEGRAM_ALLOWED_CHAT_ID }}&text=${MESSAGE}"
```

Also update the comment on the architect job from:
```yaml
  # Runs AG-01 + AG-02, uploads the pipeline/ artifact, then sends a Telegram
  # notification with a link to the Actions run so the developer can approve.
```
to:
```yaml
  # Runs AG-01 + AG-02 and uploads the pipeline/ artifact.
  # GitHub sends an approval notification via the pipeline-approval environment.
```

And update the comment on the implement job from:
```yaml
  # Downloads the pipeline artifact, runs the full task loop (AG-03 through
  # AG-08), commits results back to the repo, and sends a Telegram notification.
```
to:
```yaml
  # Downloads the pipeline artifact, runs the full task loop (AG-03 through
  # AG-08), and commits results back to the repo.
```

### 4. .env.example — annotate TELEGRAM vars

Replace:
```
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here
```

With:
```
# Telegram — used by packages/bot only; not used by the build pipeline
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here
```

## What NOT to change

- Do not touch anything in packages/bot/ — that is the application's Telegram integration
- Do not remove TELEGRAM_* vars from .env.example — the app still needs them
- Do not remove wait_for_approval() from run-phase.sh — it is still used for local runs
- Do not remove approve.sh — it is still used for local approval
- Do not add tests — this is configuration cleanup, not application logic
