# Regulatory boundaries for clinical software

This is a map of questions to raise, not a determination. Regulatory affairs or counsel decides whether a product is a medical device, and the rules change: check the current text of each source before relying on it.

## United States (FDA)

- Basis: section 520(o)(1)(E) of the FD&C Act (added by the 21st Century Cures Act) excludes some CDS software from the device definition. FDA's "Clinical Decision Support Software" guidance explains how it reads the criteria; FDA lists a final version dated January 2026, which replaced the September 2022 version. Secondary summaries say it relaxed FDA's position on software that gives a single recommendation and refined its approach to time-critical use. Read the FDA text itself before relying on either point.
- All four criteria must be met for the exclusion:
  1. Not intended to acquire, process or analyse a medical image, a signal from an in vitro diagnostic device, or a pattern or signal from a signal acquisition system.
  2. Intended to display, analyse or print medical information about a patient or other medical information (such as peer-reviewed studies and guidelines).
  3. Intended to support or provide recommendations to a healthcare professional about prevention, diagnosis or treatment.
  4. Intended to enable the healthcare professional to independently review the basis for the recommendations, so they don't rely primarily on the software.
- Red flags that push toward device regulation: image or waveform analysis; patient- or caregiver-facing recommendations; time-critical alerts; outputs a clinician cannot independently check (opaque ML); automatic actions.
- Related: FDA guidance on device software functions and mobile medical applications, and general wellness products, describe other functions FDA does or does not focus on.

## European Union (MDR 2017/745)

- Software intended by its manufacturer for a medical purpose (diagnosis, prevention, monitoring, prediction, prognosis, treatment) can be a medical device (MDR Article 2). MDCG 2019-11 is the guidance on qualifying and classifying software.
- Annex VIII Rule 11: software that provides information used to take decisions with diagnostic or therapeutic purposes is class IIa; class IIb where those decisions could cause a serious deterioration of health or a surgical intervention; class III where they could cause death or an irreversible deterioration. Few decision support products are class I under the MDR.
- The EU AI Act also applies to AI systems that are, or are safety components of, devices requiring notified-body assessment.

## United Kingdom

- Medical devices: MHRA under the UK MDR 2002 (as amended); MHRA publishes guidance on software and AI as a medical device.
- NHS clinical safety (applies to health IT deployed in the NHS in England whether or not it is a device): DCB0129 for manufacturers and DCB0160 for deploying organisations. They require a clinical risk management process, a hazard log, a clinical safety case report and a named Clinical Safety Officer (a registered clinician).

## Other markets

Check the national regulator (for example Health Canada, TGA in Australia, and national authorities across Africa and Asia). Many follow IMDRF "Software as a Medical Device" concepts, which classify by the significance of the information to the decision and the state of the condition.

## Engineering practices that help in every regime

- A written intended-use statement for each feature.
- A hazard log: what could go wrong (wrong patient, wrong unit, missing data, outage), severity, likelihood, mitigations, residual risk.
- Traceability from requirement to rule version to test case to release.
- Software lifecycle practices aligned with IEC 62304 and risk management with ISO 14971 where the product is, or may become, a device.
- Post-release monitoring of fire rates, overrides and incidents, with a route to report safety issues.
