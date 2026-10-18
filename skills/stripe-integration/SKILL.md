---
name: stripe-integration
description: Builds and hardens Stripe payments and billing, from Checkout Sessions and Payment Intents with SCA and 3D Secure handling to Stripe-Signature webhook verification on the unparsed request body, Idempotency-Key headers on every POST, subscriptions driven by invoice events, the Billing customer portal, and test clocks for simulating renewals and trial ends. Use when adding Stripe Checkout or Elements, setting up Stripe subscriptions or the customer portal, fixing a Stripe webhook signature error or duplicate fulfilment, or testing billing cycles with the Stripe CLI.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to api.stripe.com; local webhook testing uses the Stripe CLI. Examples are TypeScript with the official stripe-node library; the rules apply to any Stripe SDK.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "stripe"
  kete-loom/owner: "Kete-org"
---

# Stripe integration

Build a Stripe flow where the price comes from the server, a webhook is trusted only after its signature checks out, retries never create a second charge, and subscription access follows what Stripe says, not what the browser says.

## Ground rules

1. **Secret key on the server only.** `STRIPE_SECRET_KEY` (`sk_...`, or a restricted `rk_...` key with only the permissions the service needs) and the webhook secret (`whsec_...`) come from the environment. Only the publishable key (`pk_...`) reaches the browser.
2. **Prices come from Stripe or your database.** Pass a `price` ID or compute `amount` server-side. Never accept an amount, currency or price ID from the client without checking it against an allow-list.
3. **Amounts are integers in the smallest unit** (cents for USD, pence for GBP; zero-decimal currencies such as JPY are whole units). No float maths.
4. **Fulfil from webhooks.** `checkout.session.completed` (plus `checkout.session.async_payment_succeeded` for delayed methods) or `payment_intent.succeeded`. The success page only shows status; it may never load.
5. **Verify every webhook** with the SDK on the **raw request bytes**, the `Stripe-Signature` header and that endpoint's `whsec_` secret. Keep the default 5-minute tolerance; never set it to 0.
6. **Idempotent both ways.** Send an `Idempotency-Key` (a UUID v4 stored with your order) on every create/update POST so a network retry can't double-charge. Record processed `event.id`s and guard fulfilment with `UPDATE ... WHERE status = 'pending'`, because Stripe delivers events at least once and out of order.
7. **Test mode or a sandbox first**, with the Stripe CLI forwarding events, before any live key is configured.

## Choose the flow

| Need | Use |
|---|---|
| One-off or subscription payment, least code, SCA handled for you | Checkout Session (`mode: 'payment'` or `'subscription'`), hosted or embedded |
| Your own payment form | Payment Intent + Payment Element; confirm on the client with `stripe.confirmPayment` |
| Save a card for later charges | `setup_future_usage: 'off_session'` on the Payment Intent, or a Setup Intent |
| Let customers manage plans, cards and invoices | Billing customer portal session |

## Implementation steps

1. **Create a Checkout Session** on the server with `line_items: [{ price, quantity }]`, `mode`, `success_url` (include `{CHECKOUT_SESSION_ID}`), `cancel_url`, `client_reference_id` or `metadata.order_id`, and an idempotency key. Redirect to `session.url`. Shapes in `references/api.md`.
2. **Or create a Payment Intent** with `amount`, `currency`, `automatic_payment_methods: { enabled: true }`, `metadata.order_id`; send only `client_secret` to the browser.
3. **Webhook endpoint**: follow `references/webhooks.md`. Mount it before any JSON body parser, verify with `stripe.webhooks.constructEvent`, return `2xx` fast, process in a queue.
4. **Handle SCA**: a Payment Intent in `requires_action` needs the customer to authenticate; the client SDK does this when confirming. For off-session charges (renewals, saved cards) handle `authentication_required` by emailing the customer a link back on-session. Never mark paid on `processing`.
5. **Subscriptions**: create through Checkout with `mode: 'subscription'`, store `customer` and `subscription` IDs, and drive access from events: `invoice.paid` (extend access; from API `2025-03-31.basil` the period end is on `items.data[].current_period_end`), `invoice.payment_failed` (dunning, keep or restrict per policy), `customer.subscription.updated` / `.deleted` (plan changes, cancellation). Details in `references/billing.md`.
6. **Customer portal**: configure it in the Dashboard, then create `billingPortal.sessions.create({ customer, return_url })` from an authenticated route and redirect. Never create a portal session for a customer ID taken from the request; look it up from the logged-in user.
7. **Test clocks** for billing: create a clock, attach a new customer to it, subscribe, then advance time to see trials end, renewals and failed payments fire their webhooks (`references/billing.md`).
8. **Persist**: order/payment row with expected amount and currency, Checkout Session or Payment Intent ID, idempotency key, status; a `stripe_events` table of processed event IDs; customer and subscription IDs per user.

## Reviewing an existing integration

Check each ground rule, then look for:

- Webhook route behind `express.json()` / framework body parsing, so `constructEvent` fails or was "fixed" by skipping verification.
- One `whsec_` reused across endpoints or between test and live (each endpoint and mode has its own).
- Fulfilment in the success page handler, or on `payment_intent.created` / `processing`.
- Event order assumed (`invoice.paid` before `customer.subscription.created`); missing objects not fetched from the API.
- No idempotency key on PaymentIntent, refund or subscription creation; or a new key generated on each retry, which defeats it.
- Subscription access granted from `checkout.session.completed` alone and never revoked on `customer.subscription.deleted`.
- Prices or amounts sent from the client; `price` IDs hard-coded from test mode in live config.
- Secret key in front-end code or a `NEXT_PUBLIC_`/`VITE_` variable.

## Stop and ask the user

- Before switching any configuration to live keys.
- Whether to keep or cut access on a failed renewal (business decision), and what the dunning and retry settings should be.
- Before building Connect (marketplaces, payouts to others); it is a different model with onboarding and liability decisions.

## Before you finish

Stripe's docs at docs.stripe.com and the API version pinned on your account are the final word on field names; this skill gives the rules and the shape. Test with `stripe listen --forward-to localhost:4242/webhook` and `stripe trigger`: card `4242 4242 4242 4242` succeeds, `4000 0025 0000 3155` requires 3D Secure, `4000 0000 0000 9995` declines for insufficient funds. Also test a replayed event (processed once), a bad signature (rejected with 400), a retried create call with the same idempotency key (one object), and a test-clock renewal that fails.
