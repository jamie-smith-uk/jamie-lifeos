Title: Test Report — task-5b — PASS

Verified by orchestrator hard gate after Developer attempt 5.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 69[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 68[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 117[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 18[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 7[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
packages/shared test: [2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
packages/shared test: [2m   Start at [22m 08:50:42
packages/shared test: [2m   Duration [22m 773ms[2m (transform 321ms, setup 0ms, import 522ms, tests 297ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/bot test:  [31m❯[39m src/__tests__/oauth-token-exchange.test.ts [2m([22m[2m16 tests[22m[2m | [22m[31m5 failed[39m[2m)[22m[33m 1175[2mms[22m[39m
packages/bot test: [31m     [31m×[31m makes a POST request to Strava token endpoint with authorization code[39m[32m 167[2mms[22m[39m
packages/bot test:      [32m✓[39m includes client_id, client_secret, and authorization code in token request[32m 73[2mms[22m[39m
packages/bot test:      [32m✓[39m extracts access_token and refresh_token from Strava response[32m 70[2mms[22m[39m
packages/bot test:      [32m✓[39m handles Strava API errors gracefully[32m 65[2mms[22m[39m
packages/bot test: [31m     [31m×[31m uses POST method for token exchange request[39m[32m 72[2mms[22m[39m
packages/bot test: [31m     [31m×[31m inserts access_token, refresh_token, and athlete_id into strava_credentials[39m[32m 67[2mms[22m[39m
packages/bot test: [31m     [31m×[31m stores tokens with correct expiry timestamp[39m[32m 65[2mms[22m[39m
packages/bot test:      [32m✓[39m uses parameterized query to prevent SQL injection[32m 65[2mms[22m[39m
packages/bot test:      [32m✓[39m handles database insert errors gracefully[32m 67[2mms[22m[39m
packages/bot test: [31m     [31m×[31m stores athlete_id as BIGINT from Strava response[39m[32m 69[2mms[22m[39m
packages/bot test:      [32m✓[39m sends a Telegram message after successful token storage[32m 72[2mms[22m[39m
packages/bot test:      [32m✓[39m includes athlete first and last name in confirmation message[32m 64[2mms[22m[39m
packages/bot test:      [32m✓[39m sends message to the correct Telegram chat_id[32m 65[2mms[22m[39m
packages/bot test:      [32m✓[39m handles message sending errors gracefully[32m 63[2mms[22m[39m
packages/bot test:      [32m✓[39m logs confirmation message sending[32m 64[2mms[22m[39m
packages/bot test:      [32m✓[39m includes success confirmation in response message[32m 63[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1202[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1338[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1531[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 29[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 345[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 438[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 986[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[33m 302[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 397[2mms[22m[39m
packages/bot test:  [31m❯[39m src/__tests__/index.test.ts [2m([22m[2m52 tests[22m[2m | [22m[31m1 failed[39m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 3146[2mms[22m[39m
packages/bot test:      [32m✓[39m imports without throwing[32m 190[2mms[22m[39m
packages/bot test:      [32m✓[39m constructs TelegramBot with the configured token[32m 6[2mms[22m[39m
packages/bot test:      [32m✓[39m starts in polling mode when BOT_MODE=polling[32m 5[2mms[22m[39m
packages/bot test:      [2m[90m↓[39m[22m starts in webhook mode when BOT_MODE=webhook
packages/bot test:      [32m✓[39m registers at least one onText handler for all messages[32m 5[2mms[22m[39m
packages/bot test:      [32m✓[39m registers a callback_query event handler[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /message path[32m 60[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m sends application/json content-type[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, text, message_id and from_username in the body[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m omits from_username when message has no from field[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /callback path[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method for /callback[32m 32[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, callback_query_id, callback_data, message_id in body[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m ignores callback_query with no associated message/chat (no fetch call)[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /message[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /message[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 500 on /message[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /callback[32m 59[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /callback[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 502 on /callback[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m does not crash if sendMessage itself throws during error reply[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /message[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /callback[32m 41[2mms[22m[39m
packages/bot test:      [32m✓[39m returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for chat_id 0[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for negative chat_id[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards text message from allowed chat_id to orchestrator[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards callback_query from allowed chat_id to orchestrator[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a text message from an unknown chat_id[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised text sender[32m 39[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a callback_query from an unknown chat_id[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised callback_query sender[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a text message[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a callback_query[32m 33[2mms[22m[39m
packages/bot test: [31m     [31m×[31m accepts a valid authorization code parameter[39m[32m 134[2mms[22m[39m
packages/bot test:      [32m✓[39m validates state token against database before processing authorization code[32m 154[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with missing state parameter[32m 135[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with missing authorization code parameter[32m 123[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with empty state parameter[32m 109[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with empty authorization code parameter[32m 110[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 401 when state token is not found in database[32m 112[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 401 when state token has expired[32m 108[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 400 when authorization code is invalid[32m 108[2mms[22m[39m
packages/bot test:      [32m✓[39m logs error when state token validation fails[32m 142[2mms[22m[39m
packages/bot test:      [32m✓[39m logs error when authorization code exchange fails[32m 141[2mms[22m[39m
packages/bot test:      [32m✓[39m deletes state token after successful validation to prevent reuse[32m 131[2mms[22m[39m
packages/bot test:      [32m✓[39m extracts authorization code from query parameters[32m 109[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with special characters[32m 111[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with alphanumeric characters[32m 114[2mms[22m[39m
packages/bot test:      [32m✓[39m passes authorization code to token exchange process[32m 114[2mms[22m[39m
packages/bot test: [31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 6 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-05a AC-1: OAuth callback endpoint validates state token for CSRF protection[2m > [22maccepts a valid authorization code parameter
packages/bot test: [31m[1mTypeError[22m: fetch failed[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m781:22[22m[39m
packages/bot test:     [90m779|[39m
packages/bot test:     [90m780|[39m     [90m// Simulate an OAuth callback with valid code and state[39m
packages/bot test:     [90m781|[39m     [35mconst[39m response [33m=[39m [35mawait[39m [34mfetch[39m(
packages/bot test:     [90m   |[39m                      [31m^[39m
packages/bot test:     [90m782|[39m       "http://localhost:3001/oauth/callback?code=auth_code_123&state=v…
packages/bot test:     [90m783|[39m     )[33m;[39m
packages/bot test: {
packages/bot test:   stack: 'AggregateError: \n' +
packages/bot test:     '    at internalConnectMultiple (node:net:1122:18)\n' +
packages/bot test:     '    at afterConnectMultiple (node:net:1689:7)',
packages/bot test:   errors: [
packages/bot test:     {
packages/bot test:       stack: 'Error: connect ECONNREFUSED ::1:3001\n' +
packages/bot test:         '    at createConnectionError (node:net:1652:14)\n' +
packages/bot test:         '    at afterConnectMultiple (node:net:1682:16)',
packages/bot test:       message: 'connect ECONNREFUSED ::1:3001',
packages/bot test:       errno: -111,
packages/bot test:       code: 'ECONNREFUSED',
packages/bot test:       syscall: 'connect',
packages/bot test:       address: '::1',
packages/bot test:       port: 3001,
packages/bot test:       constructor: 'Function<Error>',
packages/bot test:       name: 'Error',
packages/bot test:       toString: 'Function<toString>'
packages/bot test:     },
packages/bot test:     {
packages/bot test:       stack: 'Error: connect ECONNREFUSED 127.0.0.1:3001\n' +
packages/bot test:         '    at createConnectionError (node:net:1652:14)\n' +
packages/bot test:         '    at afterConnectMultiple (node:net:1682:16)',
packages/bot test:       message: 'connect ECONNREFUSED 127.0.0.1:3001',
packages/bot test:       errno: -111,
packages/bot test:       code: 'ECONNREFUSED',
packages/bot test:       syscall: 'connect',
packages/bot test:       address: '127.0.0.1',
packages/bot test:       port: 3001,
packages/bot test:       constructor: 'Function<Error>',
packages/bot test:       name: 'Error',
packages/bot test:       toString: 'Function<toString>'
packages/bot test:     }
packages/bot test:   ],
packages/bot test:   code: 'ECONNREFUSED',
packages/bot test:   constructor: 'Function<AggregateError>',
packages/bot test:   name: 'Caused by: AggregateError',
packages/bot test:   message: '',
packages/bot test:   toString: 'Function<toString>',
packages/bot test:   stacks: []
packages/bot test: }
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22m[39m
packages/bot test: [31m[1mSerialized Error:[22m[39m [90m{ errors: [ { stack: 'Error: connect ECONNREFUSED ::1:3001\n    at createConnectionError (node:net:1652:14)\n    at afterConnectMultiple (node:net:1682:16)', message: 'connect ECONNREFUSED ::1:3001', errno: -111, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3001, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3001\n    at createConnectionError (node:net:1652:14)\n    at afterConnectMultiple (node:net:1682:16)', message: 'connect ECONNREFUSED 127.0.0.1:3001', errno: -111, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3001, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/oauth-token-exchange.test.ts[2m > [22mAC-1: Authorization code is exchanged for access and refresh tokens[2m > [22mmakes a POST request to Strava token endpoint with authorization code
packages/bot test: [31m[1mAssertionError[22m: expected undefined to be defined[39m
packages/bot test: [36m [2m❯[22m src/__tests__/oauth-token-exchange.test.ts:[2m204:24[22m[39m
packages/bot test:     [90m202|[39m     [90m// Verify that a request was made to Strava API[39m
packages/bot test:     [90m203|[39m     const stravaCall = stravaApiCalls.find((call) => call.url.includes…
packages/bot test:     [90m204|[39m     [34mexpect[39m(stravaCall)[33m.[39m[34mtoBeDefined[39m()[33m;[39m
packages/bot test:     [90m   |[39m                        [31m^[39m
packages/bot test:     [90m205|[39m   })[33m;[39m
packages/bot test:     [90m206|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/oauth-token-exchange.test.ts[2m > [22mAC-1: Authorization code is exchanged for access and refresh tokens[2m > [22muses POST method for token exchange request
packages/bot test: [31m[1mAssertionError[22m: expected undefined to be 'POST' // Object.is equality[39m
packages/bot test: [32m- Expected:[39m
packages/bot test: "POST"
packages/bot test: [31m+ Received:[39m
packages/bot test: undefined
packages/bot test: [36m [2m❯[22m src/__tests__/oauth-token-exchange.test.ts:[2m332:36[22m[39m
packages/bot test:     [90m330|[39m
packages/bot test:     [90m331|[39m     const tokenCall = stravaApiCalls.find((call) => call.url.includes(…
packages/bot test:     [90m332|[39m     [34mexpect[39m(tokenCall[33m?.[39minit[33m.[39mmethod)[33m.[39m[34mtoBe[39m([32m"POST"[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                    [31m^[39m
packages/bot test:     [90m333|[39m   })[33m;[39m
packages/bot test:     [90m334|[39m })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/oauth-token-exchange.test.ts[2m > [22mAC-2: Tokens are stored in strava_credentials table with athlete_id[2m > [22minserts access_token, refresh_token, and athlete_id into strava_credentials
packages/bot test: [31m[1mAssertionError[22m: expected undefined to be defined[39m
packages/bot test: [36m [2m❯[22m src/__tests__/oauth-token-exchange.test.ts:[2m378:24[22m[39m
packages/bot test:     [90m376|[39m     )[33m;[39m
packages/bot test:     [90m377|[39m
packages/bot test:     [90m378|[39m     [34mexpect[39m(insertCall)[33m.[39m[34mtoBeDefined[39m()[33m;[39m
packages/bot test:     [90m   |[39m                        [31m^[39m
packages/bot test:     [90m379|[39m   })[33m;[39m
packages/bot test:     [90m380|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/oauth-token-exchange.test.ts[2m > [22mAC-2: Tokens are stored in strava_credentials table with athlete_id[2m > [22mstores tokens with correct expiry timestamp
packages/bot test: [31m[1mAssertionError[22m: expected undefined to be defined[39m
packages/bot test: [36m [2m❯[22m src/__tests__/oauth-token-exchange.test.ts:[2m420:24[22m[39m
packages/bot test:     [90m418|[39m     )[33m;[39m
packages/bot test:     [90m419|[39m
packages/bot test:     [90m420|[39m     [34mexpect[39m(insertCall)[33m.[39m[34mtoBeDefined[39m()[33m;[39m
packages/bot test:     [90m   |[39m                        [31m^[39m
packages/bot test:     [90m421|[39m   })[33m;[39m
packages/bot test:     [90m422|[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/oauth-token-exchange.test.ts[2m > [22mAC-2: Tokens are stored in strava_credentials table with athlete_id[2m > [22mstores athlete_id as BIGINT from Strava response
packages/bot test: [31m[1mAssertionError[22m: expected undefined to be defined[39m
packages/bot test: [36m [2m❯[22m src/__tests__/oauth-token-exchange.test.ts:[2m535:24[22m[39m
packages/bot test:     [90m533|[39m     )[33m;[39m
packages/bot test:     [90m534|[39m
packages/bot test:     [90m535|[39m     [34mexpect[39m(insertCall)[33m.[39m[34mtoBeDefined[39m()[33m;[39m
packages/bot test:     [90m   |[39m                        [31m^[39m
packages/bot test:     [90m536|[39m   })[33m;[39m
packages/bot test:     [90m537|[39m })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯[22m[39m
packages/bot test: [2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m3 passed[39m[22m[90m (5)[39m
packages/bot test: [2m      Tests [22m [1m[31m6 failed[39m[22m[2m | [22m[1m[32m143 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (150)[39m
packages/bot test: [2m   Start at [22m 08:50:43
packages/bot test: [2m   Duration [22m 3.69s[2m (transform 694ms, setup 0ms, import 1.01s, tests 6.54s, environment 1ms)[22m
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-05a AC-1%3A OAuth callback endpoint validates state token for CSRF protection > accepts a valid authorization code parameter,line=781,column=22::TypeError: fetch failed%0A ❯ src/__tests__/index.test.ts:781:22%0A%0A{%0A  stack: 'AggregateError: \n' +%0A    '    at internalConnectMultiple (node:net:1122:18)\n' +%0A    '    at afterConnectMultiple (node:net:1689:7)',%0A  errors: [%0A    {%0A      stack: 'Error: connect ECONNREFUSED ::1:3001\n' +%0A        '    at createConnectionError (node:net:1652:14)\n' +%0A        '    at afterConnectMultiple (node:net:1682:16)',%0A      message: 'connect ECONNREFUSED ::1:3001',%0A      errno: -111,%0A      code: 'ECONNREFUSED',%0A      syscall: 'connect',%0A      address: '::1',%0A      port: 3001,%0A      constructor: 'Function<Error>',%0A      name: 'Error',%0A      toString: 'Function<toString>'%0A    },%0A    {%0A      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3001\n' +%0A        '    at createConnectionError (node:net:1652:14)\n' +%0A        '    at afterConnectMultiple (node:net:1682:16)',%0A      message: 'connect ECONNREFUSED 127.0.0.1:3001',%0A      errno: -111,%0A      code: 'ECONNREFUSED',%0A      syscall: 'connect',%0A      address: '127.0.0.1',%0A      port: 3001,%0A      constructor: 'Function<Error>',%0A      name: 'Error',%0A      toString: 'Function<toString>'%0A    }%0A  ],%0A  code: 'ECONNREFUSED',%0A  constructor: 'Function<AggregateError>',%0A  name: 'Caused by: Caused by: AggregateError',%0A  message: '',%0A  toString: 'Function<toString>',%0A  stacks: []%0A}%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED ::1:3001\n    at createConnectionError (node:net:1652:14)\n    at afterConnectMultiple (node:net:1682:16)', message: 'connect ECONNREFUSED ::1:3001', errno: -111, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3001, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3001\n    at createConnectionError (node:net:1652:14)\n    at afterConnectMultiple (node:net:1682:16)', message: 'connect ECONNREFUSED 127.0.0.1:3001', errno: -111, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3001, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/oauth-token-exchange.test.ts,title=src/__tests__/oauth-token-exchange.test.ts > AC-1%3A Authorization code is exchanged for access and refresh tokens > makes a POST request to Strava token endpoint with authorization code,line=204,column=24::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/oauth-token-exchange.test.ts:204:24%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/oauth-token-exchange.test.ts,title=src/__tests__/oauth-token-exchange.test.ts > AC-1%3A Authorization code is exchanged for access and refresh tokens > uses POST method for token exchange request,line=332,column=36::AssertionError: expected undefined to be 'POST' // Object.is equality%0A%0A- Expected:%0A"POST"%0A%0A+ Received:%0Aundefined%0A%0A ❯ src/__tests__/oauth-token-exchange.test.ts:332:36%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/oauth-token-exchange.test.ts,title=src/__tests__/oauth-token-exchange.test.ts > AC-2%3A Tokens are stored in strava_credentials table with athlete_id > inserts access_token%2C refresh_token%2C and athlete_id into strava_credentials,line=378,column=24::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/oauth-token-exchange.test.ts:378:24%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/oauth-token-exchange.test.ts,title=src/__tests__/oauth-token-exchange.test.ts > AC-2%3A Tokens are stored in strava_credentials table with athlete_id > stores tokens with correct expiry timestamp,line=420,column=24::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/oauth-token-exchange.test.ts:420:24%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/oauth-token-exchange.test.ts,title=src/__tests__/oauth-token-exchange.test.ts > AC-2%3A Tokens are stored in strava_credentials table with athlete_id > stores athlete_id as BIGINT from Strava response,line=535,column=24::AssertionError: expected undefined to be defined%0A ❯ src/__tests__/oauth-token-exchange.test.ts:535:24%0A%0A
packages/bot test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/bot@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
