---
name: review
description: Review the current changes for bugs, risky patterns and missing tests, routed to the reviewer for the language that changed.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[files, commit range or focus]"
  kete-loom/owner: "Kete-org"
---

Review the current changes. Do not edit any files; this is a read-only review.

1. Find the change set. If the user named files or a range below, use that. Otherwise use the staged and unstaged diff against `HEAD` (`git diff HEAD`) plus untracked files from `git status --short`, which `git diff` does not show; if that is empty, use the branch diff against its merge base with the default branch (`git diff $(git merge-base HEAD origin/main)`, adjusting the branch name).
2. Group the changed files by language from their extensions.
3. Delegate each group to the matching Kete Loom reviewer agent if it is available: `typescript-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `kotlin-reviewer`, `csharp-reviewer`, `fsharp-reviewer`, `cpp-reviewer`, `swift-reviewer`, `dart-reviewer`, `php-reviewer`, `ruby-reviewer`, `perl-reviewer`. For framework code prefer the specific one (`react-reviewer`, `vue-reviewer`, `flutter-reviewer`, `django-reviewer`, `fastapi-reviewer`); for SQL and migrations use `database-reviewer`; for Dockerfiles, Kubernetes and Terraform use `infra-reviewer`; for payment provider code (Paystack, Stripe, MoMo, M-Pesa webhooks and charges) use `payments-reviewer`; for retrieval and embedding pipelines use `rag-reviewer`; for UI markup add `accessibility-reviewer`. For a security-focused review, use `/security-scan` instead.
4. If no specific reviewer is available, use the `code-reviewer` agent. If that is missing too, review the diff yourself: correctness first, then security, error handling, tests and readability. Read the surrounding code before reporting, and drop any finding you cannot point to a line for.
5. Merge the results into one report, most severe first:

```
## Review: <scope>
Blocking
- path:line: problem. Why it matters. Suggested fix.
Should fix
- ...
Nits
- ...
Verdict: approve | approve with changes | request changes
```

If there are no changes to review, say so and stop.

Scope or focus from the user, if any: $ARGUMENTS
