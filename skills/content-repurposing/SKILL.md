---
name: content-repurposing
description: Breaks one finished long-form source (article, talk recording, podcast episode, webinar or report) into channel-native derivatives such as LinkedIn posts, X threads, newsletter sections, short video clip scripts and quote cards, by extracting the core claims with timestamps or paragraph references, matching each to a format, and checking every derivative against the source so nothing is exaggerated, misquoted or stripped of its caveats. Use when someone has a long piece already published or recorded and wants a set of social posts, threads, a newsletter or clips made from it, or wants derivatives checked for accuracy against the original.
license: MIT
compatibility: Any Agent Skills host. Needs the source as text (article or transcript with timestamps); clip cutting itself is done in the user's video tool.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Content repurposing

Turn one long piece into many short ones that each work on their own channel, and that all still say what the original said.

## Ground rules

1. **The source is the only source.** Every claim, number and quote in a derivative must trace to a paragraph or timestamp in the original. No new facts, statistics or examples unless the user supplies them.
2. **Quotes are exact.** Quote marks mean the speaker's words verbatim from the transcript. Tidy filler words only with "[...]" or by paraphrasing without quote marks. Name the speaker as they are credited.
3. **Keep the caveats.** If the source says "in our sample of 40 customers" or "early results", the derivative says it too. Do not turn "may help" into "proves".
4. **Native, not pasted.** Each channel gets its own shape, length and opening; never post the same paragraph everywhere.
5. **One idea per derivative.** A post that tries to summarise the whole piece usually says nothing.
6. **Credit and link back** to the original where the channel allows it.

## Steps

1. **Get the source in text.** For audio or video, ask for a transcript with timestamps (or produce one with the user's transcription tool). Ask who the audience is, which channels they use, the brand voice guide if one exists, and the goal (traffic back to the piece, followers, sign-ups).
2. **Extract a claim map.** List 5 to 15 standalone ideas: each a one-sentence claim, its support (data, story, example), the exact reference (paragraph number or `mm:ss`), and any caveat. Mark the 2 or 3 strongest. Show this map to the user before drafting if the piece is technical, regulated or about named people.
3. **Match ideas to formats** with the table below. Pick only the channels the user actually uses.
4. **Draft each derivative** from one row of the claim map. Write the hook first (the specific claim or result, not "In today's episode..."), then the support, then one call to action.
5. **Accuracy pass.** For every derivative, check each sentence against its reference: same meaning, same numbers, caveats kept, quotes verbatim, speaker correct. Fix or drop anything that does not trace back.
6. **Channel pass.** Check length, link placement and formatting against the platform's current limits. Posting or scheduling through APIs is the social-media-publishing skill's job.
7. **Plan the release.** Space derivatives over 2 to 4 weeks, lead with the strongest idea, and vary formats so the same audience does not see the same point twice in a week.

## Format guide

| Format | Shape | Best for |
|---|---|---|
| LinkedIn post | Hook line, short paragraphs, one takeaway, link in the post or first comment per the user's practice; with the `linkedin-content` skill installed, draft each in the user's voice profile and run its `post-check.js` | Lessons, results, opinions with reasoning |
| X thread | First post states the payoff; 4 to 8 posts, one point each; last post links to the source | Step-by-step processes, lists, a story with a turn |
| Single X post | One sharp claim or number with its context | The most quotable line |
| Newsletter section | 150 to 400 words: why it matters to this reader, the key idea, link to the full piece | Existing subscribers; deeper context |
| Short video clip (Reels, Shorts, TikTok, LinkedIn video) | 20 to 60 seconds; starts on the strongest sentence; burned-in captions; one idea | Talks, podcasts with video, demos |
| Quote card | One verbatim line, speaker name, source title | Memorable lines; check the quote twice |
| Carousel or slide set | One point per slide, 5 to 10 slides | Frameworks, checklists, before/after |

## Clip selection (talks and podcasts)

1. Scan the transcript for moments that stand alone: a clear claim, a story with an ending, a surprising number, a strong answer to a question.
2. Record start and end timestamps with a few seconds of padding, and the first sentence the clip opens on.
3. Reject clips that need earlier context to make sense, or whose meaning changes when cut (a joke, a hypothetical, a "some people say...").
4. Write the caption and on-screen title for each clip; captions must match what is said.

## Stop and ask the user

- Before quoting or clipping a guest or a third party; confirm the user has permission to reuse their words and likeness.
- When the source contains health, financial, legal or safety advice; derivatives must keep its qualifications, and a qualified reviewer should approve them.
- When a strong derivative would need a fact the source does not contain.
- Before using material marked internal, embargoed or unpublished.

## Never

- Invent statistics, quotes, customer names or results to make a post punchier.
- Remove caveats, attribution or context that changes the meaning.
- Present a paraphrase in quote marks.
- Rewrite the whole source into a new long article; that is a separate article-writing job.

## Output format

```
Source: title, link, length            Audience and goal: ...
Claim map: # | claim | support | reference (para or mm:ss) | caveat
Derivatives (one block each):
  Channel / format:
  Built from claim #:
  Draft:
  Accuracy check: pass | notes
Clips: start-end | opening line | caption
Release plan: date | channel | derivative
Questions for the user: ...
```
