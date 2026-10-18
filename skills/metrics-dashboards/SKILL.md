---
name: metrics-dashboards
description: Designs business and product metric dashboards that people act on, starting from the decisions the audience makes, writing each metric as a precise definition with formula, grain, filters, time zone and owner, picking a chart type per question, laying out headline numbers then trends then breakdowns, showing data freshness and quality status on the page, and cutting vanity metrics that never change a decision. Use when planning a KPI or operations dashboard, a dashboard nobody trusts or opens, two reports disagree on the same number, or choosing which metrics and charts belong on a Looker, Metabase, Superset, Tableau, Power BI or Grafana board.
license: MIT
compatibility: Any Agent Skills host. Tool-neutral; works with any BI or dashboard tool. Querying data needs the project's warehouse or database client.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Metrics dashboards

A dashboard earns its place when a named person looks at it on a schedule and it changes what they do. Design for that person, define every number so two people compute it the same way, and show when the data cannot be trusted.

## 1. Start from decisions, not data

Ask the user (and **stop until you have answers**):

1. **Who** looks at it (role, not "everyone") and **how often** (live, daily stand-up, weekly review, monthly board)?
2. **What decisions** do they make with it? ("Add support staff", "pause a campaign", "page on-call".)
3. **What would make them act?** A threshold, a target, or a change versus last period.

Write one line per decision: *"<Audience> uses <metric> to decide <action> when <condition>."* Any metric that fits no line is a candidate to cut.

## 2. Define every metric precisely

Fill this card for each metric before building any chart. Put the cards in the repo or the BI tool's metric layer (dbt semantic layer, LookML, Cube, the tool's own) so they are defined once.

```
Name:          Weekly active customers
Question:      How many paying customers used the product this week?
Formula:       count(distinct customer_id) where event in (core actions) and plan != 'free'
Grain:         one value per ISO week (Mon-Sun)
Time zone:     UTC  (state it; local-time reports will differ)
Filters:       excludes internal and test accounts (is_internal = false)
Source:        analytics.fct_events, analytics.dim_customers
Owner:         <person or team who answers questions about it>
Target/alert:  <target or threshold, if any>
Caveats:       events before 2025-03-01 missing mobile app
```

Rules:

- **Ratios state numerator and denominator** and whether the result is an average of ratios or a ratio of sums.
- **Counts say what is counted once** (distinct users, sessions, orders) and over what window.
- **Money states currency, gross or net, and tax and refund treatment.**
- If two reports disagree, compare their cards line by line; the difference is almost always filters, time zone, or a different window. Do not average them or pick one silently: report the cause to the user.

## 3. Cut vanity metrics

Remove or demote a metric when:

- it only ever goes up (cumulative signups, total page views all time);
- no one can name an action they would take if it moved;
- it is easy to game without improving the outcome (raw clicks, time on page alone);
- it duplicates another metric on the board.

Prefer rates and per-unit measures (conversion rate, revenue per active customer, p95 latency) and cohort or period-over-period views over all-time totals. Pair a metric that can be gamed with a counter-metric (tickets closed with reopen rate; signups with activation rate).

## 4. Choose the chart for the question

| Question | Use | Avoid |
|---|---|---|
| Where are we now versus target? | Single number with comparison (vs last period, vs target) | Gauges and dials |
| How is it trending? | Line chart, time on x-axis, consistent intervals | Pie, 3D, dual y-axes |
| How do categories compare? | Horizontal bar, sorted by value | Pie with more than 3 to 4 slices |
| What makes up the total? | Stacked bar (few parts) or a table | Donut with many slices |
| How is it distributed? | Histogram or box plot; show percentiles | Averages alone for skewed data like latency or revenue |
| Which items need attention? | Sorted table with conditional formatting | Dense heatmap without labels |
| Did the funnel leak? | Funnel or step bar with conversion between steps | |

Chart rules: start bar axes at zero; label units and time zone; mark incomplete periods (the current day or week) so a partial bar is not read as a drop; annotate known events (launch, outage, pricing change); use color for meaning (bad, good, highlighted series), not decoration, and do not rely on color alone.

## 5. Layout

1. **Top row**: 3 to 6 headline numbers tied to the decisions in step 1, each with its comparison.
2. **Middle**: trends for those same metrics.
3. **Bottom**: breakdowns and drill-down tables (by segment, region, channel).
4. Global filters (date range, segment) at the top, applied to every tile; say so if a tile ignores a filter.
5. One dashboard per audience and cadence. If it needs scrolling through more than two screens or more than about 12 tiles, split it.
6. Each tile has a title that is a question or a plain name, plus a short description or link to its metric card.

## 6. Freshness and data quality on the page

- Show **"Data as of <timestamp, time zone>"** from the actual `max(loaded_at)` of the source, not the page render time.
- Show a status when an upstream check failed or the data is late ("Orders data delayed: last load 09:10 UTC, expected 06:00"). Pull this from the pipeline's freshness and test results rather than typing it by hand.
- Match refresh cadence to the decision cadence; a weekly review does not need a 1-minute refresh.
- Note known gaps and definition changes on the dashboard with the date they took effect.

## 7. Build and verify

1. Write the query for each metric from its card; reuse the metric layer or a shared model rather than copying SQL per tile.
2. Check each headline number against an independent count (a direct query, the source system's own report) for one recent period. Report any gap above 1% to the user with its cause.
3. Check edge cases: empty segments, the current partial period, time-zone boundaries, and a filter combination with no data.
4. Ask the intended audience to read it once and say what they would do; adjust or cut tiles they skip.
5. Set a review date (for example quarterly) to delete tiles no one uses; most BI tools report view counts.

## Never

- Never ship a metric without a written definition and owner.
- Never present a partial period as a complete one.
- Never change a metric's definition without a dated note on the dashboard and telling its owner.
- Never hide a failed data check by showing the last good number with no warning.

## Report back

- Audience, cadence and the decision lines.
- Metric cards (one per metric) and the metrics cut, with reasons.
- Layout: tiles in order with chart type.
- Verification results: each headline number versus its independent check.
- Freshness and quality indicators and where they read from.
