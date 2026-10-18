# Invoice fields

## EU VAT invoice baseline

The EU VAT Directive ([2006/112/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006L0112-20250414), Article 226) lists what a full VAT invoice must show. Member states implement it in national law and may add rules, so check the country's guidance too. Summary of the list:

1. Date of issue
2. Sequential number that uniquely identifies the invoice
3. Supplier's VAT identification number
4. Customer's VAT identification number where the customer is liable for the tax (reverse charge) or for intra-EU supplies of goods
5. Full name and address of supplier and customer
6. Quantity and nature of goods, or extent and nature of services
7. Date of supply or payment, if different from the issue date
8. Taxable amount per rate or exemption, unit price excluding VAT, and any discounts not included in the unit price
9. VAT rate applied
10. VAT amount payable
11. Where exempt or reverse charged, a reference to the provision or the wording such as "Reverse charge"
12. Other mentions where they apply: "Self-billing", "Cash accounting", the margin scheme wording, new means of transport details, a tax representative's VAT number, name and address

The invoice may be in any currency, but the VAT payable must also be expressed in the national currency of the member state (Article 230).

Simplified invoices with fewer fields (Article 226b) are allowed for low amounts; the limit is set nationally within the Directive's rules.

## Fields that help everywhere

- Legal entity name, registered address, company number where local law requires it
- Payment terms, due date, how to pay
- Purchase order number when the customer gives one
- Service period for subscriptions (`1 Apr 2026 – 30 Apr 2026`)
- For credit notes: "Credit note", own number, and the original invoice number and date

## United States

There is no federal invoice format. States set what a sales tax invoice or receipt must show; the tax amount is commonly shown separately. A tax engine's documentation usually lists state requirements.

## Elsewhere

Many countries (for example Mexico CFDI, India GST e-invoicing, Brazil NF-e, Saudi Arabia, Türkiye) require government-validated electronic invoices with specific schemas and IDs. Don't generate a PDF and assume it is valid there; use an accredited provider and check the authority's rules.
