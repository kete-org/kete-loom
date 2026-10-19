---
name: ai-prose-cleanup
description: Machine-sounding prose audit and rewrite that ranks tells by severity tier (leftover chatbot artifacts and unsourced attributions first, then overused vocabulary, stock openers and closers, stacked hedges and synonym cycling, then rhythm polish), offers a detect-only report, keeps every edit inside the scope the user asked for, and adjusts strictness by genre. Use when text reads as AI-generated, generic or padded and someone wants it flagged or de-slopped while keeping the author's meaning, facts and voice.
license: MIT
compatibility: Any Agent Skills host. No tools required; works on pasted text or files the user points to.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# AI prose cleanup

Find the patterns that make text read as machine-written and remove them without changing what the text says. This is an edit of existing prose, not a rewrite from scratch: drafting a new article belongs to `article-writing`, and matching a company's voice guide belongs to `brand-voice`.

## 0. Settle the job before touching the text

Ask, or infer from the request:

1. **Mode.** `detect` (report only, change nothing), `fix` (rewrite flagged spans) or `fix-all` (flagged spans plus rhythm polish). Default to `detect` when the user only asks "does this sound like AI?".
2. **Scope.** Which part may change: one paragraph, one section, the whole file. Outside that scope, report but never edit.
3. **Genre profile.** Pick one from the table below. If unclear, ask.
4. **Fixed content.** Quotes, legal wording, product names, code, numbers, citations and headings the user wants kept. These are never rewritten.

| Profile | Strictness | Allowed that other profiles flag |
|---|---|---|
| Technical docs | High on fluff, low on rhythm | Repetition of exact terms (consistency beats variety), numbered lists |
| Marketing and web copy | High | Short fragments, direct address |
| Business email or memo | High on openers and closers | Brief courtesy line |
| Academic or report | Medium | Hedging where evidence really is uncertain, "however" transitions |
| Fiction or personal essay | Low on structure, high on cliché | Unusual rhythm, figurative language that is specific |
| Social post | High on emoji and hashtag stuffing | Casual register |

## 1. Detect, tier by tier

Read the whole text once before flagging. Then mark every hit with its tier, the exact span, and a one-line reason. The full pattern lists and replacement guidance are in `references/patterns.md`; read it before the first pass.

- **Tier 1, must fix.** Chatbot residue and integrity problems: "As an AI", "I hope this helps", "Certainly! Here is", knowledge-cutoff disclaimers, placeholder brackets, leftover markdown in a plain-text destination, and vague attributions ("experts say", "studies show", "many believe") with no named source.
- **Tier 2, should fix.** Word-list tells and template moves: overused vocabulary clusters, stock openers ("In today's fast-paced world"), stock closers ("In conclusion", "Ultimately, it's about"), "It's not just X, it's Y" contrasts, rule-of-three padding, stacked hedges ("may potentially help to"), synonym cycling that renames the same thing every sentence, and empty intensifiers.
- **Tier 3, polish.** Uniform sentence length, every paragraph the same shape, em-dash or colon overuse, bolded phrases in running prose, headings on a 200-word piece, and a summary that repeats the body.

A single tier-2 word is not proof of anything. Flag density: one "robust" in 2,000 words is fine; five in one paragraph is a tell.

## 2. Report (detect mode stops here)

```
AI prose audit: <file or "pasted text">, profile <profile>
Tier 1: <n>   Tier 2: <n>   Tier 3: <n>
Verdict: reads human | some tells | reads machine-generated

| # | Tier | Location | Span | Why |
|---|------|----------|------|-----|

Top three changes that would help most:
1. ...
```

Never claim a text *was* written by AI. Describe the patterns; authorship detection is unreliable and accusations harm people.

## 3. Fix

Work tier 1, then 2, then 3 (only in `fix-all`). For each flagged span:

1. Ask what the sentence is trying to say. Write that, plainly.
2. If the span says nothing (a stock opener, a restating summary), delete it rather than replacing it.
3. Replace a vague attribution with the real source if the text or user supplies one. If not, cut the claim or mark it `[source needed]`; never invent a source.
4. Replace generic vocabulary with the specific noun, number or example the author meant. If you do not know the specific, keep the plain word and ask.
5. Keep the author's terms, person (I, we, you), tense and spelling variant (British or American).
6. Keep length within about 10% shorter to 5% longer unless the user asks to cut.

### Editing contract

- Never edit outside the agreed scope. Never "improve" the argument, add facts, or change claims.
- Never touch fixed content from step 0.
- Never introduce a new tell while removing one (do not swap "delve" for "dive deep").
- If a fix would change meaning, leave the span, flag it, and ask.

## 4. Return

In `fix` and `fix-all` modes return:

1. The revised text (or a diff when the source is a file).
2. A change log: tier, original span, replacement, one-line reason.
3. Spans you flagged but left alone, and why.
4. Any `[source needed]` markers you added.

## Stop and ask the user when

- The text is a quote, transcript, legal or regulated wording, or someone else's published work.
- Removing a pattern would delete content the author may need (a hedge that reflects real uncertainty, a caveat required by policy).
- The user wants the text made to "pass an AI detector". Explain that this skill improves writing quality; it is not for disguising authorship where disclosure is required, such as coursework or publications with an AI-use policy.
