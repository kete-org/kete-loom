# PII detectors and validators

Each detector = a pattern to find candidates + a validator to reject false positives. Run locally; never send source data to a service to "detect".

## Payment card (PAN) — Luhn

Pattern: 13–19 digits, optionally in groups of 4 separated by space or `-`.
Validator — **Luhn checksum**:
1. From the rightmost digit, double every second digit.
2. If a doubled digit > 9, subtract 9.
3. Sum all digits. Valid iff `sum % 10 == 0`.
Also check the IIN/BIN prefix matches a real scheme (Visa `4`, Mastercard `51–55`/`2221–2720`, Amex `34`/`37`). A number that fails Luhn is not a card — do not mask it as one.

## IBAN — mod-97

Pattern: 2-letter country code + 2 check digits + up to 30 alphanumerics (length is country-specific).
Validator — **mod-97**:
1. Move the first 4 chars to the end.
2. Replace each letter with two digits (`A`=10 … `Z`=35).
3. Interpret as a big integer. Valid iff `value % 97 == 1`.

## Email

Pattern: `[^@\s]+@[^@\s]+\.[^@\s]+`. Validator: domain contains a dot and a plausible TLD; reject trailing punctuation. Beware masking email-like strings in code or logs that aren't addresses.

## Phone

Pattern: E.164 (`+` then 8–15 digits) and common national formats. Validator: total digit count in range for the country prefix. Strip separators before counting.

## National identifiers (examples — confirm the country)

| Country | ID | Shape / check |
|---|---|---|
| US | SSN | `AAA-GG-SSSS`; reject `000`/`666`/`9xx` area, `00` group, `0000` serial |
| UK | NINO | 2 letters + 6 digits + 1 letter; invalid prefix list applies |
| UK | NHS number | 10 digits with a mod-11 check digit |
| Ghana | Ghana Card PIN | `GHA-#########-#` |
| Nigeria | BVN / NIN | 11 digits |
| South Africa | ID number | 13 digits, embeds DOB, Luhn-style check digit |

Always confirm the target country's format before trusting a national-ID match; formats and checksums differ and change.

## IP address

IPv4: four octets 0–255. IPv6: valid hextet groups. Validate ranges to avoid masking version numbers or arbitrary dotted numbers.

## Consistent pseudonymisation

To keep joins working, map each distinct value to a stable token:

```
token(value) = TYPE + "_" + first8(HMAC-SHA256(secret_salt, normalise(value)))
# e.g. ada@x.com -> PERSON_7f3a9c21
```
- `normalise`: lowercase, trim, canonicalise (so `Ada@X.com` and ` ada@x.com ` map the same).
- The HMAC salt is a local secret. Without it the token can't be reversed; keep the salt and any value→token map out of the shared output.
- Same input → same token across every file and column in the batch, so referential integrity survives.

## Generalisation for quasi-identifiers

Date of birth → year or age band; full postcode → outward area; exact figures → bands. Reduces re-identification by combining fields (DOB + sex + postcode can be unique even with names removed).

## Limits

Pattern + validation catches structured identifiers reliably. It misses free-text names, nicknames, obfuscated or split values, and context-only identifiers. Re-scan the output, sample by eye, and never state the result is guaranteed free of PII.
