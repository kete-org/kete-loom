# Paystack webhooks

## What Paystack sends

- `POST` with a JSON body, for example `{ "event": "charge.success", "data": { ... } }`.
- Header `x-paystack-signature`: HMAC SHA512 of the request body, keyed with your **secret key**, hex encoded.
- Paystack treats anything other than `200 OK` as a failed delivery and retries. In live mode it retries every 3 minutes for the first 4 tries, then hourly for 72 hours.
- Paystack documents a fixed set of source IPs you can additionally allow-list; check the webhooks page for the current list.

## Handler rules

1. Read the **raw body bytes** before any JSON parsing. Re-serialising parsed JSON changes whitespace and key order and breaks the signature.
2. Compute `HMAC_SHA512(secretKey, rawBody)` as hex and compare with the header using a **constant-time** comparison. Mismatch → respond `401` and stop.
3. Respond `200` immediately after the signature check, then process the event asynchronously (a queue or background job).
4. In the processor: look up your order by `data.reference`, check `data.status === "success"`, and check `data.amount` and `data.currency` equal what you stored. Then mark the order paid **in the same transaction** as an idempotency check (unique `reference`, or `UPDATE ... WHERE status = 'pending'`).
5. Log the event id and reference. Never log card data or the secret key.

## Express (TypeScript)

```ts
import crypto from 'node:crypto';
import express from 'express';

const app = express();
const SECRET = process.env.PAYSTACK_SECRET_KEY!;

app.post('/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('x-paystack-signature') ?? '';
  const expected = crypto.createHmac('sha512', SECRET).update(req.body).digest('hex');
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return res.sendStatus(401);

  res.sendStatus(200); // acknowledge first
  const event = JSON.parse(req.body.toString('utf8'));
  queue.add('paystack-event', event); // process asynchronously and idempotently
});
```

## Next.js route handler

```ts
import crypto from 'node:crypto';

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(raw).digest('hex');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return new Response('invalid signature', { status: 401 });
  }
  const event = JSON.parse(raw.toString('utf8'));
  await enqueue(event); // keep this fast
  return new Response('ok', { status: 200 });
}
```

## Python (FastAPI)

```python
import hashlib, hmac, os
from fastapi import FastAPI, Request, Response

app = FastAPI()
SECRET = os.environ["PAYSTACK_SECRET_KEY"].encode()

@app.post("/webhooks/paystack")
async def paystack_webhook(request: Request):
    raw = await request.body()
    expected = hmac.new(SECRET, raw, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("x-paystack-signature", "")):
        return Response(status_code=401)
    enqueue(raw)  # process asynchronously and idempotently
    return Response(status_code=200)
```

## Local testing

Webhooks can't reach `localhost`. Use a tunnel (for example `cloudflared` or `ngrok`) and set the tunnel URL in the Paystack dashboard for test mode. Use the dashboard's resend option, or the Webhook Events API, to replay an event and confirm your handler is idempotent.
