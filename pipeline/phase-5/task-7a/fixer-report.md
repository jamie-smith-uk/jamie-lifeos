# Fixer Report — task-7a

Status: FIXED

## Root cause
The failing tests had a Vitest mock isolation bug. The tests used `vi.stubGlobal("fetch", async (url, init) => ...)` but then tried to access `(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls`, which doesn't exist because `vi.stubGlobal()` with a regular function doesn't create a mock with `.mock.calls`. This is a classic Vitest mocking pattern error where the test infrastructure was incorrectly set up.

## Files changed
- `packages/bot/src/__tests__/voice-yes-callback.test.ts`: Fixed all fetch mocking patterns to use `vi.fn().mockImplementation()` instead of `vi.stubGlobal()` with regular functions, then access `fetchMock.mock.calls` instead of trying to access `.mock.calls` on the stubbed global. Also removed unused `CapturedCall` interface and fixed two test data mismatches.

## Validation
- tsc --noEmit: PASS
- biome check: PASS  
- pnpm test: PASS

```
 Test Files  6 passed (6)
      Tests  210 passed | 1 skipped (211)
   Start at  10:39:13
   Duration  2.24s (transform 538ms, setup 0ms, import 716ms, tests 4.78s, environment 1ms)
```