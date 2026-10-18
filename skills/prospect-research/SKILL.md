---
name: prospect-research
description: B2B prospect list building and enrichment from public sources such as company websites, filings, job posts, press and public directories, with a written ideal-customer-fit scorecard, a 0-100 fit score and a cited reason per account, buying-committee roles to contact, and warm-introduction paths found in the user's own contacts and investors, while keeping to platform terms and privacy law with no scraping behind logins. Use when a founder or sales team needs a target account list researched, scored and enriched before any outreach is written, or wants to know who in their network can introduce them to a target company.
license: MIT
compatibility: Any Agent Skills host. Web access helps for public research; the user supplies their own contact exports. Not legal advice on data protection.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Prospect research

Produce a short, ranked list of accounts that fit, the people to approach at each, and the warmest way in, with a source for every fact. Writing the outreach itself is the job of `cold-outreach-sequences`; sizing the whole market is `market-research`.

## Ground rules

1. **Public and permitted sources only.** Company websites, annual reports and company registries, regulator registers, press releases and news, job postings, conference speaker lists, public GitHub orgs, app store listings, and data providers the user already licenses. Never log in to a site to collect data, never bypass a paywall, rate limit or robots.txt, and never automate collection from a platform whose terms forbid it (LinkedIn's User Agreement forbids scraping and automated access; the user may look profiles up by hand).
2. **Cite or drop.** Every fact on the list carries a source URL or document and an access date. A guess is marked as a guess or left out.
3. **Business data, minimum personal data.** Collect name, role, company and a business contact route only. No home addresses, personal phone numbers, family details, photos or anything about health, religion, politics or other special categories.
4. **No guessed emails sent blind.** Pattern-guessed addresses are marked "unverified" and are not a substitute for a lawful basis to contact someone.
5. **The user's network data stays theirs.** Contact exports the user shares are used for matching only, are not added to the prospect file wholesale, and are not sent to any third-party service without the user's say-so.

## Step 1: Write the ideal-customer-fit scorecard

Ask the user for their best five to ten current customers (or design partners) and what made each a good fit. From that, agree on four to six criteria with weights that sum to 100, for example:

| Criterion | Weight | Evidence that counts |
|---|---|---|
| Industry / segment | 25 | registry SIC/NAICS code, website |
| Size (staff or revenue band) | 20 | filings, registry, headcount on careers page |
| Trigger event in last 6 months | 25 | funding, new market, hiring for a role, regulation change |
| Tech or process fit | 20 | job posts naming tools, public integrations, docs |
| Geography / language | 10 | registered office, markets served |

Add **disqualifiers** (too small, existing competitor customer under contract, sanctioned country, already a customer). Stop and ask the user to confirm the scorecard before researching any account.

## Step 2: Build the account list

1. Start from sources that list many companies at once: industry association member lists, registries filtered by code and region, event exhibitor lists, investor portfolio pages, marketplace or integration directories.
2. Deduplicate by legal entity and domain; note parent companies and subsidiaries.
3. Aim for 1.5 to 2 times the number of accounts the user wants, because scoring will cut some.

## Step 3: Enrich and score each account

For each account record: legal name, domain, country, size band, segment, the trigger (with date and source), tech or process signals, and any disqualifier. Score each criterion 0, half or full weight from the evidence, sum to a 0-100 fit score, and write one line saying why. Mark accounts with fewer than three sourced criteria as "thin evidence" instead of scoring them high.

Tiers: **A** 75+, **B** 50-74, **C** below 50 (park, don't contact).

## Step 4: Map the buying committee

For A and B accounts, list the roles that matter (economic buyer, champion or user, technical evaluator, possible blocker) and the named person only where a public source shows them in that role now. Note the source and date; people move, so anything older than 12 months is "check before contact".

## Step 5: Find warm-intro paths

Ask the user for what they are willing to share: a contacts export, a list of investors, advisers, past employers, customers who would refer, alumni groups. Match on company domain and past employers. For each A account, rank the paths:

1. A current customer or investor who knows someone at the account.
2. A former colleague who now works there or recently did.
3. A shared investor, adviser or community.
4. A public route: speaking at the same event, a mutual open-source project.

For each path, write who to ask, what to ask them for, and a two-line forwardable blurb. Never contact anyone on the user's behalf.

## Privacy and compliance checks

- **EU and UK prospects:** personal data about named people is covered by the GDPR and UK GDPR even in a B2B context. The user needs a lawful basis (usually legitimate interests, with a documented balancing test), and Article 14 requires telling a person whose data you collected from elsewhere, at the latest within one month or at the first communication. Keep a record of the source of each person's data.
- **Electronic marketing rules differ by country** (for example PECR in the UK, national rules in Germany that are stricter about unsolicited email). Flag the country; leave the decision on whether to email to the user and `cold-outreach-sequences`.
- **Opt-outs and existing suppression lists** from the user's CRM must be checked before anyone is added.
- This skill is not legal advice; for a large programme or a regulated sector, recommend the user's data protection lead or counsel reviews the basis and notices.

## Stop and ask the user

- Before research starts, to confirm the scorecard, target count and regions.
- If a requested source needs a login, a paid seat the user has not mentioned, or automated collection from a platform that forbids it.
- If the user asks for personal data beyond business contact details, or for people in a country whose rules you have not checked.

## Output

Return a table (or a CSV the user can import) and a summary:

```
Account | Domain | Country | Size | Fit | Tier | Why (one line) | Trigger (date, source) | Roles / named people (source, date) | Warm path | Evidence gaps
```

Then: the scorecard used, how many accounts were found, scored and parked, the sources used with access dates, accounts marked "thin evidence", and the privacy points the user must act on before outreach.
