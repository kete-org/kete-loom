---
name: internal-communications
description: Short workplace updates that colleagues finish reading, such as weekly progress-plans-problems (3P) notes, project status reports, leadership briefs, team or company newsletters, internal FAQs and change announcements, built by collecting facts from the tracker, chat threads and docs before writing, then fitting each to a fixed, skimmable template with the ask and the bad news up top. Use when someone needs a status update, weekly report, exec summary, staff newsletter, reorg or policy-change announcement, or internal FAQ drafted for people inside their organisation.
license: MIT
compatibility: Any Agent Skills host. Works from pasted notes; reads trackers, chat or docs only through tools the host already has connected.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Internal communications

Write updates for people inside the organisation that they can act on in under two minutes. Long-form features and public announcements belong to `article-writing`; incident write-ups belong to `incident-postmortem`; rules for an agent that sends messages on someone's behalf belong to `agent-outbound-messaging`. This skill drafts; it never sends.

## 0. Pick the format

Ask, or infer from the request, then use the matching template in `references/formats.md`:

| Format | Reader | Length |
|---|---|---|
| 3P update (progress, plans, problems) | Team and manager, weekly | 5-12 bullets |
| Project status report | Stakeholders across teams | One screen |
| Leadership brief | Executives with little time | 150-250 words |
| Newsletter | Whole team or company | 400-800 words, sections |
| Internal FAQ | Staff with the same questions | 5-15 Q&As |
| Change announcement | Everyone affected by a change | 200-400 words plus FAQ link |

If the user's company has its own template, use theirs and skip this table.

## 1. Gather facts before writing

Writing comes last. First collect, from what the user gives or the tools the host has connected:

1. **Tracker:** issues closed, opened and blocked in the period; milestones hit or slipped, with dates.
2. **Chat and email:** decisions made, open questions, who asked for what.
3. **Docs and dashboards:** the metrics the audience tracks, with the previous value for comparison.
4. **The user:** anything only they know, such as context, politics, what they want the reader to do.

List the facts with their sources before drafting. If a fact is missing (a date, an owner, a number), ask instead of filling it with a vague phrase. Never invent progress, dates or metrics.

## 2. Draft

Rules for every format:

1. **Lead with what the reader must know or do.** The first line carries the status or the ask: "On track for 14 March launch; need a decision on pricing by Friday."
2. **Bad news early.** Slips, risks and problems go above the wins, with the impact and what you are doing about it.
3. **Specific over general.** "Checkout p95 down from 1.8 s to 0.9 s" beats "performance improved". Name owners and dates.
4. **One idea per bullet.** Bullets start with a verb or the subject, not with filler.
5. **Status words mean one thing.** Use a fixed set (On track, At risk, Off track, Done) and say why when not on track.
6. **Link, don't paste.** Point to the ticket, doc or dashboard instead of copying it.
7. **Match the reader's vocabulary.** Executives get outcomes and decisions; engineers get the technical detail.
8. **No hype.** Internal readers discount "exciting" and "huge". Let facts carry the weight.

### Change announcements

Answer, in this order: what is changing, when, who it affects, why, what each reader must do and by when, where to ask questions. Write the FAQ before the announcement; the hard questions shape the message. Consult the sensitivity rules below before drafting anything about people.

## 3. Check before handing over

- Can a reader who reads only the first two lines act correctly?
- Is every date, number and name sourced from step 1?
- Is anything confidential going to a wider audience than it should (salaries, unannounced deals, customer names, performance issues)?
- Does it fit the length budget for its format?

## 4. Return

1. The draft, ready to paste into the destination (email, chat, wiki), formatted for it.
2. A short list of facts you could not confirm, marked in the draft as `[confirm: ...]`.
3. Suggested subject line or post title, and suggested audience or channel.

## Sensitivity rules

Stop and ask the user before drafting, and recommend review by HR, legal or communications leads, when the update covers:

- layoffs, reorganisations, role changes or anyone's performance,
- compensation, benefits or policy changes with legal effect,
- security incidents, legal matters or anything under embargo,
- health, personal or family matters of named people.

For these, draft only from facts the user confirms, avoid speculation about reasons, and never name individuals the user has not cleared for naming.
