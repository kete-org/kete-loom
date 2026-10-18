---
name: invoicing-and-tax
description: Guides software teams through issuing legally usable invoices and charging sales tax, VAT or GST correctly, covering required invoice fields and sequential numbering, choosing a tax calculation service or merchant of record over hand-rolled rate tables, registration thresholds and nexus at a high level, reverse charge for B2B, tax-inclusive versus exclusive pricing, line-level rounding, and national e-invoicing mandates such as Peppol, KSeF and Factur-X, with a firm handoff to a qualified accountant for anything that is a tax position. Use when building or fixing invoice generation, adding VAT or sales tax to checkout, deciding whether to integrate Avalara, Stripe Tax or a merchant of record, or preparing for an e-invoicing deadline in a country you sell into.
license: MIT
compatibility: Any Agent Skills host. Provider-neutral. Tax thresholds, rates and mandate dates change often; the agent must check official sources before quoting them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Invoicing and tax

Produce invoices that a tax authority would accept and tax amounts a customer can re-add by hand, while keeping every tax *decision* with a qualified person. You build the machinery; an accountant or tax adviser decides where you are registered, what is taxable and at which rate.

## What this skill does not cover

- It is not tax or legal advice. It does not decide whether a product is taxable, whether you have nexus or a VAT obligation somewhere, which rate or exemption applies, or how to file returns.
- It does not cover payroll tax, income or corporate tax, customs duties (see `customs-trade-compliance` if installed), or revenue recognition policy.
- Thresholds, rates and deadlines in this skill and its references are orientation only and may be out of date. Before relying on one, check the tax authority's own site and say which source and date you used.

**Stop and ask for a qualified accountant or tax adviser** before: registering or not registering somewhere, choosing a product tax code or exemption, applying reverse charge or zero rating, issuing invoices in a new country, changing how past invoices were taxed, or answering a customer's tax dispute.

## Ground rules

1. **Never hand-roll rate tables** for more than a single jurisdiction you are registered in. Rates, product taxability and US local jurisdictions change constantly. Use a tax engine (Avalara AvaTax, Stripe Tax, Anrok, TaxJar, Quaderno and similar) or a merchant of record (Paddle, Lemon Squeezy and similar), which becomes the seller and takes on the tax liability.
2. **Store the tax decision on the invoice line**, not just the result: jurisdiction, rate, tax code, taxable amount, tax amount, and the engine's transaction or calculation ID. You must be able to explain an old invoice after rates change.
3. **Invoices are immutable once issued.** Correct with a credit note that references the original and reverses its tax in proportion. Never edit, renumber or delete.
4. **Numbering**: one sequential series per legal entity (and per series type if the jurisdiction allows), assigned at finalisation inside a transaction, no reuse. Many VAT regimes require a unique sequential number; gaps need an explanation.
5. **Money is integer minor units plus currency.** Round with the method the jurisdiction specifies, at the level it specifies (line or invoice total). Details in `references/rounding.md`.
6. **Customer location evidence** is stored with each sale (billing address, IP country, payment method country, VAT ID validation result) because B2C digital sales in many regimes are taxed where the customer is.
7. **Validate B2B tax IDs** before applying reverse charge: EU VAT numbers via the EU [VIES](https://ec.europa.eu/taxation_customs/vies/) service, UK VAT numbers via HMRC's [check a UK VAT number](https://www.gov.uk/check-uk-vat-number) service, and store the check result and timestamp.

## Workflow

1. **Inventory.** Search the codebase for invoice generation, PDF templates, numbering, tax calculation, the checkout price display, and credit notes. List which legal entity issues invoices and where customers are.
2. **Ask the user for the tax position** (from their accountant): where they are registered, products' tax codes, whether prices are tax-inclusive per market, B2B vs B2C mix. If unknown, stop; don't guess.
3. **Pick the approach** with the table below and confirm with the user.
4. **Required fields.** Check the invoice against the jurisdiction's list. EU baseline is in `references/invoice-fields.md`; others vary.
5. **Integrate the engine**: calculate at quote/checkout with the full address and tax IDs, commit (record) the transaction when the invoice is finalised, and void or refund it in the engine when you issue a credit note. Calculate-only calls without commits leave the engine's reports empty.
6. **Prices display**: show tax-inclusive prices to consumers where that is the norm (EU, UK, Australia) and tax-exclusive plus tax at checkout where that is the norm (US). Decide per market with the user.
7. **E-invoicing**: check whether any country you invoice in mandates structured e-invoices for your customer type; see `references/e-invoicing.md`. Usually this means an accredited provider or Peppol access point, not building the transmission yourself.
8. **Test** with fixtures: one domestic B2C, one domestic B2B, one cross-border B2B with a valid tax ID (reverse charge), one with an invalid tax ID, one US address in a taxing state, a refund producing a credit note, a multi-line invoice that stresses rounding.

## Choose the approach

| Situation | Usually |
|---|---|
| One country, registered there, simple products | Engine is optional; a reviewed, tested rate config for that one country is acceptable |
| Selling to consumers in many countries, small team | Merchant of record, or a tax engine plus registrations your adviser sets up |
| US sales across states | Tax engine; economic nexus thresholds differ by state |
| Marketplace or platform paying out to sellers | Stop and ask; marketplace facilitator rules may make you the collector |
| Large B2B, ERP-driven | Tax engine integrated with the ERP; invoices issued from one system only |

## Thresholds at a high level

Registration duty depends on where you are established, what you sell and to whom. Orientation only, all to be verified with the authority before use:

- **US sales tax**: since [*South Dakota v. Wayfair*](https://www.supremecourt.gov/opinions/17pdf/17-494_j4el.pdf) (2018), states can require remote sellers to collect once they cross an economic nexus threshold. The South Dakota law upheld there used more than 100,000 USD of sales or 200 transactions a year into the state; each state sets its own figures and tests, so check that state's revenue department. Taxability of SaaS and digital goods differs by state.
- **EU VAT**: a seller established in only one EU member state has a 10,000 EUR EU-wide annual threshold (current and preceding calendar year) for cross-border B2C telecoms, broadcasting and electronic services and intra-EU distance sales of goods; above it, VAT is due in the customer's country, usually declared via the [One Stop Shop](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en) (OSS). Sellers not established in the EU have no threshold for B2C services and use the non-Union OSS.
- **UK VAT**: [registration threshold](https://www.gov.uk/register-for-vat) 90,000 GBP of taxable turnover over the last 12 months, or expected within the next 30 days, for UK-established businesses; [non-established taxable persons](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat) must register on their first UK taxable supply, with no threshold.
- **Others** (Australia, Canada, India, Norway, Switzerland, Singapore, many more) have their own regimes for foreign digital sellers. Look them up per country.

## Never

- Never present computed tax as advice, or tell a user they don't need to register somewhere.
- Never silently apply 0% because a tax ID field is non-empty; validate it.
- Never recalculate tax on an issued invoice with today's rates.
- Never compute tax on floats or round the total separately from lines without a defined rule.
- Never generate invoices from two systems for the same sale (for example, both the payment provider and your app).

## Report format

When reviewing or designing, return:

```
Issuing entity and series: <entity, numbering scheme>
Approach: <engine | merchant of record | single-country config>
Markets checked: <country: B2B/B2C, registered?, inclusive/exclusive, e-invoice mandate?, source + date checked>
Field gaps: <missing required fields per market>
Rounding rule: <method, level>
Needs accountant decision: <list>
```
