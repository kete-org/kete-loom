---
name: release-management
description: Ships a software release end to end - deciding the next semantic version from what changed, updating the changelog, tagging, writing release notes for users, cutting alpha/beta/rc pre-releases, patching an old version from a hotfix branch, and wiring up release tooling such as release-please, semantic-release or Changesets. Use when preparing or publishing a release, picking a version number, turning merged work into release notes, shipping a hotfix to an already-released line, or automating versioning and changelogs.
license: MIT
compatibility: Any Agent Skills host. Needs git. Publishing steps need the project's package manager and, for GitHub releases, the gh CLI.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Release management

A release is a promise: this exact commit, with this version number, does what the notes say. Work through the steps in order and stop at each checkpoint marked **ask**.

## 0. Find the existing process

1. Look for release tooling and docs: `RELEASING.md`, `CONTRIBUTING.md`, `release-please-config.json`, `.release-please-manifest.json`, `.releaserc*`, `release.config.*` or a `release` key in `package.json` (semantic-release), `.changeset/` (Changesets), `cliff.toml` (git-cliff), `.goreleaser.yaml`, and release workflows in `.github/workflows/`.
2. If a tool owns versioning, **use the tool**. Don't hand-edit versions or changelogs it generates; that causes drift or a double bump.
3. Find every place the version lives: `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj`, `build.gradle*`, `pubspec.yaml`, plugin manifests, a `VERSION` file, constants in code. Search the codebase for the current version string to catch the rest.
4. Find the last release: `git describe --tags --abbrev=0` and `git tag --sort=-v:refname | head`.

## 1. Check the release is ready

- `git fetch --tags --prune`, and confirm you are on the release branch (usually the default branch) with a clean tree and nothing unpushed.
- CI is green for the exact commit you will tag. Run the project's full check command locally as well.
- If anything fails, **stop**. Never tag a red build.

## 2. Decide the version (Semantic Versioning 2.0.0)

List what changed since the last tag: `git log --oneline <last-tag>..HEAD`. If commits follow Conventional Commits, the type and `!`/`BREAKING CHANGE` footers tell you directly.

| Since last release | Bump | Example |
|---|---|---|
| Any incompatible change to the public API, config, CLI, data format or supported runtimes | MAJOR | 2.4.1 → 3.0.0 |
| New backward-compatible functionality, or a deprecation | MINOR | 2.4.1 → 2.5.0 |
| Only backward-compatible bug fixes | PATCH | 2.4.1 → 2.4.2 |
| Nothing user-facing (docs, tests, CI) | No release needed | |

Rules:

- First decide what the **public API** is (exported functions, HTTP endpoints, CLI flags, config keys, file formats). Only changes to it count.
- Under `0.y.z`, the public API is not stable and anything may change. Most projects bump MINOR for breaking changes and PATCH for everything else; follow the project's history.
- `1.0.0` is a deliberate decision that the API is stable. **Ask** before making it.
- A MAJOR bump, or any case where you are unsure whether something is breaking: **ask** the user, with the specific change that makes you think so.
- Never reuse or move a published version or tag. A bad release gets a new version.

## 3. Update the changelog

If no tool generates it, keep `CHANGELOG.md` in the Keep a Changelog style:

```
## [2.5.0] - 2026-03-14

### Added
- CSV export from the reports page (#512)

### Fixed
- Totals no longer go negative when a refund exceeds the line amount (#498)
```

- Sections: Added, Changed, Deprecated, Removed, Fixed, Security. Omit empty ones.
- Write each entry for the user of the software, not the developer: what they can now do or what stopped going wrong. Link the PR or issue.
- Move entries out of `## [Unreleased]` into the new version heading; date in ISO format.
- Breaking changes go first under **Changed** or **Removed**, each with the migration step.

## 4. Bump, commit and tag

1. Update every version location from step 0. Use the ecosystem's command where one exists (for example `npm version <x.y.z> --no-git-tag-version`) so lockfiles follow.
2. Commit: `git commit -am "chore(release): <x.y.z>"` (or the project's convention).
3. Tag with an **annotated** tag: `git tag -a v<x.y.z> -m "v<x.y.z>"`. Use `-s` instead of `-a` if the project signs tags. Match the existing tag prefix (`v1.2.3` or `1.2.3`, or `pkg@1.2.3` in monorepos).
4. **Ask** before pushing: pushing a tag usually triggers publishing. Then `git push origin <branch>` and `git push origin v<x.y.z>`. Don't use `git push --tags`, which can push stray local tags.

## 5. Release notes

Release notes are the changelog entry rewritten for a reader skimming the release page.

```
## Highlights
<1-3 sentences on why someone should upgrade>

## Breaking changes
- <what changed> → <what to do>

## What's new / Fixes
- <user-facing change> (#PR)

## Upgrade
<command or steps, including any migration>
```

Publish with `gh release create v<x.y.z> --title "v<x.y.z>" --notes-file notes.md --verify-tag` (add `--prerelease` for pre-releases). `--verify-tag` aborts if the tag is not on the remote, instead of letting gh create a tag from the default branch's head. `--generate-notes` builds a PR list, which is a starting draft, not finished notes.

## 6. Pre-releases

- Format: `<x.y.z>-<label>.<n>`, for example `3.0.0-beta.2`. SemVer orders `alpha < beta < rc` and `3.0.0-rc.1 < 3.0.0`. Always put a dot before the counter: `beta.10` sorts after `beta.9` (numeric identifiers compare as numbers), but `beta10` sorts before `beta9` (compared as text).
- Publish so default installs don't pick them up: `npm publish --tag next` (npm), a pre-release version string for PyPI (`3.0.0b2`, PEP 440), `--prerelease` on the GitHub release.
- Bump only the counter between pre-releases of the same version; the final release drops the suffix.

## 7. Hotfixes to a released line

When a fix must ship without unreleased work on the default branch:

1. Branch from the release tag: `git switch -c hotfix/<x.y.z+1> v<x.y.z>`.
2. Land the fix on the default branch first when possible, then `git cherry-pick -x <sha>` onto the hotfix branch (`-x` records the source commit). If it only applies to the old line, fix it there and port forward.
3. Run the full checks on the hotfix branch, then do steps 3-5 with a PATCH bump.
4. Make sure the changelog entry also reaches the default branch, so the next release doesn't lose it.
5. For long-lived support lines, keep a `release/<major>.<minor>` branch instead of recreating it each time.

## 8. Automating releases

Pick one tool, and only if the project has none yet. **Ask** before adding it, since it changes how everyone merges.

| Tool | Fits | How it works |
|---|---|---|
| release-please | GitHub repos, monorepos, wanting a human gate | Opens a release PR from Conventional Commits; merging it tags and releases |
| semantic-release | Fully automatic releases on every merge | Analyses commits in CI, then bumps, tags and publishes |
| Changesets | JS monorepos, versioning decided per PR | Contributors add `.changeset/*.md` files; a release PR applies them |
| git-cliff | Changelog generation only | Builds the changelog from commits via `cliff.toml` |

Before wiring one in: confirm commit messages already follow the convention it needs, give the CI token only the permissions the tool's docs list, and run it in dry-run mode first (`semantic-release --dry-run`, or check release-please's PR before merging).

## Never

- Never tag or publish from a dirty tree or an unpushed commit.
- Never delete or move a published tag, or republish the same version with different contents.
- Never hand-edit files that the release tool generates.
- Never publish (tag push, registry publish, GitHub release) without the user's go-ahead.

## Report back

```
Version: <old> → <new> (<major|minor|patch|pre-release|hotfix>), reason: <change that decided it>
Changed files: <version files, CHANGELOG.md>
Tag: <tag> (<pushed | local only>)
Published: <registry/release URL, or not yet>
Notes: <path or inline>
Follow-ups: <port hotfix forward, announce, etc.>
```
