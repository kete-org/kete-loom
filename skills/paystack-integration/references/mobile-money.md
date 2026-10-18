# Ghana mobile money with Paystack

Two ways to accept mobile money:

1. **Standard checkout** (simplest): initialise a transaction with `currency: "GHS"`, and optionally `channels: ["mobile_money"]`. The customer picks the network and approves on their phone. Fulfil from the webhook as usual.
2. **Charge API** (your own UI): `POST https://api.paystack.co/charge` with your secret key.

## Charge API request

```json
{
  "email": "customer@example.com",
  "amount": 2550,
  "currency": "GHS",
  "reference": "ord_8f2c1a",
  "mobile_money": {
    "phone": "0551234987",
    "provider": "mtn"
  }
}
```

Provider codes for Ghana:

| Code | Network |
|---|---|
| `mtn` | MTN Mobile Money |
| `vod` | Telecel Cash |
| `atl` | AT Money / Airtel Money |

`amount` is in pesewas (`2550` = GHS 25.50).

## Pending flow

1. The response usually has `data.status: "pay_offline"` and a `data.display_text`. Show that text to the customer ("Approve the prompt on your phone...").
2. The customer has about **180 seconds** to approve on their handset; the networks set this limit.
3. Wait for the `charge.success` webhook. Do not fulfil on the initial response.
4. If no webhook arrives within ~180 seconds, call `GET /transaction/verify/:reference`. A failure reason is in `data.message`. Let the customer retry with a **new** reference.

Other statuses you may see on the charge response include `send_otp` and `pending`; follow the `display_text` and the Charge API docs for the submit endpoint each one requires.

## UX notes

- Validate the phone number format before calling the API, and make sure the chosen provider matches the number's network.
- Show a countdown and a "Check status" button rather than polling Paystack aggressively.
- Make clear that the customer must approve on their phone, and that no PIN is ever entered in your app.

## Testing

Use test keys and the mobile money test numbers on Paystack's Test Payments page. Cover approved, declined and timed-out approvals.
