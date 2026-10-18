# MTN MoMo Open API reference

Read this when writing or reviewing the HTTP calls. Checked against the API reference on momodeveloper.mtn.com in October 2026; confirm against the current reference before shipping.

## Base URLs and target environments

| Environment | Base URL | `X-Target-Environment` |
|---|---|---|
| Sandbox | `https://sandbox.momodeveloper.mtn.com` | `sandbox` (currency must be `EUR`) |
| Production | `https://proxy.momoapi.mtn.com` (stated by MTN on its developer community forum, not in the API reference; confirm with MTN for your market) | the market value below |

Paths are prefixed by product: `/collection`, `/disbursement`, `/remittance`. Sandbox provisioning (`/v1_0/apiuser`) has no product prefix.

Production target environments documented by MTN: `mtnuganda`, `mtnghana`, `mtnivorycoast`, `mtnzambia`, `mtncameroon`, `mtnbenin`, `mtncongo`, `mtnswaziland`, `mtnguineaconakry`, `mtnsouthafrica`, `mtnliberia`, `mtnsouthsudan`, `mtnnigeria`, `mtnrwanda`. A wrong value fails with `NOT_ALLOWED_TARGET_ENVIRONMENT`.

Currencies by market, from MTN's community forum (confirm before going live): Uganda `UGX`, Ghana `GHS`, Côte d'Ivoire `XOF`, Zambia `ZMW`, Cameroon `XAF`, Benin `XOF`, Congo `XAF`, Eswatini `SZL`, Guinea `GNF`, South Africa `ZAR`, Liberia `LRD`.

## Authentication

- **Subscription key**: header `Ocp-Apim-Subscription-Key`. Each product has its own primary and secondary key; either works. A key from the wrong product gives 401.
- **API user and API key**: sandbox users are created with the API (see `sandbox-and-go-live.md`). Production users are created in the partner portal for your market. Sandbox users only work in the sandbox.
- **Access token**: `POST /{product}/token/` with `Authorization: Basic base64(apiUser:apiKey)`, the subscription key, and **no body** (a body gives 400). The response is `{ "access_token": "...", "token_type": "...", "expires_in": <seconds> }`. Send it as `Authorization: Bearer <access_token>`, cache it per product, and refresh it shortly before `expires_in` ends.
- `bc-authorize` and `/oauth2/token/` exist for consent-based calls such as `/oauth2/v1_0/userinfo`. Request to pay, transfers, balance and basic user info use the plain token above.

## Request to pay (Collection)

`POST /collection/v1_0/requesttopay`

| Header | Value |
|---|---|
| `Authorization` | `Bearer <access_token>` |
| `X-Reference-Id` | a new UUID v4 you stored first; it becomes the transaction ID |
| `X-Target-Environment` | `sandbox` or the market value |
| `Ocp-Apim-Subscription-Key` | the Collection subscription key |
| `X-Callback-Url` | optional; HTTPS on the API user's callback host |
| `Content-Type` | `application/json` |

```json
{
  "amount": "25.50",
  "currency": "GHS",
  "externalId": "order_8f2c1a",
  "payer": { "partyIdType": "MSISDN", "partyId": "233241234567" },
  "payerMessage": "Order 8f2c1a",
  "payeeNote": "Order 8f2c1a"
}
```

- `amount` is a string in the currency's major unit. Build it from integer minor units with `formatAmount` below, which knows that UGX, XOF, XAF and GNF have no decimals. MTN doesn't document whether every market accepts decimals, so confirm the format with a small real payment before going live.
- `partyIdType` is `MSISDN`, `EMAIL` or `PARTY_CODE`. An MSISDN includes the country code; MTN's examples use digits only, without `+`.
- `externalId` is your reference for reconciliation; it doesn't need to be unique.
- `payerMessage` and `payeeNote`: at most 160 characters, no apostrophes or special characters.

Responses: `202 Accepted` with no body (the payment is now PENDING). `409 RESOURCE_ALREADY_EXIST` if the `X-Reference-Id` was used before. `400` for a bad body, `401` for a bad key or token, `500` with a reason code for environment, currency or callback-host errors.

```ts
import { randomUUID } from 'node:crypto';

const MOMO = process.env.MOMO_BASE_URL!; // https://sandbox.momodeveloper.mtn.com
const ENV = process.env.MOMO_TARGET_ENVIRONMENT!; // sandbox | mtnghana | ...
const KEY = process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY!;

export async function requestToPay(order: { id: string; amountMinor: number; currency: string; msisdn: string }) {
  const referenceId = randomUUID();
  await db.payments.insert({ referenceId, orderId: order.id, amountMinor: order.amountMinor, currency: order.currency, status: 'PENDING' });
  const res = await fetch(`${MOMO}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await collectionToken()}`,
      'x-reference-id': referenceId,
      'x-target-environment': ENV,
      'ocp-apim-subscription-key': KEY,
      'x-callback-url': callbackUrl(referenceId),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      amount: formatAmount(order.amountMinor, order.currency),
      currency: order.currency,
      externalId: order.id,
      payer: { partyIdType: 'MSISDN', partyId: order.msisdn },
      payerMessage: `Order ${order.id}`,
      payeeNote: `Order ${order.id}`,
    }),
  });
  // 409 on a retry with the same referenceId means the first attempt was created: check its status instead.
  if (res.status !== 202 && res.status !== 409) throw new Error(`requesttopay failed: ${res.status} ${await res.text()}`);
  return referenceId;
}

// Money as integer minor units, converted with integer maths only. Intl knows each currency's ISO decimals (GHS 2, UGX 0).
const decimals = (currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

export function formatAmount(minor: number, currency: string): string {
  const d = decimals(currency);
  if (d === 0) return String(minor);
  const s = String(minor).padStart(d + 1, '0');
  return `${s.slice(0, -d)}.${s.slice(-d)}`; // 2550 GHS -> "25.50"
}

// MoMo may echo "25.5" or "25.50": compare in minor units, not as strings.
export function toMinor(amount: string, currency: string): number {
  const d = decimals(currency);
  const [whole, frac = ''] = amount.split('.');
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(frac) || frac.length > d) return NaN;
  return Number(whole) * 10 ** d + Number(frac.padEnd(d, '0') || 0);
}
```

If the request times out or returns 5xx, retry it with the **same** `referenceId` and headers. Never generate a new one for the same attempt.

## Status

`GET /collection/v1_0/requesttopay/{referenceId}` with the same auth headers (no callback header). Returns `200` whatever the outcome:

```json
{
  "amount": "25.50",
  "currency": "GHS",
  "financialTransactionId": "1234567890",
  "externalId": "order_8f2c1a",
  "payer": { "partyIdType": "MSISDN", "partyId": "233241234567" },
  "status": "FAILED",
  "reason": { "code": "NOT_ENOUGH_FUNDS", "message": "..." }
}
```

`status` is `PENDING`, `SUCCESSFUL` or `FAILED`. An unknown reference gives `404 RESOURCE_NOT_FOUND`.

## Reason codes

| Code | Tell the customer |
|---|---|
| `PAYER_NOT_FOUND` | This number isn't registered for MoMo |
| `NOT_ENOUGH_FUNDS` (also often `INTERNAL_PROCESSING_ERROR`) | Not enough money in the wallet |
| `PAYER_LIMIT_REACHED` | The wallet's limit was reached |
| `APPROVAL_REJECTED`, `PAYMENT_NOT_APPROVED`, `TRANSACTION_CANCELED` | The payment was declined on the phone |
| `EXPIRED`, `COULD_NOT_PERFORM_TRANSACTION` | The approval timed out (about 5 minutes) |
| `PAYEE_NOT_ALLOWED_TO_RECEIVE`, `NOT_ALLOWED` | Merchant-side problem: log it and alert, don't blame the customer |
| `NOT_ALLOWED_TARGET_ENVIRONMENT`, `INVALID_CURRENCY`, `INVALID_CALLBACK_URL_HOST` | Configuration error on your side |
| `SERVICE_UNAVAILABLE` | Try again later |

## Disbursement and refunds

- **Transfer (payout)**: `POST /disbursement/v1_0/transfer`, same headers as request to pay with the Disbursement key and token. The body uses `payee` instead of `payer`. `202` or `409`. Status: `GET /disbursement/v1_0/transfer/{referenceId}`.
- **Refund**: `POST /disbursement/v1_0/refund` (or `/v2_0/refund`) with `amount`, `currency`, `externalId`, `payerMessage`, `payeeNote` and `referenceIdToRefund` (the request-to-pay UUID). Status: `GET /disbursement/v1_0/refund/{referenceId}`. The v1 and v2 endpoints take the same body; MTN documents v1 callbacks as POST and v2 as PUT.
- **Deposit**: `/disbursement/v1_0/deposit` and `/v2_0/deposit`, same body shape as a transfer.
- Production Disbursement calls need your server's IP whitelisted with MTN, or they fail with `403`.

## Other endpoints

- `GET /{product}/v1_0/account/balance` returns `{ "availableBalance": "...", "currency": "..." }`.
- `GET /{product}/v1_0/accountholder/msisdn/{msisdn}/active` returns `{ "result": true }`. The type is lowercase. It shows the account exists and is active, not that it can pay a given amount.
- `GET /{product}/v1_0/accountholder/msisdn/{msisdn}/basicuserinfo` returns the holder's name. Useful to show "Pay Ama Mensah?" before a payout.
