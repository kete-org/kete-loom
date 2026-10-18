# E-invoicing mandates

An e-invoice here means a structured, machine-readable invoice (XML such as UBL or CII), often sent through a network or a government platform. A PDF by email is not one.

**Dates below were checked against the national authorities' own pages in October 2026 (linked in the table) and change often. Check the authority again before acting, and record the source and date you used.**

| Country | Status as reported | Format / channel |
|---|---|---|
| Italy ([Agenzia delle Entrate](https://www.agenziaentrate.gov.it/portale/web/guest/schede/comunicazioni/fatture-e-corrispettivi/faq-fe/risposte-alle-domande-piu-frequenti-categoria/emissione-delle-fatture-elettroniche-imprese)) | Domestic B2B and B2C via SDI since 1 Jan 2019 (consumers can get a paper or PDF copy) | FatturaPA XML through Sistema di Interscambio |
| Germany ([BMF FAQ](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html)) | Domestic B2B: all businesses must be able to receive e-invoices since 1 Jan 2025. Other invoice types allowed until 31 Dec 2026, or until 31 Dec 2027 for issuers with prior-year turnover up to 800,000 EUR. So issuing is mandatory from 1 Jan 2027 for larger issuers and from 1 Jan 2028 for all | EN 16931 formats such as XRechnung or ZUGFeRD/Factur-X |
| Belgium ([einvoice.belgium.be](https://einvoice.belgium.be/en/article/structured-electronic-invoices-between-companies-are-compulsory-2026)) | Structured e-invoices mandatory between Belgian VAT-registered businesses since 1 Jan 2026; not for consumers; cross-border out of scope until ViDA | Peppol network, Peppol BIS as the reference format |
| Poland ([ksef.podatki.gov.pl](https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/zakres-obowiazkowego-ksef/)) | Receiving via KSeF mandatory for all from 1 Feb 2026; issuing from 1 Feb 2026 for taxpayers with 2024 sales over 200m PLN, from 1 Apr 2026 for others; those invoicing at most 10,000 PLN gross a month have until the end of 2026 | National KSeF platform, structured XML |
| France ([impots.gouv.fr](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees)) | Receiving for all businesses, and issuing plus e-reporting for large and mid-size (GE, ETI), from 1 Sep 2026; issuing for SMEs and micro-businesses from 1 Sep 2027 | Via approved platforms (plateformes agréées); check DGFiP's specifications for the accepted formats |
| EU-wide ([ViDA](https://taxation-customs.ec.europa.eu/taxation/vat/vat-digital-age-vida_en)) | VAT in the Digital Age package adopted 11 Mar 2025; mandatory e-invoicing with digital reporting for intra-EU B2B transactions from 1 Jul 2030; national systems to align by 1 Jan 2035 | EN 16931 baseline |

Outside the EU, mandates exist in many countries (for example India, Mexico, Saudi Arabia, Malaysia, Türkiye, Brazil) with their own schemas and clearance steps.

## What it means for a software team

1. List where your customers are and which are businesses. Mandates mostly target domestic B2B first.
2. Most teams connect to an accredited provider or a Peppol access point rather than implementing the network or government API directly.
3. Your invoice data must already contain everything the format needs: buyer tax ID, structured address, per-line tax category codes, unit codes, payment means. Gaps here are the usual blocker.
4. Archive the structured invoice as sent, for the retention period the country requires.
5. Receiving is also a mandate in some countries; check whether you must accept supplier e-invoices in your accounts payable process.
