Title: Test Report — task-3 — PASS

Verified by orchestrator hard gate after Developer attempt 3.

- tsc --noEmit: PASS
- eslint (files_in_scope): PASS
- pnpm test: PASS


> jamie-lifeos@0.0.1 test /home/runner/work/jamie-lifeos/jamie-lifeos
> pnpm -r test

Scope: 4 of 5 workspace projects
packages/shared test$ vitest run --config vitest.config.ts
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.4 [39m[90m/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared[39m
packages/shared test:  [31m❯[39m src/__tests__/env-example.test.ts [2m([22m[2m4 tests[22m[2m | [22m[31m4 failed[39m[2m)[22m[32m 17[2mms[22m[39m
packages/shared test: [31m     [31m×[31m documents STRAVA_CLIENT_ID in .env.example[39m[32m 10[2mms[22m[39m
packages/shared test: [31m     [31m×[31m documents STRAVA_CLIENT_SECRET in .env.example[39m[32m 1[2mms[22m[39m
packages/shared test: [31m     [31m×[31m documents STRAVA_REDIRECT_URI in .env.example[39m[32m 1[2mms[22m[39m
packages/shared test: [31m     [31m×[31m includes all three Strava variables in .env.example[39m[32m 3[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/logger.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 94[2mms[22m[39m
packages/shared test:  [31m❯[39m src/__tests__/env.test.ts [2m([22m[2m25 tests[22m[2m | [22m[31m9 failed[39m[2m)[22m[32m 104[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when TELEGRAM_BOT_TOKEN is missing[32m 17[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when TELEGRAM_ALLOWED_CHAT_ID is missing[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when ANTHROPIC_API_KEY is missing[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when DATABASE_URL is missing[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when DIGEST_CRON is missing[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when TZ is missing[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when a required var is set to empty string[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws when multiple required vars are missing and lists them all[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m error message mentions .env file[32m 3[2mms[22m[39m
packages/shared test:      [32m✓[39m loads successfully when all required vars are set[32m 3[2mms[22m[39m
packages/shared test:      [32m✓[39m applies default for ANTHROPIC_MODEL when not set[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m applies default BOT_MODE=polling when not set[32m 3[2mms[22m[39m
packages/shared test:      [32m✓[39m applies default LOG_LEVEL=info when not set[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m accepts BOT_MODE=webhook[32m 2[2mms[22m[39m
packages/shared test:      [32m✓[39m throws on invalid BOT_MODE value[32m 3[2mms[22m[39m
packages/shared test:      [32m✓[39m trims leading/trailing whitespace from values[32m 2[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_CLIENT_ID is missing[39m[32m 16[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_CLIENT_SECRET is missing[39m[32m 5[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_REDIRECT_URI is missing[39m[32m 5[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_CLIENT_ID is empty string[39m[32m 4[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_CLIENT_SECRET is empty string[39m[32m 4[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when STRAVA_REDIRECT_URI is empty string[39m[32m 4[2mms[22m[39m
packages/shared test: [31m     [31m×[31m loads successfully when all Strava vars are set[39m[32m 4[2mms[22m[39m
packages/shared test: [31m     [31m×[31m trims whitespace from Strava variables[39m[32m 3[2mms[22m[39m
packages/shared test: [31m     [31m×[31m throws when multiple Strava vars are missing and lists them all[39m[32m 6[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/types.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 18[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 122[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/db.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 18[2mms[22m[39m
packages/shared test:  [32m✓[39m src/__tests__/migrate-async-await.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 7[2mms[22m[39m
packages/shared test: [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 13 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env-example.test.ts[2m > [22m.env.example — Strava variables documentation[2m > [22mdocuments STRAVA_CLIENT_ID in .env.example
packages/shared test: [31m[1mAssertionError[22m: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_CLIENT_ID/[39m
packages/shared test: [32m- Expected:[39m
packages/shared test: /STRAVA_CLIENT_ID/
packages/shared test: [31m+ Received:[39m
packages/shared test: "# Telegram — used by packages/bot only; not used by the build pipeline
packages/shared test: TELEGRAM_BOT_TOKEN=your_bot_token_here
packages/shared test: TELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here
packages/shared test: # Anthropic
packages/shared test: ANTHROPIC_API_KEY=your_api_key_here
packages/shared test: ANTHROPIC_MODEL=claude-sonnet-4-20250514
packages/shared test: # Todoist
packages/shared test: TODOIST_API_TOKEN=your_todoist_token_here
packages/shared test: # PostgreSQL (use DATABASE_URL or individual vars)
packages/shared test: DATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos
packages/shared test: POSTGRES_USER=lifeos
packages/shared test: POSTGRES_PASSWORD=your_db_password_here
packages/shared test: POSTGRES_DB=lifeos
packages/shared test: POSTGRES_HOST=localhost
packages/shared test: POSTGRES_PORT=5432
packages/shared test: # Bot runtime mode: polling | webhook
packages/shared test: BOT_MODE=polling
packages/shared test: # Orchestrator URL (used by bot to forward messages)
packages/shared test: ORCHESTRATOR_URL=http://localhost:3001
packages/shared test: # Scheduler
packages/shared test: DIGEST_CRON=0 7 * * *
packages/shared test: NUDGE_EVAL_CRON=*/15 * * * *
packages/shared test: # Timezone (IANA zone, e.g. Europe/London)
packages/shared test: TZ=Europe/London
packages/shared test: "
packages/shared test: [36m [2m❯[22m src/__tests__/env-example.test.ts:[2m21:31[22m[39m
packages/shared test:     [90m 19|[39m
packages/shared test:     [90m 20|[39m   [34mit[39m([32m"documents STRAVA_CLIENT_ID in .env.example"[39m[33m,[39m () [33m=>[39m {
packages/shared test:     [90m 21|[39m     [34mexpect[39m(envExampleContent)[33m.[39m[34mtoMatch[39m([36m/STRAVA_CLIENT_ID/[39m)[33m;[39m
packages/shared test:     [90m   |[39m                               [31m^[39m
packages/shared test:     [90m 22|[39m   })[33m;[39m
packages/shared test:     [90m 23|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env-example.test.ts[2m > [22m.env.example — Strava variables documentation[2m > [22mdocuments STRAVA_CLIENT_SECRET in .env.example
packages/shared test: [31m[1mAssertionError[22m: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_CLIENT_SECRET/[39m
packages/shared test: [32m- Expected:[39m
packages/shared test: /STRAVA_CLIENT_SECRET/
packages/shared test: [31m+ Received:[39m
packages/shared test: "# Telegram — used by packages/bot only; not used by the build pipeline
packages/shared test: TELEGRAM_BOT_TOKEN=your_bot_token_here
packages/shared test: TELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here
packages/shared test: # Anthropic
packages/shared test: ANTHROPIC_API_KEY=your_api_key_here
packages/shared test: ANTHROPIC_MODEL=claude-sonnet-4-20250514
packages/shared test: # Todoist
packages/shared test: TODOIST_API_TOKEN=your_todoist_token_here
packages/shared test: # PostgreSQL (use DATABASE_URL or individual vars)
packages/shared test: DATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos
packages/shared test: POSTGRES_USER=lifeos
packages/shared test: POSTGRES_PASSWORD=your_db_password_here
packages/shared test: POSTGRES_DB=lifeos
packages/shared test: POSTGRES_HOST=localhost
packages/shared test: POSTGRES_PORT=5432
packages/shared test: # Bot runtime mode: polling | webhook
packages/shared test: BOT_MODE=polling
packages/shared test: # Orchestrator URL (used by bot to forward messages)
packages/shared test: ORCHESTRATOR_URL=http://localhost:3001
packages/shared test: # Scheduler
packages/shared test: DIGEST_CRON=0 7 * * *
packages/shared test: NUDGE_EVAL_CRON=*/15 * * * *
packages/shared test: # Timezone (IANA zone, e.g. Europe/London)
packages/shared test: TZ=Europe/London
packages/shared test: "
packages/shared test: [36m [2m❯[22m src/__tests__/env-example.test.ts:[2m25:31[22m[39m
packages/shared test:     [90m 23|[39m
packages/shared test:     [90m 24|[39m   [34mit[39m([32m"documents STRAVA_CLIENT_SECRET in .env.example"[39m[33m,[39m () [33m=>[39m {
packages/shared test:     [90m 25|[39m     [34mexpect[39m(envExampleContent)[33m.[39m[34mtoMatch[39m([36m/STRAVA_CLIENT_SECRET/[39m)[33m;[39m
packages/shared test:     [90m   |[39m                               [31m^[39m
packages/shared test:     [90m 26|[39m   })[33m;[39m
packages/shared test:     [90m 27|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env-example.test.ts[2m > [22m.env.example — Strava variables documentation[2m > [22mdocuments STRAVA_REDIRECT_URI in .env.example
packages/shared test: [31m[1mAssertionError[22m: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_REDIRECT_URI/[39m
packages/shared test: [32m- Expected:[39m
packages/shared test: /STRAVA_REDIRECT_URI/
packages/shared test: [31m+ Received:[39m
packages/shared test: "# Telegram — used by packages/bot only; not used by the build pipeline
packages/shared test: TELEGRAM_BOT_TOKEN=your_bot_token_here
packages/shared test: TELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here
packages/shared test: # Anthropic
packages/shared test: ANTHROPIC_API_KEY=your_api_key_here
packages/shared test: ANTHROPIC_MODEL=claude-sonnet-4-20250514
packages/shared test: # Todoist
packages/shared test: TODOIST_API_TOKEN=your_todoist_token_here
packages/shared test: # PostgreSQL (use DATABASE_URL or individual vars)
packages/shared test: DATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos
packages/shared test: POSTGRES_USER=lifeos
packages/shared test: POSTGRES_PASSWORD=your_db_password_here
packages/shared test: POSTGRES_DB=lifeos
packages/shared test: POSTGRES_HOST=localhost
packages/shared test: POSTGRES_PORT=5432
packages/shared test: # Bot runtime mode: polling | webhook
packages/shared test: BOT_MODE=polling
packages/shared test: # Orchestrator URL (used by bot to forward messages)
packages/shared test: ORCHESTRATOR_URL=http://localhost:3001
packages/shared test: # Scheduler
packages/shared test: DIGEST_CRON=0 7 * * *
packages/shared test: NUDGE_EVAL_CRON=*/15 * * * *
packages/shared test: # Timezone (IANA zone, e.g. Europe/London)
packages/shared test: TZ=Europe/London
packages/shared test: "
packages/shared test: [36m [2m❯[22m src/__tests__/env-example.test.ts:[2m29:31[22m[39m
packages/shared test:     [90m 27|[39m
packages/shared test:     [90m 28|[39m   [34mit[39m([32m"documents STRAVA_REDIRECT_URI in .env.example"[39m[33m,[39m () [33m=>[39m {
packages/shared test:     [90m 29|[39m     [34mexpect[39m(envExampleContent)[33m.[39m[34mtoMatch[39m([36m/STRAVA_REDIRECT_URI/[39m)[33m;[39m
packages/shared test:     [90m   |[39m                               [31m^[39m
packages/shared test:     [90m 30|[39m   })[33m;[39m
packages/shared test:     [90m 31|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env-example.test.ts[2m > [22m.env.example — Strava variables documentation[2m > [22mincludes all three Strava variables in .env.example
packages/shared test: [31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- true[39m
packages/shared test: [31m+ false[39m
packages/shared test: [36m [2m❯[22m src/__tests__/env-example.test.ts:[2m37:62[22m[39m
packages/shared test:     [90m 35|[39m     const hasRedirectUri = envExampleContent.includes("STRAVA_REDIRECT…
packages/shared test:     [90m 36|[39m
packages/shared test:     [90m 37|[39m     expect(hasClientId && hasClientSecret && hasRedirectUri).toBe(true…
packages/shared test:     [90m   |[39m                                                              [31m^[39m
packages/shared test:     [90m 38|[39m   })[33m;[39m
packages/shared test:     [90m 39|[39m })[33m;[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_CLIENT_ID is missing
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m200:34[22m[39m
packages/shared test:     [90m198|[39m     [34msetEnv[39m(vars)[33m;[39m
packages/shared test:     [90m199|[39m
packages/shared test:     [90m200|[39m     [35mawait[39m [34mexpect[39m([34mloadEnvModule[39m())[33m.[39mrejects[33m.[39m[34mtoThrow[39m([36m/STRAVA_CLIENT_ID/[39m)[33m;[39m
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m201|[39m   })[33m;[39m
packages/shared test:     [90m202|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_CLIENT_SECRET is missing
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m207:34[22m[39m
packages/shared test:     [90m205|[39m     [34msetEnv[39m(vars)[33m;[39m
packages/shared test:     [90m206|[39m
packages/shared test:     [90m207|[39m     await expect(loadEnvModule()).rejects.toThrow(/STRAVA_CLIENT_SECRE…
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m208|[39m   })[33m;[39m
packages/shared test:     [90m209|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_REDIRECT_URI is missing
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m214:34[22m[39m
packages/shared test:     [90m212|[39m     [34msetEnv[39m(vars)[33m;[39m
packages/shared test:     [90m213|[39m
packages/shared test:     [90m214|[39m     await expect(loadEnvModule()).rejects.toThrow(/STRAVA_REDIRECT_URI…
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m215|[39m   })[33m;[39m
packages/shared test:     [90m216|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_CLIENT_ID is empty string
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m220:34[22m[39m
packages/shared test:     [90m218|[39m     [34msetEnv[39m({ [33m...[39m[33mVALID_ENV[39m[33m,[39m [33mSTRAVA_CLIENT_ID[39m[33m:[39m [32m"   "[39m })[33m;[39m
packages/shared test:     [90m219|[39m
packages/shared test:     [90m220|[39m     [35mawait[39m [34mexpect[39m([34mloadEnvModule[39m())[33m.[39mrejects[33m.[39m[34mtoThrow[39m([36m/STRAVA_CLIENT_ID/[39m)[33m;[39m
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m221|[39m   })[33m;[39m
packages/shared test:     [90m222|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_CLIENT_SECRET is empty string
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m226:34[22m[39m
packages/shared test:     [90m224|[39m     [34msetEnv[39m({ [33m...[39m[33mVALID_ENV[39m[33m,[39m [33mSTRAVA_CLIENT_SECRET[39m[33m:[39m [32m"   "[39m })[33m;[39m
packages/shared test:     [90m225|[39m
packages/shared test:     [90m226|[39m     await expect(loadEnvModule()).rejects.toThrow(/STRAVA_CLIENT_SECRE…
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m227|[39m   })[33m;[39m
packages/shared test:     [90m228|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when STRAVA_REDIRECT_URI is empty string
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m232:34[22m[39m
packages/shared test:     [90m230|[39m     [34msetEnv[39m({ [33m...[39m[33mVALID_ENV[39m[33m,[39m [33mSTRAVA_REDIRECT_URI[39m[33m:[39m [32m"   "[39m })[33m;[39m
packages/shared test:     [90m231|[39m
packages/shared test:     [90m232|[39m     await expect(loadEnvModule()).rejects.toThrow(/STRAVA_REDIRECT_URI…
packages/shared test:     [90m   |[39m                                  [31m^[39m
packages/shared test:     [90m233|[39m   })[33m;[39m
packages/shared test:     [90m234|[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mloads successfully when all Strava vars are set
packages/shared test: [31m[1mAssertionError[22m: expected undefined to be '12345' // Object.is equality[39m
packages/shared test: [32m- Expected:[39m
packages/shared test: "12345"
packages/shared test: [31m+ Received:[39m
packages/shared test: undefined
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m244:38[22m[39m
packages/shared test:     [90m242|[39m
packages/shared test:     [90m243|[39m     [35mconst[39m mod [33m=[39m [35mawait[39m [34mloadEnvModule[39m()[33m;[39m
packages/shared test:     [90m244|[39m     [34mexpect[39m(mod[33m.[39menv[33m.[39m[33mSTRAVA_CLIENT_ID[39m)[33m.[39m[34mtoBe[39m([32m"12345"[39m)[33m;[39m
packages/shared test:     [90m   |[39m                                      [31m^[39m
packages/shared test:     [90m245|[39m     [34mexpect[39m(mod[33m.[39menv[33m.[39m[33mSTRAVA_CLIENT_SECRET[39m)[33m.[39m[34mtoBe[39m([32m"secret_abc123"[39m)[33m;[39m
packages/shared test:     [90m246|[39m     expect(mod.env.STRAVA_REDIRECT_URI).toBe("http://localhost:3001/au…
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mtrims whitespace from Strava variables
packages/shared test: [31m[1mAssertionError[22m: expected undefined to be '12345' // Object.is equality[39m
packages/shared test: [32m- Expected:[39m
packages/shared test: "12345"
packages/shared test: [31m+ Received:[39m
packages/shared test: undefined
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m258:38[22m[39m
packages/shared test:     [90m256|[39m
packages/shared test:     [90m257|[39m     [35mconst[39m mod [33m=[39m [35mawait[39m [34mloadEnvModule[39m()[33m;[39m
packages/shared test:     [90m258|[39m     [34mexpect[39m(mod[33m.[39menv[33m.[39m[33mSTRAVA_CLIENT_ID[39m)[33m.[39m[34mtoBe[39m([32m"12345"[39m)[33m;[39m
packages/shared test:     [90m   |[39m                                      [31m^[39m
packages/shared test:     [90m259|[39m     [34mexpect[39m(mod[33m.[39menv[33m.[39m[33mSTRAVA_CLIENT_SECRET[39m)[33m.[39m[34mtoBe[39m([32m"secret_abc123"[39m)[33m;[39m
packages/shared test:     [90m260|[39m     expect(mod.env.STRAVA_REDIRECT_URI).toBe("http://localhost:3001/au…
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/13]⎯[22m[39m
packages/shared test: [41m[1m FAIL [22m[49m src/__tests__/env.test.ts[2m > [22menv.ts — Strava environment variables[2m > [22mthrows when multiple Strava vars are missing and lists them all
packages/shared test: [31m[1mAssertionError[22m: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting[39m
packages/shared test: [32m- Expected[39m
packages/shared test: [31m+ Received[39m
packages/shared test: [32m- Error {[39m
packages/shared test: [32m-   "message": "rejected promise",[39m
packages/shared test: [31m+ {[39m
packages/shared test: [31m+   "env": {[39m
packages/shared test: [31m+     "ANTHROPIC_API_KEY": "sk-ant-test",[39m
packages/shared test: [31m+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",[39m
packages/shared test: [31m+     "BOT_MODE": "polling",[39m
packages/shared test: [31m+     "DATABASE_URL": "postgresql://localhost:5432/testdb",[39m
packages/shared test: [31m+     "DIGEST_CRON": "0 7 * * *",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_ID": "",[39m
packages/shared test: [31m+     "GOOGLE_CLIENT_SECRET": "",[39m
packages/shared test: [31m+     "GOOGLE_REFRESH_TOKEN": "",[39m
packages/shared test: [31m+     "LOG_LEVEL": "info",[39m
packages/shared test: [31m+     "ORCHESTRATOR_URL": "http://localhost:3001",[39m
packages/shared test: [31m+     "PORT": "3001",[39m
packages/shared test: [31m+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",[39m
packages/shared test: [31m+     "TELEGRAM_BOT_TOKEN": "bot:test_token",[39m
packages/shared test: [31m+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",[39m
packages/shared test: [31m+     "TZ": "Europe/London",[39m
packages/shared test: [31m+   },[39m
packages/shared test: [2m  }[22m
packages/shared test: [36m [2m❯[22m src/__tests__/env.test.ts:[2m267:34[22m[39m
packages/shared test: [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/13]⎯[22m[39m
packages/shared test: [2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m5 passed[39m[22m[90m (7)[39m
packages/shared test: [2m      Tests [22m [1m[31m13 failed[39m[22m[2m | [22m[1m[32m101 passed[39m[22m[90m (114)[39m
packages/shared test: [2m   Start at [22m 07:49:00
packages/shared test: [2m   Duration [22m 817ms[2m (transform 351ms, setup 0ms, import 497ms, tests 379ms, environment 1ms)[22m
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env-example.test.ts,title=src/__tests__/env-example.test.ts > .env.example — Strava variables documentation > documents STRAVA_CLIENT_ID in .env.example,line=21,column=31::AssertionError: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_CLIENT_ID/%0A%0A- Expected:%0A/STRAVA_CLIENT_ID/%0A%0A+ Received:%0A"# Telegram — used by packages/bot only; not used by the build pipeline%0ATELEGRAM_BOT_TOKEN=your_bot_token_here%0ATELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here%0A%0A# Anthropic%0AANTHROPIC_API_KEY=your_api_key_here%0AANTHROPIC_MODEL=claude-sonnet-4-20250514%0A%0A# Todoist%0ATODOIST_API_TOKEN=your_todoist_token_here%0A%0A# PostgreSQL (use DATABASE_URL or individual vars)%0ADATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos%0APOSTGRES_USER=lifeos%0APOSTGRES_PASSWORD=your_db_password_here%0APOSTGRES_DB=lifeos%0APOSTGRES_HOST=localhost%0APOSTGRES_PORT=5432%0A%0A# Bot runtime mode: polling | webhook%0ABOT_MODE=polling%0A%0A# Orchestrator URL (used by bot to forward messages)%0AORCHESTRATOR_URL=http://localhost:3001%0A%0A# Scheduler%0ADIGEST_CRON=0 7 * * *%0ANUDGE_EVAL_CRON=*/15 * * * *%0A%0A# Timezone (IANA zone, e.g. Europe/London)%0ATZ=Europe/London%0A"%0A%0A ❯ src/__tests__/env-example.test.ts:21:31%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env-example.test.ts,title=src/__tests__/env-example.test.ts > .env.example — Strava variables documentation > documents STRAVA_CLIENT_SECRET in .env.example,line=25,column=31::AssertionError: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_CLIENT_SECRET/%0A%0A- Expected:%0A/STRAVA_CLIENT_SECRET/%0A%0A+ Received:%0A"# Telegram — used by packages/bot only; not used by the build pipeline%0ATELEGRAM_BOT_TOKEN=your_bot_token_here%0ATELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here%0A%0A# Anthropic%0AANTHROPIC_API_KEY=your_api_key_here%0AANTHROPIC_MODEL=claude-sonnet-4-20250514%0A%0A# Todoist%0ATODOIST_API_TOKEN=your_todoist_token_here%0A%0A# PostgreSQL (use DATABASE_URL or individual vars)%0ADATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos%0APOSTGRES_USER=lifeos%0APOSTGRES_PASSWORD=your_db_password_here%0APOSTGRES_DB=lifeos%0APOSTGRES_HOST=localhost%0APOSTGRES_PORT=5432%0A%0A# Bot runtime mode: polling | webhook%0ABOT_MODE=polling%0A%0A# Orchestrator URL (used by bot to forward messages)%0AORCHESTRATOR_URL=http://localhost:3001%0A%0A# Scheduler%0ADIGEST_CRON=0 7 * * *%0ANUDGE_EVAL_CRON=*/15 * * * *%0A%0A# Timezone (IANA zone, e.g. Europe/London)%0ATZ=Europe/London%0A"%0A%0A ❯ src/__tests__/env-example.test.ts:25:31%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env-example.test.ts,title=src/__tests__/env-example.test.ts > .env.example — Strava variables documentation > documents STRAVA_REDIRECT_URI in .env.example,line=29,column=31::AssertionError: expected '# Telegram — used by packages/bot onl…' to match /STRAVA_REDIRECT_URI/%0A%0A- Expected:%0A/STRAVA_REDIRECT_URI/%0A%0A+ Received:%0A"# Telegram — used by packages/bot only; not used by the build pipeline%0ATELEGRAM_BOT_TOKEN=your_bot_token_here%0ATELEGRAM_ALLOWED_CHAT_ID=your_chat_id_here%0A%0A# Anthropic%0AANTHROPIC_API_KEY=your_api_key_here%0AANTHROPIC_MODEL=claude-sonnet-4-20250514%0A%0A# Todoist%0ATODOIST_API_TOKEN=your_todoist_token_here%0A%0A# PostgreSQL (use DATABASE_URL or individual vars)%0ADATABASE_URL=postgresql://lifeos:your_db_password_here@localhost:5432/lifeos%0APOSTGRES_USER=lifeos%0APOSTGRES_PASSWORD=your_db_password_here%0APOSTGRES_DB=lifeos%0APOSTGRES_HOST=localhost%0APOSTGRES_PORT=5432%0A%0A# Bot runtime mode: polling | webhook%0ABOT_MODE=polling%0A%0A# Orchestrator URL (used by bot to forward messages)%0AORCHESTRATOR_URL=http://localhost:3001%0A%0A# Scheduler%0ADIGEST_CRON=0 7 * * *%0ANUDGE_EVAL_CRON=*/15 * * * *%0A%0A# Timezone (IANA zone, e.g. Europe/London)%0ATZ=Europe/London%0A"%0A%0A ❯ src/__tests__/env-example.test.ts:29:31%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env-example.test.ts,title=src/__tests__/env-example.test.ts > .env.example — Strava variables documentation > includes all three Strava variables in .env.example,line=37,column=62::AssertionError: expected false to be true // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- true%0A+ false%0A%0A ❯ src/__tests__/env-example.test.ts:37:62%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_CLIENT_ID is missing,line=200,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:200:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_CLIENT_SECRET is missing,line=207,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:207:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_REDIRECT_URI is missing,line=214,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:214:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_CLIENT_ID is empty string,line=220,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:220:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_CLIENT_SECRET is empty string,line=226,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:226:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when STRAVA_REDIRECT_URI is empty string,line=232,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:232:34%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > loads successfully when all Strava vars are set,line=244,column=38::AssertionError: expected undefined to be '12345' // Object.is equality%0A%0A- Expected:%0A"12345"%0A%0A+ Received:%0Aundefined%0A%0A ❯ src/__tests__/env.test.ts:244:38%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > trims whitespace from Strava variables,line=258,column=38::AssertionError: expected undefined to be '12345' // Object.is equality%0A%0A- Expected:%0A"12345"%0A%0A+ Received:%0Aundefined%0A%0A ❯ src/__tests__/env.test.ts:258:38%0A%0A
packages/shared test: ::error file=/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared/src/__tests__/env.test.ts,title=src/__tests__/env.test.ts > env.ts — Strava environment variables > throws when multiple Strava vars are missing and lists them all,line=267,column=34::AssertionError: promise resolved "{ env: { …(15) }, …(1) }" instead of rejecting%0A%0A- Expected%0A+ Received%0A%0A- Error {%0A-   "message": "rejected promise",%0A+ {%0A+   "env": {%0A+     "ANTHROPIC_API_KEY": "sk-ant-test",%0A+     "ANTHROPIC_MODEL": "claude-sonnet-4-20250514",%0A+     "BOT_MODE": "polling",%0A+     "DATABASE_URL": "postgresql://localhost:5432/testdb",%0A+     "DIGEST_CRON": "0 7 * * *",%0A+     "GOOGLE_CLIENT_ID": "",%0A+     "GOOGLE_CLIENT_SECRET": "",%0A+     "GOOGLE_REFRESH_TOKEN": "",%0A+     "LOG_LEVEL": "info",%0A+     "ORCHESTRATOR_URL": "http://localhost:3001",%0A+     "PORT": "3001",%0A+     "TELEGRAM_ALLOWED_CHAT_ID": "123456",%0A+     "TELEGRAM_BOT_TOKEN": "bot:test_token",%0A+     "TODOIST_API_TOKEN": "e6b883431c77e26272151e64e0a5a12488172324",%0A+     "TZ": "Europe/London",%0A+   },%0A  }%0A%0A ❯ src/__tests__/env.test.ts:267:34%0A%0A
packages/shared test: Failed
/home/runner/work/jamie-lifeos/jamie-lifeos/packages/shared:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @lifeos/shared@0.0.1 test: `vitest run --config vitest.config.ts`
Exit status 1
 ELIFECYCLE  Test failed. See above for more details.
