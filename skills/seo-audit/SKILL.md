---
name: seo-audit
description: Technical and on-page SEO audit of a website or its source code, covering crawlability, robots.txt and sitemaps, indexation and canonicals, titles and meta descriptions, structured data, Core Web Vitals, and internal linking, ending in a fix list ranked by impact and effort. Use when someone asks why pages are not ranking or not indexed, wants an SEO health check before or after a launch or migration, or needs a prioritised list of search fixes for a site.
license: MIT
compatibility: Any Agent Skills host. Works on a codebase offline; live checks need network access and optionally curl. Search Console and analytics data come from the user.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/requires: "curl"
  kete-loom/owner: "Kete-org"
---

# SEO audit

Find what stops search engines from crawling, indexing and understanding the site, then rank the fixes. Evidence first: every finding names the URL or file and what you observed.

## 0. Scope

1. Ask, or infer from the request:
   - The site URL and whether you may fetch it live. Without network, audit the source (templates, routes, `robots.txt`, sitemap generator, head tags).
   - The goal: launch check, traffic drop, migration, or a general health check.
   - Which pages matter most (top landing pages, product or pricing pages). Audit those first.
2. Ask for Search Console exports if they exist (Pages/indexing report, Performance by page and query, Core Web Vitals report). Real data beats guesses. If none, say so in the report.
3. **Stop and ask** before crawling more than a few hundred URLs, or any site the user does not own.

## 1. Crawlability

- Fetch `/robots.txt`. Check that it does not block CSS, JS, or sections that should rank, and that it lists the sitemap. Remember `Disallow` stops crawling, not indexing; a blocked URL can still be indexed from links, and its `noindex` will never be seen.
- Fetch the sitemap(s). Every URL listed should return 200, be canonical and indexable. Flag 3xx, 4xx, `noindex` or non-canonical URLs in the sitemap.
- Check status codes for key pages with `curl -sI <url>`. Look for redirect chains (more than one hop), soft 404s (a 200 page that says "not found"), and 5xx.
- Check that content and links exist in the rendered HTML. If the site is a client-rendered SPA, compare `curl -s <url>` with the rendered DOM; links must be real `<a href>` elements, not click handlers.

## 2. Indexation

- One canonical URL per page: `<link rel="canonical">` is absolute, self-referencing on the preferred version, and consistent with redirects, sitemap and internal links.
- One host and protocol: `http`→`https` and `www`/non-`www` redirect to a single version with a 301 or 308.
- `meta name="robots"` and the `X-Robots-Tag` header: no stray `noindex` on pages that should rank (a common leftover from staging).
- Parameters, faceted navigation and pagination do not create endless duplicate URLs.
- Multilingual sites: `hreflang` annotations are reciprocal and point to canonical URLs.
- If Search Console data is available, list the top reasons pages are "not indexed" and how many URLs each affects.

## 3. On-page

For each priority page check:

- `<title>`: unique, describes the page, leads with the main topic. Flag missing, duplicated or boilerplate titles.
- Meta description: unique and specific. It is not a ranking factor but shapes the snippet and click-through.
- One clear main heading (`<h1>`) that states the topic; headings follow the content structure. Multiple `<h1>` elements are not an error for Google, but a missing or generic one (logo text on every page) is worth fixing.
- The page answers the query it targets, with substantive content rather than thin or duplicated text.
- Images have descriptive `alt` text and sensible file names; large images are compressed and sized.
- URLs are readable and stable.
- Ignore `meta keywords`; Google does not use it.

## 4. Structured data

- Find JSON-LD (`application/ld+json`) and check it describes content visible on the page.
- Use types that match the page: `Organization`, `WebSite`, `BreadcrumbList`, `Product` with `Offer`, `Article`, `LocalBusiness`, `Event` and so on.
- Validate with Google's Rich Results Test and the Schema Markup Validator. Report errors and the missing required properties.
- Google no longer shows HowTo or FAQ rich results, so do not recommend adding that markup for rich results. Check the current list in Google's structured data search gallery before promising any rich result.

## 5. Performance and mobile

- Core Web Vitals, judged on field data at the 75th percentile: LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less. Use the Search Console report or PageSpeed Insights (CrUX data) when available; Lighthouse is lab data; a standard page-load run cannot measure INP, so use Total Blocking Time as a proxy there and never present lab numbers as the field assessment.
- The page works on a phone: viewport meta tag, readable text, tap targets not crowded, no content hidden on mobile that exists on desktop.
- Name the likely cause of each failing metric (unoptimised hero image, render-blocking scripts, late-loading fonts, layout shifts from ads or images without dimensions). For deep performance work, hand off to the `web-performance` skill if installed.

## 6. Internal links and site structure

- Important pages are reachable within about three clicks of the home page and linked from navigation or relevant content.
- Find orphan pages (in the sitemap but with no internal links) and broken internal links.
- Anchor text describes the target page; avoid "click here".
- Internal links point straight at the canonical URL, not through redirects.

The detailed check list with commands is in `references/checks.md`. Read it when you audit a live site.

## 7. Prioritise

Score each finding:

- **Impact**: High if it blocks indexing or affects the money pages; Medium if it weakens many pages; Low if cosmetic or one page.
- **Effort**: S (config or one template), M (several templates or content), L (architecture or content programme).

Order the fix list by impact, then by effort. Indexing blockers always come first.

## Rules

- Never claim a ranking outcome or a date by which traffic will rise. Search ranking is not guaranteed.
- Never recommend hidden text, doorway pages, keyword stuffing, link schemes or cloaking.
- Do not change `robots.txt`, canonicals or redirects in the codebase without the user's agreement; a wrong edit can de-index the site.
- Mark anything you inferred without fetching or without data as "unconfirmed".

## Report format

```
# SEO audit: <site> (<date>)
Scope: <pages checked, live or source, data used>

## Summary
<3-5 lines: overall state, the biggest blocker, the quickest win>

## Fix list
| # | Issue | Evidence (URL/file) | Impact | Effort | Fix |
|---|-------|---------------------|--------|--------|-----|

## Detail by area
Crawlability / Indexation / On-page / Structured data / Performance / Internal links

## Not checked
<what needs data or access you did not have>
```
