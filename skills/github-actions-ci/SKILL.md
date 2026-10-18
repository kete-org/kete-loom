---
name: github-actions-ci
description: Writes, hardens and debugs GitHub Actions workflows under .github/workflows, including triggers and job structure, dependency caching, build matrices, reusable workflows and composite actions, keyless OIDC login to AWS, Google Cloud and Azure, least-privilege GITHUB_TOKEN permissions, SHA-pinned third-party actions, and diagnosing red runs from their logs. Use when creating or editing a GitHub Actions workflow YAML, speeding up a slow pipeline, removing stored cloud keys from CI, or figuring out why a GitHub Actions job failed.
license: MIT
compatibility: Any Agent Skills host. Reading run logs and re-running jobs needs the GitHub CLI (gh) authenticated to the repository.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git, gh"
  kete-loom/owner: "Kete-org"
---

# GitHub Actions CI

Make workflows that are fast, give every job only the permissions it needs, never store long-lived cloud keys, and fail with logs you can act on. Release rollout strategy lives in `deployment-strategies`; versioning and changelogs in `release-management`; the cloud-side roles in `aws-patterns`, `gcp-patterns` and `azure-patterns`.

## Ground rules

1. **Set `permissions` explicitly.** At the top of every workflow put `permissions: contents: read`, then widen per job only where needed (`pull-requests: write`, `id-token: write`, `packages: write`). Don't rely on the repository default.
2. **Pin third-party actions to a full commit SHA**, with the version in a comment: `uses: some-org/some-action@<40-char-sha> # v2.3.1`. Tags can be moved; SHAs can't. Let Dependabot or Renovate (`package-ecosystem: github-actions`) keep pins current. Actions owned by `actions/` and your own org may use tags if the team's policy allows, but SHAs are still safer.
3. **No cloud access keys in secrets.** Use OIDC (below). Secrets that must exist (API tokens for third parties) live in environment secrets with required reviewers for production.
4. **Never interpolate untrusted input into `run:`.** `${{ github.event.pull_request.title }}`, branch names, issue bodies and commit messages are attacker-controlled. Pass them through `env:` and quote the shell variable.
5. **Treat `pull_request_target` and `workflow_run` as privileged.** They run with secrets and a write token. Never check out and run the PR's code in them. Use plain `pull_request` for building and testing contributions.
6. **Bound every job:** `timeout-minutes` on each job (the default is hours), and `concurrency` so a new push cancels stale runs of the same branch.

## Workflow skeleton

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@<sha> # vN
        with:
          persist-credentials: false
      - uses: actions/setup-node@<sha> # vN
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
```

Adapt the setup action and commands to the project's language. Find the real test and build commands in the README, `package.json`, `Makefile` or equivalent before writing them.

## Caching

1. Prefer the setup action's built-in cache (`cache: npm | pip | gradle | maven`, Go and others have their own) over hand-written cache steps.
2. With `actions/cache`, key on the OS plus a hash of the lockfile: `key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}` and a `restore-keys` prefix for partial hits.
3. Cache dependency downloads, not build outputs that hide stale-code bugs. Never cache anything containing secrets.
4. For Docker builds use BuildKit cache (`cache-from` / `cache-to` with `type=gha`) in the build action.

## Matrices and reuse

- `strategy.matrix` for versions and OSes; `include` / `exclude` to trim combinations; `fail-fast: false` when you need every result. Keep matrices small: each cell is a billed job.
- **Reusable workflows** (`on: workflow_call` with typed `inputs` and declared `secrets`) for whole pipelines shared across repos. Call with `uses: org/repo/.github/workflows/build.yml@<sha-or-tag>`. Pass only the secrets the callee needs; use `secrets: inherit` only within the same trust boundary.
- **Composite actions** (`action.yml` with `runs: using: composite`) for a few repeated steps inside jobs.
- Pass data between jobs with `outputs` (small values) or artifacts (files). Don't rebuild the same artifact in a deploy job: build once, deploy that artifact.

## OIDC to clouds (no stored keys)

The job needs `permissions: id-token: write` (plus `contents: read`). The cloud must trust GitHub's issuer `https://token.actions.githubusercontent.com` and restrict the token's `sub` claim to this repo and, for deploys, to a branch or environment (for example `repo:org/app:environment:production`).

| Cloud | Action | Inputs | Cloud side |
|---|---|---|---|
| AWS | `aws-actions/configure-aws-credentials` | `role-to-assume`, `aws-region` | IAM OIDC provider + role trust policy with `aud` = `sts.amazonaws.com` and a `sub` condition |
| Google Cloud | `google-github-actions/auth` | `workload_identity_provider`, `service_account` | Workload Identity pool + provider with an attribute condition on `assertion.repository`, then `roles/iam.workloadIdentityUser` on the service account |
| Azure | `azure/login` | `client-id`, `tenant-id`, `subscription-id` | Federated credential on an app registration or user-assigned managed identity, subject matching the branch or environment |

Never accept a trust condition that allows any repository or any branch to assume a production role. If the user asks for one, **stop and explain** why first.

## Debugging a failed run

1. Get the failure: `gh run list --workflow <name> --limit 5`, then `gh run view <run-id> --log-failed`. Read the first error, not the last line.
2. Classify it:
   - **Code or test failure:** reproduce locally with the same command and versions as the matrix cell.
   - **Environment drift:** `ubuntu-latest` moved, a tool version changed, a cache restored stale content. Pin the version or bump the cache key.
   - **Permissions:** `Resource not accessible by integration` or 403 means the job's `permissions` block lacks a scope. Add only that scope to that job.
   - **OIDC:** `Not authorized to perform sts:AssumeRoleWithWebIdentity` or similar means the `sub`/`aud` condition doesn't match. Compare the condition with the run's ref or environment.
   - **Secret empty or missing:** runs from forked-repo pull requests get no secrets (except `GITHUB_TOKEN`, read-only). Don't switch to `pull_request_target` to get them; move the secret-needing step to a post-merge workflow.
   - **Workflow never started:** events caused by `GITHUB_TOKEN` (a push or PR opened by another workflow) don't start new runs, except `workflow_dispatch` and `repository_dispatch`. Check the `on:` filters (`branches`, `paths`) too.
   - **Flaky:** passes on `gh run rerun <run-id> --failed` with no change. Report it as flaky; don't paper over it with retries without telling the user.
3. For more detail, re-run with debug logging (the UI option, or set the repository secret or variable `ACTIONS_STEP_DEBUG` to `true`; `ACTIONS_RUNNER_DEBUG` adds runner diagnostics).
4. Lint workflows with `actionlint` if available before pushing.

## Never

- Use `permissions: write-all`, or leave a deploy job without an `environment` protection rule.
- Echo secrets, or write them to files that get uploaded as artifacts.
- Add `continue-on-error: true` to hide a failing step.
- Push workflow changes to the default branch without the user seeing the diff.

## Report format (reviews and fixes)

```
Workflow: <file>
Findings: <severity> <line> <issue> -> <fix>
Changed: <what you edited>
Verified: <run id or local command and result>
Still open: <anything you could not verify>
```
