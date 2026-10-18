---
name: codebase-onboarding
description: Gets you productive in an unfamiliar repository fast by locating its entry points, building and running it locally, mapping modules and the main data flow, reading the tests as a specification, and ending with a one-page orientation note. Use when someone has just cloned or inherited a project, asks "how does this codebase work", "where do I start", or needs to understand a repo before changing it.
license: MIT
compatibility: Any Agent Skills host. Needs git and whatever build tool the project uses.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Codebase onboarding

Turn an unknown repository into a mental map you can act on. The goal is not to read everything: it is to find the few files that matter, prove you can build and run the thing, and write down what you learned so the next person starts faster.

Work read-first. Do not edit tracked files during onboarding. The only files you may create are git-ignored local config copies (step 2) and the orientation note, and the note only where the user agrees.

## 1. Get the lay of the land (5 minutes)

1. List the top level of the repo and read, in this order, whichever exist: `README*`, `CONTRIBUTING*`, `AGENTS.md`, `CLAUDE.md`, `docs/` index, `ARCHITECTURE*`.
2. Identify the stack from manifests: `package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle*`, `*.csproj`, `Gemfile`, `composer.json`, `pubspec.yaml`, `Package.swift`, `CMakeLists.txt`, `Makefile`.
3. Note the scripts or tasks they define (for example `scripts` in `package.json`, targets in a `Makefile`, `[project.scripts]` in `pyproject.toml`). These are the project's own answer to "how do I build, test and run this".
4. Check recent history: `git log --oneline -20` and `git shortlog -sn --since="6 months ago"` show what is active and who knows it.
5. Check CI config (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`). CI is the most reliable record of the real build and test commands.

If it is a monorepo (workspaces, `packages/`, `apps/`, `services/`), ask the user which package they care about before going further. Onboarding to everything at once produces nothing useful.

## 2. Build and run it

1. Install dependencies with the command the README or CI uses. Prefer the lockfile-respecting form (`npm ci`, `pip install -r`, `go mod download`, `bundle install`).
2. Run the test suite once. Record the command, pass/fail counts and duration.
3. Start the app, CLI or service the way the README says, and hit one real path (a request, a command, a page).
4. Copy environment templates (`.env.example`, `config/*.sample`) only into files that `git check-ignore <path>` confirms are ignored, and never overwrite an existing `.env`.

Stop and ask the user when:

- setup needs credentials, a paid service, production data or access you don't have;
- a step would install system-wide packages, change global config or run a database migration against anything but a local database;
- the build fails and the fix is not obvious after one attempt. Report the exact error instead of guessing.

Never run deploy, publish, release or data-deleting scripts while onboarding, even if they sit next to the build scripts.

## 3. Find the entry points

Search for where execution starts. Typical signs:

| Kind | Look for |
|---|---|
| Web server | route or controller registration, `listen(`, app factory, framework config |
| CLI | `bin` field in `package.json`, `[project.scripts]`, `main` packages, argument parsers |
| Library | the package's public export file (`index.*`, `__init__.py`, `lib.rs`, `mod.rs`) |
| Workers and jobs | queue consumers, cron or scheduler definitions, serverless handlers |
| Frontend | the root component, router definition, HTML entry |

List at most five entry points with `path:line`. If you find more, group them.

## 4. Map modules and data flow

1. Sketch the module layout from directory names, then confirm by reading one file in each major directory. Directory names lie; imports don't.
2. Pick one representative request or command and trace it end to end: entry point, validation, business logic, persistence or external call, response. Write each hop as `path:line — what happens`.
3. Note where state lives: databases (look for migrations and schema files), caches, queues, files, third-party APIs.
4. Note the cross-cutting pieces: config loading, logging, auth, error handling, dependency injection.

## 5. Read the tests as a spec

- Find the test layout and the fixtures or factories.
- Read the tests for the flow you traced. They show intended behaviour and edge cases the code alone hides.
- Note what has no tests. That is where changes are risky.

## 6. Write the orientation note

Ask the user where it should go (reply only, a scratch file, or `docs/ONBOARDING.md`). Do not overwrite an existing onboarding doc; propose additions instead. Keep it to one page, in this format:

```markdown
# <project> orientation

**What it is:** <one sentence>
**Stack:** <languages, frameworks, datastores>

## Run it
- Install: `<command>`
- Test: `<command>` (<N> passed, <duration>)
- Start: `<command>`, then <how to see it working>

## Entry points
- `path:line` — <what starts here>

## How a request flows
1. `path:line` — <step>

## Where things live
- <directory> — <responsibility>

## Gotchas
- <surprising thing, flaky test, required env var>

## Open questions
- <things you could not confirm>
```

## Rules

- Every claim in the note points to a file or a command output. If you inferred it, say "probably".
- Don't summarise files you didn't open.
- Don't paste secrets from `.env` or config into the note or the reply.
- Keep it short. A note nobody reads is worse than none.

## Report back

Return the orientation note (or its path), the commands you ran with their results, and the open questions the user should take to a maintainer. For a walkthrough meant for other contributors, hand off to the `code-tour` skill; for polished project docs, to `technical-writing`.
