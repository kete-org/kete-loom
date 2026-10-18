---
name: build-fix
description: Fix the current build, compile or type-check failure with the smallest change, routed to the build resolver for that language.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[failing command or error output]"
  kete-loom/owner: "Kete-org"
---

Get the build passing again with minimal, targeted edits.

1. Find the failing command. Use the one the user gave below; otherwise take the build or type-check command from the project's CI workflow, package scripts, Makefile or task runner, run it, and capture the first error.
2. Identify the language from the failing tool (for example `tsc`, `go build`, `cargo`, `mvn`/`gradle`, `dotnet`, `cmake`/`make`, `swift build`, `dart analyze`/`flutter build`, `composer`, `bundle`, `pip`/`mypy`).
3. Delegate to the matching Kete Loom agent if it is available: `typescript-build-resolver`, `python-build-resolver`, `go-build-resolver`, `rust-build-resolver`, `java-build-resolver`, `kotlin-build-resolver`, `csharp-build-resolver`, `fsharp-build-resolver`, `cpp-build-resolver`, `swift-build-resolver`, `dart-build-resolver`, `php-build-resolver`, `ruby-build-resolver`, `perl-build-resolver`. Pass it the exact command and error output.
4. If no resolver is available, fix it yourself:
   - Fix the root cause of the first error, then re-run; later errors are often follow-ons.
   - Change only what the error requires. No refactors, no dependency upgrades, no new dependencies.
   - Never silence the error instead of fixing it: no `any` casts, `@ts-ignore`, `# type: ignore`, `#[allow]`, `@SuppressWarnings` or deleted tests unless the user agrees.
   - Stop and ask the user if the fix needs a dependency change, a config change shared by the team, or a choice between two plausible behaviours.
5. Re-run the failing command until it passes, then run the tests once to check nothing else broke.
6. Report: the command, the root cause in one line, the files changed, and the final pass/fail output.

Failing command or error from the user, if any: $ARGUMENTS
