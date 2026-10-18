---
name: web-scraping
description: Responsible, reliable website scraping and crawling, checking robots.txt and the site's terms before fetching, looking for an official API or feed first, throttling requests with backoff and an identifying User-Agent, parsing static HTML with selectors versus driving a headless browser only when the page needs JavaScript, walking pagination, detecting layout changes, and storing raw responses separately from parsed records. Use when writing or fixing a scraper or crawler, extracting listings, prices or tables from web pages, a scraper suddenly returns empty fields or gets 429 or 403 responses, or deciding whether a site may be scraped at all.
license: MIT
compatibility: Any Agent Skills host. Needs network access to the target site and the project's language runtime; examples name Python (httpx, BeautifulSoup/lxml, Playwright) and Node (fetch, cheerio, Playwright) libraries.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Web scraping

Collect data from websites in a way the site owner would tolerate, that keeps working when the page changes, and that never loses what was fetched.

## 1. May we scrape this? (do this first)

1. **Look for an official route**: a public API, data export, RSS/Atom feed, sitemap, or open-data download. If one exists, use it and stop here.
2. **Read `robots.txt`** (`https://<host>/robots.txt`, format in RFC 9309). Follow the groups whose `User-agent` matches your crawler's product token (several matching groups are combined); use the `*` group only if no group matches. The longest matching path rule wins, and `Allow` should win a tie. If robots.txt returns 4xx, it places no restrictions; if it returns 5xx or cannot be reached, treat the whole site as disallowed. Fetch robots.txt separately for each scheme and host (with port): each serves its own file. Do not cache it for more than 24 hours. Honour `Crawl-delay` if present, even though RFC 9309 does not define it.
3. **Read the terms of service** for clauses on automated access, scraping or reuse.
4. **Stop and ask the user** before going further if any of these hold:
   - robots.txt disallows the paths, or the terms forbid automated access;
   - the data sits behind a login, paywall or CAPTCHA;
   - the pages contain personal data (names, emails, phone numbers, profiles);
   - the user plans to republish or sell the content, or to scrape at large volume.
   These raise legal questions (contract terms, copyright and database rights, computer-misuse laws, data-protection laws such as GDPR) that vary by country. This skill does not give legal advice; tell the user a lawyer should review commercial or large-scale use.

**Never**: bypass CAPTCHAs, logins you were not given, IP bans or other access controls; rotate proxies or spoof browsers to evade a block; collect personal data without a lawful reason the user has confirmed; or ignore a site's request to stop.

## 2. Be polite

- Identify yourself: a `User-Agent` such as `ExampleBot/1.0 (+https://example.com/bot; ops@example.com)`. Ask the user for the contact details.
- One request at a time per host by default, with a delay (start at 1 to 2 seconds or the `Crawl-delay`). Never run parallel workers against one small site.
- On `429` or `503`, honour `Retry-After`; otherwise back off exponentially with jitter, and stop after a few attempts. On repeated `403`, stop and report: it usually means you are blocked, and evading it is off the table.
- Use conditional requests (`If-None-Match` / `If-Modified-Since` with the stored `ETag` / `Last-Modified`) and cache responses so reruns do not re-download.
- Scrape off-peak for the site's time zone when volume is large.

## 3. Choose the fetch method

Decide in this order and take the first that works:

1. **JSON behind the page**: open the browser's network panel; many sites load data from an XHR/fetch endpoint. If it is public and allowed, request it directly.
2. **Static HTML**: if the data is in the raw response (`curl -s <url> | grep '<a known value>'`), use an HTTP client plus a parser (Python `httpx` + `selectolax`, `lxml` or BeautifulSoup; Node `fetch` + `cheerio`).
3. **Embedded data**: look for `<script type="application/ld+json">`, `__NEXT_DATA__` or similar JSON in the HTML; parse that instead of the markup.
4. **Headless browser** (Playwright) only when content is rendered by JavaScript and none of the above work. Wait for a specific selector, not a fixed sleep; block images and fonts to cut load; close pages and contexts.

## 4. Parse robustly

- Prefer stable hooks: `id`, `data-*` attributes, semantic tags, structured data. Avoid long positional XPaths and generated class names like `css-1x2y3z`.
- Parse each record into a typed schema (dataclass, Pydantic, zod) and validate it; a missing required field is an error, not an empty string.
- Normalize as a separate step: trim whitespace, parse prices into integer minor units plus currency, dates into ISO 8601 with time zone, resolve relative URLs against the page URL.
- Keep the source URL and fetch timestamp on every record.

## 5. Pagination and crawling

- Follow the site's own next link or cursor parameter; stop when it disappears, a page returns zero items, or a page repeats the previous one's items.
- Set a hard maximum page count and total request budget per run.
- For crawls, keep a visited set keyed by normalized URL (lowercase host, drop fragments and tracking parameters), stay within the allowed host and path prefix, and prefer the sitemap for discovery.
- Make runs resumable: persist the frontier and the last cursor.

## 6. Store raw and parsed separately

- **Raw**: the response body, status, headers, URL and fetch time, written once to object storage or disk (for example `raw/<host>/<YYYY-MM-DD>/<sha256 of URL>.html.gz`). Never overwrite it. Parser bugs are then fixed by re-parsing, not re-fetching.
- **Parsed**: validated records in a table with a natural key (the site's item ID or canonical URL), upserted so reruns do not duplicate. Keep `first_seen` and `last_seen`.
- Set a retention period for raw pages with the user, especially if they contain personal data.

## 7. Detect change and breakage

- After each run, compare against the previous run: record count, share of records with each required field, and new parse errors. Alert when they move beyond a threshold (for example count down 30% or a field's fill rate below 90%).
- Keep a few saved HTML fixtures per page type and unit-test the parser against them; when the site changes, add the new page as a fixture before fixing the parser.
- For content change monitoring, hash the normalized extracted content, not the whole page (ads and timestamps change every load).

## Report back

- Target site, permission findings (official API, robots.txt result, terms, personal data) and what the user decided.
- Fetch method chosen and why; rate limit and User-Agent used.
- Output schema, storage locations for raw and parsed data.
- A sample run: pages fetched, records parsed, errors, and how long it took.
- Known fragile selectors and the change-detection checks in place.
