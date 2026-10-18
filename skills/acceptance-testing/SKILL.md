---
name: acceptance-testing
description: User acceptance testing of delivered work run together with the user, turning the requirements, plan or ticket into concrete things the user should now be able to do, walking through them one deliverable at a time with exact steps and the expected result, adding a cold-start smoke test from a fresh clone or clean state, recording every pass, failure and skip in a UAT file that survives across sessions, and handing each failure to root-cause debugging with its reproduction. Use when a feature, phase or milestone is reported as finished and someone wants to confirm with the user that it really works before calling it done, signing it off or moving on.
license: MIT
compatibility: Any Agent Skills host. Needs git to find what changed. The user must be available to try each step; the agent records, it does not judge alone.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: writes-files
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Acceptance testing

Prove, with the user at the keyboard, that what was delivered does what was asked. Automated checks (`verification-loop`) prove the code builds and the tests pass; this proves a person can actually use the result. You state what should happen, the user tries it and says whether it did. You record; you never mark a step passed on the user's behalf.

## 0. Before you start

1. **Find the source of truth.** In order: the plan or phase file the user names, `.planning/` (roadmap, requirements, phase plans) if the project keeps one, the ticket or pull request description, the spec or PRD in `docs/`, the commit messages since the work began. If none of these says what the work should do, **stop and ask the user** for the requirements. Never derive acceptance criteria only from the code; that tests what was built, not what was asked for.
2. **Find what changed.** `git log --oneline <base>..HEAD` and `git diff --stat <base>..HEAD`, where `<base>` is the merge base with the default branch or the commit before the phase started.
3. **Check for an open UAT file** for this work (see step 5). If one exists with untested or failed items, resume it instead of starting over; tell the user where you are picking up.
4. **Run the automated checks once** (the `verification-loop` skill, or the project's build, lint and test commands). If they fail, report it and ask whether to fix first. Acceptance testing on a red build wastes the user's time.

## 1. Derive the acceptance checks

Turn each requirement into one or more checks the user can perform. Each check has:

- **ID** linked to the requirement (`R3.1`, or the ticket's numbering).
- **Do:** exact steps, in the user's language, with URLs, commands, sample input and test account names. No "verify the feature works".
- **Expect:** the observable result: text on screen, the file written, the exit code, the email in the test inbox, the row in the table.
- **Kind:** `happy path`, `edge` (empty, too long, wrong format, duplicate), `error` (what the user sees when it fails), or `regression` (something nearby that must still work).

Rules:

- One check per observable behaviour. Split anything with "and" in the Expect line.
- Cover every requirement. A requirement with no check is listed as **unverified** in the report, never silently dropped.
- Cover what the user will touch, not internals. Internal behaviour belongs in automated tests.
- Order by dependency: setup and sign-in first, then the main journey, then edges and errors.
- Keep a session to about 5 to 15 checks. For more, split by deliverable and agree the order with the user.

Show the list to the user and ask: "Anything missing or wrong before we start?" Adjust, then begin.

## 2. Cold-start smoke test

Run this first whenever the work touched setup, configuration, dependencies, migrations, seed data, environment variables, build scripts or start-up code, and always before a release sign-off. Work that runs on the developer's machine often fails from clean because of a cached build, a local database, or an environment variable nobody wrote down.

1. Get a clean state: a fresh clone into a temporary folder (`git clone <repo-url-or-local-path> <tmp>`, then check out the branch), or a new container, or the project's documented reset. A clone only contains committed work: if the work under test is uncommitted, or not pushed and you clone the remote, the cold start tests the wrong code. Ask the user to commit first, or clone from the local path. Never delete or reset the user's working copy or database to get there.
2. Follow only the written setup instructions (README, `CONTRIBUTING.md`, `docs/`), step by step, exactly as written. Do not fill gaps from memory.
3. Record every step that failed, was missing, or needed knowledge the docs don't give. Each one is a failure, even if you worked out the fix.
4. Start the app or run the tool and do the first check from step 1.

If the clean setup needs secrets or paid services you can't access, ask the user to run it and report, and mark it `blocked` until they do.

## 3. Walk through, one check at a time

For each check:

1. Present the ID, the **Do** steps and the **Expect** line. Nothing else; don't pre-explain likely problems.
2. Wait for the user. Treat "yes", "pass", "works" as a pass. Anything else is a failure: ask one question if the description is unclear (what they saw, any error text, a screenshot), then record it in their words.
3. Record the result in the UAT file immediately, before presenting the next check, so nothing is lost if the session ends.
4. Do not fix anything mid-walk unless the failure blocks every later check (for example sign-in is broken). Then stop, say so, and agree with the user whether to fix now or end the session.

Severity for failures (infer it; don't make the user classify):

- **blocker**: the deliverable can't be used, data is lost or wrong, or a security problem.
- **major**: a requirement is not met, or a common path fails.
- **minor**: works with a workaround, wrong message, cosmetic but visible.

If the user wants to skip a check, record `skipped` with their reason. Skipped is not passed.

## 4. Hand off each failure

For every failure, write a reproduction in the UAT file: the exact steps, the input, what was expected and what happened, plus environment (branch, commit, browser or OS if relevant). Then:

- Hand each one to the `systematic-debugging` skill (or the `/fix-bug` command) with that reproduction, one at a time, blockers first. Each fix gets a regression test where one is possible.
- If several failures look related, say so, but still debug from the first one rather than guessing at a shared cause.
- When the user agrees to fix later, list the failures as gaps against their requirement IDs, so the next plan can pick them up.
- After a fix lands, re-run **that** check with the user and the checks that share its code path. Update the result with the fixing commit.

Never mark a failure resolved because a fix was written; only because the user re-ran the check and it passed.

## 5. The UAT file

Save to `.planning/<phase or feature>/UAT.md` if the project keeps a `.planning/` folder, otherwise `docs/uat/<feature>-UAT.md`, unless the project already has a convention. Ask before committing it. Use the format in `references/uat-template.md`. Status values per check: `pending`, `pass`, `fail`, `skipped`, `blocked`, `fixed` (re-tested and passed after a fix).

## 6. Finish

End every session with this report, even a partial one:

```
## Acceptance test: <feature or phase>
Source: <plan/ticket/spec used>   Commit: <sha>   UAT file: <path>
Result: accepted | accepted with known issues | not accepted | incomplete
Checks: <n> pass, <n> fail, <n> skipped, <n> blocked, <n> pending
Cold start: pass | fail (<step>) | not run (<why>)
Failures:
- <ID> [blocker|major|minor]: <one line> -> <handed to debugging | fixed in <sha> | deferred>
Still unverified:
- <requirement or check, and why: skipped, blocked, no check written, out of scope>
```

"Accepted" requires every check passed or fixed, no open blocker or major failure, and the cold start passed or not needed. Otherwise use a weaker result. The "Still unverified" list is mandatory; write "none" only when it is truly empty. Also list unresolved failures and skips from earlier UAT files for the same project, so old gaps don't disappear.

## Never

- Never mark a check passed without the user's answer, or because the automated tests pass.
- Never weaken an Expect line to match what the software does; if the requirement was wrong, the user changes it and the change is recorded.
- Never run checks against production data, real payments or real customer messages unless the user says so explicitly in this session.
- Never reset, wipe or reseed the user's own environment to get a clean state; use a separate clone or container.
- Never call the work done while the report shows a fail, skip or blocked item without saying so in the first line.
