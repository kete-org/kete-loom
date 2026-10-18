---
name: hipaa-compliance
description: Engineering rules for US HIPAA work on protected health information (PHI and ePHI), covering whether HIPAA applies, Security Rule safeguards such as role-based access, audit trails, encryption and automatic logoff, business associate agreements with cloud, email, SMS and AI vendors, the minimum necessary standard, de-identification, PHI-free logging, and breach readiness, with a clear not-legal-advice line. Use when building or reviewing a health, telehealth, clinic, pharmacy or insurance system in the US, choosing a vendor that will touch patient data, or scrubbing PHI from logs and analytics.
license: MIT
compatibility: Any Agent Skills host. Works on any codebase; no CLI needed. Rule detail lives in references/safeguards.md and must be checked against current HHS guidance.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# HIPAA compliance

Engineer a system that protects electronic protected health information (ePHI) by default: only the right people see it, every access is recorded, it never leaks into logs or vendors without a contract, and a breach can be scoped quickly.

## Boundary: this is not legal advice

- You help design and build safeguards. You do not decide whether the organisation is a covered entity or business associate, whether an incident is a reportable breach, or whether a vendor contract is adequate. The privacy officer, security officer or counsel decides.
- Say so once, plainly, when the user asks a legal question, and continue with the engineering.
- No code or vendor can make a system "HIPAA compliant" on its own. Never write that claim in code, docs or marketing copy.

## Step 1: does HIPAA apply, and to what data?

Ask the user, and **stop and ask** if the answer is unclear:

1. Is the organisation a covered entity (health plan, health care clearinghouse, or a provider that conducts standard electronic transactions such as claims), or a business associate (a vendor that creates, receives, keeps or sends PHI for one)? A consumer wellness app that patients use on their own, with no covered entity involved, is often outside HIPAA but may fall under other laws (for example the FTC Health Breach Notification Rule or state health privacy laws). Flag this to the user; do not decide it.
2. Which data is PHI: individually identifiable health information (past, present or future health, care, or payment for care) that is linked to an identifier. Names, dates (except year) tied to a person, phone, email, addresses below state level, record and account numbers, device ids, IPs, full-face photos and biometrics are all identifiers. `references/safeguards.md` lists the 18 Safe Harbor identifiers.
3. Data that has been de-identified by Safe Harbor or expert determination is not PHI. Treat it as PHI until someone has done that properly.

## Step 2: map where ePHI lives and flows

Search the codebase and infrastructure for ePHI: database tables, file storage, message queues, caches, search indexes, logs, error trackers, analytics, email and SMS, backups, exports, BI tools, support tooling and AI or LLM calls. Record each in a table:

| System | ePHI fields | Who can access | Encrypted at rest | Vendor | BAA in place |
|---|---|---|---|---|---|

This map feeds the organisation's risk analysis, which the Security Rule requires and which OCR most often finds missing.

## Step 3: vendors and business associate agreements

1. Every vendor that stores, processes or transmits ePHI for you needs a signed BAA before any ePHI reaches it. That includes cloud hosting, databases, email, SMS, video, error tracking, logging, analytics, support desks and AI APIs.
2. A vendor's BAA often covers only listed services or a specific plan. Check that the exact service and configuration you use is in scope.
3. If there is no BAA, **stop**: keep ePHI away from that vendor (strip it, or pick another vendor). Tell the user which integration is blocked and why.
4. Typical traps: client-side analytics or session replay on logged-in pages, crash reporters capturing request bodies, marketing pixels on appointment pages, and support tools that receive screenshots.

## Step 4: technical safeguards to build

Follow `references/safeguards.md` for the rule mapping. In code:

- **Access control**: unique user ids (no shared accounts), role-based access scoped to the patient relationship, an emergency ("break glass") access path that is logged and reviewed, automatic session timeout, and MFA for workforce and admin access.
- **Minimum necessary**: APIs return only the fields the role and task need. Lists show summaries; full records load on purpose. Internal tools mask identifiers by default.
- **Audit controls**: an append-only audit log of every create, read, update, delete and export of ePHI: actor id, patient or record id, action, timestamp, source IP, and reason for break-glass access. Store it apart from the app database, protect it from edits, and keep it for the retention period counsel sets (HIPAA documentation is kept six years; confirm what applies to logs).
- **Integrity**: validate input, use database constraints, and keep versions or history for clinical records instead of overwriting.
- **Transmission security**: TLS for every connection, including internal service calls and database connections. No ePHI in email or SMS bodies unless the organisation's policy allows it; send a "you have a new message" link instead.
- **Encryption at rest**: encrypt databases, volumes, object storage and backups, with keys in a managed key service and access to keys logged. Encryption is "addressable" under the current rule, but encrypted data is what lets a lost laptop or leaked bucket fall outside breach notification, so treat it as required.

## Step 5: logging and telemetry without PHI

- Log record ids and request ids, never names, dates of birth, diagnoses, notes, medications, insurance ids or free-text fields.
- Add a redaction layer to the logger, the error tracker (scrub request bodies, headers, query strings) and the APM agent. Test it with a fixture that contains fake PHI.
- URLs and analytics event names must not contain PHI (no `/patients/jane-doe/hiv-results`). Use opaque ids.
- Never paste real patient data into tickets, chat, prompts or test fixtures. Use synthetic data in every non-production environment.

## Step 6: breach readiness

- The Breach Notification Rule sets deadlines measured from discovery; see `references/safeguards.md`. Engineering must be able to answer quickly: what was accessed, whose records, from when to when.
- Keep audit logs queryable by patient and by actor, and keep a way to produce an affected-patient list with contact details.
- On a suspected incident: contain, preserve logs and snapshots, record the discovery time, and escalate to the security or privacy officer. Do not notify patients, regulators or the press yourself, and do not delete evidence.

## Never

- Never send ePHI to a vendor without a BAA, including "just for debugging".
- Never put ePHI in logs, URLs, analytics, push notification text or email subjects.
- Never use real patient data in development, testing, demos or AI prompts.
- Never weaken access checks for convenience (shared admin logins, disabled timeouts, wildcard roles).
- Never state that the system or a vendor "is HIPAA compliant" or "HIPAA certified" (there is no official certification).

## Report format

```
HIPAA engineering review: <system or feature>
Applies because: <covered entity / business associate, as stated by the user>
ePHI map: <path or inline table>
Findings (highest risk first):
  1. [High|Medium|Low] <safeguard> at <file:line or system>: <gap> -> <fix>
Vendors without a confirmed BAA: <list>
Questions for the privacy or security officer: <list>
Not checked: <systems you could not see>
This is engineering guidance, not legal advice.
```
