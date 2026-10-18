---
name: code-tour
description: Authors a step-by-step guided walkthrough of a codebase or a single feature as an ordered list of stops, each pinned to a file:line reference with a short explanation of what that code does and why it matters, written so a new contributor can follow it in one sitting. Use when asked to create a code walkthrough, a feature tour, a "follow the request" guide, or contributor-facing reading order for part of a project.
license: MIT
compatibility: Any Agent Skills host. Needs git to pin the tour to a commit.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: writes-files
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Code tour

A code tour is a reading order. It takes a newcomer through the code that matters, one stop at a time, so they understand a feature without reading the whole repo. A good tour has 6 to 15 stops, follows the path execution takes, and every stop points at real code.

## 1. Agree the scope

Before writing, settle with the user:

- **Subject:** the whole codebase at high level, or one feature or flow (for example "how a login request is handled").
- **Reader:** new contributor, reviewer, new team member, or future maintainer. This sets how much background each stop needs.
- **Where it lives:** a Markdown file in the repo (default `docs/tours/<topic>.md`), or reply only.

If the subject is "everything" for a large repo, propose splitting into one overview tour plus one tour per major flow, and ask which to write first.

## 2. Find the path

1. Locate the entry point for the subject: a route, command handler, event consumer, UI action or public function.
2. Follow the call chain by reading code and searching for callers and definitions. Don't trust names; open each function.
3. Note each place a reader must understand: where input arrives, where it's validated, where the core decision is made, where state changes, where it leaves the system, and where errors are handled.
4. Find the test that exercises this path. It makes a good last stop.

Drop stops that are pure plumbing (re-exports, trivial wrappers) unless skipping them would confuse the reader.

## 3. Pin it to a commit

Line numbers drift. Record the current commit with `git rev-parse --short HEAD` and put it in the tour header. If `git status --porcelain -- <cited paths>` shows uncommitted changes in files the tour cites, tell the user the references may move once they commit.

## 4. Write the stops

Each stop has:

- a numbered title that says what happens, not the file name ("3. Validate the payload", not "3. validators.ts");
- a `path:line` or `path:start-end` reference, relative to the repo root;
- 2 to 5 sentences: what this code does, why it's here, and what to notice;
- optionally, a short excerpt (at most 10 lines) when the point is a specific construct.

Rules for stops:

- Order follows execution or data flow, not the directory tree.
- Each stop should connect to the next ("the validated payload is handed to...").
- Explain intent and non-obvious decisions. Don't narrate code line by line.
- Flag gotchas the reader would otherwise hit: hidden side effects, global state, ordering requirements, surprising config.
- Keep ranges tight. A stop pointing at a 300-line file teaches nothing.

## 5. Use this format

```markdown
# Tour: <subject>

> Commit `<sha>` · Reader: <audience> · About <N> minutes

**You'll learn:** <one or two sentences>
**Before you start:** <prerequisites, such as how to run the app or which concepts to know>

## 1. <What happens here>
`path/to/file.ext:12-30`

<2 to 5 sentences.>

## 2. <Next step>
`path/to/other.ext:44`

<...>

## Where to go next
- <related tour, doc, or the test to run: `<command>`>
```

## 6. Verify before you hand it over

1. Open every cited range and confirm it still shows what the stop describes. Fix or drop any that don't.
2. Confirm every path exists, using the exact case.
3. Read the tour top to bottom as the target reader. If a stop uses a term no earlier stop or prerequisite introduced, add a sentence or a link.
4. If the tour includes a command, run it, or mark it as not run.

## Never

- Invent a file, function or line number. If you couldn't find something, say so in the tour.
- Edit source code to make the tour easier to write.
- Overwrite an existing tour without asking; offer an updated version alongside it.

## Report back

Return the tour (or its path), the commit it is pinned to, the number of stops, and any references you could not verify. For getting yourself oriented rather than writing for others, use `codebase-onboarding`; for README or API docs, use `technical-writing`.
