# Revenue metrics queries

Shapes for a schema with `subscriptions`, `invoices`, `invoice_lines (invoice_id, subscription_id, kind, amount_minor, currency, period_start, period_end)` and `credit_notes`. Adapt names; give each currency its own figures or convert with a dated rate table, never with today's rate for past months.

## MRR at a date

```sql
-- Recurring lines whose service period covers :as_of, net of discounts, normalised to a month.
SELECT l.currency,
       SUM(l.amount_minor * 2629746.0  -- average seconds per month (365.2425 days / 12)
           / EXTRACT(EPOCH FROM (l.period_end - l.period_start))) AS mrr_minor
FROM invoice_lines l
JOIN invoices i ON i.id = l.invoice_id
WHERE l.kind = 'recurring'
  AND i.status IN ('open', 'paid')
  AND l.period_start <= :as_of AND l.period_end > :as_of
GROUP BY l.currency;
```

Subtract credit note lines that credit recurring lines in the same period. Decide whether `open` (unpaid, in dunning) counts; many teams exclude invoices past the final dunning attempt.

## MRR movements for a month

For each customer, compare MRR at the start (`m0`) and end (`m1`) of the month:

| Bucket | Rule |
|---|---|
| new | `m0 = 0`, `m1 > 0`, first ever paid subscription for the customer |
| reactivation | `m0 = 0`, `m1 > 0`, customer had MRR before |
| expansion | `m1 > m0 > 0` |
| contraction | `0 < m1 < m0` |
| churn | `m0 > 0`, `m1 = 0` |

Check: `opening + new + reactivation + expansion - contraction - churn = closing`. Group by customer, not subscription, if a plan change creates a new subscription; otherwise every plan change shows as churn plus new.

## Deferred revenue (straight-line)

For each paid recurring line, revenue earned in month `M` is `amount * overlap_seconds(line period, M) / line_period_seconds`. Deferred balance at a date is paid amount minus earned to date. Hand the per-line schedule to finance; recognition policy, contract modifications and multi-element arrangements are their call.
