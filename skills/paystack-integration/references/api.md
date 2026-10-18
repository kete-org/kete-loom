# Paystack API shapes used by this skill

Base URL: `https://api.paystack.co`. All server calls send `Authorization: Bearer <PAYSTACK_SECRET_KEY>` and `Content-Type: application/json`. Responses look like `{ "status": true, "message": "...", "data": { ... } }`; `status` there means the API call succeeded, not that a payment did.

Confirm fields against paystack.com/docs/api before shipping; this is a working summary.

## Initialise a transaction

`POST /transaction/initialize`

```json
{
  "email": "customer@example.com",
  "amount": 2550,
  "currency": "GHS",
  "reference": "ord_8f2c1a",
  "callback_url": "https://app.example.com/pay/callback",
  "channels": ["card", "mobile_money"],
  "metadata": { "order_id": "8f2c1a" }
}
```

Response `data`: `authorization_url` (redirect the customer here), `access_code` (for the inline Popup), `reference`.

## Verify a transaction

`GET /transaction/verify/:reference`

Check in `data`:

| Field | Expect |
|---|---|
| `status` | `"success"` (others: `failed`, `abandoned`, `reversed`, `pending`) |
| `amount` | equals the amount you stored, in subunits |
| `currency` | equals the currency you stored |
| `reference` | the reference you generated |
| `id` | Paystack transaction id; store it |
| `channel` | `card`, `mobile_money`, `bank`, ... |

## Minimal server client (TypeScript)

```ts
const BASE = 'https://api.paystack.co';

async function paystack<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const body = await res.json();
  if (!res.ok || body.status !== true) throw new Error(`Paystack ${path} failed: ${body.message ?? res.status}`);
  return body.data as T;
}

export const initialize = (input: object) =>
  paystack<{ authorization_url: string; access_code: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const verify = (reference: string) =>
  paystack<{ status: string; amount: number; currency: string; reference: string; id: number }>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
```

## References

Generate references on the server, unique per payment attempt (for example `ord_<orderId>_<random>`). A retry after a failure gets a new reference; the order keeps a list of attempts.
