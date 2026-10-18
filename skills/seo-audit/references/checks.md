# SEO audit: detailed checks

Read this when auditing a live site. Replace `$SITE` with the origin, for example `https://example.com`.

## Fetching

```sh
# robots.txt and sitemap
curl -s "$SITE/robots.txt"
curl -s "$SITE/sitemap.xml" | head -50

# status, redirects and headers for one URL (follow redirects, show each hop)
curl -sIL "$SITE/some-page" | grep -iE '^(HTTP|location|x-robots-tag)'

# head tags from raw HTML (what a crawler sees before rendering)
curl -s "$SITE/some-page" | grep -iE '<title|name="description"|rel="canonical"|name="robots"|hreflang|application/ld\+json'

# list sitemap URLs and their status codes (keep the count small)
curl -s "$SITE/sitemap.xml" | grep -oE '<loc>[^<]+' | sed 's/<loc>//' | head -100 |
  while read -r u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

`-I` sends a HEAD request; a few servers answer HEAD differently from GET, so confirm a surprising status with `curl -s -o /dev/null -w '%{http_code}' <url>`. Send a normal browser-like request rate. Pause between requests on large lists and stop at the limit agreed with the user.

## In the codebase

Search for:

- `robots.txt` or the route that generates it, and the sitemap generator.
- The head/metadata layer: `<head>` templates, `metadata` exports (Next.js), `useHead`/`useSeoMeta` (Nuxt), `react-helmet`, `<svelte:head>`, Django or Rails layout templates.
- `noindex` across the repo, especially behind environment checks that could leak to production.
- Redirect config: web server config, `next.config.*` redirects, `_redirects`, `vercel.json`, `netlify.toml`, framework routers.
- `ld+json` blocks and the data they are built from.

## Check list

| Area | Check | Bad sign |
|---|---|---|
| robots | Sections that should rank are allowed | `Disallow: /` on production |
| robots | Sitemap listed | No `Sitemap:` line |
| sitemap | Only 200, canonical, indexable URLs | Redirects, 404s, `noindex` URLs listed |
| status | Single-hop redirects | Chains of 2+ hops, 302 for permanent moves |
| status | Real 404 for missing pages | 200 with "not found" text |
| canonical | Absolute, self-referencing, matches sitemap | Points to home page, to http, or to another page |
| robots meta | No accidental `noindex` | Staging setting shipped |
| host | One protocol and host | Both `www` and non-`www` serve 200 |
| title | Unique, specific | Same title on many pages |
| h1 | A clear main heading per page | Missing, or logo wrapped in `h1` on every page |
| content | Substantive and unique | Thin or near-duplicate pages |
| images | `alt`, compressed, dimensions set | Multi-megabyte hero, no `width`/`height` |
| JSON-LD | Valid, matches visible content | Errors in Rich Results Test, invented reviews |
| CWV | Field p75 LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 | "Poor" URL groups in Search Console |
| mobile | Viewport tag, readable text | Desktop-only layout |
| links | Real `<a href>`, descriptive anchors | JS-only navigation, "click here" |
| links | No broken or redirected internal links | Links to old URLs after a migration |
| hreflang | Reciprocal, canonical targets | One-way annotations |

## Migration checks

When the audit follows a domain or URL migration:

1. Every old URL 301s (or 308s) to its closest new equivalent in one hop, not all to the home page.
2. Canonicals, sitemap and internal links use the new URLs.
3. The new property is verified in Search Console and the new sitemap is submitted.
4. Compare indexed page counts and top-page traffic before and after.
