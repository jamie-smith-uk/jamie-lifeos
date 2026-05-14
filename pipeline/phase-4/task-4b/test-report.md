Title: Test Report — task-4b — PASS

Verified by orchestrator hard gate after Developer attempt 1.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 112[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 118[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 99[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 17[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 8[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 13[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
packages/shared test: [2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
packages/shared test: [2m   Start at [22m 08:12:16
packages/shared test: [2m   Duration [22m 808ms[2m (transform 345ms, setup 0ms, import 462ms, tests 373ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test:  [31m❯[39m src/tools/__tests__/strava.test.ts [2m([22m[2m45 tests[22m[2m | [22m[31m23 failed[39m[2m)[22m[32m 197[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should generate OAuth URL with correct Strava authorization endpoint[32m 55[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should include client_id in OAuth URL[32m 5[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should include redirect_uri in OAuth URL[32m 21[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should include response_type=code in OAuth URL[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should include scope parameter in OAuth URL[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should generate a unique state token[32m 3[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should store state token in database with expiration[32m 4[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should set state token expiration to 10 minutes from now[32m 3[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should include state token in returned OAuth URL[32m 3[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should validate state token exists in database before accepting callback[32m 5[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should reject invalid state tokens[32m 4[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should reject expired state tokens[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should delete state token after validation[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should handle database connection errors gracefully[32m 4[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should handle database query errors when storing state token[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should handle database errors when validating state token[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should log database errors appropriately[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should return meaningful error message on database failure[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should accept empty input object[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should return a valid URL string[32m 2[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should generate cryptographically secure state tokens[32m 4[2mms[22m[39m
packages/orchestrator test:          [32m✓[39m should generate state tokens of sufficient length for security[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should query activities with sport_type filter[39m[32m 11[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should query activities with date range filter[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return empty array when no activities match filters[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include all activity fields in results[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should check token expiration before querying activities[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should refresh token if expired[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should use refreshed token for subsequent queries[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle database connection errors gracefully[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle query errors when fetching credentials[39m[32m 1[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle query errors when fetching activities[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should log errors appropriately[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should calculate weekly volume from activities[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return weekly volume data with distance and time[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should calculate pace trends from activities[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return pace trends by sport type[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should check token expiration before analyzing trends[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should refresh token if expired before trend analysis[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle database connection errors gracefully[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle query errors when fetching credentials[39m[32m 1[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle query errors when fetching trend data[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should log errors appropriately[39m[32m 6[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return trends object with weekly_volume and pace_trends[39m[32m 2[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle empty trend data[39m[32m 2[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 997[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m36 tests[22m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1125[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1312[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/bot test: [2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
packages/bot test: [2m      Tests [22m [1m[32m117 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (118)[39m
packages/bot test: [2m   Start at [22m 08:12:17
packages/bot test: [2m   Duration [22m 1.94s[2m (transform 1.06s, setup 0ms, import 1.11s, tests 3.45s, environment 1ms)[22m
packages/bot test: Done
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1584[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1293[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 486[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 348[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 325[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 206[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/todoist-task1.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 265[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 255[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 211[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t19.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 221[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/scheduler.test.ts [2m([22m[2m32 tests[22m[2m)[22m[32m 226[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task4.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 236[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7b.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 161[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 228[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t20.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 175[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-implied-actions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 177[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/gmail-email-interactions.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 130[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/people.test.ts [2m([22m[2m48 tests[22m[2m)[22m[32m 191[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typecheck-async-await.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6659[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typechecks without errors (tsc --noEmit) [33m 1690[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typechecks without errors (tsc --noEmit) [33m 1580[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typecheck output contains no 'error TS' messages [33m 1717[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typecheck output contains no 'error TS' messages [33m 1670[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7a.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 111[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task8.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 107[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-task15.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 80[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/nudges.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 98[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events_nudges.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 64[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-async-await.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 16[2mms[22m[39m
packages/orchestrator test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 23 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mDatabase queries with filters[2m > [22mshould query activities with sport_type filter
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m648:43[22m[39m
packages/orchestrator test:     [90m646|[39m         })[33m;[39m
packages/orchestrator test:     [90m647|[39m
packages/orchestrator test:     [90m648|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m649|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m650|[39m           sport_type[33m:[39m [32m"Run"[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mDatabase queries with filters[2m > [22mshould query activities with date range filter
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m698:43[22m[39m
packages/orchestrator test:     [90m696|[39m         })[33m;[39m
packages/orchestrator test:     [90m697|[39m
packages/orchestrator test:     [90m698|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m699|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m700|[39m           start_date[33m:[39m [32m"2026-05-01"[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mDatabase queries with filters[2m > [22mshould return empty array when no activities match filters
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m737:43[22m[39m
packages/orchestrator test:     [90m735|[39m         })[33m;[39m
packages/orchestrator test:     [90m736|[39m
packages/orchestrator test:     [90m737|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m738|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m739|[39m           sport_type[33m:[39m [32m"Swim"[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mDatabase queries with filters[2m > [22mshould include all activity fields in results
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m795:43[22m[39m
packages/orchestrator test:     [90m793|[39m         })[33m;[39m
packages/orchestrator test:     [90m794|[39m
packages/orchestrator test:     [90m795|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m796|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m797|[39m         })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mToken refresh logic[2m > [22mshould check token expiration before querying activities
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m835:28[22m[39m
packages/orchestrator test:     [90m833|[39m         })[33m;[39m
packages/orchestrator test:     [90m834|[39m
packages/orchestrator test:     [90m835|[39m         [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m836|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m837|[39m         })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mToken refresh logic[2m > [22mshould refresh token if expired
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m890:28[22m[39m
packages/orchestrator test:     [90m888|[39m         })[33m;[39m
packages/orchestrator test:     [90m889|[39m
packages/orchestrator test:     [90m890|[39m         [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m891|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m892|[39m         })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mToken refresh logic[2m > [22mshould use refreshed token for subsequent queries
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m954:43[22m[39m
packages/orchestrator test:     [90m952|[39m         })[33m;[39m
packages/orchestrator test:     [90m953|[39m
packages/orchestrator test:     [90m954|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m955|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m956|[39m         })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mError handling[2m > [22mshould handle database connection errors gracefully
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m972:24[22m[39m
packages/orchestrator test:     [90m970|[39m
packages/orchestrator test:     [90m971|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m972|[39m           stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m973|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m974|[39m           })[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mError handling[2m > [22mshould handle query errors when fetching credentials
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m985:24[22m[39m
packages/orchestrator test:     [90m983|[39m
packages/orchestrator test:     [90m984|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m985|[39m           stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m986|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m987|[39m           })[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mError handling[2m > [22mshould handle query errors when fetching activities
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_activities is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1015:24[22m[39m
packages/orchestrator test:     [90m1013|[39m
packages/orchestrator test:     [90m1014|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m1015|[39m           stravaModule[33m.[39m[34mget_strava_activities[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m1016|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1017|[39m           })[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_activities[2m > [22mError handling[2m > [22mshould log errors appropriately
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1036:27[22m[39m
packages/orchestrator test:     [90m1034|[39m         }
packages/orchestrator test:     [90m1035|[39m
packages/orchestrator test:     [90m1036|[39m         [34mexpect[39m(mockQuery)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m   |[39m                           [31m^[39m
packages/orchestrator test:     [90m1037|[39m       })[33m;[39m
packages/orchestrator test:     [90m1038|[39m     })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mWeekly volume analysis[2m > [22mshould calculate weekly volume from activities
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1085:43[22m[39m
packages/orchestrator test:     [90m1083|[39m         })[33m;[39m
packages/orchestrator test:     [90m1084|[39m
packages/orchestrator test:     [90m1085|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1086|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1087|[39m           weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mWeekly volume analysis[2m > [22mshould return weekly volume data with distance and time
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1130:43[22m[39m
packages/orchestrator test:     [90m1128|[39m         })[33m;[39m
packages/orchestrator test:     [90m1129|[39m
packages/orchestrator test:     [90m1130|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1131|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1132|[39m           weeks[33m:[39m [34m1[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mPace trend analysis[2m > [22mshould calculate pace trends from activities
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1201:43[22m[39m
packages/orchestrator test:     [90m1199|[39m         })[33m;[39m
packages/orchestrator test:     [90m1200|[39m
packages/orchestrator test:     [90m1201|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1202|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1203|[39m           weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mPace trend analysis[2m > [22mshould return pace trends by sport type
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1265:43[22m[39m
packages/orchestrator test:     [90m1263|[39m         })[33m;[39m
packages/orchestrator test:     [90m1264|[39m
packages/orchestrator test:     [90m1265|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1266|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1267|[39m           weeks[33m:[39m [34m1[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mToken refresh logic[2m > [22mshould check token expiration before analyzing trends
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1314:28[22m[39m
packages/orchestrator test:     [90m1312|[39m         })[33m;[39m
packages/orchestrator test:     [90m1313|[39m
packages/orchestrator test:     [90m1314|[39m         [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m1315|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1316|[39m           weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mToken refresh logic[2m > [22mshould refresh token if expired before trend analysis
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1378:28[22m[39m
packages/orchestrator test:     [90m1376|[39m         })[33m;[39m
packages/orchestrator test:     [90m1377|[39m
packages/orchestrator test:     [90m1378|[39m         [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                            [31m^[39m
packages/orchestrator test:     [90m1379|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1380|[39m           weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mError handling[2m > [22mshould handle database connection errors gracefully
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1397:24[22m[39m
packages/orchestrator test:     [90m1395|[39m
packages/orchestrator test:     [90m1396|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m1397|[39m           stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m1398|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1399|[39m             weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mError handling[2m > [22mshould handle query errors when fetching credentials
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1411:24[22m[39m
packages/orchestrator test:     [90m1409|[39m
packages/orchestrator test:     [90m1410|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m1411|[39m           stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m1412|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1413|[39m             weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mError handling[2m > [22mshould handle query errors when fetching trend data
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1442:24[22m[39m
packages/orchestrator test:     [90m1440|[39m
packages/orchestrator test:     [90m1441|[39m         [35mawait[39m [34mexpect[39m(
packages/orchestrator test:     [90m1442|[39m           stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                        [31m^[39m
packages/orchestrator test:     [90m1443|[39m             athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1444|[39m             weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mError handling[2m > [22mshould log errors appropriately
packages/orchestrator test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1465:27[22m[39m
packages/orchestrator test:     [90m1463|[39m         }
packages/orchestrator test:     [90m1464|[39m
packages/orchestrator test:     [90m1465|[39m         [34mexpect[39m(mockQuery)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/orchestrator test:     [90m   |[39m                           [31m^[39m
packages/orchestrator test:     [90m1466|[39m       })[33m;[39m
packages/orchestrator test:     [90m1467|[39m     })[33m;[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mTrend data structure[2m > [22mshould return trends object with weekly_volume and pace_trends
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1521:43[22m[39m
packages/orchestrator test:     [90m1519|[39m         })[33m;[39m
packages/orchestrator test:     [90m1520|[39m
packages/orchestrator test:     [90m1521|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1522|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1523|[39m           weeks[33m:[39m [34m1[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/23]⎯[22m[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/strava.test.ts[2m > [22mStrava Tools[2m > [22mget_strava_trends[2m > [22mTrend data structure[2m > [22mshould handle empty trend data
packages/orchestrator test: [31m[1mTypeError[22m: stravaModule.get_strava_trends is not a function[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/strava.test.ts:[2m1568:43[22m[39m
packages/orchestrator test:     [90m1566|[39m         })[33m;[39m
packages/orchestrator test:     [90m1567|[39m
packages/orchestrator test:     [90m1568|[39m         [35mconst[39m result [33m=[39m [35mawait[39m stravaModule[33m.[39m[34mget_strava_trends[39m({
packages/orchestrator test:     [90m   |[39m                                           [31m^[39m
packages/orchestrator test:     [90m1569|[39m           athlete_id[33m:[39m [34m12345[39m[33m,[39m
packages/orchestrator test:     [90m1570|[39m           weeks[33m:[39m [34m4[39m[33m,[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/23]⎯[22m[39m
packages/orchestrator test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m25 passed[39m[22m[90m (26)[39m
packages/orchestrator test: [2m      Tests [22m [1m[31m23 failed[39m[22m[2m | [22m[1m[32m681 passed[39m[22m[90m (704)[39m
packages/orchestrator test: [2m   Start at [22m 08:12:17
packages/orchestrator test: [2m   Duration [22m 7.57s[2m (transform 2.07s, setup 0ms, import 2.60s, tests 14.05s, environment 3ms)[22m
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Database queries with filters > should query activities with sport_type filter,line=648,column=43::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:648:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Database queries with filters > should query activities with date range filter,line=698,column=43::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:698:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Database queries with filters > should return empty array when no activities match filters,line=737,column=43::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:737:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Database queries with filters > should include all activity fields in results,line=795,column=43::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:795:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Token refresh logic > should check token expiration before querying activities,line=835,column=28::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:835:28%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Token refresh logic > should refresh token if expired,line=890,column=28::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:890:28%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Token refresh logic > should use refreshed token for subsequent queries,line=954,column=43::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:954:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Error handling > should handle database connection errors gracefully,line=972,column=24::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:972:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Error handling > should handle query errors when fetching credentials,line=985,column=24::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:985:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Error handling > should handle query errors when fetching activities,line=1015,column=24::TypeError: stravaModule.get_strava_activities is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1015:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_activities > Error handling > should log errors appropriately,line=1036,column=27::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/tools/__tests__/strava.test.ts:1036:27%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Weekly volume analysis > should calculate weekly volume from activities,line=1085,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1085:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Weekly volume analysis > should return weekly volume data with distance and time,line=1130,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1130:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Pace trend analysis > should calculate pace trends from activities,line=1201,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1201:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Pace trend analysis > should return pace trends by sport type,line=1265,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1265:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Token refresh logic > should check token expiration before analyzing trends,line=1314,column=28::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1314:28%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Token refresh logic > should refresh token if expired before trend analysis,line=1378,column=28::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1378:28%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Error handling > should handle database connection errors gracefully,line=1397,column=24::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1397:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Error handling > should handle query errors when fetching credentials,line=1411,column=24::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1411:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Error handling > should handle query errors when fetching trend data,line=1442,column=24::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1442:24%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Error handling > should log errors appropriately,line=1465,column=27::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/tools/__tests__/strava.test.ts:1465:27%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Trend data structure > should return trends object with weekly_volume and pace_trends,line=1521,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1521:43%0A%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/strava.test.ts,title=src/tools/__tests__/strava.test.ts > Strava Tools > get_strava_trends > Trend data structure > should handle empty trend data,line=1568,column=43::TypeError: stravaModule.get_strava_trends is not a function%0A ❯ src/tools/__tests__/strava.test.ts:1568:43%0A%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
