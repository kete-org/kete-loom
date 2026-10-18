# Resilience details for API clients

## Retry decision

```
retryable(response or error, request):
  if error is connect error, DNS failure, connection reset, timeout: transient = true
  elif status in (429, 502, 503, 504): transient = true
  elif status == 500 and vendor documents 500 as transient: transient = true
  else: return false
  if request.method in (GET, HEAD, OPTIONS, PUT, DELETE): return transient
  return transient and request.has_idempotency_key   # POST/PATCH only with a key
```

`PUT` and `DELETE` are idempotent by HTTP semantics (RFC 9110), but check the vendor actually implements them that way.

## Backoff with full jitter

```
delay(attempt) = random(0, min(cap, base * 2^attempt))   # base ~0.5s, cap ~30s
if Retry-After present:
  delay = seconds value, or (HTTP-date - now)             # never shorter than the server asked
stop when attempt == max_attempts or now + delay > deadline
```

Log each retry at debug/info with attempt number, status and vendor request ID; log the final failure once at warn/error.

## Idempotency keys

- Generate one key per logical operation (UUID v4), store it with the local record (order, payout, message) before the first attempt, and reuse it on every retry and on a later replay.
- Header name is vendor-specific (`Idempotency-Key` is common; some use a body field or a client reference ID). Check the docs.
- Note the vendor's key expiry window; replays after it can create duplicates.
- If the vendor has no idempotency support, don't retry creates; instead look the object up by your own reference before trying again.

## Rate limits

- Common headers: `Retry-After`; vendor-specific `X-RateLimit-Limit` / `-Remaining` / `-Reset`; the IETF `RateLimit` / `RateLimit-Policy` fields are still a draft, so treat them as vendor-specific too.
- Use a token bucket sized below the documented limit, shared across workers if the limit is per account (for example in Redis), not per process.
- Bulk or batch endpoints are often cheaper against the limit than many single calls.

## Token refresh, single-flight

```
get_token():
  if cached and cached.expires_at - now > skew (60s): return cached
  if refresh_in_progress: await it; return cached
  start refresh; on success persist (new refresh token first), cache, resolve waiters
  on failure: reject waiters, clear in-progress flag
```

In multi-process deployments, store the token in a shared cache with a lock, or accept one refresh per process if the vendor allows parallel tokens.

## Timeouts

- Connect timeout small (2 to 5 s); read or total timeout based on the endpoint's documented or observed p99 plus margin.
- The overall deadline (all retries) must be less than the caller's own timeout, such as an HTTP handler or queue visibility timeout.
- Streaming or file downloads: use an idle/read timeout rather than a total timeout.
