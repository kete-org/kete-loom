---
name: fact-checking
description: Claim-by-claim verification of an existing article, video transcript, slide deck, press release or the user's own draft, pulling out every checkable statement, ranking them by how much the piece depends on each, testing them against independent sources, and grading each on a fixed verdict scale with the arithmetic shown and the strongest reading tried before anything is called false. Use when someone asks whether a piece of content is accurate, wants a draft checked before publishing, or doubts a specific statistic, quote or claim.
license: MIT
compatibility: Any Agent Skills host. Needs web search or fetch to reach sources; without it, the skill reports which claims could not be checked.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Fact-checking

Check what a piece of content claims, one claim at a time, and say how sure you are. This is not open research: answering a new question from scratch belongs to `deep-research`. Here the text already exists and the job is to test it.

## 0. Set up

1. Get the full text. For a video or podcast, work from a transcript with timestamps; ask for one if none is supplied.
2. Ask, or infer: who wrote it, when, for which audience, and what the user will do with the result (publish, rebut, decide). A draft due for publication gets every claim checked; a viral post may only need the load-bearing ones.
3. Note the date of the content. A claim can be true when written and stale now; check it against both dates.

## 1. Extract claims

List every statement that could be shown true or false. Split compound sentences into single claims. Skip opinions, predictions and value judgments, but list any factual premise hidden inside them ("Since sales doubled, the strategy worked" contains "sales doubled").

Types to capture: numbers and statistics, quotes and attributions, dates and sequences, causal claims, comparisons and rankings ("largest", "first"), descriptions of studies, laws or documents, and images or charts presented as evidence.

## 2. Rank by weight

Give each claim a weight:

- **Load-bearing**: the headline or conclusion collapses if this is wrong.
- **Supporting**: it strengthens the argument but the piece survives without it.
- **Incidental**: background colour.

Check load-bearing claims first and always. If time or the user limits the scope, say which claims were not checked.

## 3. Verify each claim

For each claim, in order:

1. **Find the origin.** Trace the number or quote back to where it first appeared: the study, dataset, filing, transcript or official statement. A news article citing a study is not the study.
2. **Read the origin, not the abstract or headline.** Check sample, date range, units, definitions and whether the source says what the claim says.
3. **Find an independent second source.** Independent means it did not copy the first. Two outlets quoting the same press release count as one source.
4. **Redo the arithmetic.** Recompute percentages, growth rates, per-capita figures and totals. Show the working in the report. Watch for percent versus percentage points, mean versus median, nominal versus inflation-adjusted, and cherry-picked start dates.
5. **Check the context.** Is a quote cut so its meaning flips? Is a chart's axis truncated? Is a correlation presented as cause?
6. **Steelman before "false".** Try the most charitable reading: a different but reasonable definition, an earlier dataset, a rounding convention. Grade false only if the claim fails under that reading too.

Prefer primary and official sources: statistical agencies, court records, regulator filings, peer-reviewed papers, the speaker's own recorded words. Treat social posts, content farms and uncited blogs as leads, never as confirmation.

## 4. Grade on the fixed scale

| Verdict | Meaning |
|---|---|
| Confirmed | Origin found and an independent source agrees; wording and numbers match. |
| Plausible | Consistent with good sources, but the exact figure or wording could not be traced to its origin. |
| Misleading | Technically accurate but framed, cropped or contextless in a way that leads to a false conclusion. |
| False | Contradicted by the origin or by strong independent evidence, under its most charitable reading. |
| Unverifiable (searched) | Looked for and not found in reachable sources; list where you looked. |
| Unverifiable (by construction) | Cannot be checked in principle: private conversations, unpublished internal data, future events. |

Never upgrade a verdict because the claim sounds right, or downgrade it because the author seems biased.

## 5. Report

```
Fact-check: <title or file>, content dated <date>, checked <today>
Claims found: <n>   Checked: <n>   Load-bearing: <n>
Overall: <one sentence on whether the central conclusion holds>

| # | Claim (quoted) | Weight | Verdict | Evidence | Working / notes |
|---|----------------|--------|---------|----------|-----------------|

Corrections suggested (draft mode only):
- Claim #: original → suggested wording, with source

Not checked: <claims and why>
Sources: <numbered list, URL and access date>
```

Quote each claim exactly. Link each verdict to the sources that decided it.

## Rules

- Never invent a source, URL, quote or figure. If you cannot reach a source, say so.
- Never state a verdict from memory alone; recall is a lead, not evidence.
- Keep claims separate from the author's motives; grade statements, not people.
- When the user's own draft is wrong, suggest a corrected sentence with its source rather than rewriting the piece.

## Stop and ask the user when

- A claim concerns health, legal, financial or safety advice that a reader might act on: grade it, and say that a qualified professional should review the piece before it is relied on.
- A claim is about a private individual and checking it would mean digging into their personal life.
- Sources conflict and the conflict decides the conclusion: present both and ask how they want it handled.
