# Signals: what is and isn't an observation

Load this when unsure whether something is worth logging, or when sorting several candidates at the end of a task.

## Strong signals

- **A user correction about method**, not content: "don't run the full suite for this", "check the lockfile first", "we never squash here". The method generalises; the content usually doesn't.
- **A rule the agent broke.** Log it even if nobody noticed. Say which protection was in play: written in a file, loaded into context, or backed by a hook or check. A rule that was written down and loaded but still broken has an enforcement problem.
- **A missing step.** The skill was followed exactly and the result was still wrong, or the user had to add a step.
- **A better technique** found during the work than the one the skill recommends, with evidence that it is better (fewer steps, a caught bug, a faster run).
- **A repeated workflow** done by hand in two or more sessions, or described by the user as their standard way.
- **A defect that took a second hypothesis** while it wasn't the deliverable. Log the evidenced problem report at that point, rather than spending a fifth attempt on it.

## Weak signals (usually not worth a file)

- A one-off preference for this task only.
- A correction of facts in the output, unless it shows a pattern in how the agent finds facts.
- A tool or host bug unrelated to the method (report it to the tool instead).
- Something already captured by a skill's rule that was simply followed.

## The generalisability test

Answer each; mostly "no" means it is task context, not an observation:

1. Would this help someone else, on another project, doing the same kind of task?
2. Can the principle be stated without naming this project, client or person?
3. Is there a specific skill, rule file or instructions file it would change, or a skill it would justify creating?
4. Would applying it change what an agent does next time, not just what it knows?

## Simplify signals

Removing is an improvement too. Log `--kind simplify` when:

- a section of a skill was irrelevant across several sessions;
- two rules contradict each other;
- a rule rests on a single case that never recurred;
- a rule is consistently ignored. Then the honest options are a barrier or deletion, never a louder version of the same rule.

## Deferral in disguise

"Let's gather more data first" is sometimes right and often a way to avoid deciding. Before recommending "later" in a review, name the specific observation that would change the decision and when it could arrive. If none can, decide now.
