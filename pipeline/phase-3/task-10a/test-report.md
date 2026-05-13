Title: Test Report — task-10a — PASS

Verified by orchestrator hard gate after Developer attempt 2.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 58[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 73[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 111[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 12[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 12[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
packages/shared test: [2m      Tests [22m [1m[32m89 passed[39m[22m[90m (89)[39m
packages/shared test: [2m   Start at [22m 06:25:29
packages/shared test: [2m   Duration [22m 608ms[2m (transform 238ms, setup 0ms, import 394ms, tests 279ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 16[2mms[22m[39m
packages/orchestrator test:  [31m❯[39m src/__tests__/scheduler.test.ts [2m([22m[2m13 tests[22m[2m | [22m[31m13 failed[39m[2m)[22m[32m 156[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should export startScheduler function[39m[32m 61[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should initialize scheduler without throwing[39m[32m 6[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should schedule nudge evaluator to run every 15 minutes[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should query nudges table for pending nudges past trigger_at[39m[32m 5[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should enforce maximum 3 nudges sent per hour[39m[32m 26[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should update nudge status to sent when sending[39m[32m 31[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should handle database errors gracefully[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should only process pending nudges[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should only process nudges with trigger_at in the past[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should call schedule function from node-cron[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should start the scheduled jobs[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should use parameterized queries for nudge lookup[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m       [31m×[31m should track sent nudges to enforce hourly rate limit[39m[32m 2[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m36 tests[22m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1027[2mms[22m[39m
packages/bot test: [2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
packages/bot test: [2m      Tests [22m [1m[32m63 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (64)[39m
packages/bot test: [2m   Start at [22m 06:25:30
packages/bot test: [2m   Duration [22m 1.48s[2m (transform 326ms, setup 0ms, import 372ms, tests 1.04s, environment 0ms)[22m
packages/bot test: Done
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m25 tests[22m[2m)[22m[33m 1031[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1398[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 279[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 458[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task4.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 239[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 184[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 290[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 240[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/todoist-task1.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 196[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 198[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t20.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 123[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t19.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 162[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events.test.ts [2m([22m[2m52 tests[22m[2m)[22m[32m 177[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7b.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 167[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task8.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 109[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-implied-actions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 137[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7a.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 163[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/people.test.ts [2m([22m[2m48 tests[22m[2m)[22m[32m 173[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typecheck-async-await.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 5535[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typechecks without errors (tsc --noEmit) [33m 1182[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typechecks without errors (tsc --noEmit) [33m 1364[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typecheck output contains no 'error TS' messages [33m 1524[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typecheck output contains no 'error TS' messages [33m 1461[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/gmail-email-interactions.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 90[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-async-await.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/nudges.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 55[2mms[22m[39m
packages/orchestrator test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 13 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mstartScheduler function[2m > [22mshould export startScheduler function
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mstartScheduler function[2m > [22mshould initialize scheduler without throwing
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould schedule nudge evaluator to run every 15 minutes
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould query nudges table for pending nudges past trigger_at
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould enforce maximum 3 nudges sent per hour
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould update nudge status to sent when sending
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould handle database errors gracefully
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould only process pending nudges
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mNudge evaluator cron job[2m > [22mshould only process nudges with trigger_at in the past
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mCron job initialization[2m > [22mshould call schedule function from node-cron
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mCron job initialization[2m > [22mshould start the scheduled jobs
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mSecurity and rate limiting[2m > [22mshould use parameterized queries for nudge lookup
packages/orchestrator test: [41m[1m FAIL [22m[49m src/__tests__/scheduler.test.ts[2m > [22mScheduler[2m > [22mSecurity and rate limiting[2m > [22mshould track sent nudges to enforce hourly rate limit
packages/orchestrator test: [31m[1mError[22m: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts[39m
packages/orchestrator test: [36m [2m❯[22m src/__tests__/scheduler.test.ts:[2m46:23[22m[39m
packages/orchestrator test:     [90m 44|[39m     }))[33m;[39m
packages/orchestrator test:     [90m 45|[39m
packages/orchestrator test:     [90m 46|[39m     schedulerModule [33m=[39m [35mawait[39m [35mimport[39m([32m"../scheduler.js"[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                       [31m^[39m
packages/orchestrator test:     [90m 47|[39m   })[33m;[39m
packages/orchestrator test:     [90m 48|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/13]⎯[22m[39m
packages/orchestrator test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m22 passed[39m[22m[90m (23)[39m
packages/orchestrator test: [2m      Tests [22m [1m[31m13 failed[39m[22m[2m | [22m[1m[32m584 passed[39m[22m[90m (597)[39m
packages/orchestrator test: [2m   Start at [22m 06:25:30
packages/orchestrator test: [2m   Duration [22m 6.30s[2m (transform 1.87s, setup 0ms, import 2.38s, tests 11.58s, environment 6ms)[22m
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should export startScheduler function,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > startScheduler function > should initialize scheduler without throwing,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should schedule nudge evaluator to run every 15 minutes,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should query nudges table for pending nudges past trigger_at,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should enforce maximum 3 nudges sent per hour,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should update nudge status to sent when sending,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should handle database errors gracefully,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process pending nudges,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Nudge evaluator cron job > should only process nudges with trigger_at in the past,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should call schedule function from node-cron,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Cron job initialization > should start the scheduled jobs,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should use parameterized queries for nudge lookup,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts,title=src/__tests__/scheduler.test.ts > Scheduler > Security and rate limiting > should track sent nudges to enforce hourly rate limit,line=46,column=23::Error: Cannot find module '/src/scheduler.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/__tests__/scheduler.test.ts%0A ❯ src/__tests__/scheduler.test.ts:46:23%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
