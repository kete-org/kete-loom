---
name: pii-redaction
description: Detects and removes personal data from text, logs, CSVs and datasets on your own machine before they go to a model, vendor or support ticket, combining regular expressions with checksum validation (Luhn for card numbers, mod-97 for IBANs, country formats for national IDs) to cut false positives, pseudonymising values consistently so joins and keys still line up, writing an audit of every replacement, and re-scanning the output to prove nothing leaked. Use when you must share, paste or upload data that may contain names, emails, phone numbers, card or account numbers or other personal identifiers.
license: MIT
compatibility: Any Agent Skills host. Runs locally; no network. Handles UTF-8 text, logs, CSV/TSV and JSON lines.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# PII redaction

Strip personal data out of a file **locally** before it leaves your control. The goal: the output is safe to share, the data is still usable (joins survive), and you can prove what was removed.

This redacts data. It is not legal advice and does not decide what you are allowed to collect or keep — for that see `privacy-compliance`.

## 0. Before you touch the data

1. **Never send the raw data anywhere to "help detect".** Detection and redaction run on the local machine only. No network calls on the source content.
2. Ask the user: what counts as sensitive here (just direct identifiers, or also quasi-identifiers like date of birth + postcode?), and must the output preserve **referential integrity** — the same person mapped to the same token everywhere, so analytics and joins still work?
3. Work on a copy. Keep the original and the token map out of the shared output.

## 1. Detect — pattern plus validation

Regex alone over-matches (every 16-digit number is not a card). Pair each pattern with a validator so you redact real identifiers, not random digits. Detectors and their checks are in `references/detectors.md`.

| Type | Pattern | Validator |
|---|---|---|
| Payment card (PAN) | 13–19 digits, grouped | **Luhn** checksum + known IIN ranges |
| IBAN | country code + check digits + BBAN | **mod-97 == 1** after rearrange |
| Email | local@domain | domain has a dot, valid TLD shape |
| Phone | E.164 / national | length + country prefix |
| National ID | per country (SSN, NHS, NINO, Ghana Card, BVN…) | country-specific format/checksum |
| IP address | IPv4 / IPv6 | valid octet/hextet ranges |
| Names | — | context + dictionary; always lower confidence |

Rules:
- Run validators before redacting. A 16-digit order number that fails Luhn is **not** a card — leave it, or flag it low-confidence for the user, don't blindly mask it.
- Names and free-text addresses are the hardest and least reliable; treat matches as suggestions, show the user a sample, and don't silently mangle the document.
- For CSV/structured data, detect per column — a whole column is usually one type, which is far more reliable than scanning cell by cell.

## 2. Redact — choose the transform per field

- **Mask** when the value isn't needed: `4111 11•• •••• 1111` or `[CARD]`. Simplest, safe default.
- **Pseudonymise** when joins must survive: replace each distinct value with a stable token via a keyed hash (HMAC with a secret salt) so the same input always yields the same token, and the mapping can't be reversed without the salt. `email → PERSON_7f3a`. Keep the salt/map local and out of the output.
- **Generalise** quasi-identifiers that must stay analysable: date of birth → birth year or age band; full postcode → area; exact salary → band. This blunts re-identification by combination.
- Preserve format where downstream code needs it (keep a valid-looking but fake structure) only if the user asks; prefer a clear placeholder otherwise.

Apply consistently: one person, one token, across every file and column in the batch.

## 3. Audit — record every replacement

Produce a redaction log (counts, never the raw values): per type, how many matched, how many passed/failed validation, how many were masked vs pseudonymised vs generalised, and any low-confidence matches the user should eyeball. This is what lets someone trust the output without re-reading it.

## 4. Re-scan — prove nothing leaked

Run the detectors again **over the redacted output**. Any real identifier that still validates is a leak — fix the detector and repeat until the re-scan is clean. Spot-check a sample by eye for names and context the patterns can't catch. State clearly in the report that patterns miss novel or obfuscated PII, so the output is "scanned", not "guaranteed clean".

## Stop and ask

- If removing a field would break the output's purpose (you can't share usable data and hide the identifier) — surface the trade-off, don't guess.
- If the data mixes many people's records and re-identification by combination is a risk, say so; simple field masking may not be enough and generalisation or aggregation may be needed.
- Regulated data (health records, children's data, financial statements): say what this does not cover and that a privacy/compliance owner should review before release.

## Report back

End with: files processed, the detectors run and their validators, the redaction log (counts per type and transform), low-confidence matches for the user to confirm, the re-scan result, and an explicit note that pattern-based redaction cannot catch every possible identifier.
