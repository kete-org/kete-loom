# CRM API reference for hygiene work

Field names, versions and limits change. Check each vendor's current docs and your plan's limits before running writes.

## HubSpot

- Auth: private app or OAuth access token, `Authorization: Bearer <token>`. Scopes such as `crm.objects.contacts.read` for the audit; `.write` only for execution.
- List: `GET /crm/v3/objects/contacts?limit=100&properties=email,hubspot_owner_id,lifecyclestage&after=<cursor>`; page with `paging.next.after`.
- Search: `POST /crm/v3/objects/contacts/search` with `filterGroups` (for example `hubspot_owner_id` `NOT_HAS_PROPERTY`). The search API has its own, lower rate limit and a cap on total results per query; split by date ranges for large portals.
- Owners: `GET /crm/v3/owners` (include archived owners to find records owned by deactivated users).
- Properties: `GET /crm/v3/properties/contacts` lists definitions; fill rates need a search or export.
- Batch: `POST /crm/v3/objects/contacts/batch/update` with `{"inputs":[{"id":"...","properties":{...}}]}`, up to 100 records per request.
- Merge: `POST /crm/v3/objects/contacts/merge` with `{"primaryObjectId":"...","objectIdToMerge":"..."}` (same pattern for companies, deals, tickets). Newer date-versioned paths also exist. HubSpot states merges cannot be undone.
- Rate limits: per-app burst limit per 10 seconds and a daily limit per account, both depending on subscription tier. `429` on excess.

## Salesforce

- Auth: OAuth 2.0 (connected or external client app); `Authorization: Bearer <token>`, instance URL from the token response.
- Query: `GET /services/data/vXX.X/query?q=<SOQL>`, follow `nextRecordsUrl`. Example: `SELECT Id, Email, OwnerId, Owner.IsActive FROM Contact WHERE Owner.IsActive = false`.
- Large exports: Bulk API 2.0 query jobs.
- Duplicate tooling: matching rules and duplicate rules in Setup; prefer them for ongoing prevention.
- Update: `PATCH /services/data/vXX.X/composite/sobjects` with `{"allOrNone":false,"records":[{"attributes":{"type":"Contact"},"id":"...","Field__c":"..."}]}`, up to 200 records.
- Merge: up to three records of the same type (Lead, Contact, Account, and some others) via the SOAP API `merge()` call or Apex `Database.merge(master, duplicates)`. Losing records are deleted (recoverable from the Recycle Bin for a limited time); related records are reparented to the master.
- Limits: org-wide daily API request allocation by edition and licences; check `GET /services/data/vXX.X/limits`.

## Pipedrive

- Auth: API token (`x-api-token` header) or OAuth.
- API v2 covers persons, organizations and deals with cursor pagination (`cursor`, `limit`); many v1 endpoints are being retired, so check the migration guide.
- Fields: `GET /v1/personFields`, `/v1/organizationFields`, `/v1/dealFields` list custom fields (check for v2 equivalents).
- Update: v2 uses `PATCH /api/v2/persons/{id}`; one record per call.
- Merge: `PUT /v1/persons/{id}/merge` with `{"merge_with_id": <id>}`; the `merge_with_id` record survives and keeps its values where both have data; the other record's conflicting values are lost. Organizations and deals have equivalent merge calls.
- Rate limits: token-based budget per company plan; respect `429` and `Retry-After`.
