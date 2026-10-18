---
name: mtn-momo-integration
description: Builds and reviews direct integrations with the MTN Mobile Money (MoMo) Open API from momodeveloper.mtn.com, including Collection request-to-pay, Disbursement transfers and refunds, API user and access token handling, X-Reference-Id idempotency, unsigned callbacks confirmed by status checks, and sandbox testing for MTN markets such as Ghana, Uganda and Cameroon. Use when integrating MTN MoMo directly rather than through Paystack or another aggregator, calling requesttopay or disbursement endpoints, handling MoMo callbacks, or debugging MoMo API errors such as 401, 409 or INVALID_CALLBACK_URL_HOST.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to sandbox.momodeveloper.mtn.com or the production MoMo API. The sandbox setup script needs Node 18+. Examples are TypeScript; the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# MTN MoMo integration

Build a MoMo payment flow that can't be faked, never charges or pays out twice, and still settles when a callback never arrives. This skill is for the MTN MoMo Open API called directly. If the project pays through Paystack, Flutterwave or another aggregator, follow that provider's flow instead.

## Ground rules

1. **Credentials stay on the server.** The subscription key, API user, API key and access token are all secrets. Read them from the environment, never ship them to a browser or app, and keep one set per product: Collection, Disbursement and Remittance each have their own subscription key.
2. **One fresh UUID v4 `X-Reference-Id` per attempt, stored before you call.** It is the transaction's ID. MoMo rejects a reused ID with `409 RESOURCE_ALREADY_EXIST`, so a timed-out request can be retried with the **same** ID safely: a 409 means the first attempt was created, so check its status. A new attempt by the customer gets a new ID.
3. **Callbacks are not signed and are sent once, with no retry.** Never give value because a callback arrived or because of what its body says. Treat it as a hint to run a status check, and poll the status endpoint as well, because some callbacks never arrive.
4. **Only a status check confirms money moved.** `GET .../requesttopay/{referenceId}` (or `/transfer/{id}`) returns `200` even when the payment failed. Give value only when `status` is `SUCCESSFUL` **and** the amount and currency equal what you stored.
5. **Fulfilment is idempotent.** Mark the order paid with a guarded update (`UPDATE ... WHERE status = 'pending'`) keyed on the reference, so a callback, a poll and a retry arriving together still fulfil once.
6. **The server decides the price.** Compute the amount from your own records. `amount` is a string; build it from integer minor units, never from float arithmetic.
7. **Sandbox first, in EUR.** The sandbox only accepts `EUR` and target environment `sandbox`. Production uses the market's currency and its own target environment (for example `mtnghana` with `GHS`).

## Flow (Collection: request to pay)

```
client ──(order id, phone number)──▶ server: create order + payment row with a new UUID (status PENDING)
server ──POST /collection/v1_0/requesttopay (X-Reference-Id = that UUID)──▶ MoMo: 202 Accepted
customer approves the prompt on their phone (about 5 minutes before it times out)
MoMo ──callback (PUT or POST, unsigned)──▶ server: return 200 at once, then run a status check
server ──GET /collection/v1_0/requesttopay/{id}──▶ SUCCESSFUL + amount/currency match → fulfil once
background job: poll PENDING payments with backoff until final, or time them out
```

The client never learns the result from MoMo directly. It asks your server, which reports the stored status.

## Implementation steps

1. **Configure** environment variables for the base URL, target environment, currency, and each product's subscription key, API user and API key. In sandbox, create the API user and key with `scripts/sandbox-setup.js` (see `references/sandbox-and-go-live.md`). In production, they come from MTN's partner portal for your market, not from the API.
2. **Get an access token** per product with `POST /{product}/token/`, using Basic auth (`apiUser:apiKey`), the subscription key and **no body**. Cache it and refresh it before `expires_in` runs out instead of requesting one per payment.
3. **Request to pay** with the headers and body in `references/api.md`. Validate the phone number first: digits only, with the country code (for example `233...` in Ghana). `payerMessage` and `payeeNote` are at most 160 characters; avoid apostrophes and other special characters, which MoMo rejects with 400.
4. **Handle callbacks and polling** exactly as `references/callbacks.md` describes: accept both PUT and POST, put a per-transaction token in the callback path, respond 200 fast, and confirm every result with a status check.
5. **Map failures** to clear messages using the reason codes in `references/api.md`: unknown number, not enough funds, approval rejected, timed out (`EXPIRED`, `COULD_NOT_PERFORM_TRANSACTION`), limit reached. Let the customer retry with a new reference.
6. **Payouts and refunds** (Disbursement) follow the same rules: a new UUID per transfer, store it first, confirm by status. Production Disbursement also requires your server's IP to be whitelisted, otherwise calls fail with `403`.
7. **Persist** for each payment: the reference UUID, order id, expected amount and currency, phone number, status, `financialTransactionId`, failure reason, and timestamps. Reconcile against MoMo's status regularly.

## Reviewing an existing integration

Check each ground rule, then look for these common bugs:

- Fulfilment triggered by the callback body, or by the 202 from request to pay.
- A new `X-Reference-Id` generated on retry, which can charge the customer twice, or the same ID reused for a new attempt, which fails with 409.
- No polling fallback, so payments stay PENDING forever when a callback is lost.
- Status treated as success because the HTTP response was 200.
- A token requested for every call, or a Collection key used against Disbursement (401).
- Callback host that differs from the API user's `providerCallbackHost`, uses plain HTTP, or uses an IP address (`INVALID_CALLBACK_URL_HOST`).
- Sandbox values (`EUR`, `sandbox`) left in production configuration, or production credentials used in the sandbox.
- Amounts built with floats, or a price taken from the client.

## Before you finish

The API reference at momodeveloper.mtn.com is the final word on field names and behaviour; this skill gives the rules and the shape. Production base URLs and market currencies vary by country, so confirm them with MTN for the market you go live in. Then test in the sandbox with the test numbers in `references/sandbox-and-go-live.md`: a successful payment, a failure, a rejection, an expired approval, a callback that never arrives (polling must settle it), a duplicate callback, and a retried request after a simulated timeout (must not charge twice).
