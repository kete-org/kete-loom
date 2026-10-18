---
name: deps-audit
description: Audit the project's dependencies for known vulnerabilities, abandoned or risky packages and licence problems, and report fixes by severity.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[manifest path or package name]"
  kete-loom/owner: "Kete-org"
---

Audit this project's dependencies. Report only; do not upgrade, install or remove anything unless the user asks after seeing the report.

If the `dependency-audit` skill is available, follow its inventory, scan and vetting steps, but stop at the report: skip its fix steps unless the user asks. Otherwise:

1. Find the manifests and lockfiles (`package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `requirements*.txt`, `poetry.lock`, `uv.lock`, `go.mod`, `Cargo.lock`, `Gemfile.lock`, `composer.lock`, `pom.xml`, `build.gradle*`). If there is no lockfile, say that versions are not pinned.
2. Run the ecosystem's audit tool if installed: `npm audit --json`, `pnpm audit`, `yarn audit` (Yarn 1) or `yarn npm audit` (Yarn 2+), `pip-audit -r requirements.txt` (plain `pip-audit` scans the active environment, not the project), `govulncheck ./...`, `cargo audit`, `bundle-audit check --update`, `composer audit`. For Maven, Gradle or anything else, use `osv-scanner scan source -r .` if installed. These tools query online advisory databases. If a tool is missing, say so and do not install it without asking.
3. For each finding, check whether the vulnerable code path is reachable from this project (direct vs transitive, dev-only vs runtime). `govulncheck` already reports reachability; for the others, search the codebase for imports of the affected module before marking it reachable.
4. Flag risky packages too: unmaintained (no release in years, archived repo), typosquat-like names, install scripts, and licences that conflict with the project's.
5. Report:

```
## Dependency audit: <scope>
- [critical|high|medium|low] <package>@<version> (direct|transitive, runtime|dev): <advisory id>. Reachable: yes|no|unknown. Fix: upgrade to <version> | replace | accept with reason.
Risky packages: ...
Tools run: <command: result> | not run: <reason>
```

Do not report advisories you did not get from a tool or an advisory database; never invent CVE ids.

Scope, if any: $ARGUMENTS
