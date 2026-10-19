---
name: article-writing
description: Long-form article and blog post writing, from choosing a sharp angle and outlining, through gathering evidence and drafting in plain prose, to a structured editing pass and a final headline, summary and meta description. Use when someone wants a blog post, essay, opinion piece, case study, newsletter feature or company announcement of roughly 800 words or more written, restructured or edited for clarity.
license: MIT
compatibility: Any Agent Skills host. Web access helps when the article needs facts checked; otherwise works from the user's material.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Article writing

Write a piece a busy reader finishes and remembers. One reader, one point, evidence for it, plain words.

## 0. Brief

Ask for what is missing, in one message:

1. **Reader**: who they are and what they already know.
2. **Purpose**: what the reader should think, feel or do afterwards.
3. **Format and length**: blog post, essay, case study, announcement; target word count.
4. **Where it runs**: company blog, newsletter, publication (and their style rules).
5. **Material**: notes, data, interviews, links, drafts, and the author's own experience.
6. **Voice**: a brand voice guide if one exists (apply it; the `brand-voice` skill covers defining one).

If the user says "just write it", state your assumptions in two lines at the top of the draft and proceed.

## 1. Angle

- Write the **one-sentence point** of the article. If you cannot, the topic is too broad; offer two or three sharper angles and let the user pick.
- Good angles are specific and arguable: "Why we stopped offering a free plan" beats "Thoughts on pricing".
- Check the angle against the reader: why would they care now?

## 2. Outline

Before drafting, show the user a short outline:

```
Working headline:
Point (one sentence):
Opening: <the hook: a scene, a surprising fact, a problem the reader has>
Section 1: <claim>  - evidence:
Section 2: <claim>  - evidence:
Section 3: <claim>  - evidence:
Close: <what to do or think next>
```

Three to five sections is typical. Each section makes one claim that supports the point. For long or high-stakes pieces, **stop and get agreement** on the outline before drafting.

## 3. Evidence

- Back each claim with something concrete: data, an example, a quote, a story from the author's experience, a demo or code.
- Attribute facts and link to the source. Prefer primary sources.
- If a fact cannot be verified, cut it or flag it to the user as `[CHECK: ...]`. Never invent statistics, quotes, studies or customer stories.
- Mark the author's opinions as opinions.

## 4. Draft

- Open with the hook and state the point within the first few paragraphs. No throat-clearing ("In today's fast-paced world...").
- One idea per paragraph. Topic sentence first.
- Short, common words. Active voice. Concrete nouns and verbs.
- Subheadings that say something ("Free users cost us 30% of support time"), not labels ("Background").
- Explain jargon the reader may not know, or remove it.
- Use lists for steps or parallel items, prose for argument.
- End with a close that pays off the opening: a takeaway, a next step or a call to action. Do not just summarise.

## 5. Editing pass

Go through the draft in this order, one pass per item:

1. **Structure**: does every section support the point? Cut or move what doesn't.
2. **Opening**: would the reader keep going after three sentences?
3. **Cut**: remove repetition, filler (very, really, just, actually), hedges that add nothing, and sentences that restate the previous one. Aim to cut 10-20%.
4. **Clarity**: split sentences over about 25 words; replace abstractions with examples.
5. **Accuracy**: every number, name, quote and link checked against its source.
6. **Consistency**: terms, capitalisation, spelling variant (US or UK) and voice.
7. **Machine-prose sweep**, in two tiers (patterns and fixes in `references/ai-tells.md`):
   - **P0, always fix**: leftover chatbot text ("Certainly! Here is...", "I hope this helps"), knowledge-cutoff or "as an AI" disclaimers, unattributed authority ("experts say", "studies show" with no source), and routine events inflated into turning points.
   - **P1, fix unless the author's voice needs it**: stock words (delve, leverage, robust, seamless, tapestry), "in the rapidly evolving world of" openers, "let's dive in" transitions, cycling synonyms for the same thing, stacked hedges ("could potentially"), bold scattered through paragraphs, and bullet lists of bare noun phrases where an argument belongs.
8. **Read aloud** test: flag anything awkward.

## 6. Headline, summary and metadata

- Offer three to five headline options: specific, honest, ideally with the benefit or the surprise. No clickbait the article does not deliver.
- A one- or two-sentence summary (standfirst or dek).
- A meta description for the web, and a suggested URL slug. Google sets no fixed length and truncates by display width, so keep the key point in the first 120 characters or so; about 150-160 characters is a common convention, not a rule.
- If the piece targets search, use the phrase readers would search for in the headline or first paragraph naturally; do not stuff keywords.

## Rules

- Never fabricate facts, quotes, sources or anecdotes, and never present the author as having done something they did not tell you about.
- Do not copy text from sources; quote briefly with attribution or paraphrase.
- Keep the author's voice when editing their draft; fix problems, do not rewrite their personality away.
- For technical docs (API references, READMEs, how-to guides inside a product) use the `technical-writing` skill instead.

## Output

```
# <Headline>
<Summary / standfirst>

<Article body>

---
Headline options: 1. ... 2. ... 3. ...
Meta description: <...>   Slug: <...>
Word count: <n>
To check: <list of [CHECK] items and sources to confirm>
```
