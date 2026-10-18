---
name: threat-model
description: Produce a threat model for a feature or system, with assets, trust boundaries, data flows, STRIDE threats and ranked mitigations.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/argument-hint: "<feature, service or design doc>"
  kete-loom/owner: "Kete-org"
---

Produce a threat model for the feature or system below. Do not edit code.

If the user named nothing, ask what to model and stop.

If the `threat-modeling` skill is available, follow it. Otherwise:

1. Read the design doc or code the user pointed to. Search the codebase for entry points, authentication, data stores and external calls.
2. List assets (data and capabilities worth protecting), actors (including attackers) and trust boundaries.
3. Sketch the data flows across each boundary as a short list or a Mermaid diagram.
4. For each flow crossing a boundary, walk STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege. Note an existing control only if you found it in the code or the user told you.
5. Report:

```
## Threat model: <scope>
Assets: ...  Actors: ...  Trust boundaries: ...
Data flows: ...
| # | Threat (STRIDE) | Where | Likelihood | Impact | Existing control | Mitigation |
Top 3 to fix first: ...
Assumptions and open questions: ...
```

If a decision depends on facts you lack (who can reach an endpoint, what data is stored), list it as an open question instead of assuming.

Scope: $ARGUMENTS
