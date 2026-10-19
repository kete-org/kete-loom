# Metric definitions and patterns

State the variant you use in every report.

| Metric | Definition |
|---|---|
| Gross sales | sum of line price x quantity before discounts, excluding tax and shipping |
| Net sales | gross sales - discounts - refunds (of merchandise) |
| Net revenue (if shipping included) | net sales + shipping charged - shipping refunded; say whether tax is excluded |
| Orders | count of distinct order IDs with a counted status |
| AOV | net sales / orders (state if shipping or tax are included) |
| Units per order | units sold / orders |
| New customer (in period) | customer whose first counted order falls in the period |
| Returning customer | customer with a counted order in the period and an earlier one |
| Repeat purchase rate | customers with 2+ orders in the window / customers with 1+ orders in the window |
| Discount rate | discounts / gross sales |
| Refund rate | refunded value / net sales before refunds; also refunded orders / orders |
| Gross margin | (net sales - cost of goods) / net sales, only with unit cost data |
| CAC (channel) | channel spend / new customers acquired via that channel (last-click; not causal) |

## Cohort retention (DuckDB)

```sql
WITH o AS (
  SELECT customer_key, date_trunc('month', created_at) AS m
  FROM orders WHERE counted
), firsts AS (
  SELECT customer_key, min(m) AS cohort FROM o GROUP BY 1
)
SELECT f.cohort,
       datediff('month', f.cohort, o.m) AS month_n,
       count(DISTINCT o.customer_key) AS active
FROM o JOIN firsts f USING (customer_key)
GROUP BY 1, 2
ORDER BY 1, 2;
```

Divide `active` by the cohort size (`month_n = 0`) to get the retention share. Drop cells where the cohort has not yet reached `month_n`.

## RFM (pandas)

```python
import pandas as pd

asof = orders["created_at"].max() + pd.Timedelta(days=1)
rfm = orders.groupby("customer_key").agg(
    recency=("created_at", lambda s: (asof - s.max()).days),
    frequency=("order_id", "nunique"),
    monetary=("net_sales", "sum"),
)
q = lambda s, labels: pd.qcut(s.rank(method="first"), 5, labels=labels)
rfm["R"] = q(rfm["recency"], [5, 4, 3, 2, 1])          # recent = high score
rfm["F"] = q(rfm["frequency"], [1, 2, 3, 4, 5])
rfm["M"] = q(rfm["monetary"], [1, 2, 3, 4, 5])
```

Values are ranked before `qcut` because many customers share a frequency of 1 (or the same recency), which produces duplicate bin edges; ties are then split arbitrarily, so read F scores of 1 and 2 together. Example segment rules: champions R>=4 and F>=4; at risk R<=2 and F>=3; one-time F=1; lapsed R=1.

## Revenue decomposition

`revenue = orders x AOV`, and `orders = new-customer orders + returning-customer orders`. For a change between two periods, report the contribution of each factor (for example change in orders x old AOV, and change in AOV x new orders) so the parts add up to the total change.

## Platform notes

- Shopify order exports put each extra line item on its own row and leave most order-level fields blank on those rows. Take order totals (subtotal, shipping, taxes, total, discount amount) from one row per order (`Name`), never sum them across line-item rows, and never forward-fill them into the line rows.
- Refunds can land in a later month than the order; decide whether to report refunds by order date or refund date and keep to it.
