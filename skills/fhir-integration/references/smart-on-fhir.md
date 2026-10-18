# SMART on FHIR authorization

Source: SMART App Launch IG (STU 2.x, hl7.org/fhir/smart-app-launch). Check the EHR vendor's own developer docs for registration steps and which scopes they actually grant.

## Discovery

`GET [base]/.well-known/smart-configuration` returns JSON with `authorization_endpoint`, `token_endpoint`, `scopes_supported`, `capabilities` (for example `launch-ehr`, `launch-standalone`, `client-public`, `client-confidential-asymmetric`, `context-ehr-patient`, `permission-v2`) and `code_challenge_methods_supported`.

## Scopes (v2 syntax)

`<context>/<ResourceType>.<letters>` where context is `patient`, `user` or `system`, and letters are a subset of `c r u d s` in that order.

| Scope | Meaning |
|---|---|
| `patient/Observation.rs` | read and search Observations for the patient in context |
| `patient/Observation.rs?category=http://terminology.hl7.org/CodeSystem/observation-category\|laboratory` | same, limited to lab results |
| `user/Patient.rs` | read and search any Patient the user may see |
| `system/*.rs` | backend service, read everything granted to the client |
| `launch` | EHR launch; pair with the `launch` URL parameter |
| `launch/patient` | standalone launch; ask the EHR to select a patient |
| `openid fhirUser` | ID token with a `fhirUser` claim (the user's Practitioner/Patient URL) |
| `offline_access` / `online_access` | refresh token, long-lived or only while the user is online |

v1 servers use `.read`, `.write`, `.*`. v1 `.read` maps to v2 `.rs`, `.write` to `.cud`. Request what the server advertises (`permission-v1` / `permission-v2`). The granted scopes in the token response can be narrower than requested: always read `scope` from the response and degrade the feature, rather than assuming.

## EHR launch

1. EHR opens your launch URL with `iss` (the FHIR base) and `launch` (an opaque handle).
2. Check `iss` against an allowlist of FHIR bases you registered with. Never fetch configuration from an arbitrary `iss`.
3. Redirect to `authorization_endpoint` with `response_type=code`, `client_id`, `redirect_uri`, `scope` (including `launch`), `state` (random, checked on return), `aud` (= the FHIR base), `launch`, `code_challenge` and `code_challenge_method=S256`.
4. Exchange the code at `token_endpoint` with `code_verifier`. The response carries `access_token`, `expires_in`, `scope`, and context such as `patient`, `encounter`, `id_token`, `refresh_token`.
5. Use only the `patient` in the token response as the patient in context.

## Standalone launch

Same as EHR launch without `iss`/`launch` from the EHR: you know the base in advance and request `launch/patient`.

## Backend services (no user)

1. Register a public key (JWKS URL or JWK) with the server.
2. Build a JWT signed with `RS384` or `ES384`: `iss` and `sub` = client_id, `aud` = token endpoint, `exp` at most 5 minutes ahead, unique `jti`.
3. `POST token_endpoint` with `grant_type=client_credentials`, `scope=system/...`, `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`, `client_assertion=<jwt>`.
4. Cache the token until shortly before `expires_in`.

## Common failures

- `invalid_scope`: the scope isn't registered for the client, or v1/v2 syntax mismatch.
- `invalid_client` on backend services: wrong `aud`, clock skew on `exp`, wrong algorithm, or a key not yet registered.
- 401 on FHIR calls: token expired, or `aud` didn't match the FHIR base.
- 403 on a resource: scope granted is narrower than requested, or the user lacks access in the EHR.
