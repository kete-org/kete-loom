# History scrubbing, licence tools and final checklist

## Fresh history (safest)

```sh
git clone <private-url> work && cd work
# after cleaning the tree and committing:
rm -rf .git && git init -b main && git add -A
gitleaks dir -v .            # must be clean before the first commit
git commit -m "Initial public release"
```

Keep the private repository as the archive of old history.

## Rewriting history with git filter-repo

Rotate secrets before you start. Work in a fresh clone.

`replacements.txt`, one expression per line (literal by default; `regex:` and `glob:` prefixes allowed; `==>` sets the replacement, otherwise matches become `***REMOVED***`):

```
AKIAEXAMPLEKEY==>REDACTED
regex:[a-z0-9-]+\.corp\.example\.com==>internal.example
```

```sh
git filter-repo --sensitive-data-removal --replace-text ../replacements.txt
git filter-repo --sensitive-data-removal --invert-paths --path config/prod.env --path dumps/
git filter-repo --replace-message ../message-replacements.txt   # same format, for commit messages
git filter-repo --mailmap ../mailmap                             # rewrite author/committer names and emails
```

- `--sensitive-data-removal` fetches all refs first, reports the first changed commits and orphaned LFS objects, and prints cleanup steps for the remote and other clones.
- Keep `replacements.txt` outside the repository; it contains the secrets.
- Re-run `gitleaks git -v --log-opts="--all"` and the manual searches until clean.
- If the private remote must also be cleaned: `git push --force --mirror origin` only with the user's sign-off; hosts block some refs (`refs/pull/*`) and keep cached views, so follow the host's sensitive-data removal guide and contact its support to purge them. Every other clone must be re-cloned or cleaned.

## Third-party licence inventory

| Ecosystem | Tool |
|---|---|
| npm / pnpm / Yarn | `npx license-checker-rseidelsohn --summary` (or the maintained checker the project uses) |
| Python | `pip-licenses --format=markdown` in the project's environment |
| Go | `go-licenses report ./...` |
| Rust | `cargo deny check licenses` with an allow-list in `deny.toml` |
| Java / Kotlin | Gradle or Maven licence plugins the build already uses |
| Any | `licensee detect` for the repository's own licence; `reuse lint` for REUSE compliance |

Also check for an SBOM requirement; `syft` or the ecosystem's SBOM tool can produce one.

## Final checklist (all must be yes)

- [ ] Owner approval recorded
- [ ] Every found secret rotated, and scans of tree and full history are clean
- [ ] No PII, customer data, internal hostnames, IPs, account IDs or internal URLs remain
- [ ] `LICENSE` present, SPDX id in manifests, third-party licence flags resolved by a qualified person
- [ ] README quick-start works from a clean clone on a machine without internal network access
- [ ] Build and tests pass without private registries, internal services or company VPN
- [ ] CONTRIBUTING, SECURITY (with a real contact), CODE_OF_CONDUCT (with a real contact)
- [ ] Public CI green; secret scanning, push protection and branch protection enabled
- [ ] Internal-only workflows, runbooks and deploy config removed
- [ ] Trademarks and project name cleared by the owner
- [ ] Publishing to a new public repository, or, if flipping the existing one, issues, PRs, wiki, releases and Actions logs reviewed
- [ ] Commit authors, emails and messages reviewed (fresh history, or `--mailmap` / `--replace-message` applied)
- [ ] User gave explicit sign-off to change visibility
