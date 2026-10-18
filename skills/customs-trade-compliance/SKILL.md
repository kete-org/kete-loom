---
name: customs-trade-compliance
description: Cross-border shipping groundwork for software and operations teams, covering Harmonized System product codes, choosing and reading Incoterms 2020 rules, estimating duties, import taxes and landed cost, the data a commercial invoice needs, and screening buyers against restricted-party and sanctions lists, with a firm line on which decisions a licensed customs broker or trade lawyer must make. Use when adding international shipping to a store or ERP, building a landed-cost calculator or export documents, or deciding who pays duties and when goods need a broker.
license: MIT
compatibility: Any Agent Skills host. Tariff and screening lookups need network access to government sites or a provider API. Not legal or customs advice.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Customs and trade compliance

Get product, party and shipment data right in the system so a broker can file cleanly, landed cost is no surprise, and no order ships to a party you may not deal with. This skill prepares and checks; it does not make binding classification or licensing decisions.

## Boundary: when a licensed person must decide

**Stop and tell the user to involve a licensed customs broker, customs authority ruling or trade lawyer** when any of these apply:

- Final tariff classification used on a filed entry, especially where duty differs a lot between candidate codes, or for chemicals, food, medical devices, textiles and steel/aluminium.
- Origin claims for a free trade agreement preference, or anti-dumping/countervailing duty exposure.
- Valuation questions: related-party prices, royalties, assists, free samples, or goods sold below cost.
- Export control: anything military, dual-use, encryption beyond mass-market, or a licence question (US EAR/ITAR, EU dual-use regulation).
- Any possible restricted-party or sanctions match, or a shipment to an embargoed or comprehensively sanctioned destination.
- Filing an entry or export declaration on someone else's behalf (in the US, transacting customs business for others requires a licensed broker).

Write that boundary into any tool you build: a "needs broker review" status that blocks automated shipping.

## 1. HS classification

1. Collect for each product: what it is, material composition (percent), function, how it is used, whether it is a part or a finished good, and photos or spec sheets.
2. The first 6 digits are the international Harmonized System maintained by the World Customs Organization; countries extend it (US HTS 10 digits, EU CN 8 digits and TARIC 10 digits, UK commodity codes 10 digits). Store the 6-digit code per product and the national code per destination.
3. Classify by the General Rules of Interpretation, headings and section/chapter notes first, not by keyword search. Record the reasoning and the source.
4. Use official tools to propose a code: the US HTS search (hts.usitc.gov), EU TARIC, the UK Trade Tariff (trade-tariff.service.gov.uk), or the destination's tariff. Check the current HS edition the destination uses.
5. Mark every proposed code as `proposed` until a broker or binding ruling confirms it.

Never pick a code because its duty is lower.

## 2. Incoterms 2020

Incoterms (ICC, 2020 edition) decide where risk passes, who pays which costs, and who clears export and import. They do not decide when title passes or the payment terms. Always write the rule plus a named place and the edition, for example `FCA Seller's warehouse, Leeds, Incoterms 2020`.

Rule summaries and a selection guide are in `references/incoterms-2020.md`. Key decisions:

- Containerised or multimodal shipments: use FCA, CPT, CIP, DAP, DPU or DDP, not FOB or CIF.
- DDP makes the seller the importer of record and liable for import duty and taxes; only use it if the seller can register and pay in the destination.
- EXW leaves export clearance to the buyer, which often does not work for the seller's own export reporting; FCA is usually the better minimum.

## 3. Duties, taxes and landed cost

```
landed cost = product cost + freight + insurance + duty + import VAT/GST/sales tax + broker and carrier fees + other fees
```

- Customs value basis differs: many countries use CIF value (goods + freight + insurance to the border); the US uses transaction value excluding international freight and insurance. Confirm for the destination.
- Duty = rate for the national code and origin x customs value (or a specific rate per unit). Check preferential rates only if the origin rules are met and documented.
- Import VAT/GST is usually charged on value + duty. Treat VAT registration, IOSS and reverse-charge questions as a tax topic for the invoicing-and-tax skill and a tax adviser.
- Low-value thresholds have changed fast: the US suspended de minimis duty-free entry for all countries from 29 August 2025, and from 1 July 2026 the EU removed its EUR 150 customs duty relief and applies a temporary flat duty of EUR 3 per tariff line in a low-value consignment (Council Regulation (EU) 2026/382; scope and counting rules are set in implementing acts). Always check the destination's current rules before relying on a threshold.
- Additional duties (Section 232/301-type tariffs, retaliatory or emergency tariffs) change often; fetch current rates at calculation time and store the date and source with every quote.

## 4. Commercial invoice

Minimum fields to generate from your data:

- Seller/exporter and buyer/consignee names and addresses; importer of record if different; tax or EORI numbers where required.
- Invoice number and date, Incoterm with named place, currency, payment terms.
- Per line: clear description (what it is and what it is made of, not "parts" or "gift"), HS code, country of origin, quantity and unit, unit price, line total.
- Totals, freight and insurance shown separately if charged, gross and net weight, number of packages.
- Reason for export (sale, sample, return, repair), and a signed declaration if the destination requires one.

Values must be the real transaction value. Never undervalue or mark goods as a gift to cut duty; it is customs fraud.

## 5. Restricted-party and sanctions screening

1. Screen buyer, consignee, end user, and their banks or intermediaries where known, at order time and again before shipping.
2. Sources: the US Consolidated Screening List from the International Trade Administration (search API at developer.trade.gov, which needs a subscription key, or a downloadable file), which combines lists including OFAC SDN and the BIS Entity List; the EU consolidated list of financial sanctions; the UK Sanctions List (the single UK source since 28 January 2026); plus lists for your other markets. Many teams use a commercial screening provider instead.
3. Use fuzzy matching on names and aliases, plus address and country, and log every check with list version, timestamp and result.
4. Possible match: hold the order, do not tell the customer why, and send it to the compliance owner. Never auto-clear a match in code.
5. Block destinations under comprehensive embargo at checkout, using a list the compliance owner maintains.

## Rules

- Never present a proposed HS code, duty estimate or screening result as a final determination.
- Never ship a held or "needs broker review" order automatically.
- Never undervalue, misdescribe or misstate origin on documents.
- Do not state a tariff rate, threshold or list rule you have not checked against the official source on the day.

## Report

```
product | description | material | proposed HS6 | national code (dest) | origin | source/rationale | status (proposed | broker-confirmed)
```

For a shipment or calculator: Incoterm and named place, customs value basis, duty and tax lines with rate, source and date, landed cost per unit, screening result with list version, and the list of items that need broker or lawyer review.
