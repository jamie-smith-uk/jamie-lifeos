[0m
> ag-07-security · claude-haiku-4-5-20251001
[0m
I'll review the code for task-4a against the security ruleset. Let me start by reading the files in scope and the security rules.
[0m→ [0mRead packages/orchestrator/src/tools/people.ts
[0m→ [0mRead .opencode/agents/security-rules.md
Now I'll analyze the code against every rule in the security ruleset. Let me check each rule systematically:

## Analysis

### 4.1 Input and Injection

**SQL — Parameterised queries only**
- Line 72-80: `findPersonByNameForUpdate` uses parameterized queries with `$1` and `$2` ✓
- Line 119-124: `createPerson` uses parameterized queries with `$1-$4` ✓
- Line 155-164: `getPerson` uses parameterized queries with `$1-$2` ✓
- Line 213-221: `updatePerson` uses parameterized queries with `$1-$4` ✓
- Line 253-262: `getLapsedContacts` - **VIOLATION FOUND**
  - Line 257: `WHERE last_interaction_at IS NULL OR last_interaction_at < (now() - interval '${days_threshold} days')`
  - This uses string interpolation with `${days_threshold}` directly in the SQL query, not a parameterized placeholder
  - This is SQL injection vulnerability

**Prompt injection — Label external content**
- No agent calls in this file ✓

**Input validation — Validate all external input**
- Line 296-298: `logInteraction` validates name is non-empty ✓
- Line 115-117: `createPerson` validates name is non-empty ✓
- Line 150-152: `getPerson` validates name is non-empty ✓
- Line 196-198: `updatePerson` validates name is non-empty ✓
- Line 247-251: `getLapsedContacts` validates days_threshold is non-negative number ✓
- No length caps on string inputs (name, notes) - but this may be acceptable if DB constraints exist

**Cron injection**
- Not applicable to this file ✓

### 4.2 Secrets and Credentials

**Env vars — Secrets in .env only**
- No hardcoded secrets found ✓

**Logging — Never log secrets**
- Line 127: logs `person_id` and `name` - **VIOLATION FOUND**
  - Rule 4.4 states: "People names, email addresses, phone numbers, calendar event details must not appear in logs"
  - Line 127 logs `name: person.name`
- Line 174: logs `name: person.name` - **VIOLATION FOUND**
- Line 224: logs `name: updatedPerson.name` - **VIOLATION FOUND**
- Line 330-336: logs `name: updatedPerson.name` - **VIOLATION FOUND**

**Agent exposure — Secrets never reach the agent**
- No agent calls in this file ✓

**Git — No secrets in git history**
- Not applicable to code review ✓

### 4.3 Authentication and Access

**Authentication — Validate identity on every handler**
- `executePeopleTool` (line 364) is the external handler but has no authentication check
- However, this appears to be an internal tool executor, not an external HTTP handler
- Need to verify if this requires authentication - the task spec doesn't indicate external exposure

**Database — No agent-constructed SQL**
- All SQL is constructed by the code, not by agents ✓

**MCP — OAuth tokens**
- Not applicable ✓

**Admin UI — Not externally exposed**
- Not applicable ✓

### 4.4 Data Handling

**PII — No PII in logs**
- Line 127: `log.info({ person_id: person.id, name: person.name }, ...)` - **VIOLATION**
- Line 174: `log.info({ person_id: person.id, name: person.name }, ...)` - **VIOLATION**
- Line 224: `log.info({ person_id: updatedPerson.id, name: updatedPerson.name }, ...)` - **VIOLATION**
- Line 330-336: `log.info({ person_id: updatedPerson.id, name: updatedPerson.name, ... }, ...)` - **VIOLATION**

**External content — Label as untrusted**
- Not applicable ✓

**Error messages — No stack traces**
- Line 135-136: `log.error({ err: String(err) }, ...)` and returns generic error - ✓
- Line 181-182: Same pattern ✓
- Line 232-233: Same pattern ✓
- Line 281-282: Same pattern ✓
- Line 352-353: Same pattern ✓

**DB queries — Statement timeout enforced**
- This is a pool configuration issue, not visible in this file
- Need to check if pool has statement_timeout set

Let me check the pool configuration:
[0m
[0m$ [0mfind /home/runner/work/jamie-lifeos/jamie-lifeos -name "*.ts" -o -name "*.js" | xargs grep -l "pool.*statement_timeout\|statement_timeout.*pool" 2>/dev/null | head -5
(no output)
[0m
[0m$ [0mgrep -r "new Pool\|createPool" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared --include="*.ts" 2>/dev/null
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/db.ts:function createPool(): Pool {
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/db.ts:  return new Pool({
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/db.ts: * connection instead of creating a new Pool.
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/db.ts:export const pool: Pool = createPool();
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/dist/db.d.ts: * connection instead of creating a new Pool.
[0m
[0m→ [0mRead packages/shared/src/db.ts
Good - statement_timeout is set at line 28. Now let me verify the SQL injection issue more carefully and create the security report.

### 4.5 Dependency Security

- Not applicable to code review of this file ✓

## Summary of Violations Found

1. **SQL Injection in getLapsedContacts (Line 257)** - Rule 4.1 "SQL — Parameterised queries only"
   - Uses string interpolation `${days_threshold}` instead of parameterized placeholder

2. **PII in Logs (Lines 127, 174, 224, 330-336)** - Rule 4.4 "PII — No PII in logs"
   - Person names logged in multiple locations

Now I'll write the security report:
[0m
[0m← [0mWrite pipeline/phase-3/task-4a/security-report.md
Wrote file successfully.
[0m
## Security Review Complete — FAIL

I have completed the security audit for task-4a and written the report to `pipeline/phase-3/task-4a/security-report.md`.

### Summary

**Status: FAIL** — 2 critical security violations found:

1. **SQL Injection (Line 257)** — Rule 4.1 violation
   - `getLapsedContacts` uses string interpolation `${days_threshold}` instead of parameterized query
   - Must replace with `$1` placeholder and pass value in parameters array

2. **PII in Logs (Lines 127, 174, 224, 330-336)** — Rule 4.4 violation
   - Person names logged in 4 separate log statements
   - Must remove `name` field from all log calls to comply with PII protection rule

Both violations must be fixed before this task can pass security review. The Developer must address these findings and resubmit for validation.
