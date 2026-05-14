Title: Test Report — task-4a — PASS

Verified by orchestrator hard gate after Developer attempt 2.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 80[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 80[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 133[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
packages/shared test: [2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
packages/shared test: [2m   Start at [22m 08:00:09
packages/shared test: [2m   Duration [22m 777ms[2m (transform 274ms, setup 0ms, import 457ms, tests 339ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/orchestrator test:  [31m❯[39m src/tools/__tests__/strava.test.ts [2m([22m[2m22 tests[22m[2m | [22m[31m22 failed[39m[2m)[22m[32m 181[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should generate OAuth URL with correct Strava authorization endpoint[39m[32m 49[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include client_id in OAuth URL[39m[32m 11[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include redirect_uri in OAuth URL[39m[32m 6[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include response_type=code in OAuth URL[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include scope parameter in OAuth URL[39m[32m 5[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should generate a unique state token[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should store state token in database with expiration[39m[32m 16[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should set state token expiration to 10 minutes from now[39m[32m 27[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include state token in returned OAuth URL[39m[32m 8[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should validate state token exists in database before accepting callback[39m[32m 8[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should reject invalid state tokens[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should reject expired state tokens[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should delete state token after validation[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle database connection errors gracefully[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle database query errors when storing state token[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle database errors when validating state token[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should log database errors appropriately[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return meaningful error message on database failure[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should accept empty input object[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return a valid URL string[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should generate cryptographically secure state tokens[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should generate state tokens of sufficient length for security[39m[32m 5[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 1271[2mms[22m[39m
packages/bot test:      [33m[2m✓[22m[39m extracts nudge ID from dismiss_nudge_<id> callback_data format [33m 360[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m36 tests[22m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1116[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1276[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/bot test: [2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
packages/bot test: [2m      Tests [22m [1m[32m117 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (118)[39m
packages/bot test: [2m   Start at [22m 08:00:10
packages/bot test: [2m   Duration [22m 2.02s[2m (transform 682ms, setup 0ms, import 894ms, tests 3.68s, environment 1ms)[22m
packages/bot test: Done
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1596[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1363[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 540[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 312[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 356[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 210[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 284[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task4.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 227[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t19.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 212[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 192[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/todoist-task1.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 229[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/scheduler.test.ts [2m([22m[2m32 tests[22m[2m)[22m[32m 200[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-implied-actions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 158[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t20.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 169[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7b.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 165[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 182[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-task15.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 105[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/people.test.ts [2m([22m[2m48 tests[22m[2m)[22m[32m 174[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/nudges.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 88[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typecheck-async-await.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6688[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typechecks without errors (tsc --noEmit) [33m 1680[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typechecks without errors (tsc --noEmit) [33m 1658[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typecheck output contains no 'error TS' messages [33m 1706[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typecheck output contains no 'error TS' messages [33m 1640[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7a.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 129[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task8.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 106[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events_nudges.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 65[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/gmail-email-interactions.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 100[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-async-await.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/orchestrator test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 22 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mOAuth URL generation[2m > [22mshould generate OAuth URL with correct Strava authorization endpoint
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mOAuth URL generation[2m > [22mshould include client_id in OAuth URL
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mOAuth URL generation[2m > [22mshould include redirect_uri in OAuth URL
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mOAuth URL generation[2m > [22mshould include response_type=code in OAuth URL
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mOAuth URL generation[2m > [22mshould include scope parameter in OAuth URL
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token generation and storage[2m > [22mshould generate a unique state token
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token generation and storage[2m > [22mshould store state token in database with expiration
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token generation and storage[2m > [22mshould set state token expiration to 10 minutes from now
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token generation and storage[2m > [22mshould include state token in returned OAuth URL
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mCSRF protection[2m > [22mshould validate state token exists in database before accepting callback
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mCSRF protection[2m > [22mshould reject invalid state tokens
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mCSRF protection[2m > [22mshould reject expired state tokens
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mCSRF protection[2m > [22mshould delete state token after validation
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mError handling[2m > [22mshould handle database connection errors gracefully
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mError handling[2m > [22mshould handle database query errors when storing state token
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mError handling[2m > [22mshould handle database errors when validating state token
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mError handling[2m > [22mshould log database errors appropriately
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mError handling[2m > [22mshould return meaningful error message on database failure
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mInput validation[2m > [22mshould accept empty input object
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mInput validation[2m > [22mshould return a valid URL string
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token properties[2m > [22mshould generate cryptographically secure state tokens
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_oauth_url[2m > [22mState token properties[2m > [22mshould generate state tokens of sufficient length for security
packages/orchestrator test: [31m[1mError[22m: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m34:20[22m[39m
packages/orchestrator test:     [90m 32|[39m       }[33m,[39m
packages/orchestrator test:     [90m 33|[39m     }))[33m;[39m
packages/orchestrator test:     [90m 34|[39m     stravaModule [33m=[39m [35mawait[39m [35mimport[39m([32m"../strava.js"[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                    [31m^[39m
packages/orchestrator test:     [90m 35|[39m   })[33m;[39m
packages/orchestrator test:     [90m 36|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/22]⎯[22m[39m
packages/orchestrator test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m25 passed[39m[22m[90m (26)[39m
packages/orchestrator test: [2m      Tests [22m [1m[31m22 failed[39m[22m[2m | [22m[1m[32m659 passed[39m[22m[90m (681)[39m
packages/orchestrator test: [2m   Start at [22m 08:00:10
packages/orchestrator test: [2m   Duration [22m 7.63s[2m (transform 1.89s, setup 0ms, import 2.54s, tests 14.04s, environment 4ms)[22m
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > OAuth URL generation > should generate OAuth URL with correct Strava authorization endpoint,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > OAuth URL generation > should include client_id in OAuth URL,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > OAuth URL generation > should include redirect_uri in OAuth URL,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > OAuth URL generation > should include response_type=code in OAuth URL,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > OAuth URL generation > should include scope parameter in OAuth URL,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token generation and storage > should generate a unique state token,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token generation and storage > should store state token in database with expiration,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token generation and storage > should set state token expiration to 10 minutes from now,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token generation and storage > should include state token in returned OAuth URL,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > CSRF protection > should validate state token exists in database before accepting callback,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > CSRF protection > should reject invalid state tokens,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > CSRF protection > should reject expired state tokens,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > CSRF protection > should delete state token after validation,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Error handling > should handle database connection errors gracefully,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Error handling > should handle database query errors when storing state token,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Error handling > should handle database errors when validating state token,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Error handling > should log database errors appropriately,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Error handling > should return meaningful error message on database failure,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Input validation > should accept empty input object,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > Input validation > should return a valid URL string,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token properties > should generate cryptographically secure state tokens,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_oauth_url > State token properties > should generate state tokens of sufficient length for security,line=34,column=20::Error: Cannot find module '/src/tools/strava.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts%0A ❯ src/tools/__tests__/strava.test.ts:34:20%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
