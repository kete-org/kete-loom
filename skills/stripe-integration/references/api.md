# Stripe API shapes used by this skill

Use the official SDK for your language and pin the API version your account uses. Every create/update call takes an idempotency key in the request options (`Idempotency-Key` header over HTTP).

Idempotency facts (API v1): keys up to 255 characters, UUID v4 recommended, don't put personal data in them. Stripe saves the first response for a key (including a `500`) and returns it on retries; reusing a key with different parameters is an error; keys can be pruned after 24 hours. Don't send keys on `GET` or `DELETE`.

## Checkout Session (TypeScript, stripe-node)

```ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function startCheckout(order: { id: string; priceId: string; quantity: number; idemKey: string }) {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ price: order.priceId, quantity: order.quantity }], // priceId from your DB, not the client
      success_url: 'https://app.example.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.example.com/cart',
      client_reference_id: order.id,
      metadata: { order_id: order.id },
    },
    { idempotencyKey: order.idemKey }, // stored with the order, reused on retry
  );
  return session.url!;
}
```

The success page may call `stripe.checkout.sessions.retrieve(session_id)` to show status, but fulfilment stays in the webhook. Check `session.payment_status === 'paid'` (or `'no_payment_required'`) before fulfilling; for delayed methods it is `'unpaid'` at completion and you wait for `checkout.session.async_payment_succeeded`.

## Payment Intent

```ts
const pi = await stripe.paymentIntents.create(
  { amount: 2550, currency: 'usd', automatic_payment_methods: { enabled: true }, metadata: { order_id: order.id } },
  { idempotencyKey: order.idemKey },
);
// send pi.client_secret to the browser; confirm there with stripe.confirmPayment({ elements, confirmParams: { return_url } })
```

Statuses: `requires_payment_method` → `requires_confirmation` → `requires_action` (SCA / 3DS) → `processing` → `succeeded`, or `canceled`. Only `succeeded` (seen in `payment_intent.succeeded`) means paid. On `payment_intent.payment_failed`, read `last_payment_error` and let the customer try another method.

## Off-session charge with a saved method

```ts
try {
  await stripe.paymentIntents.create(
    { amount, currency, customer, payment_method, off_session: true, confirm: true },
    { idempotencyKey },
  );
} catch (err: any) {
  if (err.code === 'authentication_required') {
    // SCA needed: email the customer a link to an on-session page that confirms err.raw.payment_intent
  } else throw err;
}
```

## Refund

```ts
await stripe.refunds.create({ payment_intent: piId, amount: partialMinor }, { idempotencyKey: refundKey });
```

## Test cards

| Number | Behaviour |
|---|---|
| 4242 4242 4242 4242 | Succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Declined, insufficient funds |
| 4000 0000 0000 0002 | Declined, generic |
