---
name: subscription-billing-ops
description: Runs the day-to-day mechanics of recurring revenue in any billing system, whether a provider's billing product or your own ledger, covering plan and price changes with grandfathering, proration on upgrades and downgrades, trials and trial conversion, failed-payment dunning and retry schedules, invoice and credit note lifecycles, cancellation and refund policy, and basic MRR, churn and deferred revenue reporting. Use when designing or changing how plans are billed, migrating customers to a new price, deciding what a mid-cycle upgrade should cost, building a dunning flow, issuing credit notes, or reconciling MRR numbers that don't add up.
license: MIT
compatibility: Any Agent Skills host. Provider-neutral; for Stripe-specific API calls also load stripe-integration. Examples use SQL and TypeScript-like pseudocode.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Subscription billing operations

Make every recurring charge explainable: a customer, finance or an auditor should be able to take any invoice and see which plan, price version, period and proration rule produced each line. This skill covers billing behaviour and data, not a provider's API. For Stripe calls use `stripe-integration`; for African payment providers use their own skills; for invoice legal fields and tax use `invoicing-and-tax`.

## Ground rules

1. **Money is integer minor units plus an ISO 4217 currency.** Never floats. Round once, at a defined step, with a documented rule (see `references/proration.md`).
2. **Prices are versioned and immutable.** A price change creates a new price row; existing subscriptions keep pointing at the old one until you move them deliberately. Never edit an amount in place.
3. **Issued invoices are immutable.** Fix a finalised invoice with a credit note (full or partial) and, if needed, a new invoice. Never edit or delete it. Drafts can change; finalised cannot.
4. **Periods are half-open instants in UTC**: `[period_start, period_end)`. Store the customer's billing anchor and timezone separately and only use them to compute the next boundary and to display dates.
5. **One subscription state machine, one source of truth.** If a provider runs billing, its subscription status drives access; your copy is a cache refreshed from its events. If you run billing, every state change is a row in an append-only event log.
6. **Every charge attempt is idempotent**, keyed on `(invoice_id, attempt_number)`, so a retried job never charges twice.
7. **Revenue reporting reads from invoices and credit notes, not from the plan table.** MRR from list prices lies whenever there are discounts, credits or failed payments.

## Workflow

1. **Map what exists.** Search the codebase for the plan/price, subscription, invoice, credit note and payment tables or provider objects, the renewal job or webhook handlers, and where access is granted or revoked. Write a one-line flow: `signup → trial → first invoice → renewal → dunning → cancel`.
2. **Identify who computes what.** Decide per concern whether the provider or your code owns it: proration, tax, dunning retries, invoice numbering, emails. Two owners for one concern is the most common source of double charges and mismatched totals. Stop and ask the user if it is unclear.
3. **Make the change using the rules for that area below.**
4. **Write tests with a fake clock** for each boundary you touched: trial end, renewal on the 31st, leap day, DST change in the customer's timezone, upgrade one second before renewal, downgrade, cancel at period end, failed payment then recovery.
5. **Backfill or migrate with a dry run first** (see "Migrating prices"). Print the before and after per customer, get approval, then run.

## Plans and price changes

- New customers get the new price immediately. Existing customers: choose **grandfather** (stay on old price), **migrate at next renewal** (with notice), or **migrate now** (prorated). This is a business and sometimes legal decision: stop and ask the user, and ask what notice period applies.
- Keep a `price_version` or price ID on every subscription item and invoice line.
- Plan limits and features live in an entitlements table keyed by price, not hard-coded per plan name.

## Proration

Decide and document per change type. Defaults that rarely surprise customers:

| Change | Default |
|---|---|
| Upgrade mid-cycle | Charge the prorated difference now (credit unused old time, charge remaining new time), keep the anchor |
| Downgrade mid-cycle | Apply at period end; no refund |
| Quantity increase (seats) | Prorate now, or true-up at next invoice; pick one |
| Quantity decrease | Apply at period end |
| Billing interval change (monthly → annual) | Credit unused time, start a new period now, reset anchor |

Compute proration by seconds (or days, if you document it) of the half-open period. Worked examples, rounding rules and edge cases in `references/proration.md`.

## Trials

- Store `trial_end` as an instant. At `trial_end`, either convert (first invoice, charge) or end (no access), never both by different jobs.
- Collect a payment method up front or not: it changes conversion and dunning. Ask the user if not decided.
- Send a reminder before conversion where the law or card network rules require it; check local rules for the markets you sell in and do not assume.
- A trial extension moves `trial_end`; it never creates a zero-amount invoice that later looks like revenue.

## Dunning and retries

1. On a failed charge, keep the invoice `open` (unpaid), move the subscription to `past_due` (or the provider's equivalent), and schedule retries. A common schedule is 3 to 4 retries over 1 to 3 weeks; let the provider's smart retries run if it has them, and don't add your own on top.
2. Notify the customer on the first failure with a link to update the payment method; retry immediately when they update it.
3. Classify declines: hard declines (stolen card, closed account) stop retrying and ask for a new method; soft declines (insufficient funds, issuer unavailable) retry.
4. Decide the end state after the last retry: cancel, pause, or leave unpaid with access cut. Stop and ask the user; it is a policy decision.
5. Grace period: access during dunning is a policy setting, not an accident of which webhook arrived first.
6. When a past-due invoice is finally paid, restore access and do not reset the billing anchor unless the policy says so.

## Invoices and credit notes

- Lifecycle: `draft → open (finalised, numbered) → paid | void | uncollectible`. Number on finalisation, from a gap-free sequence per legal entity if the jurisdiction requires it.
- Credit notes reference the original invoice, carry their own number, and reverse tax in the same proportion as the lines they credit.
- Refund and credit are different things: a credit note reduces what is owed; a refund moves money back. A refund of a paid invoice usually needs both.
- Void only an invoice that was never sent or paid, if your jurisdiction allows it; otherwise credit it.

## Cancellations

- Offer `cancel at period end` (default) and `cancel now`. Cancel now needs a refund rule: none, prorated credit, or prorated refund. Ask the user.
- Cancellation stops future invoices; it does not void open ones. Decide whether open past-due invoices are still collected.
- Make cancellation as easy as signup; several jurisdictions have rules on this. Do not build dark patterns.

## Revenue reporting basics

- **MRR**: normalise each active, paid subscription's recurring invoice amount after discounts to a month (annual ÷ 12). Exclude one-off charges, tax and usage unless you report them separately.
- **MRR movements** per month: new, expansion, contraction, churn, reactivation. They must sum from opening to closing MRR; if they don't, there is a bug.
- **Churn**: logo churn (customers lost ÷ customers at start) and revenue churn (MRR lost ÷ MRR at start), each defined in writing.
- **Deferred revenue**: an annual prepayment is earned monthly. Reporting it as revenue on the day paid is wrong under accrual accounting. Recognition policy (ASC 606, IFRS 15) belongs to the finance team; give them the invoice and period data, don't decide policy in code.

Queries for these in `references/revenue-metrics.md`.

## Migrating prices

1. Select affected subscriptions; write the old and new amount, next invoice date and proration per customer to a file.
2. Show totals and a sample to the user; stop and wait for approval.
3. Send required notice before the change takes effect.
4. Run in batches with idempotency keys, logging each subscription ID and result; make the script resumable.
5. Reconcile: next-cycle invoice totals must match the dry-run file.

## Never

- Never charge, refund or migrate live customers without explicit approval for that run.
- Never recompute an issued invoice from current prices.
- Never let two systems (yours and the provider's) both send dunning emails or both compute proration.
- Never use the server's local timezone for period maths.

## Report format

When asked to design or review a billing change, return:

```
Change: <one line>
Owner per concern: proration=<provider|app>, tax=..., dunning=..., numbering=...
Customer impact: <who pays what, when; one example invoice>
Edge cases tested: <list>
Decisions needed from the user: <list, or none>
```
