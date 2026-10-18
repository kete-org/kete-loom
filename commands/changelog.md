---
name: changelog
description: Write changelog entries for the changes since the last release tag, grouped by type, with breaking changes called out first.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[from-ref..to-ref or version]"
  kete-loom/owner: "Kete-org"
---

Write changelog entries for the changes since the last release.

If a release tool owns the changelog (release-please, semantic-release, Changesets, git-cliff config in the repo), do not hand-edit `CHANGELOG.md`: show the entries, tell the user which tool generates the file, and stop.

If the `release-management` skill is available, follow only its changelog step (not versioning, tagging or publishing); use the `conventional-commits` skill to read commit types if it is available. Otherwise:

1. Find the range. If the user gave a range or version below, use it. Otherwise use the latest tag: `git describe --tags --abbrev=0`, then `git log <tag>..HEAD --no-merges --format='%h %s%n%b'`. If there are no tags, ask the user where to start and stop.
2. Classify each commit. With Conventional Commits, map `feat` to Added, `fix` to Fixed, `perf` and `refactor` with user-visible effect to Changed, and anything with `!` before the colon or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer to Breaking. Drop `chore`, `ci`, `test`, `style` and `docs`-only commits unless they matter to users. For commits without a type, read the diff to classify.
3. Rewrite each entry for users: what changed and why it matters, not the commit subject verbatim. Merge commits that are one change.
4. Match the existing `CHANGELOG.md` format if there is one (for example Keep a Changelog: Added, Changed, Deprecated, Removed, Fixed, Security, with breaking changes marked in the entry); otherwise use:

```
## [<version or Unreleased>] - <YYYY-MM-DD>
### Breaking
- ... Migration: ...
### Added
### Changed
### Fixed
```

5. Show the entries to the user. Insert them at the top of `CHANGELOG.md` only after they confirm. Do not bump versions, tag or push.

Range or version, if any: $ARGUMENTS
