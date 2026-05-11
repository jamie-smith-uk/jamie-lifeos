# T-11 Test Report — Bot: Typing Indicator

**Task:** T-11  
**Epic:** EP-01  
**Tester:** AG-05  
**Date:** 2026-04-20  
**Result: PASS**

---

## Summary

| Metric | Value |
|--------|-------|
| Test file | `packages/orchestrator/src/__tests__/typing-indicator-t11.test.ts` |
| T-11 tests written | 17 |
| T-11 tests passed | 17 |
| T-11 tests failed | 0 |
| Total suite tests (incl. pre-existing) | 88 |
| Total suite passed | 88 |
| Total suite failed | 0 |
| Test runner | Vitest v4.1.4 |
| Duration | ~1.44 s |

---

## Acceptance Criteria Coverage

### AC1 — Telegram shows 'typing...' before the agent response arrives

**Criterion:** `sendChatAction` with `action='typing'` is sent to the Telegram Bot API before the agent reply is returned.

| # | Test | Result |
|---|------|--------|
| 1 | a fetch call is made to the Telegram sendChatAction URL | PASS |
| 2 | the sendChatAction call uses action='typing' | PASS |
| 3 | the sendChatAction call includes the correct chat_id | PASS |
| 4 | the sendChatAction URL contains the bot token | PASS |
| 5 | the sendChatAction call is POSTed via HTTP POST method | PASS |

**Strategy:** The global `fetch` function was intercepted and replaced with a spy mock that records every call's URL, body, method, and timestamp. After issuing a `POST /message` request, assertions verify that at least one recorded `fetch` call targets a URL containing `sendChatAction`, uses `action: "typing"` in the body, carries the correct `chat_id`, embeds the bot token in the URL, and uses the HTTP POST method.

---

### AC2 — Typing action is sent before the Anthropic API call is initiated

**Criterion:** The `sendChatAction` fetch is dispatched _before_ `runAgent` (which initiates the Anthropic API call) is invoked.

| # | Test | Result |
|---|------|--------|
| 6 | Telegram sendChatAction fetch is dispatched before runAgent is called | PASS |
| 7 | sendChatAction is dispatched synchronously before the agent await begins | PASS |
| 8 | sendChatAction is not sent for POST /callback (only /message triggers typing) | PASS |
| 9 | sendChatAction is sent exactly once per /message request | PASS |

**Strategy:** A `callOrder: string[]` array is shared between the mocked `fetch` interceptor (which pushes `"sendChatAction"` when it sees that URL) and the mocked `runAgent` (which pushes `"runAgent"` at entry). After the HTTP response is received, the indices of both entries are compared — `sendChatAction` index must be strictly less than `runAgent` index. A separate test verifies no typing indicator is emitted for `/callback` requests. Another test uses a counter to assert exactly one `sendChatAction` call per message.

---

### AC3 — Failure to send typing indicator does not prevent the agent from responding

**Criterion:** Network errors, non-2xx HTTP responses from Telegram, and slow Telegram responses must not block or suppress the agent reply.

| # | Test | Result |
|---|------|--------|
| 10 | returns HTTP 200 even when Telegram fetch rejects (ECONNREFUSED) | PASS |
| 11 | response body contains a valid text field when fetch rejects | PASS |
| 12 | the agent reply text is returned correctly when Telegram fetch fails | PASS |
| 13 | returns HTTP 200 when Telegram returns 403 Forbidden | PASS |
| 14 | response JSON has text field when Telegram returns 403 | PASS |
| 15 | returns HTTP 200 when Telegram returns 500 Internal Server Error | PASS |
| 16 | agent reply is included in response even after Telegram 500 | PASS |
| 17 | agent response is returned even if Telegram takes a long time to respond (fire-and-forget) | PASS |

**Strategy:** Three sub-suites each spin up a fresh orchestrator on a distinct port with `global.fetch` pre-configured to:
- **Reject** with `ECONNREFUSED` (network failure)
- **Resolve** with `{ ok: false, status: 403 }` (token/permissions failure)
- **Resolve** with `{ ok: false, status: 500 }` (Telegram server error)

In all three cases, `POST /message` is expected to return `HTTP 200` with the mocked agent reply in the body. A fourth test verifies the non-blocking nature directly: `fetch` for `sendChatAction` takes 2 000 ms to resolve, but the agent mock completes in 50 ms. The HTTP response must arrive in under 1 000 ms, and `telegramDelayResolved` must still be `false` at that point, proving the indicator is truly fire-and-forget.

---

## Implementation Notes

The typing indicator is implemented entirely in `packages/orchestrator/src/index.ts`:

- **Function:** `sendTypingIndicator(chatId: number): void` (lines 37–59)
- **Invocation:** Line 233 in the `POST /message` handler — one line before `await handleMessage(msg)`.
- **Fire-and-forget:** The function returns `void` and is never awaited. Its internal `fetch(...)` promise chain has a `.catch()` handler that logs at `warn` level and discards the error. A non-OK HTTP response is also handled with a `warn` log.
- **No bot-side changes required:** The orchestrator already has `env.TELEGRAM_BOT_TOKEN` via `@lifeos/shared`, so it calls the Telegram API directly.

---

## Full Test Output

```
 RUN  v4.1.4 /Users/jamie/Documents/jamie-lifeos/packages/orchestrator

 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > a fetch call is made to the Telegram sendChatAction URL 16ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call uses action='typing' 12ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call includes the correct chat_id 12ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction URL contains the bot token 12ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC1 — typing indicator is sent to Telegram before agent response arrives > the sendChatAction call is POSTed via HTTP POST method 104ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > Telegram sendChatAction fetch is dispatched before runAgent is called 110ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is dispatched synchronously before the agent await begins 103ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is not sent for POST /callback (only /message triggers typing) 105ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC2 — typing action is sent before the Anthropic API call is initiated > sendChatAction is sent exactly once per /message request 157ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > returns HTTP 200 even when Telegram fetch rejects 2ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > response body contains a valid text field when fetch rejects 1ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when fetch rejects (network error) > the agent reply text is returned correctly when Telegram fetch fails 1ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a non-OK HTTP status (e.g. 403 Forbidden) > returns HTTP 200 when Telegram returns 403 2ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a non-OK HTTP status (e.g. 403 Forbidden) > response JSON has text field when Telegram returns 403 1ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a 500 Internal Server Error > returns HTTP 200 when Telegram returns 500 2ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > when Telegram returns a 500 Internal Server Error > agent reply is included in response even after Telegram 500 1ms
 ✓ src/__tests__/typing-indicator-t11.test.ts > AC3 — typing indicator failure does not prevent agent response > typing indicator is truly fire-and-forget (non-blocking) > agent response is returned even if Telegram takes a long time to respond 156ms

 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  15:46:39
   Duration  1.44s (transform 196ms, setup 0ms, import 307ms, tests 2.20s, environment 0ms)
```

---

## Verdict

**PASS** — All 3 acceptance criteria are covered by at least one passing test each. All 17 T-11 tests pass. No regressions in the existing 71 pre-existing tests (88 total pass).
