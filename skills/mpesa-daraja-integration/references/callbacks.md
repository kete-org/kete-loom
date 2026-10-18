# Daraja callbacks

None of these are signed. Treat every body as untrusted: match it to a record you created, then confirm with a query before giving value.

## STK Push callback

`POST` to your `CallBackURL`:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1.0 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191219102115 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```

A failed or cancelled payment has `ResultCode` other than `0` and no `CallbackMetadata`. Read items by `Name`, not by position; `Balance` sometimes appears and shifts the order.

### Handler rules

1. Check the per-payment token in the path, then find the pending payment by `CheckoutRequestID`. Unknown → log and return 200; never create an order from a callback.
2. Respond `200` with `{ "ResultCode": 0, "ResultDesc": "Accepted" }` quickly and queue the work.
3. In the worker: if `ResultCode !== 0`, mark failed with the code. If `0`, run STK Push Query; fulfil only if the query says `0` **and** `Amount` equals the stored amount. Guarded update on status, unique `MpesaReceiptNumber`.

```ts
app.post('/hooks/daraja/stk/:token', express.json(), async (req, res) => {
  const cb = req.body?.Body?.stkCallback;
  const payment = cb && (await payments.findPending(cb.CheckoutRequestID, req.params.token));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (payment) await queue.add('daraja-confirm', { checkoutRequestId: cb.CheckoutRequestID, resultCode: cb.ResultCode });
});
```

## C2B validation and confirmation

Both URLs receive the same shape:

```json
{
  "TransactionType": "Pay Bill",
  "TransID": "RKTQDM7W6S",
  "TransTime": "20191122063845",
  "TransAmount": "10",
  "BusinessShortCode": "600638",
  "BillRefNumber": "invoice008",
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "MSISDN": "25470****149",
  "FirstName": "John",
  "MiddleName": "",
  "LastName": "Doe"
}
```

- **Validation** (only if Safaricom enabled external validation on your shortcode): reply `{ "ResultCode": "0", "ResultDesc": "Accepted" }` to accept, or `{ "ResultCode": "C2B00012", "ResultDesc": "Rejected" }` to reject (`C2B00011` invalid MSISDN, `C2B00012` invalid account number, `C2B00013` invalid amount, `C2B00014` invalid KYC, `C2B00015` invalid shortcode, `C2B00016` other). Reply fast; if it is unreachable M-Pesa applies the registered `ResponseType`.
- **Confirmation**: the payment is complete. Dedupe on `TransID`, match `BillRefNumber` to an open invoice, compare `TransAmount`, and park anything that doesn't match for manual review instead of dropping it: the customer's money has already moved. `MSISDN` may be masked or hashed, so don't rely on it to identify the payer.

## B2C result

`POST` to `ResultURL` with `{ "Result": { "ResultType", "ResultCode", "ResultDesc", "OriginatorConversationID", "ConversationID", "TransactionID", "ResultParameters": { "ResultParameter": [ { "Key", "Value" } ] } } }`. Match on `OriginatorConversationID`. `ResultCode` `0` = paid. A post to `QueueTimeOutURL` means the outcome is unknown: run Transaction Status (`/mpesa/transactionstatus/v1/query`) before any retry.
