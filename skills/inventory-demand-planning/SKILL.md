---
name: inventory-demand-planning
description: Inventory and demand planning for stocked SKUs, from cleaning sales history and picking a simple forecast to sizing safety stock for a target service level, setting reorder points and order quantities from lead times, ranking items with ABC analysis, and weighing stockout cost against overstock cost, built as a spreadsheet or a small script. Use when deciding how much stock to hold or when to reorder, building a replenishment model or reorder report, or explaining why a SKU keeps running out or piling up.
license: MIT
compatibility: Any Agent Skills host. Works with a spreadsheet, CSV exports or a short script in the project's language; no external services.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Inventory and demand planning

Answer two questions per SKU and location: **when to reorder** (reorder point) and **how much** (order quantity), with a safety stock that matches a stated service level. Keep the model simple enough that the planner can audit every cell.

Formulas, z-values and a worked example are in `references/formulas.md`. Read it before writing any formula.

## 0. Gather inputs, or stop and ask

For each SKU (and each warehouse if stock is not shared) you need:

1. Demand history at a fixed grain (daily or weekly units), ideally 12+ months to see seasonality.
2. Lead time from order to available-to-sell, in the same time unit, with its variability if the supplier is unreliable.
3. Unit cost, holding cost rate (typically quoted as a % of unit cost per year), and ordering cost per purchase order.
4. Constraints: MOQ, case pack, pallet or container quantity, shelf life, budget or space caps.
5. The service-level target and who owns it.

If lead time, MOQ or the service-level target is missing, **stop and ask the user**. Do not invent supplier terms.

## 1. Clean demand before forecasting

- Use **demand, not sales**. Days with zero stock show zero sales but not zero demand; flag them and either exclude them or estimate lost sales.
- Remove or tag one-offs: bulk B2B orders, promotions, data errors, returns booked as negative sales.
- Keep units consistent (eaches vs cases). Note any SKU replacements and join their history.

## 2. Forecast with the simplest method that works

| Pattern | Method |
|---|---|
| Stable, no trend | Moving average (4 to 12 periods) or simple exponential smoothing |
| Trend | Holt (double) exponential smoothing |
| Clear seasonality, 2+ years of data | Seasonal index on top of a baseline, or Holt-Winters |
| Intermittent (many zero periods) | Croston-style or just a min/max rule; do not fit a smooth curve |
| New item, no history | Analogue SKU scaled by the user's launch estimate; mark it as a judgement |

Backtest on a holdout (the last 8 to 13 weeks): report MAE and bias per SKU. A forecast with persistent bias is worse than a noisy one; fix bias first. Do not pick a complex model unless it beats the moving average on the holdout.

## 3. ABC (and XYZ) classification

1. Rank SKUs by annual consumption value (annual units x unit cost).
2. A = top ~80% of value, B = next ~15%, C = rest. These cut-offs are conventions; confirm them with the user.
3. Optional XYZ by demand variability (coefficient of variation) so A-X items get tight control and C-Z items get simple rules.
4. Use classes to set service levels and review frequency, for example A 98%, B 95%, C 90%, and review A items weekly.

## 4. Safety stock, reorder point, order quantity

1. Pick the service-level type and say which: **cycle service level** (probability of no stockout per cycle) is what the z-score formula gives. Fill rate is different and needs the loss function.
2. Safety stock from the formula in `references/formulas.md`, including lead-time variability when the supplier is late often.
3. Reorder point = expected demand over lead time + safety stock (add the review period for periodic review).
4. Order quantity: EOQ as a starting point, then round up to MOQ and case pack, and cap by shelf life and budget.
5. Compare **inventory position** (on hand + on order - backorders - allocated), not on-hand, with the reorder point.

## 5. Stockout vs overstock trade-off

- State both costs per SKU: stockout = lost margin + expediting + customer churn; overstock = holding + obsolescence + markdown.
- For seasonal or perishable one-shot buys use the newsvendor critical ratio: underage cost / (underage + overage cost).
- Show the user a table of service level vs average inventory value; let them choose. Going from 95% to 99% usually costs far more stock than 90% to 95%.

## 6. Build the model

Spreadsheet layout: one inputs sheet (per SKU parameters), one demand sheet (history, cleaned flags), one calc sheet (forecast, sigma, SS, ROP, EOQ), one output sheet (reorder report). No hard-coded numbers inside formulas; reference input cells.

In code: read CSV exports, compute per SKU, write a reorder report CSV. Add a test on one hand-checked SKU (the worked example in `references/formulas.md`).

## Rules

- Never place or change purchase orders, or write to an ERP or store inventory system, without the user's explicit go-ahead.
- Never treat stockout periods as zero demand.
- Never mix time units: demand per week with lead time in days is the most common bug.
- Do not promise a service level the data cannot support; say when history is too short.

## Report

```
SKU | class | avg demand/period | sigma | lead time | service level | safety stock | reorder point | order qty | on hand | position | action
```

Then: method used and holdout MAE/bias, assumptions the user must confirm, SKUs with too little data, and the stock-value impact of the chosen service levels.
