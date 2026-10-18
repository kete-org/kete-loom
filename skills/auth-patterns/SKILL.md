---
name: auth-patterns
description: Implementing login, sessions and access control correctly on the server - password hashing with Argon2id or bcrypt, cookie sessions versus JWT access tokens, OAuth 2.1 and OpenID Connect authorization code flow with PKCE, TOTP and passkey MFA, role- and attribute-based permission checks, safe token storage in browsers and mobile apps, and password reset and account recovery. Use when building or changing sign-up, sign-in, logout, social login or SSO, adding roles and permissions, deciding where to keep tokens, wiring up an identity provider, or designing a forgot-password flow.
license: MIT
compatibility: Any Agent Skills host. Framework-neutral; examples name common libraries but the rules apply to any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Authentication and authorization patterns

Build auth that holds up when the client is hostile. This skill is for writing or changing auth code. To audit existing code for flaws, use the security-review skill or the security-reviewer agent.

## 0. Decide before writing code

1. **Prefer not to build it.** If the framework ships auth (Django auth, Rails 8's authentication generator or Devise, ASP.NET Core Identity, Laravel Fortify/Sanctum, Spring Security) or the project already uses a managed identity provider, use that. Hand-rolled crypto, token formats or OAuth servers are a **stop and ask** point.
2. Identify the client types: server-rendered web, SPA, mobile/desktop app, machine-to-machine. They need different token handling (section 3).
3. Find the existing pattern: search the codebase for the session middleware, the current-user helper and how routes are protected. Extend it; don't add a second auth system.

## 1. Passwords

- Hash with **Argon2id** (minimum m=19 MiB, t=2, p=1). If unavailable: scrypt (N=2^17, r=8, p=1), bcrypt (cost 10 or more; it ignores input past **72 bytes**, so cap length or pre-handle long input), or PBKDF2-HMAC-SHA256 at 600,000 iterations where FIPS is required. These are the OWASP Password Storage Cheat Sheet minimums; raise them as hardware allows.
- Use the library's own `hash` and `verify`; never compare hashes with `==`. Store the full encoded string (it carries the salt and parameters) and rehash on login when parameters change.
- Policy (NIST SP 800-63B style): favour length over composition rules, allow at least 64 characters and any Unicode, reject passwords found in a breached-password list, no forced periodic rotation, no password hints or security questions.
- Login responses and timing must not reveal whether the account exists: same message for unknown user and wrong password, and run a dummy verify for unknown users.
- Rate-limit by account and by IP, with backoff, not permanent lockout (lockout is itself a denial-of-service tool).

## 2. Sessions vs tokens

Default for a browser app on your own domain: **server-side session with an opaque ID in a cookie.** It is revocable, small and safe from script access.

| Use | When |
|---|---|
| Cookie session (opaque ID, server store) | Web app and API on the same site, including SPAs served from your domain or through a backend-for-frontend |
| Short-lived JWT access token + refresh token | APIs called by mobile apps, third parties or many services that must verify without a session store |
| Client credentials / workload identity | Machine to machine; no user |

Session cookie flags: `HttpOnly; Secure; SameSite=Lax` (or `Strict`), `Path=/`, and the `__Host-` name prefix so it can't be set by a subdomain. On login and on privilege change, **issue a new session ID** (prevents fixation). Enforce idle and absolute timeouts. Logout deletes the server-side session, not just the cookie. Cookie-authenticated state-changing requests need CSRF protection (framework token, or `SameSite` plus an `Origin` check).

JWT rules, if you use them:

1. Verify the signature with an **allow-list of algorithms** fixed in config; reject `none` and never take the algorithm or key from the token header.
2. Check `iss`, `aud`, `exp` and `nbf` on every request, with a small clock skew.
3. Access tokens live minutes, not days. Put an ID and roles in them, never secrets or personal data (JWTs are readable by anyone).
4. Refresh tokens are opaque, stored hashed server-side, **rotated on every use**, and a reused old one revokes the whole family.
5. You can't revoke a JWT before it expires without a deny-list; keep lifetimes short for that reason.

## 3. Token storage by client

- **Server-rendered or same-site SPA**: HttpOnly cookie. Do not put tokens in `localStorage` or `sessionStorage`; any XSS can read them.
- **SPA calling third-party APIs**: prefer a backend-for-frontend that holds tokens server-side and gives the browser only a session cookie. If tokens must live in the browser, keep them in memory and use refresh token rotation.
- **Mobile**: iOS Keychain, Android Keystore-backed storage. Never in plain shared preferences, files or logs.
- **Servers and CI**: secret manager or environment, never in the repo.

## 4. OAuth 2.1 and OpenID Connect

Use a maintained client library and the provider's discovery document (`/.well-known/openid-configuration`). The flow for every user-facing client is **authorization code with PKCE (`S256`)**, including confidential server-side clients. Never implement the implicit grant or the resource owner password grant: RFC 9700 (OAuth 2.0 Security BCP) says the password grant MUST NOT be used and clients SHOULD NOT use the implicit grant, and the OAuth 2.1 draft removes both.

Non-negotiable checks: exact redirect URI matching, a random `state` bound to the user's session, `nonce` in OIDC, ID token signature and claims validation, and linking the account by the provider's `sub` + `iss` (not by email alone unless the provider asserts `email_verified` and you accept that risk). Full flow, validation list and pitfalls: `references/oauth-oidc.md`.

## 5. MFA

- Offer **passkeys / WebAuthn** where possible; they are phishing-resistant. Use a maintained WebAuthn server library and verify origin, RP ID and the signature counter it reports.
- **TOTP** (RFC 6238): 30-second step, accept at most one step of drift, reject a code already used in its window, store the shared secret encrypted, rate-limit attempts.
- SMS and email codes are weaker fallbacks; never the only second factor for admin accounts.
- **Recovery codes**: generated once, shown once, stored hashed, single use.
- Require re-authentication (step-up) before changing email, password, MFA settings or payout details.

## 6. Authorization

1. **Deny by default.** Every route, resolver, RPC and background job that acts for a user checks permission on the server. Hidden UI is not a control.
2. Check **the action on this resource**, not just the role: load the object, then `can(user, "update", invoice)`. Scope queries by owner or tenant (`WHERE tenant_id = :current_tenant`) so another tenant's ID returns nothing (prevents IDOR).
3. **RBAC** for coarse capability (admin, member, viewer); **ABAC or relationship rules** for ownership, tenant, state ("only the author can edit a draft"). Put the rules in one policy module or library (Pundit, CASL, django-rules, Spring `@PreAuthorize`, OPA/Cedar), not scattered `if` statements.
4. Never trust client-sent roles, user IDs, tenant IDs or prices; derive them from the session.
5. Write tests for the negative cases: another user's resource, a lower role, a deactivated account, an expired session.

## 7. Account recovery

- Reset tokens: at least 128 bits from a CSPRNG, **stored hashed**, single use, expiring in minutes to an hour, invalidated when a new one is issued.
- Same response whether or not the email exists. Send the link only to the address already on file.
- On reset: invalidate all existing sessions and refresh tokens, notify the user, and do not log them in silently if MFA is enabled (still require the second factor).
- Email change: confirm via the new address and notify the old one.
- Support-driven recovery needs a documented identity check; it is the usual way accounts get taken over.

## 8. Logging

Log sign-in success and failure, MFA changes, password resets, role changes and token revocations with user ID, IP and time. Never log passwords, tokens, reset links, session IDs or TOTP secrets.

## Never

- Never store passwords reversibly or with fast hashes (MD5, SHA-1, SHA-256 alone).
- Never invent your own token format, signature scheme or OAuth server.
- Never put tokens in URLs, `localStorage`, logs or analytics.
- Never authorize from data the client sends.
- Never weaken an existing control (shorter hash cost, longer token life, removed CSRF check) without telling the user.

## Before you finish

- Tests cover: wrong password, unknown user, expired and tampered token, reused refresh token, another user's resource, missing role, CSRF on a cookie-authenticated mutation, reset token reuse.
- Run the project's tests and linters.
- Summarise for the user: what flow you built, where secrets are read from, token lifetimes, and anything left for them to configure at the identity provider.
