# Scanners: install, flags and Docker alternative

Pinned versions match `scripts/check-tools.js`; bump both together. Install at user level only: `brew`, `pipx`/`uvx`, `go install`, `scoop`/`winget`, or a release binary in `~/.local/bin` (on PATH). Never `sudo`, never `curl | sh`. Always ask the user first.

`run-scanners.js` already passes the flags below. They are listed here so that you can run one tool by hand or debug it.

## Verifying a release binary

When a project publishes checksums, download the archive and `checksums.txt` (or `.sha256`) from the **same tag**, then:

```
sha256sum -c --ignore-missing checksums.txt          # Linux
shasum -a 256 -c --ignore-missing checksums.txt      # macOS
(Get-FileHash .\tool.zip -Algorithm SHA256).Hash     # Windows: compare by hand
```

Opengrep signs each binary with Sigstore (`.sig` and `.cert` next to it):

```
cosign verify-blob --certificate opengrep_osx_arm64.cert --signature opengrep_osx_arm64.sig \
  --certificate-identity-regexp 'https://github.com/opengrep/opengrep/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com opengrep_osx_arm64
```

If the check fails, delete the binary and tell the user.

## Opengrep 1.32.0 (SAST, primary)

Open-source fork of Semgrep with the same rule syntax. LGPL-2.1.

- macOS / Linux: release binary from `https://github.com/opengrep/opengrep/releases/tag/v1.32.0` (`opengrep_osx_arm64`, `opengrep_osx_x86`, `opengrep_manylinux_x86`, `opengrep_manylinux_aarch64`, `opengrep_musllinux_*`), verified with cosign as above, `chmod +x`, into `~/.local/bin/opengrep`.
- Windows: `opengrep_windows_x86.exe` from the same release.
- Flags: `opengrep scan --config <rules-dir> --sarif-output <file> --timeout 30 --quiet <repo>`

**Pinned rule set.** Clone the rules once, at a fixed commit, outside the repository being scanned:

```
git clone https://github.com/opengrep/opengrep-rules ~/.cache/kete-loom/opengrep-rules
git -C ~/.cache/kete-loom/opengrep-rules checkout <commit-sha>
```

Pass a language folder that matches the stack (`--rules ~/.cache/kete-loom/opengrep-rules/javascript`, `.../python`, `.../go`), and run once per language. **Do not pass the clone's root**: it holds non-rule YAML (`template.yaml`, `stats/`, `scripts/`), so the whole config is rejected and zero rules load. `run-scanners.js` marks that as `failed: no rules loaded`. Record the commit in the report. Do not use `--config auto` or registry packs: they fetch rules over the network and change between runs.

## Semgrep CE 1.182.0 (SAST, fallback)

- All OSes: `pipx install semgrep==1.182.0` (or `uvx semgrep@1.182.0`); macOS also `brew install semgrep` (not pinnable).
- Flags: `semgrep scan --config <rules-dir> --sarif --output <file> --metrics off --timeout 30 --quiet <repo>`
- Uses the same pinned rule clone as Opengrep. `--metrics off` stops usage reporting.

## ESLint + eslint-plugin-security (JS/TS)

Only when the project already lists both `eslint` and `eslint-plugin-security` and has `node_modules` installed. The scan runs the project's own ESLint with the project's config, as `node node_modules/eslint/bin/eslint.js --format json .`, and keeps only `security/*` rules. If the plugin is installed but not enabled in the config, ESLint reports nothing for it. Say so rather than calling the scan clean. Adding the plugin is a project change: ask.

## Bandit 1.9.4 (Python)

- macOS `brew install bandit`; any OS `pipx install bandit==1.9.4`.
- Flags (run in the repository root): `bandit -r . -f json -q -x ./node_modules,./.venv,./venv,./vendor,./build,./dist`. JSON rather than SARIF, because the SARIF formatter is an optional extra that Homebrew's build lacks. `run-scanners.js` converts it to SARIF and masks hard-coded values that B105-B107 quote in their messages.

## gosec 2.30.0 (Go)

- `go install github.com/securego/gosec/v2/cmd/gosec@v2.30.0`; macOS also `brew install gosec`.
- Flags (run in the module root): `gosec -fmt sarif -out <file> -no-fail -quiet ./...`

## Gitleaks 8.30.1 (secrets, including history)

- macOS `brew install gitleaks`; Windows `scoop install gitleaks`; Linux release archive plus `checksums.txt` from `https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1`.
- Full history: `gitleaks git --report-format sarif --report-path <file> --redact --exit-code 0 --no-banner <repo>`
- Pull request range: add `--log-opts "<base>..HEAD"`.
- `--redact` keeps secret values out of the SARIF; never remove it. A `.gitleaks.toml` in the repository is read automatically. Check it for allowlists that hide real paths.
- Fallback without Gitleaks: `node ../security-review/scripts/scan-secrets.js --all` scans the current tracked files only, not history. Say so in the report.

## OSV-Scanner 2.7.0 (dependencies, fallback only)

Prefer the `dependency-audit` skill. As a fallback:

- macOS `brew install osv-scanner`; Windows `scoop install osv-scanner`; any OS `go install github.com/google/osv-scanner/v2/cmd/osv-scanner@v2.7.0`.
- Flags: `osv-scanner scan source -r --format sarif --output <file> <repo>` (queries osv.dev).

## Checkov 3.3.30 (IaC, primary)

- `pipx install checkov==3.3.30`; macOS also `brew install checkov`.
- Flags: `checkov -d <repo> -o sarif --output-file-path <dir> --soft-fail --quiet --compact --skip-download` (writes `results_sarif.sarif`; `--skip-download` stops it fetching policies from a vendor API).

## Trivy 0.76.1 (IaC fallback; container images)

- macOS `brew install trivy`; Windows `scoop install trivy`; Linux release archive plus `trivy_0.76.1_checksums.txt` from `https://github.com/aquasecurity/trivy/releases/tag/v0.76.1`.
- IaC: `trivy config --format sarif --output <file> --exit-code 0 --quiet <repo>`
- Image (only when the user names one): `trivy image --format sarif --output <file> --exit-code 0 --quiet <image>`
- Trivy downloads its check bundle and vulnerability database on first use. That is the tool's own update and is allowed.

## Hadolint 2.15.1 (Dockerfiles)

- macOS `brew install hadolint`; Windows `scoop install hadolint`; Linux `hadolint-linux-x86_64` plus its `.sha256` from `https://github.com/hadolint/hadolint/releases/tag/v2.15.1`.
- Flags: `hadolint --format sarif --no-fail <Dockerfile>...`

## zizmor 1.31.1 (GitHub Actions)

- macOS `brew install zizmor`; any OS `pipx install zizmor==1.31.1` (or `uvx zizmor@1.31.1`).
- Flags: `zizmor --format sarif --offline --no-progress .github/workflows`
- `--offline` skips audits that call the GitHub API, so no token is needed. Online audits (impostor commits, known-vulnerable actions) need a `GH_TOKEN`. Run them only if the user provides one.

## Docker alternative

When the user prefers not to install binaries, run the pinned image with the repository mounted **read-only** and an output folder mounted writable:

```
docker run --rm -v "$PWD:/src:ro" -v "$OUT:/out" zricethezav/gitleaks:v8.30.1 git /src --report-format sarif --report-path /out/gitleaks.sarif --redact --exit-code 0
docker run --rm -v "$PWD:/src:ro" -v "$OUT:/out" bridgecrew/checkov:3.3.30 -d /src -o sarif --output-file-path /out --soft-fail --skip-download
docker run --rm -i hadolint/hadolint:v2.15.1 hadolint --format sarif --no-fail - < Dockerfile > "$OUT/hadolint.sarif"
docker run --rm -v "$PWD:/src:ro" -v "$OUT:/out" aquasec/trivy:0.76.1 config --format sarif --output /out/trivy.sarif /src
docker run --rm -v "$PWD:/src:ro" ghcr.io/zizmorcore/zizmor:1.31.1 --format sarif --offline /src/.github/workflows > "$OUT/zizmor.sarif"
```

Pin images by digest in CI (`image@sha256:...`). SARIF paths from a container start with `/src/`. Rewrite them to repository-relative paths (`sed 's#/src/##'`) before running `normalise.js`, and write a `run.json` by hand (scope root, tool names, versions, status) so that the report lists what ran.
