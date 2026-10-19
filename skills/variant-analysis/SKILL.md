---
name: variant-analysis
description: Finds the siblings of a bug you already have by pinning its root cause, writing a Semgrep, CodeQL or grep pattern that matches only the known instance, then loosening that pattern one element at a time until false positives pass half, triaging every hit, and committing the surviving rule to CI so the mistake cannot recur. Also covers running Semgrep and CodeQL scans and triaging their SARIF output. Use when a vulnerability or defect has been fixed and you need to catch the same mistake elsewhere, or to turn a one-off finding into a lasting lint rule.
license: MIT
compatibility: Any Agent Skills host. Needs semgrep and/or the CodeQL CLI for pattern scanning; grep works as a fallback.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: runs-commands
  kete-loom/requires: "semgrep"
  kete-loom/owner: "Kete-org"
---

# Variant analysis

One bug is rarely alone. The same mistake, copied or re-made, usually hides elsewhere in the codebase. Variant analysis turns a single fixed bug into a query that finds its relatives — and then into a CI rule so it never comes back.

Start from a **known, understood instance** (a fix you just made, a reported vulnerability, a crash you root-caused). This skill is not a general audit; for that use `security-review` or `threat-modeling`.

## 1. Extract the root cause

Write down, from the one instance:
- The exact defective code shape — the API misused, the check missing, the order wrong.
- *Why* it is a bug: the precondition that is violated, the tainted value that reaches a sink, the guard that should be there.
- What a **correct** instance looks like, so the rule can exclude it.

If you can't state the root cause in one sentence, you can't write a good pattern. Understand it first.

## 2. Write a pattern that matches ONLY the known instance

Begin as specific as possible — match the literal code you already found, nothing else. Choose the tool:

- **Semgrep** — syntax-aware, multi-language, fast to iterate. Best default. Patterns look like code with `...` and `$VAR` metavariables.
- **CodeQL** — when the bug needs data-flow or taint tracking (does user input reach this sink?) that a syntactic match can't express.
- **grep / ripgrep** — last resort for a textual pattern no parser is needed for; expect more noise.

Confirm the pattern matches your known instance and the fixed version does **not** match. `references/semgrep-codeql.md` has rule skeletons, metavariable and taint syntax, and run commands.

## 3. Generalise one element at a time

Now widen the pattern deliberately, **one change per step**:

1. Make one element generic (a specific variable → a metavariable; a literal → `...`; one function → a family).
2. Re-run across the repo.
3. Read the new hits. Keep a running ratio of **true variants to false positives**.
4. **Stop widening when false positives exceed roughly half the new hits.** Past that, the rule costs more triage than it saves. Step back to the last useful version.

This keeps the rule precise enough to live in CI. A rule that cries wolf gets disabled.

## 4. Triage every hit

For each match, decide: **true variant** (same root cause, real bug), **false positive** (matches the shape but a guard elsewhere makes it safe — follow the data flow to confirm), or **intended** (a correct instance the pattern shouldn't match → tighten the rule to exclude it). Record the verdict and the reason per hit. File true variants as bugs with the same severity reasoning as the original.

## 5. Running a scan and triaging SARIF

When asked to run Semgrep/CodeQL broadly (a ruleset, not just your one rule):
- Semgrep: `semgrep --config <ruleset> --sarif -o results.sarif .`
- CodeQL: build a database, `codeql database analyze db <suite> --format=sarifv2.1.0 -o results.sarif`.
- Triage SARIF: each `runs[].results[]` has a `ruleId`, `level` (error/warning/note), `message`, and `locations[]` (file + region). Group by `ruleId`, read the highest-severity first, and apply step 4's verdicts. Don't report raw tool output as findings — a triaged list only.

## 6. Commit the rule to CI

- Save the surviving rule in the repo (`.semgrep/` or the CodeQL pack) with a comment linking the original bug and stating the root cause.
- Wire it into the pipeline so new code is scanned on every change; fail or warn per the team's policy.
- Add the fixed instance as a negative test and one known variant as a positive test for the rule, so the rule itself is covered.

## Stop and ask

- If a "variant" turns out to be a *different* bug, don't fold it into this rule — raise it separately.
- Before failing CI on a new rule across a large repo, agree with the team whether it blocks or warns first, to avoid a wall of pre-existing hits.

## Report back

End with: the root cause in one sentence, the final pattern and which tool, how far you generalised and where you stopped (the TP:FP ratio), every hit with its verdict and reason, the variants filed, and the rule added to CI with its tests.
