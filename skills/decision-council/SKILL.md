---
name: decision-council
description: Runs a council of independent viewpoints on one hard call, giving several role-played advisers or separate models (or providers) the same brief in isolation so none sees another's answer, then cross-examining their positions and synthesising a single recommendation that records the strongest dissent, the confidence level and what evidence would change the outcome. Use when facing an ambiguous or contested choice, a go/no-go or launch call, a build-versus-buy or vendor pick, or whenever the user asks for a second opinion, a devil's advocate, a panel or a debate before committing.
license: MIT
compatibility: Any Agent Skills host. Works with role-played perspectives in one session; independent subagents or a second model or provider give stronger independence where the host supports them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Decision council

One model asked once tends to agree with the framing it was given. A council gets several independent answers to the same brief, then weighs them openly, so the decision shows its disagreements instead of hiding them.

Use it for decisions, not for tasks with a checkable answer (run the test instead), and not for code review (use a reviewer agent or `/dual-review`). To write up the outcome as a permanent record, hand the result to `architecture-decision-records`.

## 1. Frame the decision

Write a brief of at most one page and show it to the user before convening anyone:

- **Question**: one sentence, phrased as a choice ("Ship v2 on 1 March, or slip to April?").
- **Options**: two to four concrete options, including "do nothing" or "delay" where real.
- **Criteria**: what matters, in priority order (cost, risk, time, reversibility, user impact, compliance).
- **Facts**: the evidence available, with sources. Mark assumptions as assumptions.
- **Constraints**: deadlines, budgets, non-negotiables.
- **Reversibility**: how hard the choice is to undo. Easily reversible decisions rarely need a council; say so and stop if this is one.

Keep the brief neutral. Don't state your own lean, and don't order options so the preferred one comes first or last every time.

If the question or the options are unclear, stop and ask the user rather than guessing.

## 2. Choose the members

Pick three to five members. Choose perspectives that would genuinely disagree:

- **Roles**, for example: the operator who must run it, the customer, the finance owner, the security or compliance reviewer, the skeptic whose job is to argue against the leading option, the engineer who builds it.
- **Different models or providers**, where available, to reduce shared blind spots. Note the model name for each member.
- Always include one member assigned to argue the strongest case against whatever looks like the default option.

For regulated, legal, medical or financial decisions, a role-played expert is not a qualified opinion. Say this in the result and name who must actually review it.

## 3. Keep them independent

Independence is the whole point; protect it:

1. Give every member the same brief, word for word, plus their role. Don't pass any member another's answer in this round.
2. Run members in separate contexts (separate subagents, separate sessions or separate model calls) when the host allows. If only one context is available, write each member's answer in full before starting the next, and don't revise earlier answers.
3. Ask each member for the same fixed format:

```
Position: <option>
Confidence: low | medium | high
Top 3 reasons: ...
Biggest risk of my position: ...
What would change my mind: ...
```

4. Don't let members search for or cite each other. Facts they introduce must come with a source; unsourced claims are flagged in synthesis.

## 4. Cross-examine

One round only, to stop the council drifting into consensus by attrition:

- Show each member the other positions, anonymised (Member A, B, C).
- Ask each: which argument against your position is strongest, and does it change your position? Record any change and why.
- Ask the assigned skeptic to attack the current majority view.

## 5. Synthesise

You, as chair, write the recommendation. Rules:

- Weigh arguments against the criteria from the brief, not by headcount. A single member with a decisive fact beats a majority without one.
- Check that every factual claim the recommendation relies on is in the brief or sourced. Drop or flag the rest.
- Keep dissent visible. Never smooth a real disagreement into "all members broadly agree".
- Confidence is about the decision, not the members: high only if the main arguments survived cross-examination and the facts are solid.
- If the council splits evenly or confidence is low, say so and name the one piece of evidence that would settle it, instead of forcing a pick.

## Never

- Never present the council's output as the user's decision; the user decides.
- Never invent expert credentials, data or quotes for a member.
- Never rerun the council until you get the answer you or the user wanted; if new facts arrive, revise the brief and say what changed.

## Report

```
## Decision: <question>
Recommendation: <option>   Confidence: low | medium | high
Why: <three bullet points tied to the criteria>
Members: <role or model> → <position> (<confidence>), one line each; mark changes after cross-examination
Strongest dissent: <argument, who holds it, why it did not prevail>
Key risks and mitigations: <bullets>
Would change the call: <specific evidence or event>
Assumptions: <list>
Needs qualified review: <who, or "none">
```
