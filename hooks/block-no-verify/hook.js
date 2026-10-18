'use strict';

// Blocks shell commands that skip the project's git hooks (pre-commit, commit-msg, pre-push).

const SEGMENT_SPLIT = /\s*(?:&&|\|\||;|\n)\s*/;
// git's global options, including the ones that take a value (`-C dir`, `-c key=value`).
const GIT = String.raw`^git\s+(?:(?:-C|-c)\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*`;
// Quoted text (commit messages) can mention --no-verify without using it.
const unquote = (s) => s.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");

const RULES = [
  {
    // --no-verify on any git subcommand that runs hooks; `-n` means --no-verify only for commit.
    test: (s) => new RegExp(GIT + String.raw`(?:commit|push|merge|rebase|am|cherry-pick|revert)\b.*\s--no-verify\b`).test(s)
      || new RegExp(GIT + String.raw`commit\b(?:\s+\S+)*\s-(?!-)[a-zA-Z]*n[a-zA-Z]*(?:\s|$)`).test(s),
    reason: 'skips the git hooks with --no-verify. Fix what the hook reports instead.',
  },
  {
    test: (s) => /^(?:\w+=\S*\s+)*(?:HUSKY|HUSKY_SKIP_HOOKS)=(?:0|false|1|true)\s+(?:\w+=\S*\s+)*git\b/.test(s)
      && /(?:^|\s)HUSKY=0\b|HUSKY_SKIP_HOOKS=(?:1|true)\b|HUSKY=false\b/.test(s),
    reason: 'turns off Husky git hooks for this command. Fix what the hook reports instead.',
  },
  {
    test: (s) => /^git\s+.*-c\s+core\.hooksPath=/.test(s) || /^git\s+config\b.*\bcore\.hooksPath\b/.test(s) && !/--get\b|--unset\b/.test(s) && /core\.hooksPath\s+\S+/.test(s),
    reason: "points git at a different hooks folder, which bypasses the project's hooks.",
  },
  {
    test: (s) => /^(?:\w+=\S*\s+)*SKIP=\S+\s+(?:\w+=\S*\s+)*git\b/.test(s) || /^PRE_COMMIT_ALLOW_NO_CONFIG=1\s/.test(s),
    reason: 'skips pre-commit hooks for this command. Fix what the hook reports instead.',
  },
];

function check(event) {
  const command = typeof event.command === 'string' ? event.command : '';
  for (const raw of command.split(SEGMENT_SPLIT)) {
    const segment = raw.trim().replace(/^(?:sudo|doas)\s+/, '');
    const rule = segment && RULES.find((r) => r.test(unquote(segment)));
    if (rule) return { block: true, reason: `Blocked by kete-loom (block-no-verify): \`${segment.slice(0, 120)}\` ${rule.reason}` };
  }
  return { block: false };
}

module.exports = { check };
