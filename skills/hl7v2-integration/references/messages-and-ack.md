# HL7 v2 messages, ACKs, MLLP and FHIR mapping

Sources: HL7 v2.5.1 and later chapters 2 (control) and 3 (ADT), the MLLP transport spec (HL7 v2 Appendix C / Transport Specification MLLP Release 2), and the HL7 Version 2 to FHIR IG 1.0.0. Field positions below are the common ones; the site's interface spec overrides them.

## Example ADT^A01

```
MSH|^~\&|ADT1|GOOD HEALTH HOSPITAL|RCV|RCVFAC|20240612083000+0100||ADT^A01^ADT_A01|MSG00001|P|2.5.1
EVN|A01|20240612083000+0100
PID|1||12345^^^GHH^MR~987654321^^^NHS^NH||DOE^JANE^A||19800101|F|||1 MAIN ST^^LEEDS^^LS1 1AA^GBR
PV1|1|I|WARD1^ROOM2^BED3||||1234^SMITH^JOHN|||MED
```

Segments are separated by `\r`. The line breaks above are for reading only.

## Key fields

| Field | Meaning |
|---|---|
| MSH-3 / MSH-4 | sending application / facility |
| MSH-5 / MSH-6 | receiving application / facility |
| MSH-7 | message date/time |
| MSH-9 | message type ^ trigger event ^ structure |
| MSH-10 | message control ID (unique per message from a sender) |
| MSH-11 | processing ID: P, T, D |
| MSH-12 | version ID |
| MSH-15 / MSH-16 | accept / application acknowledgment type (AL, NE, ER, SU); blank means original mode |
| PID-3 | patient identifier list (ID ^^^ assigning authority ^ type code) |
| PID-5 / PID-7 / PID-8 | name / birth date / administrative sex |
| PV1-2 / PV1-3 | patient class / assigned location |
| ORC-1 / ORC-2 / ORC-3 | order control / placer order number / filler order number |
| OBR-4 | universal service identifier (ordered test) |
| OBX-2 / OBX-3 / OBX-5 / OBX-6 | value type / observation identifier / value / units |
| OBX-8 / OBX-11 | abnormal flags / result status (F final, P preliminary, C corrected, D delete, X cannot obtain) |

## ACK

Original mode: the receiving application replies once.

```
MSH|^~\&|RCV|RCVFAC|ADT1|GOOD HEALTH HOSPITAL|20240612083001+0100||ACK^A01^ACK|ACK00001|P|2.5.1
MSA|AA|MSG00001
```

- MSA-1: `AA` accepted, `AE` error, `AR` rejected.
- MSA-2: the MSH-10 of the message being acknowledged.
- On `AE`/`AR`, add `ERR` with location (ERR-2, for example `PID^1^3`), HL7 error code (ERR-3, from table 0357, for example `101` required field missing, `200` unsupported message type, `207` application internal error) and severity (ERR-4: `E`, `W`, `I`).
- Swap sending and receiving application/facility relative to the inbound MSH.

Enhanced mode (MSH-15/16 set): a commit ACK (`CA`, `CE`, `CR`) confirms safe receipt, and an optional application ACK (`AA`, `AE`, `AR`) follows later as a separate message.

## MLLP framing

```
<VT> message <FS><CR>
VT = 0x0B   FS = 0x1C   CR = 0x0D
```

- Read bytes until `0x1C 0x0D`; strip the leading `0x0B`. A TCP read can contain part of a message or several messages: buffer and split on the trailer.
- One message at a time per connection: send, wait for the ACK, then the next.
- Set an ACK timeout (often 30 to 60 seconds, agree it with the partner) and resend with the same MSH-10 on timeout.
- Keep connections open; reconnect with backoff.
- MLLP has no security. Use a VPN, TLS wrapper or engine-to-engine secure channel.

## Mapping to FHIR (summary of the v2-to-FHIR IG)

| v2 | FHIR R4 |
|---|---|
| PID | Patient (PID-3 → identifier, PID-5 → name, PID-7 → birthDate, PID-8 → gender via a concept map) |
| PV1 | Encounter (PV1-2 → class, PV1-3 → location, PV1-19 visit number → identifier) |
| ORC + OBR | ServiceRequest (placer/filler numbers → identifier) and DiagnosticReport for results |
| OBX | Observation (OBX-3 → code, OBX-5 by OBX-2 type → value[x], OBX-6 → valueQuantity.unit, OBX-11 → status) |
| AL1 | AllergyIntolerance |
| DG1 | Condition |
| NK1 | RelatedPerson or Patient.contact |
| MSH, EVN | Provenance / MessageHeader (keep MSH-10 for traceability) |

Code tables map through ConceptMaps; local codes need a site-specific map. Map OBX-11 `C` to Observation `status = corrected` and update the existing Observation rather than creating a new one; `D` maps to `entered-in-error`.
