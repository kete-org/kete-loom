---
name: skill-review
description: Review the skill observation log and turn open findings into staged, approved changes to skills, rules, hooks or instructions files, one decision at a time.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/argument-hint: "[skill name, 'oldest 10', or empty for all]"
  kete-loom/owner: "Kete-org"
---

Review the skill observation log (`npx @ketecode/loom observe`, kept by the `skill-observations` skill) and turn what it says into changes the user approves. Nothing is applied without approval, and nothing is applied at all in an unattended run: then you stage and report only.

1. **Scan.** Run `npx @ketecode/loom observe scan`. If it says SCAN BROKEN, stop and report the unreadable files. Never review a log the scan couldn't read. If the scan lists staged change sets, deal with those first (step 6).
2. **Size the batch.** Up to about 15 open observations: review them all. More than that: offer a slice that stays the same size as the backlog grows ("the 10 oldest", "only the ones about `<the most-named target>`"), and say how many are open and roughly how many distinct findings they come to. The scope given below overrides this.
3. **Read every body in the batch** with `observe show <id>`; a title is an index, not the content. Then cluster: observations restating one finding become one decision. Note which ones the scan marks as a rule broken twice.
4. **Decide each cluster** and present it to the user, one at a time or in small groups:
   - **Already fixed**: the change is already in the target (look). Resolve as `actioned`, naming where.
   - **Change**: the exact edit, as a diff against a fresh read of the target, plus where it goes (below).
   - **Barrier**: for a rule broken twice, propose a hook with `/hookify`, a lint rule or a safer default. Never just reword the rule.
   - **New skill**: propose its scope and run `/skill-create` if the user agrees.
   - **Decline** (doesn't generalise, contradicted by later evidence): say why.
   - **Park**: only when a real outside condition blocks it, and name that condition.
5. **Where a change goes.** Check what the target is before staging anything:
   - **A file the project or the user owns** (AGENTS.md, CLAUDE.md, a rule file, a skill or hook in the repository or in the user's own folders): stage an edited copy under `~/.kete-loom/observations/staged/<YYYY-MM-DD>/<target-name>/` together with the diff. Apply it to the real file only after the user approves that change.
   - **An installed Kete Loom item.** Its skill folder holds `.kete-loom.json`, or its first lines carry a `kete-loom <name>@<version>` marker. Don't edit it: `kete-loom update` would overwrite the change. Instead, offer two things. First, a draft issue or pull request for Kete-org/kete-loom with the evidence (the principle and the change, never client details). Second, if the user needs the behaviour now, the same rule as a project rule file or an AGENTS.md line that names the observation.
   - **Another project's or vendor's item**: draft feedback for its maintainers and stage nothing.
6. **Staged sets from earlier reviews.** For each folder in `staged/`, compare every staged copy with the live file (`diff -ru`). Then report each one as applied (live now matches), still waiting, out of date (live moved on, so re-stage from a fresh read), or orphaned (its target no longer exists). Delete a staged set only after its changes are applied or deliberately dropped, and only with the user's go-ahead.
7. **Record the outcome in the same turn.** For every observation decided: `npx @ketecode/loom observe resolve <id> --status actioned|declined|superseded|parked --resolution "<what and where>"` (`--until "<condition>"` for parked). If a cluster was only partly acted on, resolve it saying which part, and log a new observation for the rest. When the batch is done: `npx @ketecode/loom observe reviewed`.
8. **Report:**

```
## Skill review <date>: <n> observations, <k> decisions
Applied: <target>: <change> (observations NNNN, NNNN)
Staged, waiting for you: <path> (<what>)
Barriers proposed: <rule>: <hook or lint rule>
Upstream drafts: <title> (Kete-org/kete-loom)
Declined / parked: NNNN: <why> / until <condition>
Still open: <n>
```

Never put secrets, personal data or client details into a staged change, an upstream draft or a resolution. Never install a staged change over a live file the user hasn't approved.

Scope: $ARGUMENTS
