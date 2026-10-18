---
name: conventional-commits
description: Writes and checks commit messages in the Conventional Commits 1.0.0 format - choosing the type and scope, marking breaking changes with "!" or a BREAKING CHANGE footer, writing a body that explains why the change was made, and adding issue footers - so changelog and semantic-version tooling can read the history. Use when composing a commit message, splitting staged work into well-labelled commits, fixing a message that commitlint rejected, or deciding whether a change counts as feat, fix or breaking.
license: MIT
compatibility: Any Agent Skills host. Needs git. Checking messages with commitlint needs Node.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Conventional Commits

A commit message is a record for the next person who runs `git blame`, and for the tools that build the changelog and pick the next version. Write it for both.

## 0. Before writing

1. Look for project rules first: `commitlint.config.*`, `.commitlintrc*`, a `commitlint` key in `package.json`, `CONTRIBUTING.md`, `.czrc`, or release config (`release-please-config.json`, `.releaserc*`). Allowed types and scopes there override this skill.
2. Read recent history for the house style: `git log --oneline -20`. Match the scopes and casing already in use.
3. Read what is actually staged: `git diff --cached --stat`, then `git diff --cached`. Write about the staged diff, not what you remember changing.
4. If nothing is staged, **stop and ask** what should go in the commit. Don't `git add -A` on the user's behalf.

## 1. One change per commit

If the staged diff mixes unrelated things (a bug fix plus a rename plus a dependency bump), propose splitting it and say which files go where. If the user wants one commit anyway, use the type of the most significant change and mention the rest in the body.

## 2. Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

Rules from the specification:

- `type` is a noun, followed by optional `(scope)`, optional `!`, then `: ` (colon and space) and the description.
- The body starts after one blank line and is free text.
- Footers start after one blank line. Each is `Token: value` or `Token #value`. Tokens use `-` instead of spaces (`Reviewed-by`), except `BREAKING CHANGE`.
- `BREAKING CHANGE` must be uppercase. `BREAKING-CHANGE` means the same.

House conventions on top of the spec (follow the project's config if it differs):

- Description: imperative mood ("add", not "added"/"adds"), lower case first word, no trailing period, aim for 72 characters or fewer on the whole first line.
- Wrap the body at about 72 characters.

## 3. Choose the type

| Type | Use for | Version effect with standard tooling |
|---|---|---|
| `feat` | New behaviour a user or caller can see | minor |
| `fix` | Corrects wrong behaviour | patch |
| `perf` | Faster or leaner, same behaviour | patch in most presets |
| `refactor` | Code change with no behaviour change | none |
| `docs` | Documentation only | none |
| `test` | Adding or fixing tests only | none |
| `build` | Build system, packaging, dependencies | none |
| `ci` | CI configuration and scripts | none |
| `style` | Formatting, whitespace; no code meaning change | none |
| `chore` | Maintenance that fits nothing above | none |
| `revert` | Reverts an earlier commit | depends on the tool |

Only `feat` and `fix` have meaning in the specification itself; the rest are the widely used `@commitlint/config-conventional` set. Any type can carry a breaking change.

Decision rules:

- If a user-visible behaviour changes to correct a defect, it is `fix`, even if the code change is large.
- If you are unsure between `feat` and `refactor`, ask: would the changelog reader care? Yes means `feat` or `fix`.
- A dependency bump that fixes a user-facing bug is `fix(deps): ...`; a routine bump is `build(deps): ...` (or `chore(deps)` if that is the house style).

## 4. Choose the scope

- A scope names the area touched: a package, module or subsystem (`feat(auth): ...`, `fix(api): ...`).
- Use scopes already in the history or config. Don't invent a new one per commit.
- Leave the scope out rather than guess, or when the change spans the whole project.

## 5. Breaking changes

A change is breaking when existing callers, configs, data or users must change something to keep working: removed or renamed public API, changed defaults, changed output format, dropped runtime support, a required new setting.

Mark it with either or both:

```
feat(api)!: remove v1 order endpoints

BREAKING CHANGE: /v1/orders is gone. Call /v2/orders, which returns
amounts in minor units instead of decimals.
```

- Prefer `!` plus a `BREAKING CHANGE:` footer that says **what breaks and what to do instead**. That footer text usually lands in the changelog verbatim.
- If you think a change is breaking but the user hasn't said so, **stop and ask** before marking it; it decides a major release.
- On a project still at `0.y.z`, a breaking change is still marked; the release tooling decides how to bump.

## 6. Write a body that explains why

The diff shows what changed. The body says:

1. Why the change was needed (the bug, the requirement, the constraint).
2. Why this approach, if it isn't obvious, and what was ruled out.
3. Side effects a reviewer would not guess (migration needed, cache to clear, behaviour change at the edges).

Skip the body only for changes whose reason is self-evident (`docs: fix typo in README`). Never restate the diff line by line, and never write "update file" or "misc fixes".

## 7. Footers

- Issue links: `Refs: #123`. On GitHub and GitLab, `Closes #123` or `Fixes #123` closes the issue when the commit reaches the default branch, so use those only when the commit really completes it.
- Co-authors: `Co-authored-by: Name <email>`.
- Reverts: `git revert --no-commit <sha>`, then commit as `revert: <original subject>` with the body line `This reverts commit <sha>.` and a `Refs: <sha>` footer. Plain `git revert` writes a `Revert "<subject>"` subject, which is not in the Conventional Commits format.

## 8. Check before committing

- If the project has commitlint, check the message: `echo "<message>" | npx commitlint`, or a range with `npx commitlint --from origin/main --to HEAD`.
- Commit without opening an editor: `git commit -F <message-file>` or `git commit -m "<subject>" -m "<body>" -m "<footer>"`.
- If a commit hook rejects the message, fix the message. Don't skip hooks with `--no-verify` unless the user asks.
- If the commit is already pushed to a shared branch, don't amend it; the squash-merge title or a follow-up commit is the place to fix it.

## Examples

```
fix(cart): reject negative quantities

The quantity input accepted values below zero, which produced negative
line totals and let users reduce an order's price. Validate on the
server as well as in the form, since the API is called directly by the
mobile app.

Fixes #482
```

```
perf(search): cache tokenised queries per request

Profiling showed tokenisation was 40% of search latency for repeated
filter queries. The cache lives only for the request, so there is no
invalidation to manage.
```

## Report back

Give the final message in a code block, the files it covers, and one line on why that type, scope and breaking flag were chosen. If you proposed a split, list each commit's message and files.
