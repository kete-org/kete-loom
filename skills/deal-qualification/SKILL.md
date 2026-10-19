---
name: deal-qualification
description: Seller-side qualification and coaching of B2B opportunities already in the pipeline, using MEDDICC or BANT evidence - quantified pain and metrics, the economic buyer, decision criteria and decision process, paper process, a tested champion, competition, and a dated mutual next step - scoring each element by the evidence behind it, raising risk flags, and running a deal review that separates what the buyer has said or done from what the rep hopes. Use when a sales rep, founder or manager wants to know whether a deal is real, prepare a pipeline or forecast review, decide whether to keep pursuing an opportunity, or plan the next call to close evidence gaps.
license: MIT
compatibility: Any Agent Skills host. Works from call notes, emails, CRM opportunity records or transcripts the user provides.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Deal qualification

A deal is qualified by what the buyer has said and done, not by how the rep feels. This skill turns notes about one opportunity into an evidence-scored qualification, a list of risks, and the questions for the next call. Finding new accounts is `prospect-research`; first-touch emails are `cold-outreach-sequences`.

## Frameworks

Use the one the team already uses; default to MEDDICC for deals with several stakeholders and BANT for short, single-buyer sales.

| MEDDICC element | Qualified means |
|---|---|
| Metrics | The buyer has stated the measurable outcome and its size (hours saved, revenue, risk avoided), in their numbers |
| Economic buyer | The person who can approve the spend is named, and someone on your side has spoken to them |
| Decision criteria | The buyer's written or stated criteria are known, and you know how you rank on them |
| Decision process | The steps, people and dates from now to signature are mapped and confirmed by the buyer |
| Identify pain | A specific, current problem with a cost and a reason to act now |
| Champion | An insider with influence who has taken action for you (shared information, arranged a meeting), not just a friendly contact |
| Competition | Alternatives are known, including doing nothing and building in-house |

MEDDPICC adds **Paper process**: legal, procurement, security review and signature steps with their lead times. BANT covers Budget, Authority, Need and Timeline; treat each as unqualified until the buyer has confirmed it.

## Evidence levels

Score each element 0 to 3:

- **0 Unknown**: nothing recorded.
- **1 Assumed**: the rep believes it; no buyer statement.
- **2 Stated**: the buyer said it (cite the call or email and date).
- **3 Confirmed**: the buyer acted on it or put it in writing (a mutual plan, a budget line, an introduction to the economic buyer, a security questionnaire sent to you).

Only levels 2 and 3 count as evidence. Quote or reference the source for each.

## Steps

1. **Collect the record**: opportunity value, stage, close date, call notes, emails, transcripts, org chart. Stop and ask if there is nothing written from the buyer side; a deal review cannot rest on memory alone.
2. **Fill the framework** element by element with the evidence level and its source. Write "unknown" rather than filling a gap with a guess.
3. **Test the champion**: has this person given you information you could not get elsewhere, introduced you upward, or argued your case internally? If not, record them as a contact, not a champion.
4. **Check the next step**: is there a dated, buyer-agreed next meeting with a named purpose? A deal with no next step on the calendar is stalled whatever its stage says.
5. **Raise risk flags** (below).
6. **Score the deal**: total evidence points out of the maximum, list the weakest elements, and compare the CRM stage and close date with the evidence. Say plainly when the stage is ahead of the evidence.
7. **Plan the next call**: three to five questions that would move the weakest elements to level 2 or 3, phrased as open questions to the buyer, and the action that would confirm each answer.
8. **Recommend**: advance, hold and close the gaps by a date, or disqualify. Disqualifying early is a good outcome; say so.

## Risk flags

- No access to the economic buyer, or the only contact is an evaluator with no budget.
- Pain described in the seller's words, never the buyer's; no cost of inaction.
- Close date set by the seller's quarter end, not the buyer's event.
- Close date moved more than once.
- Procurement, legal or security review not started within weeks of the close date.
- The buyer is running a formal RFP you did not help shape.
- Single-threaded: one contact; if they leave, the deal goes too.
- Discount offered before the decision process is known.
- Silence after a proposal with no agreed review date.

## Stop and ask the user

- Before recording a stage change or forecast category in a CRM: the rep or manager decides.
- When notes contain personal opinions about named individuals: keep the review to business facts.

## Never

- Invent buyer quotes, names, budgets or dates.
- Score an element above 1 without a cited buyer statement or action.
- Coach the rep to pressure or mislead a buyer; good questions and honest disqualification beat both.

## Report format

```
# Deal review: <account> - <opportunity>, <value>, stage <stage>, close <date>
Framework: <MEDDICC | MEDDPICC | BANT>

| element | evidence level (0-3) | evidence (source, date) | gap |
Score: <points>/<max>   Stage vs evidence: <consistent | ahead by n stages>

## Risk flags
- <flag> - <evidence>

## Next call: <date or "none booked">
1. <question> -> confirms <element> -> <action that would prove it>

## Recommendation
<advance | hold until <date> to close <gaps> | disqualify>, because <reason>.
```
