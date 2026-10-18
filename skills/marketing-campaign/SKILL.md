---
name: marketing-campaign
description: Builds a go-to-market or promotional campaign plan with one measurable objective, a defined audience, positioning and core message, a channel mix, a week-by-week calendar, a budget split and the metrics that decide success. Use when a founder or team is planning a product launch, a seasonal promotion, a user-acquisition push or any time-boxed marketing campaign and needs a plan they can execute and measure.
license: MIT
compatibility: Any Agent Skills host. No tools required; reads product docs or analytics exports if the user provides them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Marketing campaign plan

Produce a plan someone can run on Monday: one objective, one audience, one message, few channels, a calendar, a budget and the numbers that say whether it worked.

## 0. Brief: collect before planning

Ask for anything missing. Do not invent figures the plan depends on.

1. **Product or offer**: what is being promoted and what is new about it.
2. **Objective**: one primary outcome with a number and a date ("400 paid sign-ups by 30 June"). If the user gives several, ask which one wins when they conflict.
3. **Audience**: who buys, who uses, where they already spend attention.
4. **Budget and people**: total spend, and who will create content and run channels.
5. **Constraints**: dates, regulated claims (finance, health), markets and languages, brand rules.
6. **History**: past campaigns, current conversion rates, cost per acquisition, list sizes. If there is none, say the first campaign is also a measurement exercise.

**Stop and ask** if there is no measurable objective or no budget range. A plan without them cannot be judged.

## 1. Audience

Write one primary segment (and at most one secondary) as:

- Who they are (role, context, market).
- The problem or trigger that makes them look for a solution now.
- What they use today instead, and why it falls short.
- Where they get information (communities, platforms, publications, people they trust).

If the user has research or customer interviews, use their words. Otherwise mark the profile as an assumption to test.

## 2. Positioning and message

- **Positioning statement**: For <audience> who <need>, <product> is the <category> that <key benefit>, unlike <alternative>, because <proof>.
- **Core message**: one sentence a customer could repeat.
- **Three proof points**: facts, numbers, customer quotes or demos. No unprovable superlatives.
- **Call to action**: one action per touchpoint (sign up, book a demo, buy).

If the brand has a voice guide, apply it; the `brand-voice` skill covers that.

## 3. Channels

Pick two to four channels the audience actually uses and the team can sustain. For each, record its role in the funnel:

| Channel | Role | Owned / earned / paid | Content needed | Owner |
|---|---|---|---|---|

Decision rules:

- Owned first (email list, existing users, website, social accounts): cheapest, fastest feedback.
- Paid only with tracking in place (UTM parameters on every link, conversion events firing) and a test budget before the main spend.
- Earned (press, partners, communities, creators) needs lead time; start outreach before launch week.
- Drop a channel nobody on the team can run every week.

## 4. Calendar

Lay out the campaign in phases with dates:

1. **Prepare** (assets, landing page, tracking, audiences, outreach).
2. **Warm-up** (teasers, waitlist, partner briefings).
3. **Launch** (the main push; concentrated activity across channels).
4. **Sustain** (follow-ups, retargeting, case studies, reminders).
5. **Review** (results, learnings, decision on what continues).

Give each item a date, channel, asset, owner and status. A week-by-week table is enough.

## 5. Budget split

- Allocate by role: content production, paid media (spend a small test slice first and scale only the channels that hit the cost-per-result ceiling), tools, partners or creators, contingency.
- State the assumed cost per result for each paid channel and where the assumption came from (history, the user, or a guess to validate).
- Show the arithmetic from budget to expected results. If the expected results miss the objective, say so and propose either a smaller objective or more budget. Do not pad the numbers to make it fit.

## 6. Success metrics

- One **primary metric** tied to the objective.
- Two to four **leading indicators** per stage (reach, click-through, sign-up rate, activation) with a target.
- **Guardrails**: cost per acquisition ceiling, unsubscribe or complaint rate, refund rate.
- How each metric is measured (tool, event name, UTM convention) and when it is reviewed.
- A decision rule: "If cost per sign-up exceeds X after the test budget, pause the channel and reallocate."

## Rules

- Never fabricate benchmarks, conversion rates or audience sizes. Use the user's data or label a figure as an assumption.
- Never recommend buying email lists, spamming communities, fake reviews or undisclosed paid endorsements. Follow consent rules for email and SMS in the target markets, and ask the user to confirm them.
- Keep it executable by the stated team. Fewer channels done well beats many done badly.

## Output format

```
# Campaign plan: <name>
Objective: <metric, target, date>
Audience: <primary segment>
Core message: <one sentence>  | CTA: <action>

## Positioning and proof points
## Channels (table)
## Calendar (week-by-week table)
## Budget (table with arithmetic to expected results)
## Metrics, guardrails and decision rules
## Assumptions to validate
## Risks and open questions
```
