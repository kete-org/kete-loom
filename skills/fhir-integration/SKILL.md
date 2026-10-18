---
name: fhir-integration
description: HL7 FHIR R4 and R4B REST client and server work, covering resource modelling and references, search parameters with _include and chained queries, paging through Bundle next links, transaction and batch bundles with urn:uuid references, SMART on FHIR authorization (EHR and standalone launch, v2 scopes, PKCE, backend services), profile validation with $validate and the HL7 validator, and testing against public sandboxes. Use when calling or exposing a FHIR API, registering a SMART app with an EHR such as Epic or Oracle Health, writing FHIR search queries, posting transaction bundles, or debugging OperationOutcome errors.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to a FHIR server or sandbox. Examples use plain HTTP and JSON; the rules apply to any language or FHIR client library.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# FHIR integration

Build a FHIR integration that reads and writes the right patient's data, survives paging and partial failure, and validates against the profiles the other side expects. This skill covers the FHIR REST API and SMART on FHIR. For HL7 v2 pipe-delimited messages use `hl7v2-integration`; for decision support cards use `clinical-decision-support`; for HIPAA safeguards around the data use `hipaa-compliance`.

This is engineering guidance, not clinical or legal advice.

## Ground rules

1. **Pin the FHIR version.** Read `GET [base]/metadata` (the CapabilityStatement) and check `fhirVersion`: `4.0.1` is R4, `4.3.0` is R4B, `5.0.0` is R5. Never mix resource shapes across versions. Send `Accept: application/fhir+json` (optionally with `; fhirVersion=4.0`).
2. **Trust the CapabilityStatement, not assumptions.** Which resources, interactions, search parameters, `_include`s and operations a server supports differs per server. Check `rest.resource[].searchParam` before relying on a parameter; unsupported parameters may be silently ignored, which returns too much data.
3. **Patient identity is not a name match.** Find patients by a business identifier (`Patient?identifier=system|value`), never by name and birth date alone. If a match is ambiguous, stop and surface it to a human; never pick the first result.
4. **References are typed and relative.** Write `"subject": {"reference": "Patient/123"}`. Resolve relative references against the server base. Treat `contained` resources as part of their parent only.
5. **Follow paging to the end.** A search returns a `searchset` Bundle with at most `_count` entries; keep following `Bundle.link` where `relation = "next"` exactly as given (it is opaque) until there is none. `Bundle.total` is optional and may be absent or estimated.
6. **Use the right bundle type.** `transaction` is all-or-nothing; `batch` runs entries independently and you must check every `entry.response.status`. Inside a transaction, link new resources with `fullUrl: "urn:uuid:<uuid>"` references, which the server rewrites to real IDs.
7. **Writes are conditional and versioned.** Use conditional create (`If-None-Exist: identifier=system|value`) to avoid duplicates on retry, and `If-Match: W/"<versionId>"` on updates to avoid lost updates. A `412 Precondition Failed` means someone else changed it: re-read, re-apply, never force.
8. **Errors are OperationOutcome.** On any 4xx/5xx read `OperationOutcome.issue[].severity`, `code` and `diagnostics`. Never log the request body or full resource when logging errors; it holds PHI. Log resource type, ID, status and issue codes.
9. **Least-privilege SMART scopes.** Ask only for the scopes the feature needs, for example `patient/Observation.rs`, not `patient/*.cruds`. Keep tokens and refresh tokens server-side or in secure platform storage, never in `localStorage`.

## Steps

1. **Discover.** Fetch `[base]/metadata` and `[base]/.well-known/smart-configuration`. Record FHIR version, supported resources and search parameters, the `authorization_endpoint`, `token_endpoint`, supported scopes and `code_challenge_methods_supported`.
2. **Pick the auth flow** with `references/smart-on-fhir.md`:
   - App launched from inside the EHR: EHR launch (`launch` scope plus the `launch` parameter).
   - App started by the user outside the EHR: standalone launch (`launch/patient`).
   - Server-to-server job with no user: SMART Backend Services (`client_credentials` with a signed JWT `client_assertion`, `system/` scopes).
3. **Identify the implementation guide.** In the US that is usually US Core; elsewhere a national base profile (for example AU Base, UK Core) or a project IG. Note the profile canonical URLs and must-support elements you must populate and handle.
4. **Model the data.** Map each domain concept to a resource and profile. Use coded values with both `system` and `code` (LOINC for observations, SNOMED CT for clinical findings, RxNorm in the US for medications, UCUM for units). Never store free-text where the profile requires a code.
5. **Query** with the patterns in `references/search-and-bundles.md`: one search with `_include` or `_revinclude` instead of N+1 reads, `_elements` or `_summary` to cut payloads, dates with prefixes (`ge`, `lt`).
6. **Write** with conditional create or update, and transactions for sets of resources that must land together.
7. **Validate** every resource you create against its profile before sending: `POST [base]/[type]/$validate` where supported, or the HL7 validator locally (`java -jar validator_cli.jar file.json -version 4.0.1 -ig <package>`). Treat `error` and `fatal` issues as blocking.
8. **Test** against a sandbox before any real endpoint (see `references/search-and-bundles.md` for public servers). Use synthetic patients only (for example Synthea data); never paste real patient data into a public server.

## Stop and ask the user

- Before any write against a production EHR, or any test that uses real patient data.
- When a patient search returns more than one candidate, or zero where one was expected.
- When the server's version, IG or supported search parameters differ from what the code assumes.
- Before requesting `user/*` or `system/*` wildcard scopes or `offline_access`.

## Never

- Never build search URLs by string concatenation of unescaped user input; URL-encode values, and escape a literal `,`, `$`, `|` or `\` inside a parameter value by prefixing it with `\`, per the FHIR search spec.
- Never assume a single page of results is all results.
- Never drop unknown extensions or modifier extensions on round-trip; a `modifierExtension` you don't understand can change meaning, so reject the resource instead of ignoring it.
- Never treat `Observation.status = entered-in-error`, `cancelled` or `preliminary` results as final clinical data without handling the status.
- Never put PHI in URLs that end up in access logs if a `POST [type]/_search` form is available.

## Reviewing an existing integration

Check each ground rule, then look for:

- Paging stops after the first page, or the `next` link is rebuilt by hand.
- Patient matched by name, or the first `Patient` search result used blindly.
- Batch bundles where failed entries are never checked.
- Updates without `If-Match`, retries without conditional create.
- Search parameters the server does not list in its CapabilityStatement.
- Tokens logged, stored in the browser, or scopes far broader than the feature.
- Resources never validated against the required profile.

## Report format

When asked to review or design, finish with:

```
FHIR version / IG: <e.g. R4 4.0.1, US Core 6.1.0>
Auth flow: <EHR launch | standalone | backend services> with scopes <list>
Findings: <ranked list, file:line, rule broken, fix>
Not verified: <server behaviours you could not test>
```
