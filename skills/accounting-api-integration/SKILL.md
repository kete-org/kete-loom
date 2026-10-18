---
name: accounting-api-integration
description: Connects an application's sales and payments to QuickBooks Online and Xero through their accounting APIs, handling the OAuth 2.0 authorisation code flow with rotating refresh tokens, per-company realm or tenant IDs, chart of accounts and tax code mapping, posting customers, invoices, payments and credit notes, safe retries with requestid or Idempotency-Key, HMAC-verified webhooks, 429 rate-limit backoff, and nightly reconciliation against the ledger. Use when building a QuickBooks or Xero sync, fixing duplicate or missing invoices in the books, debugging invalid_grant or token expiry, mapping products to income accounts, or reconciling app revenue with what the accountant sees.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to quickbooks.api.intuit.com (or the sandbox) and api.xero.com. Examples are HTTP and TypeScript-like pseudocode; official SDKs exist for most languages.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Accounting API integration (QuickBooks Online, Xero)

Push your app's financial events into the customer's books exactly once, mapped to accounts their accountant chose, and prove it with a reconciliation. Your app stays the source of truth for what was sold; the ledger is the source of truth for the books. API detail: `references/quickbooks.md` and `references/xero.md`.

## Ground rules

1. **One connection per company.** QuickBooks identifies a company by `realmId`; Xero by tenant ID (send `xero-tenant-id` on every call). Store tokens per connection, encrypted at rest, never in logs.
2. **Refresh tokens rotate.** Each refresh can return a new refresh token; store it atomically before using the new access token, and serialise refreshes per connection (a lock), or two workers will race and one gets `invalid_grant`. Treat `invalid_grant` as "reconnect needed": mark the connection, alert the user, stop syncing it.
3. **Accounts are mapped, never guessed.** The customer (or their accountant) maps each of your product types, discounts, fees, tax rates and payment methods to an account, item and tax code in their ledger. Store the mapping by remote ID, not name. Block syncing until it is complete.
4. **Every write is idempotent.** QuickBooks: a unique `requestid` query parameter per logical operation. Xero: an `Idempotency-Key` header. Derive the key from your own record (`invoice:<id>:create`), never a fresh random value per retry. Also store the remote ID on your record and check it before creating.
5. **Your record links to the remote record.** Keep `remote_id`, `remote_type`, last sync status and error per record, so you can resume, update and reconcile.
6. **Don't post what the ledger already has.** If the customer's payment provider has its own QuickBooks or Xero feed, agree with the user which system posts what, or invoices and payments appear twice.
7. **Rate limits are mostly per company.** Queue writes per connection, back off on `429` (honour `Retry-After` where Xero sends it; QuickBooks says wait 60 seconds), and batch where the API supports it. Xero also has an app-wide per-minute limit across all tenants.
8. **Sandbox first.** QuickBooks sandbox companies and a Xero demo company; never test against a customer's live books.

## Workflow

1. **Confirm scope with the user**: which provider(s), which objects flow (customers, invoices, payments, credit notes, refunds, fees, payouts), one-way or two-way, and start date for the backfill. Stop and ask if two-way: conflict rules are a product decision.
2. **OAuth 2.0 authorisation code flow** with a `state` value bound to the user's session, the minimum scopes, and a callback that stores tokens and the realm or tenant. Endpoints and scopes in the references.
3. **Read the chart of accounts and tax codes** and present a mapping screen. Validate mapped accounts are active and of the right type (income for sales lines, bank or undeposited funds for payments).
4. **Sync customers** (look up by your external ID or email first; create if absent).
5. **Post invoices** with lines carrying the mapped item/account and tax code, your invoice number, dates and currency. Amounts must match your invoice exactly; send line amounts and tax as computed by your billing or tax system rather than letting the ledger recompute them when the API allows it, and verify the total on the response.
6. **Post payments** linked to the invoice, into the mapped deposit account, on the actual payment date. Post refunds and credit notes as their own objects linked to the original.
7. **Webhooks** (optional, for changes made in the ledger): verify the HMAC signature on the raw body, respond fast, then fetch the changed records by ID. Payloads carry IDs, not trusted data.
8. **Reconcile nightly** (below), and surface failures to the user with the remote error message.

## Updates and conflicts

- QuickBooks updates need the current `SyncToken`; read, modify, write, and on a stale-object error re-read and retry once.
- Don't update invoices that are paid, or in a locked period: QuickBooks and Xero both support closing dates/lock dates and will reject or warn. Stop and ask the user how to handle changes to a closed period; usually a credit note in the current period.
- Deleting or voiding in the ledger is the accountant's call. Never auto-delete remote records.

## Reconciliation

For each connection, for a date range:

1. Count and sum your invoices, payments and credit notes by currency.
2. Query the same in the ledger (QuickBooks query endpoint; CDC only looks back 30 days; Xero list endpoints with `where` filters, paging and `If-Modified-Since`).
3. Match by stored remote ID; list missing-remote, missing-local, and amount or status mismatches.
4. Retry missing-remote ones idempotently; report the rest to the user. Don't "fix" amounts in the ledger automatically.

## Errors to recognise

| Symptom | Likely cause |
|---|---|
| `invalid_grant` on refresh | Refresh token already used (race), revoked, or expired; reconnect |
| `401` or `403` with a fresh token (Xero) | Missing scope (`401`, `WWW-Authenticate` names `insufficient_scope`), or `xero-tenant-id` missing, wrong or no longer authorised (`403 AuthenticationUnsuccessful`); call `/connections` to check |
| Duplicate invoices | Retry without idempotency key, or key regenerated per attempt; or the payment provider's own feed also posts |
| Total differs by a cent | Ledger recomputed tax with its own rounding; send tax explicitly or align rounding rules |
| Stale object (QuickBooks) | Old `SyncToken`; re-read and retry |
| `429` | Per-company rate limit; slow the queue for that connection |

## Never

- Never log access or refresh tokens, or webhook verifier keys.
- Never post to a ledger without a completed account mapping.
- Never create a record without first checking for an existing remote ID or idempotency key.
- Never write to a closed period or delete accountant-entered data.

## Report format

```
Connection: <provider, realm/tenant, scopes>
Objects synced: <type: direction, trigger>
Mapping: <complete | gaps listed>
Idempotency: <how keys are derived>
Reconciliation <range>: local <count/sum> vs ledger <count/sum>; mismatches <list>
Needs user/accountant decision: <list>
```
