# Azure DevOps API details

Base URL: `https://dev.azure.com/{organization}`. Some services use their own host (for example `vssps.dev.azure.com` for identities and graph). Check the REST reference for each area.

## Authentication

| Caller | Header | Notes |
|---|---|---|
| Entra user token | `Authorization: Bearer <token>` | `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv`; lasts about an hour |
| Managed identity / service principal | `Authorization: Bearer <token>` | Acquire with Azure Identity or MSAL for scope `499b84ac-1321-427f-aa17-267ca6975798/.default`; the identity must be added to the organization with an access level and permissions |
| Pipeline job | `Authorization: Bearer $(System.AccessToken)` | Map it into the step's environment explicitly; its permissions are the build service identity's |
| PAT | `Authorization: Basic base64(":" + PAT)` | Empty user name, colon, PAT. Narrow scopes and short expiry |

Legacy Azure DevOps OAuth apps are deprecated and new registrations closed; use Microsoft Entra ID OAuth for user-delegated apps.

## Paging

- Many list endpoints accept `$top` and `$skip` (pull requests, for example).
- Others return an `x-ms-continuationtoken` response header; send it back as `continuationToken=` until the header is absent. Check each endpoint's reference for which style it uses.
- WIQL: no paging. A query matching more than 20,000 work items fails with `VS402337`; split it by `[System.Id]` range or date window. `$top` caps how many IDs come back.
- Work item fetch: 200 IDs per request.

## Throttling headers

| Header | Meaning |
|---|---|
| `Retry-After` | Seconds to wait before the next request |
| `X-RateLimit-Resource` | Which threshold was hit (show to a human; don't parse) |
| `X-RateLimit-Delay` | How long this request was delayed |
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` | TSTUs allowed and left before delays |
| `X-RateLimit-Reset` | Unix time when usage would return to zero |
| `X-RateLimit-Cost` | If present, TSTUs this request used; log it to find expensive calls |

`Retry-After` can arrive on a `200` response while requests are only being delayed; honour it anyway. The global limit is 200 TSTUs (throughput units) per identity in a sliding five-minute window; each pipeline has its own 200 TSTU budget. Heavy WIQL queries cost the most.

## Useful WIQL patterns

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] IN ('Bug', 'User Story')
  AND [System.AreaPath] UNDER 'Web\Checkout'
  AND [System.ChangedDate] >= @today - 30
ORDER BY [System.ChangedDate] DESC
```

- `@me`, `@today`, `@project`, `@currentIteration` macros.
- `UNDER` for area and iteration paths; `CONTAINS WORDS` for full-text on long text fields.
- Link queries: `FROM WorkItemLinks WHERE ([Source].[System.WorkItemType] = 'Feature') AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') MODE (Recursive)`.
- Build queries from validated values; escape single quotes by doubling them.

## Service hooks (webhooks)

Project settings or `POST /_apis/hooks/subscriptions` deliver events (work item updated, PR created, build completed) to your URL. Protect the receiver with basic auth or a secret header configured on the subscription, acknowledge quickly, and dedupe on the event `id`; payloads can be stale, so re-fetch the resource if you need current state.
