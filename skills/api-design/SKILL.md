---
name: api-design
description: HTTP API contract design covering resource modelling, REST versus RPC-style endpoints, status codes and RFC 9457 problem details, cursor pagination, filtering, versioning and deprecation headers, Idempotency-Key retries, OpenAPI-first contracts, and when GraphQL is worth it. Use when designing a new HTTP or GraphQL API, adding endpoints to an existing one, reviewing an API contract or OpenAPI file before it ships, or planning a breaking change.
license: MIT
compatibility: Any Agent Skills host. Language and framework neutral; examples are HTTP and OpenAPI YAML.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# API design

Design the contract first, then the code. A published API is a promise: every field, status code and default you ship is something a client will depend on.

## Before you design

1. Find what already exists: search the codebase for an OpenAPI/Swagger file, GraphQL schema, route definitions and an existing error format. **Match the house conventions** (casing, error shape, pagination style) even where this skill would choose differently; consistency beats local perfection.
2. Name the consumers: browser app, mobile app (slow to update, so breaking changes hurt for months), partners, internal services.
3. **Stop and ask the user** when you don't know: who the clients are, whether the API is public or internal, the auth model, or whether a breaking change is acceptable.

## Choose the style

| Situation | Choose |
|---|---|
| CRUD-ish domain, many clients, caching matters | REST (resources + HTTP methods) |
| Actions that don't map to a resource (`send`, `recalculate`) | REST with a sub-resource or action resource (`POST /invoices/{id}/send`), not a verb in every path |
| Internal service-to-service, strict schemas, streaming | gRPC or another RPC framework |
| Many client shapes over a graph of data, one team owns the schema | GraphQL, if you accept the costs below |

GraphQL costs: HTTP caching mostly lost, query cost limits and depth limits needed, N+1 resolvers (needs batching such as DataLoader), errors returned with `200`, and authorization per field. Don't choose it only to avoid writing endpoints.

## Resource modelling (REST)

1. Nouns, plural, lowercase, hyphenated: `/orders`, `/orders/{orderId}/line-items`. Nest at most one level; beyond that, link by id.
2. Methods mean what HTTP says: `GET` safe, `PUT` and `DELETE` idempotent, `PATCH` partial update, `POST` create or action.
3. IDs are opaque strings to clients. Never expose auto-increment IDs on public APIs if enumeration matters.
4. One casing for JSON fields across the whole API (pick `camelCase` or `snake_case`, match what exists).
5. Timestamps in RFC 3339 / ISO 8601 UTC (`2026-03-01T12:00:00Z`). Money as integer minor units plus a currency code, or a decimal string; never a float.
6. Return the created resource and `Location` header on `201`. Return `204` only when there is truly nothing to say.
7. Design for additive change: clients must ignore unknown fields, and enums must tolerate new values.

## Errors

- Use the status code that matches the failure (table in `references/conventions.md`). `400` malformed, `401` unauthenticated, `403` not allowed, `404` not found (also for "exists but you can't see it"), `409` conflict, `422` validation, `429` rate limited, `5xx` server fault.
- Body uses **Problem Details (RFC 9457)** with `Content-Type: application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, plus extension members such as `errors` for field-level validation.
- Never leak stack traces, SQL or internal hostnames in `detail`.
- Error `type` URIs and machine-readable codes are part of the contract. Clients branch on them, not on `detail` text.

## Pagination, filtering, sorting

1. Default to **cursor pagination** for anything that grows: `?limit=50&cursor=<opaque>`, respond with `next_cursor` (null at the end). Offset pagination is fine for small, stable admin lists.
2. Always enforce a maximum `limit`, and a default when it is absent.
3. Cursors are opaque (encode the sort key and id); never let clients build them.
4. Filtering via plain query params (`?status=paid&created_after=...`). Sorting via `?sort=-created_at,id`, always with a unique tiebreaker so pages are stable.
5. Only add filters someone needs. Each one is an index and a promise.

## Idempotency and concurrency

- Make retryable `POST`s safe with an `Idempotency-Key` request header: store key + request fingerprint + response for a retention window; replay the stored response on a repeat; return `422` or `409` if the same key arrives with a different body. Required for payments and anything that sends messages or moves money.
- Prevent lost updates with `ETag` + `If-Match` on `PUT`/`PATCH`; return `412 Precondition Failed` on mismatch.
- Rate limit with `429` and a `Retry-After` header.

## Versioning and deprecation

1. Prefer evolving one version additively. A breaking change is: removing or renaming a field, changing a type or meaning, adding a required input, tightening validation, changing a default or status code.
2. When you must break, pick one scheme and keep it: URL major version (`/v2/...`, simplest for public APIs) or a header/media-type version. Don't mix.
3. Deprecate before removing: announce, send the `Deprecation` header (RFC 9745) and a `Sunset` header (RFC 8594) with the removal date, and a `Link` with `rel="deprecation"` to the migration guide. Measure usage before switching off.
4. **Stop and ask** before shipping any breaking change to a public or mobile-facing API.

## OpenAPI contract

1. Write or update the OpenAPI document (3.1 or later; 3.2 was published in September 2025, so check what your generators and linters support before adopting it) **before** the handler code, and review it as the source of truth.
2. Every operation has an `operationId`, request/response schemas under `components/schemas`, and documented error responses using a shared problem-details schema.
3. Lint it (for example Spectral or Redocly CLI, whichever the repo already uses) and validate requests/responses against it in tests where possible.
4. See `references/conventions.md` for a skeleton.

## Misuse resistance

Make the easy way the safe way. Check every option, parameter and config key the API exposes:

1. **Callers never pick security mechanisms.** Algorithms, modes and key sizes are fixed by the server, never read from the request or the token: verify a JWT against an allow-list of algorithms you configured, never the `alg` in its header; no `cipher`, `hash` or `verify_ssl` parameter on a public endpoint.
2. **Defaults are the safe choice.** Omitting an option gives the strict behaviour: TLS verification on, access private, validation on, the smallest scope. Unsafe behaviour needs an explicit, loudly named opt-in (`allowInsecure`, not `mode: 2`).
3. **Reject dangerous combinations at load.** Config that is unsafe together (CORS that reflects any `Origin` while allowing credentials, auth disabled outside a dev environment, a webhook endpoint with no signing secret) fails at startup with a clear error, not at the first request.
4. **"It's documented" is not a mitigation.** If a parameter is easy to misuse, change the design: split it into two operations, remove the option, or make the safe path the only one. Record any footgun you can't remove under Open questions.

## Never

- Verbs in resource paths (`/getUser`), or `200` with `{"error": ...}` on REST endpoints.
- Unbounded list endpoints.
- Accepting a price, role or owner id from the client when the server can derive it.
- Silent breaking changes in a "minor" release.

## Report back

When you design or review an API, return:

```
Style: REST | RPC | GraphQL, and why (one line)
Endpoints: METHOD path → status codes (one line each)
Contract file: path to OpenAPI/schema written or changed
Breaking changes: none | list
Misuse resistance: footguns found and how each is closed, or none
Open questions: what the user must decide
```
