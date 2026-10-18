# Security review checklist

Apply the sections that match the code in scope. Each item is a question; a "no" is a candidate finding to trace and confirm.

## Secrets
- Are all keys, tokens and passwords read from the environment or a secret manager?
- Are `.env` files and key files listed in `.gitignore`?
- Do test fixtures use obviously fake values?

## Injection
- Are all database queries parameterised (placeholders or ORM query builders, no string concatenation)?
- Is user input ever passed to a shell? If so, is it passed as an argument array, never through a shell string?
- Are file paths built from user input normalised and checked to stay inside an allowed directory?
- Do server-side URL fetches restrict scheme and host (SSRF), and block private and metadata IP ranges?
- Do templates auto-escape? Is any `dangerouslySetInnerHTML`, `v-html`, `|safe` or `innerHTML` fed user data?
- Can user-supplied text reach an LLM that can call tools or read private data? Is the tool scope limited?

## Authentication
- Are passwords hashed with argon2, scrypt or bcrypt (never plain SHA/MD5)?
- Do sessions and tokens expire, and are they invalidated on logout and password change?
- Is login rate-limited? Do responses avoid revealing whether an account exists?
- Are JWTs verified with a fixed algorithm (no `alg: none`, no algorithm taken from the token)?

## Authorization
- Does every handler that reads or changes a resource check that *this* user may access *this* resource (not only that they are logged in)?
- Are admin routes protected server-side, not just hidden in the UI?
- Are mass-assignment risks handled (only allowed fields copied from the request)?

## Input validation
- Is every external input validated against a schema at the boundary?
- Are there limits on body size, upload size, array length and pagination size?
- Are uploaded files checked by content type and stored outside the web root with generated names?

## Data exposure
- Do logs exclude passwords, tokens, card data and personal data?
- Do error responses hide stack traces and internal details in production?
- Do API responses return only the fields the client needs?

## Web
- Are cookie-authenticated state changes protected against CSRF?
- Are cookies `HttpOnly`, `Secure` and `SameSite`?
- Is CORS restricted to known origins (no `*` with credentials)?
- Are security headers set (CSP, HSTS, X-Content-Type-Options, frame-ancestors)?

## Payments and webhooks
- Is every webhook signature verified against the raw request body with a constant-time comparison?
- Are amounts and prices computed on the server, never trusted from the client?
- Is payment status confirmed with the provider's verify API before value is given?
- Are webhook handlers idempotent (the same event processed twice has no extra effect)?

## Dependencies and config
- Does the dependency audit pass, or are remaining issues justified?
- Are new dependencies maintained and pinned in a lockfile?
- Is debug mode off and are default credentials removed in production config?
