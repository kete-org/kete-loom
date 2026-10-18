---
name: github-api-automation
description: Scripts and services that drive GitHub through the gh CLI, the REST and GraphQL APIs or a GitHub App, covering the choice between fine-grained tokens and app installation tokens, JWT-to-installation-token exchange, Link-header and cursor pagination, primary and secondary rate limits, X-Hub-Signature-256 webhook verification, and the Actions REST endpoints for dispatching, re-running and reading workflow runs. Use when writing a bot, sync job or webhook receiver that calls the GitHub API, choosing between a PAT and a GitHub App, or debugging 403 rate-limit or signature failures from GitHub.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to api.github.com (or a GitHub Enterprise Server host). Examples use the gh CLI and plain HTTP; the rules apply to Octokit and other SDKs.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "gh"
  kete-loom/owner: "Kete-org"
---

# GitHub API automation

Build GitHub automation that uses the least-privileged credential, pages through every result, backs off before GitHub bans it, and trusts a webhook only after its signature checks out. Writing workflow YAML under `.github/workflows` is a different job; this skill is about calling GitHub from code or the shell.

## Ground rules

1. **Least privilege.** Ask for the narrowest repository access and permissions that do the job. Never use a classic PAT with `repo` scope for a shared service.
2. **Secrets from the environment** (`GH_TOKEN`, app private key, webhook secret). Never commit them, log them or pass them on a command line other processes can read.
3. **Pin the API version** with `X-GitHub-Api-Version`. Supported values are `2022-11-28` (the default when the header is omitted) and `2026-03-10`. Also send `Accept: application/vnd.github+json` and a `User-Agent`.
4. **Read before you write.** Dry-run bulk changes (labels, branch protection, repo settings) by printing the planned calls first.
5. **Webhooks are verified, deduplicated and acknowledged fast.**

## Choose the credential

| Situation | Use |
|---|---|
| One-off script on your own machine | `gh auth login`, then `gh api` |
| Personal automation on a few repos | Fine-grained PAT scoped to those repos, with an expiry |
| Inside a GitHub Actions job | The job's `GITHUB_TOKEN`, with `permissions:` set in the workflow |
| Bot or service acting for an org, or across many orgs | GitHub App with an installation token |
| Acting as the signed-in user in your web app | GitHub App user access token (OAuth flow), not an OAuth App, unless you need something only OAuth Apps support |

Stop and ask the user before choosing a credential that will be shared by a team or deployed to production, and before requesting any `administration`, `secrets` or org-level write permission.

## GitHub App auth

1. Create the app with only the permissions and events it needs. Store the private key (PEM) as a secret.
2. Sign a JWT with RS256: `iat` about 60 seconds in the past (clock drift), `exp` no more than 10 minutes ahead, `iss` set to the app's client ID (or app ID).
3. Find the installation: `GET /repos/{owner}/{repo}/installation` or `GET /app/installations` with the JWT.
4. Exchange: `POST /app/installations/{installation_id}/access_tokens`, optionally with `repositories` and `permissions` to narrow it further. The token lasts one hour; cache it and refresh a few minutes before `expires_at`.
5. Call the API with `Authorization: Bearer <installation token>`. Never send the JWT to anything other than the `/app` endpoints.

## Pagination

- REST: request `per_page=100` (the maximum on most endpoints) and follow the `Link` header's `rel="next"` URL until it is absent. Never build page numbers yourself on endpoints that return cursor links.
- `gh api --paginate repos/{owner}/{repo}/issues` follows links for you; add `--slurp` to merge pages into one JSON array before piping to `jq`.
- GraphQL: request `first: 100` (1 to 100 allowed) with `pageInfo { hasNextPage endCursor }`, then pass `endCursor` as `after`. `gh api graphql --paginate` works when the query takes a `$endCursor` variable.
- Use the search API only for searching; it has its own lower rate limit and caps results at 1,000 per query.

## Rate limits

Primary limits per hour (check the docs, they change): unauthenticated 60; PAT or user token 5,000; app installation starts at 5,000 and scales to 12,500 (15,000 on Enterprise Cloud); `GITHUB_TOKEN` 1,000 per repo. GraphQL is budgeted separately in points.

Secondary limits apply on top: at most 100 concurrent requests, a points-per-minute budget per endpoint (writes cost more than reads), and about 80 content-creating requests per minute.

Rules:

1. Read `x-ratelimit-remaining` and `x-ratelimit-reset` (epoch seconds) on every response. `GET /rate_limit` shows the buckets.
2. On 403 or 429: if `retry-after` is present, wait that many seconds; else if `x-ratelimit-remaining` is `0`, wait until `x-ratelimit-reset`; else wait at least one minute. Then back off exponentially and give up after a fixed number of attempts.
3. Make writes serially, not in parallel. Prefer conditional requests (`If-None-Match` with the stored `ETag`; a 304 does not count against the primary limit when authorised).
4. Prefer webhooks to polling.

## Webhooks

1. Set a random secret on the webhook or app. Verify `X-Hub-Signature-256`: it is `sha256=` plus the hex HMAC-SHA256 of the **raw** body with that secret. Compute it before any JSON parsing and compare with a constant-time function. Reject with 401 on mismatch. Never fall back to the legacy SHA-1 `X-Hub-Signature`.
2. Respond `2xx` within 10 seconds; queue the real work.
3. Deduplicate on `X-GitHub-Delivery` (a GUID per delivery; redeliveries reuse it). Route on `X-GitHub-Event` plus the payload's `action`.
4. GitHub does not retry failed deliveries automatically. To recover, list failed deliveries (`GET /app/hook/deliveries` for an app, or the repo/org hook deliveries endpoint) and redeliver them.
5. Ignore events from your own bot (check `sender.type == "Bot"` and the login) to avoid loops.
6. Local testing: `gh webhook forward --repo=OWNER/REPO --events=issues --url=http://localhost:3000/webhook` (a gh extension, `cli/gh-webhook`) or a smee.io channel.

## Actions API

| Task | Call |
|---|---|
| Start a workflow with inputs | `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id or file name}/dispatches` with `ref` and `inputs`; the workflow must declare `workflow_dispatch`. `gh workflow run deploy.yml -f env=staging` |
| List or watch runs | `GET /repos/{owner}/{repo}/actions/runs?branch=&status=`; `gh run list`, `gh run watch <id>` |
| Re-run | `POST .../actions/runs/{run_id}/rerun` or `.../rerun-failed-jobs`; `gh run rerun <id> --failed` |
| Cancel | `POST .../actions/runs/{run_id}/cancel` |
| Logs | `GET .../actions/runs/{run_id}/logs` returns a redirect to a zip; `gh run view <id> --log-failed` |
| Artifacts | `GET .../actions/runs/{run_id}/artifacts`; `gh run download <id>` |
| Secrets | Encrypt with the repo public key (`GET .../actions/secrets/public-key`, libsodium sealed box) before `PUT`; or `gh secret set NAME` |

By default a dispatch returns `204` with no body. Send `"return_run_details": true` in the body to get `200` with the new run's details (added February 2026; `gh` 2.87.0+ does this by default); check the REST reference for the field names. On GitHub Enterprise Server versions without it, list runs for that workflow and ref created after your request time, or pass a correlation ID as an input and match it in `run-name`.

## Reviewing existing automation

Look for: a classic PAT or admin token where an app or `GITHUB_TOKEN` would do; tokens in logs or URLs; only the first page read; parallel write loops with no backoff; retries on 403 that ignore `retry-after`; webhook handlers that parse JSON before verifying, use `==` to compare signatures, or skip verification when the header is missing; no dedupe on `X-GitHub-Delivery`; bots that react to their own events.

## Stop and ask the user

- Before any bulk write across many repositories (settings, branch protection, deleting branches, archiving).
- Before creating or rotating secrets, deploy keys or app private keys.
- Before granting an app org-wide installation instead of selected repositories.

## Before you finish

Test with a throwaway repository: run the job twice (idempotent), force a page boundary (more than 100 items), send a webhook with a wrong signature (rejected), redeliver a webhook (processed once), and check the rate-limit headers in a log line. GitHub's REST and GraphQL docs at docs.github.com are the final word on endpoints and limits.
