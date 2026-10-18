# Xero Accounting API

Check developer.xero.com for current details, especially scopes, which changed in 2026. Facts below were checked in October 2026 against Xero's [token types](https://developer.xero.com/documentation/guides/oauth2/token-types/), [scopes](https://developer.xero.com/documentation/guides/oauth2/scopes/), [granular scopes FAQ](https://developer.xero.com/faq/granular-scopes), [limits](https://developer.xero.com/documentation/guides/oauth2/limits/), [idempotency](https://developer.xero.com/documentation/guides/idempotent-requests/idempotency/), [troubleshooting](https://developer.xero.com/documentation/guides/oauth2/troubleshooting/) and [webhooks](https://developer.xero.com/documentation/guides/webhooks/overview/) pages.

## OAuth 2.0

- Authorise: `https://login.xero.com/identity/connect/authorize` with `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`.
- Token exchange and refresh: `POST https://identity.xero.com/connect/token`.
- Include `offline_access` to get a refresh token. Access tokens last up to 30 minutes. Refresh tokens are valid for up to 60 days and rotate on every use; always store the newest one. If you lose the response, the previous refresh token still works for a 30-minute grace period, then the user must re-authorise.
- After authorising, `GET https://api.xero.com/connections` lists the tenants the user connected. Store each `tenantId`; send it as `xero-tenant-id` on every API call. A user can connect several organisations.
- **Scopes**: apps created on or after 2 March 2026 use granular scopes (for example `accounting.invoices` instead of the broad `accounting.transactions`). Older apps can request granular scopes from April 2026 and can keep broad scopes until September 2027; existing tokens only gain new scopes when the user re-authorises. Calling an endpoint without the needed scope returns `401` with a `WWW-Authenticate` header naming `insufficient_scope`.

## Base URL

`https://api.xero.com/api.xro/2.0/...` with `Authorization: Bearer <token>`, `xero-tenant-id`, `Accept: application/json`.

## Core endpoints

| Need | Endpoint |
|---|---|
| Accounts | `GET /Accounts` (use `Code` or `AccountID`; check `Status` is `ACTIVE`) |
| Tax rates | `GET /TaxRates` (`TaxType` values go on lines) |
| Items | `GET/POST /Items` |
| Contacts | `GET/POST /Contacts` (search by `ContactNumber` or email before creating) |
| Invoices | `POST /Invoices` (create or update) with `Type: "ACCREC"`, `Contact.ContactID`, `Date`, `DueDate`, `InvoiceNumber`, `LineAmountTypes` (`Exclusive`, `Inclusive`, `NoTax`), `LineItems[]` (`Description`, `Quantity`, `UnitAmount`, `AccountCode`, `TaxType`, optionally `TaxAmount`), `Status` (`DRAFT`, `SUBMITTED`, `AUTHORISED`), `CurrencyCode` |
| Payments | `PUT /Payments` with `Invoice.InvoiceID`, `Account.Code` or `AccountID` (a bank account or one with payments enabled), `Amount`, `Date` |
| Credit notes | `POST /CreditNotes` with `Type: "ACCRECCREDIT"`; allocate to an invoice with `PUT /CreditNotes/{id}/Allocations` |
| Changes since | `If-Modified-Since` header on list endpoints, plus `where` filters and paging |

Send several records in one request where the endpoint accepts an array; add `?SummarizeErrors=false` to get a status and validation errors per record instead of failing the whole batch. List endpoints page with `?page=` and `pageSize` (default 100, maximum 1000). Some changes (for example `DueDate` or `SentToContact` on paid transactions) don't update `UpdatedDateUTC`, so `If-Modified-Since` can miss them.

## Idempotency

Send an `Idempotency-Key` header (at most 128 characters) on `POST`, `PUT` and `PATCH`; other methods ignore it. Use a deterministic key per logical operation and keep it for retries. Xero keeps keys for only 6 minutes, and reusing a key with a different request returns `400`, so for retries after that window rely on the stored remote ID check, not the key.

## Rate limits

Per tenant: 5 concurrent calls, 60 calls per minute, and a daily limit of 1,000 calls on the starter tier or 5,000 on higher tiers; plus an app-wide limit of 10,000 calls per minute across all tenants. Responses include `X-DayLimit-Remaining`, `X-MinLimit-Remaining` and `X-AppMinLimit-Remaining`. A `429` carries `X-Rate-Limit-Problem` naming the limit hit, and `Retry-After` (seconds) when the minute or daily limit was exceeded.

## Webhooks

- Configure in the developer portal; it gives a webhook key.
- Verify: HMAC-SHA256 of the raw request body keyed with the webhook key, base64-encoded, compared in constant time to the `x-xero-signature` header. Return a `2xx` for a valid signature and `401` for an invalid one, over HTTPS on port 443, within 5 seconds, with no cookies in the response.
- "Intent to receive": when you set up the endpoint, Xero sends test requests, some with bad signatures, and only activates the webhook if you answer correctly. Process events asynchronously. Xero retries failed deliveries and disables the webhook after 24 hours of failures.
- Events carry `resourceId`, `eventCategory` (for example `INVOICE`, `CONTACT`), `eventType` and `tenantId`. Fetch the resource by ID; don't trust the payload as data.
