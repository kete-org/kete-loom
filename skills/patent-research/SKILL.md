---
name: patent-research
description: Patent and trademark search groundwork across USPTO Patent Public Search and Trademark Search, EPO Espacenet, Google Patents and WIPO PATENTSCOPE and Global Brand Database, covering breaking an invention into searchable features, keyword and CPC classification queries, prior-art and freedom-to-operate lead lists, reading independent claims element by element, checking legal status, family and expiry, and knockout trademark screens by Nice class, with every result labelled as leads for a registered patent attorney or trademark lawyer to assess. Use when checking whether an idea looks new before filing, looking for patents that might block a product launch, mapping competitors' patent filings, summarising what a patent actually claims, or screening a brand name before adopting it.
license: MIT
compatibility: Any Agent Skills host. Needs network access to the public patent and trademark databases. Not legal advice; novelty, patentability, infringement, validity and registrability opinions need a qualified patent attorney or trademark lawyer.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: compliance
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Patent and trademark research

Find the documents a professional should look at, explain what they claim in plain language, and hand over a search record they can rely on. You produce leads and summaries; you never give an opinion that something is patentable, infringing, invalid, or free to use.

## Attorney-review gate

Every output carries: `Search leads only, not a legal opinion. Have a registered patent attorney or agent (or a trademark lawyer for marks) review before any filing, launch or licensing decision.`

**Stop and tell the user they need a qualified professional now** when:

- They plan to file, launch, invest, or respond to a demand letter based on the result.
- A lead looks close to their product or invention (a claim where most elements seem present). Do not write an infringement or validity analysis; list the lead and say why it needs review.
- They received a cease-and-desist, an infringement claim, or an office action.
- They ask whether they can safely use a mark or a technology.

Also warn the user, before they describe an unfiled invention: public disclosure can destroy patent rights in many countries (Europe has no general grace period; the US has a limited one-year inventor grace period). Keep details in a confidential setting and do not paste unpublished invention details into services the user has not approved.

## 0. Define the question

Ask, then restate:

1. Search type: novelty or prior art (before filing), freedom to operate (FTO, before launch), landscape (who files what), single-patent summary, or trademark knockout.
2. The invention or product as features: what it is, the problem it solves, how it works, each technical feature separately.
3. Jurisdictions that matter (where they will file, make or sell). FTO is per country: only patents in force there matter.
4. Dates: the user's earliest filing or disclosure date for novelty; launch date for FTO.

## 1. Build the search

1. Split the invention into 3 to 6 key concepts. For each, list synonyms, broader and narrower terms, and how a patent drafter would say it ("fastening member" for "screw").
2. Find the CPC classes: search keywords, open the most relevant hits, note the CPC codes they share, then read the class definitions on the CPC scheme (cooperativepatentclassification.org) to confirm. Search by class and keyword together.
3. Run the search in at least two databases. What each one is good for, and query syntax, are in `references/databases-and-queries.md`.
4. Follow citations both ways from the best hits (what they cite, and what cites them), and check the family to find versions in other languages and jurisdictions.
5. Record every query, database, date and number of hits. A search nobody can repeat is worth little.

Remember the blind spot: applications usually publish about 18 months after their earliest priority date, so the most recent filings cannot be found yet.

For novelty, prior art also includes non-patent literature: papers, standards, product manuals, websites. Search those too (for example Google Scholar) and note the publication date.

## 2. Screen and read

1. Screen titles, abstracts and drawings first; keep anything plausibly relevant.
2. For each kept document, read the **claims**, not the abstract. The claims define the rights; the description only explains them.
3. Find the independent claims (those that do not refer to another claim). Break each into elements (preamble, then each "comprising" feature).
4. Make a claim chart: one row per element, with where the same feature appears in the user's product or invention (for FTO) or in the prior art (for novelty). Mark each as `present`, `absent`, or `unclear`. This is a reading aid for the attorney, not a conclusion.
5. Note claim language that matters: "comprising" (open) versus "consisting of" (closed), means-plus-function language, numeric ranges.

## 3. Check status and dates

For each lead that matters for FTO:

- Granted or only an application? Applications are not enforceable until granted, and pending claims can change.
- Legal status: in force, lapsed for non-payment, expired, withdrawn, revoked. Use the official register (EP Register, USPTO Patent Center, national registers) and Espacenet's INPADOC legal status; Google Patents' status is a hint, not a record.
- Expiry: usually 20 years from the patent's filing date (in the US, from the earliest US non-provisional or PCT application whose benefit it claims; provisionals and foreign Paris Convention priority do not start the clock), adjusted for term adjustments, extensions, terminal disclaimers and lapses. Give the estimate with the reasoning, and say a professional must confirm it.
- Where it is in force: list the family members and their countries.

## 4. Trademark knockout screen

1. Identify the goods and services and their Nice classes.
2. Search identical and similar marks (spelling variants, sound-alikes, translations, design elements) in the target registers: USPTO Trademark Search (tmsearch.uspto.gov), EUIPO and national offices through TMview, and the WIPO Global Brand Database, plus common-law use (web, app stores, company registries, domain names).
3. List live marks in the same or related classes as conflicts to review; note dead marks separately.
4. A clean knockout screen does not mean the mark is available; a full clearance search and lawyer opinion are needed before launch.

## Rules

- Never say something is "new", "patentable", "not infringing", "invalid" or "free to use". Say what you found and what needs review.
- Never rely on the abstract or title for what a patent covers; read the claims.
- Never state a legal status or expiry date without the source and the date checked.
- Do not paste confidential invention details into a public search tool the user has not approved; search with generic concept terms.
- Quote claims exactly when you cite them, with the publication number and claim number.

## Report

```
Search: <type> | question: <one line> | jurisdictions: <list> | date run: <date>
Search log: database | query | hits | reviewed
Leads (most relevant first):
  <pub number> | title | assignee | priority date | status (source, date) | est. expiry | CPC | why relevant
  Claim chart for independent claim <n>: element | present / absent / unclear | where
Trademark screen: mark | register | class | status | similarity note
Gaps: unpublished applications, databases not searched, non-patent literature not covered
Search leads only, not a legal opinion. Needs review by a registered patent attorney or trademark lawyer.
```
