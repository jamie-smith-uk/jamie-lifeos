Title: Test Report — task-3a — PASS

Verified by orchestrator hard gate after Developer attempt 2.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [32m✓[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 120[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 81[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 126[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 20[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-openai.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 46[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 15[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 7[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
packages/shared test: [2m      Tests [22m [1m[32m129 passed[39m[22m[90m (129)[39m
packages/shared test: [2m   Start at [22m 09:41:51
packages/shared test: [2m   Duration [22m 864ms[2m (transform 363ms, setup 0ms, import 570ms, tests 420ms, environment 1ms)[22m
packages/shared test: Done
packages/bot test$ vitest run --config vitest.config.ts
packages/orchestrator test$ vitest run --config vitest.config.ts
packages/bot test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/bot[39m
packages/orchestrator test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator[39m
packages/orchestrator test:  [31m❯[39m src/tools/__tests__/voice.test.ts [2m([22m[2m19 tests[22m[2m | [22m[31m19 failed[39m[2m)[22m[32m 173[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should download Telegram voice file using bot token[39m[32m 63[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should construct correct Telegram file download URL with file_id[39m[32m 11[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle Telegram file download errors gracefully[39m[32m 7[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle network errors during file download[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should send audio file to OpenAI Whisper API with whisper-1 model[39m[32m 5[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should use whisper-1 model in Whisper API request[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should include OpenAI API key in Whisper API request headers[39m[32m 31[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle Whisper API errors gracefully[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle Whisper API network errors[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return transcription text on success[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should return string result[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle empty transcription response[39m[32m 3[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle malformed Telegram response[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle malformed OpenAI response[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle JSON parsing errors gracefully[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle timeout errors[39m[32m 5[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should handle rate limit errors from OpenAI[39m[32m 4[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should accept file_id parameter[39m[32m 5[2mms[22m[39m
packages/orchestrator test: [31m         [31m×[31m should be an async function[39m[32m 3[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 1198[2mms[22m[39m
packages/bot test:      [33m[2m✓[22m[39m extracts nudge ID from dismiss_nudge_<id> callback_data format [33m 320[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/dismiss-nudge-api.test.ts [2m([22m[2m30 tests[22m[2m)[22m[33m 1227[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/keyboard.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 19[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m39 tests[22m[2m)[22m[33m 1525[2mms[22m[39m
packages/bot test:  [32m✓[39m src/__tests__/index.test.ts [2m([22m[2m50 tests[22m[2m | [22m[33m1 skipped[39m[2m)[22m[33m 1581[2mms[22m[39m
packages/bot test: [2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
packages/bot test: [2m      Tests [22m [1m[32m131 passed[39m[22m[2m | [22m[33m1 skipped[39m[90m (132)[39m
packages/bot test: [2m   Start at [22m 09:41:53
packages/bot test: [2m   Duration [22m 2.37s[2m (transform 694ms, setup 0ms, import 1.01s, tests 4.02s, environment 4ms)[22m
packages/bot test: Done
packages/orchestrator test:  [32m✓[39m src/__tests__/typing-indicator-t11.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 1481[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task3.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 429[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t17.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 428[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t18.test.ts [2m([22m[2m38 tests[22m[2m)[22m[33m 388[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t16.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 372[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task4.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 259[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/scheduler.test.ts [2m([22m[2m45 tests[22m[2m)[22m[32m 218[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t10.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 306[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7a.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 173[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 245[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t19.test.ts [2m([22m[2m21 tests[22m[2m)[22m[33m 303[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/todoist-task1.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 235[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task8.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 116[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task9b.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 171[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-task7b.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 198[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-implied-actions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 226[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/people.test.ts [2m([22m[2m48 tests[22m[2m)[22m[32m 146[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-t20.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 222[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-strava-tools.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 204[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/typecheck-async-await.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 7084[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typechecks without errors (tsc --noEmit) [33m 1784[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typechecks without errors (tsc --noEmit) [33m 1778[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/shared typecheck output contains no 'error TS' messages [33m 1767[2mms[22m[39m
packages/orchestrator test:      [33m[2m✓[22m[39m @lifeos/orchestrator typecheck output contains no 'error TS' messages [33m 1752[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 168[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/nudges.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 76[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/gmail-email-interactions.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 96[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-task15.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 83[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/tools/__tests__/life_events_nudges.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 75[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/agent-strava-trends.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 68[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/context.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 59[2mms[22m[39m
packages/orchestrator test:  [32m✓[39m src/__tests__/index-async-await.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 14[2mms[22m[39m
packages/orchestrator test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 19 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTelegram file download[2m > [22mshould download Telegram voice file using bot token
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTelegram file download[2m > [22mshould construct correct Telegram file download URL with file_id
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTelegram file download[2m > [22mshould handle Telegram file download errors gracefully
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTelegram file download[2m > [22mshould handle network errors during file download
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mOpenAI Whisper API integration[2m > [22mshould send audio file to OpenAI Whisper API with whisper-1 model
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mOpenAI Whisper API integration[2m > [22mshould use whisper-1 model in Whisper API request
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mOpenAI Whisper API integration[2m > [22mshould include OpenAI API key in Whisper API request headers
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mOpenAI Whisper API integration[2m > [22mshould handle Whisper API errors gracefully
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mOpenAI Whisper API integration[2m > [22mshould handle Whisper API network errors
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTranscription result handling[2m > [22mshould return transcription text on success
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTranscription result handling[2m > [22mshould return string result
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mTranscription result handling[2m > [22mshould handle empty transcription response
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mError handling and resilience[2m > [22mshould handle malformed Telegram response
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mError handling and resilience[2m > [22mshould handle malformed OpenAI response
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mError handling and resilience[2m > [22mshould handle JSON parsing errors gracefully
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mError handling and resilience[2m > [22mshould handle timeout errors
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mError handling and resilience[2m > [22mshould handle rate limit errors from OpenAI
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mFunction signature and input validation[2m > [22mshould accept file_id parameter
packages/orchestrator test: [41m[1m FAIL [22m[49m src/tools/__tests__/voice.test.ts[2m > [22mVoice Tools[2m > [22mtranscribe_voice_message[2m > [22mFunction signature and input validation[2m > [22mshould be an async function
packages/orchestrator test: [31m[1mError[22m: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts[39m
packages/orchestrator test: [36m [2m❯[22m src/tools/__tests__/voice.test.ts:[2m31:19[22m[39m
packages/orchestrator test:     [90m 29|[39m       }[33m,[39m
packages/orchestrator test:     [90m 30|[39m     }))[33m;[39m
packages/orchestrator test:     [90m 31|[39m     voiceModule [33m=[39m [35mawait[39m [35mimport[39m([32m"../voice.js"[39m)[33m;[39m
packages/orchestrator test:     [90m   |[39m                   [31m^[39m
packages/orchestrator test:     [90m 32|[39m   })[33m;[39m
packages/orchestrator test:     [90m 33|[39m
packages/orchestrator test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/19]⎯[22m[39m
packages/orchestrator test: [2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m29 passed[39m[22m[90m (30)[39m
packages/orchestrator test: [2m      Tests [22m [1m[31m19 failed[39m[22m[2m | [22m[1m[32m737 passed[39m[22m[90m (756)[39m
packages/orchestrator test: [2m   Start at [22m 09:41:53
packages/orchestrator test: [2m   Duration [22m 8.53s[2m (transform 2.07s, setup 0ms, import 2.76s, tests 15.54s, environment 5ms)[22m
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Telegram file download > should download Telegram voice file using bot token,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Telegram file download > should construct correct Telegram file download URL with file_id,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Telegram file download > should handle Telegram file download errors gracefully,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Telegram file download > should handle network errors during file download,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > OpenAI Whisper API integration > should send audio file to OpenAI Whisper API with whisper-1 model,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > OpenAI Whisper API integration > should use whisper-1 model in Whisper API request,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > OpenAI Whisper API integration > should include OpenAI API key in Whisper API request headers,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > OpenAI Whisper API integration > should handle Whisper API errors gracefully,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > OpenAI Whisper API integration > should handle Whisper API network errors,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Transcription result handling > should return transcription text on success,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Transcription result handling > should return string result,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Transcription result handling > should handle empty transcription response,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Error handling and resilience > should handle malformed Telegram response,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Error handling and resilience > should handle malformed OpenAI response,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Error handling and resilience > should handle JSON parsing errors gracefully,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Error handling and resilience > should handle timeout errors,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Error handling and resilience > should handle rate limit errors from OpenAI,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Function signature and input validation > should accept file_id parameter,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts,title=src/tools/__tests__/voice.test.ts > Voice Tools > transcribe_voice_message > Function signature and input validation > should be an async function,line=31,column=19::Error: Cannot find module '/src/tools/voice.js' imported from /home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator/src/tools/__tests__/voice.test.ts%0A ❯ src/tools/__tests__/voice.test.ts:31:19%0A%0A⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯%0ASerialized Error: { code: 'ERR_MODULE_NOT_FOUND' }%0A
packages/orchestrator test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/orchestrator:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/orchestrator@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
