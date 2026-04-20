# SonarCloud Backlog

Generated from SonarCloud analysis of `jamie-smith-uk_jamie-lifeos`.
Last updated: 2026-04-20.

9 open issues (BLOCKER / CRITICAL / MAJOR). All are CODE_SMELL or BUG — no Vulnerabilities.

---

## CRITICAL — Bug (1)

| File | Line | Message | Fix |
|---|---|---|---|
| `packages/shared/src/migrate.ts` | 128 | Array `.sort()` called without a compare function — sort order is locale-dependent and unreliable for migration filenames. | Replace `.sort()` with `.sort((a, b) => a.localeCompare(b))` to guarantee stable alphabetical ordering of migration files. |

---

## CRITICAL — Code Smell (5)

All five are functions with Cognitive Complexity above the allowed threshold of 15. High complexity makes code harder to test, review, and maintain.

| File | Line | Complexity | Fix |
|---|---|---|---|
| `packages/orchestrator/src/agent.ts` | 535 | 70 (allowed: 15) | Extract tool dispatch, context assembly, and retry logic into separate named functions. |
| `packages/orchestrator/src/index.ts` | 122 | 44 (allowed: 15) | Split the main HTTP request handler into per-route handler functions. |
| `packages/orchestrator/src/index.ts` | 359 | 28 (allowed: 15) | Extract the callback routing logic (`confirm` / `edit` / `cancel`) into separate handler functions. |
| `packages/orchestrator/src/tools/calendar.ts` | 595 | 16 (allowed: 15) | Minor refactor — extract one conditional branch into a helper. |
| `packages/orchestrator/src/tools/calendar.ts` | 894 | 47 (allowed: 15) | Extract MCP response parsing and error handling into separate functions. |

---

## MAJOR — Code Smell (3)

| File | Line | Message | Fix |
|---|---|---|---|
| `packages/orchestrator/src/index.ts` | 552 | Prefer top-level await over using a promise chain. | Replace `.then()` / `.catch()` chain in `main()` startup with `await` + try/catch. |
| `packages/orchestrator/src/tools/calendar.ts` | 93 | Regular expression has complexity 33 (allowed: 20). | Simplify the regex or split into multiple smaller expressions with named captures. |
| `packages/shared/src/migrate.ts` | 222 | Prefer top-level await over using a promise chain. | Replace `.then()` / `.catch()` chain with `await` + try/catch. |

---

## Notes

- The 191 CLOSED issues were all in `orchestrator/run-phase.sh` (shell script best-practices) — they were auto-resolved when the script was updated.
- The dominant pattern in open issues is **high cognitive complexity** in `agent.ts`, `index.ts`, and `calendar.ts`. These are strong candidates for the AG-06 Refactor agent pass in Phase 2+.
- The `migrate.ts` sort bug (line 128) is the only true Bug — worth fixing before Phase 2 since migrations run in filename order.
