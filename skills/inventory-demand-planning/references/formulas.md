# Inventory formulas

Use one time unit (days or weeks) for every term.

## Symbols

- `d` average demand per period, `sigma_d` standard deviation of demand per period
- `L` average lead time in periods, `sigma_L` standard deviation of lead time
- `R` review period (periodic review only)
- `z` standard normal quantile for the cycle service level
- `D` annual demand, `S` cost per order, `H` holding cost per unit per year (= unit cost x holding rate)

## z for cycle service level

| CSL | z |
|---|---|
| 90% | 1.28 |
| 95% | 1.645 |
| 97.5% | 1.96 |
| 98% | 2.05 |
| 99% | 2.33 |
| 99.5% | 2.58 |

Spreadsheet: `=NORM.S.INV(0.95)`. Python: `scipy.stats.norm.ppf(0.95)` or `statistics.NormalDist().inv_cdf(0.95)` (standard library).

## Safety stock

- Demand varies, lead time fixed: `SS = z * sigma_d * sqrt(L)`
- Both vary (independent): `SS = z * sqrt(L * sigma_d^2 + d^2 * sigma_L^2)`
- Periodic review: replace `L` with `L + R`.

These assume roughly normal demand. For intermittent or very skewed demand, use an empirical percentile of lead-time demand from history instead.

## Reorder point

- Continuous review: `ROP = d * L + SS`
- Periodic review order-up-to level: `S_max = d * (L + R) + SS`; order `S_max - inventory position`.

## Economic order quantity

`EOQ = sqrt(2 * D * S / H)`

Round up to MOQ and case pack. EOQ is flat near its optimum, so rounding costs little.

## Newsvendor (single buy)

Critical ratio `CR = Cu / (Cu + Co)`, where `Cu` = margin lost per unit short and `Co` = cost per unit left over (cost minus salvage). Order the demand quantile at `CR`: `Q = mean + z(CR) * sigma` for normal demand.

## Forecast accuracy

- `MAE = mean(|actual - forecast|)`
- `Bias = sum(forecast - actual) / sum(actual)`; positive means over-forecasting.
- Avoid MAPE on low-volume SKUs; zero actuals make it undefined.

## Worked example (use as a test case)

Weekly demand `d = 100`, `sigma_d = 20`, lead time `L = 4` weeks fixed, CSL 95% (`z = 1.645`).

- `SS = 1.645 * 20 * sqrt(4) = 65.8`, round up to 66
- `ROP = 100 * 4 + 66 = 466`

With `D = 5200`, `S = 50`, unit cost 10, holding rate 25% (`H = 2.5`): `EOQ = sqrt(2 * 5200 * 50 / 2.5) = sqrt(208000) = 456.1`, so about 456 before rounding to case pack.
