---
name: responding-to-code-review
description: Works through review comments left on your own pull request or change with technical rigour - reads every comment before touching code, restates each one, asks about unclear items first, checks each suggestion against the codebase before agreeing, pushes back with evidence when a suggestion is wrong, applies YAGNI to scope creep, fixes one item at a time with a test, and replies in the review thread itself. Use when a reviewer, teammate or bot has left feedback on your change and you must decide what to fix, what to question and how to answer.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner; replying on GitHub needs the gh CLI, signed in.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git, gh"
  kete-loom/owner: "Kete-org"
---

# Responding to code review

Review feedback is input to evaluate, not orders to obey or praise to return. Every reply either states a fix, asks a precise question, or disagrees with evidence.

This skill is for the author receiving feedback. To review someone else's change, use the `code-reviewer` agent or the `/review` command instead.

## 1. Collect all the feedback first

1. Gather every comment before changing anything: the summary review, inline comments, and any bot findings. On GitHub:
   - Reviews: `gh pr view <pr> --json reviews,comments`
   - Inline comments with their ids, paths and lines: `gh api repos/{owner}/{repo}/pulls/<pr>/comments --paginate`
2. Number the items. One comment can hold several items; split them.
3. Note who wrote each item. The user or the project owner sets direction; an outside reviewer or a bot may lack context.

Do not start fixing item 1 while item 5 is unread. Items often depend on each other.

## 2. Restate each item

For each item write one line: what the reviewer wants changed, and why, in your own words. If you cannot restate it, it is unclear.

**Stop and ask** before implementing anything when any item is unclear. List the items you understand and the exact question for each unclear one. Do not implement the clear ones first; a later answer can change them.

## 3. Check each suggestion against reality

Before agreeing, verify. For each item:

| Check | How |
|---|---|
| Is the claim true here? | Read the code it points at, and run it or its test if the claim is about behaviour |
| Would the change break something? | Search the codebase for callers and run their tests |
| Is there a reason for the current code? | `git log -L <start>,<end>:<file>` or `git blame` on the lines; read the linked issue or commit message |
| Does it hold on every supported platform and version? | Check the project's declared runtime, targets and compatibility matrix |
| Does it conflict with a decision the user already made? | Re-read the task, plan or earlier conversation |

Classify the item: **correct** (fix it), **wrong** (push back), **partly right** (fix the valid part, explain the rest), or **cannot verify** (say what you would need).

If an item conflicts with the user's earlier decision or changes architecture, **stop and ask the user** rather than settling it with the reviewer.

## 4. Apply YAGNI to scope requests

Requests like "handle this properly", "add pagination and caching here" or "make this configurable" can grow a small change into a large one.

1. Search the codebase for real use of the thing being expanded.
2. If nothing uses it, propose removing or keeping it minimal and ask whether usage exists that you missed.
3. If it is used and the request is a real gap, treat it as a normal fix, or propose a follow-up issue when it is out of the change's scope.

## 5. Push back with evidence

Disagree when the suggestion is incorrect for this stack, breaks existing behaviour, ignores a compatibility constraint, adds unused features, or contradicts the user's decisions.

A good pushback names the evidence and offers a way forward:

```
Keeping the fallback: package.json declares "engines": {"node": ">=16"} and CI
still runs Node 16 in .github/workflows/legacy.yml, but structuredClone is only
global from Node 17. Raise the engines floor and drop that job, or keep this?
```

- Point at a file, line, test, log or doc. Opinion alone is not evidence.
- Ask a specific question when you want a decision.
- If you later find you were wrong, say so in one line and fix it: "Checked again: the cache is shared across tenants, so this is a real leak. Fixed in `cache.ts:42`." No long apology, no defence of the earlier reply.

## 6. Implement one item at a time

Order: blocking items (bugs, security, data loss) first, then simple fixes, then larger refactors.

For each item:

1. Write or update a test that fails without the fix, where the item is about behaviour. Follow `tdd-workflow` if it is installed.
2. Make the smallest change that resolves the item.
3. Run the related tests, then the full suite before moving on.
4. Commit or stage it as its own logical change if the project works that way, so the reviewer can see each fix.

Never batch ten fixes into one untested edit. Never weaken or delete a test to satisfy a comment without the user agreeing.

## 7. Reply where the comment is

- Answer an inline comment in its own thread, not as a new top-level PR comment:
  `gh api repos/{owner}/{repo}/pulls/<pr>/comments/<comment_id>/replies -f body='Fixed: ...'`
- Answer a summary review or a general comment with `gh pr comment <pr> --body '...'`.
- Elsewhere (GitLab, Gerrit, a chat thread), reply in the same thread the comment came from.
- Post replies only after the fixes are pushed or the user approves pushing; a reply that says "fixed" must point at code that exists on the branch.

## Tone rules

- State the fix or the question. That is the acknowledgement.
- Never write performative agreement or filler: "You're absolutely right!", "Great catch!", "Thanks for the feedback!", "Excellent point". Delete them if you notice them in a draft.
- Never promise a change before you have verified it ("I'll fix that now").
- Never argue for the sake of it. Concede in one line when the evidence says the reviewer is right.

Reply shapes:

```
Fixed: <what changed>, <file:line>. Test: <test name>.
Not changing: <reason with evidence>. <question or alternative>?
Question: <exact thing you need to know> before I change <thing>.
Can't verify without <access, data, environment>. Investigate, ask <who>, or leave?
```

## Report back

End with a table the user can scan:

```
## Review response: <PR or change>
| # | Item (restated) | Verdict | Action | Reply posted |
|---|---|---|---|---|
| 1 | ... | correct / wrong / partly / unclear / can't verify | fixed in <file:line> / pushed back / asked | yes / draft |
Tests: <command> -> <pass/fail counts>
Open questions for the user: <list, or none>
```
