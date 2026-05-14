Title: Test Report — task-5a — PASS

Verified by orchestrator hard gate after Developer attempt 1.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 113[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 82[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 112[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 10[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 17[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
packages/shared test: [2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
packages/shared test: [2m   Start at [22m 08:30:25
packages/shared test: [2m   Duration [22m 778ms[2m (transform 358ms, setup 0ms, import 490ms, tests 357ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 1023[2mms[22m[39m
packages/bot test:  [31m❯[39m src/__tests__/index.test.ts [2m([22m[2m52 tests[22m[2m | [22m[31m10 failed[39m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1177[2mms[22m[39m
packages/bot test:      [32m✓[39m imports without throwing[32m 31[2mms[22m[39m
packages/bot test:      [32m✓[39m constructs TelegramBot with the configured token[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m starts in polling mode when BOT_MODE=polling[32m 7[2mms[22m[39m
packages/bot test:      [2m[90m↓[39m[22m starts in webhook mode when BOT_MODE=webhook
packages/bot test:      [32m✓[39m registers at least one onText handler for all messages[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m registers a callback_query event handler[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /message path[32m 62[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m sends application/json content-type[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, text, message_id and from_username in the body[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m omits from_username when message has no from field[32m 40[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /callback path[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method for /callback[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, callback_query_id, callback_data, message_id in body[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m ignores callback_query with no associated message/chat (no fetch call)[32m 40[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /message[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /message[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 500 on /message[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /callback[32m 43[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /callback[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 502 on /callback[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m does not crash if sendMessage itself throws during error reply[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /message[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /callback[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID[32m 7[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID[32m 5[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for chat_id 0[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for negative chat_id[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards text message from allowed chat_id to orchestrator[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards callback_query from allowed chat_id to orchestrator[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a text message from an unknown chat_id[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised text sender[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a callback_query from an unknown chat_id[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised callback_query sender[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a text message[32m 41[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a callback_query[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts a valid authorization code parameter[32m 7[2mms[22m[39m
packages/bot test:      [32m✓[39m validates state token against database before processing authorization code[32m 5[2mms[22m[39m
packages/bot test: [31m     [31m×[31m rejects callback with missing state parameter[39m[32m 28[2mms[22m[39m
packages/bot test: [31m     [31m×[31m rejects callback with missing authorization code parameter[39m[32m 4[2mms[22m[39m
packages/bot test: [31m     [31m×[31m rejects callback with empty state parameter[39m[32m 3[2mms[22m[39m
packages/bot test: [31m     [31m×[31m rejects callback with empty authorization code parameter[39m[32m 3[2mms[22m[39m
packages/bot test: [31m     [31m×[31m returns 401 when state token is not found in database[39m[32m 3[2mms[22m[39m
packages/bot test: [31m     [31m×[31m returns 401 when state token has expired[39m[32m 3[2mms[22m[39m
packages/bot test: [31m     [31m×[31m returns 400 when authorization code is invalid[39m[32m 3[2mms[22m[39m
packages/bot test: [31m     [31m×[31m logs error when state token validation fails[39m[32m 34[2mms[22m[39m
packages/bot test: [31m     [31m×[31m logs error when authorization code exchange fails[39m[32m 48[2mms[22m[39m
packages/bot test: [31m     [31m×[31m deletes state token after successful validation to prevent reuse[39m[32m 6[2mms[22m[39m
packages/bot test:      [32m✓[39m extracts authorization code from query parameters[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with special characters[32m 2[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with alphanumeric characters[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m passes authorization code to token exchange process[32m 3[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1290[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 18[2mms[22m[39m
packages/bot test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 10 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-1: OAuth callback endpoint validates state token for CSRF protection[2m > [22mrejects callback with missing state parameter
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 400 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 400[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m815:29[22m[39m
packages/bot test:     [90m813|[39m     [90m// Missing state parameter should be rejected[39m
packages/bot test:     [90m814|[39m     const response = await fetch("http://localhost:3001/oauth/callback…
packages/bot test:     [90m815|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m400[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m816|[39m   })[33m;[39m
packages/bot test:     [90m817|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-1: OAuth callback endpoint validates state token for CSRF protection[2m > [22mrejects callback with missing authorization code parameter
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 400 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 400[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m829:29[22m[39m
packages/bot test:     [90m827|[39m     [90m// Missing code parameter should be rejected[39m
packages/bot test:     [90m828|[39m     const response = await fetch("http://localhost:3001/oauth/callback…
packages/bot test:     [90m829|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m400[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m830|[39m   })[33m;[39m
packages/bot test:     [90m831|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-1: OAuth callback endpoint validates state token for CSRF protection[2m > [22mrejects callback with empty state parameter
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 400 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 400[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m843:29[22m[39m
packages/bot test:     [90m841|[39m     [90m// Empty state parameter should be rejected[39m
packages/bot test:     [90m842|[39m     const response = await fetch("http://localhost:3001/oauth/callback…
packages/bot test:     [90m843|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m400[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m844|[39m   })[33m;[39m
packages/bot test:     [90m845|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-1: OAuth callback endpoint validates state token for CSRF protection[2m > [22mrejects callback with empty authorization code parameter
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 400 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 400[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m859:29[22m[39m
packages/bot test:     [90m857|[39m       "http://localhost:3001/oauth/callback?code=&state=valid_state_to…
packages/bot test:     [90m858|[39m     )[33m;[39m
packages/bot test:     [90m859|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m400[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m860|[39m   })[33m;[39m
packages/bot test:     [90m861|[39m })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mreturns 401 when state token is not found in database
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 401 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 401[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m881:29[22m[39m
packages/bot test:     [90m879|[39m       "http://localhost:3001/oauth/callback?code=auth_code_123&state=n…
packages/bot test:     [90m880|[39m     )[33m;[39m
packages/bot test:     [90m881|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m401[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m882|[39m   })[33m;[39m
packages/bot test:     [90m883|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mreturns 401 when state token has expired
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 401 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 401[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m897:29[22m[39m
packages/bot test:     [90m895|[39m       "http://localhost:3001/oauth/callback?code=auth_code_123&state=e…
packages/bot test:     [90m896|[39m     )[33m;[39m
packages/bot test:     [90m897|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m401[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m898|[39m   })[33m;[39m
packages/bot test:     [90m899|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mreturns 400 when authorization code is invalid
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 400 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 400[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m913:29[22m[39m
packages/bot test:     [90m911|[39m       "http://localhost:3001/oauth/callback?code=invalid_code&state=va…
packages/bot test:     [90m912|[39m     )[33m;[39m
packages/bot test:     [90m913|[39m     [34mexpect[39m(response[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m400[39m)[33m;[39m
packages/bot test:     [90m   |[39m                             [31m^[39m
packages/bot test:     [90m914|[39m   })[33m;[39m
packages/bot test:     [90m915|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mlogs error when state token validation fails
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m930:30[22m[39m
packages/bot test:     [90m928|[39m
packages/bot test:     [90m929|[39m     [90m// Error should be logged[39m
packages/bot test:     [90m930|[39m     [34mexpect[39m(fakeLogger[33m.[39merror)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/bot test:     [90m   |[39m                              [31m^[39m
packages/bot test:     [90m931|[39m   })[33m;[39m
packages/bot test:     [90m932|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mlogs error when authorization code exchange fails
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called at least once[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m947:30[22m[39m
packages/bot test:     [90m945|[39m
packages/bot test:     [90m946|[39m     [90m// Error should be logged[39m
packages/bot test:     [90m947|[39m     [34mexpect[39m(fakeLogger[33m.[39merror)[33m.[39m[34mtoHaveBeenCalled[39m()[33m;[39m
packages/bot test:     [90m   |[39m                              [31m^[39m
packages/bot test:     [90m948|[39m   })[33m;[39m
packages/bot test:     [90m949|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/10]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-2: Error handling for invalid authorization codes or expired state tokens[2m > [22mdeletes state token after successful validation to prevent reuse
packages/bot test: [31m[1mAssertionError[22m: expected 200 to be 401 // Object.is equality[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 401[39m
packages/bot test: [31m+ 200[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m969:30[22m[39m
packages/bot test:     [90m967|[39m       "http://localhost:3001/oauth/callback?code=auth_code_456&state=v…
packages/bot test:     [90m968|[39m     )[33m;[39m
packages/bot test:     [90m969|[39m     [34mexpect[39m(response2[33m.[39mstatus)[33m.[39m[34mtoBe[39m([34m401[39m)[33m;[39m
packages/bot test:     [90m   |[39m                              [31m^[39m
packages/bot test:     [90m970|[39m   })[33m;[39m
packages/bot test:     [90m971|[39m })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/10]⎯[22m[39m
packages/bot test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m3 passed[39m[22m[90m (4)[39m
packages/bot test: [2m      Tests [22m [1m[31m10 failed[39m[22m[2m | [22m[1m[32m123 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (134)[39m
packages/bot test: [2m   Start at [22m 08:30:26
packages/bot test: [2m   Duration [22m 1.90s[2m (transform 746ms, setup 0ms, import 890ms, tests 3.51s, environment 1ms)[22m
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-1%3A OAuth callback endpoint validates state token for CSRF protection > rejects callback with missing state parameter,line=815,column=29::AssertionError: expected 200 to be 400 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 400%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:815:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-1%3A OAuth callback endpoint validates state token for CSRF protection > rejects callback with missing authorization code parameter,line=829,column=29::AssertionError: expected 200 to be 400 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 400%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:829:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-1%3A OAuth callback endpoint validates state token for CSRF protection > rejects callback with empty state parameter,line=843,column=29::AssertionError: expected 200 to be 400 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 400%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:843:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-1%3A OAuth callback endpoint validates state token for CSRF protection > rejects callback with empty authorization code parameter,line=859,column=29::AssertionError: expected 200 to be 400 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 400%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:859:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > returns 401 when state token is not found in database,line=881,column=29::AssertionError: expected 200 to be 401 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 401%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:881:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > returns 401 when state token has expired,line=897,column=29::AssertionError: expected 200 to be 401 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 401%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:897:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > returns 400 when authorization code is invalid,line=913,column=29::AssertionError: expected 200 to be 400 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 400%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:913:29%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > logs error when state token validation fails,line=930,column=30::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/__tests__/index.test.ts:930:30%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > logs error when authorization code exchange fails,line=947,column=30::AssertionError: expected "vi.fn()" to be called at least once%0A ❯ src/__tests__/index.test.ts:947:30%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-2%3A Error handling for invalid authorization codes or expired state tokens > deletes state token after successful validation to prevent reuse,line=969,column=30::AssertionError: expected 200 to be 401 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 401%0A+ 200%0A%0A ❯ src/__tests__/index.test.ts:969:30%0A%0A
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1312[2mms[22m[39m
packages/bot test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/bot@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
