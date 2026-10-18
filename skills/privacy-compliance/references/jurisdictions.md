# Jurisdiction notes

Engineering summary only, not legal advice. Laws, regulations and regulator guidance change: before you rely on a figure here in code, a runbook or a notice, check the regulator's current text and have the DPO or counsel confirm it. Where a cell says "confirm", this skill could not verify the figure, so do not hard-code a value.

## Quick comparison

| | EU / UK GDPR | Ghana: Data Protection Act, 2012 (Act 843) | Nigeria: Data Protection Act, 2023 (NDPA) | Kenya: Data Protection Act, 2019 |
|---|---|---|---|---|
| Regulator | National supervisory authority (UK: ICO) | Data Protection Commission (DPC) | Nigeria Data Protection Commission (NDPC) | Office of the Data Protection Commissioner (ODPC) |
| Register with regulator | No general duty (UK: ICO data protection fee) | Yes, data controllers register with the DPC | Data controllers and processors "of major importance" register with the NDPC | Yes, controllers and processors register with the ODPC (s.18), with a small-entity exemption |
| Breach notice to regulator | Within 72 hours of awareness, unless unlikely to risk individuals (Art. 33) | s.31 (security compromises): notify the Commission; timing and strength of the duty disputed, confirm | Within 72 hours of awareness where likely to risk individuals' rights (s.40) | Within 72 hours of awareness (s.43) |
| Breach notice to individuals | Without undue delay when high risk (Art. 34) | s.31 also names the data subject; confirm | Required where high risk; confirm wording with counsel | In writing, within a reasonably practicable period, where there is a real risk of harm |
| Subject access deadline | One month, extendable by two more for complex requests (Art. 12(3)) | Confirm (rights in ss.32 to 35) | Confirm | Confirm (see the Data Protection (General) Regulations, 2021) |
| Cross-border transfer | Chapter V: adequacy, SCCs, BCRs, or narrow derogations | Confirm with counsel | Part VIII (ss.41 to 43): adequacy of protection or another listed basis | Part VI: appropriate safeguards or another listed basis; some processing may need to stay in Kenya under the regulations |

## EU and UK GDPR

- Lawful bases (Art. 6): consent, contract, legal obligation, vital interests, public task, legitimate interests. Special category data needs an extra condition (Art. 9).
- Consent must be freely given, specific, informed, unambiguous and as easy to withdraw as to give (Art. 4(11), Art. 7).
- Children and online services (Art. 8): default age 16; member states may lower it to no less than 13. The UK uses 13.
- Records of processing (Art. 30), processor contracts (Art. 28), DPIA for high-risk processing (Art. 35), DPO in certain cases (Art. 37).
- Rights: access (Art. 15), rectification (16), erasure (17), restriction (18), portability (20), objection (21), automated decisions (22).
- Engineering impact: consent records, DSAR export, erasure across systems, a vendor list with transfer mechanisms, 72-hour breach runbook.

## Ghana: Data Protection Act, 2012 (Act 843)

- Regulator: Data Protection Commission (dataprotection.org.gh). Controllers register with the Commission, and registration is renewed periodically; confirm the current fee and renewal cycle there.
- Security (s.28): appropriate, reasonable technical and organisational measures against loss, damage and unauthorised access.
- Security compromise (s.31): where there are reasonable grounds to believe personal data was accessed or acquired by an unauthorised person, the Act provides for notifying the Commission and the data subject. Commentators disagree on how strong this duty is (some privacy maps say there is no explicit statutory requirement, only Commission guidance) and on its timing, so confirm with counsel and the DPC. Build for prompt notice anyway; do not hard-code a deadline.
- Data subject access and correction: ss.32 to 35. Confirm the response deadline before building a due-date timer.
- Engineering impact: registration evidence, security controls, a breach runbook with a named decision maker, access and correction workflow.

## Nigeria: Data Protection Act, 2023 (NDPA)

- Regulator: Nigeria Data Protection Commission (ndpc.gov.ng). It replaced the NDPR 2019 regime; check the NDPC site for its General Application and Implementation Directive (GAID) and current filing duties.
- Data controllers and processors of major importance must register with the NDPC; the NDPC publishes a register.
- Breach (s.40): processors notify the controller that engaged them; controllers notify the NDPC within 72 hours of becoming aware where the breach is likely to risk individuals' rights; keep a record of all breaches. The NDPC may make a public communication if the controller's notice to individuals is inadequate.
- Cross-border transfer (Part VIII, ss.41 to 43): allowed where the recipient is subject to adequate protection, or on another basis the Act lists. Record the basis for each vendor outside Nigeria.
- Engineering impact: breach records table, 72-hour runbook, transfer basis per vendor, registration status.

## Kenya: Data Protection Act, 2019

- Regulator: Office of the Data Protection Commissioner (odpc.go.ke).
- Registration (s.18 and the Registration Regulations, 2021): controllers and processors must register before processing. The ODPC states an exemption for entities with turnover under KES 5 million and fewer than 10 employees, unless they process for listed purposes such as health care, education or financial services. Certificates are time-limited and must be renewed.
- Breach (s.43): notify the Data Commissioner within 72 hours of becoming aware; tell affected data subjects in writing within a reasonably practicable period where there is a real risk of harm. The ODPC has enforced the 72-hour window strictly; a short preliminary notice followed by details is common practice.
- Cross-border transfer: Part VI of the Act and the Data Protection (General) Regulations, 2021. Some processing may be required to happen in Kenya; ask counsel before choosing a non-Kenyan region for that data.
- Engineering impact: registration before launch, 72-hour runbook, region choice, written notice templates.

## Countries not listed

Say so. Ask the user for the law and the regulator, and do not borrow another country's deadlines.
