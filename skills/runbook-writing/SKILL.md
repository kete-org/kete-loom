---
name: runbook-writing
description: Operational runbook and playbook authoring for on-call engineers, built around the alert or symptom that sends someone to the page, ordered read-only diagnosis checks with expected output, copy-paste remediation commands that each carry a rollback and a stop condition, escalation paths with contacts and time limits, verification that service has recovered, and a schedule for testing the runbook in drills. Use when writing or fixing a runbook for an alert, a recurring operational task such as failover or certificate rotation, or a service handover to an on-call rotation.
license: MIT
compatibility: Any Agent Skills host. Reads the codebase, alert rules and deploy config; runs only read-only commands to check that documented commands exist.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Runbook writing

A runbook is read at 3 a.m. by someone tired who may not know the service. Every step must be executable as written, in order, without needing the author.

## 0. Scope the runbook

1. One runbook per alert or per task. If the user wants "the runbook for service X", propose one short page per alert plus an index.
2. Collect: the alert rule (query, threshold, duration), service ownership, dashboards, deploy method, config locations, dependencies, and past incidents for this alert. Search the repo for alert definitions and existing runbooks; reuse their location and format.
3. Find who the reader is (any on-call engineer, a specialist team, support) and what access they have. Do not write steps that need access the reader lacks.
4. If you cannot find how the service is deployed or restarted, **stop and ask the user**. Do not guess commands.

## 1. Header

```
# Runbook: <alert name or task>
Service: <name>   Owner: <team>   Last tested: <date, or "never">   Severity: <SEV level the alert pages at>
Alert: <exact alert name as it appears in the pager>  Link: <alert rule>
Dashboards: <links>
```

## 2. Trigger and symptoms

- What fired: the exact condition in plain words ("5xx rate on checkout-api above 2% for 5 minutes").
- What users see when this is real.
- Known false positives and how to recognise them in under a minute.
- Impact if ignored, so the reader can judge urgency.

## 3. Diagnosis

Ordered checks, most likely and cheapest first. Diagnosis steps must be **read-only**.

```
1. Is it a recent deploy?
   Run: <command to list recent deploys>
   Expect: last deploy older than 1 hour.
   If a deploy landed in the last hour: go to Remediation A (roll back).
2. Is the database reachable?
   Run: <read-only check>
   Expect: <exact healthy output>
   If not: go to Remediation B, or escalate to the database team.
```

Rules for each check: the exact command or dashboard panel, the expected healthy output, and a branch for each abnormal result. Use placeholders like `<pod-name>` in angle brackets and say how to find the value.

## 4. Remediation

Each remediation is a separate, labelled procedure:

- **When to use it**: which diagnosis result leads here.
- **Risk**: what it affects (drops connections, loses in-flight jobs, customer-visible).
- **Steps**: numbered, copy-paste commands, one action each. Destructive or customer-visible steps are marked `CAUTION` and say who must approve them.
- **Rollback**: how to undo this remediation if it makes things worse.
- **Stop condition**: when to stop trying and escalate ("if error rate is not falling 10 minutes after step 3").

Prefer the safest effective action first: roll back, fail over, scale out, or disable a feature flag before restarting stateful systems, editing data or deleting anything. Never put a data-deleting command in a runbook without a backup or snapshot step immediately before it.

## 5. Escalation

- Who to page next, how (rotation name, not a person's phone number in plain text), and after how long.
- Which dependency teams own what, with their rotation names.
- When to declare an incident and who communicates to customers.

## 6. Verification

How to confirm recovery: the metric and the value it must return to, for how long, plus one user-level check (a synthetic request, a test login). Say when it is safe to resolve the alert.

## 7. Afterwards

- Record what was done in the incident ticket.
- If this was a real incident, link the postmortem (the `incident-postmortem` skill covers writing it).
- Update the runbook if any step was wrong or missing, and bump "Last tested".

## Keeping runbooks tested

- Check every command against the current code and config: search for the service names, namespaces, flags and script paths you reference. Run read-only commands (`--help`, list or describe commands) if the user allows; never run remediation commands to "test" them on production.
- Recommend a drill in staging or a game day each quarter, or after any change to the service's deploy or infra, and record the date in the header.
- Flag a runbook as stale when "Last tested" is over six months old or references removed resources.
- Keep runbooks in the repo next to the service or in the team's known runbook location, and link each from its alert's annotation so the pager opens it directly.

## Reviewing an existing runbook

Report, most serious first: commands that no longer match the code, destructive steps without approval or rollback, diagnosis steps that change state, missing expected outputs, missing escalation or stop conditions, no verification, and a stale or missing "Last tested" date.

## Never

- Never include secrets, passwords or tokens. Point to where the reader gets them (the secrets manager path).
- Never write "investigate the issue" or "fix the config" as a step; say exactly what to look at and what to change.
- Never run remediation steps yourself while writing the runbook.
- Never reference one engineer's laptop, alias or personal script.
