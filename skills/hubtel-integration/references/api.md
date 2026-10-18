# Hubtel API shapes used by this skill

Payments (Sales) auth: `Authorization: Basic base64(API ID:API Key)`. SMS auth: `Authorization: Basic base64(ClientID:ClientSecret)`. Send `Content-Type: application/json`. All payment hosts only answer whitelisted IPs (max 4 per service).

Confirm fields against developers.hubtel.com before shipping; this is a working summary.

## Online Checkout

`POST https://payproxyapi.hubtel.com/items/initiate`

```json
{
  "totalAmount": 25.50,
  "description": "Order 8F2C1A",
  "callbackUrl": "https://api.example.com/hooks/hubtel/checkout",
  "returnUrl": "https://app.example.com/pay/return",
  "cancellationUrl": "https://app.example.com/pay/cancelled",
  "merchantAccountNumber": "<Collection Account Number>",
  "clientReference": "ord8f2c1aA1",
  "payeeName": "Ama Mensah",
  "payeeMobileNumber": "233241234567",
  "payeeEmail": "ama@example.com"
}
```

All fields above are mandatory except the `payee*` ones. `clientReference` max 32 characters. Response: `responseCode` `"0000"` (accepted), `data.checkoutUrl` (redirect), `data.checkoutDirectUrl` (onsite iframe), `data.checkoutId`, `data.clientReference`. The return URL is display only; fulfilment waits for the callback plus status check.

Checkout callback source IP to allow-list (optional extra layer, confirm the current value in Hubtel's docs because it can change): `108.129.40.25`.

## Direct Receive Money

`POST https://rmp.hubtel.com/merchantaccount/merchants/{Collection_Account_Number}/receive/mobilemoney`

```json
{
  "CustomerName": "Ama Mensah",
  "CustomerMsisdn": "233241234567",
  "CustomerEmail": "ama@example.com",
  "Channel": "mtn-gh",
  "Amount": 25.50,
  "PrimaryCallbackURL": "https://api.example.com/hooks/hubtel/receive",
  "Description": "Order 8F2C1A",
  "ClientReference": "ord8f2c1aA1"
}
```

| Channel | Network |
|---|---|
| `mtn-gh` | MTN Ghana |
| `vodafone-gh` | Telecel Ghana |
| `tigo-gh` | AirtelTigo |

`CustomerMsisdn` in international format (`233...`) and on the network named by `Channel`. `ClientReference` max 36 characters. Response: `ResponseCode` `"0001"` (pending, callback follows), `Data.TransactionId`, `Data.Amount`, `Data.Charges`, `Data.AmountAfterCharges`, `Data.AmountCharged`. The final state usually arrives within about 30 seconds.

Receive Money callback source IP to allow-list (optional extra layer, confirm the current value in Hubtel's docs): `18.202.122.131`.

## Transaction Status Check

`GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status?clientReference=ord8f2c1aA1`

Also accepts `hubtelTransactionId` or `networkTransactionId`; prefer `clientReference`. Response `data`: `status` (`Paid`, `Unpaid`, `Refunded`), `amount`, `charges`, `amountAfterCharges`, `transactionId`, `externalTransactionId`, `paymentMethod`, `clientReference`, `date`.

## Response codes

| Code | Meaning | Action |
|---|---|---|
| `0000` | Success (in a callback: paid; on checkout initiate: accepted) | Confirm with status check, then fulfil |
| `0001` | Accepted, pending | Wait for callback; status-check after 5 minutes |
| `0005` | HTTP failure reaching the payment partner; state unknown | Don't retry with a new reference; contact Hubtel to confirm |
| `2001` | Customer or telco failure (insufficient funds, wrong PIN, USSD timeout, number not on channel, special characters in description) | Mark failed; let the customer retry with a new reference |
| `4000` | Validation error | Fix the request |
| `4070` | Fees not set or amount below minimum | Contact Hubtel account manager |

## SMS

`POST https://sms.hubtel.com/v1/messages/send` with `{ "From": "MyBrand", "To": "233241234567", "Content": "Your order 8F2C1A is paid." }`. `From` is the sender ID, max 11 characters. Batch: `POST /v1/messages/batch/simple/send` (`Recipients` array) or `/v1/messages/batch/personalized/send`. Status: `GET /v1/messages/{messageId}` or `/v1/messages/batch/{batchId}`; statuses include `Delivered`, `Sent`, `Pending`, `Blacklisted`, `Undeliverable`, `Rejected`. A `GET` send variant takes `clientid` and `clientsecret` in the query string; avoid it, because URLs end up in logs.

## Status check client (TypeScript)

```ts
const auth = 'Basic ' + Buffer.from(`${process.env.HUBTEL_API_ID}:${process.env.HUBTEL_API_KEY}`).toString('base64');

export async function hubtelIsPaid(clientReference: string, expectedPesewas: number) {
  const acct = process.env.HUBTEL_COLLECTION_ACCOUNT!;
  const url = `https://api-txnstatus.hubtel.com/transactions/${acct}/status?clientReference=${encodeURIComponent(clientReference)}`;
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (res.status === 403) throw new Error('Hubtel 403: server IP is not whitelisted');
  if (!res.ok) throw new Error(`Hubtel status check failed: ${res.status}`);
  const { data } = await res.json();
  return data?.status === 'Paid' && Math.round(Number(data.amount) * 100) === expectedPesewas;
}
```
