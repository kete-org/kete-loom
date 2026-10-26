# Releasing @ketecode/loom

Releases go to npm as `@ketecode/loom`. After the one-time setup below, a release is: bump the version, push a `vX.Y.Z` tag, and `.github/workflows/release.yml` checks and publishes it with npm trusted publishing (no npm token stored in GitHub, and a provenance attestation on every version).

## One-time setup

### 1. Publish the first version by hand

npm only lets you configure a trusted publisher in an existing package's settings, so the first version is published from your machine.

```bash
npm login                      # an account with publish rights on the @ketecode scope; use 2FA
npm whoami                     # confirm you are logged in
git switch main && git pull    # publish from the pushed main branch, never from local-only commits
npm ci
npm pack --dry-run             # read the file list: bin/, scripts/lib/, skills/, agents/, commands/,
                               # hooks/, rules/, mcp/, profiles.json, schemas/, README.md, LICENSE
npm publish                    # runs `npm run check` first (prepublishOnly); access is public
```

`publishConfig.access` is `public` in `package.json`, because scoped packages are private by default. If your account uses 2FA for publishing, npm asks for a one-time code.

Check it worked, from a different folder:

```bash
npm view @ketecode/loom version
npx @ketecode/loom@latest list | tail -1
```

### 2. Turn on trusted publishing for later releases

On npmjs.com, open the package → **Settings** → **Trusted Publisher** → **GitHub Actions**, and enter exactly (the fields are case-sensitive):

| Field | Value |
|---|---|
| Organization or user | `kete-org` |
| Repository | `kete-loom` |
| Workflow filename | `release.yml` |
| Environment name | leave empty |

The first publish through the workflow must happen within 2 days of saving this, or the configuration expires and has to be recreated. `repository.url` in `package.json` must stay `git+https://github.com/kete-org/kete-loom.git`.

Then, under the same Settings page, set **Publishing access** to require 2FA or trusted publishing and disallow tokens, so only the workflow (or a person with 2FA) can publish.

## Every release

Every other Saturday at 09:00 UTC, `.github/workflows/release-prep.yml` does steps 1 to 3 and opens a `chore(release): vX.Y.Z` pull request (run it any time from the Actions tab). Review and merge it, then do steps 4 to 6 from `main`. `node scripts/release-bump.js` prints the version it would pick; `--write` applies it.

1. Decide the version: patch for fixes and content wording, minor for new skills, agents, commands, rules, hooks, MCP servers or CLI features, major for breaking changes to the CLI or install layout.
2. Bump it everywhere at once: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` and `gemini-extension.json`. `npm run lint` fails if they disagree.
3. `npm run catalog` and `npm run check`; everything must pass.
4. Commit (`chore(release): vX.Y.Z`), then tag and push:

   ```bash
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```

5. Watch the **Release** workflow (`gh run watch`). It refuses a tag that doesn't match `package.json`, runs the full check, and publishes.
6. Confirm: `npm view @ketecode/loom version`, and the green provenance badge on the npm page.

## If something goes wrong

- **Bad release:** publish a fixed patch version. Prefer `npm deprecate @ketecode/loom@X.Y.Z "reason; use X.Y.Z+1"` over unpublishing; npm only allows unpublishing within 72 hours and under conditions, and a version number can never be reused.
- **Workflow fails with a 403 or OIDC error:** re-check the trusted publisher fields (case matters), that the tag was pushed to `kete-org/kete-loom`, and that the job ran npm 11.5.1 or later.
- **Wrong files shipped:** fix `files` in `package.json`, check with `npm pack --dry-run`, and release a patch.
