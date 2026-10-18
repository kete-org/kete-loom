---
name: architecture-decision-records
description: Writes and maintains Architecture Decision Records (ADRs), deciding whether a choice deserves one, filling a short template (Nygard sections plus options considered) with context, the options weighed, the decision and its consequences, numbering and storing it next to the code, and superseding old records instead of rewriting them. Use when the user wants to record or document a technical decision, start an ADR log in a repo, or update the status of an earlier decision.
license: MIT
compatibility: Any Agent Skills host. Writes Markdown files; git is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Architecture decision records

An ADR captures one decision, the reason for it, and what it costs, so a future reader can tell whether the reason still holds. It is short, dated and never silently edited.

## Does this need an ADR?

Write one when the decision is **hard to reverse, affects more than one module or team, or someone will later ask "why did we do it this way?"** Examples: choosing a database, message broker, auth provider, framework, API style, deployment model; adopting or dropping an architectural pattern; a deliberate trade-off against a stated quality (accepting eventual consistency, skipping multi-region).

Don't write one for: library patch upgrades, naming, formatting, decisions fully captured by a ticket, or anything trivially reversible. Say so and stop.

## Steps

1. **Find the log.** Search the repo for an existing ADR directory: `docs/adr/`, `doc/adr/` (the adr-tools default), `docs/decisions/`, `doc/architecture/decisions/`, `adr/`, or an `.adr-dir` file (adr-tools stores the chosen directory there). Use it and its template and numbering exactly. If none exists, propose `docs/adr/` and create `0001-record-architecture-decisions.md` first, then the user's ADR.
2. **Gather the facts.** You need: the problem and forces (constraints, requirements, deadlines), at least two real options (including "do nothing" when plausible), the chosen option, and who decided. **Stop and ask the user** for anything missing. Never invent the reasons, the alternatives considered or the people involved.
3. **Number and name.** Next free four-digit number, kebab-case title stating the decision: `0007-use-postgres-for-event-store.md`. Numbers are never reused.
4. **Write it** with the template below. Keep it to one or two screens. Link to longer analysis rather than pasting it.
5. **Set the status** (see lifecycle). New records start as `Proposed` unless the user says the decision is made.
6. **Supersede, don't rewrite.** When a decision changes, write a new ADR, set the old one's status to `Superseded by ADR-00NN` and add `Supersedes ADR-00MM` to the new one. Only typo fixes and status lines change in accepted ADRs.
7. **Index.** If the log has a README or index listing ADRs, add the new line.

## Template

```markdown
# ADR-0007: Use Postgres for the event store

- Status: Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-00NN
- Date: 2026-03-01
- Deciders: names or roles
- Supersedes: ADR-00MM (if any)

## Context

What problem forces a decision now. Constraints, requirements, quality
attributes that matter (cost, latency, team skills, compliance). Facts, not
the conclusion.

## Options considered

1. **Postgres with an append-only events table**: pros, cons.
2. **EventStoreDB**: pros, cons.
3. **Kafka as the system of record**: pros, cons.

## Decision

We will use option 1 because <the deciding reasons, tied to the context>.

## Consequences

- Positive: what gets easier.
- Negative: what gets harder or what we accept (the trade-off, stated plainly).
- Follow-ups: work this creates, and the signal that would make us revisit it.
```

## Status lifecycle

```
Proposed ──▶ Accepted ──▶ Deprecated
    │            └──────▶ Superseded by ADR-NNNN
    └──▶ Rejected
```

- `Proposed`: under discussion, usually in a pull request.
- `Accepted`: merged and in force.
- `Rejected`: kept on purpose, so the option isn't re-litigated without new facts.
- `Deprecated`: no longer relevant (the system it governed is gone).
- `Superseded`: replaced by a newer ADR, linked both ways.

## Where to store them

- In the repo of the code they govern, as Markdown, reviewed in pull requests like code. Cross-cutting decisions go in a shared architecture repo, linked from each affected repo.
- If the team uses a tool (adr-tools, Log4brains), follow its file layout and commands instead of hand-numbering.

## Writing rules

- One decision per ADR. If you need "and" in the title, split it.
- The Consequences section must include at least one negative. A decision with no cost wasn't a decision.
- Write the context so a new hire understands it without the meeting.
- Dates are absolute (`2026-03-01`), never "last sprint".

## Report back

```
ADR: path/to/NNNN-title.md (status)
Updated: older ADRs whose status changed, index file
Missing facts: anything you left as a question for the user
```
