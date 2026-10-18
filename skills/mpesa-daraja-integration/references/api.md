# Daraja API shapes used by this skill

Base URLs: sandbox `https://sandbox.safaricom.co.ke`, production `https://api.safaricom.co.ke`. Every call except the token call sends `Authorization: Bearer <token>` and `Content-Type: application/json` (a missing content type gives "Bad Request - Invalid BusinessShortCode").

Confirm fields against developer.safaricom.co.ke before shipping; this is a working summary.

## Access token

`GET /oauth/v1/generate?grant_type=client_credentials` with `Authorization: Basic base64(consumerKey:consumerSecret)`.

Response: `{ "access_token": "...", "expires_in": "3599" }`. `404.001.03 Invalid Access Token` means expired or from the wrong app.

## STK Push (M-Pesa Express)

`POST /mpesa/stkpush/v1/processrequest`

```json
{
  "BusinessShortCode": "174379",
  "Password": "<base64(BusinessShortCode + Passkey + Timestamp)>",
  "Timestamp": "20260618092408",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "150",
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://api.example.com/hooks/daraja/stk/<per-payment-token>",
  "AccountReference": "ORD8F2C1A",
  "TransactionDesc": "Order"
}
```

Response: `MerchantRequestID`, `CheckoutRequestID`, `ResponseCode` (`"0"` = accepted), `ResponseDescription`, `CustomerMessage`.

Limits from the Daraja FAQ: minimum KES 1, up to KES 250,000 per transaction, daily KES 500,000. Only one prompt can be live per subscriber; "Unable to lock subscriber" means wait about a minute.

## STK Push Query

`POST /mpesa/stkpushquery/v1/query`

```json
{ "BusinessShortCode": "174379", "Password": "<fresh>", "Timestamp": "<fresh>", "CheckoutRequestID": "ws_CO_..." }
```

Response has `ResultCode` and `ResultDesc`. `ResultCode` `"0"` = paid. While the customer has not answered, the query returns an error rather than a final code; retry with backoff.

## Result codes (STK)

| Code | Meaning |
|---|---|
| 0 | Paid |
| 1 | Insufficient balance |
| 17 | Same amount to same customer within 2 minutes |
| 1019 | Transaction expired |
| 1025 | Push failed (prompt over 182 characters; shorten AccountReference) |
| 1032 | Cancelled by user |
| 1037 | Phone unreachable |
| 2001 | Wrong PIN |
| 2028 | TransactionType / PartyB don't match the shortcode type |

## C2B register URLs

`POST /mpesa/c2b/v2/registerurl`

```json
{ "ShortCode": "600638", "ResponseType": "Completed", "ConfirmationURL": "https://api.example.com/hooks/daraja/c2b/confirm", "ValidationURL": "https://api.example.com/hooks/daraja/c2b/validate" }
```

`ResponseType` (`Completed` or `Cancelled`) is what M-Pesa does when your validation URL is unreachable. In production, registration is one-time; change URLs by deleting them in the URL management self-service and re-registering. Sandbox has `/mpesa/c2b/v2/simulate` for test payments.

## B2C payment

`POST /mpesa/b2c/v3/paymentrequest`

```json
{
  "OriginatorConversationID": "payout_7d1e9b",
  "InitiatorName": "apiop",
  "SecurityCredential": "<RSA-encrypt(initiator password, Safaricom cert) as base64>",
  "CommandID": "BusinessPayment",
  "Amount": "500",
  "PartyA": "600997",
  "PartyB": "254712345678",
  "Remarks": "Refund ORD8F2C1A",
  "QueueTimeOutURL": "https://api.example.com/hooks/daraja/b2c/timeout/<token>",
  "ResultURL": "https://api.example.com/hooks/daraja/b2c/result/<token>",
  "Occassion": "Refund"
}
```

`CommandID`: `BusinessPayment`, `SalaryPayment` or `PromotionPayment`. Note the API's spelling `Occassion`. The sandbox and production certificates differ. The response (`ConversationID`, `OriginatorConversationID`, `ResponseCode`) only means accepted; the outcome is the `Result` posted to `ResultURL` (`ResultCode`, `TransactionID`, `ResultParameters.ResultParameter[]`).

## Password and timestamp (TypeScript)

```ts
export function stkPassword(shortCode: string, passkey: string, now = new Date()) {
  // Daraja expects Kenyan time (EAT, UTC+3), formatted YYYYMMDDHHmmss
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const timestamp = eat.slice(0, 19).replace(/[-T:]/g, '');
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
  return { timestamp, password };
}
```
