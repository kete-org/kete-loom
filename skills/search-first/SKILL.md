---
name: search-first
description: Reuse-before-build check that runs before writing any new helper, utility, component or integration. Searches the current codebase for an existing function or pattern, then the project's installed dependencies and the standard library, then the package ecosystem, and weighs reuse, extend or build on fit, maintenance, licence, size and security before any code is written. Use when about to add a new function, module, wrapper or dependency, when the user asks "do we already have something for this" or "is there a library for X", or when a task smells like a solved problem (parsing, retries, dates, validation, caching).
license: MIT
compatibility: Any Agent Skills host. Ecosystem search needs network access and the project's package manager.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Search first

The cheapest code is code that already exists and is already tested. Spend a few minutes searching before writing anything new. Go outward in rings, and stop at the first ring that has a good fit.

## Ring 1: this codebase

1. Name the capability in a few ways: the verb and the noun ("retry", "backoff", "withRetry", "attempts"), domain words, and likely file names (`utils`, `helpers`, `lib`, `common`, `shared`).
2. Search the code for each term, and for call sites of similar behaviour (for example search for `setTimeout` near `catch` when looking for retries).
3. Check shared packages in a monorepo (`packages/`, `libs/`) and internal SDKs.
4. Look at how neighbouring features solved the same problem. A local convention beats a better-in-theory approach.

If you find something close: use it as is, or extend it in place (add a parameter, generalise carefully, add a test). Don't fork a near-copy.

## Ring 2: what's already installed

1. Read the dependency manifest (`package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `Gemfile`, `composer.json`, `*.csproj`, `pubspec.yaml`).
2. Check whether an installed library already does this (lodash, date libraries, validation libraries, HTTP clients with retry support, framework helpers).
3. Check the language's standard library and the platform: many "helpers" are one built-in call (`structuredClone`, `Intl.DateTimeFormat`, `AbortSignal.timeout`, Python `itertools` and `functools`, Go `slices` and `maps`).

## Ring 3: the ecosystem

Only when rings 1 and 2 have nothing:

1. Search the package registry for the language and the official docs of the framework in use.
2. Shortlist at most three candidates and check each against the table below. Use the registry page and the repository, not memory.

| Check | Look at | Red flag |
|---|---|---|
| Fit | README, API docs | Needs heavy wrapping to do your one job |
| Maintenance | Last release, open issues, response to issues | No release in years with open bugs, archived repo |
| Adoption | Download counts, dependents | Tiny usage for a critical path |
| Licence | Licence file | Incompatible with the project (ask if unsure) |
| Size and deps | Install size, transitive dependencies | Large tree for a small job |
| Security | Advisories (`npm audit`, `pip-audit`, `cargo audit`, GitHub advisories) | Unpatched advisories, typo-squat names |

## Decide

Pick one, and say why in one or two lines:

- **Reuse**: an existing internal or installed option fits. Best default.
- **Extend**: an internal one almost fits. Change it in place, with a test.
- **Adopt**: a new dependency is clearly worth it. **Ask the user before adding any dependency**, and respect project rules (some repos forbid new dependencies in some folders).
- **Build**: nothing fits, or the job is a few lines and a dependency would cost more than it saves. Write the minimum, following local conventions, with a test.

## Report

Before writing code, state:

```
Need: <capability>
Searched: <terms and places>, installed deps, stdlib, <registry if used>
Found: <path or package, or "nothing suitable">
Decision: reuse | extend | adopt | build, because <reason>
```

## Never

- Never add a dependency without the user's approval.
- Never copy-paste a near-duplicate of an existing helper.
- Never pick a package by name or popularity alone without checking its repository.
- Never let the search turn into a research project: for a few-line helper, a couple of minutes is enough.
