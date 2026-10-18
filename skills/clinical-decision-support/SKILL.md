---
name: clinical-decision-support
description: Engineering discipline for software that recommends or warns at the point of care, including CDS Hooks services (discovery, patient-view and order-sign hooks, prefetch, cards, suggestions, feedback), alert design that avoids alert fatigue, versioned rule logic tied to cited evidence, clinician sign-off and regression testing on synthetic cases, override and audit trails, and the regulatory line where software becomes a medical device (FDA CDS guidance, EU MDR Rule 11, UK DCB0129). Use when building drug-interaction or dosing alerts, risk scores, care-gap reminders or AI suggestions shown to clinicians, writing a CDS Hooks service, or deciding whether a clinical feature needs regulatory or clinical-safety review.
license: MIT
compatibility: Any Agent Skills host. Works on any codebase; CDS Hooks testing needs a FHIR sandbox or the CDS Hooks sandbox. Regulatory statements must be checked against current FDA, EU and national guidance by a qualified person.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Clinical decision support

Build decision support that clinicians trust: it fires rarely and correctly, shows its reasoning and evidence, can be overridden with a reason, is traceable to a reviewed rule version, and stays on the right side of medical device regulation.

## Boundary: not clinical, legal or regulatory advice

- You engineer the system. You never author or approve clinical content (thresholds, doses, interactions, risk cut-offs). A named clinician owns every rule and signs off each version.
- You never decide whether the product is a regulated medical device. You flag the questions; regulatory affairs or counsel decides.
- Say this once, plainly, when the user asks for clinical thresholds or a regulatory verdict, then continue with the engineering. Never invent a clinical threshold to fill a gap; leave a named placeholder and stop.

## Step 1: classify the feature before building

Answer these and write the answers into the design doc:

1. **Who sees it?** A healthcare professional, a patient or caregiver, or nobody (automatic action)?
2. **What does it do?** Display reference information, flag something for review, recommend one action, or take an action automatically?
3. **What are the inputs?** Structured data and published guidelines, or medical images, signals (ECG, waveforms) or IVD data?
4. **Can the clinician independently review the basis?** Are the inputs, logic and evidence shown so they need not rely on the software alone?
5. **Is it time-critical?** Would a clinician have time to review the basis before acting?

Then apply the regulatory flags in `references/regulatory-boundaries.md`. If the feature analyses images or signals, targets patients directly, acts automatically, is opaque (for example an ML model whose basis the clinician cannot review), or is used in time-critical decisions, **stop and tell the user it needs regulatory review before build**.

## Step 2: design the intervention

- **Fire only when actionable.** Every alert names one specific patient, finding and action. If nobody can act on it right now, it is not an interruptive alert: make it passive (a chart flag, a worklist, `info` card) or drop it.
- **Right time, right person.** Trigger at the workflow step where the decision is made (for drug checks: `order-select` or `order-sign`, not `patient-view`). Target the role that can act.
- **Severity is earned.** Reserve interruptive or `critical` for harm that is likely and serious. Tier everything else. Track the override rate per rule; a rule overridden most of the time is noise and needs clinical review.
- **Show the why.** Include the triggering data (values, dates), the rule's logic in plain words, and a link to the evidence source.
- **Make the right action one click.** Offer a concrete suggestion (adjust dose, order test, discontinue) and allow override with a structured reason.
- **Suppress duplicates.** Don't re-fire the same alert for the same patient and data in one session; respect snoozes and documented exceptions.
- **Fail safe and visible.** If the CDS service is down or data is missing, show nothing interruptive but never imply "no issues found". Missing inputs must not be treated as normal values.

## Step 3: build the logic as versioned, reviewable artefacts

- Keep rules in data or a dedicated module (for example CQL libraries, or a rules table), not scattered through UI code.
- Each rule has: ID, semantic version, owner clinician, evidence citation (guideline, version, date), inputs with code systems (LOINC, SNOMED CT, RxNorm), logic, outputs, effective date, review-by date.
- Units and codes are explicit. Convert units with a library (UCUM), never assume. Handle `preliminary`, `corrected` and `entered-in-error` source data.
- Every change goes through code review **and** clinical review, and bumps the rule version. Record who approved and when.

## Step 4: implement the delivery

For EHR-embedded CDS use CDS Hooks as in `references/cds-hooks.md`: a discovery endpoint, one service per hook, prefetch templates for the data you need, cards with `summary`, `indicator`, `source` and suggestions, and the feedback endpoint to capture accept/override. Authenticate the EHR's JWT on every call and use the `fhirAuthorization` token only for the patient in context.

## Step 5: test with clinicians

1. Build a test set of synthetic patients (never real records) per rule: must fire, must not fire, boundary values, missing data, unit variants, corrected results, duplicate orders.
2. Store expected outputs and run them as automated regression tests on every change.
3. A clinician reviews the cases and the card wording before release and signs the test report.
4. Pilot silently first where possible ("shadow mode": evaluate and log, don't show) and compare fire rates with expectations.

## Step 6: audit and monitor

Log, for every evaluation that produced output: timestamp, rule ID and version, patient reference (internal ID, not name), user, hook instance, card shown, action taken, override reason. Keep it append-only and access-controlled like other PHI logs (`hipaa-compliance`). Review override rates, fire rates and reported incidents on a schedule, and give clinicians a way to report a bad alert.

## Stop and ask the user

- Before writing any clinical threshold, dose, interaction or score cut-off: ask who the clinical owner is and for the source.
- When Step 1 raises a regulatory flag.
- Before making any alert interruptive, or any action automatic.
- Before shipping a rule change without recorded clinical sign-off.

## Never

- Never auto-order, auto-cancel or auto-change medication or orders without explicit clinical governance approval.
- Never hide the inputs or reasoning behind a recommendation.
- Never treat missing data as normal.
- Never ship ML-based suggestions as if they were rule-based, or without documented validation on the target population.
- Never let a CDS outage silently disable safety checks without telling users.

## Report format

```
Feature: <name>, audience, hook or trigger point
Classification: <answers to Step 1>, regulatory flags: <none | list → needs regulatory review>
Rules: <ID@version, owner, evidence source> per rule
Test coverage: <cases per rule, clinician sign-off status>
Open items for clinical/regulatory owners: <list>
```
