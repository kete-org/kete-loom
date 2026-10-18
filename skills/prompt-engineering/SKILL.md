---
name: prompt-engineering
description: Writes, diagnoses and rewrites production prompts for language models, using clear task instructions with the context the model lacks, a few well-chosen examples, an explicit output format, splitting a hard job into chained steps, and proving each revision against a fixed set of test inputs before it ships. Use when drafting a system prompt for a new feature, fixing a prompt that gives inconsistent or off-format answers, shortening a bloated prompt, or comparing two prompt versions.
license: MIT
compatibility: Any Agent Skills host. Model- and provider-neutral.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Prompt engineering

A production prompt is code: it has a spec, a version and tests. This skill is for the words sent to the model. For the surrounding code (retries, schemas, caching) use `llm-app-patterns`; for building a full eval suite and graders use `llm-evals`.

## 0. Gather before writing

1. Find the current prompt in the codebase (search for the system prompt string, prompt templates or a `prompts/` folder) and how it is versioned and called.
2. Collect 5 to 20 real inputs: a few typical, a few hard, at least one adversarial or empty. Pull them from logs or ask the user. If none exist and the user can't provide any, write them yourself and say so.
3. Write down what a good output looks like for each input (or the rule that decides it). If you can't say what "good" is, **stop and ask the user**; no rewrite can fix an undefined target.
4. Run the current prompt on that set and record the outputs. This is the baseline.

## 1. Structure of a prompt

Write in this order, keeping stable parts first so they can be cached:

1. **Role and goal**: one or two sentences on who the output is for and what it is used for. Purpose beats persona.
2. **Context**: facts the model can't know: the product, the audience, definitions of domain terms, policies. Leave out what any capable model already knows.
3. **Instructions**: numbered steps or rules. Say what to do, not only what to avoid. Give the reason for a rule when it isn't obvious; models generalise from reasons.
4. **Examples** (section 3).
5. **Output format** (section 4).
6. **Input**: the variable content, inside delimiters such as `<document>...</document>`, with a note that text inside is data, not instructions.

## 2. Rules for instructions

- Be specific: "Reply in 2 to 4 sentences" beats "be concise". "Use British spelling" beats "use proper English".
- One instruction per line; no contradictions. Search the prompt for rules that conflict (for example "be brief" and "explain fully") and decide which wins.
- Handle the edge cases you found in step 0 explicitly: missing data, off-topic input, ambiguous requests. Tell the model what to output then (for example `{"status": "insufficient_input"}`), so it doesn't invent an answer.
- Don't shout. Emphatic wording (ALL CAPS, "CRITICAL", "you MUST") can make recent models over-apply a rule in cases where it doesn't fit. State the rule plainly, once, and add emphasis only if tests show the rule being ignored.
- Remove instructions that no test case depends on. Shorter prompts are easier to debug.
- Give the model room to think when the task needs reasoning: ask it to reason before the final answer, and put the answer in a separate tagged block or field your code can extract.

## 3. Examples

- Use 2 to 5 examples that differ from each other in the ways real inputs differ. Identical-looking examples get copied too literally.
- Include at least one edge case example (missing field, refusal, "none found").
- Wrap them in tags (`<example>`) so the model can tell them from instructions.
- **Never reuse test-set inputs as examples.** That makes the evaluation meaningless.

## 4. Output format

- Specify the exact shape: a JSON schema, a template with headings, or a fixed list of labels. Show one complete example output.
- For output that code parses, prefer the provider's structured output or tool calling (see `llm-app-patterns`) over asking nicely for JSON.
- For classification, list every allowed label and what each means, plus an "other/unknown" label.
- Say what must not appear (no preamble, no Markdown fences) only if tests show it appearing.

## 5. Decomposition

Split a prompt into a chain when one call is doing several jobs and failing at one of them:

1. Typical split: extract → decide → write. Each step gets its own prompt, its own output schema and its own test cases.
2. Pass only the previous step's structured output forward, not its whole transcript.
3. Validate between steps in code; stop the chain on invalid output.
4. Don't split when one call already passes the tests; chains add latency and cost.

## 6. Iterate against the fixed set

1. Change one thing at a time (an instruction, an example, the format section).
2. Re-run the **same** inputs. Compare against the baseline case by case, not by eyeballing one output.
3. Keep the change only if it fixes failures without breaking cases that passed. Model outputs vary, so run each case more than once (3 runs is a reasonable start) when results are close.
4. When a new failure shows up in production, add it to the set before fixing it.
5. Bump the prompt version and record what changed and the before/after pass counts.

If after three focused revisions a case still fails, stop and report: the case, what you tried, and whether the fix needs code (decomposition, retrieval, a tool) or a different model rather than more wording.

## Never

- Never claim a prompt is "better" without running it on the fixed set.
- Never tune the prompt on the same cases you report the score on and call it a fair result; keep a held-out portion (see `llm-evals`).
- Never put secrets, internal URLs or personal data into a prompt as examples.
- Never rely on the prompt alone to enforce security or permissions.

## Report back

```
Prompt: <file or identifier>  version <old> → <new>
Test set: <n> cases (<where they came from>)
Baseline: <passed>/<n>   New: <passed>/<n>   (runs per case: <k>)
Changes: <one line each>
Still failing: <case ids and why>
```
