---
name: web-performance
description: Measures and improves page speed against Core Web Vitals (LCP, INP, CLS) using field data from CrUX or real-user monitoring and lab runs in Lighthouse and DevTools, then fixes the actual bottleneck, whether that is image and font delivery, render-blocking resources, HTTP caching, or too much JavaScript on the main thread. Use when a site or page feels slow, a Lighthouse or PageSpeed Insights score dropped, Search Console flags poor Core Web Vitals, or a bundle or asset change needs a before-and-after measurement.
license: MIT
compatibility: Any Agent Skills host. Lab measurement needs Node and Chrome (Lighthouse CLI). Field data needs network access to PageSpeed Insights or the project's RUM tool.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Web performance

Measure, find the one thing that dominates, fix it, measure again. Never optimise from intuition.

## Targets

Core Web Vitals, judged at the 75th percentile of real page loads, split by mobile and desktop:

| Metric | What it measures | Good | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | when the main content appears | ≤ 2.5 s | > 4.0 s |
| INP (Interaction to Next Paint) | delay from input to the next frame | ≤ 200 ms | > 500 ms |
| CLS (Cumulative Layout Shift) | unexpected movement of content | ≤ 0.1 | > 0.25 |

TTFB and FCP are diagnostics for LCP, not goals on their own. A Lighthouse navigation run (the default, and what PageSpeed Insights' lab section shows) cannot measure INP because nobody interacts; use Total Blocking Time as the lab proxy, record a Lighthouse user-flow timespan or a DevTools Performance trace of the interaction to debug it, and confirm INP in the field.

## 1. Measure first

1. **Field data** (what users get): PageSpeed Insights for the URL and origin (CrUX), Search Console's Core Web Vitals report, or the project's RUM. If the project has none, suggest the `web-vitals` library sending `onLCP`, `onINP`, `onCLS` to an analytics endpoint.
2. **Lab data** (to debug): `npx lighthouse <url> --preset=desktop` or the default mobile throttling, run 3–5 times and take the median. Use a production build, never the dev server.
3. Record a baseline: metric values, page, device, build commit. Without a baseline, **stop**: you cannot prove the fix.
4. If field and lab disagree, trust the field and find which pages, devices or interactions are slow.

## 2. Diagnose by metric

### LCP
Break it into: TTFB → resource load delay → resource load time → render delay (DevTools Performance panel shows the LCP element and phases).
- Slow TTFB: cache HTML at the CDN, fix slow server work, avoid redirect chains.
- LCP image discovered late: put it in the HTML as `<img>` (not a CSS background or JS-inserted), add `fetchpriority="high"`, never `loading="lazy"` on it. Preload only if it can't be in the markup.
- Large image: serve AVIF/WebP, `srcset` and `sizes` sized to the slot, compress.
- Render delay: inline critical CSS or keep CSS small; `defer` or `async` non-critical scripts; avoid client-only rendering of above-the-fold content.

### INP
Find the slow interaction (RUM attribution or DevTools Performance with CPU throttling). Split it into input delay, processing time, presentation delay.
- Long tasks (> 50 ms) block input: break work up and yield (`await scheduler.yield()` where supported, otherwise `setTimeout`), move heavy work to a Web Worker.
- Do the visible update first, defer analytics and non-urgent work.
- Large DOM and expensive re-renders: virtualise long lists, avoid layout thrash (read layout, then write), use `content-visibility: auto` for off-screen sections.
- Third-party scripts (tag managers, chat, A/B tools) are frequent culprits: load them later or remove them.

### CLS
DevTools "Layout shift" track or RUM attribution names the shifting element.
- Images, video, iframes and ads: set `width`/`height` attributes or `aspect-ratio`; reserve space for embeds and banners.
- Web fonts: `font-display: swap` or `optional`, preload only the one or two critical font files, and use metric overrides (`size-adjust`, `ascent-override`) on the fallback to reduce reflow.
- Never insert content above existing content after load unless it responds to user input.
- Animate `transform` and `opacity`, not `top`, `height` or `margin`.
- Make pages eligible for the back/forward cache (no `unload` handlers, no `Cache-Control: no-store` on HTML unless required).

## 3. Common fixes across metrics

**Images**: modern formats, responsive `srcset`, explicit dimensions, `loading="lazy"` and `decoding="async"` below the fold only.

**Fonts**: self-host WOFF2, subset, limit families and weights, `preconnect` if a font CDN is used.

**Caching**:
- Fingerprinted static assets (`app.3f9a1c.js`): `Cache-Control: public, max-age=31536000, immutable`.
- HTML: short `max-age` or `no-cache` with revalidation (`ETag`), so deploys show up.
- Enable Brotli or gzip compression and HTTP/2 or HTTP/3 at the server or CDN.
- `preconnect` to critical third-party origins, and no more than a few.

**JavaScript cost**:
1. Measure bundles with the build tool's analyzer (`vite-bundle-visualizer`, `webpack-bundle-analyzer`, `next build` output, `source-map-explorer`).
2. Code-split by route and load rarely used features with dynamic `import()`.
3. Replace heavy dependencies with smaller ones or platform APIs; check tree shaking works (ES modules, `sideEffects` set).
4. Ship less hydration: server-render static parts and hydrate only interactive islands where the framework supports it.
5. Set a budget (for example, JS per route in KB compressed) and fail CI when it is exceeded, if the project agrees.

## 4. Verify

1. Rebuild for production and repeat the exact measurement from step 1 (same URL, device, run count).
2. Report before → after per metric. If a change didn't move the target metric, revert it unless it has another justification.
3. Field data takes up to 28 days to show changes in CrUX; say so instead of claiming a field win from lab results.

## Stop and ask the user

- Before removing or delaying a third-party script (analytics, consent, ads, chat): it is usually a business decision.
- Before changing CDN, cache headers on HTML, or server config you can't test locally.
- Before swapping a framework or major dependency.

## Never

- Never optimise for the Lighthouse score while field metrics get worse.
- Never lazy-load the LCP image or hide content to "improve" LCP.
- Never measure on the dev server or with browser extensions active.
- Never cache HTML as `immutable`.

## Report back

```
Page/route:   <url>   Device: <mobile|desktop>   Data: <field|lab>
Baseline:     LCP <s>  INP/TBT <ms>  CLS <n>   (commit <sha>)
Bottleneck:   <metric> — <element or task> — <cause>
Changes:      <file> — <what changed>   (one line each)
After:        LCP <s>  INP/TBT <ms>  CLS <n>
Not verified: <e.g. field INP pending CrUX update>
```
