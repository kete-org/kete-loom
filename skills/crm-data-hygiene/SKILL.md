---
name: crm-data-hygiene
description: Audits and cleans CRM records in HubSpot, Salesforce or Pipedrive through their APIs - unowned and orphaned records, duplicate contacts, companies and deals with explicit match and survivor rules, unused or overlapping custom properties, broken lifecycle stages and stale pipelines - always taking a before snapshot, producing a dry-run change list for approval, executing in small rate-limited batches with a per-record log, and keeping a rollback path for every change, including merges that cannot be undone. Use when a CRM is full of duplicates or records with no owner, a sales or marketing ops person wants a data quality audit, property cleanup or bulk lifecycle fix, or before migrating or connecting a CRM to another system.
license: MIT
compatibility: Any Agent Skills host. Needs network access to the CRM's API and a token with read scopes for the audit and write scopes only for approved changes. Examples use curl; any HTTP client works.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "curl"
  kete-loom/owner: "Kete-org"
---

# CRM data hygiene

Clean a CRM without losing anyone's data or history. The audit is read-only; every write is planned, approved, batched, logged and reversible where the CRM allows it. Finding new prospects is `prospect-research`; writing outreach is `cold-outreach-sequences`.

## Ground rules

1. **Read-only first.** Run the audit with a read-scoped token. Ask for write scopes only after the change list is approved.
2. **Snapshot before any write.** Export every record and field you might touch (IDs, all properties, owner, associations) to a dated file. That file is the rollback source.
3. **Dry-run, then approve.** Produce the full change list (record ID, field, old value, new value, reason) and get the user's explicit yes. No "obvious" fixes outside the list.
4. **Small batches, logged.** Write in batches within the API's limits, back off on `429` using `Retry-After`, and log each record's result. Stop on an error rate above a few percent and report.
5. **Merges are one-way.** HubSpot and Pipedrive merges cannot be undone, and Salesforce merges delete the losing records. Merge only after a sample is reviewed by a person, and keep the snapshot of both sides.
6. **Personal data stays inside.** Snapshots hold personal data: store them where the user says, never in the repo, and delete them when the retention period agreed with the user ends.

## Workflow

### 1. Scope

Ask: which CRM and objects (contacts, companies or accounts, deals or opportunities, leads), which teams rely on what, any integrations writing to the CRM (forms, billing, support tools), and who approves changes. Integrations that keep re-creating duplicates must be fixed at the source, or cleanup will not last.

### 2. Audit (read-only)

Pull counts and samples for each check; endpoints per CRM in `references/crm-apis.md`.

| Check | How |
|---|---|
| Unowned records | owner empty, or owner is a deactivated user |
| Orphans | contacts with no company, deals with no contact or company |
| Duplicates | match rules below; report clusters and sizes |
| Missing key fields | email, company domain, country, lifecycle stage empty |
| Invalid values | malformed emails, phone formats, free-text in fields that should be picklists |
| Property sprawl | custom properties with fill rate under 5%, not used in any view, report, workflow or form; near-duplicate names |
| Lifecycle stages | records whose stage contradicts their data (customer with no closed-won deal, lead with paid invoices); stages that moved backwards |
| Stale pipeline | open deals past close date or untouched for N days |

Fill rates and duplicate counts come from the data, not estimates.

### 3. Match and survivor rules

Agree rules with the user and write them down before finding duplicates:

- **Contacts:** same normalised email (lowercase, trimmed) is a strong match; name plus company domain is a weak match for human review only. Never auto-merge on name alone.
- **Companies or accounts:** same normalised domain (strip `www.`, protocol, path); different country subsidiaries may be legitimately separate.
- **Deals:** almost never merge; flag duplicates for owners to resolve.
- **Survivor:** pick the record with the most activity or the oldest create date, as agreed; for each field, keep the survivor's value unless empty, then fill from the other. Note which system each CRM uses: in HubSpot the `primaryObjectId` is kept, in Pipedrive the `merge_with_id` record is kept, in Salesforce you set the master record and choose field values yourself.

### 4. Change list (dry-run)

Write a CSV or table: action (update, reassign owner, merge, archive property, change stage), object, record IDs, field, old value, new value, rule that triggered it. Summarise counts per action. Show 10 random rows per action for the user to check by hand.

### 5. Execute

1. Confirm snapshot exists and has the expected row counts.
2. Start with a pilot batch (10 to 20 records), verify them in the CRM UI, then continue.
3. Batch sizes: HubSpot v3 batch endpoints take up to 100 records; Salesforce sObject Collections up to 200; Pipedrive one record per call. Merge one pair (or Salesforce trio) per call.
4. Log every record: ID, action, status, error text.
5. Archive properties only after confirming no workflow, form, report or integration uses them; archiving rather than deleting where the CRM offers it.

### 6. Verify and roll back

Re-run the audit checks and compare with the first run. To roll back field changes, write the snapshot's old values back. For merges, rollback means re-creating the losing record from the snapshot; associations and activity history may not fully return, which is why merges get the most review.

## Stop and ask the user

- Before requesting write scopes, and before every execution phase.
- Before any merge, any bulk owner change, and before archiving properties.
- When duplicates involve customers with open invoices or contracts.
- When the CRM holds data under a deletion request or legal hold.

## Never

- Delete records as a "cleanup" without an explicit request; archive or flag instead.
- Change lifecycle stages backwards in bulk; most CRMs and workflows treat that specially.
- Run writes from an unreviewed script against production without a pilot batch.

## Report format

```
CRM: <system, portal or org>   Objects: <...>   Snapshot: <path, row counts>
Audit: <check - count - sample IDs>
Rules agreed: <match rules, survivor rule>
Change list: <action - count>   Approved by: <name, date>
Executed: <action - succeeded / failed>   Errors: <top causes>
After-audit: <check - before -> after>
Rollback: <how, from which file>
```
