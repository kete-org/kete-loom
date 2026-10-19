# Tuning a description for reliable triggering

Read this when a skill must load reliably and the first description misses real prompts or catches the wrong ones. It is a small optimisation loop with a held-out set, so you improve the description rather than overfit it to the prompts you happened to write.

## 1. Build the prompt set

- At least 10 `should_trigger` and 10 `should_not_trigger` prompts, written as users type them (detail, casual register, multi-step tasks; see step 4 of the skill).
- Negatives are near misses: neighbouring skills' jobs, the same tools used for a different goal, the same words in a different situation.

## 2. Split it

- Shuffle, then put about 60% of each list in **train** and 40% in **held-out**. Keep the split fixed for the whole loop.
- Never look at held-out misses while revising. If you do, they become train prompts and you need new held-out ones.

## 3. Measure a trigger rate

Routing is not deterministic. Run every prompt **3 times** and record how many runs loaded the skill:

```
prompt                                              set     runs loaded
"our finance export.xlsx has merged header rows..." train   3/3
"just tell me what this regex matches"              train   1/3  (negative: miss)
```

Score = share of runs routed correctly (loaded for positives, not loaded for negatives). In a Kete Loom checkout, `npm run eval:live` (`node scripts/run-evals.js --live --skill <name>`) does one routing pass per run; repeat it three times with `--report run-<n>.json` to keep every miss, then tally train and held-out separately from those files.

## 4. Revise on train misses only

- Positive missed → the description lacks the user's words or situation. Add the situation, not the exact prompt.
- Negative loaded → the description is too broad. Name the boundary ("not for ...") or sharpen the object and output.
- Change one thing per round and keep every version with its train and held-out scores.

## 5. Pick the winner

Stop after about five rounds or when train misses stop falling. Keep the version with the **best held-out score**, not the best train score; on a tie, the shorter one. Then move every prompt back into `evals/triggers.json`.

## Record each round

```
v<n>: <one-line change>
train  <x>/<runs>   held-out <y>/<runs>
misses: <prompt> (<set>, <k>/3)
```
