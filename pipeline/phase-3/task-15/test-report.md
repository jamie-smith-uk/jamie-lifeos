Title: Test Report — task-15 — PASS

Verified by orchestrator hard gate after Developer attempt 2.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 128[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 56[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 97[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 16[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 18[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 12[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
packages/shared test: [2m      Tests [22m [1m[32m89 passed[39m[22m[90m (89)[39m
packages/shared test: [2m   Start at [22m 05:53:49
packages/shared test: [2m   Duration [22m 647ms[2m (transform 238ms, setup 0ms, import 412ms, tests 328ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/orchestrator test:  [31m❯[39m src/__tests__/index-task15.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m7 failed[39m[2m)[22m[32m 135[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should call startScheduler() during main()[39m[32m 92[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should call startScheduler() exactly once[39m[32m 7[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should call startScheduler() before server.listen()[39m[32m 12[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should log scheduler initialization message[39m[32m 6[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should continue starting server if startScheduler() throws[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should log error when startScheduler() fails[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should call runMigrations() before startScheduler()[39m[32m 7[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 1060[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m36 tests[22m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1099[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1371[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 16[2mms[22m[39m
packages/bot test: [2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
packages/bot test: [2m      Tests [22m [1m[32m117 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (118)[39m
packages/bot test: [2m   Start at [22m 05:53:50
packages/bot test: [2m   Duration [22m 1.99s[2m (transform 658ms, setup 0ms, import 636ms, tests 3.55s, environment 1ms)[22m
packages/orchestrator test:  [31m❯[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 1378[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns HTTP 200 for a valid message body[32m 122[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m response body is valid JSON[32m 7[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m response JSON contains a 'text' property[32m 4[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m 'text' property in response is non-empty[32m 4[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 when chat_id is missing[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 when text is missing[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 when message_id is missing[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 for invalid JSON body[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 404 for an unknown route[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 200 for callback_data='cancel'[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m response body contains a text field for cancel[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 200 for callback_data='confirm'[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 200 for callback_data='edit'[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 200 for callback_data='dismiss:42'[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 for unknown callback_data[32m 6[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 when callback_data field is missing[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 when chat_id is missing in callback[32m 3[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 for invalid dismiss nudgeId (non-integer)[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m returns 400 for dismiss nudgeId of 0[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m runMigrations is called before the server starts listening[32m 166[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m runMigrations is called exactly once on startup[32m 107[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m the server is reachable (accepts requests) only after migrations complete[32m 162[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m listens on the specified PORT env var[32m 113[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m default PORT is 3001 (env.PORT default in shared env config)[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m server address port matches the configured PORT[32m 106[2mms[22m[39m
packages/orchestrator test: [31m     [31m×[31m AC1: accepts nudge_id in request body and returns 200[39m[32m 16[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC1: response body is valid JSON[32m 2[2mms[22m[39m
packages/orchestrator test: [31m     [31m×[31m AC2: calls dismiss_nudge tool function with nudge_id[39m[32m 12[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC3: returns success response with nudge data on success[32m 2[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC3: returns error response when nudge not found[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC4: validates nudge_id is provided[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC4: validates nudge_id is a number[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC4: validates nudge_id is an integer[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC4: validates nudge_id is positive[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC4: validates nudge_id is positive (negative)[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC5: returns 400 for invalid JSON body[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC5: returns 400 for missing required fields[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC5: returns error response with descriptive message on validation failure[32m 1[2mms[22m[39m
packages/orchestrator test:      [32m✓[39m AC5: follows same error handling as other endpoints (returns JSON error)[32m 1[2mms[22m[39m
packages/bot test: Done
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1333[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 337[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 295[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 254[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t19.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 261[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task4.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 228[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 184[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 248[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t20.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 255[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/todoist-task1.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 235[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/scheduler.test.ts [2m([22m[2m32 tests[22m[2m)[22m[32m 179[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 278[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7a.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 119[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 149[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/people.test.ts [2m([22m[2m48 tests[22m[2m)[22m[32m 172[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-implied-actions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 207[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7b.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 146[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task8.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 115[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/gmail-email-interactions.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 109[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/nudges.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 93[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-async-await.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 22[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events_nudges.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 67[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typecheck-async-await.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6774[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typechecks without errors (tsc --noEmit) [33m 1546[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typechecks without errors (tsc --noEmit) [33m 1770[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typecheck output contains no 'error TS' messages [33m 1668[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typecheck output contains no 'error TS' messages [33m 1787[2mms[22m[39m
packages/orchestrator test: [31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 9 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC1: Orchestrator calls startScheduler() during service initialization[2m > [22mshould call startScheduler() during main()
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m287:29[22m[39m
packages/orchestrator test:     [90m285|[39m       serverHandle [33m=[39m [35mawait[39m [34mstartServer[39m([34m9001[39m[33m,[39m schedulerMock)[33m;[39m
packages/orchestrator test:     [90m286|[39m
packages/orchestrator test:     [90m287|[39m       [34mexpect[39m(schedulerMock)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m   |[39m                             [31m^[39m
packages/orchestrator test:     [90m288|[39m     })[33m;[39m
packages/orchestrator test:     [90m289|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC1: Orchestrator calls startScheduler() during service initialization[2m > [22mshould call startScheduler() exactly once
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called 1 times, but got 0 times[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m294:29[22m[39m
packages/orchestrator test:     [90m292|[39m       serverHandle [33m=[39m [35mawait[39m [34mstartServer[39m([34m9002[39m[33m,[39m schedulerMock)[33m;[39m
packages/orchestrator test:     [90m293|[39m
packages/orchestrator test:     [90m294|[39m       [34mexpect[39m(schedulerMock)[33m.[39m[34mtoHaveBeenCalledTimes[39m([34m1[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                             [31m^[39m
packages/orchestrator test:     [90m295|[39m     })[33m;[39m
packages/orchestrator test:     [90m296|[39m   })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC2: Scheduler starts before HTTP server begins accepting requests[2m > [22mshould call startScheduler() before server.listen()
packages/orchestrator test: [31m[1mAssertionError[22m: expected [] to include 'startScheduler'[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m374:25[22m[39m
packages/orchestrator test:     [90m372|[39m
packages/orchestrator test:     [90m373|[39m       // Verify that startScheduler was called before server started l…
packages/orchestrator test:     [90m374|[39m       [34mexpect[39m(callOrder)[33m.[39m[34mtoContain[39m([32m"startScheduler"[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                         [31m^[39m
packages/orchestrator test:     [90m375|[39m       [34mexpect[39m(schedulerMock)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m376|[39m     })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC3: Startup logs indicate scheduler has been initialized[2m > [22mshould log scheduler initialization message
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m386:29[22m[39m
packages/orchestrator test:     [90m384|[39m       [90m// The scheduler module itself should log initialization[39m
packages/orchestrator test:     [90m385|[39m       // We verify that startScheduler was called, which logs internal…
packages/orchestrator test:     [90m386|[39m       [34mexpect[39m(schedulerMock)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m   |[39m                             [31m^[39m
packages/orchestrator test:     [90m387|[39m     })[33m;[39m
packages/orchestrator test:     [90m388|[39m   })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC4: Service continues to start even if scheduler initialization fails[2m > [22mshould continue starting server if startScheduler() throws
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m471:29[22m[39m
packages/orchestrator test:     [90m469|[39m
packages/orchestrator test:     [90m470|[39m       [90m// Verify that startScheduler was called[39m
packages/orchestrator test:     [90m471|[39m       [34mexpect[39m(schedulerMock)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m   |[39m                             [31m^[39m
packages/orchestrator test:     [90m472|[39m
packages/orchestrator test:     [90m473|[39m       [90m// Verify that error was logged[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mAC4: Service continues to start even if scheduler initialization fails[2m > [22mshould log error when startScheduler() fails
packages/orchestrator test: [31m[1mAssertionError[22m: expected 0 to be greater than 0[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m564:32[22m[39m
packages/orchestrator test:     [90m562|[39m
packages/orchestrator test:     [90m563|[39m       [90m// Verify that error was logged[39m
packages/orchestrator test:     [90m564|[39m       [34mexpect[39m(errorLogs[33m.[39mlength)[33m.[39m[34mtoBeGreaterThan[39m([34m0[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                                [31m^[39m
packages/orchestrator test:     [90m565|[39m
packages/orchestrator test:     [90m566|[39m       [90m// Clean up[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index-task15.test.ts[2m > [22mTask-15: Initialize scheduler in orchestrator startup[2m > [22mIntegration: Scheduler initialization with migrations[2m > [22mshould call runMigrations() before startScheduler()
packages/orchestrator test: [31m[1mAssertionError[22m: expected [ 'runMigrations' ] to deeply equal [ 'runMigrations', 'startScheduler' ][39m
packages/orchestrator test: [32m- Expected[39m
packages/orchestrator test: [31m+ Received[39m
packages/orchestrator test: [2m  [[22m
packages/orchestrator test: [2m    "runMigrations",[22m
packages/orchestrator test: [32m-   "startScheduler",[39m
packages/orchestrator test: [2m  ][22m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index-task15.test.ts:[2m652:25[22m[39m
packages/orchestrator test:     [90m650|[39m
packages/orchestrator test:     [90m651|[39m       [90m// Verify call order: migrations before scheduler[39m
packages/orchestrator test:     [90m652|[39m       [34mexpect[39m(callOrder)[33m.[39m[34mtoEqual[39m([[32m"runMigrations"[39m[33m,[39m [32m"startScheduler"[39m])[33m;[39m
packages/orchestrator test:     [90m   |[39m                         [31m^[39m
packages/orchestrator test:     [90m653|[39m
packages/orchestrator test:     [90m654|[39m       [90m// Clean up[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mPOST /dismiss-nudge endpoint[2m > [22mAC1: accepts nudge_id in request body and returns 200
packages/orchestrator test: [31m[1mAssertionError[22m: expected 400 to be 200 // Object.is equality[39m
packages/orchestrator test: [32m- Expected[39m
packages/orchestrator test: [31m+ Received[39m
packages/orchestrator test: [32m- 200[39m
packages/orchestrator test: [31m+ 400[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m923:28[22m[39m
packages/orchestrator test:     [90m921|[39m       nudge_id[33m:[39m [34m42[39m[33m,[39m
packages/orchestrator test:     [90m922|[39m     })[33m;[39m
packages/orchestrator test:     [90m923|[39m     [34mexpect[39m(res[33m.[39mstatusCode)[33m.[39m[34mtoBe[39m([34m200[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m924|[39m   })[33m;[39m
packages/orchestrator test:     [90m925|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/9]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mPOST /dismiss-nudge endpoint[2m > [22mAC2: calls dismiss_nudge tool function with nudge_id
packages/orchestrator test: [31m[1mAssertionError[22m: expected 400 to be 200 // Object.is equality[39m
packages/orchestrator test: [32m- Expected[39m
packages/orchestrator test: [31m+ Received[39m
packages/orchestrator test: [32m- 200[39m
packages/orchestrator test: [31m+ 400[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m1007:28[22m[39m
packages/orchestrator test:     [90m1005|[39m     })[33m;[39m
packages/orchestrator test:     [90m1006|[39m
packages/orchestrator test:     [90m1007|[39m     [34mexpect[39m(res[33m.[39mstatusCode)[33m.[39m[34mtoBe[39m([34m200[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m1008|[39m     [34mexpect[39m(dismissNudgeMock)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m1009|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/9]⎯[22m[39m
packages/orchestrator test: [2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m23 passed[39m[22m[90m (25)[39m
packages/orchestrator test: [2m      Tests [22m [1m[31m9 failed[39m[22m[2m | [22m[1m[32m650 passed[39m[22m[90m (659)[39m
packages/orchestrator test: [2m   Start at [22m 05:53:50
packages/orchestrator test: [2m   Duration [22m 7.42s[2m (transform 1.93s, setup 0ms, import 2.53s, tests 13.57s, environment 4ms)[22m
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC1%3A Orchestrator calls startScheduler() during service initialization > should call startScheduler() during main(),line=287,column=29::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/__tests__/index-task15.test.ts:287:29%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC1%3A Orchestrator calls startScheduler() during service initialization > should call startScheduler() exactly once,line=294,column=29::AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times%0A ❯ src/__tests__/index-task15.test.ts:294:29%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC2%3A Scheduler starts before HTTP server begins accepting requests > should call startScheduler() before server.listen(),line=374,column=25::AssertionError: expected [] to include 'startScheduler'%0A ❯ src/__tests__/index-task15.test.ts:374:25%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC3%3A Startup logs indicate scheduler has been initialized > should log scheduler initialization message,line=386,column=29::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/__tests__/index-task15.test.ts:386:29%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC4%3A Service continues to start even if scheduler initialization fails > should continue starting server if startScheduler() throws,line=471,column=29::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/__tests__/index-task15.test.ts:471:29%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > AC4%3A Service continues to start even if scheduler initialization fails > should log error when startScheduler() fails,line=564,column=32::AssertionError: expected 0 to be greater than 0%0A ❯ src/__tests__/index-task15.test.ts:564:32%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index-task15.test.ts,title=src/__tests__/index-task15.test.ts > Task-15%3A Initialize scheduler in orchestrator startup > Integration%3A Scheduler initialization with migrations > should call runMigrations() before startScheduler(),line=652,column=25::AssertionError: expected [ 'runMigrations' ] to deeply equal [ 'runMigrations', 'startScheduler' ]%0A%0A- Expected%0A+ Received%0A%0A  [%0A    "runMigrations",%0A-   "startScheduler",%0A  ]%0A%0A ❯ src/__tests__/index-task15.test.ts:652:25%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > POST /dismiss-nudge endpoint > AC1%3A accepts nudge_id in request body and returns 200,line=923,column=28::AssertionError: expected 400 to be 200 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 200%0A+ 400%0A%0A ❯ src/__tests__/index.test.ts:923:28%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > POST /dismiss-nudge endpoint > AC2%3A calls dismiss_nudge tool function with nudge_id,line=1007,column=28::AssertionError: expected 400 to be 200 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 200%0A+ 400%0A%0A ❯ src/__tests__/index.test.ts:1007:28%0A%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
