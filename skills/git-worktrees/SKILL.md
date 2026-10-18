---
name: git-worktrees
description: Sets up an isolated git worktree for a feature or an implementation plan - detects whether the session is already in one, picks the worktree folder by the project's convention, confirms a project-local folder is git-ignored, creates the branch and worktree, installs dependencies from the lockfile, runs a baseline test pass so pre-existing failures are known, and later removes and prunes it. Use when starting work that should not disturb the current checkout, running several branches side by side, or handing a plan to an agent that needs its own workspace.
license: MIT
compatibility: Any Agent Skills host. Needs git 2.31+ (rev-parse --path-format) and the project's package manager and test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Git worktrees

A worktree is a second working directory attached to the same repository, on its own branch. It lets new work proceed without touching the user's current checkout, uncommitted files or running dev server.

For branching strategy, rebasing and conflicts use `git-workflow`. To wrap up the branch afterwards use `finishing-a-branch`.

## 1. Check whether you are already isolated

```
git rev-parse --path-format=absolute --git-dir
git rev-parse --path-format=absolute --git-common-dir
git rev-parse --show-superproject-working-tree
git branch --show-current
```

- If the two directories differ and the third command prints nothing, you are already in a linked worktree. Do not nest another. Report the path and branch and go to step 5.
- If the third command prints a path, you are in a submodule, not a worktree; treat it as a normal checkout.
- Some hosts create a worktree for the session themselves (a built-in worktree tool or launch option). If one is available and the user wants isolation, use it instead of `git worktree add`, so the host can track and clean it up. Then go to step 5.

If the user has not asked for isolation and no instruction file says to use worktrees, ask once: "Set up a separate worktree so your current checkout stays untouched?" If they decline, work in place.

## 2. Choose the location

Use the first that applies:

1. A location the user or an instruction file (`AGENTS.md`, `CLAUDE.md`, contributing guide) names.
2. An existing project-local folder: `.worktrees/`, then `worktrees/`. If both exist, use `.worktrees/`.
3. Otherwise **ask the user**: project-local `.worktrees/` (hidden, needs a `.gitignore` entry) or a global folder such as `~/worktrees/<repo>/` (nothing to ignore). Remember their answer for the session.

## 3. Make sure a project-local folder is ignored

For any folder inside the repository:

```
git check-ignore -q .worktrees/ && echo ignored || echo NOT ignored
```

Keep the trailing slash: a directory-only pattern such as `/.worktrees/` does not match the bare name while the folder does not exist yet, so `git check-ignore .worktrees` reports it as not ignored.

If it is not ignored, stop and tell the user. Offer to add `/.worktrees/` to `.gitignore` and commit that one-line change on the current branch. Never create the worktree first: an unignored folder shows every file of the new worktree as untracked in the main checkout and can be committed by accident.

A global folder outside the repository needs no ignore entry.

## 4. Create the branch and worktree

1. Pick a branch name following the repo's convention (look at `git branch -r`; for example `feat/<slug>` or `<user>/<slug>`). Ask if there is no visible convention.
2. Pick the base: the branch the user named, else the default branch (`git symbolic-ref --short refs/remotes/origin/HEAD` prints it as `origin/main`; use the part after `origin/` as `<base>`; if that fails, run `git remote set-head origin --auto` or ask). Fetch it first: `git fetch origin`.
3. Create:

```
git worktree add --no-track -b <branch> <location>/<slug> origin/<base>
```

`--no-track` stops the new branch from taking `origin/<base>` as its upstream, so a later plain `git pull` or `git push` can't target the base by mistake. The first `git push -u origin <branch>` sets the right upstream.

- If the branch already exists, drop `-b`: `git worktree add <location>/<slug> <branch>`. Git refuses if that branch is checked out in another worktree; report that rather than forcing it.
- If creation fails because of a sandbox or permission error, tell the user and work in the current directory instead.

Run every later command from inside the new worktree directory.

## 5. Set up the project

Worktrees share history but not ignored files: `node_modules`, virtual environments, build output and `.env` files are absent.

Install by lockfile, using the project's documented command when there is one:

| Lockfile | Command |
|---|---|
| `package-lock.json` | `npm ci` |
| `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| `yarn.lock` | `yarn install --immutable` (Yarn 2+) or `yarn install --frozen-lockfile` (Yarn 1) |
| `bun.lock` / `bun.lockb` | `bun install --frozen-lockfile` |
| `uv.lock` | `uv sync` |
| `poetry.lock` | `poetry install` |
| `requirements.txt` only | create a virtual environment, then `pip install -r requirements.txt` |
| `Cargo.lock` | `cargo build` |
| `go.sum` | `go mod download` |
| `Gemfile.lock` | `bundle install` |

If the project needs local secrets or config (`.env`, `.env.local`), **ask the user** before copying them from the main checkout. Never invent values.

## 6. Run a baseline

Run the project's test command once, before any change. Record pass and fail counts.

- All green: report ready.
- Failures: list them and **stop and ask** whether to continue. They are pre-existing, and knowing that now keeps them from being blamed on the new work.

## 7. Report

```
Worktree: <absolute path>
Branch: <branch> from <base> (<short sha>)
Setup: <install command> -> ok | failed
Baseline: <test command> -> <passed>/<total>, failing: <names or none>
```

## 8. Clean up when the work is done

Only after the branch is merged, or the user chose to discard it (see `finishing-a-branch`), and from outside the worktree (the main checkout):

```
git worktree list
git worktree remove <path>
git worktree prune
```

- If `git worktree remove` refuses because of modified or untracked files, show them (`git -C <path> status --short`) and ask the user whether to commit, move or discard them. Never add `--force` on your own.
- Only remove worktrees you created in this session or in the agreed folder. Leave other worktrees and host-managed ones alone.
- Deleting the branch is a separate decision; `git branch -d <branch>` refuses unmerged work, which is the point.

## Never

- Create a worktree inside an unignored project folder.
- Check out the same branch in two worktrees, or use `--force` to make git allow it.
- Delete a worktree folder by hand; use `git worktree remove`, then `prune` for stale entries.
- Start changing code before the baseline run is recorded.
