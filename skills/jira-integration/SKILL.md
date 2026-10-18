---
name: jira-integration
description: Connects code to Jira Cloud through the REST API v3, from picking basic auth with an Atlassian API token or OAuth 2.0 (3LO) with a cloudId, through enhanced JQL search on /rest/api/3/search/jql with nextPageToken paging, creating issues with Atlassian Document Format bodies, looking up custom field IDs and running workflow transitions, to registering webhooks and coping with 429 burst and points-based quotas. Use when building a Jira sync, bot or importer, moving off the removed /rest/api/3/search endpoint, setting custom fields or transitions from code, or handling Jira webhooks and rate limits.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to <site>.atlassian.net or api.atlassian.com. Covers Jira Cloud only; Jira Data Center and Server have a different API surface and auth.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "curl"
  kete-loom/owner: "Kete-org"
---

# Jira Cloud integration

Build a Jira integration that authenticates with the right credential, finds issues with paged JQL, writes fields Jira accepts, moves issues through the real workflow, and slows down when Jira says so.

## Ground rules

1. **Jira Cloud, REST v3.** Base URL `https://<site>.atlassian.net/rest/api/3/` for API-token calls, or `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/` for OAuth 2.0 and scoped tokens. If the user is on Data Center or Server, stop: this skill does not cover it.
2. **Credentials from the environment.** Never commit an API token or client secret, never log the `Authorization` header.
3. **Never hard-code IDs** for custom fields, issue types or transitions. They differ per site and per project; look them up and cache them.
4. **People are account IDs.** Set assignee and reporter with `accountId`; usernames and email lookups are not reliable in Cloud.
5. **Text fields in v3 are ADF** (Atlassian Document Format) JSON, not plain strings or wiki markup.

## Choose the auth

| Situation | Use |
|---|---|
| Script or internal service for one site | Basic auth: `email:api_token` base64-encoded in `Authorization: Basic ...`. Tokens are created at id.atlassian.com, expire (1 to 365 days) and act as that user |
| Narrower internal access | A scoped API token, called through `api.atlassian.com/ex/jira/{cloudId}` |
| App other people's sites install, acting as each user | OAuth 2.0 (3LO) |
| Code running inside Jira (UI, triggers) | Forge app; out of scope here |

Use a dedicated service account for shared integrations, not a person's token. Stop and ask the user before using an admin's token.

### OAuth 2.0 (3LO)

1. Register the app in the Atlassian developer console; add the Jira API scopes you need (classic `read:jira-work`, `write:jira-work`, `read:jira-user`, or granular scopes) plus `offline_access` for refresh tokens.
2. Send the user to `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=...&scope=...&redirect_uri=...&state=...&response_type=code&prompt=consent`. Check `state` on return.
3. Exchange the code at `POST https://auth.atlassian.com/oauth/token`. Refresh tokens rotate: store the new refresh token every time you refresh.
4. `GET https://api.atlassian.com/oauth/token/accessible-resources` lists the sites the token can reach; store each `id` as the `cloudId` and call `api.atlassian.com/ex/jira/{cloudId}/...`.

## Search with JQL

- `GET/POST /rest/api/3/search` was removed from Jira Cloud. Use `POST /rest/api/3/search/jql` with `{ "jql": "...", "fields": [...], "maxResults": 100, "nextPageToken": "..." }`.
- Always pass `fields` explicitly; ask for only what you use.
- Page by sending back `nextPageToken` until the response has none (or `isLast` is true). There is no `startAt` and no `total`; for a count, use `POST /rest/api/3/search/approximate-count`.
- Always bound JQL (`project = ABC AND updated >= -1d ORDER BY updated ASC`). An unbounded query on a large site is slow and burns quota.
- Quote values with spaces or reserved words, and build JQL from validated values, never by pasting user input into the string.
- For incremental sync, store the last `updated` you processed and query `updated >= "<timestamp>"`, then dedupe by issue ID (JQL date precision is minutes).

## Create and update issues

1. Discover fields for the target: `GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes` then `.../issuetypes/{issueTypeId}` for required fields and allowed values. `GET /rest/api/3/field` maps custom field names to IDs (`customfield_10042`); cache by name, look up once per site.
2. `POST /rest/api/3/issue` with `fields`: `project: {key}`, `issuetype: {id}`, `summary`, `description` as ADF, plus required custom fields in their type's shape (select: `{ "value": "High" }` or `{ "id": "..." }`; user: `{ "accountId": "..." }`; number and date as plain values).
3. Minimal ADF: `{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}`.
4. Update with `PUT /rest/api/3/issue/{key}` using `fields` (set) or `update` (add/remove on multi-value fields such as labels). Add `notifyUsers=false` only if the user asks; it needs the Administer Jira or Administer Projects permission.
5. Comments: `POST /rest/api/3/issue/{key}/comment` with an ADF `body`.
6. Make creates idempotent yourself: Jira has no idempotency key. Store your external ID in an issue property or a label and search for it before creating.
7. Read the 400 response `errors` object; it names each field that failed.

## Transitions

1. `GET /rest/api/3/issue/{key}/transitions` lists transitions available **now** for that issue and user (add `expand=transitions.fields` to see screen fields).
2. Pick by target status (`to.name` or `to.id`), not by transition name or a hard-coded ID; workflows differ per project.
3. `POST /rest/api/3/issue/{key}/transitions` with `{ "transition": { "id": "31" }, "fields": { "resolution": { "name": "Done" } } }` when the screen requires fields.
4. If the target is not listed, the workflow does not allow it from the current status or the user lacks permission. Report that; do not try other transitions to get there unless the user asks.

## Webhooks

- Admin-created webhooks (Jira settings or `/rest/webhooks/1.0/webhook`): set a `secret`; Jira then sends `X-Hub-Signature: sha256=<hex HMAC of the raw body>`. Verify on the raw bytes with a constant-time compare.
- OAuth 2.0 and Connect apps register dynamic webhooks with `POST /rest/api/3/webhook` (JQL filter limited to fields such as `project`, `issuetype`, `status`, `assignee`). They expire after 30 days: refresh with `PUT /rest/api/3/webhook/refresh` and `{ "webhookIds": [...] }` on a schedule. An OAuth app can register 5 per user per site. OAuth apps receive a JWT in `Authorization` signed with the client secret; verify it.
- Jira retries failed deliveries (408, 409, 425, 429, 5xx, timeouts) up to five times. Dedupe on `X-Atlassian-Webhook-Identifier`; `X-Atlassian-Webhook-Retry` gives the attempt number.
- Acknowledge fast and process from a queue. The payload may be stale; re-fetch the issue if you need current state.

## Rate limits

- Jira returns `429` with `Retry-After` (seconds) and `RateLimit-Reason` (`jira-burst-based`, `jira-quota-global-based`, `jira-quota-tenant-based`, `jira-per-issue-on-write`). Watch `X-RateLimit-NearLimit: true`.
- Limits: per-second burst limits per endpoint, an hourly points quota for apps (enforced from March 2026; API-token traffic stays under burst limits), and per-issue write limits (20 writes per 2 seconds, 100 per 30 seconds on one issue).
- Wait at least `Retry-After`, then exponential backoff with jitter, capped at a few retries; retry only idempotent requests. On quota reasons pause all calls; on burst slow that endpoint; on per-issue space out writes to that issue.
- Batch where Jira offers it (bulk create `POST /rest/api/3/issue/bulk`, up to 50 issues) and fetch only needed fields.

## Stop and ask the user

- Before bulk edits, bulk transitions or deletes on more than a handful of issues; show the JQL and the count first.
- Before creating webhooks, custom fields or workflow changes on a production site.
- If required fields or the workflow make the requested change impossible, rather than guessing values.

## Before you finish

Test against a sandbox site or a throwaway project: a search that spans more than one page, a create with every required custom field, a transition that needs a screen field, a duplicate create (no second issue), a webhook with a bad signature (rejected), and a forced 429 handled with backoff. Atlassian's REST v3 reference at developer.atlassian.com is the final word on endpoints and payloads.
