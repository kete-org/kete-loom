# Callbacks and status polling

Read this when building or reviewing the callback endpoint or the code that settles PENDING payments.

## What MoMo guarantees, and what it doesn't

- Callbacks are **not signed** and carry no authentication. Anyone who learns the URL can call it.
- MoMo sends each callback **once, with no retry**. If your server is down or slow, it is lost.
- The documentation is inconsistent about the method (PUT for most, POST for v1 deposit and refund), so **accept both**.
- The body looks like the status response, but you must not trust it.
- The callback URL must be **HTTPS on port 443**, on the host registered as the API user's `providerCallbackHost` (a hostname, not an IP address), or MoMo rejects the request with `INVALID_CALLBACK_URL_HOST`. The certificate must chain to a common public CA (for example Let's Encrypt, DigiCert, Sectigo, Google or Amazon), or delivery can fail.
- Only path parameters are allowed in the callback URL, not query strings.

So a callback only tells you "check this reference now". The status check decides.

## Callback URL with a per-transaction token

Make each callback URL unguessable by putting a token derived from the reference in the path:

```ts
import crypto from 'node:crypto';

const SECRET = process.env.MOMO_CALLBACK_SECRET!; // random, server-side only
const tokenFor = (referenceId: string) => crypto.createHmac('sha256', SECRET).update(referenceId).digest('hex');

export const callbackUrl = (referenceId: string) =>
  `https://pay.example.com/momo/callback/${referenceId}/${tokenFor(referenceId)}`;
```

## Callback handler (Express)

```ts
app.all('/momo/callback/:referenceId/:token', (req, res) => {
  if (req.method !== 'PUT' && req.method !== 'POST') return res.sendStatus(405);
  const { referenceId, token } = req.params;
  const expected = tokenFor(referenceId);
  const valid = token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!valid) return res.sendStatus(404);

  res.sendStatus(200); // respond first; MoMo won't retry, but it shouldn't wait on you either
  queue.add('momo-settle', { referenceId }); // settle from a status check, never from req.body
});
```

## Settling a payment

One function settles a payment, and both the callback job and the poller call it:

```ts
export async function settle(referenceId: string) {
  const payment = await db.payments.findByReference(referenceId);
  if (!payment || payment.status !== 'PENDING') return; // unknown, or already final

  const res = await fetch(`${MOMO}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      authorization: `Bearer ${await collectionToken()}`,
      'x-target-environment': ENV,
      'ocp-apim-subscription-key': KEY,
    },
  });
  if (!res.ok) throw new Error(`status check failed: ${res.status}`); // the poller will retry
  const s = await res.json();

  if (s.status === 'PENDING') return;
  const matches = s.currency === payment.currency && toMinor(s.amount, s.currency) === payment.amountMinor;
  if (s.status === 'SUCCESSFUL' && matches) {
    // Guarded update: only one caller wins, so fulfilment happens once.
    const won = await db.payments.update({ referenceId, status: 'PENDING' }, { status: 'SUCCESSFUL', financialTransactionId: s.financialTransactionId });
    if (won) await fulfilOrder(payment.orderId);
  } else {
    await db.payments.update({ referenceId, status: 'PENDING' }, { status: 'FAILED', reason: s.reason?.code ?? (matches ? 'UNKNOWN' : 'AMOUNT_MISMATCH') });
  }
}
```

An amount or currency mismatch on a `SUCCESSFUL` payment is not a normal failure: flag it for a person to review rather than refunding or fulfilling automatically.

## Polling fallback

Run a background job for payments still PENDING:

- First check about 10 seconds after the 202, then back off (for example 10s, 20s, 40s, 60s, then every 60s).
- The customer has about 5 minutes to approve. After about 10 minutes, keep checking at a slower rate (every 15 minutes) for a few hours rather than marking the payment failed straight away, because MoMo may still settle it.
- Never create a new request to pay for the same attempt while one is PENDING.
- The client's "Check status" button should call `settle` (rate-limited), not MoMo directly.

## Tests

- A callback with a wrong token returns 404 and settles nothing.
- A callback whose body says SUCCESSFUL while the status check says FAILED results in FAILED.
- The same callback delivered twice, plus a poll at the same moment, fulfils once.
- No callback at all: the poller settles the payment.
