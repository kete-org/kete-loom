# Tax rounding

## Pick and document

- **Level**: per line (compute tax per line, round, sum) or per invoice (sum taxable amounts per rate, compute tax once, round). Some authorities specify one. EN 16931 e-invoices compute VAT per VAT category and rate: the category taxable amount is the sum of line net amounts plus charges minus allowances ([BR-S-08](https://docs.peppol.eu/poacc/billing/3.0/rules/ubl-tc434/BR-S-08/) for standard rate), and the category tax amount must equal taxable amount × rate, rounded to two decimals ([BR-CO-17](https://docs.peppol.eu/poacc/billing/3.0/rules/ubl-tc434/BR-CO-17/)). Per-line-rounded tax can fail that check; if you issue e-invoices, use per-invoice-per-rate. Ask the accountant which applies.
- **Method**: half-up is the usual commercial default; some regimes specify otherwise. Use a decimal type, never binary floats.
- **Inclusive prices**: tax = gross × rate ÷ (1 + rate). Round tax, then net = gross − tax, so net + tax always equals the advertised gross.

## Example of the difference

Three lines of 0.99 (minor units: 99) at 20% VAT, tax-exclusive:

```
per line:    round(99 * 0.20) = round(19.8) = 20 per line → 60 total
per invoice: round(297 * 0.20) = round(59.4) = 59
```

A one-unit difference per invoice adds up and makes tax returns disagree with ledgers. Whatever you choose, the tax engine, your invoice PDF and the accounting system must use the same rule.

## Tests worth having

- Many small lines at a rate that produces .5 fractions
- A tax-inclusive price where `gross / (1 + rate)` has a repeating decimal
- Mixed rates on one invoice (summed per rate)
- A credit note for one line of a multi-line invoice: its tax must equal the tax originally charged on that line
- Zero-decimal (JPY) and three-decimal (KWD) currencies
