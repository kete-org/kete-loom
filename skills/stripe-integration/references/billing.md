# Stripe subscriptions, customer portal and test clocks

## Subscription via Checkout

```ts
const session = await stripe.checkout.sessions.create(
  {
    mode: 'subscription',
    customer: user.stripeCustomerId, // create the Customer once per user and store it
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { user_id: user.id } },
    success_url: 'https://app.example.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://app.example.com/billing',
  },
  { idempotencyKey },
);
```

Store `session.subscription` from `checkout.session.completed`. From then on, the subscription `status` is the source of truth for access:

| `status` | Typical access |
|---|---|
| `trialing`, `active` | Full |
| `past_due` | Your policy: grace period while Stripe retries |
| `unpaid`, `canceled`, `incomplete_expired`, `paused` | None |
| `incomplete` | None until the first invoice is paid (often SCA pending) |

Sync it on `customer.subscription.created`, `.updated` and `.deleted`, and extend access to the period end on `invoice.paid`. On API version `2025-03-31.basil` and later, the period fields are on subscription items (`items.data[].current_period_end`), not on the subscription; older versions have `subscription.current_period_end`. Read the field for the API version you pinned. If events arrive out of order, retrieve the subscription from the API and store what it says.

Plan changes: `stripe.subscriptions.update(subId, { items: [{ id: itemId, price: newPriceId }], proration_behavior: 'create_prorations' })` with an idempotency key, or let the portal do it.

## Customer portal

1. Configure features (cancel, switch plan, update payment method, invoice history) in the Dashboard's customer portal settings, or with `stripe.billingPortal.configurations.create`.
2. From an authenticated route:

```ts
const portal = await stripe.billingPortal.sessions.create({
  customer: currentUser.stripeCustomerId, // from your session, never from the request body
  return_url: 'https://app.example.com/billing',
});
redirect(portal.url);
```

Changes made in the portal arrive as the same subscription and invoice webhooks; no extra handling.

## Test clocks

Test clocks simulate time for billing objects in test mode or a sandbox.

```ts
const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000) });
const customer = await stripe.customers.create({ email: 'trial@example.com', test_clock: clock.id });
// attach a test payment method, create the subscription, then:
await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: clock.frozen_time + 15 * 24 * 3600 });
```

Advancing is asynchronous: wait for the clock's status to return to `ready` (or the `test_helpers.test_clock.ready` event) before asserting. Scenarios worth running: trial converts to paid, renewal succeeds, renewal fails with `4000 0000 0000 0341` attached (card attaches but charges fail), cancellation at period end takes effect. Only customers created with the clock move with it; delete the clock when done.
