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

## Filter bypasses to test

A filter is only as good as the inputs it was tested against. When the code validates a URL, host or document, check that each of these is handled.

### SSRF (server fetches a user-supplied URL)
- Alternate IP encodings of loopback and private ranges: decimal (`2130706433`), octal (`0177.0.0.1`), hex (`0x7f000001`), short forms (`127.1`, `0`), and IPv4-mapped IPv6 (`[::ffff:127.0.0.1]`, `[::1]`).
- Redirects: an allowed public host that answers with a `3xx` to an internal address. Either turn redirects off or re-validate every hop.
- DNS rebinding: a name that resolves to a public IP at check time and a private one at fetch time. The safe pattern is resolve once, validate the resolved IP against the deny ranges, then connect to that pinned IP (sending the original Host header).
- Cloud metadata: `169.254.169.254`, `fd00:ec2::254`, and provider metadata host names. Blocked by IP range, not by string match.
- Schemes other than `http`/`https` (`file:`, `gopher:`, `ftp:`, `dict:`) refused before the fetch.

### Open redirects (user-supplied return or next URL)
- `https://trusted.example@evil.example` (userinfo), `https://evil.example\@trusted.example` and `/\evil.example` (backslash treated as slash by browsers).
- Protocol-relative `//evil.example` and `///evil.example`, which pass a "starts with `/`" check.
- `javascript:` and `data:` schemes, including mixed case and leading whitespace or control characters.
- Double URL encoding (`%252f%252fevil.example`) decoded after validation.
- Look-alike internationalised domains: compare hosts after converting to punycode (`xn--...`), not as displayed Unicode.
- Safest fix: accept only a relative path from an allow-list, or an ID that maps to a stored URL.

### XML parsing (XXE)
- External entities and DTD loading are disabled in every parser the code uses, including SVG, DOCX/XLSX and SAML handling.
- Entity expansion is limited (no "billion laughs").

### GraphQL
- Introspection is off in production unless the API is public by design.
- Query depth, complexity or cost limits are enforced on the server.
- Batched queries and aliases are limited, so one request can't run thousands of login or lookup attempts.
- Authorization runs in each resolver or field, not only at the entry point.

## LLM and agent code

When the code sends text to an LLM or lets a model call tools, check the OWASP LLM Top 10 (current edition on genai.owasp.org) and, for agents, the OWASP Top 10 for Agentic Applications:

| ID | Category | Ask |
|---|---|---|
| ASI01 | Agent goal hijack | Can content the agent reads (pages, files, emails, tool output) change its objective? |
| ASI02 | Tool misuse and exploitation | Can the agent be steered into calling a legitimate tool with harmful arguments? |
| ASI03 | Identity and privilege abuse | Does the agent act with broader credentials than the user who asked? |
| ASI04 | Agentic supply chain | Are tools, plugins, MCP servers, prompts and models pinned and from trusted sources? |
| ASI05 | Unexpected code execution | Can model output reach `eval`, a shell or an interpreter outside a sandbox? |
| ASI06 | Memory and context poisoning | Can untrusted input be written into memory or retrieval stores that later steer the agent? |
| ASI07 | Insecure inter-agent communication | Are messages between agents authenticated and checked, or trusted blindly? |
| ASI08 | Cascading failures | Can one bad step or agent propagate through others without a check or limit? |
| ASI09 | Human-agent trust exploitation | Could the agent talk a user into approving something harmful? Do approvals show the real action? |
| ASI10 | Rogue agents | Is there monitoring, a scope limit and a kill switch for an agent acting outside its task? |
