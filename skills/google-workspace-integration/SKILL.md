---
name: google-workspace-integration
description: Calls the Google Drive v3, Docs, Sheets and Slides REST APIs from application code, covering the choice between user OAuth, a service account and domain-wide delegation, the narrowest scopes (drive.file before restricted drive), files.list queries with shared-drive flags, documents and presentations batchUpdate requests applied in descending index order, Sheets A1 ranges with valueInputOption, and per-minute quotas handled with truncated exponential backoff on 429 and 403 rate errors. Use when code must create, read, fill or export Google Docs, Sheets, Slides or Drive files, a service account gets 403 or storageQuotaExceeded, or a Workspace sync hits rate limits.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to googleapis.com and a Google Cloud project with the APIs enabled. Examples use the official googleapis client libraries; the rules apply to raw REST too.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Google Workspace integration

Build Drive, Docs, Sheets and Slides automation that asks for the least access, acts as the right identity, survives quota limits and does not corrupt documents with misplaced indexes. For Cloud IAM, Cloud Run and other Google Cloud infrastructure use `gcp-patterns`; this skill is about Workspace content APIs.

## Ground rules

1. **Pick the identity first** (table below). It decides scopes, file ownership and whether an admin must be involved.
2. **Narrowest scope that works.** `drive.file` (only files the app created or the user opened with it) is non-sensitive; `drive`, `drive.readonly` and `drive.metadata*` are restricted and need Google's restricted-scope verification for a public app. Prefer `spreadsheets`, `documents` or `presentations` plus `drive.file` over full `drive`.
3. **Credentials stay out of code.** OAuth client secrets, refresh tokens and service account key JSON come from a secret store or environment. Prefer keyless service account auth (attached service account, Workload Identity Federation) over downloaded key files.
4. **Batch, and treat a batch as one unit.** Sheets, Docs and Slides `batchUpdate` apply all requests atomically: one invalid request means none apply. Each batch counts as one request against quota.
5. **Back off on rate errors.** Retry 429, and 403 with reason `userRateLimitExceeded` or `rateLimitExceeded`, plus 5xx, with truncated exponential backoff: wait `min(2^n seconds + random up to 1000 ms, 32 to 64 s)`, then give up after a bounded number of tries. Never retry 400, 401 or a 403 for permissions.
6. **Ask only for the fields you use.** Pass `fields` on Drive and Docs reads (`files(id,name,mimeType,modifiedTime),nextPageToken`); it cuts payload and latency.

## Choose the identity

| Situation | Use |
|---|---|
| Users act on their own files (an add-on, a "connect Google Drive" button) | OAuth 2.0 user consent, offline access for a refresh token, incremental scopes |
| A backend job owns its own documents or works in a team folder | Service account; give it access by sharing a **shared drive** or folder with its email |
| A Workspace org's backend must act as many users without each consenting | Service account with **domain-wide delegation**: a super admin authorises the client ID and an exact scope list in the Admin console (API controls); the code impersonates a user with `subject` |

Service accounts have no Drive storage of their own: creating files in a My Drive folder shared with them fails with `storageQuotaExceeded`. Put the work in a shared drive, or impersonate a real user with delegation. Cloud IAM roles do not grant access to Workspace files; sharing does.

## Implementation steps

1. **Project setup**: enable each API (Drive, Docs, Sheets, Slides) in the Google Cloud project, configure the OAuth consent screen with only the scopes you request, and create the OAuth client or service account.
2. **Auth client**: build it once and reuse it; the libraries refresh access tokens. For delegation, set the subject user per request and keep the scope list identical to the one the admin approved, or token requests fail with `unauthorized_client`.
3. **Drive**: find files with `files.list` and a `q` query; page with `pageToken` until `nextPageToken` is absent. For shared drives pass `supportsAllDrives=true` and `includeItemsFromAllDrives=true` (plus `corpora`/`driveId`), or results silently miss them. Create Google-native files by setting `mimeType` (for example `application/vnd.google-apps.document`). Export with `files.export` (10 MB cap on exported content). Query syntax and MIME types in `references/api.md`.
4. **Sheets**: read and write values with `spreadsheets.values.get/update/append/batchGet/batchUpdate`. Write with `valueInputOption` `RAW` (stored literally) or `USER_ENTERED` (parsed like typing: formulas, dates). Read with `valueRenderOption` `UNFORMATTED_VALUE` when you need numbers, not display strings. Formatting, new tabs and protected ranges go through `spreadsheets.batchUpdate`, which addresses sheets by numeric `sheetId`, not title. A1 rules in `references/api.md`.
5. **Docs**: `documents.get` returns a structure of elements with `startIndex`/`endIndex`; body text starts at index 1. In one `documents.batchUpdate`, order inserts and deletes from the highest index to the lowest so earlier edits don't shift later ones. For templates prefer `replaceAllText` on placeholders like `{{customer_name}}`. Pass `writeControl.requiredRevisionId` from your read to refuse a write if someone edited the doc in between.
6. **Slides**: copy a template deck with Drive `files.copy`, then `presentations.batchUpdate` with `replaceAllText` and `replaceAllShapesWithImage` (image must be a public PNG, JPEG or GIF URL). Custom `objectId`s are 5 to 50 characters and unique in the deck.
7. **Retries and idempotency**: wrap every call in the backoff helper. A retried create can make a second file, so before creating, search for an existing file by a stable name or an `appProperties` key you set, or generate IDs first with `files.generateIds` and create with that ID.
8. **Watch for changes** with `changes.watch` or `files.watch` push channels to an HTTPS endpoint, or poll `changes.list` with a saved `startPageToken`. Channels expire; renew them before expiry.

## Reviewing an existing integration

- Full `drive` scope where `drive.file` would do; scopes requested that no code uses.
- Service account key JSON committed or baked into an image.
- Service account writing into a personal My Drive (fails on storage quota), or files left owned by an employee who may leave.
- `files.list` without paging, without `fields`, or without shared-drive flags.
- Docs edits applied in ascending index order, or text located by hard-coded indexes from an old copy of the template.
- Sheets writes with `USER_ENTERED` on user-supplied text, so a value beginning with `=` becomes a live formula (formula injection); use `RAW` or prefix with `'`.
- One API call per cell or row in a loop instead of a batch; no backoff, or retrying non-retryable errors.

## Stop and ask the user

- Before requesting a restricted scope (`drive`, `drive.readonly`, Gmail) for an app other people will install; it triggers Google's verification and possibly a security assessment.
- Before setting up domain-wide delegation: it lets the service account act as any user for the approved scopes, and a super admin must approve it.
- Before bulk-changing sharing permissions, deleting files or emptying trash.

## Before you finish

Quotas, scope classifications and limits change (Drive moved to per-unit quotas for projects created from May 2026), so check the official limits page for each API at developers.google.com/workspace. Test with a throwaway spreadsheet, document and shared drive; confirm a forced 429 is retried and a 403 permission error is not; confirm a retried create does not leave a duplicate file.
