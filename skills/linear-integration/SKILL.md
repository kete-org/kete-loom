---
name: linear-integration
description: Talks to Linear's GraphQL API at api.linear.app/graphql with the @linear/sdk or raw queries, covering personal API keys versus OAuth 2.0 apps (actor=app, 24-hour access tokens with refresh, client credentials), querying and mutating issues, projects, cycles, teams and workflow states, Relay-style first/after cursor pagination, Linear-Signature HMAC webhook checks with the webhookTimestamp replay window, and request plus complexity rate limits reported as RATELIMITED errors. Use when building a Linear sync, bot or agent, creating or moving Linear issues from code, receiving Linear webhooks, or fixing Linear auth, paging or rate-limit problems.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to api.linear.app. Examples use TypeScript and the official @linear/sdk; raw GraphQL works from any language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Linear integration

Build a Linear integration that uses the right credential, asks GraphQL only for what it needs, pages through every result, trusts only signed webhooks, and stays within both the request and complexity budgets.

## Ground rules

1. **One endpoint:** `POST https://api.linear.app/graphql`, JSON body `{ "query": ..., "variables": ... }`. Explore the schema with Linear's API explorer or introspection; do not guess field names.
2. **Credentials from the environment** (`LINEAR_API_KEY`, OAuth client secret, webhook signing secret). Never commit or log them.
3. **Look up IDs, never hard-code them.** Team, workflow state, label, project and cycle IDs differ per workspace. Fetch them once and cache.
4. **Errors arrive in the body.** A GraphQL response can be HTTP 200 or 400 with an `errors` array. Always check `errors` and each mutation's `success` field.
5. **Ask only for the fields you use**; every field and nested connection adds complexity points.

## Choose the auth

| Situation | Use |
|---|---|
| Personal script or internal tool, acting as you | Personal API key, sent as `Authorization: <API_KEY>` (no `Bearer`) |
| App other users or workspaces install | OAuth 2.0, `Authorization: Bearer <access token>` |
| Bot or agent whose actions show as the app, not a person | OAuth with `actor=app` |
| Server-to-server for your own workspace without a user | OAuth client credentials grant (enable it on the app first) |

### OAuth 2.0

1. Create an OAuth app in Linear's settings; set redirect URIs.
2. Redirect to `https://linear.app/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=read,write&state=...` (add `&actor=app` for app actor). Scopes: `read` (always), `write`, `issues:create`, `comments:create`, `timeSchedule:write`, `admin`. Request `admin` only if the user confirms it is needed.
3. Exchange the code at `POST https://api.linear.app/oauth/token`. Access tokens last 24 hours; refresh with `grant_type=refresh_token` and store the new refresh token each time.
4. Client credentials tokens last 30 days, have no refresh token, and are invalidated when the client secret is rotated; request a new one on 401.
5. Revoke on disconnect: `POST https://api.linear.app/oauth/revoke`.

## Common operations

```ts
import { LinearClient } from '@linear/sdk';
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY }); // or { accessToken } for OAuth

const team = (await linear.teams({ filter: { key: { eq: 'ENG' } } })).nodes[0];
const done = (await team.states({ filter: { type: { eq: 'completed' } } })).nodes[0];

const res = await linear.createIssue({ teamId: team.id, title: 'Checkout 500s', description: 'Markdown body', priority: 2 });
if (!res.success) throw new Error('issueCreate failed');
const issue = await res.issue;
await linear.updateIssue(issue.id, { stateId: done.id });
```

Raw GraphQL equivalents: `issueCreate(input: IssueCreateInput!)`, `issueUpdate(id:, input:)`, `commentCreate(input:)`, and queries `issues(filter:)`, `issue(id:)` (accepts the UUID or the identifier such as `ENG-123`), `projects`, `cycles`, `teams`, `workflowStates`.

- **Workflow states** belong to a team and have a `type` (`triage`, `backlog`, `unstarted`, `started`, `completed`, `canceled`). Move issues by choosing a state of the target type in that issue's team, not by state name across teams.
- **Priority** is an integer: 0 none, 1 urgent, 2 high, 3 medium, 4 low.
- **Descriptions and comments** are Markdown.
- **Projects** span teams; set `projectId` on the issue. **Cycles** are per team; set `cycleId` to a cycle of the issue's team (find the active one via the team's `activeCycle`).
- **Filtering** happens on the server: `issues(filter: { team: { key: { eq: "ENG" } }, state: { type: { nin: ["completed", "canceled"] } }, updatedAt: { gt: $since } })`. Never fetch everything and filter client-side.
- **Idempotency:** Linear has no idempotency key. Store your external ID (for example in an attachment URL or your own table) and check before creating. Attachments with the same URL on one issue are deduplicated, which makes `attachmentCreate` a good link-back anchor.

## Pagination

- Connections are Relay-style: `first` / `after` (or `last` / `before`), returning `nodes` and `pageInfo { hasNextPage endCursor }`. Default page size is 50.
- Loop: pass `endCursor` as `after` while `hasNextPage` is true. In the SDK, `connection.fetchNext()` appends the next page.
- Default order is `createdAt`; use `orderBy: updatedAt` for incremental sync, and store the last `updatedAt` you processed.
- Avoid nested connections inside a paged list (issues, each with all comments, each with all reactions); page the inner data separately. Nested pages multiply complexity.

## Webhooks

1. Create the webhook in workspace settings (or with the `webhookCreate` mutation, admin scope), choosing resource types (Issue, Comment, Project, Cycle and others). Note its signing secret.
2. Verify every request: `Linear-Signature` is the hex HMAC-SHA256 of the **raw** body with the signing secret. Compute it before parsing JSON; compare with a constant-time function.
3. Reject replays: `webhookTimestamp` in the body (milliseconds) must be within about one minute of now.
4. Respond `200` within 5 seconds and process from a queue. Linear retries failures up to 3 times (after 1 minute, 1 hour and 6 hours) and may disable a webhook that keeps failing.
5. Route on `type` and `action` (`create`, `update`, `remove`); for updates, `updatedFrom` holds the previous values. Ignore changes your own integration made (compare `actor`) to avoid loops.
6. Payloads may be stale by the time you process them; re-query the issue if you need current state.

## Rate limits

Per hour (check the docs, they change): API key 2,500 requests and 3,000,000 complexity points per user; OAuth app 5,000 requests and 2,000,000 points per user or app user; unauthenticated 600 requests per IP. A single query over 10,000 complexity points is rejected.

- Read `X-RateLimit-Requests-Remaining`, `X-RateLimit-Complexity-Remaining` and `X-Complexity` (this query's cost). Reset headers are UTC epoch **milliseconds**.
- When limited, Linear returns HTTP 400 with `errors[].extensions.code == "RATELIMITED"`. Wait until the relevant reset time, then retry with backoff and a retry cap. Do not treat every 400 as a rate limit; check the code.
- Lower cost: smaller `first`, fewer fields, no deep nesting, filters instead of scans, webhooks instead of polling.

## Stop and ask the user

- Before bulk updates, moves or archiving across many issues; show the filter and the count first.
- Before requesting the `admin` scope or creating workspace-wide webhooks.
- Before an agent or bot acts as a person (`actor=user`) rather than as the app.

## Before you finish

Test against a test workspace or team: a list longer than one page, an issue created and moved to a completed state in its own team, a duplicate create (no second issue), a webhook with a bad signature and one with a stale `webhookTimestamp` (both rejected), and a `RATELIMITED` response handled with a wait. Linear's developer docs at linear.app/developers are the final word on schema and limits.
