---
name: cold-outreach-sequences
description: Plans, writes and runs B2B cold outreach sequences to prospects who have not opted in - picking an ideal customer profile and a narrow segment, researching a genuine reason to write to each person, drafting short multi-touch email and LinkedIn steps with sensible spacing, staying within CAN-SPAM, GDPR and PECR, and judging results by positive replies and meetings rather than opens. Use when a founder or sales team wants an outbound prospecting sequence written or reviewed, asks why cold emails get no replies, or needs to know whether emailing a bought list of business contacts is allowed.
license: MIT
compatibility: Any Agent Skills host. Works from the user's prospect list, product notes and sending tool; it writes copy and plans and does not send email itself.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Cold outreach sequences

Write to a small number of well-chosen people with a reason that is true for each of them, ask for one easy next step, stop when they say no, and measure what actually produces meetings.

This skill gives working rules, not legal advice. For anything beyond routine B2B prospecting (consumer lists, health or financial data, a regulator complaint, a new country), the user must check with a qualified privacy lawyer.

## Ground rules

1. **Narrow beats big.** One segment per sequence: a role, a company type and a trigger (hiring for X, just raised, new regulation, uses tool Y). If you cannot say why this group needs the product now, stop and ask the user.
2. **Personalisation must be real and checkable.** Reference something the person or company actually did or published, with the source noted. Never invent a mutual connection, a compliment, a past conversation or a "saw your post" you have not seen. A merge field with their company name is not personalisation.
3. **One ask, small.** A reply, a 15-minute call, or permission to send something. No calendar link in the first email unless the user insists.
4. **Short.** First email under about 120 words, plain text, no images or attachments, at most one link. Follow-ups shorter.
5. **Stop on any reply** that is negative, an out-of-office with a leaving date, or a request to stop. Suppress them across every tool and sender.
6. **Protect the main domain.** Cold mail goes from a separate, authenticated domain or subdomain at modest daily volume per mailbox. Setting up SPF, DKIM, DMARC and warm-up belongs to the email-deliverability skill.

## Compliance checks (before any copy)

Ask where recipients are based and where the sender is based, then apply each that fits:

| Rule | What it requires for cold B2B email |
|---|---|
| US CAN-SPAM | No B2B exemption. Truthful From, Reply-To and routing headers; a subject that matches the content; identify the message as an ad where it is one; a valid physical postal address; a clear opt-out that works for at least 30 days, honoured within 10 business days, with no fee or login. |
| EU GDPR | A named work address is personal data. Most cold B2B outreach relies on legitimate interests: write a short legitimate-interests assessment, keep only data needed, tell them where you got their details (Article 14) no later than the first message you send them, and honour objections at once (Article 21). Country e-privacy laws vary; some require prior consent even for B2B. Germany's UWG § 7(2) No. 2 requires prior express consent for email advertising to any addressee, business or consumer (the § 7(3) existing-customer exception aside). |
| UK PECR + UK GDPR | Emailing corporate subscribers (limited companies, LLPs, public bodies) without consent is allowed if you identify yourself and give an opt-out. Sole traders and some partnerships count as individuals and need consent. UK GDPR still applies to named work addresses. The ICO says this guidance is under review after the Data (Use and Access) Act 2025; check the current version at ico.org.uk. |
| Canada CASL | Stricter: generally needs consent. Implied consent has narrow cases, such as an address the person conspicuously published without a "no unsolicited messages" statement, where the message is relevant to their business role (CASL s. 10(9)(b)). Stop and ask the user to confirm with counsel before emailing Canadian prospects. |

**Stop and ask the user** if the list was bought or scraped and its source is unknown, if it contains personal (non-work) addresses, or if recipients are consumers. Do not write a sequence for those until the user confirms the legal basis.

## Steps

1. **Define the segment.** Write the ICP in one line, the trigger, the problem they likely have, and the proof you have (customer result, number, named customer the user may cite). Ask the user for proof if there is none; never make up results.
2. **Check the list.** Required fields: name, role, company, work email, source, country, and one research note per person. Remove role addresses (`info@`, `sales@`), personal addresses, existing customers, open deals and anyone on the suppression list. Verify addresses with the user's verification tool before sending.
3. **Research each prospect** for 2 to 5 minutes: recent company news, job posts, their own posts or talks. Record one fact and its URL. If nothing relevant turns up, use the segment-level trigger honestly instead of faking a personal line.
4. **Write the sequence.** Default shape (adjust to the user's market):

| Step | Day | Channel | Purpose |
|---|---|---|---|
| 1 | 0 | Email | Specific reason, the problem, one proof point, small ask |
| 2 | 3 | Email (same thread) | One new angle or useful resource, no "just bumping this" |
| 3 | 7 | LinkedIn (view, then connection request with no pitch) | Familiarity, optional |
| 4 | 10 | Email | Short case or number relevant to their trigger |
| 5 | 17 | Email | Polite close: "should I stop writing about this?" |

   Four or five touches over two to three weeks is enough. Send on weekdays in the prospect's time zone.
5. **Write each email** as: subject (2 to 5 words, lower-case is fine, no clickbait or "Re:" on a first message), opening line from the research note, one sentence on the problem in their words, one proof sentence, the ask, signature with the sender's real name, company, postal address and an opt-out line.
6. **Review every draft** against the checklist below before handing it over.
7. **Run a pilot** of 50 to 100 prospects. Change one thing at a time (segment, opening, offer) between batches.
8. **Measure.** Track per step and per segment: delivered, bounced, replied, positive replies, meetings booked, opt-outs. Ignore open rates (Apple Mail Privacy Protection and image blocking make them unreliable). Rules of thumb (not provider or legal limits): bounce rate above about 3% suggests the list is bad; positive replies under about 1% after 200 sends suggests the segment or offer is wrong, not the wording.

## Draft checklist

- Is the personal line true, and is its source recorded?
- Could this email be sent unchanged to 1,000 other people? If yes, rewrite.
- One ask only? No attachments, tracking-heavy links or images?
- Sender identity, postal address and opt-out present?
- Any claim, number or customer name the user has not confirmed? Remove it.
- No fake urgency, fake "Re:" or "Fwd:", or guilt-tripping in the break-up email.

## Never

- Send from the company's main domain at volume, or rotate many lookalike domains to dodge spam filters.
- Keep emailing someone who asked to stop, or re-add them through another tool or sender.
- Scrape personal data in breach of a site's terms, or guess personal email addresses.
- Automate LinkedIn connection requests or messages beyond what LinkedIn permits.

## Output format

```
Segment: role / company type / trigger        Region(s): ...   Legal basis: ...
Proof points used: ... (user-confirmed)
Sequence: step, day, channel, subject, body (per step)
Personalisation notes: prospect -> fact -> source URL
Compliance: footer text, opt-out method, suppression handling
Pilot plan: batch size, what is being tested, metrics and thresholds
Open questions for the user: ...
```

Primary sources: FTC CAN-SPAM guide (https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), ICO electronic mail marketing (https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/), UWG § 7 (https://www.gesetze-im-internet.de/uwg_2004/__7.html), CASL s. 10 (https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html).
