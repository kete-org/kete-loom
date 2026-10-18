# Flutterwave webhooks (v3)

## What Flutterwave sends

- `POST` with JSON such as `{ "event": "charge.completed", "data": { "id": 123, "tx_ref": "...", "status": "successful", "amount": 25.5, "currency": "GHS", ... } }`.
- Header `verif-hash`: the **secret hash** you set in the dashboard webhook settings. It is a shared secret echoed back, not an HMAC of the body, so it proves the sender knows the secret but not that the body is untouched. That is why every webhook is followed by a verify call.
- Anything other than `200` (including `3xx`) is a failure. With retries enabled in the dashboard, Flutterwave retries 3 times, 30 minutes apart. Requests time out after 60 seconds. Response body and headers are ignored.

If the dashboard or docs for your account show an HMAC signature header instead of, or as well as, `verif-hash`, verify that signature on the raw body and keep the verify call.

## Handler rules

1. Store the secret hash in the environment (`FLW_WEBHOOK_HASH`), not in code.
2. Read the `verif-hash` header. Missing or not equal (constant-time compare) → respond `401` and stop.
3. Respond `200` immediately, then enqueue `data.id` for processing.
4. The processor calls `GET /v3/transactions/{id}/verify`, applies the checks in `api.md`, and marks the payment paid with a guarded update keyed on `tx_ref`. Unknown `tx_ref` → log and drop; never create an order from a webhook.
5. Log event type, `id` and `tx_ref`. Never log card data, the secret key or the hash.

## Express (TypeScript)

```ts
import crypto from 'node:crypto';
import express from 'express';

const app = express();
const HASH = process.env.FLW_WEBHOOK_HASH!;

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

app.post('/webhooks/flutterwave', express.json(), (req, res) => {
  if (!sameSecret(req.header('verif-hash') ?? '', HASH)) return res.sendStatus(401);
  res.sendStatus(200); // acknowledge first
  if (req.body?.event === 'charge.completed' && req.body.data?.id) {
    queue.add('flw-verify', { id: String(req.body.data.id) }); // verify + fulfil once
  }
});
```

## Guarded fulfilment (SQL)

```sql
UPDATE payments
   SET status = 'paid', flw_id = $2, paid_at = now()
 WHERE tx_ref = $1 AND status = 'pending'
RETURNING order_id;  -- fulfil only when a row comes back
```
