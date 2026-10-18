# OAuth 2.1 / OpenID Connect: authorization code flow with PKCE

Read this when wiring up social login, SSO or any OAuth client. Status note: OAuth 2.1 is still an IETF Internet-Draft (draft-ietf-oauth-v2-1) at the time of writing; its rules consolidate RFC 6749, RFC 7636 (PKCE) and RFC 9700 (OAuth 2.0 Security Best Current Practice, January 2025). Follow RFC 9700 where your provider is OAuth 2.0.

## Flow

```
1. Client creates:
   code_verifier  = 43-128 chars from a CSPRNG (base64url)
   code_challenge = BASE64URL(SHA256(code_verifier)), method S256
   state          = random, stored in the user's session (CSRF protection)
   nonce          = random, stored in the session (OIDC replay protection)

2. Redirect the browser to the authorization endpoint:
   GET /authorize?response_type=code&client_id=...&redirect_uri=<exact registered URI>
       &scope=openid%20profile%20email&state=...&nonce=...
       &code_challenge=...&code_challenge_method=S256

3. Provider redirects back: GET <redirect_uri>?code=...&state=...
   - Reject if state is missing or differs from the session value. Delete it after use.
   - If the provider supports it, check the `iss` response parameter (RFC 9207) matches the expected issuer (mix-up defence).

4. Server exchanges the code (back channel):
   POST /token  grant_type=authorization_code&code=...&redirect_uri=...&code_verifier=...
   Confidential clients also authenticate (client secret, or better private_key_jwt / mTLS).

5. Validate the ID token (OIDC), then create your own session.
```

## ID token validation (OIDC Core)

1. Signature verifies against a key from the provider's `jwks_uri` (cache keys; refetch on unknown `kid`). Algorithm is in your allow-list, never `none`.
2. `iss` equals the expected issuer exactly.
3. `aud` contains your `client_id`; if multiple audiences, `azp` equals your `client_id`.
4. `exp` is in the future; `iat` is recent.
5. `nonce` equals the value stored in the session.
6. Identify the user by `iss` + `sub`. Email is not a stable identifier and may be unverified.

Most libraries do all of this; confirm the one you use does and that you have not disabled any check.

## Client types

| Client | Credentials | Notes |
|---|---|---|
| Server-side web app | Confidential (secret or key) | Still use PKCE. Tokens stay on the server; browser gets a session cookie. |
| SPA | Public | Best: backend-for-frontend holds tokens. Otherwise PKCE, in-memory tokens, refresh token rotation, short lifetimes. |
| Native / mobile | Public | System browser (ASWebAuthenticationSession, Custom Tabs), never an embedded web view. Claimed HTTPS redirect (universal/app links) or loopback for desktop. |
| Machine to machine | Confidential | `client_credentials` grant; no user, no refresh token. |

## Pitfalls

- **Open redirect via redirect_uri**: register exact URIs; never accept wildcards or a user-supplied return URL without an allow-list. After login, only redirect to relative paths you validate.
- **Account takeover by email linking**: linking a social login to an existing local account by email alone lets anyone who controls that email at a sloppy provider take the account. Link by `iss` + `sub`, and require the user to sign in to the existing account to link it.
- **Leaking codes or tokens**: no tokens in URLs or fragments, set `Referrer-Policy: no-referrer` (or strict) on the callback page, never log the callback query string.
- **Over-broad scopes**: request only what you use; incremental consent for more.
- **Access token as identity**: for "who is the user", use the ID token or `userinfo`, not an access token meant for an API.
- **Using the provider's access token as your session**: create your own session after login; the provider's tokens are for calling the provider.
- **Refresh tokens**: rotate on use with reuse detection, or sender-constrain them (DPoP, RFC 9449, or mTLS) where the provider supports it.
- **Logout**: end your own session; use the provider's RP-initiated logout endpoint if single sign-out is required.

## Grants never to implement

- Implicit (`response_type=token`): tokens in the URL fragment, no PKCE binding.
- Resource owner password credentials: your app sees the user's provider password; defeats MFA and phishing resistance.
