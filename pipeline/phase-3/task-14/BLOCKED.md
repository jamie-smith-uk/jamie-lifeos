# BLOCKED: Security Fix Conflicts with Existing Tests

## Issue
The security finding requires adding authentication validation to the `/dismiss-nudge` endpoint by requiring a `chat_id` field in the request body and validating it against `env.TELEGRAM_ALLOWED_CHAT_ID`. However, the existing tests in `packages/orchestrator/src/__tests__/index.test.ts` only send `nudge_id` in the request body and do not include the required `chat_id` field.

## Specific Test Failures
Two tests are failing with 400 status codes instead of expected 200:
1. "AC1: accepts nudge_id in request body and returns 200" (line 923)
2. "AC2: calls dismiss_nudge tool function with nudge_id" (line 1007)

Both tests send requests like:
```javascript
const res = await httpPost(handle.port, "/dismiss-nudge", {
  nudge_id: 42,
});
```

But the security fix now requires:
```javascript
const res = await httpPost(handle.port, "/dismiss-nudge", {
  nudge_id: 42,
  chat_id: 123456,  // This field is now required
});
```

## Security Fix Applied
I have successfully implemented the required security fix:
1. Added `chat_id` validation to the request body parsing
2. Added authentication check: `if (chat_id !== Number(env.TELEGRAM_ALLOWED_CHAT_ID))`
3. Updated error messages to include both required fields

## Conflict with Instructions
The security fix cycle instructions explicitly state:
- "Never modify, restructure, or delete test files during a security fix cycle"
- "Test files are owned by the Tester. Touching them voids the TDD contract"
- "If a test file appears broken, that is a Tester defect — it is NOT your problem to solve in a security fix cycle"

## Resolution Required
The Tester needs to update the test cases to include the required `chat_id` field in the request bodies for the `/dismiss-nudge` endpoint tests. The tests should send `chat_id: 123456` (matching the test environment's `TELEGRAM_ALLOWED_CHAT_ID` value) along with the `nudge_id`.

## Security Implementation Status
✅ **Security fix is complete and correct** - the endpoint now properly validates authentication as required by the security finding.

❌ **Tests fail due to missing authentication data** - this is a test defect, not a security implementation issue.