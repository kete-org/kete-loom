# CDS Hooks implementation notes

Source: CDS Hooks specification 2.0 (cds-hooks.hl7.org, STU 2, based on FHIR R4). Check the EHR vendor's docs for which hooks and features they support.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET {base}/cds-services` | discovery: list of services with `hook`, `id`, `title`, `description`, `prefetch`, optional `usageRequirements` |
| `POST {base}/cds-services/{id}` | invoke a service for a hook |
| `POST {base}/cds-services/{id}/feedback` | the EHR reports which cards and suggestions were accepted or overridden |

## Standard hooks

`patient-view`, `order-select`, `order-sign`, `order-dispatch`, `appointment-book`, `encounter-start`, `encounter-discharge`, `medication-refill`, `allergyintolerance-create`, `problem-list-item-create`. (`medication-prescribe` and `order-review` are deprecated.) Each hook defines its `context` fields, for example `order-sign` carries `userId`, `patientId`, `encounterId` and `draftOrders` (a Bundle).

## Discovery example

```json
{
  "services": [{
    "hook": "order-sign",
    "id": "renal-dose-check",
    "title": "Renal dose check",
    "description": "Flags renally cleared drugs ordered for patients with reduced eGFR",
    "prefetch": {
      "patient": "Patient/{{context.patientId}}",
      "egfr": "Observation?patient={{context.patientId}}&code=http://loinc.org|<egfr-code>&_sort=-date&_count=1"
    }
  }]
}
```

Prefetch is an optimisation the EHR may skip: if a key is missing, fetch it from `fhirServer` with `fhirAuthorization.access_token`, and if neither is available return no cards rather than guessing. Log that the check could not run and count it, so an outage shows up in monitoring instead of looking like "no issues".

## Request fields

`hook`, `hookInstance` (UUID, use it as the correlation ID in audit logs), `fhirServer`, `fhirAuthorization` (`access_token`, `token_type`, `expires_in`, `scope`, `subject`), `context`, `prefetch`.

## Security

- The EHR sends a signed JWT bearer token in `Authorization`. Verify it on every request: signature against the EHR's JWK Set (from the optional `jku` header only if that URL is on your allowlist, otherwise a key exchanged out of band), `iss` on your allowlist of EHRs, `aud` equal to the URL of the endpoint being called (`{base}/cds-services/{id}`), `exp` not passed, `iat` present, `jti` not replayed.
- Use the `fhirAuthorization` token only for the patient in context and discard it after the call.
- Never log `prefetch` or `context` bodies; log `hookInstance`, service ID, rule versions and card UUIDs.

## Response

```json
{
  "cards": [{
    "uuid": "6f0c...",
    "summary": "Dose may be too high for eGFR 25 (under 140 chars)",
    "detail": "Markdown: triggering values, the rule in plain words, evidence link",
    "indicator": "warning",
    "source": { "label": "Renal dosing rules v1.4.0", "url": "https://example.org/evidence" },
    "suggestions": [{ "label": "Reduce dose", "uuid": "...", "isRecommended": true, "actions": [{ "type": "update", "description": "...", "resource": {} }] }],
    "selectionBehavior": "at-most-one",
    "overrideReasons": [{ "code": "benefit-outweighs-risk", "system": "https://example.org/override-reasons", "display": "Benefit outweighs risk" }],
    "links": [{ "label": "Guideline", "url": "https://...", "type": "absolute" }]
  }],
  "systemActions": []
}
```

- `indicator`: `info`, `warning`, `critical` (increasing urgency).
- `selectionBehavior` is required when `suggestions` is present.
- `systemActions` are applied by the EHR without showing the user: leave empty unless clinical governance has approved the automation.
- Return `{"cards": []}` when nothing applies. Respond fast (the clinician is waiting); set a timeout budget well under the EHR's.

## Feedback

Give every card and suggestion a `uuid`: the EHR sends no feedback for a card or suggestion without one. Store each feedback item (`card`, `outcome` accepted/overridden, `acceptedSuggestions`, `overrideReason`, `outcomeTimestamp`) against the rule version. This is the data for override-rate and alert-fatigue review.

## Testing

The public CDS Hooks sandbox (sandbox.cds-hooks.org) can call a service you host and render its cards. Use synthetic patients only.
