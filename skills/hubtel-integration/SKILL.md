---
name: hubtel-integration
description: Guides Ghana-focused Hubtel merchant integrations end to end, from Online Checkout (redirect or onsite iframe) and Direct Receive Money prompts on MTN, Telecel and AirtelTigo wallets to callback handling, the mandatory Transaction Status Check, Basic auth with API ID and key, the 4-IP whitelist, and sending SMS through the Hubtel SMS API. Use when accepting payments into a Hubtel Merchant Account, wiring a Hubtel callback or status check, fixing a Hubtel 403 or 4000 response, or sending transactional SMS through Hubtel.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to Hubtel's API hosts from a whitelisted server IP. Examples are TypeScript (Node 18+); the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Hubtel integration

Accept payments into a Hubtel Merchant Account so that a fake callback can't mark an order paid, a missing callback still settles, and a `clientReference` is never charged twice. Also covers sending SMS. If the project takes Ghana payments through Paystack or calls MTN MoMo directly, follow that skill instead.

## Ground rules

1. **Credentials stay on the server.** Sales (payments) use `Authorization: Basic base64(API ID:API Key)`; SMS uses `base64(ClientID:ClientSecret)`. Read both from the environment. They are different credential pairs.
2. **Calls only work from whitelisted IPs.** Share your server's public egress IP with your Hubtel Retail Systems Engineer. Hubtel allows at most 4 IPs per service; anything else gets `403 Forbidden` or a timeout. Serverless functions with changing IPs need a fixed-egress proxy or NAT.
3. **Your Collection Account Number is in the URL or body** of every payment and status call. It identifies your merchant account; keep it in config, not code.
4. **One unique `clientReference` per attempt, stored first.** Hubtel says it must never be duplicated. Max 32 characters for Online Checkout, 36 for Direct Receive Money; use alphanumerics.
5. **The server sets the amount.** `totalAmount` / `Amount` are decimals in cedis with at most 2 decimal places. Keep integer pesewas in your database and format at the boundary (`(pesewas / 100).toFixed(2)`), never compute with floats.
6. **Callbacks are not signed.** Use them as a trigger only. Confirm with the Transaction Status Check, and give value only when `status` is `Paid` and the amount equals what you stored. Hubtel publishes a callback source IP per product that you can allow-list (see `references/api.md`).
7. **Status check is mandatory when no callback arrives.** Hubtel's docs require it for any transaction with no final callback after 5 minutes. Run it from a background job.
8. **Prevent unsolicited prompts.** For Direct Receive Money, Hubtel requires that customers can't freely type any number: either lock the number to a verified account or send an OTP to the number first.

## Choose the flow

| Need | Use |
|---|---|
| Hosted page with mobile money, card, Hubtel/G-Money wallet and GhQR | Online Checkout: `POST https://payproxyapi.hubtel.com/items/initiate`, redirect to `checkoutUrl` or embed `checkoutDirectUrl` in an iframe |
| Prompt a wallet from your own UI | Direct Receive Money: `POST https://rmp.hubtel.com/merchantaccount/merchants/{Collection_Account_Number}/receive/mobilemoney` with `Channel` `mtn-gh`, `vodafone-gh` (Telecel) or `tigo-gh` (AirtelTigo) |
| Notify a customer | SMS: `POST https://sms.hubtel.com/v1/messages/send` |

## Flow

```
client ──(order id)──▶ server: create pending payment with clientReference
server ──initiate checkout or receive money──▶ Hubtel
   checkout: responseCode "0000" + checkoutUrl → redirect customer
   receive money: ResponseCode "0001" = pending, customer approves on phone
Hubtel ──POST callbackUrl / PrimaryCallbackURL──▶ server: 200 fast, queue a status check
server ──GET api-txnstatus.hubtel.com/transactions/{acct}/status?clientReference=..──▶ Paid + amount match → fulfil once
background job: status-check anything still pending after 5 minutes
```

## Implementation steps

1. **Configure**: API ID and key, Collection Account Number, callback base URL, and (for SMS) client ID, secret and an approved sender ID (max 11 characters). Confirm the server's egress IP is whitelisted before debugging anything else.
2. **Initiate** with the request bodies in `references/api.md`. `description` must not contain special characters (`&*!%@`), which Hubtel rejects.
3. **Callback endpoint**: accept `POST`, respond `200` quickly, look up the pending payment by `ClientReference` from the body, and enqueue a status check. Unknown reference → log and ignore.
4. **Status check** `GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status?clientReference=...`. Map `data.status`: `Paid` → fulfil (guarded update `WHERE status = 'pending'`), `Unpaid` → keep waiting until your timeout then mark failed, `Refunded` → reverse fulfilment.
5. **Map response codes** using `references/api.md`: `0000` success, `0001` pending, `2001` customer-side failure (insufficient funds, wrong PIN, timeout), `4000` validation error, `4070` fees not set or below minimum, `0005` unknown state (contact Hubtel; do not retry blindly).
6. **SMS**: send with Basic auth, then store `messageId` and check delivery with `GET https://sms.hubtel.com/v1/messages/{messageId}`. `Sent` is not `Delivered`.
7. **Persist** per payment: `clientReference`, order id, expected amount (pesewas), channel, phone, Hubtel `TransactionId` / `checkoutId`, `ExternalTransactionId`, charges, status, timestamps.

## Reviewing an existing integration

- Order fulfilled from the callback body, or from `0000` on the initiate response.
- No status-check job, so payments stuck in `0001` never settle.
- `clientReference` reused on retry, or longer than the limit.
- Float amounts with more than 2 decimals, or a price taken from the client.
- Sales and SMS credentials mixed up, or credentials in client code.
- Calls from an unwhitelisted host (works locally through a VPN, fails in production with 403).
- Direct Receive Money open to any typed phone number with no OTP or account lock.
- Charges ignored: `AmountAfterCharges` is what settles; reconcile on it.

## Stop and ask the user

- Whether they already have a Hubtel Merchant Account, the Collection Account Number, and a whitelisted IP. Without these nothing can be tested live.
- Which product they want (Online Checkout or Direct Receive Money) and whether Hubtel has enabled it on the account.
- Before sending bulk SMS: sender ID approval and consent for marketing messages.

## Before you finish

Hubtel's docs at developers.hubtel.com are the final word; this skill gives the rules and the shape. Then test: a paid checkout, a cancelled checkout, a wallet prompt the customer rejects, a prompt that times out, a callback that never arrives (status job settles it), the same callback twice (fulfils once), and a forged callback for a real `clientReference` while the status check says `Unpaid` (must not fulfil).
