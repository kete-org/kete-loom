---
name: issue-sync
description: Bring tracked issues in line with the work: find the issues this branch or PR addresses and propose status updates, comments and links, applying them after approval.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[issue keys or numbers]"
  kete-loom/owner: "Kete-org"
---

Bring the issue tracker in line with the current work.

1. Find the issues: the ones named below, plus any referenced in the branch name, commit messages or PR description (for example `#123`, `ABC-45`).
2. Read each issue and compare it with what the branch actually does: which acceptance criteria are met, which aren't, and what changed in scope.
3. Propose, per issue: a status change, a short progress comment (what is done, what is left, link to the PR), and any follow-up issue for work that was split off.
4. **After the user approves**, apply it with the matching skill: `github-api-automation` (or `gh`), `jira-integration` or `linear-integration`. Never close an issue whose acceptance criteria are not all met.
5. Report what was updated.

Issues: $ARGUMENTS
