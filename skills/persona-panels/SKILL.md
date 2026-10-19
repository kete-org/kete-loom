---
name: persona-panels
description: Synthetic customer persona panels for early concept, message and naming checks - builds each persona from the user's real research (interviews, reviews, support tickets, CRM segments) where it exists and labels anything invented, asks every persona the same stimulus in a separate isolated run so answers cannot echo each other, collects reactions, objections and confusion points, and reports them as hypotheses to confirm with real users, never as evidence or predicted conversion. Use when someone wants simulated buyers or users to react to a landing page draft, value proposition, feature concept or ad copy before spending money on real research, or asks to "test this on a few personas".
license: MIT
compatibility: Any Agent Skills host. Isolated runs work best with a host that can start subagents or separate sessions; otherwise run each persona in a fresh context one at a time.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Persona panels

A cheap first pass at how different customers might react to something, so real research can focus on the right questions. A model playing a customer is a hypothesis generator. It does not know your market, it agrees too easily, and it cannot tell you what people will pay or do.

Say this to the user once, at the start, in one sentence.

## When a panel helps, and when it doesn't

| Good use | Bad use |
|---|---|
| Spot confusing wording or jargon in copy | Decide whether to build a product |
| List objections a segment might raise | Estimate conversion, willingness to pay or market size |
| Compare how two framings land with different roles | Replace interviews, usability tests or A/B tests |
| Prepare questions for real interviews | Anything about health, legal, money advice or protected groups as "evidence" |

If the user wants a bad use, say why and offer the right tool: real interviews (`product-discovery`), an experiment (`conversion-optimization`), or market sizing (`market-research`). For a contested internal decision rather than customer reactions, `decision-council` fits better.

## Workflow

### 1. Gather grounding

Ask what real material exists: interview notes, reviews, support tickets, sales call notes, survey answers, analytics segments. Read it. Strip personal data; personas are composites, never a copy of one real person.

If there is none, you may proceed, but every persona is marked **Ungrounded** and the report says so at the top.

### 2. Build 4 to 6 personas

One card each:

```
Name / role: (fictional) Ama, finance lead at a 40-person agency
Grounded in: interviews 3, 7, 8; 14 support tickets tagged "export"   (or: Ungrounded)
Job to be done: close the month without chasing account managers
Current tools and workarounds: spreadsheets, bank exports, Slack reminders
Pressures: audit date, small team, CEO wants numbers by day 5
Buying role: decides / influences / uses
Likely sceptic of: tools that need everyone else to change habits
Language they use: (verbatim phrases from the sources)
```

Include at least one sceptic and one persona outside the core segment. Avoid stereotypes based on age, gender, ethnicity or nationality; vary roles, contexts and constraints instead. Show the cards to the user and ask for corrections before running the panel.

### 3. Fix the stimulus and questions

Freeze exactly what each persona sees (copy, screenshot description, concept paragraph) and the same question set:

1. In your own words, what is this and who is it for?
2. What is the first thing you'd do next, if anything?
3. What's unclear or makes you suspicious?
4. What would stop you from trying it?
5. What would you compare it to?

No leading questions, and never tell the persona what the team hopes to hear.

### 4. Run each persona in isolation

- Each persona gets its own fresh run (subagent, separate session, or a new context) containing only its card, the stimulus and the questions.
- Never show one persona another's answers. Never run all personas in one prompt; they converge.
- Instruct each run to stay in character, answer from its own context, and say "I don't know" rather than invent facts about the product.
- For an A/B comparison, give each persona variant A and variant B in separate runs, randomise order, and don't reveal that there are two.

### 5. Synthesise

- Count, per question, how many personas raised each theme; quote them.
- Separate *comprehension* problems (they misread it) from *preference* problems (they read it and didn't like it); the first kind is what panels catch best.
- Note where grounded and ungrounded personas disagree; trust grounded ones more.
- Turn each finding into a question or test for real users.

## Never

- Report percentages as if the panel were a sample ("67% of users prefer B").
- Present panel output as customer quotes, research findings or validation in a deck or PRD.
- Pass a real person's identifiable details into a persona.

## Report format

```
# Persona panel: <stimulus>
Status: Hypotheses only - not customer evidence. Grounding: <sources> / Ungrounded
Panel: <names, roles, grounded or not>
Comprehension issues: <issue - who raised it - quote>
Objections: <objection - who - quote>
Differences between personas: ...
Suggested copy or concept changes: ...
What to check with real users: <question - method (interview, usability test, A/B test) - who to recruit>
```
