---
name: change-impact-analysis
description: Blast-radius analysis for a code change, built from the real dependency graph rather than guesswork, using import search, the build graph and monorepo tooling (nx affected, turbo --affected, bazel query rdeps, go list, pnpm filters, Maven -amd, Gradle buildDependents) to find downstream consumers, then running the tests of changed modules and every dependent, and reconciling the predicted impact against the actual diff. Use when asked what a change could break, which packages or services consume a module, which tests must run for a diff, or whether a shared library edit is safe to merge.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's own build or test tooling; monorepo commands apply only where that tool is already in use.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Change impact analysis

Answer "what can this change break?" with evidence: a list of consumers found from the dependency graph, the tests that cover them, and the results of running those tests. Never answer from intuition alone.

## When to run it

- **Before** a change: predict impact so the plan and the review cover every consumer.
- **After** a diff exists: compute actual impact, run the affected tests, compare with the prediction.
- Both, for shared libraries, public APIs, database schemas, config keys and anything published.

## 1. Pin down the change

1. Get the changed files: `git diff --name-only <base>...HEAD` (base is usually `origin/main`; use the merge base, not the tip). Include untracked files from `git status --short`.
2. For each file, list the changed **symbols**: exported functions, classes, types, routes, events, CLI flags, env vars, config keys, DB columns, message schemas. A file-level graph over-reports; symbols tell you which consumers really care.
3. Classify each symbol change: internal only, signature change, behaviour change with the same signature, removal, or new addition. Additions rarely break consumers; behaviour changes are the ones people miss.

## 2. Build the consumer graph from the tooling the repo already has

Detect the build system first (look for `nx.json`, `turbo.json`, `WORKSPACE`/`MODULE.bazel`, `go.mod`, `pnpm-workspace.yaml`, `pom.xml`, `settings.gradle(.kts)`, `Cargo.toml` workspaces). Use the tool's own graph; it knows about generated code and path aliases that grep misses. Commands are in `references/graph-commands.md`.

- **Monorepo tool present**: ask it for affected projects between base and head (for example `nx show projects --affected -t test --base=origin/main`, `turbo run test --affected`, `bazel query "rdeps(//..., //pkg:target)"`).
- **No graph tool**: search the codebase for imports of the changed module and for each changed symbol name, then repeat one level up for every hit until no new consumers appear. Note this is a search result, not a graph.
- **Outside the code graph** (tools can't see these, search for them by name):
  - string-keyed references: route paths, event or queue names, feature-flag keys, env vars, config keys, SQL column names, reflection and dependency-injection names;
  - other repositories, deployed services, mobile apps on old versions, and third parties that call a public API;
  - generated clients, fixtures, snapshots, docs and examples that embed the old shape;
  - CI, deploy and infrastructure files that reference changed paths.

## 3. Rate the blast radius

For each consumer record: name, how it depends (import, HTTP, event, schema, config), what it uses, and risk:

| Risk | Meaning |
|---|---|
| High | Uses a removed or changed signature or behaviour; deployed separately; no tests cover the usage |
| Medium | Uses the changed symbol, tests exist and will run |
| Low | Depends on the package but not on the changed symbols |

**Stop and ask the user** when a High consumer is outside this repository, when the change touches a published package, public API, database schema or message format, or when the graph says more than about 20 projects are affected (confirm the change should be split or staged).

## 4. Run the affected tests

1. Run the tests of the changed modules first, then every downstream consumer. Use the tool's affected mode (`nx affected -t test`, `turbo run test --affected`, `bazel test` on the rdeps test set, `go test` on the reverse-dependency packages, `mvn -pl <module> -amd verify`, `./gradlew :<module>:buildDependents`).
2. Inside a single package, narrow with the runner's related-test mode where it exists (`jest --findRelatedTests <files>`, `vitest related <files> --run`, `pytest --testmon` if pytest-testmon is installed), and still run the full package suite before calling it safe.
3. Include type-checks and builds of consumers; a signature change often breaks compilation, not tests.
4. If a consumer has **no** test touching the changed symbol, list it as a coverage gap. Do not report it as safe.
5. Shallow CI clones make affected detection treat everything as changed or nothing as changed; fetch enough history for the base.

## 5. Reconcile planned vs actual

After the diff is final, rerun step 1 and step 2 and compare with the prediction:

- Files or symbols changed that the plan didn't mention: explain each or flag it as scope creep.
- Consumers predicted but not actually affected: fine, note them.
- Consumers affected but not predicted: these are the important ones; run their tests and add them to the review.

## Never

- Never declare a change safe because one package's tests pass.
- Never skip consumers outside the build graph because the tool didn't list them.
- Never edit consumers to make the analysis pass without telling the user; that's a new change.

## Report

```
## Impact: <change>
Base: <ref>  Head: <ref>
Changed symbols: <symbol> (<kind of change>) ...
Consumers
- <name> | via <import/http/event/schema/config> | uses <symbol> | risk High/Med/Low | tests: <ran: pass/fail | none>
Outside the graph: <string-keyed refs, other repos, external callers, or "none found">
Commands run: <command> -> <result>
Coverage gaps: <consumer: what is untested>
Planned vs actual: <unplanned changes, unpredicted consumers, or "matches">
Verdict: safe to merge | merge after <action> | needs staged rollout or split
```
