---
name: quality-nonconformance
description: Nonconformance report (NCR) and corrective and preventive action (CAPA) workflow for regulated manufacturing such as medical devices under FDA's Quality Management System Regulation (21 CFR 820, which incorporates ISO 13485:2016) and automotive suppliers under IATF 16949, covering NCR intake and severity triage, containment and quarantine, root cause analysis with 5 Whys, Ishikawa diagrams and 8D, disposition decisions (use as is, rework, repair, scrap, return to supplier), CAPA plans, and effectiveness verification before closure. Use when a part, lot or process fails a specification, a customer complaint or audit finding needs a CAPA, you are writing or fixing an NCR or CAPA procedure or tracker, or a corrective action keeps failing to stop a repeat defect.
license: MIT
compatibility: Any Agent Skills host. Works from the user's NCR, inspection, complaint and production records. Quotes clause numbers, not licensed standard text; the user needs their own copies of ISO 13485 and IATF 16949. Not regulatory or legal advice.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Quality nonconformance and CAPA

Stop bad product reaching the customer, find the cause that actually explains the defect, fix it so it does not come back, and leave a record an auditor can follow. This skill structures the work; the organisation's quality management system (QMS) procedures and its quality and regulatory staff decide.

## Boundary: when a qualified person must decide

**Stop and tell the user a qualified quality or regulatory person must decide**, and do not draft a conclusion for them, when:

- The defect could affect patient or user safety, or a device already shipped: field action, recall, correction or removal, and Medical Device Reporting (21 CFR 803) or reports of corrections and removals (21 CFR 806) decisions belong to regulatory affairs.
- A disposition would ship product outside specification (use as is, concession or deviation). Automotive: the customer must authorise it in writing under IATF 16949 and the customer's own requirements.
- A design change, validated process change, or supplier change follows from the CAPA; it needs the change control and, where required, revalidation or customer approval (for example a PPAP resubmission).
- Anyone asks to close a CAPA without objective evidence of effectiveness.

## 1. Intake: open the NCR

Record, from evidence, not memory:

1. What failed: part number, revision, lot or serial numbers, quantity affected and quantity inspected.
2. Requirement violated: drawing, specification, procedure or customer requirement, with revision.
3. Where found (incoming, in process, final inspection, customer, field, audit) and by whom, when.
4. Objective evidence: measurements, photos, test records.
5. Severity and risk: link to the product's risk file (ISO 14971 risk management for devices; PFMEA and control plan for automotive). A failure mode not in the risk file is itself a finding.

Number every NCR, never delete one, and keep its history (records and electronic signatures under 21 CFR Part 11 if records are electronic and the site is FDA-regulated).

## 2. Containment, within hours

1. Quarantine and tag all suspect material: in stock, in process, in transit, at suppliers, at distribution.
2. Define the suspect range from the last known good to the first known good, using lot traceability. If you cannot bound it, widen it.
3. Add a 100% check or sort at the point of detection until the fix is proven, and record results.
4. Decide whether the customer must be told now (automotive customers usually require notification; device field impact goes to regulatory per the boundary above).

Containment is not correction. Record both separately.

## 3. Root cause

Pick the method by the problem, and check the cause against the data:

- **5 Whys** for a single, clear failure chain. Each "why" must be backed by evidence. Stop at a cause the organisation can control and that, if removed, would have prevented the defect.
- **Ishikawa (fishbone)** when several causes are possible: list candidates under Man (people), Machine, Method, Material, Measurement, Environment, then test each one with data.
- **8D** for customer complaints, recurring or cross-functional problems, and where the customer requires it (common in automotive). Steps and the report outline are in `references/8d-and-capa.md`.
- Use is/is-not analysis, process data, and a test that turns the defect on and off when you can.

Find two causes: why it **occurred** and why it **escaped** detection. Also ask why the system allowed it (systemic cause), for example a control plan that never covered the characteristic.

Never accept "operator error" or "retrain the operator" as the root cause on its own. Ask what made the error possible and prefer error-proofing (IATF 16949 expects it in problem solving).

Verify measurement before blaming the process: check that the gauge is calibrated and that measurement system analysis (gauge R&R) is acceptable for that characteristic.

## 4. Disposition

| Disposition | Needs |
|---|---|
| Use as is / concession | documented justification, authorised approver, customer authorisation where required |
| Rework (back to specification) | approved rework instruction, re-inspection, record on the lot, batch or device production record (QMSR no longer uses the term device history record) |
| Repair (still not fully to specification) | as concession, plus customer authorisation in automotive |
| Scrap | controlled scrapping so it cannot re-enter stock |
| Return to supplier | supplier NCR or SCAR, replacement or credit, supplier containment |

Record who decided, when, and on what evidence.

## 5. CAPA

1. Decide whether a CAPA is needed by your procedure's rules (for example: safety impact, recurrence, customer complaint, audit finding, trend). Not every NCR needs one; record the decision either way.
2. Corrective action removes the cause found in section 3; preventive action removes the cause of a potential problem elsewhere (similar products, lines or suppliers). ISO 13485 treats these as separate requirements (clauses 8.5.2 and 8.5.3).
3. Each action has an owner, due date, and the evidence that will show it is done. Actions must not adversely affect product conformity or safety; check that before implementation.
4. Update the documents the action touches: drawings, work instructions, PFMEA, control plan, risk file, training records, supplier requirements.

## 6. Effectiveness check, then close

1. Define the effectiveness criteria when the CAPA is opened, not when it is closed: for example zero recurrences in the next N lots or N weeks, a capability index above target, or complaint rate below a threshold.
2. Wait long enough to see the result, then check against the criteria with data.
3. Not effective: reopen the root cause analysis. Do not stack new actions on an unverified cause.
4. Close only with objective evidence and the approver your procedure names. Feed the result into management review and trend analysis.

Clause references and the records auditors expect are in `references/8d-and-capa.md`.

## Rules

- Never back-date, edit or delete a quality record; correct with a dated, signed amendment.
- Never close a CAPA on "action completed" alone; closure needs verified effectiveness.
- Never ship quarantined material without a recorded disposition.
- Do not quote standard text you do not have; cite clause numbers and tell the user to check their licensed copy.

## Report

```
NCR <id> | part <pn rev> | lots <range> | qty affected <n> | found at <stage> | severity <level>
Requirement: <spec, rev>   Evidence: <refs>
Containment: <actions, locations, qty quarantined, sort results>
Root cause (occurrence): <cause + evidence>   Root cause (escape): <cause + evidence>   Method: <5 Whys | Ishikawa | 8D>
Disposition: <type, approver, customer authorisation ref>
CAPA <id>: actions (owner, due, evidence) | effectiveness criteria | check date | result
Needs qualified decision: <reportability, concession, change control, other>
```
