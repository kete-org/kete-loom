# Dependency audit: tool reference

Read this when you need the exact command for an ecosystem. Flags change between releases: if a command fails, check `<tool> --help` and the tool's docs before guessing.

## Vulnerability scanners

### npm

```
npm audit                          # all dependencies
npm audit --omit=dev               # production dependencies only
npm audit --audit-level=high       # exit non-zero only at high or critical (does not filter the report)
npm audit --json                   # machine-readable
npm audit signatures               # verify registry signatures and provenance attestations of installed packages
npm audit fix                      # semver-compatible fixes only
npm ls <package>                   # who pulls in a transitive dependency
```

`npm audit fix --force` can install breaking majors. Ask first.

### pnpm and Yarn

```
pnpm audit [--prod] [--audit-level high]
pnpm audit --ignore <GHSA-ID>             # documented exception, saved to pnpm-workspace.yaml
pnpm why <package>
yarn npm audit [--all] [--recursive]      # Yarn Berry (2+)
yarn why <package>
```

### Python

```
pip-audit                          # current environment
pip-audit -r requirements.txt      # a requirements file
pip-audit --ignore-vuln <ID>       # documented exception
```

For uv projects, export the lock first if needed (`uv export --format requirements-txt > /tmp/req.txt`) and run `pip-audit -r` on it.

Hash-checked installs: `pip install --require-hashes -r requirements.txt` (generate hashes with `pip-compile --generate-hashes` or `uv pip compile --generate-hashes`).

### Rust

```
cargo install cargo-audit --locked     # once
cargo audit                            # RustSec advisory DB against Cargo.lock
cargo tree -i <crate>                  # who depends on a crate
```

Ignores go in `.cargo/audit.toml` under `[advisories] ignore = ["RUSTSEC-..."]`. `cargo deny check` (cargo-deny) adds licence, banned-crate and duplicate checks.

### Go

```
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...                  # reports only vulnerabilities your code can reach
go mod why -m <module>
```

### Others

| Ecosystem | Command |
|---|---|
| Ruby | `bundle audit check --update` (bundler-audit) |
| PHP | `composer audit` |
| .NET | `dotnet list package --vulnerable --include-transitive` |
| Java/Kotlin | OWASP Dependency-Check, or `osv-scanner` on the Gradle/Maven lockfile |
| Containers | `trivy image <image>` or `grype <image>` |

### osv-scanner (multi-ecosystem)

```
osv-scanner scan -r .                  # every lockfile under the directory
osv-scanner scan -L package-lock.json  # one lockfile
```

## Strict installs in CI

| Tool | Command |
|---|---|
| npm | `npm ci` |
| pnpm | `pnpm install --frozen-lockfile` |
| Yarn Berry | `yarn install --immutable` |
| uv | `uv sync --locked` |
| Poetry | `poetry install` with the lock committed; `poetry check --lock` |
| Cargo | `cargo build --locked` |
| Go | `go mod verify` (checks downloaded modules against go.sum) |

## Install scripts

- npm: `ignore-scripts=true` in `.npmrc`, or `npm ci --ignore-scripts`. Scripts you run by name (`npm test`, `npm run build`) still run; their pre/post hooks do not.
- pnpm 10+: dependency lifecycle scripts do not run unless allowed. Older 10.x releases use `pnpm.onlyBuiltDependencies`; newer releases document `allowBuilds` in `pnpm-workspace.yaml`. `pnpm approve-builds` and `pnpm ignored-builds` manage the list. Check the docs for the installed version.
- Python: source distributions run build code at install. Prefer wheels (`pip install --only-binary :all:` where feasible) for untrusted packages.

## Release-age cooldown

Delays picking up versions published in the last few days. Units differ; check the docs for your installed version before relying on these:

| Tool | Setting | Unit |
|---|---|---|
| npm | `min-release-age` in `.npmrc` | days |
| pnpm | `minimumReleaseAge` | minutes |
| uv | `exclude-newer` (absolute timestamp; recent releases accept durations) | timestamp or duration |

Automated update tools have their own equivalent (Renovate `minimumReleaseAge`, Dependabot `cooldown` with `default-days`). Dependabot's cooldown applies to version updates, not security updates.

## SBOM

```
npm sbom --sbom-format cyclonedx > sbom.cdx.json   # from package-lock.json
npm sbom --sbom-format spdx > sbom.spdx.json
pnpm sbom --sbom-format cyclonedx                  # pnpm 11+
syft . -o cyclonedx-json > sbom.cdx.json           # a directory; or syft <image>
cargo cyclonedx                                    # after: cargo install cargo-cyclonedx
```

Generate the SBOM from the exact lockfile or image that ships, attach it to the release, and scan it later (for example `grype sbom:sbom.cdx.json`) when new advisories appear.

## Pinning CI and images

- GitHub Actions: `uses: actions/checkout@<full 40-char commit SHA> # vX.Y.Z`.
- Containers: `FROM node:22-slim@sha256:<digest>`.
- Tools installed with `curl | sh` in CI: pin a version and verify a checksum.
