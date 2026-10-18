---
name: market-research
description: Structured market and competitor analysis that sizes a market top-down and bottom-up (TAM, SAM, SOM), builds a competitor feature and pricing matrix, defines customer segments, and attaches a source and a confidence level to every figure. Use when someone needs to judge whether a market is worth entering, size an opportunity, compare competitors, or back a business plan or deck with researched numbers rather than guesses.
license: MIT
compatibility: Any Agent Skills host. Web access makes it far more useful; without it, the skill works from sources the user provides and labels everything else as an estimate.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Market research

Answer a business question with evidence: how big, who competes, who buys, and how sure we are. Every number carries its source and a confidence level.

## 0. Frame the question

1. Write the decision the research supports ("Should we build a pharmacy inventory product for Ghana and Nigeria?"). Research without a decision sprawls.
2. Fix the scope: product category, geography, customer type (B2B or B2C, size), time frame and currency.
3. Ask what the user already knows: their data, customer interviews, known competitors.
4. **Stop and ask** if the market definition is ambiguous ("fintech in Africa" is not a market). Propose two or three narrower definitions and let the user choose.

## 1. Gather sources

Prefer, in order:

1. **Primary**: the user's own data, customer interviews, sales conversations, surveys.
2. **Official statistics**: national statistics offices, central banks, regulators, World Bank, IMF, UN and industry regulators' published registers (licensed businesses, operators).
3. **Company disclosures**: annual reports, regulatory filings, investor presentations, pricing pages.
4. **Industry reports and reputable press**: note publisher, date and methodology if stated.
5. **Estimates and blogs**: last resort, and always low confidence.

For each source record: title, publisher, date, URL or reference, and what figure it supports. Note when a figure is old or from another geography being used as a proxy.

## 2. Size the market

Do both methods and compare them.

**Top-down**: start from a published total and narrow it.
`total category spend x share in our geography x share in our segment`.

**Bottom-up** (the more credible one): count the customers and multiply by what they would pay.
`number of target customers x share reachable x annual price = SAM`; then `SOM = SAM x realistic share in 3-5 years`, based on channel capacity and competitor shares, not a round percentage.

Definitions:

- **TAM**: total demand for the category if every possible customer bought.
- **SAM**: the part your product and channels can serve (geography, segment, price point).
- **SOM**: the part you can realistically win in the stated period.

Show every step of the arithmetic with its input and source. If the two methods differ by more than about 3x, explain why or say which you trust and why.

## 3. Competitor matrix

1. List competitors in three groups: direct (same job, same customer), indirect (different product, same job), and substitutes (spreadsheets, manual process, doing nothing).
2. For the main 4-8, fill a matrix:

| Competitor | Target customer | Core offer | Pricing (source, date) | Channels | Strengths | Weaknesses | Evidence of traction |
|---|---|---|---|---|---|---|---|

3. Pick the two or three dimensions that customers actually choose on and place competitors on them. Say where the gap is, and whether a gap reflects an opportunity or a lack of demand.
4. Pricing and features come from the competitor's own pages or documents when possible; date them, as they change.

## 4. Customer segments

For each segment (two to four):

- Who: firmographics (industry, size) or demographics, and geography.
- Job to be done and trigger for buying.
- Current solution and its pain.
- Willingness and ability to pay; who decides and who pays.
- Size (count) and how you reached it.
- How to reach them (channels).

Recommend which segment to start with and why (pain, reachability, ability to pay).

## 5. Confidence levels

Tag every figure and conclusion:

- **High**: primary data or an official or audited source, recent, same geography and definition.
- **Medium**: reputable secondary source with stated methodology, or a close proxy.
- **Low**: estimate, old data, a different geography, or a source with no method.

The overall conclusion can be no more confident than the inputs it rests on most.

## Rules

- Never invent a statistic, a source, a competitor's revenue or a quote. If you cannot find it, say "not found" and estimate openly with the assumptions shown.
- Never present a paid-report headline figure without its date and publisher.
- Keep facts, estimates and opinions visibly separate.
- Respect site terms; do not scrape behind logins or paywalls.

## Report format

```
# Market research: <question>
Decision supported: <...>   Scope: <category, geography, customer, period, currency>

## Answer in brief
<3-5 lines with the headline numbers and confidence>

## Market size
| Measure | Value | Method | Key inputs | Confidence |
<arithmetic for top-down and bottom-up>

## Competitors
<matrix> <positioning and gaps>

## Customer segments
<table> <recommended starting segment>

## Risks and unknowns
## Sources
| # | Source | Publisher | Date | Used for |
```
