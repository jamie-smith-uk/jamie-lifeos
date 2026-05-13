[0m
> ag-04-developer · claude-sonnet-4-20250514
[0m
I'll implement the automatic nudge creation feature for life events. Let me start by reading the in-scope source files and tests to understand the current implementation.
[0m→ [0mRead packages/orchestrator/src/tools/life_events.ts
Now let me read the test files to understand what functionality needs to be implemented:
[0m✱ [0mGlob "packages/orchestrator/src/tools/__tests__/life_events.test.ts"[90m 1 match[0m
[0m→ [0mRead packages/orchestrator/src/tools/__tests__/life_events.test.ts
Let me continue reading the test file to see if there are tests for the nudge creation functionality:
[0m→ [0mRead packages/orchestrator/src/tools/__tests__/life_events.test.ts[90m [offset=1741][0m
Now let me check if there are any tests specifically for the nudge creation functionality that I need to implement. Let me search for test files that might contain tests for the automatic nudge creation:
[0m✱ [0mGrep "nudge.*create|create.*nudge"[90m in packages/orchestrator/src/tools/__tests__ · 22 matches[0m
Perfect! There's a specific test file for the nudge creation functionality. Let me read it:
[0m→ [0mRead packages/orchestrator/src/tools/__tests__/life_events_nudges.test.ts
Now I need to check if there are any nudges module functions I need to import. Let me look at the nudges module:
[0m→ [0mRead packages/orchestrator/src/tools/nudges.ts
Now I understand what I need to implement. Based on the tests, I need to modify the `createLifeEvent` function to automatically create nudges for birthday and anniversary events. Let me analyze the requirements:

1. **Birthday events**: Create nudge 7 days before event_date
2. **Anniversary events**: Create nudge 14 days before event_date  
3. **Nudge message**: Include person name and event type
4. **Only for recurring events**: Don't create nudges for non-recurring events
5. **Date calculations**: Handle recurring events correctly

Let me implement this functionality:
[0m
[0m← [0mEdit packages/orchestrator/src/tools/life_events.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
@@ -308,8 +308,89 @@
   }
 }
 
 /**
+ * Creates a nudge message for a life event.
+ */
+function createNudgeMessage(personName: string, eventType: string, daysBeforeEvent: number): string {
+  return `${personName}'s ${eventType} is coming up in ${daysBeforeEvent} days`;
+}
+
+/**
+ * Calculates the trigger date for a nudge based on event type.
+ */
+function calculateNudgeTriggerDate(eventDate: string, eventType: string): string {
+  const eventDateObj = new Date(eventDate);
+  let daysBeforeEvent: number;
+
+  // Determine days before event based on event type
+  if (eventType.toLowerCase() === "birthday") {
+    daysBeforeEvent = 7;
+  } else if (eventType.toLowerCase() === "anniversary") {
+    daysBeforeEvent = 14;
+  } else {
+    // Should not happen for recurring events, but fallback
+    daysBeforeEvent = 7;
+  }
+
+  // Calculate trigger date by subtracting days
+  const triggerDate = new Date(eventDateObj);
+  triggerDate.setDate(triggerDate.getDate() - daysBeforeEvent);
+  
+  // Set time to 9:00 AM for consistent nudge timing
+  triggerDate.setHours(9, 0, 0, 0);
+  
+  return triggerDate.toISOString();
+}
+
+/**
+ * Creates an automatic nudge for a recurring life event.
+ */
+async function createAutomaticNudge(
+  personId: number,
+  personName: string,
+  lifeEventId: string,
+  eventType: string,
+  eventDate: string,
+): Promise<void> {
+  const log = logger.child({ tool: "create_life_event", action: "create_automatic_nudge" });
+
+  try {
+    // Calculate trigger date and message
+    const triggerAt = calculateNudgeTriggerDate(eventDate, eventType);
+    const daysBeforeEvent = eventType.toLowerCase() === "birthday" ? 7 : 14;
+    const message = createNudgeMessage(personName, eventType, daysBeforeEvent);
+
+    // Create the nudge record
+    await pool.query(
+      `INSERT INTO nudges (person_id, life_event_id, message, trigger_at, status)
+       VALUES ($1, $2, $3, $4, 'pending')`,
+      [personId, Number.parseInt(lifeEventId), message, triggerAt],
+    );
+
+    log.info(
+      { 
+        person_id: personId, 
+        life_event_id: lifeEventId, 
+        trigger_at: triggerAt,
+        event_type: eventType 
+      }, 
+      "Automatic nudge created"
+    );
+  } catch (err) {
+    // Log error but don't fail the life event creation
+    log.error(
+      { 
+        err: String(err), 
+        person_id: personId, 
+        life_event_id: lifeEventId 
+      }, 
+      "Failed to create automatic nudge"
+    );
+  }
+}
+
+/**
  * Creates a new life event record.
  */
 async function createLifeEvent(input: string): Promise<string> {
   const log = logger.child({ tool: "create_life_event" });
@@ -346,8 +427,19 @@
 
     const lifeEvent = rowToLifeEventInfo(result.rows[0]);
     log.info({ person_id: person.id, life_event_id: lifeEvent.id }, "Life event created");
 
+    // Create automatic nudge for recurring events (birthdays and anniversaries)
+    if (isRecurring) {
+      await createAutomaticNudge(
+        person.id,
+        person.name,
+        lifeEvent.id,
+        event_type.trim(),
+        event_date,
+      );
+    }
+
     return JSON.stringify({
       success: true,
       life_event: lifeEvent,
       message: "Life event created successfully",

[0m
Now let me run the validation commands to check if my implementation is correct:
[0m$ [0mpnpm exec tsc --noEmit
(no output)
[0m
[0m$ [0mpnpm exec biome check --write packages/orchestrator/src/tools/life_events.ts
packages/orchestrator/src/tools/life_events.ts:371:18 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter
  
    369 │       `INSERT INTO nudges (person_id, life_event_id, message, trigger_at, status)
    370 │        VALUES ($1, $2, $3, $4, 'pending')`,
  > 371 │       [personId, Number.parseInt(lifeEventId), message, triggerAt],
        │                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    372 │     );
    373 │ 
  
  i Add a non-fractional number between 2 and 36
  
  i Unsafe fix: Add a radix of 10
  
    371 │ ······[personId,·Number.parseInt(lifeEventId,·10),·message,·triggerAt],
        │                                             ++++                       

Skipped 1 suggested fixes.
If you wish to apply the suggested (unsafe) fixes, use the command biome check --write --unsafe

Checked 1 file in 19ms. Fixed 1 file.
Found 1 info.
[0m
I need to fix the parseInt issue:
[0m← [0mEdit packages/orchestrator/src/tools/life_events.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/life_events.ts
@@ -367,9 +367,9 @@
 // Create the nudge record
 await pool.query(
   `INSERT INTO nudges (person_id, life_event_id, message, trigger_at, status)
    VALUES ($1, $2, $3, $4, 'pending')`,
-  [personId, Number.parseInt(lifeEventId), message, triggerAt],
+  [personId, Number.parseInt(lifeEventId, 10), message, triggerAt],
 );
 
 log.info(
   {

[0m
[0m$ [0mpnpm exec biome check packages/orchestrator/src/tools/life_events.ts
Checked 1 file in 9ms. No fixes applied.
[0m
[0m$ [0mpnpm --filter @lifeos/orchestrator test
Scope: 2 of 5 workspace projects
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test:  RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator
packages/orchestrator test:  Test Files  24 passed (24)
packages/orchestrator test:       Tests  620 passed (620)
packages/orchestrator test:    Start at  06:41:51
packages/orchestrator test:    Duration  6.27s (transform 1.66s, setup 0ms, import 1.97s, tests 12.03s, environment 3ms)
packages/orchestrator test: Done
[0m
Excellent! All tests are passing. Now let me create the self-assessment document:
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-3/task-11a
(no output)
[0m
[0m← [0mWrite pipeline/phase-3/task-11a/self-assessment.md
Wrote file successfully.
[0m
Perfect! I have successfully implemented the automatic nudge creation functionality for life events. Here's a summary of what was accomplished:

## Implementation Summary

1. **Added automatic nudge creation** to the `createLifeEvent` function that:
   - Creates nudges 7 days before birthday events
   - Creates nudges 14 days before anniversary events
   - Only creates nudges for recurring events (birthdays and anniversaries)
   - Includes person name and event type in the nudge message

2. **Key functions added**:
   - `createNudgeMessage()`: Formats consistent nudge messages
   - `calculateNudgeTriggerDate()`: Calculates trigger dates based on event type
   - `createAutomaticNudge()`: Creates the nudge database record

3. **Error handling**: Nudge creation failures are logged but don't fail the life event creation, ensuring graceful degradation.

4. **All tests pass**: The implementation satisfies all 620 tests including the new nudge creation tests.

5. **Code quality**: 
   - Zero TypeScript errors
   - Clean Biome linting
   - Follows existing patterns and conventions
   - Proper parameterized SQL queries for security

The implementation correctly handles date calculations for recurring events, includes proper error handling, and maintains consistency with the existing codebase patterns.
