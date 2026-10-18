---
name: privacy-compliance
description: Turns data protection law (EU/UK GDPR, Ghana Data Protection Act 2012, Nigeria Data Protection Act 2023, Kenya Data Protection Act 2019) into engineering work on personal data, covering data mapping, lawful basis and consent records, retention and deletion jobs, subject access and erasure requests, cross-border transfers to cloud vendors, and breach notice timelines. It is engineering guidance, not legal advice. Use when a feature collects or shares personal data, when adding consent banners or account deletion, when answering a data subject request, or when preparing for a privacy audit in Europe or Africa.
license: MIT
compatibility: Any Agent Skills host. Works on any codebase; no CLI needed. Statutory detail lives in references/jurisdictions.md and must be checked against the regulator's current text.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Privacy compliance

Build systems that know what personal data they hold, why they hold it, where it goes and how to delete it. Most privacy failures are engineering failures: data nobody mapped, logs nobody purged, a vendor nobody listed.

## Boundary: this is not legal advice

- You help with design and code. You do not decide whether processing is lawful, which law applies, or whether a breach must be reported. A lawyer or the organisation's data protection officer (DPO) decides those.
- Say this once, plainly, when the user asks a legal question, then carry on with the engineering work.
- **Stop and ask the user** who their DPO or privacy counsel is before you write a privacy notice, a consent text, a breach notice, or a reply to a regulator. Draft it for their review; never present it as final.

## Step 1: find out which laws are in play

Ask, or find in the codebase and docs:

1. Where the organisation is established, and where its users live (GDPR, for example, reaches non-EU companies that target people in the EU).
2. Which countries the data is stored or processed in (cloud regions, vendors, support teams).
3. Whether it processes special categories: health, biometrics, religion, ethnicity, sexual life, children's data, financial or national ID numbers. These raise the bar everywhere.
4. Whether the processing is high risk (large-scale special category data, profiling, systematic monitoring, new tech such as biometrics). GDPR and the Nigerian and Kenyan Acts all expect a data protection impact assessment (DPIA) for this. **Stop and ask the user** whether a DPIA exists before building such a feature; offer to supply the data map and controls for it.

Then read `references/jurisdictions.md` for the regulator, registration duty, breach clock and transfer rules of each law. If the user's country is not listed, say so and do not guess its rules.

## Step 2: map the data

Search the codebase for personal data before changing anything. Look at:

- Database schemas and migrations (names, emails, phone numbers, addresses, IPs, device IDs, national IDs such as Ghana Card or NIN, location, photos).
- API request and response types, form fields, analytics events, logs, error trackers, backups, data warehouse exports, queues and caches.
- Every third-party SDK or API the data reaches (email, SMS, payments, analytics, crash reporting, AI APIs).

Write the map as a table and keep it in the repo (for example `docs/privacy/data-map.md`):

| Data item | Where stored | Purpose | Lawful basis | Retention | Shared with (country) |
|---|---|---|---|---|---|

A row with an empty purpose is a finding: data with no purpose should not be collected. This table is also the core of a GDPR Article 30 record of processing.

## Step 3: lawful basis and consent

1. Every purpose needs one lawful basis. The usual six are consent, contract, legal obligation, vital interests, public task and legitimate interests; the African laws use the same family of grounds. Record the basis per purpose, not per user.
2. Use consent only when the user has a real choice. If the service cannot work without the data, the basis is usually contract, not consent.
3. When consent is the basis, build it properly:
   - Opt-in, unticked by default, separate for each purpose (marketing email, analytics, personalised ads).
   - Store a consent record: user id, purpose, the text or version shown, timestamp, channel, and withdrawal timestamp.
   - Withdrawal must be as easy as giving consent and must stop the processing (unsubscribe the list, stop the analytics tag).
   - Non-essential cookies and trackers load only after consent. Check that the tag manager actually waits.
4. Children: if the product may be used by children, **stop and ask the user** for the age threshold their counsel has set, and build age checks and parental consent to that rule.

## Step 4: minimise and protect

- Collect only the fields the purpose needs. Drop "nice to have" fields such as date of birth when an over-18 checkbox will do.
- Never write personal data into logs, URLs, analytics event names or error messages. Log user ids, not emails or phone numbers. Add a redaction filter to the logger and the error tracker.
- Encrypt in transit (TLS) and at rest. Put national IDs and special category data in separate columns or tables with stricter access.
- Use pseudonymous ids in analytics and data warehouses.
- Restrict production data access by role, and keep an audit log of who read or exported personal data.
- Never copy production personal data into development, test or staging. Use synthetic or masked data.

## Step 5: retention and deletion

1. Give every data item a retention period with a reason (for example "invoices: as long as tax law requires; ask finance for the number").
2. Build a scheduled deletion or anonymisation job per table. Make it idempotent, log counts (not contents), and alert when it fails.
3. Account deletion must reach every copy: primary database, search index, caches, object storage, analytics, the CRM and email vendors (via their deletion APIs), and backups. Backups may age out on their normal cycle if restores re-apply deletions; record that rule.
4. Where you must keep records (tax, fraud, legal holds), keep the minimum, restrict access, and document why.
5. Test deletion: create a user, use every feature, delete the account, then search every store for their id and email.

## Step 6: data subject requests

Build one internal workflow that handles access, correction, deletion, objection and portability requests:

1. Verify identity using what you already hold (signed-in session, email or SMS code). Do not demand new documents you would then have to store.
2. Log the request with a received timestamp and a due date from the applicable law (see `references/jurisdictions.md`).
3. Access and portability: export the user's data from every system in the data map as JSON or CSV, with a readable summary.
4. Deletion: run the Step 5 deletion path, then confirm to the user what was deleted and what was kept and why.
5. Keep a record that the request was handled, without keeping the exported data.

## Step 7: cross-border transfers and vendors

- For each vendor in the data map, record its processing country and the contract that covers it (a data processing agreement, and for transfers a recognised mechanism such as an adequacy decision or standard contractual clauses).
- Prefer cloud regions in the user's country or region when the law or the customer demands it. Check `references/jurisdictions.md` for transfer limits, and **stop and ask the user** before moving data to a new country.
- Sending personal data to an AI or LLM API is a transfer to a processor. Check its data retention and training terms, and strip identifiers you don't need.

## Step 8: breach readiness

- Breach clocks are short (72 hours to the regulator is common). Build for it before it happens:
  - Audit logs that show what data was accessed, by whom, and when.
  - An incident runbook naming who decides on notification (DPO or counsel, not the engineer on call).
  - A way to list affected users and their contact details quickly.
- On a suspected breach: contain it, preserve logs, record the time the organisation became aware, and escalate to the decision maker immediately. Do not delete evidence, contact users, or post publicly unless that person tells you to.

## Never

- Never claim a system "is GDPR compliant" or "is NDPA compliant". Say what controls exist and what gaps remain.
- Never invent statute numbers, deadlines or fines. If it's not in `references/jurisdictions.md` and you can't check the official text, say it is unknown.
- Never ship pre-ticked consent boxes, dark-pattern banners, or tracking that fires before consent.
- Never log, export or paste real user personal data into tickets, prompts or chat while doing this work.

## Report format

When reviewing a codebase or feature, return:

```
Privacy review: <feature or repo>
Laws considered: <list, with why>
Data map: <path to table, or inline table>
Findings (highest risk first):
  1. [High|Medium|Low] <what> at <file:line or system>: <why it matters> -> <fix>
Gaps needing legal input: <questions for the DPO or counsel>
Not checked: <systems or vendors you could not see>
This is engineering guidance, not legal advice.
```
