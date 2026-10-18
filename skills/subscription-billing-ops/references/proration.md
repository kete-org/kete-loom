# Proration: formulas, rounding and edge cases

## Formula

For a period `[start, end)` and a change at instant `t` (`start <= t < end`):

```
remaining_fraction = (end - t) / (end - start)        # seconds, exact rational
credit_old  = round(old_amount_minor * remaining_fraction)
charge_new  = round(new_amount_minor * remaining_fraction)
proration   = charge_new - credit_old                  # may be negative on a downgrade
```

Keep the fraction exact (integers for numerator and denominator, or a decimal library) and round each line once. Use a decimal type (`numeric` in SQL, `Decimal` in Python, `decimal.js` or `big.js` in JS, `BigDecimal` in Java), never binary floats.

## Rounding rules

- Pick one rule and write it down: half-up (common for invoices) or half-even (banker's). Many tax authorities specify rounding for tax; use theirs for tax lines.
- Round per line, then sum. Don't round the total separately, or lines won't add up to it.
- Zero-decimal currencies (JPY, KRW) have no minor unit below 1; three-decimal currencies (BHD, IQD, JOD, KWD, LYD, OMR, TND in the [ISO 4217 list](https://www.six-group.com/en/products-services/financial-information/data-standards.html) as of Sep 2026) have 1000 minor units. Take minor-unit exponents from ISO 4217 data, not a hard-coded 100.

## Worked example

Monthly plan, 30-day period `2026-04-01T00:00Z` to `2026-05-01T00:00Z` (2,592,000 s). Upgrade from 2,000 to 5,000 (minor units) at `2026-04-16T00:00Z`.

```
remaining = 15 days = 1,296,000 s → fraction 1/2
credit_old = round(2000 * 1/2) = 1000
charge_new = round(5000 * 1/2) = 2500
proration  = 1500 charged now; renewal on 2026-05-01 is 5000
```

Same change in a 31-day month at the same calendar date gives `16/31` remaining: credit `round(2000*16/31)=round(1032.26)=1032`, charge `round(5000*16/31)=round(2580.65)=2581`, proration `1549`. Customers notice that months differ; say in the docs whether you prorate by seconds of the actual period or by a fixed 30-day month.

## Edge cases to test

| Case | Expected |
|---|---|
| Anchor on the 31st | Next boundary is the last day of shorter months, then back to the 31st when it exists; never drift to the 28th permanently |
| Anchor on 29 Feb (annual) | Pick 28 Feb or 1 Mar in non-leap years; document it |
| Change exactly at `end` | Belongs to the next period; no proration on the old one |
| Two changes in one period | Each prorates from its own `t` against the price then in force; sum of lines equals the net change |
| Upgrade then downgrade same day | Net proration is small but non-zero; credits must not exceed what was charged |
| DST change in customer timezone | Period length in seconds differs by an hour; compute from instants, display in local time |
| Proration below the minimum charge amount | Carry it to the next invoice as a pending line instead of charging (cards have minimums per currency) |
| Discount or coupon active | Prorate the discounted amount, and state whether the coupon itself prorates |
| Tax-inclusive prices | Prorate the gross, then split tax using the same rule as normal invoices |
