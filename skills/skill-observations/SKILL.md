---
name: skill-observations
description: Keeps a durable log of what real work teaches about the skills, rules and agents in use (user corrections, rules the agent broke, missing steps, workflows that deserve their own skill), written as one structured observation per finding through the kete-loom observe CLI, so a later /skill-review can turn it into approved changes. Use when working through any multi-step task or work session, when the user corrects how the agent works, when the agent notices it broke a documented rule, or when the user asks to note something for skill improvement.
license: MIT
compatibility: Any Agent Skills host with a shell. Needs Node 18+ for npx @ketecode/loom (the observe CLI); no network.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# Skill observations

Skills improve best from friction met during real work. This skill makes noticing that friction a habit, and makes the notes last: each finding becomes one small file in a log that outlives the session, the checkout and the project. A review turns the log into changes later. Logging never changes a skill by itself.

The log lives at `~/.kete-loom/observations/` (or `$KETE_LOOM_OBSERVATIONS_DIR`): user scope, so findings about skills you use everywhere aren't split across projects or lost with a deleted worktree. Write to it only through `npx @ketecode/loom observe`. The CLI assigns ids that never repeat, refuses duplicates and never overwrites a file. Writing the files by hand skips all of that.

## 1. At session start

Run `npx @ketecode/loom observe scan` once, early (the `load-session-context` hook gives the same summary when installed). Keep what it shows in mind without reporting it unprompted, with three exceptions:

- **Review due** (open observations and no review for 7+ days): offer `/skill-review` once, in one line, then carry on with the user's task. Never hold their work up for it.
- **A rule broken twice with no fix**: mention it once. The fix is a structural barrier, not new wording (section 5).
- **"SCAN BROKEN"**: the log has files the scan couldn't read. Say so. Never treat the log as empty.

An empty answer is a claim about the command, not about the log. If a scan, list or search returns nothing where entries are expected, check with a second, independent probe (list the `log/` folder) before relying on it.

## 2. What is worth logging

Watch the whole session, including discussion after the work is done: review feedback is often the strongest signal.

| Kind | Log it when | `--kind` |
|---|---|---|
| Improve a skill | the user corrects how the agent worked; a skill missed a step, an edge case or a better technique; new tooling makes a step obsolete | `improve` |
| Rule broken | the agent broke a rule a skill, rule file or AGENTS.md states, whether the user noticed or not | `violation` (with `--rule`) |
| Simplify | a section never applies, rules contradict each other, a rule rests on one unproven case | `simplify` |
| New skill | a multi-step workflow repeated, a method the user explains that nothing captures, "I always do it this way" | `new-skill` (with `--proposes-skill`) |

Don't log one-off corrections that won't recur, preferences a skill already captures, tool bugs unrelated to method, or anything that only makes sense with confidential client details. Test: would the principle still hold for another person on another project? Mostly not → it is task context, not an observation. More examples and the edge cases: `references/signals.md` (load it when unsure, or when sorting many candidates).

**Log your own rule violations.** Only the agent sees most of them, and they are the only evidence that a rule's enforcement is too weak. Name the rule exactly (`--rule "tdd-workflow: write the failing test first"`): the CLI counts violations per rule.

## 3. Before writing: three checks

1. **Restatement.** `npx @ketecode/loom observe list --skill <name>` and read the titles. If the finding is already there (same rule, same failure, new example), extend that file instead: add the new instance to its body with the editing tool. `observe new` refuses a near-identical title on the same target (exit 3) and names the match; use `--force` only for a genuinely different finding.
2. **Target.** `--skill` names an installed skill that really does the work the observation is about, by its bare name. If the right home is not a skill (AGENTS.md, a rule file, a hook), use `--target-file <path>`. A skill that doesn't exist yet goes in `--proposes-skill`.
3. **Siblings.** Would the sentence still be true with the tool's name removed? Then it probably applies to related items too (`go-reviewer` and `python-reviewer`, `stripe-integration` and `paystack-integration`). Add each one it applies to under `--skill`, and record what you checked in `--siblings-checked` ("reviewers: go-reviewer added; python-reviewer not affected, it has no such step"). The CLI refuses a blank value, so a skipped check can't hide.

## 4. Writing

Write in the same turn as the finding, or the next, without interrupting the user's task:

```bash
npx @ketecode/loom observe new <short-kebab-slug> \
  --title "One line someone can understand in a month" \
  --kind improve --skill <skill-a>,<skill-b> \
  --siblings-checked "<family>: <verdicts>" \
  --area "<section or step>" --context "<what task this came from>" \
  --issue "<what happened, concretely>" \
  --improvement "<the change: name the section; for a new skill, its scope>" \
  --principle "<the general takeaway, with no client or project details>"
```

- `--type internal` for findings tied to this user, client or project; the default `open-source` means the principle must read cleanly for anyone. When in doubt, choose `internal`: classifying too narrowly only costs reach, too widely can leak.
- If the evidence lives only in this session (a log, an output), save it into the project or the log folder first and mention the path in `--issue`.
- **When to flush:** whenever you hand work to the user (a file, a report, "done"), after every third finished todo item, and straight after any write or tool call that fails with a permission error. Each of these is already a tool call, so writing then costs nothing extra.
- **Subagents don't write to the log.** A subagent that notices something puts it in its report, and the controlling session decides and writes. Two writers would race on ids and duplicate findings.
- If a write is refused (permission denied), say what was refused in one line and include the observation in your final message instead. Don't retry with another tool.

## 5. A rule broken twice

When the scan reports the same rule broken twice with no fix in between, the problem is enforcement, not wording. The next proposal must be a barrier: a hook that refuses the action (`/hookify`), a lint rule, a script that is the only way to do the step, or a default that makes the wrong path unavailable. Never a clearer sentence, a bold warning or the same rule moved somewhere more prominent.

## 6. Acting on observations

Logging is not acting. Say "logged for the next review" and move on. Change a skill, rule or instructions file only:

- in `/skill-review`;
- when the user explicitly names the artefact ("update the tdd-workflow skill", "act on observation 12");
- when a skill is producing wrong output right now and the user should know.

"From now on, always…" names a behaviour, not an artefact: log it, and ask in one line if they want the file changed now. Applying a finding to the task in front of you is fine; writing it into a file that later sessions read is acting on it.

After acting, record it in the same turn: `npx @ketecode/loom observe resolve <id> --status actioned --resolution "<what changed, and where it lives now>"`. That includes fixes that happened as ordinary work, and fixes you find already in place. If only some of the targets were fixed, resolve it naming what was done and log a new observation for the rest.

## 7. End of session

Before the final reply, if observations were logged, add a short grouped summary: by target, one sentence each, and new-skill candidates separately. Cite them as `observation NNNN` from what the CLI printed this session, never from memory.

## Never

- Write, rename or delete files in the log by hand, except editing an existing observation's body to extend it.
- Put secrets, credentials, personal data or a client's confidential details in an observation.
- Treat an empty scan as an empty log without a second probe.
- Edit an installed Kete Loom skill in place: `kete-loom update` overwrites it. Changes go through `/skill-review`, which stages them.

Approach adapted from Task Observer by Eoghan Henn and contributors (CC BY 4.0).
