[93m[1m! [0m agent "ag-04-security" is a subagent, not a primary agent. Falling back to default agent
[0m
[0m

> build · claude-sonnet-4-6[0m• [0mSecurity audit T-20[90m Ag-04-Security Agent[0m
[0m✓ [0mSecurity audit T-20[90m Ag-04-Security Agent[0m
**PASS** - T-20 security review complete.

The security report has been written to `pipeline/phase-1/T-20/security-report.md`.

**Summary of findings:**

| Rule Category | Result |
|---|---|
| SQL injection (parameterized queries) | PASS |
| Secrets management (env vars only) | PASS |
| Input validation (ISO 8601 enforcement) | PASS |
| External content handling (structured data) | PASS |
| Error handling (no stack trace leakage) | PASS |
| Database access patterns | PASS |
| No new vulnerable dependencies | PASS |

No violations found. T-20 is cleared to proceed to AG-05 Tester.
