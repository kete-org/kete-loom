---
name: postmortem
description: Write a blameless postmortem for an incident, with timeline, impact, root cause, contributing factors and owned action items.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<incident summary, ticket or notes file>"
  kete-loom/owner: "Kete-org"
---

Write a blameless postmortem for the incident below.

If the user gave no incident details, ask for a summary, notes or a link and stop.

If the `incident-postmortem` skill is available, follow it. Otherwise:

1. Collect the facts from what the user gave: notes, chat logs, alerts, deploy and commit history (`git log --since=<start> --until=<end>` for the incident window). Do not guess timestamps or numbers; mark unknowns as `TBD`.
2. Build a timeline in one time zone (state which), from first trigger to full recovery.
3. Find the root cause and contributing factors by asking "why" until you reach a process or system cause, not a person.
4. Write:

```
# Postmortem: <title>
Date: <date>. Severity: <sev>. Status: draft. Authors: <names>
## Summary (2-3 sentences)
## Impact (who, how many, how long, data loss yes/no)
## Timeline (<time zone>)
- HH:MM: event
## Root cause
## Contributing factors
## What went well / What went poorly
## Action items
| Action | Type (prevent/detect/mitigate) | Owner | Due |
```

5. Ask where to save it before writing the file.

Blameless means: describe actions and the conditions that made them reasonable, never "X failed to". Remove names from the narrative unless the user asks to keep them. Every action item needs an owner or `TBD`.

Incident: $ARGUMENTS
