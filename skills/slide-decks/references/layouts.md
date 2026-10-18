# Slide types and layouts

16:9 canvas. Work on a 12-column grid with generous outer margins (about 5-7% of width).

| Slide type | Layout | Content rule |
|---|---|---|
| Title | Centered or left-aligned title, subtitle, presenter and date | Title states the talk's promise, not just the topic |
| Section divider | Large section title, optional progress marker | Use only in long decks |
| Big number | One number very large, one line of context below | "4.1% of orders failed" + source |
| Statement | One sentence, large, left-aligned | The takeaway of a section |
| Chart | Action title, chart filling most of the slide, source line | One highlighted series |
| Comparison | Two columns, same structure each side | Before/after, option A/B |
| Image + text | Image 50-60% width, 1-3 short lines | Screenshot with callouts beats raw screenshot |
| Process | 3-5 steps left to right or top to bottom | Verbs, numbered |
| Code | Monospace, 12-20 lines max, highlight the lines that matter | Reveal.js `data-line-numbers="3-5"` |
| Quote | Quote, name, role | Only real, attributed quotes |
| Ask / next steps | The decision or action, owner, date | Last content slide |
| Appendix | Dense tables, methodology | Not presented; for readers |

## Type sizes (presented, 1920x1080 or 13.33x7.5 in)

| Element | Size |
|---|---|
| Action title | 32-44pt |
| Body | 24-28pt |
| Labels, sources | 14-18pt (sources only; never body text this small) |
| Big number | 96-160pt |

For a read-alone deck, body can drop to 16-20pt with more words, but keep one idea per slide.

## Charts

- Bar for comparing categories, line for change over time, scatter for relationships; avoid pie charts with more than 3 slices.
- Start bar axes at zero.
- Grey for everything, accent colour for the point the title makes.
- Write the takeaway in the title, and the source and date in a small line underneath.

## Speaker notes template

```
Point: <the one thing this slide says>
Say: <2-5 sentences, conversational>
Evidence: <where the number comes from>
Transition: <the sentence that leads to the next slide>
```
