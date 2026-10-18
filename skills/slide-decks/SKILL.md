---
name: slide-decks
description: Builds presentation decks end to end - a storyline of one idea per slide with action titles, then layouts, charts and speaker notes - as reveal.js or hand-written HTML/CSS slides, or as PowerPoint files generated with python-pptx or pandoc, edited from an existing .pptx or brand template, and exported to PDF with reveal.js print-pdf, decktape or LibreOffice. Use when someone needs a talk, team update, conference or training deck made, an outline turned into slides, an existing deck converted between HTML and PowerPoint, or slides exported to a shareable PDF.
license: MIT
compatibility: Any Agent Skills host. HTML decks need a browser and a local static server; PowerPoint output needs Python with python-pptx or pandoc; PDF export uses Chrome or Chromium, decktape (Node) or LibreOffice.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Slide decks

A deck is an argument the audience follows one step at a time. Get the storyline right in text first, then make each slide carry exactly one point, then pick the format. Most bad decks are bad outlines with nice templates.

For fundraising decks, use `investor-materials` for the content and this skill for the build. For long documents, use `technical-writing`.

## 0. Brief

Get these before writing anything; **ask** for what is missing:

1. **Audience** and what they already know.
2. **The one thing** they should believe or do afterwards.
3. **Setting**: presented live, sent to read alone, or both. A sent deck needs fuller sentences; a live one needs fewer words and real speaker notes.
4. **Length**: minutes or slide count. Roughly one slide per 1-2 minutes for a talk.
5. **Format**: HTML (reveal.js or plain), PowerPoint (`.pptx`), or "whatever, plus PDF". Check for a required brand template or an existing deck to follow.
6. **Source material**: data, docs, screenshots. Do not invent numbers, quotes or logos; mark gaps as `[TODO: figure]`.

## 1. Storyline first

Write the outline as action titles, one per slide, before any layout. Read only the titles in order: they should tell the whole story.

```
1. Checkout failures cost us 4% of orders last quarter            (situation)
2. 70% of failures come from one payment provider timeout          (complication)
3. Retrying with an idempotency key recovers most of them         (resolution)
4. A two-week fix, no new vendor                                   (plan)
5. Decision needed: approve the sprint by Friday                   (ask)
```

Rules:

- **Action titles**: a full sentence stating the point ("Churn halved after onboarding change"), not a topic label ("Churn").
- **One idea per slide.** If a slide needs "and" in its title, split it.
- Structure options: situation-complication-resolution for decisions; problem-solution-demo-next steps for product talks; a story arc for keynotes. Agenda slides only for talks over ~20 minutes.
- Put the answer early for executive audiences; build up for teaching.
- End on the ask or the one takeaway, not "Questions?".

Show the outline to the user and **get agreement before building** if the deck is longer than ~8 slides.

## 2. Slide rules

- Body text at least 24pt equivalent on a 16:9 canvas; no more than ~30 words on a presented slide. Detail goes in speaker notes or an appendix.
- One focal element per slide: a chart, an image, a big number, a short list (max 3-5 items) or a diagram.
- Charts: one message per chart, stated in the title; label lines directly instead of a legend; remove gridlines and 3D; highlight the one bar that matters.
- Consistent grid, margins and type scale across slides; use the template's layouts, never ad-hoc text boxes when a placeholder exists.
- Contrast at least 4.5:1 for text; do not rely on colour alone; add alt text to images in PowerPoint and `alt` in HTML.
- Speaker notes on every presented slide: what to say, in 2-5 sentences, plus the transition to the next slide.

Layout patterns and a slide-type cheat sheet are in `references/layouts.md`.

## 3. Build: pick the format

| Want | Use | Reference |
|---|---|---|
| Web-native, code samples, live demos, versioned in git | reveal.js | `references/html-decks.md` |
| A few slides, full design control, no dependency | plain HTML/CSS, one `<section>` per slide, print CSS for PDF | `references/html-decks.md` |
| Recipient edits in PowerPoint / Keynote / Google Slides | `.pptx` with python-pptx or pandoc | `references/pptx.md` |
| Must match a corporate template | open the template `.pptx` with python-pptx and fill its layouts | `references/pptx.md` |
| Text outline to editable deck fast | pandoc Markdown to `.pptx` with `--reference-doc` | `references/pptx.md` |

Steps for any format:

1. Create the deck from the outline: titles first, then content, then notes.
2. Render it and look at every slide (screenshots or the PDF). Check for overflowing text, orphaned bullets, low-contrast text and images that failed to load.
3. Fix, re-render, look again.

## 4. Converting an existing deck

- **pptx to HTML**: extract text, notes and images with python-pptx (walk `slide.shapes`, `shape.has_text_frame`, `slide.notes_slide`), then rebuild with the HTML structure; do not try to reproduce absolute positions.
- **HTML to pptx**: map each slide to a layout (title, title+content, two content, picture), put text in placeholders and notes in the notes pane. Charts become images unless the user needs editable charts.
- Expect to lose animations and custom fonts. List what did not convert.

## 5. Export to PDF

- reveal.js: open with `?print-pdf`, print to PDF in Chrome or Chromium (landscape, no margins, background graphics on), or run decktape headless. Details in `references/html-decks.md`.
- `.pptx`: `soffice --headless --convert-to pdf deck.pptx` (LibreOffice), then check fonts were embedded or substituted acceptably.
- Open the PDF and check every page: page count equals slide count (fragments can multiply pages), nothing cut off, notes included only if asked.

## Never

- Never fabricate data, quotes, customer logos or screenshots. Placeholders are fine and must be visible.
- Never paste paragraphs from a document onto a slide; rewrite as the point plus notes.
- Never use a company's brand template, logo or fonts for a deck that is not for that company.
- Never hand over a deck you have not rendered and looked at.

## Report back

```
## Deck: <title>
Format: <reveal.js | HTML | pptx> + <PDF?>   Slides: <n> (+ <n> appendix)
Files: <paths>
Storyline: <the action titles, numbered>
Open items: <[TODO]s, missing data, unverified claims>
Checked: <rendered and reviewed every slide: yes/no; issues fixed>
```
