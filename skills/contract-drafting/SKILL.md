---
name: contract-drafting
description: Assembles first-draft commercial agreements, namely master services agreements, NDAs, statements of work and GDPR-style data processing agreements, by filling the organisation's own clause template from a structured term sheet, logging every departure from the standard position in a deviation register with its risk and approver, and producing a plain-language redline summary, with a mandatory gate that a qualified lawyer reviews the draft before anyone signs or sends it. Use when you need a first draft of an MSA, NDA, SOW or DPA from your template and agreed terms, when the other side's paper must be compared against your playbook, or when preparing a summary of changes for legal sign-off.
license: MIT
compatibility: Any Agent Skills host. Works on the user's templates and documents (Markdown, plain text or .docx through the host's document tools). Not legal advice; every output is a draft for a qualified lawyer to review.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Contract drafting

Produce a clean draft that says exactly what was agreed, in the organisation's own approved language, and make every deviation visible so a lawyer can review the draft quickly. You assemble and flag; you never decide that a term is legally acceptable.

## Lawyer-review gate (mandatory)

Every output from this skill is marked `DRAFT - FOR LEGAL REVIEW - NOT FOR SIGNATURE`. Keep that marking until the user confirms a qualified lawyer has approved the draft. **Never** remove it, send the draft to the counterparty, or call it final on your own.

**Stop and tell the user a lawyer must handle it** (do not draft the clause yourself) when:

- There is no approved template for the agreement type or the clause, and the user asks you to write legal terms from scratch.
- The governing law, jurisdiction or a party's country is one the template was not written for.
- The deal touches regulated areas: personal data transfers outside the EEA/UK, health data, financial services, export-controlled goods, employment, consumer contracts, government contracts, or competition-sensitive terms (exclusivity, non-competes, pricing between competitors).
- The term sheet asks for unlimited liability, an uncapped indemnity, IP assignment of the organisation's core IP, or a change to any clause the template marks "non-negotiable".

## 0. Gather inputs

1. The template: the organisation's own clause library or standard form for this agreement type, with its version. If the user has none, see the gate above.
2. The playbook, if there is one: preferred position, acceptable fallbacks and walk-away for each key clause.
3. The term sheet, as structured fields. The field list per agreement type is in `references/term-sheets.md`. Ask for every missing required field; never fill a commercial term with a guess.
4. The counterparty's draft or redline, if you are comparing their paper against yours.

## 1. Assemble the draft

1. Copy the template; do not rewrite its clauses for style. Approved language is approved because it was reviewed.
2. Fill placeholders from the term sheet only. Party names must be full legal names with entity type and registration details as the user supplied them.
3. Keep defined terms consistent: every capitalised term is defined once and used with the same spelling. Check that every cross-reference points to a clause that exists after edits.
4. Keep the document order the template uses. Schedules (SOW, pricing, DPA, service levels) attach to the master agreement and the order-of-precedence clause says which wins on conflict.
5. Where the term sheet asks for something the template does not say, do not invent wording. Insert `[DEVIATION D-n: <what is requested>]` and log it.

## 2. Deviation register

Log every place the draft differs from the template or the playbook's preferred position:

```
ID | clause | standard position | requested / drafted position | why (business reason) | risk (low | medium | high) | playbook fallback? | approver needed | status
```

Rules for the risk rating:

- High: liability caps, indemnities, IP ownership, data protection, termination for convenience, exclusivity, governing law, anything outside the playbook.
- Medium: payment terms, warranties, service levels and credits, acceptance, notice periods, renewal.
- Low: dates, contact details, administrative wording.

When comparing the counterparty's paper, log each of their changes the same way, with the playbook position next to it.

## 3. Redline summary

For the reviewer, in plain language, ordered by risk:

1. One paragraph: deal, parties, agreement type, template version, governing law.
2. A table of deviations (from the register), high risk first, each with one sentence on what it means in practice ("we would owe them up to 12 months of fees if a data breach is our fault").
3. Missing information and open questions.
4. Clauses that need specialist review (data protection, tax, export, employment).

Produce a tracked-changes or comparison document against the template when the host's document tools allow it; otherwise list changes clause by clause.

## 4. Agreement-type checks

Before handing over, run the checklist for the agreement type in `references/term-sheets.md`. Short version:

- **NDA:** mutual or one-way; definition of confidential information and exclusions; permitted use and disclosees; term and survival; return or destruction; no licence granted; remedies.
- **MSA:** scope and order of precedence; fees, invoicing and payment; warranties; liability cap and exclusions; indemnities; IP ownership and licences; confidentiality; data protection hook to a DPA; term, renewal and termination; insurance; governing law and disputes.
- **SOW:** deliverables, milestones, acceptance criteria and process, assumptions, dependencies, change control, fees per milestone, named contacts; nothing in the SOW silently overrides the MSA.
- **DPA (GDPR Article 28):** the Article 28(3) contents must be present: subject matter, duration, nature and purpose, types of personal data and data subjects, and the processor obligations (documented instructions, confidentiality, security, sub-processors, assistance with data subject rights and with security and impact assessments, deletion or return, audit). International transfers need a transfer mechanism such as the EU Standard Contractual Clauses (2021) or the UK addendum; route those to a privacy lawyer and the `privacy-compliance` skill.

## Rules

- Never remove the draft marking or send the draft outside the organisation without the user confirming lawyer approval.
- Never invent a commercial term, party detail or legal clause that is not in the template, playbook or term sheet.
- Never silently change approved template language; every change is a logged deviation.
- Do not give an opinion on whether a clause is enforceable; say it needs a lawyer.
- Keep counterparty documents confidential; do not paste them into external services the user has not approved.

## Report

```
Draft: <file> | type <NDA | MSA | SOW | DPA> | template <name, version> | status DRAFT - FOR LEGAL REVIEW
Parties: <legal names>   Governing law: <law>
Deviations: <n high, n medium, n low>  (register attached)
Missing inputs: <list>
Specialist review needed: <data protection, tax, export, employment, none>
Next step: lawyer review by <name or role, if the user named one>
```
