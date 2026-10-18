# HIPAA rule map for engineers

Engineering summary only, not legal advice. Check HHS (hhs.gov/hipaa) and the regulation text (45 CFR Parts 160 and 164) before relying on any detail, and have the privacy or security officer confirm.

## Status of the Security Rule

- HHS published a proposed overhaul of the Security Rule in January 2025. It would remove the "required" versus "addressable" split and make controls such as encryption and MFA mandatory. It is still a proposal: in July 2026 the federal regulatory agenda moved its final action date to July 2027 and listed it under long-term actions. The current Security Rule stays in force until a final rule takes effect; check HHS for its status.
- Build to the stricter proposed bar anyway (encrypt everything, MFA everywhere, asset inventory, network map), because it is cheap to do in new systems and expensive to retrofit.

## Security Rule safeguards (45 CFR 164.308 to 164.312)

| Safeguard | Section | What engineering builds |
|---|---|---|
| Risk analysis and risk management | 164.308(a)(1) | ePHI map, threat list, tracked remediation |
| Workforce access management | 164.308(a)(4) | Role definitions, joiner/mover/leaver process, access reviews |
| Security incident procedures | 164.308(a)(6) | Incident runbook, alerting, evidence preservation |
| Contingency plan | 164.308(a)(7) | Encrypted backups, tested restores, disaster recovery plan |
| Business associate contracts | 164.308(b), 164.314(a) | BAA register per vendor and service |
| Device and media controls | 164.310(d) | Disk encryption, secure wipe, no ePHI on unmanaged devices |
| Access control | 164.312(a) | Unique user ids, emergency access, automatic logoff, encryption (addressable) |
| Audit controls | 164.312(b) | Tamper-resistant audit log of ePHI activity |
| Integrity | 164.312(c) | Controls against improper alteration or destruction |
| Person or entity authentication | 164.312(d) | Strong authentication, MFA |
| Transmission security | 164.312(e) | TLS everywhere, integrity checks, encryption (addressable) |

"Addressable" does not mean optional: implement it, or document why an equivalent measure is reasonable.

Documentation of policies and actions is kept for six years from creation or last effective date (164.316(b)(2)).

## Privacy Rule points that shape code

- **Minimum necessary** (164.502(b), 164.514(d)): limit uses, disclosures and requests to the minimum needed. Does not apply to disclosures to the patient or for treatment between providers.
- **Business associates** (164.502(e), 164.504(e)): a BAA must be in place before a business associate handles PHI, and subcontractors of business associates need one too.
- **Patient right of access** (164.524): patients can get copies of their records, electronically if held electronically. Build an export.

## De-identification (164.514(b))

Two methods: expert determination, or Safe Harbor. Safe Harbor removes these 18 identifiers of the individual and of relatives, employers and household members, and the entity has no actual knowledge that the rest could identify the person:

1. Names
2. Geographic subdivisions smaller than a state (street, city, county, ZIP; the first three ZIP digits may stay if that area has more than 20,000 people)
3. All elements of dates (except year) related to the person, and all ages over 89
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate or license numbers
12. Vehicle identifiers and serial numbers, including license plates
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers, including finger and voice prints
17. Full-face photographs and comparable images
18. Any other unique identifying number, characteristic or code

Hashing an identifier is not de-identification by itself.

## Breach Notification Rule (164.400 to 164.414)

- Applies to unsecured PHI. PHI encrypted to HHS guidance, with the key not compromised, is "secured".
- Individuals: without unreasonable delay and no later than 60 calendar days after discovery.
- HHS: for 500 or more individuals, at the same time as individual notice; for fewer than 500, in an annual log submitted within 60 days after the end of the calendar year.
- Media: when more than 500 residents of a state or jurisdiction are affected.
- Business associates notify the covered entity without unreasonable delay and no later than 60 days after discovery.
- Whether an incident is a reportable breach is a legal decision based on a risk assessment. Engineering provides the facts.
