I'll start by reading the files in scope and understanding the current scheduler implementation, then write comprehensive tests for the nudge sending functionality.
Now let me check the existing test file to understand the testing patterns:
Now I need to understand what the task is asking for. Looking at the acceptance criteria:

1. **Scheduler sends nudge messages to TELEGRAM_ALLOWED_CHAT_ID** - The implementation already does this via `telegramBot.sendMessage()`
2. **Each nudge message includes a Dismiss button with callback data** - The implementation already includes this with `inline_keyboard`
3. **Nudge status updated to 'sent' with sent_at timestamp after successful send** - The implementation already does this
4. **Dismiss button callback includes nudge ID for later dismissal** - The implementation already includes `dismiss_nudge_${nudge.id}`

The current implementation in scheduler.ts already has all the nudge sending logic. The tests in scheduler.test.ts cover some of this, but I need to write NEW tests that specifically verify the Telegram sending behavior and the button callback data. Let me check if there's a telegramBot mock needed:
Now I understand. The task is to write tests that verify the Telegram sending behavior. The implementation is already there, but the tests need to be enhanced to specifically test the acceptance criteria. Let me write comprehensive tests for the nudge sending functionality:
Now I need to add tests for the Telegram sending functionality. Let me add a new describe block for nudge sending:
Now let me run biome check on the test file to ensure it passes linting:
Good! Now let me run biome check again to ensure there are no remaining issues:
Perfect! Now let me verify the tests can load without errors by running them:
Let me check the correct way to run vitest:
I see the issue. The tests are failing because the mock isn't being set up correctly for the Telegram send. Let me check what the actual call looks like and fix the test assertions. The issue is that the mock is being called but the arguments aren't being captured correctly. Let me debug this:
The tests are passing for the basic Telegram send, but failing on the button structure. Let me look at the actual scheduler code again to see the exact structure:
I see - the structure is correct. The issue is that the test is checking `sendCall?.[2]` which is the third argument (the options object), and within that it should have `reply_markup`. Let me fix the test assertions:
Now let me fix the other failing tests:
Now fix the multiple nudges test:
Now I need to fix the logging test. The issue is that the logger.child is being called multiple times and the test is checking for a specific call. Let me look at that test more carefully:
The issue is that the test is checking for a specific call to mockLoggerInfo, but there are multiple calls. The test needs to be more specific. Let me look at the actual test that's failing:
The issue is that the test is using the wrong logger mock. The logger.child() returns a child logger, and that's what logs the "Nudge marked as sent" message. The test needs to check the child logger's info calls, not the main logger's. However, looking at the test setup, the mockLoggerChild is being set up in a separate beforeEach. The problem is that the test is checking mockLoggerInfo which is the main logger's info, not the child logger's info.

Looking at the error output, the test is failing because it's checking the wrong logger. The "Nudge marked as sent" log is called on the child logger, not the main logger. The test setup in the "Logging and monitoring" describe block has a separate beforeEach that sets up mockLoggerChild and mockLoggerInfo correctly. The issue is that this test is in the "Logging and monitoring" block which has its own beforeEach that overrides the parent beforeEach.

Let me check if the test is actually using the right logger mock. Looking at the error, it seems the test is checking the main logger's info calls, not the child logger's. The test should be checking the child logger's info calls. Let me look at the test setup more carefully:
I see - the "Logging and monitoring" describe block has its own beforeEach that sets up mockLoggerChild to return an object with mockLoggerInfo. This is correct. The issue is that the test is checking for a call with specific arguments, but the logger is being called with different arguments first (from startScheduler).

The test needs to be more specific about which call it's checking. Let me look at what the actual scheduler code logs:

Looking at the scheduler.ts code:
1. Line 135: `log.info("Initializing scheduler");` - called on the scheduler logger
2. Line 142: `await evaluateNudges();` - calls the nudge evaluator
3. Inside evaluateNudges:
   - Line 42: `log.info("Starting nudge evaluation");` - called on the nudge_evaluator logger
   - Line 113: `log.info({ nudge_id: nudge.id }, "Nudge marked as sent");` - called on the nudge_evaluator logger

The problem is that the test is checking mockLoggerInfo which is the same function for both the scheduler logger and the nudge_evaluator logger (because mockLoggerChild returns the same mockLoggerInfo for all child loggers).

The test should check if mockLoggerInfo was called with the specific arguments at some point. The current test is using `toHaveBeenCalledWith` which checks if it was called with those exact arguments, but it's being called with other arguments too.

Actually, looking at the error output more carefully, the test is failing because mockLoggerInfo is being called with different arguments. The test should use `toHaveBeenCalledWith` which checks if it was called with those arguments at any point, not just as the first call.

Wait, looking at the error output again:
```
expected "vi.fn()" to be called with arguments: [ { nudge_id: 1 }, …(1) ]
```

This means the test is checking if mockLoggerInfo was called with `{ nudge_id: 1 }` and "Nudge marked as sent", but it's being called with other arguments first. The `toHaveBeenCalledWith` should work for any call, not just the first one.

Let me check if the issue is that the Telegram send is failing. Looking at the test setup, the mockTelegramBotSendMessage is not being mocked in the "Logging and monitoring" beforeEach. Let me fix that:
Now let me run the tests again to see if they pass:
Excellent! All tests are passing now. Let me run biome check one more time to ensure the file is properly formatted:
Perfect! Now let me create the tests-written.txt file to confirm the tests are complete:
Perfect! Let me verify the tests one more time to ensure they cover all acceptance criteria:
Excellent! All tests are passing. Let me create a summary of what was written:

## Summary

I have successfully written comprehensive tests for task-12a (Implement nudge sending in scheduler) in the RED phase of TDD. The tests cover all acceptance criteria:

### Tests Written

**File:** `packages/orchestrator/src/__tests__/scheduler.test.ts`

### Acceptance Criteria Coverage

1. **✅ Scheduler sends nudge messages to TELEGRAM_ALLOWED_CHAT_ID**
   - Test: "should send nudge message to TELEGRAM_ALLOWED_CHAT_ID"
   - Verifies that `telegramBot.sendMessage()` is called with the correct chat ID

2. **✅ Each nudge message includes a Dismiss button with callback data**
   - Test: "should include Dismiss button with callback data in Telegram message"
   - Verifies the button structure with text "Dismiss" in the inline_keyboard

3. **✅ Nudge status updated to 'sent' with sent_at timestamp after successful send**
   - Test: "should update nudge status to sent after successful Telegram send"
   - Test: "should set sent_at timestamp when marking nudge as sent"
   - Verifies UPDATE query sets `status = 'sent'` and `sent_at = now()`

4. **✅ Dismiss button callback includes nudge ID for later dismissal**
   - Test: "should include nudge ID in Dismiss button callback data"
   - Test: "should send multiple nudges with correct callback data for each"
   - Verifies callback_data format is `dismiss_nudge_{nudgeId}`

### Additional Tests

- Error handling for Telegram send failures
- Multiple nudges with correct individual callback data
- Integration with existing scheduler functionality
- Logging and monitoring of nudge sending operations

### Test Results

- **30 tests total** - all passing ✅
- **Biome linting** - passed with no issues ✅
- **Tests-written.txt** - created at `/pipeline/phase-3/task-12a/tests-written.txt` ✅

The tests are comprehensive, deterministic, and properly mock all external dependencies (`@lifeos/shared`, `node-cron`, `telegramBot`). They follow the established patterns from previous tasks and use the required Vitest boilerplate with proper module mocking.
Performing one time database migration, may take a few minutes...
sqlite-migration:done
Database migration complete.
[0m
> ag-03-tester · claude-haiku-4-5-20251001
[0m
[0m→ [0mRead packages/orchestrator/src
[0m→ [0mRead packages/orchestrator/src/scheduler.ts
[0m→ [0mRead packages/orchestrator/src/__tests__/scheduler.test.ts
[0m
[0m$ [0mgrep -r "telegramBot" /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src --include="*.ts" | head -20
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/scheduler.ts:import { env, logger, pool, telegramBot } from "@lifeos/shared";
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/scheduler.ts:        await telegramBot.sendMessage(
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -10,13 +10,14 @@
 describe("Scheduler", () => {
   let schedulerModule: typeof import("../scheduler.js");
   let mockCronSchedule: ReturnType<typeof vi.fn>;
   let mockPoolQuery: ReturnType<typeof vi.fn>;
+  let mockTelegramBotSendMessage: ReturnType<typeof vi.fn>;
 
-  beforeEach(async () => {
-    vi.resetModules();
-
-    // Mock node-cron
+  function applyAllMocks(
+    poolQueryMock: ReturnType<typeof vi.fn>,
+    telegramSendMock: ReturnType<typeof vi.fn>,
+  ): void {
     mockCronSchedule = vi.fn(() => ({
       start: vi.fn(),
       stop: vi.fn(),
     }));
@@ -24,14 +25,18 @@
     vi.doMock("node-cron", () => ({
       schedule: mockCronSchedule,
     }));
 
-    // Mock @lifeos/shared
-    mockPoolQuery = vi.fn();
     vi.doMock("@lifeos/shared", () => ({
+      env: {
+        TELEGRAM_ALLOWED_CHAT_ID: "123456789",
+      },
       pool: {
-        query: mockPoolQuery,
+        query: poolQueryMock,
       },
+      telegramBot: {
+        sendMessage: telegramSendMock,
+      },
       logger: {
         child: vi.fn(() => ({
           info: vi.fn(),
           error: vi.fn(),
@@ -41,9 +46,18 @@
         error: vi.fn(),
         warn: vi.fn(),
       },
     }));
+  }
 
+  beforeEach(async () => {
+    vi.resetModules();
+
+    mockPoolQuery = vi.fn();
+    mockTelegramBotSendMessage = vi.fn();
+
+    applyAllMocks(mockPoolQuery, mockTelegramBotSendMessage);
+
     schedulerModule = await import("../scheduler.js");
   });
 
   afterEach(() => {

[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -510,8 +510,487 @@
     expect(sentNudgesCheck).toBeDefined();
   });
 });
 
+describe("Nudge sending via Telegram", () => {
+  it("should send nudge message to TELEGRAM_ALLOWED_CHAT_ID", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge message",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    // Mock count of recently sent nudges
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    // Mock update response
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 1 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that telegramBot.sendMessage was called with the correct chat ID
+    expect(mockTelegramBotSendMessage).toHaveBeenCalled();
+    const sendCall = mockTelegramBotSendMessage.mock.calls[0];
+    expect(sendCall?.[0]).toBe("123456789"); // TELEGRAM_ALLOWED_CHAT_ID
+  });
+
+  it("should include nudge message text in Telegram message", async () => {
+    const nudgeMessage = "Remember to call your mom!";
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: nudgeMessage,
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 1 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that the message text is included in the Telegram message
+    expect(mockTelegramBotSendMessage).toHaveBeenCalled();
+    const sendCall = mockTelegramBotSendMessage.mock.calls[0];
+    expect(String(sendCall?.[1])).toContain(nudgeMessage);
+  });
+
+  it("should include Dismiss button with callback data in Telegram message", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 42,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 42 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that the Dismiss button is included in the reply_markup
+    expect(mockTelegramBotSendMessage).toHaveBeenCalled();
+    const sendCall = mockTelegramBotSendMessage.mock.calls[0];
+    const replyMarkup = sendCall?.[2];
+
+    expect(replyMarkup).toBeDefined();
+    expect(replyMarkup?.inline_keyboard).toBeDefined();
+    expect(Array.isArray(replyMarkup?.inline_keyboard)).toBe(true);
+
+    // Check that there's a button with text "Dismiss"
+    const buttons = replyMarkup?.inline_keyboard?.[0];
+    expect(buttons).toBeDefined();
+    expect(Array.isArray(buttons)).toBe(true);
+
+    const dismissButton = buttons?.[0];
+    expect(dismissButton?.text).toBe("Dismiss");
+  });
+
+  it("should include nudge ID in Dismiss button callback data", async () => {
+    const nudgeId = 99;
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: nudgeId,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: nudgeId }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that the callback_data includes the nudge ID
+    expect(mockTelegramBotSendMessage).toHaveBeenCalled();
+    const sendCall = mockTelegramBotSendMessage.mock.calls[0];
+    const replyMarkup = sendCall?.[2];
+    const dismissButton = replyMarkup?.inline_keyboard?.[0]?.[0];
+
+    expect(dismissButton?.callback_data).toBe(`dismiss_nudge_${nudgeId}`);
+  });
+
+  it("should update nudge status to sent after successful Telegram send", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 1 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that UPDATE query was called to mark nudge as sent
+    const updateCall = mockPoolQuery.mock.calls.find((call) =>
+      String(call[0]).includes("UPDATE"),
+    );
+
+    expect(updateCall).toBeDefined();
+    expect(String(updateCall?.[0])).toContain("status = 'sent'");
+    expect(String(updateCall?.[0])).toContain("sent_at = now()");
+  });
+
+  it("should set sent_at timestamp when marking nudge as sent", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 1 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that the UPDATE query sets sent_at to now()
+    const updateCall = mockPoolQuery.mock.calls.find((call) =>
+      String(call[0]).includes("UPDATE"),
+    );
+
+    expect(updateCall).toBeDefined();
+    expect(String(updateCall?.[0])).toContain("sent_at = now()");
+  });
+
+  it("should handle Telegram send failure gracefully", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: "Test nudge",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    // Mock Telegram send failure
+    mockTelegramBotSendMessage.mockRejectedValueOnce(
+      new Error("Telegram API error"),
+    );
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      // Should not throw even if Telegram send fails
+      await expect(callback()).resolves.not.toThrow();
+    }
+  });
+
+  it("should send multiple nudges with correct callback data for each", async () => {
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [
+        {
+          id: 1,
+          person_id: 1,
+          life_event_id: null,
+          message: "Nudge 1",
+          trigger_at: new Date("2026-05-13T10:00:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+        {
+          id: 2,
+          person_id: 2,
+          life_event_id: null,
+          message: "Nudge 2",
+          trigger_at: new Date("2026-05-13T10:05:00Z"),
+          status: "pending",
+          sent_at: null,
+          dismissed_at: null,
+          created_at: new Date("2026-05-12T10:00:00Z"),
+        },
+      ],
+      rowCount: 2,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ count: 0 }],
+      rowCount: 1,
+      command: "SELECT",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 1 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    mockPoolQuery.mockResolvedValueOnce({
+      rows: [{ id: 2 }],
+      rowCount: 1,
+      command: "UPDATE",
+      oid: 0,
+      fields: [],
+    });
+
+    await schedulerModule.startScheduler();
+
+    const nudgeEvaluatorCall = mockCronSchedule.mock.calls.find(
+      (call) => call[0] === "*/15 * * * *" || call[0]?.includes("15"),
+    );
+
+    const callback = nudgeEvaluatorCall?.[1];
+    if (callback && typeof callback === "function") {
+      await callback();
+    }
+
+    // Verify that sendMessage was called twice
+    expect(mockTelegramBotSendMessage).toHaveBeenCalledTimes(2);
+
+    // Verify each call has the correct callback data
+    const firstCall = mockTelegramBotSendMessage.mock.calls[0];
+    const firstButton = firstCall?.[2]?.inline_keyboard?.[0]?.[0];
+    expect(firstButton?.callback_data).toBe("dismiss_nudge_1");
+
+    const secondCall = mockTelegramBotSendMessage.mock.calls[1];
+    const secondButton = secondCall?.[2]?.inline_keyboard?.[0]?.[0];
+    expect(secondButton?.callback_data).toBe("dismiss_nudge_2");
+  });
+});
+
 describe("Logging and monitoring", () => {
   let mockLoggerChild: ReturnType<typeof vi.fn>;
   let mockLoggerInfo: ReturnType<typeof vi.fn>;
   let mockLoggerError: ReturnType<typeof vi.fn>;

[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check --write packages/orchestrator/src/__tests__/scheduler.test.ts
Checked 1 file in 58ms. Fixed 1 file.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check packages/orchestrator/src/__tests__/scheduler.test.ts
Checked 1 file in 25ms. No fixes applied.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec vitest run --reporter=verbose packages/orchestrator/src/__tests__/scheduler.test.ts 2>&1 | head -100
undefined
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "vitest" not found
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && pnpm exec vitest run --reporter=verbose src/__tests__/scheduler.test.ts 2>&1 | head -150
RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should export startScheduler function 15ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should initialize scheduler without throwing 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should schedule nudge evaluator to run every 15 minutes 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should query nudges table for pending nudges past trigger_at 7ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should enforce maximum 3 nudges sent per hour 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should update nudge status to sent when sending 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should handle database errors gracefully 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process pending nudges 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process nudges with trigger_at in the past 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should call schedule function from node-cron 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should start the scheduled jobs 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should use parameterized queries for nudge lookup 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should track sent nudges to enforce hourly rate limit 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send nudge message to TELEGRAM_ALLOWED_CHAT_ID 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge message text in Telegram message 2ms
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include Dismiss button with callback data in Telegram message 9ms
   → expected undefined to be defined
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge ID in Dismiss button callback data 5ms
   → expected undefined to be 'dismiss_nudge_99' // Object.is equality
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should update nudge status to sent after successful Telegram send 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should set sent_at timestamp when marking nudge as sent 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should handle Telegram send failure gracefully 2ms
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send multiple nudges with correct callback data for each 2ms
   → expected undefined to be 'dismiss_nudge_1' // Object.is equality
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log scheduler initialization 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when nudge evaluation starts 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when no pending nudges are found 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when rate limit is reached 3ms
 × src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log each nudge being marked as sent 8ms
   → expected "vi.fn()" to be called with arguments: [ { nudge_id: 1 }, …(1) ]

Received:

  1st vi.fn() call:

  [
-   {
-     "nudge_id": 1,
-   },
-   "Nudge marked as sent",
+   "Initializing scheduler",
  ]

  2nd vi.fn() call:

  [
-   {
-     "nudge_id": 1,
-   },
-   "Nudge marked as sent",
+   "Scheduler initialized successfully",
  ]

  3rd vi.fn() call:

  [
-   {
-     "nudge_id": 1,
-   },
-   "Nudge marked as sent",
+   "Nudge evaluator scheduled to run every 15 minutes",
  ]

  4th vi.fn() call:

  [
-   {
-     "nudge_id": 1,
-   },
-   "Nudge marked as sent",
+   "Starting nudge evaluation",
  ]

  5th vi.fn() call:

  [
    {
-     "nudge_id": 1,
+     "count": 1,
+     "remainingSlots": 3,
    },
-   "Nudge marked as sent",
+   "Processing pending nudges",
  ]

  6th vi.fn() call:

  [
    {
-     "nudge_id": 1,
+     "processed": 1,
    },
-   "Nudge marked as sent",
+   "Nudge evaluation completed",
  ]


Number of calls: 6

 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log nudge evaluation completion 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors during nudge evaluation 13ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors when updating nudge status fails 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log processing count and remaining slots 3ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include Dismiss button with callback data in Telegram message
AssertionError: expected undefined to be defined
 ❯ src/__tests__/scheduler.test.ts:680:44
    678|
    679|       expect(replyMarkup).toBeDefined();
    680|       expect(replyMarkup?.inline_keyboard).toBeDefined();
       |                                            ^
    681|       expect(Array.isArray(replyMarkup?.inline_keyboard)).toBe(true);
    682|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge ID in Dismiss button callback data
AssertionError: expected undefined to be 'dismiss_nudge_99' // Object.is equality

- Expected:
"dismiss_nudge_99"

+ Received:
undefined

 ❯ src/__tests__/scheduler.test.ts:747:44
    745|       const dismissButton = replyMarkup?.inline_keyboard?.[0]?.[0];
    746|
    747|       expect(dismissButton?.callback_data).toBe(`dismiss_nudge_${nudge…
       |                                            ^
    748|     });
    749|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send multiple nudges with correct callback data for each
AssertionError: expected undefined to be 'dismiss_nudge_1' // Object.is equality

- Expected:
"dismiss_nudge_1"

+ Received:
undefined

 ❯ src/__tests__/scheduler.test.ts:983:42
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && pnpm exec vitest run --reporter=verbose src/__tests__/scheduler.test.ts 2>&1 | grep -A 30 "should send nudge message to TELEGRAM"
✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send nudge message to TELEGRAM_ALLOWED_CHAT_ID 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge message text in Telegram message 2ms
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include Dismiss button with callback data in Telegram message 8ms
   → expected undefined to be defined
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge ID in Dismiss button callback data 4ms
   → expected undefined to be 'dismiss_nudge_99' // Object.is equality
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should update nudge status to sent after successful Telegram send 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should set sent_at timestamp when marking nudge as sent 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should handle Telegram send failure gracefully 2ms
 × src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send multiple nudges with correct callback data for each 2ms
   → expected undefined to be 'dismiss_nudge_1' // Object.is equality
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log scheduler initialization 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when nudge evaluation starts 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when no pending nudges are found 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when rate limit is reached 5ms
 × src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log each nudge being marked as sent 8ms
   → expected "vi.fn()" to be called with arguments: [ { nudge_id: 1 }, …(1) ]

Received:

  1st vi.fn() call:

  [
-   {
-     "nudge_id": 1,
-   },
-   "Nudge marked as sent",
+   "Initializing scheduler",
  ]

  2nd vi.fn() call:
[0m
[0m→ [0mRead packages/orchestrator/src/scheduler.ts[90m [offset=85, limit=20][0m
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -673,9 +673,10 @@
 
 // Verify that the Dismiss button is included in the reply_markup
 expect(mockTelegramBotSendMessage).toHaveBeenCalled();
 const sendCall = mockTelegramBotSendMessage.mock.calls[0];
-const replyMarkup = sendCall?.[2];
+const options = sendCall?.[2];
+const replyMarkup = options?.reply_markup;
 
 expect(replyMarkup).toBeDefined();
 expect(replyMarkup?.inline_keyboard).toBeDefined();
 expect(Array.isArray(replyMarkup?.inline_keyboard)).toBe(true);

[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -741,9 +741,10 @@
 
   // Verify that the callback_data includes the nudge ID
   expect(mockTelegramBotSendMessage).toHaveBeenCalled();
   const sendCall = mockTelegramBotSendMessage.mock.calls[0];
-  const replyMarkup = sendCall?.[2];
+  const options = sendCall?.[2];
+  const replyMarkup = options?.reply_markup;
   const dismissButton = replyMarkup?.inline_keyboard?.[0]?.[0];
 
   expect(dismissButton?.callback_data).toBe(`dismiss_nudge_${nudgeId}`);
 });

[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -980,13 +980,15 @@
     expect(mockTelegramBotSendMessage).toHaveBeenCalledTimes(2);
 
     // Verify each call has the correct callback data
     const firstCall = mockTelegramBotSendMessage.mock.calls[0];
-    const firstButton = firstCall?.[2]?.inline_keyboard?.[0]?.[0];
+    const firstOptions = firstCall?.[2];
+    const firstButton = firstOptions?.reply_markup?.inline_keyboard?.[0]?.[0];
     expect(firstButton?.callback_data).toBe("dismiss_nudge_1");
 
     const secondCall = mockTelegramBotSendMessage.mock.calls[1];
-    const secondButton = secondCall?.[2]?.inline_keyboard?.[0]?.[0];
+    const secondOptions = secondCall?.[2];
+    const secondButton = secondOptions?.reply_markup?.inline_keyboard?.[0]?.[0];
     expect(secondButton?.callback_data).toBe("dismiss_nudge_2");
   });
 });
 

[0m
[0m✗ [0mRead packages/orchestrator/src/__tests__/scheduler.test.ts failed[90m [limit=100][0m
[91m[1mError: [0mThe read tool was called with invalid arguments: SchemaError(Expected number | undefined, got [1050,1100]
  at ["offset"]).
Please rewrite the input so it satisfies the expected schema.
[0m→ [0mRead packages/orchestrator/src/__tests__/scheduler.test.ts[90m [offset=1050, limit=100][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/scheduler.test.ts[90m [offset=1138, limit=80][0m
[0m→ [0mRead packages/orchestrator/src/__tests__/scheduler.test.ts[90m [offset=1000, limit=50][0m
[0m
[0m← [0mEdit packages/orchestrator/src/__tests__/scheduler.test.ts
Index: /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
===================================================================
--- /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
+++ /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts
@@ -1018,11 +1018,17 @@
   schedule: mockCronSchedule,
 }));
 
 vi.doMock("@lifeos/shared", () => ({
+  env: {
+    TELEGRAM_ALLOWED_CHAT_ID: "123456789",
+  },
   pool: {
     query: mockPoolQuery,
   },
+  telegramBot: {
+    sendMessage: mockTelegramBotSendMessage,
+  },
   logger: {
     child: mockLoggerChild,
     info: vi.fn(),
     error: vi.fn(),

[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && pnpm exec vitest run --reporter=verbose src/__tests__/scheduler.test.ts 2>&1 | tail -100
RUN  v4.1.4 /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should export startScheduler function 15ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should initialize scheduler without throwing 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should schedule nudge evaluator to run every 15 minutes 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should query nudges table for pending nudges past trigger_at 8ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should enforce maximum 3 nudges sent per hour 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should update nudge status to sent when sending 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should handle database errors gracefully 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process pending nudges 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process nudges with trigger_at in the past 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should call schedule function from node-cron 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should start the scheduled jobs 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should use parameterized queries for nudge lookup 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should track sent nudges to enforce hourly rate limit 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send nudge message to TELEGRAM_ALLOWED_CHAT_ID 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge message text in Telegram message 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include Dismiss button with callback data in Telegram message 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge ID in Dismiss button callback data 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should update nudge status to sent after successful Telegram send 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should set sent_at timestamp when marking nudge as sent 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should handle Telegram send failure gracefully 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send multiple nudges with correct callback data for each 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log scheduler initialization 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when nudge evaluation starts 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when no pending nudges are found 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when rate limit is reached 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log each nudge being marked as sent 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log nudge evaluation completion 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors during nudge evaluation 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors when updating nudge status fails 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log processing count and remaining slots 3ms

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  05:21:11
   Duration  371ms (transform 120ms, setup 0ms, import 129ms, tests 97ms, environment 0ms)
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos && pnpm exec biome check packages/orchestrator/src/__tests__/scheduler.test.ts
Checked 1 file in 25ms. No fixes applied.
[0m
[0m$ [0mmkdir -p /home/runner/work/jamie-lifeos/jamie-lifeos/pipeline/phase-3/task-12a
(no output)
[0m
[0m← [0mWrite pipeline/phase-3/task-12a/tests-written.txt
Wrote file successfully.
[0m
[0m$ [0mcd /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator && pnpm exec vitest run --reporter=verbose src/__tests__/scheduler.test.ts 2>&1 | grep "Nudge sending via Telegram" -A 20
✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send nudge message to TELEGRAM_ALLOWED_CHAT_ID 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge message text in Telegram message 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include Dismiss button with callback data in Telegram message 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should include nudge ID in Dismiss button callback data 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should update nudge status to sent after successful Telegram send 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should set sent_at timestamp when marking nudge as sent 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should handle Telegram send failure gracefully 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Nudge sending via Telegram > should send multiple nudges with correct callback data for each 2ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log scheduler initialization 5ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when nudge evaluation starts 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when no pending nudges are found 4ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log when rate limit is reached 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log each nudge being marked as sent 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log nudge evaluation completion 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors during nudge evaluation 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log errors when updating nudge status fails 3ms
 ✓ src/__tests__/scheduler.test.ts > Scheduler > Logging and monitoring > should log processing count and remaining slots 3ms

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  05:21:19
   Duration  361ms (transform 119ms, setup 0ms, import 128ms, tests 96ms, environment 0ms)
[0m
