---
name: paystack-integration
description: Builds and reviews Paystack payment integrations, including transaction initialisation, server-side verification, webhooks with HMAC-SHA512 signature checks, idempotent fulfilment, and Ghana mobile money (MTN, Telecel, AT) charges. Use when adding Paystack checkout, card or mobile money payments, handling Paystack webhooks, or debugging a Paystack payment flow.
license: MIT
compatibility: Any Agent Skills host. Needs network access to api.paystack.co for live calls. Examples are TypeScript (Node 18+); the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Paystack integration

Build a payment flow that can't be faked from the browser and never gives value twice. These rules cover cards, bank and mobile money.

## Ground rules

1. **The secret key stays on the server.** Read it from the environment (`PAYSTACK_SECRET_KEY`). Only the public key (`pk_...`) may reach the browser or app.
2. **Amounts are in the currency's subunit**: pesewas for GHS, kobo for NGN, cents for USD, KES and ZAR. GHS 25.50 is `2550`. Use integers, never floats.
3. **The server decides the price.** Compute the amount from your own database (order total, plan price). Never trust an amount sent by the client.
4. **Value is given only after verification.** Either a webhook with a valid signature, or a call to the Verify Transaction endpoint, must confirm `status: "success"` **and** that the amount and currency match what you expected.
5. **Fulfilment is idempotent.** Store the `reference` with a unique constraint and process each reference once, because Paystack retries webhooks and users refresh pages.
6. **Test keys first.** Use `sk_test_` / `pk_test_` until the full flow, including failures, works end to end.

## Flow

```
client ──(order id)──▶ server: create order, compute amount, POST /transaction/initialize
server ──(authorization_url or access_code)──▶ client: redirect or open Popup
customer pays on Paystack
Paystack ──(charge.success webhook)──▶ server: verify signature, verify amount, fulfil once
client returns to callback_url ──▶ server: GET /transaction/verify/:reference, show result
```

The callback page only *shows* status. Fulfilment happens in the webhook (or a verify call), guarded by the idempotency check, so it is safe whichever arrives first.

## Implementation steps

1. **Initialise** with `POST https://api.paystack.co/transaction/initialize`, `Authorization: Bearer <secret key>`, and a body containing `email`, `amount` (subunit), `currency`, a `reference` you generate and store, `callback_url`, and `metadata` (for example the order id). See `references/api.md` for request and response shapes.
2. **Webhook endpoint**: follow `references/webhooks.md` exactly. Verify the signature on the **raw** body, return `200` quickly, and do the work asynchronously.
3. **Verify** with `GET https://api.paystack.co/transaction/verify/:reference` on the callback page and as a fallback when no webhook arrives.
4. **Mobile money (Ghana)**: use the Charge API or the standard checkout, and follow `references/mobile-money.md` for the `pay_offline` pending flow and the 180-second approval window.
5. **Persist** an order and payment record holding `reference`, expected amount and currency, status, the Paystack transaction id, and timestamps.

## Reviewing an existing integration

Check each ground rule above, then look for these common bugs:

- Signature computed over re-serialised JSON instead of the raw bytes.
- Webhook does heavy work before responding, which causes timeouts and duplicate retries.
- Fulfilment keyed on `id` from the client, or done in the callback page without verification.
- Float arithmetic on amounts (`25.5 * 100`), or amounts in cedis instead of pesewas.
- Secret key committed in code or exposed in a `NEXT_PUBLIC_`/`VITE_` variable.
- No handling for `failed`, `abandoned` or `reversed` transactions.

## Before you finish

Confirm field names and endpoints against Paystack's current docs at paystack.com/docs when generating new code; this skill gives the rules and the shape, the docs are the final word on the API. Then test: successful payment, declined payment, a duplicate webhook delivery, a webhook with a bad signature (must be rejected), and mobile money approval timing out.
