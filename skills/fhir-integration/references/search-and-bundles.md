# FHIR search, paging and bundles

Source: FHIR R4 specification, http.html and search.html (hl7.org/fhir/R4). Check the target server's CapabilityStatement for what it really supports.

## Search patterns

| Need | Query |
|---|---|
| Patient by identifier | `GET Patient?identifier=http://hospital.example/mrn\|12345` |
| Lab results since a date | `GET Observation?patient=Patient/123&category=laboratory&date=ge2024-01-01` |
| Latest vitals | `GET Observation?patient=123&category=vital-signs&_sort=-date&_count=10` |
| Specific code | `GET Observation?patient=123&code=http://loinc.org\|4548-4` |
| Encounters plus their patient | `GET Encounter?date=ge2024-06-01&_include=Encounter:subject` |
| Patient plus its conditions | `GET Patient?_id=123&_revinclude=Condition:subject` |
| Chained search | `GET Observation?subject:Patient.identifier=http://hospital.example/mrn\|12345` |
| Smaller payload | `_summary=true`, or `_elements=id,code,valueQuantity` |
| Long or PHI-bearing query | `POST Observation/_search` with `application/x-www-form-urlencoded` body |

Modifiers: `:exact`, `:contains` (strings), `:missing=true`, `:not`, `:text` (tokens). Date prefixes: `eq ne gt lt ge le sa eb ap`.

`_include`d resources come back with `entry.search.mode = "include"`; only `"match"` entries are search results.

## Paging

```
url = first search URL
loop:
  bundle = GET url
  for entry in bundle.entry where entry.search.mode == "match": handle(entry.resource)
  next = bundle.link.find(l => l.relation == "next")
  if not next: break
  url = next.url   # opaque; never rebuild it
```

Some servers expire paging cursors; handle a 4xx on a `next` link by restarting the search, not by skipping.

## Transaction bundle

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:3f1c...",
      "resource": { "resourceType": "Patient", "identifier": [{ "system": "http://hospital.example/mrn", "value": "12345" }] },
      "request": { "method": "POST", "url": "Patient", "ifNoneExist": "identifier=http://hospital.example/mrn|12345" }
    },
    {
      "resource": { "resourceType": "Observation", "status": "final", "code": { "coding": [{ "system": "http://loinc.org", "code": "4548-4" }] }, "subject": { "reference": "urn:uuid:3f1c..." } },
      "request": { "method": "POST", "url": "Observation" }
    }
  ]
}
```

POST it to `[base]` (not to a resource type). Success returns a `transaction-response` Bundle with one `entry.response` per entry, in order, each with `status` and `location`. Any failure rolls back everything and returns an OperationOutcome.

Use `batch` only when entries are truly independent, and check each `entry.response.status`.

## Other interactions

- `GET Patient/123/_history/2`: a specific version.
- `GET Patient/123/$everything`: everything for a patient, where supported (paged).
- `GET Observation?_lastUpdated=gt2024-06-01T00:00:00Z`: incremental sync.
- Bulk Data (`$export`, async with `Prefer: respond-async`, NDJSON output): for population-scale extracts; use backend services auth.

## Public test servers (synthetic data only)

- HAPI FHIR public server: `https://hapi.fhir.org/baseR4` (shared, data is public and wiped occasionally).
- SMART App Launcher: `https://launch.smarthealthit.org` (simulates EHR and standalone launch).
- Vendor sandboxes: Epic on FHIR (fhir.epic.com) and Oracle Health (Cerner) code console; each requires registering an app.
- Run your own: the `hapiproject/hapi` Docker image for a local server you can reset.
