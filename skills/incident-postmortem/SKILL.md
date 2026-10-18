---
name: incident-postmortem
description: Blameless post-incident review writing that rebuilds a timestamped timeline from alerts, chat and deploy logs, quantifies customer and business impact, separates the trigger from root causes and contributing factors, records what went well and where the team got lucky, and turns findings into a short list of owned, dated action items with a follow-up review. Use when an outage, data loss, security event or near miss is over and someone needs the postmortem, incident report or retrospective written, reviewed or its action items tracked.
license: MIT
compatibility: Any Agent Skills host. Reads logs, chat exports or git history when the user provides them; git optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Incident postmortem

A postmortem explains what happened and changes the system so it does not happen the same way again. It is written after the incident is resolved. If the incident is still live, **stop**: the job is mitigation, not writing. Say so and help with diagnosis or the relevant runbook instead.

## Blameless rules (apply to every sentence)

- Describe actions and the information people had at the time, not character. "The deploy ran against prod because the target defaulted to prod" not "Sam deployed to prod by mistake".
- Use roles ("on-call engineer", "incident commander") instead of names in the narrative. Names belong only in the action-item owner column.
- Ask "why did this make sense at the time?" Human error is a starting point for analysis, never a root cause.
- Do not write "should have", "failed to" or "carelessly". Rewrite as a gap in tooling, process, alerting or knowledge.

## 0. Gather inputs

1. Ask for or locate: alert history, the incident channel or chat export, deploy and config change history (`git log` around the window), dashboards or graphs, support tickets, status page updates.
2. Confirm severity and who the audience is (engineering only, whole company, customers). A customer-facing summary is a separate, shorter document; offer it, do not mix the two.
3. If any input contains customer personal data, secrets or tokens, leave them out of the document and tell the user.

## 1. Summary

Three to five sentences anyone in the company can read: what users saw, for how long, the cause in plain words, and whether it is fixed.

## 2. Impact

Quantify with sources. Use what you can measure; mark estimates as estimates.

- Duration: start of impact, detection, mitigation, full resolution (UTC).
- Who and how many: users, accounts, regions, requests failed, error rate.
- Business: orders lost, SLA or SLO budget burned, refunds or credits, data lost or exposed.
- If data was lost or exposed, or a contract SLA may be breached, flag that legal, security or account teams must review before publishing.

## 3. Timeline

UTC timestamps, one event per line, facts only. Include the trigger, first symptom, detection, every key decision, each mitigation attempt (including ones that did not work) and resolution.

```
2026-03-04 14:02 UTC  Config change merged raising pool size (trigger)
14:09  p99 latency on checkout-api rises above 2 s
14:21  Alert "checkout 5xx > 2%" pages on-call (detection: 12 min after impact)
14:30  Incident declared SEV2, commander assigned
14:38  Rollback of config attempted; no effect (pods not restarted)
14:51  Pods restarted, error rate back to baseline (mitigated)
15:30  Monitoring confirms steady state (resolved)
```

Compute and state, all measured from the start of impact (first symptom, not the trigger): time to detect, time to mitigate, time to resolve. In the example: 12, 42 and 81 minutes. If the team measures from another point, say which.

## 4. Root causes and contributing factors

- Separate the **trigger** (the change or event that set it off) from **root causes** (conditions that let the trigger cause harm) and **contributing factors** (things that made it worse or slower to fix).
- Work backwards with repeated "why" questions, but follow every branch, not one chain. Most incidents have several causes. Stop a branch when you reach something the team can change.
- Check each category: change management, testing, alerting and detection, capacity, dependencies, documentation and runbooks, access and tooling, communication.
- Each cause must be supported by evidence in the timeline. If it is a hypothesis, label it as one and add an action item to confirm it.

## 5. What went well, what went poorly, where we got lucky

Short bullets for each. "Lucky" items are real risks that did not bite this time; they usually deserve action items too.

## 6. Action items

Each item fixes a cause or contributing factor, and the table must show which.

```
| # | Action | Type | Addresses | Owner | Due | Ticket |
|---|--------|------|-----------|-------|-----|--------|
| 1 | Alert on checkout p99 > 1 s for 5 min | Detect | CF2 | <person> | 2026-03-18 | OPS-412 |
| 2 | Config changes to pool size trigger rolling restart | Prevent | RC1 | <person> | 2026-03-31 | PLAT-88 |
```

Rules:

- Types: Prevent, Detect, Mitigate, Process. Prefer system changes over "be more careful" or "add a reminder to the wiki".
- Every item has one named owner, a due date and a ticket. "Team" is not an owner.
- Keep it short: five to ten items that will actually be done beat thirty that will not. Mark each as must-do or nice-to-have.
- If an item has no owner, list it under "Unowned" and **ask the user** who takes it.

## 7. Follow-up

- Schedule a review date (often two to four weeks out) to check action items are closed.
- Note whether the runbook used during the incident needs updating; the `runbook-writing` skill covers that.
- Record where the postmortem is published and who must sign off before it goes wider.

## Output format

```
# Postmortem: <short title> (<date>, <severity>)
Status: Draft | In review | Final   Authors: <roles or names>   Incident commander: <role>
## Summary
## Impact
## Timeline (UTC)
## Root causes and contributing factors   (RC1.., CF1.., trigger)
## What went well / What went poorly / Where we got lucky
## Action items   (table)
## Follow-up      (review date, sign-off, related docs)
## Appendix       (graphs, log excerpts, links)
```

## Reviewing a draft postmortem

Report problems most serious first: blame language, missing impact numbers, timeline gaps (no detection time), a single "root cause" that is really the trigger or human error, action items without owner, date or link to a cause, and missing follow-up date.

## Never

- Never name an individual as the cause.
- Never invent timestamps, impact numbers or log lines. Leave a `TODO: confirm` where data is missing.
- Never publish customer data, credentials or internal hostnames in a customer-facing version.
- Never close the postmortem with action items still unowned.
