---
name: conversion-optimization
description: Conversion rate optimisation for landing pages, sign-up and checkout funnels - finding the leaking funnel step from analytics, auditing message match between ad or email and page, friction in forms and pricing pages, trust and clarity problems, then turning fixes into A/B tests with one pre-registered primary metric, guardrail metrics, a sample size and run length computed before launch, a sample-ratio check, and no peeking or stopping early on a lucky day. Use when sign-ups, trials or purchases are lower than expected, a landing or pricing page needs a conversion review, someone wants to A/B test a page change, or needs to read an experiment result honestly.
license: MIT
compatibility: Any Agent Skills host. Works from page URLs or source code, screenshots and analytics exports the user provides; running experiments needs the team's own testing or feature-flag tool.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Conversion optimisation

Find where people drop out, fix the cause, and prove the fix worked with a test that was planned before it started. Search visibility is the `seo-audit` skill; dashboard design is `metrics-dashboards`; campaign planning is `marketing-campaign`.

## Ground rules

1. **Diagnose before redesigning.** Find the step with the biggest absolute loss first. Polishing a page few people reach wins nothing.
2. **One primary metric per test,** chosen before launch and tied to the business goal (paid sign-up, not button click). Guardrails watch what must not get worse (refunds, support contacts, page speed, downstream activation).
3. **Sample size and run length before launch.** Full weeks only (at least one, usually two), to cover weekday cycles.
4. **No peeking.** Don't stop when the dashboard turns green. Stop at the planned sample, or use a method designed for continuous monitoring (sequential test, Bayesian with a pre-set decision rule) and say which.
5. **Low traffic changes the plan.** If the needed sample takes more than about 6 to 8 weeks, don't A/B test small tweaks; ship clear fixes for obvious problems, test only bold changes, or measure with before/after plus qualitative checks, and say the evidence is weaker.

## Workflow

### 1. Map the funnel

Ask for or compute, per step, for a recent full period: visitors, completions, step conversion, and absolute drop-off. Segment by device, traffic source and new versus returning. A step that is fine on desktop and broken on mobile is a bug, not a CRO problem.

Check tracking first: events firing twice, missing on one platform, or a step that redirects past the event will fake a leak.

### 2. Audit the leaking step

Go through `references/page-audit.md`. The core questions:

- **Message match:** does the headline repeat the promise of the ad, email or search result that brought people here? Same offer, same words, same price.
- **Clarity in five seconds:** what is it, who is it for, what do I do next. One primary call to action.
- **Friction:** form fields that could be dropped or asked later, forced account creation before value, surprise costs at the last step, error messages that wipe input, slow load (largest contentful paint) on mobile.
- **Trust:** real proof near the decision point (named customers, reviews, guarantees, security and refund terms), no fake urgency.
- **Pricing page:** plans are comparable at a glance, the recommended plan is clear, monthly versus annual maths shown, what happens at trial end stated.

Write each finding as: problem, evidence (screenshot, analytics number, session recordings, user quote), proposed fix, expected effect on the primary metric, effort.

### 3. Prioritise

Fix-now list: bugs and obvious friction (broken mobile layout, a field nobody needs). Test list: changes where the outcome is uncertain. Rank the test list by expected impact x confidence / effort and show the inputs.

### 4. Plan the test

Fill the plan in `references/experiments.md` before any code ships: hypothesis, primary metric and its exact definition, guardrails, minimum detectable effect, alpha, power, sample per variant, run length, audience, traffic split, stop rule, and what decision each outcome leads to. Get the user to sign it off.

Implementation checks: assignment is random and sticky per user, both variants log the same events, the variant renders without a flash of the original, bots and internal traffic are excluded.

### 5. Read the result

1. **Sample ratio mismatch first.** If a 50/50 split comes in at 52/48 on large numbers, a chi-square test will flag it; stop and find the bug before reading anything else.
2. Report the primary metric's difference with a confidence (or credible) interval, not just a p-value.
3. Check guardrails.
4. Segment results are hypotheses for the next test, not wins; with many segments one will look significant by chance.
5. Decide as the plan said. Inconclusive is a valid result: keep the simpler variant.

## Stop and ask the user

- Before changing prices, plan limits, refund terms or legal copy; those are business and legal decisions.
- Before adding urgency timers, scarcity claims or pre-ticked boxes: they can break consumer protection law and trust.
- When the result contradicts guardrails (more sign-ups, more refunds).
- When the test needs personal data that the privacy policy or consent banner doesn't cover.

## Never

- Declare a winner from a test stopped early, below planned sample, or with a sample ratio mismatch.
- Use dark patterns: hidden costs, confirm-shaming, disguised ads, cancellation mazes.
- Report "conversion up 40%" without the base numbers and interval.

## Output

A CRO report: funnel table with the leak marked, findings (problem, evidence, fix, effort), fix-now list, ranked test backlog, and one fully filled test plan. After a test: the result summary in the template from `references/experiments.md`.
