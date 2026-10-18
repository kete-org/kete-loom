# HTML decks

## reveal.js

Install from npm (`npm i reveal.js`) or load from a CDN with a pinned version. Check the current major on revealjs.com before pinning.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Checkout reliability</title>
  <link rel="stylesheet" href="node_modules/reveal.js/dist/reveal.css">
  <link rel="stylesheet" href="node_modules/reveal.js/dist/theme/white.css">
  <link rel="stylesheet" href="deck.css">
</head>
<body>
  <div class="reveal"><div class="slides">
    <section>
      <h1>Checkout failures cost us 4% of orders</h1>
      <p>Q3 review, Payments team</p>
      <aside class="notes">Open with the cost, then say we found one main cause.</aside>
    </section>
    <section data-auto-animate>
      <h2>70% come from one provider timeout</h2>
      <ul>
        <li class="fragment">Timeouts after 10s</li>
        <li class="fragment">No retry on our side</li>
      </ul>
    </section>
  </div></div>
  <script src="node_modules/reveal.js/dist/reveal.js"></script>
  <script src="node_modules/reveal.js/dist/plugin/notes.js"></script>
  <script src="node_modules/reveal.js/dist/plugin/highlight.js"></script>
  <script>
    Reveal.initialize({ hash: true, plugins: [RevealNotes, RevealHighlight] });
  </script>
</body>
</html>
```

These are the paths the current revealjs.com plugin docs give (`dist/plugin/*.js`, with `.mjs` ES modules alongside). Older 4.x packages used `plugin/notes/notes.js` and `plugin/highlight/highlight.js`; check the installed package's folders.

Key features:

- Speaker notes: `<aside class="notes">` inside a `<section>`, or `data-notes="..."`. Press `S` for the speaker view; it needs the deck served over HTTP (`npx serve .` or `python3 -m http.server`), not opened from `file://`.
- Vertical slides: nest `<section>` inside `<section>`; use for optional depth, not the main path.
- Fragments: `class="fragment"` reveals items step by step. Use sparingly.
- Auto-animate: `data-auto-animate` on consecutive slides animates matching elements.
- Code: `<pre><code data-line-numbers="3-5|8" class="language-js">` with the highlight plugin steps through highlighted lines.
- Size: default canvas 960x700, scaled to fit. For 16:9 set `width: 1280, height: 720` (or 1920x1080) in `Reveal.initialize`.
- Markdown slides: the markdown plugin with `<section data-markdown>`, `---` between slides, `Note:` for notes.
- Pandoc can also write reveal.js: `pandoc -s -t revealjs slides.md -o slides.html`.

## Plain HTML/CSS deck

For a handful of slides with no dependency:

```html
<main class="deck">
  <section class="slide"><h1>...</h1></section>
  <section class="slide"><h2>...</h2></section>
</main>
```

```css
.slide { width: 100vw; height: 100vh; display: grid; place-content: center;
         padding: 6vh 7vw; box-sizing: border-box; scroll-snap-align: start; }
.deck { height: 100vh; overflow-y: auto; scroll-snap-type: y mandatory; }
@page { size: 1920px 1080px; margin: 0; }
@media print {
  .deck { height: auto; overflow: visible; }
  .slide { width: 1920px; height: 1080px; break-after: page; }
}
```

Add arrow-key navigation with a few lines of script (`scrollIntoView` on the next `.slide`) if needed. Notes can live in `<aside class="notes" hidden>` and be printed separately.

## PDF export

- reveal.js in the browser: open `http://localhost:8000/?print-pdf`, print, destination Save as PDF, landscape, margins None, background graphics on. Chrome or Chromium only.
  - `showNotes: true` (overlay) or `showNotes: 'separate-page'` prints notes.
  - `pdfSeparateFragments: false` prints each slide once with all fragments shown.
  - `pdfMaxPagesPerSlide: 1` stops tall slides spilling onto extra pages.
- Headless: `npx decktape reveal http://localhost:8000 slides.pdf` (decktape also supports other HTML frameworks and a generic mode; add `--size 1920x1080` to set the page size).
- Plain HTML: headless Chrome, e.g. `chrome --headless --print-to-pdf=slides.pdf http://localhost:8000/` (binary name varies: `google-chrome`, `chromium`, or the full app path on macOS), using the print CSS above.
