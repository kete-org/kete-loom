---
name: hl7v2-integration
description: Parses, generates and routes pipe-delimited HL7 version 2.x messages such as ADT admit/discharge/transfer events, ORM and OML orders and ORU results, handling MSH encoding characters and escape sequences, repeating fields and components, MSH-10 control IDs, original and enhanced ACK/NACK modes, MLLP framing over TCP, interface engines like Mirth Connect (NextGen Connect), and mapping v2 segments to FHIR resources. Use when receiving or sending HL7 v2 feeds from a hospital, lab or EHR, debugging a rejected message or missing ACK, writing an MLLP listener, or converting PID, PV1, OBR and OBX data into FHIR.
license: MIT
compatibility: Any Agent Skills host. Live feeds need network access to the interface engine or MLLP endpoint. Rules apply to any language or HL7 library (for example HAPI HL7v2, python-hl7, hl7apy).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# HL7 v2 integration

Build an HL7 v2 interface that never loses a message, never files a result against the wrong patient, and tells the sender exactly why it rejected something. For the FHIR REST API use `fhir-integration`; for HIPAA safeguards around the feed use `hipaa-compliance`.

This is engineering guidance, not clinical advice. Every live interface is validated with the sending site before go-live.

## Ground rules

1. **The interface specification wins.** Every site customises v2 (Z-segments, optional fields made required, local code tables). Get the sender's or receiver's interface spec and sample messages before writing a parser. If there is none, stop and ask for it.
2. **Read encoding characters from MSH, never hard-code them.** MSH-1 is the field separator (normally `|`), MSH-2 holds component `^`, repetition `~`, escape `\`, subcomponent `&` (and truncation `#` from v2.7). Segments end with carriage return `\r` (0x0D), not `\n`.
3. **Unescape and escape.** `\F\` `\S\` `\R\` `\E\` `\T\` stand for the separators inside data; `\X..\` is hex and `\.br\` a line break in formatted text. Escape on output; a name with `^` or `&` must not split fields.
4. **Fields repeat.** PID-3 (identifiers), PID-5 (names), PID-13 (phones) and OBX-5 can repeat with `~`. Pick the identifier by its assigning authority and type code (PID-3.4, PID-3.5 such as `MR`), never "the first one".
5. **Persist before you ACK.** Write the raw message to durable storage (queue or database) in the same step that decides the ACK. Send `AA`/`CA` only once it is stored. If storage fails, send `AR` with ERR-3 code `207` (application internal error) or send no ACK so the sender retries; `AE` means the content is wrong and senders usually don't resend it unchanged.
6. **MSH-10 is the idempotency key.** Senders resend when an ACK is lost. Deduplicate on sending facility (MSH-4) plus MSH-10 and return the same ACK again for a duplicate.
7. **Preserve order per patient.** ADT events (A01 admit, A02 transfer, A03 discharge, A08 update, A40 merge) must be processed in order for a patient. Process one connection serially, or partition by patient identifier; never parallelise blindly.
8. **Merges and corrections are first-class.** Handle A40 (merge patient), A11/A13 (cancel admit/discharge), A08 updates, and ORU results with OBX-11 result status `C` (corrected) or `D` (delete). Never treat them as new records.
9. **Never log full messages.** Messages contain PHI. Log message type, MSH-10, MSH-4, processing outcome and error location (segment, field) only. Keep raw messages in access-controlled storage with a retention policy.

## Steps

1. **Collect the spec and samples:** versions (MSH-12, for example `2.3`, `2.5.1`), message types and trigger events (MSH-9, for example `ADT^A01^ADT_A01`, `ORU^R01^ORU_R01`), required segments, Z-segments, code tables, ACK mode (MSH-15/MSH-16), and character set (MSH-18).
2. **Transport.** For MLLP use the framing in `references/messages-and-ack.md`. Run MLLP over a VPN or TLS tunnel; MLLP itself has no encryption or authentication. Restrict the listener port to the sender's IPs.
3. **Parse** with a maintained library, configured to read separators from MSH. Validate: required segments present, MSH-9 is a type you accept, MSH-11 processing ID (`P` production, `T` test, `D` debug) matches the environment. Reject `T` messages in production and `P` messages in test.
4. **Acknowledge** with the ACK format in `references/messages-and-ack.md`. On a rejected message set MSA-1 to `AE` (a problem in the message content, such as a missing required field; the sender must fix it before resending) or `AR` (rejected for reasons not about the content: unsupported message type, version or processing ID, or a receiver failure), and fill ERR with the segment and field location and a code.
5. **Map** fields to your model or to FHIR using the table in `references/messages-and-ack.md` and the HL7 Version 2 to FHIR IG (hl7.org/fhir/uv/v2mappings). Keep the original identifiers and the raw message ID on every mapped record for traceability.
6. **Produce** outbound messages with a fresh MSH-10 per message, MSH-7 timestamp with timezone, correct MSH-3/4/5/6 sending and receiving application and facility, and wait for the ACK before sending the next on that connection. Retry with the same MSH-10 on timeout.
7. **Test** with de-identified sample messages from the site, plus edge cases: escaped separators, repeating identifiers, missing optional segments, Z-segments, a duplicate MSH-10, a merge (A40), a corrected result, an empty OBX-5, a message with `\n` line endings.

## Interface engines

If the organisation runs an engine (Mirth Connect by NextGen Healthcare, commercially licensed from 4.6; Rhapsody; Cloverleaf; InterSystems HealthShare; or a cloud service such as Google Cloud Healthcare API HL7v2 stores with its MLLP adapter), put routing, filtering and transformation there rather than in each application, and keep transformations in source control. Your application then gets one well-defined feed.

## Stop and ask the user

- Before connecting to a production feed, or replaying messages into production.
- When identifiers in PID-3 don't match the agreed assigning authority, or a message would update a patient that can't be matched uniquely.
- When the sample messages contradict the interface spec.
- Before discarding or "fixing up" messages that fail validation.

## Never

- Never split on `|` and `^` with hard-coded indices without handling escapes and repetitions.
- Never ACK before the message is durably stored.
- Never drop OBX segments you don't understand from a result; store them and flag them.
- Never reuse an MSH-10 for a different message.
- Never mix test and production feeds on one listener.

## Report format

When asked to review or design an interface, finish with:

```
Feed: <sender → receiver, message types and versions, transport>
ACK mode: <original | enhanced>, persisted before ACK: <yes/no>
Findings: <ranked list, file:line, rule broken, fix>
Open questions for the interface analyst: <list>
```
