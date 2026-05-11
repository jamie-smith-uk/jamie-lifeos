# Phase 2 Manifest Reviewer Summary

## Overview

Phase 2 delivers Tasks and Email intelligence across 6 tasks: a people graph (tasks 1-2), task confirmation flows (tasks 3-4), and email intelligence (tasks 5-6). The dependency chain is sound and the scope is well-bounded to three files at most per task.

## Task-by-Task Assessment

| Task | Title | Complexity | Security | Assessment |
|------|-------|------------|----------|------------|
| task-1 | Implement people graph database tools | medium | yes | Acceptable with caveats — see concerns |
| task-2 | Add people tools to agent system | low | no | Acceptable with caveats — see concerns |
| task-3 | Implement task confirmation flows | medium | yes | Acceptable |
| task-4 | Implement task confirmation executor | medium | yes | Acceptable |
| task-5 | Implement email implied action detection | high | no | Acceptable with caveats — see concerns |
| task-6 | Implement email-to-people linking | medium | no | Acceptable with caveats — see concerns |

## Dependency Graph

```
task-1 → task-2 → task-5
                → task-6
task-3 → task-4
task-3 → task-5
```

Dependencies are acyclic and correctly declared. Tasks 1-2 and 3-4 can proceed in parallel, which is consistent with the manifest-summary.

## Concerns or Risks

### Acceptance Criteria Ambiguities

**task-1 AC-2** — Fuzzy matching behavior is not defined with acceptance thresholds. The criterion states `get_person` uses "fuzzy matching" but does not specify algorithm, similarity threshold, or what constitutes a passing match. Without a concrete threshold (e.g., Levenshtein distance ≤ 2, Jaro-Winkler ≥ 0.85), the developer and tester cannot agree on correctness.

**task-1 AC-3** — "Merges new notes into existing record" is ambiguous. No specification of merge behavior: does new content append, replace, or deduplicate? There is no stated mechanism for verifying the merge occurred correctly (e.g., original content preserved, separator format).

**task-1 AC-6** — "Never throw exceptions" is vague. It is unclear what error handling should occur instead (return error JSON, return null, log and swallow), and there is no method specified for verifying absence of exceptions across all code paths at test time.

**task-2 AC-5** — "Shows names and relationship types for all known people" lacks specificity on format, ordering, filtering criteria, or how a tester verifies completeness of the index. An empty people database trivially passes this criterion.

**task-3 AC-4** — "Human-readable summary" is subjective. No required fields, format, or readability criteria are specified. Any string technically satisfies this criterion.

**task-5 AC-6** — "Common patterns" is undefined. No specification of which date/time/location patterns must be recognized, nor confidence thresholds for detection. Without an enumerated set of required patterns, coverage cannot be verified.

**task-6 AC-4** — "Common email address formats and display names" is ambiguous. No specification of which formats must be handled (RFC 5321 bare address, display-name + angle-bracket, quoted strings, etc.) or the matching logic used to correlate them to people records.

**task-6 AC-5** — Vague language: "People linking works for both direct emails and emails mentioning known people in content." "Mentioning known people in content" is undefined — no specification of how name matching against free-form body text should work, what confidence is required, or how false positives are managed.

### Scope and Risk Notes

- **task-5** is the highest-risk task. Email parsing for implied actions is inherently heuristic. The absence of defined confidence thresholds (AC-6) means the acceptance bar is unverifiable. Recommend the developer and tester agree on a concrete pattern list before implementation begins.
- **task-1** security sensitivity combined with three ambiguous ACs increases the likelihood of a security audit gap. The "never throw exceptions" criterion is particularly important to clarify because silent error swallowing can mask injection attempts.
- **task-3 / task-4** are the clearest tasks in the manifest. The confirmation pattern mirrors existing calendar flows, reducing implementation risk.

## Recommendation

**Conditional approval.** The manifest is structurally sound and the dependency ordering is correct. Before the developer begins tasks 1, 2, 5, and 6, the ambiguous acceptance criteria listed above should be tightened with concrete thresholds, format specifications, and verifiable pass/fail conditions. Tasks 3 and 4 may proceed immediately.
