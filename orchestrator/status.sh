#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load .env
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

# Returns 0 if the report file exists and contains a PASS verdict.
# Handles all format variants produced by the pipeline agents.
report_passed() {
  local file="$1"
  [ -f "$file" ] || return 1
  grep -qi "PASS" "$file" || return 1
  # If the file has a hard FAIL title/verdict line it's a FAIL report
  grep -qiE "^# .* — FAIL$|\*\*(Verdict|Result)[^P\n]*FAIL" "$file" && return 1
  return 0
}

# ── Args ──────────────────────────────────────────────────────────────────────
PHASE="1"
for arg in "$@"; do
  case $arg in
    --phase=*) PHASE="${arg#*=}" ;;
    --phase) PHASE="${2}"; shift ;;
  esac
done

PIPELINE_DIR="$REPO_ROOT/pipeline/phase-$PHASE"
MANIFEST="$PIPELINE_DIR/task-manifest.json"

# ── Read manifest ──────────────────────────────────────────────────────────────
if [ ! -f "$MANIFEST" ]; then
  TEXT="❌ Phase $PHASE has not started — no task manifest found."
  echo "$TEXT"
  exit 0
fi

TASK_IDS=$(python3 -c "
import json
data = json.load(open('$MANIFEST'))
tasks = data if isinstance(data, list) else data.get('tasks', [])
for t in tasks:
    if isinstance(t, dict):
        print(t['id'])
")

TASK_TITLES=$(python3 -c "
import json
data = json.load(open('$MANIFEST'))
tasks = data if isinstance(data, list) else data.get('tasks', [])
for t in tasks:
    if isinstance(t, dict):
        print(t['id'] + '|' + t['title'])
")

TOTAL=$(echo "$TASK_IDS" | wc -l | tr -d ' ')

# ── Assess each task ──────────────────────────────────────────────────────────
complete_tasks=()
running_task=""
running_title=""
remaining_tasks=()

while IFS= read -r task_id; do
  task_dir="$PIPELINE_DIR/$task_id"
  sec_report="$task_dir/security-report.md"
  test_report="$task_dir/test-report.md"

  sec_pass=false
  test_pass=false

  report_passed "$sec_report" && sec_pass=true || true
  report_passed "$test_report" && test_pass=true || true

  if [ "$sec_pass" = true ] && [ "$test_pass" = true ]; then
    complete_tasks+=("$task_id")
  elif [ -f "$task_dir/dev-output.md" ] && [ "$test_pass" = false ]; then
    if [ -z "$running_task" ]; then
      running_task="$task_id"
      running_title=$(echo "$TASK_TITLES" | grep "^${task_id}|" | cut -d'|' -f2-)
    fi
    remaining_tasks+=("$task_id")
  else
    remaining_tasks+=("$task_id")
  fi
done <<< "$TASK_IDS"

COMPLETE_COUNT=${#complete_tasks[@]}

# ── Format message ─────────────────────────────────────────────────────────────
if [ "$COMPLETE_COUNT" -eq "$TOTAL" ]; then
  STATUS_LINE="✅ All $TOTAL tasks complete — awaiting Validator"
elif [ -n "$running_task" ]; then
  STATUS_LINE="⏳ Running: $running_task — $running_title"
else
  STATUS_LINE="⏸ No task currently active"
fi

REMAINING_LIST=$(IFS=', '; echo "${remaining_tasks[*]:-none}")

MESSAGE="🔄 Life OS Pipeline — Phase $PHASE Status
✅ Complete: $COMPLETE_COUNT/$TOTAL tasks
$STATUS_LINE
📋 Remaining: $REMAINING_LIST"

# ── Check recent token usage ──────────────────────────────────────────────────
RECENT_USAGE=""
for f in "$PIPELINE_DIR"/*/dev-output.md; do
  [ -f "$f" ] || continue
  usage=$(grep -iE "tokens?[: ]+[0-9]|input[_: ]+[0-9]+.*output" "$f" 2>/dev/null | tail -1 || true)
  if [ -n "$usage" ]; then
    RECENT_USAGE="$usage"
  fi
done

if [ -n "$RECENT_USAGE" ]; then
  MESSAGE="$MESSAGE
🔢 Last token usage: $RECENT_USAGE"
fi

echo "$MESSAGE"
