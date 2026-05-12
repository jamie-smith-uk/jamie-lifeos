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
- Line 72-80: `findPersonByNameForUpdate` uses `$1` and `$2` placeholders ✓
- Line 119-124: `createPerson` uses `$1-$4` placeholders ✓
- Line 155-164: `getPerson` uses `$1-$2` placeholders ✓
- Line 213-221: `updatePerson` uses `$1-$4` placeholders ✓
- Line 253-262: `getLapsedContacts` uses `$1` placeholder ✓
- Line 310-315: `logInteraction` INSERT uses `$1-$2` placeholders ✓
- Line 320-326: `logInteraction` UPDATE uses `$1` placeholder ✓

All SQL queries use parameterized statements. ✓

**Prompt injection — Label external content**
- No agent calls in this file. N/A

**Input validation — Validate all external input**
- Line 115-117: `createPerson` validates name is non-empty string ✓
- Line 150-152: `getPerson` validates name is non-empty string ✓
- Line 196-198: `updatePerson` validates name is non-empty string ✓
- Line 247-251: `getLapsedContacts` validates days_threshold is non-negative number ✓
- Line 296-298: `logInteraction` validates name is non-empty string ✓
- No length caps on string inputs (name, notes, relationship_type, how_known)

**FINDING 1**: Input validation missing length caps. The `name`, `notes`, `relationship_type`, and `how_known` parameters accept unbounded strings. An attacker could send extremely large strings causing memory exhaustion or database issues.

**Cron injection**
- No cron expressions in this file. N/A

### 4.2 Secrets and Credentials

**Env vars — Secrets in .env only**
- No hardcoded secrets, tokens, passwords, or keys. ✓

**Logging — Never log secrets**
- Line 127: logs `person_id` (safe) ✓
- Line 174: logs `person_id` (safe) ✓
- Line 224: logs `person_id` (safe) ✓
- Line 266-271: logs `count` and `days_threshold` (safe) ✓
- Line 330-335: logs `person_id` and `interaction_id` (safe) ✓
- No PII or secrets logged. ✓

**Agent exposure — Secrets never reach the agent**
- No agent calls in this file. N/A

**Git — No secrets in git history**
- No secrets in source code. N/A for this file

### 4.3 Authentication and Access

**Authentication — Validate identity on every handler**
- This is a tool module, not an external request handler. The `executePeopleTool` function is called by the orchestrator, which should handle authentication. This file doesn't need authentication checks. N/A

**Database — No agent-constructed SQL**
- All SQL is hardcoded in the tool functions. ✓

**MCP — OAuth tokens stored securely**
- No OAuth tokens in this file. N/A

**Admin UI — Not externally exposed**
- No admin UI in this file. N/A

### 4.4 Data Handling

**PII — No PII in logs**
- Line 127: logs `person_id` only (safe) ✓
- Line 174: logs `person_id` only (safe) ✓
- Line 224: logs `person_id` only (safe) ✓
- Line 266-271: logs count and threshold (safe) ✓
- Line 330-335: logs `person_id` and `interaction_id` (safe) ✓
- No person names, emails, or sensitive details logged. ✓

**External content — Label all external content as untrusted**
- No external API calls in this file. N/A

**Error messages — No stack traces in user-facing errors**
- Line 116, 151, 197, 249, 297: Return plain error messages ✓
- Line 136, 182, 232, 282, 352: Catch blocks return generic error messages, not stack traces ✓

**DB queries — Statement timeout enforced**
- This file uses `pool` from `@lifeos/shared`. I need to verify the pool configuration has statement_timeout set. Let me check the shared module.
[0m
[0m$ [0mfind /home/runner/work/jamie-lifeos/jamie-lifeos -name "*.ts" -o -name "*.js" | xargs grep -l "statement_timeout" | head -5
/home/runner/work/jamie-lifeos/jamie-lifeos/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/client.js
/home/runner/work/jamie-lifeos/jamie-lifeos/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/defaults.js
/home/runner/work/jamie-lifeos/jamie-lifeos/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/connection-parameters.js
/home/runner/work/jamie-lifeos/jamie-lifeos/node_modules/.pnpm/@types+pg@8.20.0/node_modules/@types/pg/index.d.ts
/home/runner/work/jamie-lifeos/jamie-lifeos/node_modules/.pnpm/@types+pg@8.20.0/node_modules/@types/pg/lib/connection-parameters.d.ts
xargs: grep: terminated by signal 13
[0m
Let me check the shared module where the pool is created:
[0m$ [0mfind /home/runner/work/jamie-lifeos/jamie-lifeos/packages -name "*.ts" | xargs grep -l "new Pool\|createPool" | grep -v node_modules
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/db.ts
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/dist/db.d.ts
[0m
[0m→ [0mRead packages/shared/src/db.ts
Good! The pool has `statement_timeout: 30_000` set on line 28. ✓

### 4.5 Dependency Security

**Audit — Zero high or critical vulnerabilities**
- Not applicable to code review; would be checked at build time.

**Pinning — All dependencies pinned to exact versions**
- Not applicable to this file; would be checked in package.json.

**Minimal surface — No unjustified new dependencies**
- Not applicable to this file; would be checked in package.json.

---

## Summary

I found **ONE SECURITY VIOLATION**:

**FINDING 1: Missing input length validation**
- **Rule violated**: 4.1 Input validation — Validate all external input
- **Files affected**: packages/orchestrator/src/tools/people.ts
- **Lines**: 115-117 (createPerson), 150-152 (getPerson), 196-198 (updatePerson), 296-298 (logInteraction)
- **Description**: String parameters (`name`, `notes`, `relationship_type`, `how_known`) are validated for non-empty but have no maximum length constraints. An attacker could send extremely large strings (megabytes or gigabytes) causing memory exhaustion, database resource exhaustion, or denial of service.
- **Required fix**: Add maximum length validation to all string inputs. Recommended caps: `name` max 255 chars, `notes` max 10,000 chars, `relationship_type` max 100 chars, `how_known` max 500 chars. Validate in each function before processing.

Now I'll write the security report:
[0m
[0m← [0mWrite pipeline/phase-3/task-4a/security-report.md
Wrote file successfully.
[0m
**SECURITY REPORT COMPLETE — FAIL**

I have identified **one security violation** in the code for task-4a:

### Critical Finding: Missing Input Length Validation

The `logInteraction` function (and all other tool functions in people.ts) accept string parameters without maximum length constraints. This violates rule **4.1 Input validation — Validate all external input**.

**The violation:**
- Lines 115-117, 150-152, 196-198, 296-298: String inputs (`name`, `notes`, `relationship_type`, `how_known`) are checked for non-empty but have no length caps
- An attacker could send megabyte-sized strings causing memory exhaustion or database denial of service

**Required fix:**
Add maximum length validation for all string inputs:
- `name`: max 255 chars
- `notes`: max 10,000 chars  
- `relationship_type`: max 100 chars
- `how_known`: max 500 chars

Validate in each function immediately after JSON parsing and return a JSON error if any string exceeds its cap.

The security report has been written to `pipeline/phase-3/task-4a/security-report.md`.
