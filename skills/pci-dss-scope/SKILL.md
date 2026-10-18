---
name: pci-dss-scope
description: Shrinks PCI DSS scope by keeping cardholder data off your own systems, using processor-hosted payment pages, redirects or iframe hosted fields, provider tokens instead of card numbers, strict rules on what never to log or store (full PAN, CVV, track data, PIN), and a high-level guide to which self-assessment questionnaire (SAQ A, A-EP, D and others) the design points to, with a clear not-legal-advice and not-QSA line. Use when designing card checkout, deciding between hosted fields and a custom card form, finding card numbers in logs or databases, or estimating PCI effort for a merchant.
license: MIT
compatibility: Any Agent Skills host. Works with any card processor (Stripe, Adyen, Paystack, Flutterwave, Braintree and others). Standard detail lives in references/saq-and-data.md and must be checked against the PCI SSC document library.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# PCI DSS scope

The cheapest PCI DSS control is card data that never touches your systems. Design so the browser or app sends card details straight to the processor, your servers only ever see a token, and nothing you run can read or alter the card form.

## Boundary: this is not legal or assessor advice

- You help with architecture and code. Your acquirer (the merchant's bank) decides which validation the merchant must do, and a Qualified Security Assessor (QSA) or the acquirer decides the final scope and SAQ type.
- Say so once when the user asks "are we compliant" or "which SAQ", give the engineering view, and tell them to confirm with the acquirer or QSA.
- Never state that a system "is PCI compliant". Say what is in scope, what was removed from scope, and what remains.

## Step 1: find the card data flow

Search the codebase and config for:

- Card form fields: `card_number`, `cardNumber`, `pan`, `cvv`, `cvc`, `expiry`, `exp_month`, inputs with `autocomplete="cc-number"` or `cc-csc`.
- Server endpoints or models that accept or store those fields, and any calls to processor "raw card" APIs (direct card charge, server-side tokenisation with raw PAN).
- Logs, error trackers, analytics, session replay, support tooling and data warehouse tables that could capture request bodies on checkout pages.
- Mobile apps: native card fields posting to your API instead of the processor SDK.

Draw the flow: where card data is entered, which system receives it first, and where tokens go.

## Step 2: choose the lowest-scope pattern

Prefer, in this order:

1. **Redirect to a processor-hosted payment page** (for example Stripe Checkout, Paystack or Flutterwave hosted checkout, Adyen Hosted Checkout). Card entry happens entirely on the processor's domain.
2. **Processor iframe or hosted fields** (for example Stripe Elements, Adyen Drop-in or Components, Braintree Hosted Fields). Each card field is an iframe served by the processor; your page never has the card values.
3. **Processor mobile SDK** with its own card UI, which returns a token or payment method id.
4. **Your own card form that posts directly to the processor with JavaScript** (direct post, or your script calling a tokenisation API). Your page can read the card data, so your web server is in scope (typically SAQ A-EP territory).
5. **Card data through your servers** (your API receives the PAN). This brings full scope (SAQ D or an onsite assessment). **Stop and ask the user** for the business reason before building it, and recommend 1 to 3 instead.

When asked to "add a card form", build option 1 or 2 unless the user gives a reason not to.

## Step 3: tokens, not card numbers

- Store only the processor's token or payment method id, plus display data the processor returns: brand, last four digits, expiry month and year.
- Use the processor's customer and saved-payment-method APIs for repeat charges and subscriptions. Never build your own card vault.
- Webhooks and API responses may contain masked card data; persist only the fields you need.
- If a legacy table already holds full PANs, **stop and tell the user**. Plan a migration to processor tokens, then securely delete the PAN column and its backups. Don't quietly drop the data.

## Step 4: what never to log or store

Sensitive authentication data must never be stored after authorisation, even encrypted:

- CVV, CVC, CVV2, CID (the 3 or 4 digit card verification code)
- Full magnetic stripe or chip track data
- PIN or PIN block

Never log or store a full PAN (card number) in your systems when using the patterns above. In code:

- Add a redaction filter to the logger, error tracker and APM that masks any 13 to 19 digit sequence passing a Luhn check, and drops fields named like the ones in Step 1. Test it with a known test card number such as `4242424242424242`.
- Turn off request body capture on checkout routes in error trackers and session replay.
- Never put card data in URLs, query strings, analytics events, emails, tickets or AI prompts.
- If a PAN must be shown, show at most the BIN (first six or eight digits) and last four; usually last four is enough.
- Use only the processor's documented test card numbers in tests and fixtures, never real cards.

## Step 5: protect the payment page itself

Even with a redirect or iframe, the page that loads or links to the payment form can be attacked (for example a script that swaps the iframe or redirect URL for a fake one).

- Serve the checkout page over HTTPS with a strict Content Security Policy that lists only your own and the processor's script and frame origins.
- Keep third-party scripts (tag managers, chat widgets, A/B testing, ads) off checkout pages, or keep an inventory of each with a reason.
- Use Subresource Integrity on static third-party scripts where the vendor supports it.
- Monitor checkout pages for unexpected script or header changes.
- These controls matter most for iframe or hosted-fields pages: SAQ A eligibility for an embedded form depends on the page not being open to script attacks (see `references/saq-and-data.md`). A full redirect avoids that question, which is one reason it ranks first.

## Step 6: estimate the SAQ at a high level

Use `references/saq-and-data.md` to map the chosen pattern to a likely SAQ, and list the eligibility conditions that must stay true. Present it as "likely SAQ, to confirm with your acquirer", never as a decision.

## Never

- Never accept, forward or store card numbers on your servers when a hosted option exists, without the user's explicit, informed agreement.
- Never store CVV, track data or PIN, in any form, for any length of time after authorisation.
- Never log raw request bodies on payment routes.
- Never copy production payment data to test or staging.
- Never use real card numbers in tests, demos or screenshots.

## Report format

```
PCI scope review: <app or checkout>
Card entry pattern: <redirect | hosted fields | SDK | direct post | server-side>
Systems that see card data: <list, or "none: processor only">
Likely SAQ (confirm with acquirer or QSA): <type> because <reason>
Findings (highest risk first):
  1. [High|Medium|Low] <what> at <file:line or system> -> <fix>
Scope reductions available: <list>
Not checked: <systems you could not see>
This is engineering guidance, not legal or assessor advice.
```
