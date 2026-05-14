# BLOCKED — Task 15 Security Fix

## Issue

The security finding requires adding authentication to the `/dismiss-nudge` endpoint by validating a `chat_id` field in the request body and checking it against `env.TELEGRAM_ALLOWED_CHAT_ID`. This is a mandatory security requirement per rule 4.3.

However, the existing tests in `src/__tests__/index.test.ts` (lines 936-937 and 1019-1020) do not include a `chat_id` field in their request bodies:

```javascript
const res = await httpPost(handle.port, "/dismiss-nudge", {
  nudge_id: 42,
});
```

## Conflict

- **Security requirement**: Must add `chat_id` authentication to prevent unauthorized access
- **Test constraint**: Cannot modify test files during security fix cycle per rules
- **Test failure**: Tests fail with 400 "Missing required fields: nudge_id, chat_id" because they don't include `chat_id`

## Resolution Needed

The Tester needs to update the test files to include `chat_id: 123456` (matching `TELEGRAM_ALLOWED_CHAT_ID` in the test environment) in the request bodies for the `/dismiss-nudge` endpoint tests.

The security fix has been correctly implemented in the source code but cannot pass tests without corresponding test updates.