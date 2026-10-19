---
name: test-case-design
description: Chooses test inputs on purpose rather than by habit: equivalence partitions and boundary values, pairwise and N-wise combinatorial suites generated from a PICT model with constraints and weights, and property-based tests (Hypothesis, fast-check, proptest, jqwik) picked from a strength-ordered catalogue of roundtrip, oracle, idempotence and invariant properties while rejecting tautological and vacuous ones. Use when deciding which inputs a test suite should cover, taming a combinatorial explosion of parameters, or replacing a pile of hand-picked example tests with properties.
license: MIT
compatibility: Any Agent Skills host. PICT generation needs the `pict` CLI; property tests need the project's property library.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: read-only
  kete-loom/requires: "pict"
  kete-loom/owner: "Kete-org"
---

# Test case design

Decide *which* inputs to test before writing a single assertion. This skill picks inputs; it does not run the TDD loop (`tdd-workflow`) or chase coverage numbers (`test-coverage-improvement`).

## 0. Frame the function under test

1. Name the unit and its **public contract**: every input parameter, its type, and its valid/invalid ranges; every output and side effect; every documented error.
2. List the **variables** that change behaviour: parameters, config flags, environment states, and the shape of collection inputs (empty, one, many, duplicate, sorted, unsorted).
3. Pick the technique by what you have:
   - One or two inputs with clear ranges → **equivalence + boundary** (step 1).
   - Several independent parameters that interact → **combinatorial / PICT** (step 2).
   - A property that must hold for *all* inputs → **property-based** (step 3).
   Most real units use two of these together.

## 1. Equivalence classes and boundaries

- Partition each input into classes where the code should behave the same: valid ranges, each distinct invalid reason, and special values (zero, negative, empty, null, max).
- Pick **one** representative per class — more is waste.
- For every ordered or sized input, test the boundary and both sides of it: `min-1, min, min+1 … max-1, max, max+1`. Off-by-one bugs live here.
- Cover each invalid class in its own case so one rejection can't mask another.
- Record the class each case represents, so a reader sees the coverage without rerunning.

## 2. Combinatorial testing with PICT

When parameters interact, testing every combination explodes; most defects are triggered by a single value or a **pair**, so a pairwise suite catches them in far fewer cases.

1. Write a PICT model: one `Parameter: value1, value2, …` line per variable. Read `references/pict.md` for the model syntax, constraints, sub-models and weights.
2. Add **constraints** for combinations that can't occur (`IF [OS]="iOS" THEN [Browser]<>"Edge";`) so PICT never emits impossible cases.
3. Generate: `pict model.txt > cases.tsv` (default is pairwise). Raise the order only where the spec says three variables genuinely interact (`pict model.txt /o:3`).
4. Turn each generated row into a test case. Add an **expected result** to every row by hand — PICT chooses inputs, never oracles.
5. Keep the model in the repo next to the tests; regenerate when a parameter changes.

Stop and ask the user if the "valid" combinations aren't clear from the spec — guessing constraints produces a suite that tests the wrong system.

## 3. Property-based testing

A property asserts something true for *every* input, and the library generates and shrinks counterexamples. Read `references/properties.md` for the catalogue and per-library snippets.

Pick properties strongest-first; stop when the remaining ones would be weaker than an example test:

1. **Roundtrip** — `decode(encode(x)) == x`, `parse(render(x)) == x`. The strongest: one line pins a whole pair of functions.
2. **Oracle / model** — the result equals a simpler, slower, or reference implementation (a brute-force version, the old code during a refactor, a spec formula).
3. **Invariant** — something always holds of the output: a sort is ordered and a permutation of the input; a balance never goes negative; output length relates to input length.
4. **Idempotence** — `f(f(x)) == f(x)` for normalisers, dedupers, saves.
5. **Metamorphic** — a known change to the input makes a known change to the output (adding an element raises the count by one; scaling all prices scales the total).

Reject these — they pass without testing anything:
- **Tautological**: the test reimplements the code, so both share the bug.
- **Vacuous**: the generator or a filter rejects almost every input, so the property rarely runs. Check the library's reported example count and any `assume`/`filter` discard rate.
- Asserting only "does not throw" when a real postcondition exists.

Configure the generator to match the domain (ranges, string alphabets, collection sizes), fix the seed in CI for reproducibility, and keep the shrunk counterexample as a regression example test when one is found.

## Report back

End with: the technique(s) chosen and why; the classes/boundaries or the PICT model and case count; the properties written with their catalogue type; and any input space you could not pin down and need the user to clarify.
