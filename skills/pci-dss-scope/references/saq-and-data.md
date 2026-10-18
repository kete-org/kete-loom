# SAQ types and card data rules

Engineering summary only. The PCI Security Standards Council (pcisecuritystandards.org) document library is the source of truth, and the acquirer decides which validation a merchant does. Check the current SAQ document and its eligibility criteria before telling a user which one applies.

## Current standard

- PCI DSS v4.0.1 (published June 2024) is the current version this skill was written against; v4.0 was retired at the end of 2024. Requirements marked "future-dated" in v4.x became mandatory on 31 March 2025.
- SAQ A was revised in January 2025 (effective 31 March 2025): requirements 6.4.3 and 11.6.1 (payment page script management and change detection) and 12.3.1 were removed from it, and a new eligibility criterion was added that the merchant confirms its site is not susceptible to attacks from scripts that could affect the merchant's e-commerce systems. PCI SSC FAQ 1588 (February 2025) clarifies that this criterion concerns merchant pages that embed the processor's payment form (iframes), not pages that only redirect or link to the processor's page. Assessors differ on how much script control (page-level 6.4.3 and 11.6.1 style controls, or site-wide) satisfies it. Read the current SAQ A and FAQ, and let the acquirer or QSA decide.

## Common SAQ types (high level)

| SAQ | Typical situation | What it means for engineering |
|---|---|---|
| A | Card-not-present merchant that fully outsources all cardholder data functions: redirect to a processor page, or processor iframes for every card field. No electronic storage, processing or transmission of card data on merchant systems | Keep it that way: no card fields of your own, protect the page that hosts the iframe or redirect (Step 5 of the skill), minimal stored data |
| A-EP | E-commerce merchant that outsources processing but whose website can affect the security of the payment transaction, for example a merchant page with direct post or JavaScript that handles card entry | Web servers serving the payment page are in scope: hardening, vulnerability scans, change control, script controls |
| B | Imprint machines or standalone dial-out terminals, no electronic card data storage | Not usually an engineering concern |
| B-IP | Standalone PTS-approved terminals with an IP connection to the processor | Network segmentation for the terminals |
| C-VT | Manual entry, one transaction at a time, into a processor's virtual terminal in a browser | Locked-down workstations; no card data storage |
| C | Payment application systems connected to the internet, no electronic storage | Larger scope: the payment application and its network |
| P2PE | Validated point-to-point encryption hardware solution only | Use the listed P2PE solution as validated |
| D (merchant) | Everything else, including any merchant that stores card data electronically or whose servers receive the PAN | Full PCI DSS requirements |
| D (service provider) | Service providers eligible to self-assess | Full requirements for service providers |

Higher-volume merchants may need an onsite assessment by a QSA and a Report on Compliance instead of an SAQ. The card brands and acquirer set those levels.

## Data rules (PCI DSS v4.0.1 Requirement 3)

| Data element | Store? | Notes |
|---|---|---|
| Primary account number (PAN) | Only if needed, and then unreadable | Masked when displayed: at most BIN (first six or eight) and last four. Unreadable when stored: strong cryptography, truncation, tokenisation or one-way hashes with controls |
| Cardholder name, expiry, service code | Allowed if needed | Protected when stored with the PAN |
| Full track data (stripe or chip) | Never after authorisation | Even if encrypted |
| CVV2, CVC2, CID, CAV2 | Never after authorisation | Even if encrypted |
| PIN, PIN block | Never after authorisation | Even if encrypted |

Requirement 3.3.1 forbids keeping sensitive authentication data after authorisation. A processor token (for example a Stripe `pm_...` id or a Paystack `authorization_code`) is not a PAN, which is why tokenisation keeps systems out of scope.
