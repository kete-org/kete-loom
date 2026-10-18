---
name: brand-strategy
description: Brand identity strategy run as a structured interview, one question block at a time, covering purpose, positioning against named alternatives, the primary audience and their job to be done, three to five values tied to behaviours, personality traits and a naming brief, then written up as a one-page brand brief with open questions marked. Use when a founder or team is starting or rebranding a company or product and needs its positioning, audience, values and personality decided before voice guides, names, logos or campaigns are made.
license: MIT
compatibility: Any Agent Skills host. No tools needed beyond reading what the user shares and writing the brief.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Brand strategy

Turn what the founders know (and argue about) into a short brand brief that later work can build on: the `brand-voice` guide, a naming round, a logo brief, a `marketing-campaign` plan. The brief records decisions, not adjectives.

## Ground rules

1. **Interview, don't invent.** Every line in the brief traces to something the user said or chose. Where you propose wording, mark it as a proposal until they accept it.
2. **One block at a time.** Ask the questions for one block, wait, play back what you heard in two or three lines, then move on. Never send all the questions at once.
3. **Specific beats aspirational.** "Innovative, trusted, customer-first" fits every company and decides nothing. Push each answer until it would exclude someone or something.
4. **Name the alternative.** Positioning only means something against what the customer would do instead (a named competitor, a spreadsheet, a cousin who does it for free, doing nothing).
5. **Evidence over hope.** If an answer about customers is a guess, say so and record it as an assumption to test, not a fact.

## Before you start

Ask for anything that already exists: pitch deck, website, customer interviews, reviews, sales call notes, a competitor list, an earlier brand doc. Read it first and skip questions it already answers; confirm those answers instead of asking again.

Confirm the scope: a company brand, a product brand under a parent, or a rebrand. For a rebrand, ask what is wrong with the current brand and what must survive (name, colour, equity customers recognise).

## The interview

Work through these blocks in order. Each has a goal; the questions are a starting point, so follow up where answers are vague.

1. **Purpose.** Why the business exists beyond revenue, and what changes for customers if it succeeds. Ask: "What would your best customers lose if you shut down tomorrow?" and "What do you refuse to do even if it would make money?"
2. **Audience.** One primary audience, described by situation and job to be done, not demographics alone. Ask who buys, who uses, who blocks the purchase, what triggers them to look for a solution, and what they use today. If they name three equal audiences, ask which one they would serve if they could only serve one.
3. **Positioning.** Fill the frame: *For [audience] who [need or trigger], [brand] is the [category] that [key benefit], unlike [named alternative], because [reason to believe].* Ask for the proof behind the "because" (a feature, a number, a process, a founder fact).
4. **Values.** Three to five values, each with a behaviour that shows it and a trade-off it implies ("Plain speaking: we tell customers about a fee before they find it, even when it costs a sale"). Drop any value nobody can give a behaviour for.
5. **Personality.** Three to five traits as "this, not that" pairs on sliders (playful to serious, expert to peer, bold to calm). Ask: "If the brand were a person at a dinner party, who would it be, and who would it never be?" This feeds `brand-voice`; do not write the voice guide here.
6. **Naming brief** (only if a name is needed or under review). Capture what the name must signal, what it must avoid, markets and languages it must work in, the preferred name type (descriptive, invented, metaphor, founder, acronym), length, and must-haves such as a .com or a matching handle. Generate candidates only if asked, and never present one as available.
7. **Proof and constraints.** Claims the brand can make today with evidence, claims it cannot make yet, regulatory limits on claims in its sector, and existing assets that must be kept.

## Decision rules

- Two founders disagree on a block: record both positions side by side and ask them to choose. Do not average them into a vague middle.
- The user wants to be everything to everyone: show what each audience would need the positioning to say; usually the conflict makes the choice obvious.
- No reason to believe exists yet: keep the positioning but list the proof as a gap to build.
- A value or trait contradicts how the business actually behaves (for example "transparent" with hidden fees): say so plainly and ask which one changes.

## Stop and ask the user

- Before writing the brief, if any of purpose, primary audience or positioning is still undecided.
- Before suggesting a name be used publicly: trademark clearance and domain checks are needed, and clearance in each market is a job for a trademark professional, not this skill.
- If a positioning claim is a comparative or health, financial or environmental claim, flag that it may need legal review before it is published.

## Never

- Never fill the brief with stock adjectives the user did not choose.
- Never claim a name is free to use, trademarked or not, or that a domain is available, without a check the user can see.
- Never design logos, colour palettes or typography here; write the brief a designer would work from.

## Output: the brand brief

Write one page in Markdown (to a file if the user wants one), in this shape:

```
# <Brand> brand brief  (v<n>, <date>)

Purpose: <one sentence>
Primary audience: <situation + job to be done>; secondary: <if any>
Positioning: For ... who ..., <brand> is the ... that ..., unlike ..., because ...
Proof: <evidence for the "because">; gaps: <proof still to build>
Values: <value>: <behaviour> / <trade-off>   (3-5 lines)
Personality: <this, not that>   (3-5 pairs)
Naming brief: <must signal / must avoid / markets / type / constraints>  (if in scope)
Can claim today: ...   Cannot claim yet: ...
Keep from current brand: ...
Assumptions to test: ...
Open questions: ...
Next: brand-voice guide, naming round, visual identity brief, campaign plan
```

Close by listing which open questions block the next step, and which items are proposals the user has not yet accepted.
