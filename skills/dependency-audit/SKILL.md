---
name: dependency-audit
description: Software supply-chain audit of a project's third-party packages across npm, pnpm, Yarn, pip/uv, Cargo, Go modules and similar ecosystems. Runs the ecosystem's vulnerability scanner, checks that lockfiles exist and are enforced in CI, vets new or suspicious packages for typosquatting, install scripts and abandoned maintainers, and sets a pinning, update-cadence and SBOM policy. Use when a scanner or Dependabot reports a vulnerable package, before adding a new library, when asked whether the project's dependencies are safe, or when setting up dependency hygiene and an SBOM for a release.
license: MIT
compatibility: Any Agent Skills host. Needs the project's package manager; audit tools such as pip-audit, cargo-audit, govulncheck or osv-scanner are used when installed. Advisory lookups need network access.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Dependency audit

Find the third-party code that can hurt this project, and leave behind a policy that keeps it from creeping back. Report first; change manifests or lockfiles only when the user asks.

## 1. Inventory

1. Find every manifest and lockfile: `package.json` + `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`, `pyproject.toml` + `uv.lock` / `poetry.lock` / `requirements*.txt`, `Cargo.toml` + `Cargo.lock`, `go.mod` + `go.sum`, `Gemfile.lock`, `composer.lock`, `*.csproj` / `packages.lock.json`, Dockerfiles and CI files that install tools.
2. Flag any manifest with **no lockfile**, or a lockfile not committed. An application without a committed lockfile is a finding on its own.
3. Note which package manager CI uses and whether it installs from the lockfile strictly (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `uv sync --locked`, `cargo build --locked`, `pip install --require-hashes -r requirements.txt`).

## 2. Scan for known vulnerabilities

Run the scanner for each ecosystem present. Exact commands and flags are in `references/tools.md`; the defaults:

| Ecosystem | Command |
|---|---|
| npm | `npm audit --omit=dev` (then without `--omit` for dev tooling) |
| pnpm / Yarn | `pnpm audit`, `yarn npm audit` (Yarn Berry) |
| Python | `pip-audit -r requirements.txt` or `pip-audit` in the project env |
| Rust | `cargo audit` |
| Go | `govulncheck ./...` |
| Any (lockfile based) | `osv-scanner scan -r .` |

If a tool is not installed, say so and suggest the install command; **ask before installing** anything globally.

For each advisory, decide reachability before ranking it:

- Is the package in production code, or only dev/build/test tooling?
- Is the vulnerable function or code path used? `govulncheck` reports this for Go; elsewhere, search the codebase for the affected API.
- Is it exposed to untrusted input (HTTP bodies, uploads, user-supplied URLs, parsers)?

A critical CVE in a test-only dependency is lower priority than a moderate one in the request parser.

## 3. Vet risky packages

Do this for packages added in the change under review, and for any package the scan or the user flags.

1. **Typosquatting**: compare the name against the well-known package it resembles (`reqeusts` vs `requests`, `lodahs` vs `lodash`, scope swaps like `@type/node`). Check the registry page: download count, repository link, first publish date, maintainer.
2. **Install scripts**: look for `preinstall`, `install`, `postinstall` in the package's `package.json`, or `setup.py` / build backends that run code at install. Network calls, obfuscated code, or reading env vars in an install script is a **stop and tell the user** finding.
3. **Health**: last release, open security issues, single maintainer, archived repository, recent maintainer change followed by a new major or patch with unexplained binary or minified code.
4. **Necessity**: can a few lines of standard library replace it? Fewer dependencies is the best mitigation.

Never install, import or run a suspect package to "see what it does".

## 4. Fix

Prefer the smallest safe change, in this order:

1. Bump to the lowest patched version within the same major (`npm audit fix` without `--force`; `cargo update -p <crate>`; `go get <module>@<version>` then `go mod tidy`).
2. If the vulnerable package is transitive, update the direct parent first. Use an override (`overrides` in npm, `pnpm.overrides`, `resolutions` in Yarn, `[tool.uv] override-dependencies`) only when the parent has no fixed release, and leave a comment with the advisory ID and a date to remove it.
3. A major-version bump, a replacement library, or `npm audit fix --force` changes behaviour: **stop and ask** before doing it.
4. If no fix exists, document the advisory, why it is or is not reachable, and the compensating control. Record ignores in the tool's own config (for example `audit.toml` for cargo-audit, `--ignore-vuln` for pip-audit) with a reason and expiry, never by deleting the check.

After any change, run the project's install from the lockfile, the build and the tests, then re-run the scanner to show the advisory is gone.

## 5. Policy to leave behind

Recommend what is missing, briefly:

- **Pinning**: applications commit lockfiles and install strictly in CI. Libraries keep compatible ranges in the manifest but still commit a lockfile for their own CI. Pin CI actions and container base images by digest or full commit SHA, not a moving tag.
- **Install scripts**: disable by default where the tool supports it (`npm ci --ignore-scripts`; pnpm 10+ only runs build scripts for packages you allow) and allow-list the packages that need them.
- **Release-age cooldown**: if the package manager supports a minimum release age, set a few days so a freshly hijacked release is not picked up at once (see `references/tools.md`).
- **Updates**: automated update PRs (Dependabot or Renovate) grouped weekly for patch/minor, security updates immediately, majors reviewed by hand. Every update PR runs the full test suite.
- **Gate**: the scanner runs in CI and fails on high or critical in production dependencies (`npm audit --omit=dev --audit-level=high`).
- **SBOM**: generate one per release in CycloneDX or SPDX (`npm sbom --sbom-format cyclonedx`, `syft <dir-or-image> -o cyclonedx-json`, `cargo cyclonedx`) and store it with the release artifacts. Details in `references/tools.md`.
- **Registry**: for private scoped packages, map the scope to the private registry explicitly so a public package with the same name cannot be resolved (dependency confusion).

## Never

- Never run `npm audit fix --force`, delete a lockfile, or bump a major without asking.
- Never silence an advisory without a recorded reason.
- Never paste registry tokens or `.npmrc` / `pip.conf` credentials into output.
- Never call a project "safe": state which ecosystems and lockfiles were scanned and when.

## Report format

```
## Dependency audit: <project> (<date>)
Scanned: <ecosystems, lockfiles, tools and versions>   Not scanned: <what and why>

### Findings
1. [critical|high|medium|low] <package>@<version> (<direct|transitive via X>, <prod|dev>)
   Advisory: <ID> <one line>   Reachable: <yes/no/unknown + evidence>
   Fix: <exact version or action>   Breaking: <yes/no>

### Supply-chain risks
- <typosquat / install script / unmaintained / no lockfile / unpinned CI action>

### Policy gaps
- <missing item from section 5, one line each>
```
