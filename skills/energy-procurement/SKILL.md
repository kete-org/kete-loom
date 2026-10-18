---
name: energy-procurement
description: Commercial electricity and natural gas buying for offices, plants, warehouses and multi-site portfolios, covering how to read utility bills and tariffs (energy, demand, capacity and transmission charges), analysing 15-minute interval load data for load factor and peaks, comparing fixed-price, index and block-and-index supply contracts, running a supplier RFP on a like-for-like basis, layering purchases to manage price risk, and renewable options such as green tariffs, unbundled certificates and power purchase agreements. Use when a supply contract is up for renewal, a site's energy costs jumped, you are comparing supplier offers, or a sustainability target needs a renewable electricity plan, in a market where the customer can choose a supplier.
license: MIT
compatibility: Any Agent Skills host. Works from the user's bills, interval data and offers; market prices come from the user's broker, supplier or a market data service. Market rules differ by country, state and utility. Not financial, legal or trading advice.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Energy procurement

Know what each site actually pays for and why, buy supply with a risk level the business chose on purpose, and compare offers on the same basis. Rules, charge names and who may sell to whom depend on the jurisdiction, so confirm them before you rely on any of this.

## 0. Establish the market

Ask, and stop until you have answers:

1. Country and region, and for each site the utility (distribution company) and, where relevant, the grid or market operator (for example PJM, ERCOT, ISO-NE, NYISO, MISO, CAISO in the US; national markets in the UK and EU).
2. Is the site in a market where the customer may choose a retail supplier for electricity, gas, or both? If not, the job is tariff optimisation with the utility, not a supply contract; use sections 1, 2 and 6 only.
3. Current contracts: supplier, product type, price, start and end date, volume tolerance (swing) clauses, early termination terms.
4. The business's risk appetite and budget certainty need, and who signs off (finance, procurement, a risk committee).

Never state a regulated tariff rate, market rule, tax or incentive without checking the utility's current tariff sheet or the regulator's site; record source and date.

## 1. Read the bills

Collect 12 to 24 months of bills per site per fuel. Split every charge into:

| Bucket | Electricity examples | Gas examples |
|---|---|---|
| Supply (energy) | kWh x energy price, often by time-of-use period | therms, MMBtu, or kWh x commodity price |
| Capacity | capacity charge set by the site's load in the system peak hours (PJM's peak load contribution is one example) | n/a, or pipeline capacity |
| Transmission | network charge, sometimes set by coincident peaks (ERCOT 4CP is one example) | transportation |
| Distribution | utility delivery charge, kW demand charge on the monthly peak, customer charge | distribution, customer charge |
| Taxes, levies, riders | renewable and efficiency riders, taxes | same |

Record which buckets the supplier contract covers and which stay with the utility; offers that include different buckets cannot be compared directly. Check for billing errors: estimated reads, wrong rate class, wrong meter multiplier, tax charged on exempt use.

## 2. Analyse the load

1. Get 15-minute or hourly interval data (from the utility portal or meter data) for at least 12 months.
2. Compute per site: annual kWh, peak kW, load factor (`average kW / peak kW`), on-peak versus off-peak split, and a monthly and hourly profile.
3. Find the hours that set capacity and transmission charges in this market; quantify how much load the site was carrying in those hours.
4. Note what can move: shiftable process load, on-site generation, storage, demand response programmes. Flag these as savings to evaluate, not promises.
5. For gas: monthly usage against heating degree days, base load versus weather-driven load.

A flat, high-load-factor profile gets better supply prices; a peaky profile pays for its shape.

## 3. Choose the product structure

| Product | What is fixed | Who carries price risk | Fits when |
|---|---|---|---|
| Fixed price (full requirements) | all-in supply price per unit for the term | supplier, priced in as a premium | budget certainty matters most, small team |
| Index (pass-through) | supplier adder only; energy floats with the market index | customer | can absorb volatility, wants lowest expected cost |
| Block and index | a fixed block (for example a set MW in on-peak hours); the rest floats | shared | large or predictable load, wants to hedge in stages |
| Layered or hedged | tranches fixed at different times | shared, timed by the customer | has a policy and someone to execute it |

Also check per offer: which charges are passed through rather than fixed, swing or bandwidth limits and the penalty for usage outside them, the material-change clause, credit requirements, term, and termination cost.

## 4. Run a supplier RFP

1. Send the same data to every supplier: sites, account and meter numbers, interval data, contract start date, term options, product structures wanted, which charges must be fixed or passed through, and payment and credit terms.
2. Use a response template so each offer comes back on the same basis (price per unit by product and term, pass-through list, swing terms).
3. Prices are usually valid for hours, not days; agree in advance who can accept, and get internal approval for a price ceiling before the pricing day.
4. Normalise offers to an all-in cost per unit using the site's real load shape, and show it next to the contract risks.
5. If a broker or consultant runs the RFP, ask how they are paid (fees embedded in the unit price are common) and put it in writing.

## 5. Risk and hedging

- Write a short procurement policy: target hedge percentage by year ahead (for example more hedged for the next 12 months than for year three), price triggers, who decides, and how results are reported.
- Hedge by layering purchases over time rather than one day's price.
- Report open (unhedged) volume and its exposure to a price move, using a scenario the user sets.
- **Stop and say that a qualified energy adviser, treasury or risk function must decide** before any financial hedge, derivative, or a commitment above the user's sign-off limit. This skill does not give trading advice.

## 6. Renewable options

| Option | What you get | Watch |
|---|---|---|
| Utility green tariff | renewable supply via the utility | premium, additionality, term |
| Supplier renewable product | supply plus certificates | which certificates, from where |
| Unbundled certificates | RECs (US), Guarantees of Origin (EU), REGOs (UK), I-RECs elsewhere | market boundary and vintage rules for your reporting standard |
| On-site generation | solar or other on site, owned or under a lease or PPA | roof, interconnection, net metering rules |
| Physical or virtual PPA | long-term contract with a project; a virtual PPA is a financial contract for difference | long term, accounting treatment, basis and shape risk |

Check the claim against the reporting standard the business uses (for example the GHG Protocol Scope 2 guidance; it has been under revision, so confirm the current version). Any PPA needs legal, accounting and treasury review before signing.

## Rules

- Never compare offers that fix different charges without normalising them first.
- Never recommend accepting a price without the user's internal approval route confirmed.
- Never present a forecast as a price; label every forward price with source, date and time.
- Jurisdiction rules first: if you have not confirmed retail choice and the charge structure for the site, say so.

## Report

```
Site | utility | rate class | annual kWh / therms | peak kW | load factor | current contract (product, price, end date)
Bill split: supply x% | capacity x% | transmission x% | distribution x% | taxes x%
Offers (normalised all-in per unit): supplier | product | term | price | pass-throughs | swing | notes
Recommendation: product and term, hedge plan, renewable option, with risks
Needs expert review: <hedges, PPA, contracts above limit, tariff questions>
Sources: <tariff sheets, market data, dates>
```
