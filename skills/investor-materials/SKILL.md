---
name: investor-materials
description: Drafts startup fundraising documents, namely a pitch deck outline, a one-page investor summary and the recurring investor update, built around a clear narrative, the few metrics investors judge a company on, a specific ask and use of funds. Use when a founder is preparing to raise a seed or Series A round, writing to existing investors about progress, or wants a deck or one-pager reviewed for gaps and common fundraising mistakes.
license: MIT
compatibility: Any Agent Skills host. No tools required; uses the metrics and documents the founder provides.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Investor materials

Help a founder tell a true, specific story that makes an investor want the next meeting. You draft structure and words; the founder owns every number and claim.

## 0. Pick the document and collect facts

Ask which of these is needed (often several):

| Document | Purpose | Length |
|---|---|---|
| Pitch deck | Get and run the meeting | 10-15 slides plus appendix |
| One-pager | Cold or warm intro, forwardable | One page |
| Investor update | Keep current investors informed and helpful | One screen of email, sent on a fixed cadence |

Collect before writing, and ask for anything missing:

1. What the company does in one sentence, for whom, and why now.
2. Stage, amount raised so far, the round being raised (amount, instrument such as a SAFE or priced round), and any committed investors.
3. Real metrics with dates: revenue or MRR, growth rate, customers or users, retention, gross margin, burn and runway.
4. Team: founders and why they are the right people.
5. Target investors (stage, sector, geography).

**Stop and ask** rather than fill a gap with an invented or rounded-up number. If a metric is weak, the narrative must deal with it honestly, not hide it.

## 1. Narrative first

Write the story in five sentences before any slide:

1. The problem, for a specific customer, with evidence it hurts.
2. The solution and what is different about it.
3. Proof it is working (traction, the best single metric).
4. Why this becomes big (market and business model).
5. Why this team, and what this money achieves.

Every slide must support one of these sentences. Cut slides that do not.

## 2. Pitch deck outline

Use this order unless the founder's strongest point should come earlier (often traction):

1. **Title**: company, one-line description, contact.
2. **Problem**: who has it, how they cope today, what it costs them.
3. **Solution**: the product and the key insight. Show it (screenshot or demo flow).
4. **Why now**: what changed (technology, regulation, behaviour, cost).
5. **Traction**: one chart of the best metric over time, plus two or three supporting numbers.
6. **Market**: bottom-up size (number of customers times price), not only a top-down headline figure. See the `market-research` skill for sizing.
7. **Business model**: how you charge, price points, unit economics if known.
8. **Competition**: honest map of alternatives, including "do nothing" and spreadsheets, and why customers pick you.
9. **Go-to-market**: how customers are acquired today and how that scales.
10. **Team**: relevant experience, not job-title lists.
11. **The ask**: amount, instrument, what it funds, milestones it reaches and how many months of runway.
12. **Appendix**: detailed financials, cohort data, product detail, for questions.

Slide-writing rules: one message per slide, written as the slide headline ("Revenue grew 3x in 6 months", not "Traction"); numbers with dates and definitions; readable at a glance.

Detailed slide prompts and a one-pager and update template are in `references/templates.md`. Read it when drafting the document itself.

## 3. Metrics that matter

Choose the ones that fit the business model and define each one:

- **SaaS / subscription**: MRR or ARR, month-on-month growth, net revenue retention, logo churn, CAC payback, gross margin.
- **Marketplace**: GMV, take rate, net revenue, repeat purchase rate, liquidity on both sides.
- **Consumer**: active users (define active), retention cohorts, engagement frequency, organic share of acquisition.
- **Fintech / payments**: total payment volume, revenue as a share of volume, loss and fraud rates, licences held.
- **All**: burn, runway in months, revenue or usage concentration in top customers.

Say "revenue" only for recognised revenue. Label bookings, pilots, letters of intent and GMV as what they are.

## 4. The ask

- State an exact amount or a narrow range, the instrument and the terms already agreed (for example a valuation cap on a SAFE).
- Use of funds as three to five buckets with percentages that sum to 100.
- Tie the money to milestones that make the next round possible, and the runway it buys.

## 5. Investor update

Send on a fixed cadence (monthly or quarterly), short, same structure every time:

1. Headline: one-line summary of the period.
2. Key metrics table, same metrics each time, with change versus last period.
3. Wins.
4. Challenges, stated plainly, with what you are doing about them.
5. Asks: specific introductions, hires or advice.
6. Cash and runway.

Never skip bad months; consistency builds trust.

## Common mistakes to flag when reviewing

- No clear ask, or an ask with no milestones.
- Top-down market size only ("1% of a $50B market").
- Vanity metrics (downloads, sign-ups) without retention or revenue.
- Undefined or cherry-picked metrics, or charts without axes and dates.
- "No competitors".
- Too much text; slides that need the founder to explain them.
- Financial projections presented as facts.
- Inconsistent numbers between deck, one-pager and data room.

## Rules

- Never invent, inflate or round up traction, revenue, customers, logos or committed investors. Misrepresenting facts to investors can be fraud.
- Do not give legal, tax or securities advice; for instruments, terms and fundraising rules in the founder's jurisdiction, tell them to confirm with a lawyer.
- Keep confidential figures out of anything the founder says will be shared publicly.

## Output

Deliver the requested document(s) in Markdown, followed by:

```
## Gaps and questions
- <missing metric or claim that needs a source>
## Review notes
- <mistakes from the list above that apply, with the fix>
```
