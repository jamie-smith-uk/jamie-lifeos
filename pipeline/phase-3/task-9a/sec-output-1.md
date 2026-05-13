[0m
> ag-07-security · claude-haiku-4-5-20251001
[0m
I'll begin by reading the security rules and then reviewing the file in scope.
[0m→ [0mRead .opencode/agents/security-rules.md
[0m→ [0mRead packages/orchestrator/src/tools/people.ts
Now I'll check the self-assessment.md file to understand what changes were made:
[0m
[0m$ [0mfind /home/runner/work/jamie-lifeos/jamie-lifeos -name "self-assessment.md" -path "*/task-9a/*" 2>/dev/null
/home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-3/task-9a/self-assessment.md
[0m
[0m→ [0mRead pipeline/phase-3/task-9a/self-assessment.md
Now let me verify the database schema to understand the life_events table structure and any constraints:
[0m
[0m$ [0mfind /home/runner/work/jamie-lifeos/jamie-lifeos -name "*.sql" -type f | head -20
/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/001_people.sql
/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/004_update_people_interactions.sql
/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/003_nudges.sql
/home/runner/work/jamie-lifeos/jamie-lifeos/migrations/002_life_events.sql
/home/runner/work/jamie-lifeos/jamie-lifeos/db/migrations/0001_init.sql
[0m
[0m→ [0mRead migrations/002_life_events.sql
Now let me check the agent.ts file to see if the get_person tool is properly labeled as untrusted content:
[0m
[0m$ [0mgrep -n "get_person\|untrusted" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts | head -40
412: * Task-1 (Phase 2): People tools added — create_person, get_person,
444:    name: "get_person",
692:  "get_person",
724: * Determines if a tool's results should be wrapped in <untrusted> tags.
729: * @returns         True if the tool returns untrusted content.
1253:        // Security: Wrap external tool results in <untrusted> tags
1256:          resultContent = `<untrusted>\n${resultContent}\n</untrusted>`;
[0m
[0m→ [0mRead packages/orchestrator/src/agent.ts[90m [offset=724, limit=50][0m
[0m
[0m$ [0mgrep -n "PEOPLE_TOOL_NAMES\|LIFE_EVENTS_TOOL_NAMES" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts | head -20
690:const PEOPLE_TOOL_NAMES = new Set<string>([
704:const LIFE_EVENTS_TOOL_NAMES = new Set<string>(["create_life_event", "get_upcoming_life_events"]);
736:    LIFE_EVENTS_TOOL_NAMES.has(toolName) ||
772:  if (PEOPLE_TOOL_NAMES.has(toolName)) {
777:  if (LIFE_EVENTS_TOOL_NAMES.has(toolName)) {
[0m
[0m→ [0mRead packages/orchestrator/src/agent.ts[90m [offset=690, limit=20][0m
Now I need to check if `get_person` is included in the untrusted tools check. Let me look at the isUntrustedTool function more carefully:
[0m
[0m$ [0mgrep -A 10 "function isUntrustedTool" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/agent.ts
function isUntrustedTool(toolName: string): boolean {
  return (
    GMAIL_TOOL_NAMES.has(toolName) ||
    TODOIST_TOOL_NAMES.has(toolName) ||
    CALENDAR_TOOL_NAMES.has(toolName) ||
    LIFE_EVENTS_TOOL_NAMES.has(toolName) ||
    NUDGES_TOOL_NAMES.has(toolName)
  );
}

/**
[0m
This is a critical finding. The `get_person` tool returns user-provided data (person names, notes, relationship types) and now also includes life events data from the database. According to the security rules (4.2 Prompt injection), all external content must be wrapped in `<untrusted>` tags before being passed to the agent. However, `get_person` is NOT included in the `isUntrustedTool` function.

Let me verify this is indeed a problem by checking what the build context says about this:

Looking at the build context from task-7a:
> **Security pattern for external tool results**: All tools that return external or user-provided data must be included in the untrusted content labeling condition at lines 1153-1157 in `agent.ts`. This includes database content that contains user input (person names, event details, notes, etc.).

The `get_person` function returns:
- `person.name` (user-provided data)
- `person.notes` (user-provided data)
- `person.relationship_type` (user-provided data)
- `person.how_known` (user-provided data)
- `life_events` array with user-provided notes

All of this is user-provided data that should be labeled as untrusted. However, `PEOPLE_TOOL_NAMES` is NOT included in the `isUntrustedTool` function.

Let me check if there's a recent change to agent.ts that might have addressed this:
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && git log --oneline -20 packages/orchestrator/src/agent.ts
7e737d6 feat(task-8): Add log_interaction tool definition to agent [skip ci]
1a0c96a wip(task-8): developer green — awaiting security+refactor [skip ci]
e286931 wip(task-7b): developer green — awaiting security+refactor [skip ci]
bfb1979 feat(task-7a): Add life events tool definitions to agent [skip ci]
0a55d5b wip(task-7a): developer green — awaiting security+refactor [skip ci]
100091d chore(pipeline): phase 2 pipeline summary [skip ci]
2448639 feat(task-5b): Integrate email implied actions with agent confirmation flows [skip ci]
ca18b4d wip(task-5b): developer green — awaiting security+refactor [skip ci]
8848d5b fix(lint): make packages/ pass biome check cleanly
d71ecf1 fix(pipeline): fix pnpm test --run flag and biome useLiteralKeys violations
5403b14 feat(task-4): Add Gmail tool definitions to agent
89fdd32 feat(task-3): Add Todoist tool definitions to agent
9b08d46 test: remove stale MCP-era gmail tests (superseded by OAuth2)
f649e9e feat: phase 1 complete — foundation built
38ab5dd chore: sync pipeline (run-task.sh, check-pipeline.sh, v2.1-v2.4 features)
be339f4 chore: sync pipeline from jamie-agent-pipeline (8 agents, metrics, context blocks)
266f58c feat: phase 1 T-08 and T-09 complete
[0m
Let me check the current state of the agent.ts file to see if PEOPLE_TOOL_NAMES should be in the untrusted check:
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && git diff HEAD~1 packages/orchestrator/src/agent.ts | head -100
(no output)
[0m
Let me check if there's a working directory with uncommitted changes:
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   packages/orchestrator/src/tools/__tests__/people.test.ts
	modified:   packages/orchestrator/src/tools/people.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	pipeline/phase-3/metrics.json
	pipeline/phase-3/task-9a/baseline-failures.txt
	pipeline/phase-3/task-9a/health-report.json
	pipeline/phase-3/task-9a/refactor-output.md
	pipeline/phase-3/task-9a/refactor-report.md
	pipeline/phase-3/task-9a/refactor-verified.txt
	pipeline/phase-3/task-9a/sec-output-1.md
	pipeline/phase-3/task-9a/security-attempts.txt
	pipeline/phase-3/task-9a/test-red-output.txt
	pipeline/phase-3/task-9a/tester-red-output.md
	pipeline/phase-3/task-9a/tests-written.txt

no changes added to commit (use "git add" and/or "git commit -a")
[0m
Good. The task only modified people.ts and people.test.ts. The agent.ts file is not in scope for this task. Let me verify the scope again from the task spec:

The task spec says:
```
"files_in_scope": [
  "packages/orchestrator/src/tools/people.ts"
]
```

So agent.ts is NOT in scope. According to my instructions:
> **Only report findings that can be fixed within the files listed in the task prompt.** Do not flag issues in files outside that list — those files are owned by other tasks and were reviewed separately. If you notice a concern in a file not in scope, note it as an observation in the sign-off section, but do not FAIL the report because of it.

Now let me perform a thorough security review of the people.ts file against all rules in security-rules.md:

## Security Rules Review Against people.ts

### 4.1 Input and Injection

**SQL — Parameterised queries only**
- Line 144-152: `findPersonByNameForUpdate` uses `$1` and `$2` placeholders ✓
- Line 216-220: `createPerson` uses `$1, $2, $3, $4` placeholders ✓
- Line 265-270: `getPerson` uses `$1` placeholder for life_events query ✓
- Line 320-327: `updatePerson` uses `$1, $2, $3, $4` placeholders ✓
- Line 360-368: `getLapsedContacts` uses `$1` placeholder ✓
- Line 419-423: `logInteraction` uses `$1, $2` placeholders ✓
- Line 429-434: `logInteraction` uses `$1` placeholder for update ✓

All SQL queries use parameterized statements. ✓

**Prompt injection — Label external content before passing to agent**
- The `getPerson` function returns user-provided data (person names, notes, relationship types, how_known) and life events data from the database
- This data is returned as JSON strings that will be passed to the agent
- However, this is a tool function in the people module, not the agent itself
- The agent.ts file is responsible for wrapping tool results in `<untrusted>` tags
- Since agent.ts is not in scope, I cannot verify if this is properly labeled
- **OBSERVATION**: The people.ts file itself does not pass data to the agent; it returns JSON strings. The agent.ts file is responsible for wrapping these results. This is outside the scope of this task.

**Input validation — Validate all external input**
- Line 207: `JSON.parse(input)` - no try-catch around parse in createPerson
- Line 244: `JSON.parse(input)` - no try-catch around parse in getPerson
- Line 298: `JSON.parse(input)` - no try-catch around parse in updatePerson
- Line 351: `JSON.parse(input)` - no try-catch around parse in getLapsedContacts
- Line 400: `JSON.parse(input)` - no try-catch around parse in logInteraction

Wait, let me check if these are wrapped in try-catch blocks:

Looking at the code:
- Line 206-234: `createPerson` has try-catch wrapping the entire function including JSON.parse ✓
- Line 243-288: `getPerson` has try-catch wrapping the entire function including JSON.parse ✓
- Line 297-341: `updatePerson` has try-catch wrapping the entire function including JSON.parse ✓
- Line 350-390: `getLapsedContacts` has try-catch wrapping the entire function including JSON.parse ✓
- Line 399-462: `logInteraction` has try-catch wrapping the entire function including JSON.parse ✓

All JSON.parse calls are wrapped in try-catch blocks. ✓

Input validation for string lengths:
- Line 74-76: `createPerson` validates name is required and non-empty ✓
- Line 78-79: validates name length ✓
- Line 82-83: validates notes length ✓
- Line 85-90: validates relationship_type length ✓
- Line 92-93: validates how_known length ✓
- Line 248-250: `getPerson` validates name ✓
- Line 302-304: `updatePerson` validates inputs ✓
- Line 404-406: `logInteraction` validates inputs ✓
- Line 354-358: `getLapsedContacts` validates days_threshold is a number and non-negative ✓

All external inputs are validated. ✓

**Cron injection — Validate cron expressions before storing**
- No cron expressions in this file. N/A

### 4.2 Secrets and Credentials

**Env vars — Secrets in .env only**
- No hardcoded secrets, tokens, passwords, or keys in the file. ✓

**Logging — Never log secrets**
- Line 224: `log.info({ person_id: person.id }, "Person created")` - logs person_id only ✓
- Line 232: `log.error({ err: String(err) }, "create_person failed")` - logs error string ✓
- Line 279: `log.info({ person_id: person.id, life_events_count: lifeEvents.length }, "Person retrieved")` - logs person_id and count only ✓
- Line 286: `log.error({ err: String(err) }, "get_person failed")` - logs error string ✓
- Line 331: `log.info({ person_id: updatedPerson.id }, "Person updated")` - logs person_id only ✓
- Line 339: `log.error({ err: String(err) }, "update_person failed")` - logs error string ✓
- Line 373-378: `log.info({ count: lapsedContacts.length, days_threshold }, "Retrieved lapsed contacts")` - logs count and threshold only ✓
- Line 388: `log.error({ err: String(err) }, "get_lapsed_contacts failed")` - logs error string ✓
- Line 439-444: `log.info({ person_id: updatedPerson.id, interaction_id: interaction.id }, "Interaction logged")` - logs IDs only ✓
- Line 460: `log.error({ err: String(err) }, "log_interaction failed")` - logs error string ✓

No secrets are logged. ✓

**Agent exposure — Secrets never reach the agent**
- No env var values are included in any strings passed to the agent. ✓

**Git — No secrets in git history**
- No secrets in the file. ✓

### 4.3 Authentication and Access

**Authentication — Validate identity on every handler**
- These are tool functions, not external request handlers
- Authentication is handled at the agent level, not in individual tool functions
- N/A for this file

**Database — No agent-constructed SQL**
- All SQL is constructed in the tool functions, not by the agent
- All SQL uses parameterized queries
- ✓

**MCP — OAuth tokens stored securely**
- No OAuth tokens in this file. N/A

**Admin UI — Not externally exposed**
- No admin UI in this file. N/A

### 4.4 Data Handling

**PII — No PII in logs**
- Line 224: logs person_id (not PII) ✓
- Line 279: logs person_id and count (not PII) ✓
- Line 331: logs person_id (not PII) ✓
- Line 373-378: logs count and threshold (not PII) ✓
- Line 439-444: logs person_id and interaction_id (not PII) ✓

No PII (names, emails, phone numbers, calendar event details) in logs. ✓

**External content — Label all external content as untrusted**
- This is a tool function that returns JSON strings
- The agent.ts file is responsible for wrapping results in `<untrusted>` tags
- Since agent.ts is not in scope, this cannot be verified here
- **OBSERVATION**: The people.ts file returns user-provided data as JSON strings. The agent.ts file should wrap these in `<untrusted>` tags. This is outside the scope of this task.

**Error messages — No stack traces in user-facing errors**
- Line 213: returns `{ error: "create_person: ${validationError}" }` - plain language ✓
- Line 233: returns `{ error: "create_person failed" }` - plain language ✓
- Line 250: returns `{ error: "get_person: ${validationError}" }` - plain language ✓
- Line 287: returns `{ error: "get_person failed" }` - plain language ✓
- Line 304: returns `{ error: "update_person: ${validationError}" }` - plain language ✓
- Line 340: returns `{ error: "update_person failed" }` - plain language ✓
- Line 356: returns `{ error: "get_lapsed_contacts: '...' }` - plain language ✓
- Line 389: returns `{ error: "get_lapsed_contacts failed" }` - plain language ✓
- Line 406: returns `{ error: "log_interaction: ${validationError}" }` - plain language ✓
- Line 461: returns `{ error: "log_interaction failed" }` - plain language ✓
- Line 490: returns `{ error: "Unknown people operation: ${operation}" }` - plain language ✓

No stack traces in error messages. ✓

**DB queries — Statement timeout enforced**
- This is enforced at the pool configuration level in @lifeos/shared
- Not the responsibility of individual tool functions
- N/A for this file

### 4.5 Dependency Security

**Audit — Zero high or critical vulnerabilities**
- Not applicable to code review
- N/A

**Pinning — All dependencies pinned to exact versions**
- Not applicable to code review
- N/A

**Minimal surface — No unjustified new dependencies**
- No new dependencies added in this file
- N/A

## Summary

All security rules have been checked against the people.ts file. No violations found.

**OBSERVATION**: The `get_person` function now returns life events data which includes user-provided notes. According to the security pattern established in task-7a, all tools that return user-provided data should be included in the `isUntrustedTool` function in agent.ts. However, agent.ts is not in scope for this task. The people.ts file itself is secure and follows all parameterized query patterns and input validation requirements.

Now let me write the security report:
[0m← [0mWrite pipeline/phase-3/task-9a/security-report.md
Wrote file successfully.
[0m
## Security Review Complete — PASS

I have completed a thorough security audit of `packages/orchestrator/src/tools/people.ts` against all 18 rules in the security ruleset.

**Result: PASS**

### Key Findings:

✅ **All SQL queries use parameterized statements** — No string concatenation or template literals
✅ **All external input validated** — JSON.parse wrapped in try-catch, string lengths enforced, numeric inputs validated
✅ **No secrets in code or logs** — Only non-sensitive data (IDs, counts) logged; no PII exposed
✅ **Secure error handling** — Plain language error messages only, no stack traces
✅ **Consistent with established patterns** — Follows conventions from tasks 4a, 5a, 5b

### Observation:

The `get_person` function now returns life events data including user-provided notes. Per the security pattern from task-7a, tools returning user-provided data should be included in the `isUntrustedTool` function in agent.ts. However, agent.ts is outside the scope of this task (it was reviewed in task-8). The people.ts file itself is secure.

**Security report written to:** `/pipeline/phase-3/task-9a/security-report.md`
