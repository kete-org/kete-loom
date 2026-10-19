---
name: ecommerce-analytics
description: Business health review of an online shop from its order, line-item and customer exports (Shopify, WooCommerce, Amazon seller reports or a custom store database) - net revenue, orders, average order value, new versus returning customers, repeat purchase rate, monthly acquisition cohorts and RFM segments, product and channel mix, and leakage through refunds, discounts and shipping - ending in diagnosed causes and a ranked action plan. Use when a store owner or merchandiser asks how the shop is really doing, why sales or repeat customers dropped, which products and channels make money, or where discounts and returns are eating margin.
license: MIT
compatibility: Any Agent Skills host that can run Python with pandas or the DuckDB CLI on exported CSV files.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: runs-commands
  kete-loom/requires: "python3"
  kete-loom/owner: "Kete-org"
---

# E-commerce analytics

Turn raw store exports into a short review a store owner can act on: what changed, why, and what to do first. The numbers must reconcile with the store's own reports, or the review says why they do not.

## Ground rules

1. **Agree the definitions before computing.** Write each metric's formula in the report (definitions in `references/metric-definitions.md`). The big ones: whether revenue is gross or net of discounts, refunds, tax and shipping; which order statuses count (exclude test, cancelled and fully voided orders); and the time zone of "day".
2. **Reconcile first.** Total orders and net revenue for one month must match the platform's own sales report within a stated tolerance. If not, find the reason (status filter, tax, currency, time zone) before going further.
3. **Customers are keyed carefully.** Use the platform customer ID; fall back to a normalised email (lowercase, trimmed). Guest checkouts without either are counted separately, never merged by name.
4. **One currency.** Convert multi-currency orders at the rate on the order date and state the source of rates, or analyse each currency separately.
5. **Compare like with like.** Month-on-month for trend, same period last year for seasonality; flag months with promotions, stock-outs or site outages.
6. **Personal data stays in the data.** Reports show segments and counts, never customer names, emails or addresses.

## Inputs to ask for

- Orders export with order ID, created date, status, financial status, subtotal, discounts, shipping, tax, total, refunds, currency, customer ID or email, and source/channel (UTM or referring site if present).
- Line items: order ID, SKU or product ID, quantity, unit price, line discount, and unit cost if available (margin needs it).
- Optional: customers export, marketing spend by channel and month, returns reasons.

Stop and ask if there is no cost data and the user wants profitability, or if the export covers fewer than two full months.

## Steps

1. **Profile and clean** the exports: duplicates on order ID, test orders, status values, date range, currency mix. Record every exclusion with a row count.
2. **Reconcile** one month against the platform report (rule 2).
3. **Headline trend** by month: orders, net revenue, AOV, units per order, new versus returning customers, and their share of revenue.
4. **Retention**: repeat purchase rate (share of customers with 2+ orders in the window), time between first and second order, and a monthly acquisition cohort table of the share of each cohort ordering again in months 1, 2, 3, 6 and 12. Only judge cohorts old enough to have that month.
5. **RFM segmentation**: score recency, frequency and monetary value 1 to 5 by quintile, then name segments (for example champions, loyal, at risk, lapsed, one-time) and give count and revenue share for each.
6. **Product mix**: revenue and units by product or category, Pareto share of the top 20% of SKUs, products bought first by customers who come back (gateway products), products with high refund rates, and, if cost exists, gross margin per product.
7. **Channel mix**: orders, revenue, AOV and new-customer share by source; customer acquisition cost and payback where spend data exists. Say clearly that last-click source is not causal attribution.
8. **Leakage**: discount rate (discounts / gross sales) by month and by code, share of orders using a discount, refund rate by count and value, refund reasons, and shipping charged versus shipping cost if known. Flag discount codes used far beyond their intended audience.
9. **Diagnose**: for each material change, decompose revenue into orders x AOV and orders into new x returning to find which driver moved, then check the likely causes (traffic, conversion, price, stock, promotion calendar) with the data you have. Label each cause as confirmed by data, plausible, or needs data you do not have.
10. **Action plan**: three to seven actions ranked by expected impact and effort, each tied to a finding and a metric to watch.

## Stop and ask the user

- When the export is incomplete (missing months, missing refunds) and conclusions would change.
- Before sending any analysis that includes customer-level lists out of the store's systems.
- When the user wants tax, VAT or accounting figures: this review is management analysis, not bookkeeping; route those to an accountant.

## Never

- Report gross revenue as revenue without saying so.
- Compare a partial current month with full months.
- Claim a channel or discount "caused" growth from correlation alone.

## Report format

```
# Store review: <store>, <period>
Data: <exports, date range, rows>, exclusions <list with counts>, reconciliation <matched within x% | gap and reason>
Definitions: <revenue, AOV, repeat rate as computed>

## Headlines
- <3-5 numbers with change vs previous period and vs last year>

## What changed and why
| change | driver (orders/AOV/new/returning) | likely cause | evidence level |

## Retention and segments
<cohort table summary, RFM segment table>

## Products and channels
<top findings>

## Leakage
<discounts, refunds, shipping>

## Action plan
| # | action | finding | expected impact | effort | metric to watch |

## Gaps
<data that would sharpen this review>
```

Query and pandas patterns for cohorts and RFM are in `references/metric-definitions.md`. For an ongoing dashboard of these metrics, hand over to `metrics-dashboards`.
