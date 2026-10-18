---
name: flutterwave-integration
description: Builds and reviews Flutterwave v3 payment integrations across African markets, covering Flutterwave Standard hosted checkout, direct charges for mobile money (Ghana, Kenya M-Pesa, Uganda, Francophone) and cards, server-side verification by transaction id, verif-hash webhook checks and fulfilment that runs once per tx_ref. Use when adding Flutterwave payments to an app, handling a Flutterwave webhook or redirect, charging a mobile money wallet through Flutterwave, or debugging why a Flutterwave order was marked paid wrongly or twice.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to api.flutterwave.com. Examples are TypeScript (Node 18+); the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Flutterwave integration

Build a Flutterwave flow where the browser can't fake a payment, every `tx_ref` gives value at most once, and pending mobile money charges still settle. This skill targets the v3 API (`https://api.flutterwave.com/v3`). If the account uses a newer API version, stop and confirm the endpoints and webhook signing scheme in the dashboard and docs before writing code.

## Ground rules

1. **The secret key stays on the server.** `FLW_SECRET_KEY` (`FLWSECK-...`) and the encryption key are read from the environment. Only the public key (`FLWPUBK-...`) may reach a browser or app.
2. **The server sets the price.** Compute `amount` and `currency` from your own order record. Never accept them from the client.
3. **One `tx_ref` per attempt, stored before you call Flutterwave**, with a unique constraint. Flutterwave requires `tx_ref` to be unique per transaction. A customer retry gets a new `tx_ref` on the same order.
4. **Only a verify call gives value.** The redirect query string and the webhook body are hints. Call `GET /v3/transactions/{id}/verify` and require: `status === "successful"`, `tx_ref` equals yours, `currency` equals yours, and `amount >= expected` (if higher, give value and refund the difference, as Flutterwave's docs advise).
5. **Fulfilment is idempotent.** Mark paid with a guarded update (`UPDATE payments SET status='paid' WHERE tx_ref = $1 AND status = 'pending'`) and fulfil only if a row changed. Webhooks retry, users refresh, and both paths may run at once.
6. **Amounts are decimals in major units** in v3 (GHS 25.50 is `25.5`). Store integer minor units in your database and convert at the API boundary; never do float arithmetic on money.
7. **Test keys first** (`FLWSECK_TEST-...`) until success, failure, cancel and duplicate-webhook paths all work.

## Choose the flow

| Need | Use |
|---|---|
| Fastest safe integration, cards + mobile money + bank, no PCI scope | Flutterwave Standard: `POST /v3/payments` returns `data.link`, redirect there |
| Your own UI for mobile money | Direct charge: `POST /v3/charges?type=<method>` (see `references/api.md`) |
| Your own card form | Direct card charge needs payload encryption with the account encryption key and puts you in PCI DSS scope. Stop and ask the user before building it; prefer Standard or the inline modal |

## Flow (Standard)

```
client ──(order id)──▶ server: create payment row (tx_ref, expected amount/currency, pending)
server ──POST /v3/payments──▶ Flutterwave: data.link
client ──redirect──▶ hosted page; customer pays
Flutterwave ──redirect_url?status=..&tx_ref=..&transaction_id=..──▶ server: verify by id, show result
Flutterwave ──webhook charge.completed (verif-hash header)──▶ server: check hash, 200, queue verify + fulfil once
```

## Implementation steps

1. **Create the payment** with `POST /v3/payments`, `Authorization: Bearer <secret key>`, body `tx_ref`, `amount`, `currency`, `redirect_url`, `customer.email` (required), optional `customer.name`, `customer.phonenumber`, `payment_options`, `meta` (put your order id here). Shapes in `references/api.md`.
2. **Redirect handler**: read `transaction_id` from the query, call verify by id, apply ground rule 4, then show the stored status. A `status=cancelled` or `failed` redirect has nothing to verify; show the failure and offer a retry with a new `tx_ref`.
3. **Webhook endpoint**: follow `references/webhooks.md`. Compare the `verif-hash` header to your stored secret hash in constant time, return `200` fast, then verify by `data.id` before fulfilling.
4. **Mobile money direct charges**: follow the per-country notes in `references/api.md`. A `"success"` response with "Charge initiated" means the prompt was sent, not that money moved. Ghana returns `meta.authorization.mode: "redirect"`; send the customer to `meta.authorization.redirect`.
5. **Reconcile pending payments**: a background job verifies payments still `pending` after a few minutes (verify by id if you have it; otherwise look up by `tx_ref` using the endpoint the current docs give) and times out stale ones.
6. **Persist** per payment: `tx_ref`, order id, expected amount (minor units) and currency, Flutterwave transaction `id`, `flw_ref`, status, payment type, failure reason, timestamps.

## Reviewing an existing integration

Check every ground rule, then look for:

- Fulfilment in the redirect handler based on `status=successful` in the query string, without a verify call.
- Verify result trusted without comparing `amount`, `currency` and `tx_ref` to the stored order.
- Webhook with no `verif-hash` check, or a check with `==` against a hard-coded value in source.
- Webhook doing the verify and fulfilment inline before responding, so slow calls cause retries.
- `tx_ref` reused across attempts, or generated on the client.
- Amounts multiplied by 100 (Paystack habit) or computed with floats.
- Secret key in a `NEXT_PUBLIC_`/`VITE_` variable or committed to the repo.
- No handling for `failed`, `cancelled` or a charge that stays `pending`.

## Stop and ask the user

- Before building a raw card form (encryption plus PCI scope).
- Which countries and currencies they sell in; payment methods differ per country.
- Whether refunds or payouts (transfers) are in scope; they are separate APIs with their own approvals.

## Before you finish

Flutterwave's docs at developer.flutterwave.com are the final word on field names and versions; confirm them when writing new code. Then test in test mode: a successful payment, a declined card, a cancelled checkout, a mobile money charge that times out, the same webhook delivered twice (fulfils once), a webhook with a wrong `verif-hash` (rejected), and a tampered redirect URL (`status=successful` with a failed transaction id must not fulfil).
