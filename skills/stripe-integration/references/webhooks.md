# Stripe webhooks

## What Stripe sends

- `POST` with a JSON `Event` (snapshot payload) or a thin event notification, depending on how the event destination was created. Most existing integrations use snapshot events and read `event.data.object`.
- Header `Stripe-Signature: t=<timestamp>,v1=<hmac-sha256>[,v1=...]`. The signature is HMAC-SHA256 of `"<t>.<raw body>"` with the endpoint's `whsec_` secret. Only `v1` is valid; ignore other schemes.
- Live mode retries with exponential backoff for up to three days; sandboxes retry three times over a few hours. `3xx` counts as failure.
- Delivery is at least once and order is not guaranteed. Don't use `created` to order or dedupe; track `event.id`.
- Each endpoint, and test vs live, has its own signing secret. During a secret roll, two secrets may be active for up to 24 hours.

## Handler rules

1. Read the **raw body bytes**. Any body parser that runs first breaks verification.
2. `stripe.webhooks.constructEvent(rawBody, signatureHeader, endpointSecret)`; on error respond `400` and stop. Keep the default 5-minute tolerance and keep server clocks synced.
3. Respond `2xx` immediately, then process in a queue.
4. In the worker: skip if `event.id` is already recorded; otherwise handle the type, fetch fresh objects from the API when you need current state, and record `event.id` in the same database transaction as the state change.
5. Subscribe the endpoint only to the event types you handle.
6. Exempt the route from CSRF middleware (Rails, Django, Laravel).

## Express (TypeScript)

```ts
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const app = express();

// Must be registered before app.use(express.json())
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.header('stripe-signature') ?? '', process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.sendStatus(400);
  }
  res.sendStatus(200);
  queue.add('stripe-event', { id: event.id, type: event.type, objectId: (event.data.object as { id: string }).id });
});
```

## Next.js route handler

```ts
export async function POST(req: Request) {
  const raw = await req.text(); // unparsed body
  try {
    const event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', process.env.STRIPE_WEBHOOK_SECRET!);
    await enqueue(event.id, event.type);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }
  return new Response('ok');
}
```

## Events to handle

| Event | Do |
|---|---|
| `checkout.session.completed` | If `payment_status` is `paid`, fulfil the order in `client_reference_id` / `metadata.order_id` once |
| `checkout.session.async_payment_succeeded` / `_failed` | Fulfil or fail delayed-method payments |
| `payment_intent.succeeded` / `payment_intent.payment_failed` | Custom Payment Element flows |
| `invoice.paid` | Extend subscription access to the new period |
| `invoice.payment_failed` | Start dunning; notify the customer |
| `customer.subscription.updated` / `customer.subscription.deleted` | Sync plan, status and cancellation |
| `charge.refunded`, `charge.dispute.created` | Reverse or flag fulfilment |

## Local testing

```bash
stripe login
stripe listen --forward-to localhost:4242/webhooks/stripe   # prints a whsec_ for this session
stripe trigger checkout.session.completed
stripe events resend <event_id> --webhook-endpoint=<endpoint_id>
```
