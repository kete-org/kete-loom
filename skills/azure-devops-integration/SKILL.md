---
name: azure-devops-integration
description: Drives Azure DevOps Services (dev.azure.com) from scripts and services through its REST API and the az devops CLI extension - Boards work items queried with WIQL and fetched in batches of 200, created and updated with JSON Patch, Azure Repos branches and pull requests with reviewers, votes and linked work items, Azure Pipelines runs, logs and artifacts - choosing Microsoft Entra ID tokens, managed identities or service principals over personal access tokens, pinning api-version, and handling continuation tokens, the 20,000-result WIQL limit and TSTU-based throttling. Use when automating Azure Boards, Azure Repos or Azure Pipelines, writing a WIQL query, triggering or reading a pipeline run from code, or fixing 401, 203 or 429 responses from the Azure DevOps API.
license: MIT
compatibility: Any Agent Skills host. Needs network access to dev.azure.com, and the Azure CLI with the azure-devops extension for CLI use. Azure DevOps Server (on-premises) has the same API shapes under its own collection URL but supports different api-versions and auth.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "az, curl"
  kete-loom/owner: "Kete-org"
---

# Azure DevOps integration

Automate Boards, Repos and Pipelines with the least-privileged identity, explicit API versions, and code that pages, throttles and retries correctly. Deploying Azure infrastructure is the `azure-patterns` skill; pipeline YAML for GitHub is `github-actions-ci`; Jira and Linear have their own skills.

## Ground rules

1. **Pick auth by who is calling** (details in `references/api.md`):
   - Pipeline step: the job's `System.AccessToken`, or an Azure DevOps service connection with workload identity federation.
   - Service on Azure: a managed identity added to the organization as a user with the right access level.
   - Service elsewhere: a service principal (workload identity federation or certificate), added to the organization.
   - Person running a one-off: `az login`, then `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798`.
   - PAT only when nothing above works: shortest expiry, narrowest scopes (`vso.work`, `vso.code`, `vso.build`), one org. Microsoft recommends Entra tokens over PATs, and many orgs restrict PAT creation.
2. **Secrets from the environment** (`AZURE_DEVOPS_EXT_PAT` for the CLI); never in code, logs, or pipeline YAML.
3. **Always send `api-version`.** Pin a GA version (for example `7.1`); `-preview` versions can change without notice.
4. **Bound every query.** A WIQL query that would match more than 20,000 work items fails with `VS402337`, and slow queries can time out; filter by project, area path, `[System.ChangedDate]` and state, or split by ID or date range.
5. **Respect throttling.** Read `Retry-After` and the `X-RateLimit-*` headers; slow down before you hit `429`.
6. **Dry-run bulk writes.** For work item creates and updates, `validateOnly=true` checks rules without saving. Show the planned changes before running them for real.

## Work items (Azure Boards)

1. Query IDs with WIQL: `POST https://dev.azure.com/{org}/{project}/_apis/wit/wiql?api-version=7.1` with `{"query": "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.State] <> 'Closed' AND [System.ChangedDate] >= @today - 7"}`. The result has IDs only.
2. Fetch fields in chunks of at most 200 IDs: `GET /{org}/{project}/_apis/wit/workitems?ids=1,2,3&fields=System.Title,System.State&api-version=7.1` (or the `workitemsbatch` POST, which takes `ids` and `fields` in the body).
3. Create: `POST /{org}/{project}/_apis/wit/workitems/$Bug?api-version=7.1`, content type `application/json-patch+json`, body `[{"op":"add","path":"/fields/System.Title","value":"..."}]`. Use reference names (`System.Title`, `Microsoft.VSTS.Common.Priority`), not display names; list them with `GET /_apis/wit/fields`.
4. Update: `PATCH /_apis/wit/workitems/{id}` with JSON Patch. Add `{"op":"test","path":"/rev","value":<rev>}` first to fail instead of overwriting someone else's change.
5. Link: add to `/relations/-` with `rel` such as `System.LinkTypes.Hierarchy-Reverse` (parent) and the target work item URL.
6. State changes follow the process's workflow; read the allowed states and `transitions` from the work item type definition (`GET /{org}/{project}/_apis/wit/workitemtypes/{type}?api-version=7.1`). Avoid `bypassRules=true`; it needs special permission and skips the team's rules.
7. Idempotency: the API has none. Tag or store your external ID in a field and query for it before creating.

## Repos and pull requests

- List repos: `GET /{org}/{project}/_apis/git/repositories`.
- Create a PR: `POST /_apis/git/repositories/{repoId}/pullrequests` with `sourceRefName` and `targetRefName` as full refs (`refs/heads/feature/x`), `title`, `description`, `reviewers: [{id}]`, `isDraft`, and `workItemRefs: [{id}]` to link work items.
- Votes: 10 approve, 5 approve with suggestions, 0 none, -5 waiting for author, -10 reject.
- Comments are threads: `POST .../pullRequests/{id}/threads`.
- Completing a PR respects branch policies; do not set `bypassPolicy` unless the user explicitly asks and has the permission.

## Pipelines

- Queue a run: `POST /{org}/{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1` with `resources.repositories.self.refName`, `templateParameters`, `variables`. `previewRun: true` returns the expanded YAML without running.
- Poll `GET .../pipelines/{pipelineId}/runs/{runId}` until `state` is `completed`, with growing intervals; read `result`.
- Logs: `GET /_apis/build/builds/{buildId}/logs` lists log IDs; `.../logs/{logId}?startLine=&endLine=` fetches part of one. The run ID is the build ID.
- Failed step detail: `GET /_apis/build/builds/{buildId}/timeline` shows each record's `result` and its `log.id`.

## az devops CLI

```bash
az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/contoso project=Web
az boards query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
az boards work-item create --type Bug --title "Login fails on Safari"
az repos pr create --source-branch feature/x --target-branch main --title "..." --work-items 123
az pipelines run --name web-ci --branch main
az devops invoke --area wit --resource fields   # any REST call, auth handled
```

## Errors

| Response | Usual cause |
|---|---|
| `203` with an HTML sign-in page | Credentials not accepted (wrong PAT encoding, expired token); treat as auth failure |
| `401` | Expired or wrong-audience token; PAT revoked or org policy blocks PATs |
| `403` / `TF401019` style errors | Identity lacks permission or access level for that project or repo |
| `400` on a work item | Field reference name wrong, required field missing, invalid state transition; read the message |
| `409` / `412` | Revision conflict; re-read and retry |
| `429` / `TF400733` | Throttled; wait `Retry-After`, reduce concurrency |
| `VS402337` | WIQL matched more than 20,000 work items; narrow or split the query |

## Stop and ask the user

- Before any bulk create, update, state change or PR completion.
- Before using `bypassRules`, `bypassPolicy` or `suppressNotifications`.
- Before creating a PAT or adding a service principal to the organization.

## Before you finish

Test against a scratch project first. Confirm paging (a query that returns more than one page), throttling handling (honours `Retry-After`), and that no token appears in output or logs.
