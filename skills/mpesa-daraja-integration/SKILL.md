---
name: mpesa-daraja-integration
description: Implements and audits direct Safaricom M-Pesa integrations on the Daraja API in Kenya, including the OAuth client-credentials token, Lipa na M-Pesa Online (STK Push) with the base64 shortcode+passkey+timestamp password, stkCallback parsing, confirmation through the STK Push Query endpoint, C2B URL registration with validation and confirmation, B2C payouts with SecurityCredential, and the sandbox-to-production go-live path. Use when calling Daraja endpoints yourself rather than via Flutterwave or another aggregator, wiring an M-Pesa paybill or till into an app, or debugging Daraja errors such as invalid access token, wrong credentials or ResultCode 1032.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to sandbox.safaricom.co.ke or api.safaricom.co.ke. Examples are TypeScript (Node 18+); the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# M-Pesa Daraja integration

Build an M-Pesa flow where a forged callback can't mark an order paid, a lost callback still settles, and a payout is never sent twice. This skill is for Safaricom's Daraja API called directly. If the project collects M-Pesa through Flutterwave, Paystack or another aggregator, follow that provider's flow instead.

## Ground rules

1. **Credentials stay on the server.** Consumer key and secret, passkey, initiator name and initiator password are secrets in the environment. Sandbox and production have different keys, shortcodes, passkeys and base URLs (`https://sandbox.safaricom.co.ke` vs `https://api.safaricom.co.ke`).
2. **Cache the access token.** `GET /oauth/v1/generate?grant_type=client_credentials` with Basic auth (`consumerKey:consumerSecret`) returns a token valid for about an hour (`expires_in` 3599 or 3600). Refresh before expiry; don't request one per payment.
3. **The server sets the amount.** Daraja `Amount` is whole shillings. Compute it from your own order; never accept it from the client.
4. **`ResponseCode: "0"` means accepted, not paid.** The STK Push response only says the prompt was queued. Store `CheckoutRequestID` and `MerchantRequestID` against the order straight away.
5. **Callbacks are unsigned.** Daraja does not sign `stkCallback`, C2B or B2C results. Never give value from the callback body alone. Put an unguessable per-payment token in the callback path, match `CheckoutRequestID` to a stored pending payment, and confirm with STK Push Query (or Transaction Status) before fulfilling. If Safaricom gives you its callback IP range, allow-list it as an extra layer.
6. **Fulfilment is idempotent.** Guarded update keyed on `CheckoutRequestID` (`... WHERE status = 'pending'`), and a unique constraint on `MpesaReceiptNumber`. Callbacks, queries and retries can all arrive.
7. **Payouts are never sent blind twice.** Generate and store a unique `OriginatorConversationID` per payout before the call. Daraja is not documented to reject a repeated ID, so after a timeout or lost result check Transaction Status first and retry only when it shows the payout did not happen.

## STK Push flow

```
client ──(order id, phone 2547XXXXXXXX)──▶ server: create pending payment
server ──POST /mpesa/stkpush/v1/processrequest──▶ Daraja: ResponseCode "0", CheckoutRequestID
customer enters M-Pesa PIN on the phone
Daraja ──POST CallBackURL {Body.stkCallback}──▶ server: 200 at once, queue a check
server ──POST /mpesa/stkpushquery/v1/query──▶ ResultCode 0 + amount matches → fulfil once
background job: query payments still pending after ~1-2 minutes; expire them later
```

## Implementation steps

1. **Configure** environment variables: base URL, consumer key/secret, `BusinessShortCode`, passkey, callback base URL, and for B2C the initiator name and production certificate. Shapes and samples: `references/api.md`.
2. **Build the password**: `Timestamp` is `YYYYMMDDHHmmss` in Kenyan time (EAT, UTC+3); `Password = base64(BusinessShortCode + Passkey + Timestamp)`. Generate both per request; a stale timestamp or one in the wrong timezone causes "Wrong credentials".
3. **Send STK Push** with `TransactionType` `CustomerPayBillOnline` (paybill) or `CustomerBuyGoodsOnline` (till; then `PartyB` is the till number while `BusinessShortCode` is the store/HO number). Normalise the phone to `2547XXXXXXXX` or `2541XXXXXXXX`. `AccountReference` is at most 12 characters, `TransactionDesc` at most 13.
4. **Handle the callback** as in `references/callbacks.md`: respond quickly, match on `CheckoutRequestID`, read `ResultCode` and `CallbackMetadata`, then confirm with STK Push Query.
5. **Map result codes** to customer messages: `1032` cancelled, `1037` phone unreachable, `1` insufficient balance, `2001` wrong PIN, `1019` expired, `17` duplicate request within 2 minutes. Let the customer retry with a new STK Push.
6. **C2B (customer pays your paybill/till from their phone)**: register Confirmation and Validation URLs once with `/mpesa/c2b/v2/registerurl`; see `references/callbacks.md`. Match payments to orders by `BillRefNumber` (the account number the customer typed) and dedupe on `TransID`.
7. **B2C payouts**: `/mpesa/b2c/v3/paymentrequest` with `SecurityCredential` (initiator password RSA-encrypted with Safaricom's certificate for that environment, base64). The result arrives at `ResultURL`; a timeout at `QueueTimeOutURL`. Treat a queue timeout as unknown, not failed: check Transaction Status before retrying.
8. **Persist** per payment: order id, phone, amount, `MerchantRequestID`, `CheckoutRequestID`, `MpesaReceiptNumber`, `ResultCode`, `ResultDesc`, status, timestamps.

## Reviewing an existing integration

Check each ground rule, then look for:

- Order marked paid when the STK Push request returns `ResponseCode "0"`.
- Callback body trusted with no match to a stored `CheckoutRequestID` and no query.
- `Amount` read from `CallbackMetadata` without comparing it to the stored order amount.
- Token fetched on every request, causing spike-arrest or quota errors (`500.003.02`, `500.003.03`).
- Timestamp built from server UTC or local time instead of EAT.
- Callback URL that is not public HTTPS, uses a tunnel URL in production, or contains blocked words such as `mpesa`, `safaricom`, `sql`, `exec`, `cmd` or `query`.
- Sandbox shortcode `174379` or sandbox passkey left in production config.
- B2C retried after a timeout or missing result without a Transaction Status check first.

## Stop and ask the user

- Paybill or till, and which shortcode is used on go-live.
- Whether C2B validation is needed; it is off by default and Safaricom has to enable it.
- Before writing any B2C code: payouts move real money and need a B2C shortcode and an API initiator created on the M-Pesa org portal.

## Before you finish

Daraja's docs at developer.safaricom.co.ke are the final word on fields and endpoints; this skill gives the rules and the shape. Production endpoints and the production passkey are issued at go-live. Then test in the sandbox: a successful STK Push, a cancelled prompt (1032), a phone that never answers, a callback that never arrives (the query job must settle it), a forged callback with a known `CheckoutRequestID` but a failed query (must not fulfil), and the same callback twice.
