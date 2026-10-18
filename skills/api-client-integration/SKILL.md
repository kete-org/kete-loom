---
name: api-client-integration
description: Builds a dependable client or connector for any third-party HTTP API that has no dedicated Kete Loom skill, covering API-key and OAuth 2.0 auth with single-flight token refresh, connect and read timeouts, retries with exponential backoff and jitter limited to idempotent calls or calls carrying an idempotency key, Retry-After and rate-limit headers, cursor, offset and Link-header pagination, HMAC webhook signature checks on the raw body, and recorded-response contract tests, all shaped to the integration patterns the repo already uses. Use when wiring up a new vendor or partner REST API, writing a sync job or connector against an external service, or hardening a flaky integration that times out, hits 429s or double-submits.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to the vendor; tests use the project's HTTP mocking or record/replay library.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# API client integration

Build a client for an external API that fails predictably: bounded time per call, safe retries, honest errors, no secrets in logs, and tests that run without the network.

If a provider-specific Kete Loom skill exists (for example `stripe-integration`, `paystack-integration`, `github-api-automation`, `slack-app-integration`, `jira-integration`, `accounting-api-integration`), use it for that provider; this skill is the general method. For deciding error and retry policy in your own code generally, see `error-handling-patterns`.

## 0. Read before writing

1. **Find the house pattern.** Search the codebase for existing integrations: a shared HTTP client, base class, retry helper, secrets loader, logging redaction, test fixtures or cassettes. Copy its structure, naming, config style and error types. A new integration that looks unlike the others is a defect.
2. **Read the vendor docs** for: base URLs per environment, auth method and token lifetime, rate limits and their headers, pagination style, which endpoints accept an idempotency key, error format, webhook signing, API versioning header, sandbox availability. Note the doc URL and date in a comment or the integration's README. Never invent an endpoint, header or limit; if the docs don't say, ask the user or treat it as unknown.
3. **Prefer the official SDK** if it is maintained, typed and already allowed in the project; wrap it the same way. Hand-roll only when there isn't one or it's unsuitable, and say why.
4. **Stop and ask** before adding a new dependency, before any call that creates, charges, sends or deletes in a live account, and if credentials would need to be stored somewhere new.

## 1. Shape of the client

- One module per vendor with a small interface the app calls (`getCustomer`, `listInvoices`), hiding transport details. Callers never build URLs.
- Config from the environment or the secrets manager: base URL, credentials, timeouts. Sandbox and production differ only by config.
- Map vendor responses to your own types at the boundary; validate the fields you rely on and fail loudly on schema surprises.
- Typed errors: distinguish auth (401/403), not found, validation (400/422), rate limited (429), retryable server/network (5xx, timeouts, resets) and unknown. Keep the vendor's request ID in the error.

## 2. Auth

- API keys: send in the header the vendor specifies, not in query strings (they end up in logs); if the vendor only accepts a query parameter, redact URLs before logging them.
- OAuth 2.0 client credentials or refresh tokens: cache the access token with its expiry, refresh a little before expiry, and make refresh **single-flight** so concurrent requests share one refresh. On a 401, refresh once and retry once; a second 401 is a real auth error.
- Rotating refresh tokens: persist the new refresh token atomically before using the new access token, or you lock yourself out.
- Redact `Authorization`, cookies, tokens and secrets from logs, errors and recorded fixtures.

## 3. Timeouts, retries, idempotency

Details and pseudocode: `references/resilience.md`.

- Set a connect timeout and a total/read timeout on every call (no library defaults of "forever").
- Retry only: network errors, timeouts, 429, 502, 503, 504 (and 500 if the vendor documents it as transient). Never retry 4xx validation or auth errors.
- Retry a non-idempotent call (`POST` that creates, charges or sends) **only** if it carries an idempotency key the vendor honours, reused unchanged across attempts. Otherwise surface the error and reconcile.
- Exponential backoff with full jitter, a max attempt count (3 to 5) and an overall deadline. Honour `Retry-After` (seconds or HTTP date) over your own delay.
- Respect published rate limits proactively with a client-side limiter where the vendor publishes them; read remaining-quota headers if provided.
- Add a circuit breaker or bulkhead only if the repo already has one or the user asks.

## 4. Pagination

Use the vendor's style; never assume page numbers. Cursor or `next` token: loop until it's absent. `Link: <...>; rel="next"`: follow the URL as given. Offset/limit: stop on a short page, and be aware rows can shift between pages. Expose an iterator or async generator; cap total pages for safety and log when the cap is hit.

## 5. Webhooks from the vendor

- Verify the signature on the **raw request body bytes** with the vendor's algorithm (commonly HMAC-SHA256) and a constant-time compare; reject if the header is missing.
- Check the timestamp tolerance where the vendor signs one (Standard Webhooks uses `webhook-id`, `webhook-timestamp`, `webhook-signature`).
- Deduplicate by event ID, return 2xx fast, process asynchronously, and handle out-of-order delivery by re-fetching the resource when order matters.

## 6. Tests

- Unit-test the client against recorded or hand-built responses, with the project's mock or record/replay tool (for example nock, msw, responses, respx, VCR.py, WireMock). Scrub secrets from recordings.
- Cover: success, each error class, 429 with `Retry-After`, timeout, token expiry then refresh, multi-page listing, empty page, malformed body, bad webhook signature.
- One opt-in smoke test against the sandbox, skipped unless credentials are present; never against production.

## Never

- Never log full request or response bodies containing personal data or secrets.
- Never retry in two layers (SDK and your wrapper) without knowing the combined count.
- Never swallow an error and return an empty list; that looks like "no data".
- Never hard-code a production URL or credential.

## Report

```
## Integration: <vendor> (<SDK or hand-rolled>)
Follows house pattern: <module it mirrors>
Auth: <method>, refresh: <single-flight yes/no>
Timeouts: connect <s>, total <s> | Retries: <codes>, max <n>, idempotency: <how>
Rate limits: <documented limit and handling>
Pagination: <style>
Webhooks: <verification method, dedupe> | n/a
Tests: <command> -> <result>; sandbox smoke: <ran/skipped>
Unknown from docs: <items to confirm with the vendor>
```
