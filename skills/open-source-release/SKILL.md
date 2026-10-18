---
name: open-source-release
description: Takes a private or internal codebase public safely by scanning the working tree and full git history for secrets, personal data and internal hostnames with gitleaks and trufflehog, rewriting history with git filter-repo or starting a fresh history, choosing an outbound licence and checking third-party licence compatibility, adding README, CONTRIBUTING, SECURITY and CODE_OF_CONDUCT files and public CI, then walking a pre-publish checklist with explicit sign-off points. Use when someone wants to open-source an internal project, flip a private GitHub repository to public, or publish company code under an open licence for the first time.
license: MIT
compatibility: Any Agent Skills host. Needs git; secret scanning uses gitleaks or trufflehog, history rewriting uses git-filter-repo. Licence scanners depend on the ecosystem.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git, gitleaks, git-filter-repo"
  kete-loom/owner: "Kete-org"
---

# Open-source release

Make a private repository safe to publish. Once a repository is public, anything in its history is copied by forks, mirrors and scrapers within minutes, so every check happens **before** the visibility flip, and none of it can be undone afterwards.

This skill is engineering preparation, not legal advice. The owner of the code (usually the employer) must approve the release and the licence; a lawyer or the company's open-source programme office should review licence and trademark questions.

## 0. Stop and ask first

Before doing any work, confirm with the user:

1. Who owns the code and has approved publishing it (name the person or the approval record).
2. Whether contributors outside the company ever committed (their rights matter for relicensing).
3. Whether to **keep history** (rewrite and scrub it) or **publish a fresh history** (one squashed initial commit). A fresh history is the safest default for internal code; keep history only if the user wants it and the scan in step 1 is clean or fully remediated.

Work in a **fresh clone** (`git clone --mirror` for scanning and rewriting history, a normal clone for the fresh-history route) so you never rewrite the team's working copy.

**Publish to a new public repository by default** rather than flipping the existing private one to public. Flipping visibility also exposes everything attached to the repository: issues, pull requests and their review comments, wiki, releases, Actions logs and artifacts, and `refs/pull/*` commits that a history rewrite cannot remove. Flip the existing repository only if the user explicitly wants that and has reviewed all of it.

## 1. Scan for secrets, personal data and internal details

Scan the full history of every ref, not just the tip:

- `gitleaks git -v --log-opts="--all" --report-path gitleaks-history.json .`
- `gitleaks dir -v --report-path gitleaks-tree.json .` (working tree, including untracked files you plan to publish)
- `trufflehog git file://<path-to-clone> --results=verified,unknown` (run from outside the repo; it tries keys against providers, so tell the user it makes network calls)

Then search the codebase and history (`git log -p --all -S <term>` / `git grep`) for what scanners miss, including commit metadata (`git log --all --format='%an <%ae> %cn <%ce>' | sort -u` and commit messages), which can carry personal emails, ticket links and customer names:

- internal hostnames and domains (`*.internal`, `*.corp`, `*.local`, VPN and intranet names), private IP ranges, cloud account and project IDs, S3 bucket names;
- customer names, employee names and emails, phone numbers, real data in fixtures, seeds, test snapshots and screenshots;
- committed `.env`, `*.pem`, `*.p12`, `id_rsa`, kubeconfig, `terraform.tfstate`, database dumps, `.npmrc`/`.pypirc` with tokens;
- comments with security issues, incident details, unreleased product names, profanity about customers;
- vendored proprietary code, internal packages pulled from a private registry, licensed fonts or images.

Triage each hit as **live secret**, **dead secret**, **PII**, **internal detail** or **false positive**.

## 2. Remediate

1. **Rotate every real secret first**, live or "probably dead". Scrubbing history does not un-leak a key someone already copied. Record who rotated what.
2. Remove PII and internal details from the current tree with normal commits.
3. Then deal with history, following `references/history-scrub.md`:
   - fresh history: copy the cleaned tree into a new repository with one initial commit;
   - keep history: `git filter-repo --sensitive-data-removal --replace-text replacements.txt` and `--invert-paths --path <file>` for whole files; `--replace-message` for commit messages and `--mailmap` for author identities; then re-run every scan from step 1 until it is clean.
4. Add the remaining false positives to a `.gitleaksignore` (fingerprints) so CI starts clean.

## 3. Licence

1. Ask the user which outbound licence the owner has chosen. If undecided, lay out the usual options without deciding for them: permissive (MIT, Apache-2.0 which adds an explicit patent grant, BSD-3-Clause), weak copyleft (MPL-2.0), strong copyleft (GPL-3.0, AGPL-3.0 for network services).
2. Add the full licence text as `LICENSE` and an SPDX identifier in the package manifest (`"license": "Apache-2.0"`, `license = "MIT"`). Optional per-file `SPDX-License-Identifier` headers; `reuse lint` checks them if the project adopts REUSE.
3. Inventory third-party licences with the ecosystem's tool (`references/history-scrub.md` lists them) and flag: no licence, unknown licence, copyleft dependencies incompatible with the chosen licence, and copied-in code whose origin is unclear. **Stop and ask** on any flag; a qualified person decides compatibility.
4. If outside contributors will be accepted, ask whether the owner wants a DCO sign-off or a CLA. Don't pick one for them.

## 4. Community and security files

Add or update, matching the project's real process (never promise response times nobody agreed to):

- `README.md`: what it is, status (experimental / stable), install, a working quick-start, how to run tests, licence.
- `CONTRIBUTING.md`: dev setup, test and lint commands, branch and PR rules, DCO/CLA if any.
- `SECURITY.md`: how to report a vulnerability privately (enable GitHub private vulnerability reporting, or a monitored address), supported versions. Ask the user for the contact.
- `CODE_OF_CONDUCT.md`: usually the Contributor Covenant (3.0 is current); fill in a real enforcement contact the user gives you.
- Issue and PR templates, `CODEOWNERS` if the team uses it.
- Remove internal-only files: deploy scripts for company infrastructure, internal runbooks, `.github/workflows` that use self-hosted runners or internal secrets.

## 5. Public CI

- A workflow that builds, lints and tests on pull requests from forks, using no repository secrets on `pull_request` events.
- A secret scan on every push and PR (gitleaks action or `gitleaks git` in a job).
- Least-privilege `permissions:` on the token; for depth on workflow hardening use the `github-actions-ci` skill if installed.
- Enable secret scanning and push protection, Dependabot or equivalent, and branch protection on the default branch.

## 6. Pre-publish checklist

Go through `references/history-scrub.md` "Final checklist" with the user. **Stop and ask for explicit sign-off** before:

- force-pushing rewritten history anywhere;
- creating the public repository or changing visibility to public;
- publishing to a package registry.

Never flip visibility yourself without that sign-off, and never publish while any scan finding is unresolved.

## Report

```
## Open-source readiness: <repo>
Approval: <who approved, or MISSING>
History: fresh | rewritten (<tool>, first changed commit <sha>)
Secrets: <n found> / <n rotated> / <n remaining>
PII and internal details: <removed items, or none>
Licence: <SPDX id> | third-party flags: <list or none>
Files added: README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, ...
CI: <workflow names> | secret scan in CI: yes/no
Blocking before publish: <list, or none>
Needs human sign-off: <owner approval, licence review, visibility flip>
```
