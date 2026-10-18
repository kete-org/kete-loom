# Flutterwave v3 API shapes used by this skill

Base URL: `https://api.flutterwave.com/v3`. Server calls send `Authorization: Bearer <FLW_SECRET_KEY>` and `Content-Type: application/json`. A top-level `"status": "success"` means the API call worked, not that money moved.

Confirm fields against developer.flutterwave.com before shipping; this is a working summary.

## Create a Standard payment link

`POST /payments`

```json
{
  "tx_ref": "ord_8f2c1a_a1",
  "amount": "25.50",
  "currency": "GHS",
  "redirect_url": "https://app.example.com/pay/flutterwave/return",
  "customer": { "email": "customer@example.com", "name": "Ama Mensah", "phonenumber": "233241234567" },
  "payment_options": "card, mobilemoneyghana",
  "meta": { "order_id": "8f2c1a" },
  "customizations": { "title": "Example Store" }
}
```

Response: `data.link`. Redirect the customer there. `currency` defaults to NGN when omitted, so always send it. `payment_options` only applies when "Disable preferred payment methods" is off in the dashboard.

Redirect back to `redirect_url`:
- success: `?status=successful&tx_ref=...&transaction_id=...`
- cancelled or failed: `?status=cancelled&tx_ref=...` (no transaction to verify)

## Verify a transaction

`GET /transactions/{id}/verify`, where `id` is `transaction_id` from the redirect or `data.id` from the webhook.

| Field in `data` | Expect |
|---|---|
| `status` | `"successful"` (others include `failed`, `pending`) |
| `tx_ref` | the reference you stored |
| `currency` | the currency you stored |
| `amount` | `>=` the expected amount; refund any excess |
| `id`, `flw_ref` | store both |

## Direct charges (mobile money)

`POST /charges?type=<type>` with `tx_ref`, `amount`, `currency`, `email`, `phone_number`, and any country-specific fields.

| Market | `type` | Currency | Notes |
|---|---|---|---|
| Ghana | `mobile_money_ghana` | GHS | Also send `network`. The docs list both `MTN`/`VODAFONE`/`TIGO` and `MTN`/`Telecel`/`AIRTEL`; confirm accepted values in the current reference. Response has `meta.authorization.mode: "redirect"`; send the customer to `meta.authorization.redirect` |
| Kenya | `mpesa` | KES | Customer approves an STK prompt |
| Uganda | `mobile_money_uganda` | UGX | Confirm in the reference |
| Francophone West/Central Africa | `mobile_money_franco` | XOF / XAF | Confirm in the reference, including `country` |

Every direct charge ends the same way: wait for the `charge.completed` webhook (or poll), then verify by id before giving value.

## Minimal server client (TypeScript)

```ts
const FLW = 'https://api.flutterwave.com/v3';
const headers = { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' };

export async function verifyFlutterwave(id: string, expected: { txRef: string; currency: string; amountMinor: number }) {
  const res = await fetch(`${FLW}/transactions/${encodeURIComponent(id)}/verify`, { headers });
  if (!res.ok) throw new Error(`verify failed: ${res.status}`);
  const { data } = await res.json();
  const paidMinor = Math.round(Number(data.amount) * 100); // shortcut: assumes 2-decimal currencies; UGX/XOF/XAF have 0
  return (
    data.status === 'successful' &&
    data.tx_ref === expected.txRef &&
    data.currency === expected.currency &&
    paidMinor >= expected.amountMinor
  );
}
```
