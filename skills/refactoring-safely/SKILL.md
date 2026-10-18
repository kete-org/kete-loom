---
name: refactoring-safely
description: Step-by-step method for restructuring code while proving its observable behaviour stays identical, by pinning current output with characterisation tests, making one small reversible move at a time, preferring automated IDE-style transformations, and using a strangler fig to replace large legacy modules incrementally. Use when renaming, extracting, moving or splitting code, untangling a legacy module, or planning a rewrite that must not break existing users.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Refactoring safely

A refactor changes structure, never behaviour. If behaviour changes, it is a feature or a fix and goes in a separate commit.

## 0. Before you start

1. State the goal in one sentence ("split `OrderService` so pricing can be tested alone"). If you can't, ask the user what the refactor is for.
2. Check the working tree is clean (`git status`). If not, **stop and ask** whether to commit or stash the user's changes first.
3. Find and run the test command. Record the result.
   - If tests already fail, **stop and tell the user**. Do not refactor on a red suite.
4. Search the codebase for every user of the code you will touch: callers, imports, reflection or string lookups, config files, templates, public API docs, other repos if it is a published package.
5. If the code is a public API (exported from a library, an HTTP endpoint, a CLI flag, a database column), **stop and ask** before changing its shape. Plan a deprecation instead.

## 1. Pin current behaviour (characterisation tests)

If the code you will change is not covered by tests that would fail on a behaviour change, write them first.

1. Call the code through its public entry point with realistic inputs, including edge cases: empty, null, boundary values, error paths.
2. Assert what it **does today**, even if it looks wrong. Note suspected bugs in a list for the user; do not fix them now.
3. For output-heavy code (reports, rendering, serialisers), use snapshot or golden-file tests.
4. Make each new test fail once on purpose (change an expected value) to prove it actually checks something, then restore it.
5. Commit the tests alone: "test: characterise X before refactor".

## 2. Plan the steps

Break the refactor into steps that each:

- Keep the build and tests green.
- Are small enough to revert with one `git revert` or `git checkout`.
- Change one thing: rename, or move, or extract. Not all three.

Write the step list down before starting. If it has more than about 10 steps or crosses module boundaries, show it to the user first.

## 3. Prefer mechanical refactors

Use automated transformations from the language server, IDE or a codemod tool where available: rename symbol, extract function or variable, inline, move file with import updates, change signature. They are safer than hand edits because they update every reference.

Common moves, safest first:

| Move | Watch out for |
|---|---|
| Rename | String-based lookups, serialised field names, logs others parse |
| Extract function or variable | Evaluation order, side effects, early returns |
| Inline | Expressions with side effects evaluated more or fewer times |
| Move to another module | Circular imports, init order, package visibility |
| Change signature | Default arguments, callers in other packages, mocks in tests |
| Replace conditional with polymorphism | Missing cases; add a test per branch first |

For hand edits, search for every reference before and after, and compare counts.

## 4. The loop

For each step:

1. Make the single change.
2. Run the build or type-check, then the tests for the affected area.
3. Green: commit with a message like "refactor: extract computeTax from Invoice". Red: **revert the step**, don't debug forward. Then take a smaller step.
4. Every few steps, run the full suite.

## 5. Large rewrites: strangler fig

When a module is too large to refactor in place:

1. Put a seam in front of it: an interface, a facade, a router or a proxy that all callers go through. Ship that alone, with no behaviour change.
2. Build the new implementation behind the same seam, one capability at a time.
3. Route a slice of traffic or one use case to the new code (feature flag, config switch, path-based routing).
4. Compare: run old and new side by side on the same inputs where you can (shadow traffic, dual-run tests) and diff the results.
5. When a capability matches, move all callers to it and delete the old path for that capability.
6. Repeat until the old module has no callers, then delete it.

Never run a big-bang rewrite that replaces everything in one release. If the user asks for one, explain the risk and offer the strangler plan.

## 6. Rules

- Never change behaviour and structure in the same commit.
- Never delete, skip or loosen a test to make a refactor pass. A failing test means behaviour changed.
- Never reformat whole files in a refactor commit; it hides the real diff. Do formatting in its own commit.
- Do not refactor code unrelated to the stated goal, however tempting.
- Keep performance-sensitive code paths' complexity the same unless the user agreed to change it.

## 7. Finish

1. Run the full test suite, linter and type-check.
2. Diff the start and end of the branch and check that the public API is unchanged (exports, endpoints, signatures), unless agreed.
3. Report:

```
Refactor: <goal>
Steps: <n> commits, each green
Characterisation tests added: <files> | none needed (existing coverage: <files>)
Public API changed: no | yes, agreed: <what>
Suspected bugs found, not fixed: <list> | none
Checks: <commands run> -> <pass/fail>
```
