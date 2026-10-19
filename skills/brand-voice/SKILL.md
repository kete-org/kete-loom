---
name: brand-voice
description: Defines a company's written brand voice as three to five attributes with "this, not that" boundaries, paired do and don't rewrites, a preferred and banned vocabulary list and tone shifts by context, then checks or rewrites copy against that guide. Use when a team needs a voice and tone guide, wants marketing, product, support or social copy made consistent, or asks whether a piece of text sounds on-brand.
license: MIT
compatibility: Any Agent Skills host. No tools required; reads existing copy, a website or docs the user points to.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Brand voice

Voice is who the brand is, and stays constant. Tone is how that voice adjusts to the moment. This skill has two modes: **define** a voice guide, or **apply** one to copy.

This skill is for an organisation's voice. For one person's voice on LinkedIn (their words, positions, proof and off-limits topics), use the `linkedin-content` skill's voice profile instead; a company page can use either, and the two should agree.

Ask which mode, or infer it: "create our voice guide" is define; "make this sound like us" or "is this on-brand?" is apply. If applying and no guide exists, offer to define a short one first.

## Define mode

### 1. Gather inputs

1. What the company does, for whom, and its positioning against alternatives.
2. Audience: who reads the copy and what they need from it.
3. Existing material: website, app copy, emails, support replies, social posts. Ask for 5-10 pieces the team likes and 2-3 they dislike.
4. Values or personality words the team already uses.
5. Markets and languages (formality and humour travel differently).

### 2. Find the voice in the evidence

Read the material the team likes. Note recurring traits: sentence length, formality, humour, jargon, how the reader is addressed, use of "we".
Compare with the disliked pieces: what exactly is wrong with them?

### 3. Write three to five voice attributes

Each attribute has a boundary so it cannot be misread:

| Attribute | This | Not that | Sounds like |
|---|---|---|---|
| Plain-spoken | Short words, direct claims | Blunt, curt | "Your payout lands tomorrow." |
| Warm | Helpful, human, uses "you" | Gushing, over-familiar | "Thanks for waiting, here's what happened." |
| Confident | States facts, recommends | Arrogant, salesy | "This plan fits teams of 5-50." |

Rules for attributes: specific enough that two writers would apply them the same way; no generic words without boundaries ("innovative", "professional"); at least one attribute should distinguish the brand from its main competitors.

### 4. Do and don't examples

For each attribute, give at least two pairs of real or realistic lines from the brand's own contexts:

```
Don't: "We are thrilled to announce our revolutionary new feature!!!"
Do:    "You can now schedule payouts. Pick a date and we'll handle the rest."
Why:   Plain-spoken and confident: says what changed and what to do.
```

### 5. Vocabulary

- **Use**: product names (exact spelling and capitalisation), preferred terms ("customer" vs "user"), phrases that carry the brand.
- **Avoid**: jargon, clichés ("seamless", "cutting-edge", "game-changer"), words that conflict with the voice, and terms with legal or regulatory weight that need approval (for example "guaranteed", "free", "secure" in regulated industries).
- **Mechanics**: spelling variant (US or UK), date and currency formats, contractions, emoji policy, capitalisation of headings, punctuation choices (Oxford comma, exclamation marks).

### 6. Tone by context

Show how the voice flexes, with one example line each:

| Context | Tone shift | Example |
|---|---|---|
| Marketing / landing page | Most energetic, benefit-led | |
| Product UI and errors | Brief, calm, tells the user what to do | |
| Support replies | Patient, specific, owns problems | |
| Incident or bad news | Serious, direct, no jokes, no spin | |
| Social | Conversational, can be playful | |
| Legal / billing | Precise, neutral, plain words | |

Ask the user to confirm the attributes before writing the full guide if the evidence was thin.

### Guide output

```
# <Brand> voice and tone guide
## Who we're talking to
## Our voice in one sentence
## Voice attributes (table with This / Not that / Sounds like)
## Do and don't (pairs with why)
## Vocabulary (use / avoid / mechanics)
## Tone by context (table)
## Quick checklist for writers (5-8 yes/no questions)
```

## Apply mode

1. Load the guide (from the user, the repo, or the one just defined). Do not apply a voice you made up.
2. Identify the context of the copy (UI, marketing, support...) and the tone that context needs.
3. Review against each attribute, the vocabulary list and mechanics. Quote each problem line.
4. Rewrite only what is off-voice. Keep the meaning, facts, claims, legal wording and length constraints (UI strings, character limits) intact.
5. If a rewrite would change a factual or legal claim, flag it instead of changing it.

### Review output

```
## Voice review: <piece>
Verdict: on-brand | mostly on-brand | off-brand
| # | Line | Issue (attribute or rule) | Suggested rewrite |
## Revised copy (if requested)
```

## Rules

- Never copy another company's voice guide or tagline; derive the voice from this brand's own material.
- Never introduce claims, numbers or promises while rewriting.
- Keep inclusive, accessible language: no idioms that exclude, no ableist or gendered defaults, reading level suited to the audience.
- Writing a whole new article is the `article-writing` skill's job; this skill shapes how it sounds.
