# Grader templates

Read this when writing graders for an LLM eval suite. Adapt names to the project's language; the shapes matter, not the syntax.

## Case record (JSONL, one per line)

```json
{"id": "refund-017", "split": "dev", "input": {"message": "I was charged twice"}, "expected": {"label": "billing"}, "must_include": ["refund"], "tags": ["billing", "hard"], "source": "prod-log", "added": "2026-01-14"}
```

## Code graders

Each grader takes `(case, output)` and returns `{ "pass": bool, "reason": str }`. Return a reason on failure so reports show why.

```python
def grade_label(case, output):
    got = (output.get("label") or "").strip().lower()
    want = case["expected"]["label"]
    return {"pass": got == want, "reason": f"got {got!r}, want {want!r}"}

from jsonschema import Draft202012Validator  # pip package "jsonschema"

def grade_schema(case, output, schema):
    errors = list(Draft202012Validator(schema).iter_errors(output))
    return {"pass": not errors, "reason": "; ".join(e.message for e in errors[:3])}

def grade_must_include(case, output):
    text = output["text"].lower()
    missing = [w for w in case.get("must_include", []) if w.lower() not in text]
    return {"pass": not missing, "reason": f"missing {missing}"}
```

Other useful code checks: word or token count within a range, no forbidden phrases, every cited ID exists in the retrieved documents, the expected tool was called with the expected arguments, the agent finished within N steps.

## Judge prompt (one criterion, pass/fail)

```
You are grading one output from an AI feature against one criterion.

<criterion>
Faithfulness: every factual claim in the answer is supported by the source.
PASS: all claims are supported, or the answer says the source doesn't cover it.
FAIL: any claim is missing from or contradicts the source.
</criterion>

<source>{source}</source>
<question>{input}</question>
<answer>{output}</answer>

First list each factual claim in the answer and whether the source supports it.
Then give your verdict on the last line exactly as: VERDICT: PASS or VERDICT: FAIL
```

Parse only the last `VERDICT:` line. Treat a missing or malformed verdict as a grader error, not a pass.

## Pairwise judge

Show outputs A and B for the same input with the criterion, ask which is better or "tie". Run each pair twice with A and B swapped; count a win only when both orders agree, otherwise a tie.

## Measuring judge agreement

With human labels for the same outputs:

- Agreement rate = cases where judge and human agree / cases labelled.
- For pass/fail labels, also report Cohen's kappa, which corrects for agreement by chance: κ = (p_o − p_e) / (1 − p_e), where p_o is observed agreement and p_e is the agreement expected from each rater's pass rate.
- Look at the disagreements, not just the number. They usually point to a vague rubric line.
