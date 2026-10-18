# QuickBooks Online Accounting API

Check developer.intuit.com for current details; Intuit changes OAuth policy and webhook formats from time to time. Facts below were checked against Intuit's docs in October 2026: [OAuth 2.0 setup](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0), [minor versions](https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/minor-versions), [limits and throttles](https://static.developer.intuit.com/output_html/qbo/docs/learn/limits-and-throttles.html), [change data capture](https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/change-data-capture), [configure webhooks](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/configure-webhooks) and the [release notes](https://developer.intuit.com/app/developer/qbo/docs/release-notes/general-release-notes).

## OAuth 2.0

- Authorise: `https://appcenter.intuit.com/connect/oauth2` with `client_id`, `response_type=code`, `scope=com.intuit.quickbooks.accounting`, `redirect_uri`, `state`.
- Token exchange and refresh: `POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` (Basic auth with client ID and secret).
- The callback receives `code`, `state` and `realmId`. Store `realmId` with the tokens.
- Access tokens last one hour (`expires_in` starts at 3600). Refresh tokens have a rolling 100-day expiry, the value can change on any refresh, and they now have a maximum lifetime of five years; the token response reports the remaining time in `x_refresh_token_expires_in` and `x_refresh_token_hard_expires_in` (seconds). Always store the refresh token returned by the latest refresh, and plan a reconnect before the hard expiry. The developer portal has a reconnect URL field for when users must re-authorise.

## Base URLs

- Production: `https://quickbooks.api.intuit.com/v3/company/{realmId}/...`
- Sandbox: `https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/...`
- Send `Accept: application/json`. Support for minor versions 1–74 ended on 1 Aug 2025; a `minorversion` below 75, or none, is answered as minor version 75. Pin `minorversion` explicitly and test before raising it.

## Core entities

| Need | Entity / endpoint |
|---|---|
| Accounts | `Account` via `GET /query?query=select * from Account where Active = true` |
| Products and services | `Item` (each links to an income account) |
| Tax | `TaxCode`, `TaxRate` (behaviour differs between US and non-US companies) |
| Customers | `Customer` |
| Invoices | `POST /invoice` with `CustomerRef`, `Line[]` (`DetailType: SalesItemLineDetail`, `SalesItemLineDetail.ItemRef`, `Amount`), `DocNumber`, `TxnDate`, `CurrencyRef` |
| Payments | `POST /payment` with `CustomerRef`, `TotalAmt`, `Line[].LinkedTxn[{ TxnId, TxnType: "Invoice" }]`, `DepositToAccountRef` |
| Credit notes | `CreditMemo`; refunds `RefundReceipt` |
| Changes since | `GET /cdc?entities=Invoice,Payment&changedSince=<ISO time>` (look-back limited to 30 days; use `/query` for older ranges) |
| Batch | `POST /batch` with several operations in one request (Intuit's batch page says up to 10 payloads; its limits page recommends at most 30; keep batches small) |

Updates: send `Id` and the current `SyncToken`; add `"sparse": true` to change only the fields you send. A stale `SyncToken` returns a stale object error.

## Idempotency

Add `?requestid=<unique id>` to write requests. A repeat with the same `requestid` for the same company returns the original response instead of creating a duplicate. Use a deterministic ID per logical operation, unique per company. Maximum length is 50 characters (36 for batch requests), so hash long keys. Intuit does not publish how long it remembers a request ID, so also check for the remote record before retrying a create.

## Rate limits

Intuit documents 500 requests per minute per realm ID and 10 requests per second per realm ID and app; batch calls are throttled at 40 per minute per realm ID and app. Requests taking over 120 seconds time out. On `429`, Intuit says to wait 60 seconds before retrying; retry with the same `requestid`.

## Webhooks

- Configure the endpoint and entities in the developer portal; it shows a verifier token per environment.
- Verify: HMAC-SHA256 of the raw request body keyed with the verifier token, base64-encoded, compared in constant time to the `intuit-signature` header. Reject if the header is missing or the token is unset.
- Payloads now use the CloudEvents format: a JSON array of events, each with `type` (for example `qbo.invoice.created.v1`), `intuitentityid` and `intuitaccountid` (the realm ID). One notification can carry events for several companies, so route each event by its realm. The legacy format's retirement date moved more than once; check Intuit's current webhook docs if you still receive the old shape.
- Payloads carry entity types, IDs and operations, not the record. Fetch the entity, or use CDC, to get the data.
- Respond quickly with `200` and process asynchronously; also run CDC periodically, because webhooks can be missed.
