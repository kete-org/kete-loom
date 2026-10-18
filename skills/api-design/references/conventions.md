# API conventions reference

Read this when choosing a status code, writing an error body, or starting an OpenAPI file.

## Status codes

| Code | Use for |
|---|---|
| 200 OK | Successful read, or update that returns the resource |
| 201 Created | Resource created; include `Location` and the body |
| 202 Accepted | Work queued; return a status resource to poll |
| 204 No Content | Success with no body (for example `DELETE`) |
| 304 Not Modified | Conditional `GET` with matching `If-None-Match` |
| 400 Bad Request | Malformed syntax, unparsable JSON, wrong types |
| 401 Unauthorized | Missing or invalid credentials; send `WWW-Authenticate` |
| 403 Forbidden | Authenticated but not allowed |
| 404 Not Found | No such resource, or caller may not know it exists |
| 405 Method Not Allowed | Method not supported on this path; send `Allow` |
| 409 Conflict | State conflict (duplicate, wrong state transition) |
| 412 Precondition Failed | `If-Match` ETag mismatch |
| 415 Unsupported Media Type | Wrong `Content-Type` |
| 422 Unprocessable Content | Well-formed but fails validation |
| 429 Too Many Requests | Rate limited; send `Retry-After` |
| 500 Internal Server Error | Unexpected server fault |
| 503 Service Unavailable | Overloaded or down for maintenance; send `Retry-After` |

## Problem details (RFC 9457)

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request validation failed",
  "status": 422,
  "detail": "2 fields are invalid.",
  "instance": "/orders/req_7f3a",
  "errors": [
    { "pointer": "#/email", "detail": "must be a valid email address" },
    { "pointer": "#/quantity", "detail": "must be at least 1" }
  ]
}
```

`type` defaults to `about:blank` when no specific type exists. `errors` is an extension member (RFC 9457 shows this shape, with `pointer` as a JSON Pointer into the request body); keep its shape identical everywhere.

## Cursor pagination

```http
GET /orders?limit=2&cursor=eyJjIjoiMjAyNi0wMy0wMVQxMjowMDowMFoiLCJpZCI6Im9yZF85In0
```

```json
{
  "data": [ { "id": "ord_8" }, { "id": "ord_7" } ],
  "next_cursor": "eyJjIjoiMjAyNi0wMi0yOFQwOTowMDowMFoiLCJpZCI6Im9yZF83In0"
}
```

Server side: decode the cursor to `(created_at, id)` and query `WHERE (created_at, id) < (:c, :id) ORDER BY created_at DESC, id DESC LIMIT :limit + 1`. Fetching one extra row tells you whether `next_cursor` is null. Back it with an index on the sort columns.

## Idempotency-Key flow

1. Client sends `Idempotency-Key: <uuid>` on `POST`.
2. Server looks up the key scoped to the caller.
   - Not found: insert a row (key, fingerprint of method+path+body, status `processing`), run the operation, store the response.
   - Found, same fingerprint, finished: return the stored response unchanged.
   - Found, same fingerprint, still processing: return `409`.
   - Found, different fingerprint: return `422`.
3. Expire keys after a documented window (24 hours is common).

The `Idempotency-Key` header is specified in an IETF HTTPAPI working-group Internet-Draft; Stripe and other payment APIs use the same pattern.

## Deprecation headers

```http
Deprecation: @1767225599
Sunset: Thu, 31 Dec 2026 23:59:59 GMT
Link: <https://api.example.com/docs/migrate-v2>; rel="deprecation"
```

`Deprecation` (RFC 9745) carries a structured-field date (`@` + Unix seconds). `Sunset` (RFC 8594) carries an HTTP-date.

## OpenAPI skeleton

```yaml
openapi: 3.1.0
info: { title: Orders API, version: 1.0.0 }
paths:
  /orders:
    get:
      operationId: listOrders
      parameters:
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 50 } }
        - { name: cursor, in: query, schema: { type: string } }
      responses:
        "200":
          description: A page of orders
          content:
            application/json:
              schema: { $ref: "#/components/schemas/OrderPage" }
        default:
          description: Error
          content:
            application/problem+json:
              schema: { $ref: "#/components/schemas/Problem" }
components:
  schemas:
    Problem:
      type: object
      properties:
        type: { type: string, format: uri-reference }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string, format: uri-reference }
    Order:
      type: object
      required: [id, status, total_minor, currency, created_at]
      properties:
        id: { type: string }
        status: { type: string, enum: [pending, paid, cancelled] }
        total_minor: { type: integer }
        currency: { type: string, minLength: 3, maxLength: 3 }
        created_at: { type: string, format: date-time }
    OrderPage:
      type: object
      required: [data, next_cursor]
      properties:
        data: { type: array, items: { $ref: "#/components/schemas/Order" } }
        next_cursor: { type: [string, "null"] }
```
