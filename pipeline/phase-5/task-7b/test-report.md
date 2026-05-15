Title: Test Report — task-7b — PASS

Verified by orchestrator hard gate after Developer attempt 3.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env-openai.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 50[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 30[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 67[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 67[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 124[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 10[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
packages/shared test: [2m      Tests [22m [1m[32m129 passed[39m[22m[90m (129)[39m
packages/shared test: [2m   Start at [22m 10:45:10
packages/shared test: [2m   Duration [22m 885ms[2m (transform 311ms, setup 0ms, import 506ms, tests 371ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 1004[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1224[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1490[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1529[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 348[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 550[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/voice-yes-callback.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 817[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/voice-message.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 590[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m62 tests[22m[2m)[22m[32m 50[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 369[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 352[2mms[22m[39m
packages/bot test:  [31m❯[39m src/__tests__/index.test.ts [2m([22m[2m96 tests[22m[2m | [22m[31m15 failed[39m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 3170[2mms[22m[39m
packages/bot test:      [32m✓[39m imports without throwing[32m 118[2mms[22m[39m
packages/bot test:      [32m✓[39m constructs TelegramBot with the configured token[32m 9[2mms[22m[39m
packages/bot test:      [32m✓[39m starts in polling mode when BOT_MODE=polling[32m 7[2mms[22m[39m
packages/bot test:      [2m[90m↓[39m[22m starts in webhook mode when BOT_MODE=webhook
packages/bot test:      [32m✓[39m registers at least one onText handler for all messages[32m 6[2mms[22m[39m
packages/bot test:      [32m✓[39m registers a callback_query event handler[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /message path[32m 65[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m sends application/json content-type[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, text, message_id and from_username in the body[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m omits from_username when message has no from field[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m calls fetch with the /callback path[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m uses the POST method for /callback[32m 41[2mms[22m[39m
packages/bot test:      [32m✓[39m includes chat_id, callback_query_id, callback_data, message_id in body[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m ignores callback_query with no associated message/chat (no fetch call)[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /message[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /message[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 500 on /message[32m 39[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws on /callback[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m error reply text contains 'Something went wrong' for /callback[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 502 on /callback[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m does not crash if sendMessage itself throws during error reply[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /message[32m 44[2mms[22m[39m
packages/bot test:      [32m✓[39m logs an error when orchestrator call fails for /callback[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m returns true when chatId matches TELEGRAM_ALLOWED_CHAT_ID[32m 10[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false when chatId does not match TELEGRAM_ALLOWED_CHAT_ID[32m 10[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for chat_id 0[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m returns false for negative chat_id[32m 6[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards text message from allowed chat_id to orchestrator[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards callback_query from allowed chat_id to orchestrator[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a text message from an unknown chat_id[32m 39[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised text sender[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m does not call fetch for a callback_query from an unknown chat_id[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m does not send a reply to an unauthorised callback_query sender[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a text message[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m emits a WARN log with the offending chat_id for a callback_query[32m 35[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts a valid authorization code parameter[32m 33[2mms[22m[39m
packages/bot test:      [32m✓[39m validates state token against database before processing authorization code[32m 8[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with missing state parameter[32m 7[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with missing authorization code parameter[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with empty state parameter[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects callback with empty authorization code parameter[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 401 when state token is not found in database[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 401 when state token has expired[32m 5[2mms[22m[39m
packages/bot test:      [32m✓[39m returns 400 when authorization code is invalid[32m 7[2mms[22m[39m
packages/bot test:      [32m✓[39m logs error when state token validation fails[32m 16[2mms[22m[39m
packages/bot test:      [32m✓[39m extracts authorization code from query parameters[32m 5[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with special characters[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m accepts authorization code with alphanumeric characters[32m 3[2mms[22m[39m
packages/bot test:      [32m✓[39m passes authorization code to token exchange process[32m 4[2mms[22m[39m
packages/bot test:      [32m✓[39m sends confirmation message when orchestrator returns transcription_text[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m includes transcription text in the confirmation message[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m sends message to correct chat_id[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m includes voice confirmation keyboard when show_voice_confirmation_keyboard is true[32m 72[2mms[22m[39m
packages/bot test:      [32m✓[39m does not include keyboard when show_voice_confirmation_keyboard is false[32m 70[2mms[22m[39m
packages/bot test:      [32m✓[39m includes voice_intent_id in keyboard callback data[32m 40[2mms[22m[39m
packages/bot test:      [32m✓[39m verifies message text is a string[32m 37[2mms[22m[39m
packages/bot test:      [32m✓[39m verifies keyboard structure when present[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m verifies transcription text is included in message[32m 45[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when orchestrator returns HTTP 500 for voice message[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when fetch throws for voice message[32m 63[2mms[22m[39m
packages/bot test:      [32m✓[39m logs error when voice message processing fails[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m handles missing text field in orchestrator response gracefully[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m sends error reply when voice file size exceeds maximum[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m parses intent ID from voice_yes callback data[32m 40[2mms[22m[39m
packages/bot test:      [32m✓[39m loads pending intent from database using intent ID[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m checks if intent has expired before processing[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m deletes expired intent from database[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m sends expiry message when intent is expired[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m forwards valid intent to orchestrator with [voice] prefix[32m 36[2mms[22m[39m
packages/bot test:      [32m✓[39m handles intent not found in database gracefully[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects invalid intent ID (zero or negative)[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects intent ID exceeding max 32-bit signed integer[32m 33[2mms[22m[39m
packages/bot test: [31m     [31m×[31m parses intent ID from voice_no callback data[39m[32m 75[2mms[22m[39m
packages/bot test: [31m     [31m×[31m loads pending intent from database for voice_no[39m[32m 49[2mms[22m[39m
packages/bot test: [31m     [31m×[31m deletes pending intent when voice_no is clicked[39m[32m 41[2mms[22m[39m
packages/bot test: [31m     [31m×[31m sends cancellation message when voice_no is clicked[39m[32m 51[2mms[22m[39m
packages/bot test: [31m     [31m×[31m checks expiration for voice_no intent[39m[32m 41[2mms[22m[39m
packages/bot test: [31m     [31m×[31m handles voice_no intent not found gracefully[39m[32m 39[2mms[22m[39m
packages/bot test:      [32m✓[39m rejects invalid voice_no intent ID[32m 63[2mms[22m[39m
packages/bot test: [31m     [31m×[31m does not forward voice_no to orchestrator[39m[32m 42[2mms[22m[39m
packages/bot test:      [32m✓[39m voice_yes parses single-digit intent ID[32m 49[2mms[22m[39m
packages/bot test:      [32m✓[39m voice_yes parses large intent ID[32m 35[2mms[22m[39m
packages/bot test: [31m     [31m×[31m voice_no parses single-digit intent ID[39m[32m 35[2mms[22m[39m
packages/bot test: [31m     [31m×[31m voice_no parses large intent ID[39m[32m 40[2mms[22m[39m
packages/bot test:      [32m✓[39m loads intent with all required fields from database[32m 37[2mms[22m[39m
packages/bot test: [31m     [31m×[31m compares expires_at with current time to check expiration[39m[32m 48[2mms[22m[39m
packages/bot test:      [32m✓[39m treats intent as expired when expires_at <= now[32m 38[2mms[22m[39m
packages/bot test:      [32m✓[39m does not forward expired intent to orchestrator[32m 37[2mms[22m[39m
packages/bot test: [31m     [31m×[31m sends message to correct chat_id after voice_yes[39m[32m 37[2mms[22m[39m
packages/bot test: [31m     [31m×[31m sends message to correct chat_id after voice_no[39m[32m 40[2mms[22m[39m
packages/bot test: [31m     [31m×[31m deletes intent from database after voice_yes[39m[32m 40[2mms[22m[39m
packages/bot test: [31m     [31m×[31m deletes intent from database after voice_no[39m[32m 43[2mms[22m[39m
packages/bot test:      [32m✓[39m sends expiry message and deletes intent when expired[32m 34[2mms[22m[39m
packages/bot test: [31m     [31m×[31m handles database error during intent deletion gracefully[39m[32m 34[2mms[22m[39m
packages/bot test:      [32m✓[39m handles database error during intent loading gracefully[32m 36[2mms[22m[39m
packages/bot test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 15 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mparses intent ID from voice_no callback data
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 500 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m1862:28[22m[39m
packages/bot test:     [90m1860|[39m
packages/bot test:     [90m1861|[39m     [90m// Verify database query was called with the parsed intent ID[39m
packages/bot test:     [90m1862|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m1863|[39m       expect[33m.[39m[34mstringContaining[39m([32m"SELECT id, chat_id, transcription"[39m)[33m,[39m
packages/bot test:     [90m1864|[39m       [[34m500[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mloads pending intent from database for voice_no
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 501 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m1901:28[22m[39m
packages/bot test:     [90m1899|[39m     [35mawait[39m [34mflushPromises[39m()[33m;[39m
packages/bot test:     [90m1900|[39m
packages/bot test:     [90m1901|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m1902|[39m       expect[33m.[39m[34mstringContaining[39m([32m"SELECT id, chat_id, transcription"[39m)[33m,[39m
packages/bot test:     [90m1903|[39m       [[34m501[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mdeletes pending intent when voice_no is clicked
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 502 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m1941:28[22m[39m
packages/bot test:     [90m1939|[39m
packages/bot test:     [90m1940|[39m     [90m// Verify DELETE query was called[39m
packages/bot test:     [90m1941|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m1942|[39m       expect[33m.[39m[34mstringContaining[39m([32m"DELETE FROM pending_voice_intents"[39m)[33m,[39m
packages/bot test:     [90m1943|[39m       [[34m502[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22msends cancellation message when voice_no is clicked
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m1981:42[22m[39m
packages/bot test:     [90m1979|[39m
packages/bot test:     [90m1980|[39m     [90m// Verify cancellation message was sent[39m
packages/bot test:     [90m1981|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m1982|[39m     expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/cancel|disc…
packages/bot test:     [90m1983|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mchecks expiration for voice_no intent
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2021:42[22m[39m
packages/bot test:     [90m2019|[39m
packages/bot test:     [90m2020|[39m     [90m// Verify expiry message was sent[39m
packages/bot test:     [90m2021|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m2022|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls[[34m0[39m][33m?.[39mtext)[33m.[39m[34mtoMatch[39m([36m/expired/i[39m)[33m;[39m
packages/bot test:     [90m2023|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mhandles voice_no intent not found gracefully
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2044:42[22m[39m
packages/bot test:     [90m2042|[39m
packages/bot test:     [90m2043|[39m     [90m// Verify error reply was sent[39m
packages/bot test:     [90m2044|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m2045|[39m     expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something w…
packages/bot test:     [90m2046|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-1: voice_no callback handler deletes pending intent and sends cancellation message[2m > [22mdoes not forward voice_no to orchestrator
packages/bot test: [31m[1mAssertionError[22m: expected [ { …(2) } ] to have a length of +0 but got 1[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 0[39m
packages/bot test: [31m+ 1[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2102:27[22m[39m
packages/bot test:     [90m2100|[39m     [90m// Verify no /callback POST was made to orchestrator[39m
packages/bot test:     [90m2101|[39m     const callbackCalls = calls.filter((c) => c.url.includes("/callbac…
packages/bot test:     [90m2102|[39m     [34mexpect[39m(callbackCalls)[33m.[39m[34mtoHaveLength[39m([34m0[39m)[33m;[39m
packages/bot test:     [90m   |[39m                           [31m^[39m
packages/bot test:     [90m2103|[39m   })[33m;[39m
packages/bot test:     [90m2104|[39m })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-2: Both handlers properly parse intent ID from callback data[2m > [22mvoice_no parses single-digit intent ID
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 7 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2222:28[22m[39m
packages/bot test:     [90m2220|[39m     [35mawait[39m [34mflushPromises[39m()[33m;[39m
packages/bot test:     [90m2221|[39m
packages/bot test:     [90m2222|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m2223|[39m       expect[33m.[39m[34mstringContaining[39m([32m"SELECT id, chat_id, transcription"[39m)[33m,[39m
packages/bot test:     [90m2224|[39m       [[34m7[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-2: Both handlers properly parse intent ID from callback data[2m > [22mvoice_no parses large intent ID
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 2147483647 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2261:28[22m[39m
packages/bot test:     [90m2259|[39m     [35mawait[39m [34mflushPromises[39m()[33m;[39m
packages/bot test:     [90m2260|[39m
packages/bot test:     [90m2261|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m2262|[39m       expect[33m.[39m[34mstringContaining[39m([32m"SELECT id, chat_id, transcription"[39m)[33m,[39m
packages/bot test:     [90m2263|[39m       [[34m2147483647[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-3: Tests verify intent loading and expiration checking[2m > [22mcompares expires_at with current time to check expiration
packages/bot test: [31m[1mTypeError[22m: Cannot read properties of undefined (reading 'calls')[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2351:79[22m[39m
packages/bot test:     [90m2349|[39m
packages/bot test:     [90m2350|[39m     [90m// Verify intent was not treated as expired[39m
packages/bot test:     [90m2351|[39m     const callbackCalls = (globalThis.fetch as ReturnType<typeof vi.fn…
packages/bot test:     [90m   |[39m                                                                               [31m^[39m
packages/bot test:     [90m2352|[39m       (call[33m:[39m unknown[]) [33m=>[39m {
packages/bot test:     [90m2353|[39m         [35mconst[39m url [33m=[39m call[[34m0[39m] [35mas[39m string[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-4: Tests verify message sending and intent deletion[2m > [22msends message to correct chat_id after voice_yes
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2483:42[22m[39m
packages/bot test:     [90m2481|[39m     [35mawait[39m [34mflushPromises[39m()[33m;[39m
packages/bot test:     [90m2482|[39m
packages/bot test:     [90m2483|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m2484|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls[[34m0[39m][33m?.[39mchatId)[33m.[39m[34mtoBe[39m([34m99999[39m)[33m;[39m
packages/bot test:     [90m2485|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-4: Tests verify message sending and intent deletion[2m > [22msends message to correct chat_id after voice_no
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2520:42[22m[39m
packages/bot test:     [90m2518|[39m     [35mawait[39m [34mflushPromises[39m()[33m;[39m
packages/bot test:     [90m2519|[39m
packages/bot test:     [90m2520|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m2521|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls[[34m0[39m][33m?.[39mchatId)[33m.[39m[34mtoBe[39m([34m99999[39m)[33m;[39m
packages/bot test:     [90m2522|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-4: Tests verify message sending and intent deletion[2m > [22mdeletes intent from database after voice_yes
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 702 ] ][90m
packages/bot test: Received:
packages/bot test: [1m  1st vi.fn() call:
packages/bot test: [22m[2m  [[22m
packages/bot test: [32m-   StringContaining "DELETE FROM pending_voice_intents",[90m
packages/bot test: [31m+   "[90m
packages/bot test: [31m+       SELECT id, chat_id, transcription, telegram_file_id, expires_at, created_at[90m
packages/bot test: [31m+       FROM pending_voice_intents[90m
packages/bot test: [31m+       WHERE id = $1[90m
packages/bot test: [31m+     ",[90m
packages/bot test: [2m    [[22m
packages/bot test: [2m      702,[22m
packages/bot test: [2m    ],[22m
packages/bot test: [2m  ][22m
packages/bot test: [31m[90m
packages/bot test: Number of calls: [1m1[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2558:28[22m[39m
packages/bot test:     [90m2556|[39m
packages/bot test:     [90m2557|[39m     [90m// Verify DELETE was called[39m
packages/bot test:     [90m2558|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m2559|[39m       expect[33m.[39m[34mstringContaining[39m([32m"DELETE FROM pending_voice_intents"[39m)[33m,[39m
packages/bot test:     [90m2560|[39m       [[34m702[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-4: Tests verify message sending and intent deletion[2m > [22mdeletes intent from database after voice_no
packages/bot test: [31m[1mAssertionError[22m: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 703 ] ][90m
packages/bot test: Number of calls: [1m0[22m
packages/bot test: [31m[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2598:28[22m[39m
packages/bot test:     [90m2596|[39m
packages/bot test:     [90m2597|[39m     [90m// Verify DELETE was called[39m
packages/bot test:     [90m2598|[39m     [34mexpect[39m(fakePool[33m.[39mquery)[33m.[39m[34mtoHaveBeenCalledWith[39m(
packages/bot test:     [90m   |[39m                            [31m^[39m
packages/bot test:     [90m2599|[39m       expect[33m.[39m[34mstringContaining[39m([32m"DELETE FROM pending_voice_intents"[39m)[33m,[39m
packages/bot test:     [90m2600|[39m       [[34m703[39m][33m,[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/15]⎯[22m[39m
packages/bot test: [41m[1m FAIL [22m[49m src/__tests__/index.test.ts[2m > [22mT-7b AC-4: Tests verify message sending and intent deletion[2m > [22mhandles database error during intent deletion gracefully
packages/bot test: [31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
packages/bot test: [32m- Expected[39m
packages/bot test: [31m+ Received[39m
packages/bot test: [32m- 1[39m
packages/bot test: [31m+ 0[39m
packages/bot test: [36m [2m❯[22m src/__tests__/index.test.ts:[2m2681:42[22m[39m
packages/bot test:     [90m2679|[39m
packages/bot test:     [90m2680|[39m     [90m// Verify error reply was sent[39m
packages/bot test:     [90m2681|[39m     [34mexpect[39m(holder[33m.[39mbot[33m?.[39msendMessageCalls)[33m.[39m[34mtoHaveLength[39m([34m1[39m)[33m;[39m
packages/bot test:     [90m   |[39m                                          [31m^[39m
packages/bot test:     [90m2682|[39m     expect(holder.bot?.sendMessageCalls[0]?.text).toMatch(/something w…
packages/bot test:     [90m2683|[39m   })[33m;[39m
packages/bot test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/15]⎯[22m[39m
packages/bot test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m5 passed[39m[22m[90m (6)[39m
packages/bot test: [2m      Tests [22m [1m[31m15 failed[39m[22m[2m | [22m[1m[32m227 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (243)[39m
packages/bot test: [2m   Start at [22m 10:45:11
packages/bot test: [2m   Duration [22m 3.96s[2m (transform 988ms, setup 0ms, import 1.65s, tests 6.85s, environment 5ms)[22m
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > parses intent ID from voice_no callback data,line=1862,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 500 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:1862:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > loads pending intent from database for voice_no,line=1901,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 501 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:1901:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > deletes pending intent when voice_no is clicked,line=1941,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 502 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:1941:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > sends cancellation message when voice_no is clicked,line=1981,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:1981:42%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > checks expiration for voice_no intent,line=2021,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:2021:42%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > handles voice_no intent not found gracefully,line=2044,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:2044:42%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-1%3A voice_no callback handler deletes pending intent and sends cancellation message > does not forward voice_no to orchestrator,line=2102,column=27::AssertionError: expected [ { …(2) } ] to have a length of +0 but got 1%0A%0A- Expected%0A+ Received%0A%0A- 0%0A+ 1%0A%0A ❯ src/__tests__/index.test.ts:2102:27%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-2%3A Both handlers properly parse intent ID from callback data > voice_no parses single-digit intent ID,line=2222,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 7 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:2222:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-2%3A Both handlers properly parse intent ID from callback data > voice_no parses large intent ID,line=2261,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 2147483647 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:2261:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-3%3A Tests verify intent loading and expiration checking > compares expires_at with current time to check expiration,line=2351,column=79::TypeError: Cannot read properties of undefined (reading 'calls')%0A ❯ src/__tests__/index.test.ts:2351:79%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-4%3A Tests verify message sending and intent deletion > sends message to correct chat_id after voice_yes,line=2483,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:2483:42%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-4%3A Tests verify message sending and intent deletion > sends message to correct chat_id after voice_no,line=2520,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:2520:42%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-4%3A Tests verify message sending and intent deletion > deletes intent from database after voice_yes,line=2558,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 702 ] ]%0A%0AReceived:%0A%0A  1st vi.fn() call:%0A%0A  [%0A-   StringContaining "DELETE FROM pending_voice_intents",%0A+   "%0A+       SELECT id, chat_id, transcription, telegram_file_id, expires_at, created_at%0A+       FROM pending_voice_intents%0A+       WHERE id = $1%0A+     ",%0A    [%0A      702,%0A    ],%0A  ]%0A%0A%0ANumber of calls: 1%0A%0A ❯ src/__tests__/index.test.ts:2558:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-4%3A Tests verify message sending and intent deletion > deletes intent from database after voice_no,line=2598,column=28::AssertionError: expected "vi.fn()" to be called with arguments: [ StringContaining{…}, [ 703 ] ]%0A%0ANumber of calls: 0%0A%0A ❯ src/__tests__/index.test.ts:2598:28%0A%0A
packages/bot test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot/src/__tests__/index.test.ts,title=src/__tests__/index.test.ts > T-7b AC-4%3A Tests verify message sending and intent deletion > handles database error during intent deletion gracefully,line=2681,column=42::AssertionError: expected [] to have a length of 1 but got +0%0A%0A- Expected%0A+ Received%0A%0A- 1%0A+ 0%0A%0A ❯ src/__tests__/index.test.ts:2681:42%0A%0A
packages/bot test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/bot@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
