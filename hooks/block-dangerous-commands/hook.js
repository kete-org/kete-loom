'use strict';

// Blocks shell commands that destroy data or systems before they run.
// check({ command, cwd }) -> { block: true, reason } | { block: false }
// Pure and dependency-free: the kete-loom hook runner calls it for every host.

// shortcut: regex over shell segments, not a shell parser; quoting tricks can evade it. It is a
// seatbelt against agent mistakes, not a security boundary.
const SEGMENT_SPLIT = /\s*(?:&&|\|\||;|\n)\s*/;
const SUDO = /^(?:sudo|doas)\s+(?:-\S+\s+)*/;

const ROOTISH = String.raw`(?:/|/\*|~|~/|~/\*|\$HOME|\$\{HOME\}|\$HOME/\*|\.\.?/?|\*)`;
const PROTECTED = new Set(['main', 'master', 'trunk', 'production', 'prod', 'release']);

// `git push -f origin feature/main-fix` is fine; `git push -f origin main` or `+main` or `HEAD:main` is not.
function forcePushesProtected(s) {
  const args = s.split(/\s+/).slice(2);
  const force = args.some((a) => a === '-f' || a === '--force' || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a)) && !args.some((a) => a.startsWith('--force-with-lease'));
  const refs = args.filter((a) => !a.startsWith('-')).slice(1); // first non-flag is the remote
  return refs.some((r) => {
    const dst = r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '');
    return PROTECTED.has(dst) && (force || r.startsWith('+'));
  });
}

const RULES = [
  {
    // rm with both recursive and force flags, aimed at /, ~, $HOME, . or ..
    test: (s) => /^rm\s/.test(s) && /\s-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b|\s--recursive\b.*\s--force\b|\s--force\b.*\s--recursive\b|\s-r\b.*\s-f\b|\s-f\b.*\s-r\b/.test(s)
      && new RegExp(String.raw`\s["']?${ROOTISH}["']?(?:\s|$)`).test(s) || /^rm\s.*--no-preserve-root/.test(s),
    reason: 'deletes everything under /, your home folder or the whole working tree. Delete the specific paths you mean instead.',
  },
  {
    test: (s) => /^git\s+push\b/.test(s) && forcePushesProtected(s),
    reason: 'force-pushes a protected branch (main, master, release...). Push a new branch, or use --force-with-lease on your own branch.',
  },
  {
    test: (s) => /^(?:mkfs(?:\.\w+)?|wipefs|fdisk|sfdisk|parted)\b/.test(s) || /^dd\b.*\bof=\/dev\/(?!null\b|zero\b|stdout\b|stderr\b)/.test(s) || /(?:^|\s)>\s*\/dev\/(?:sd|nvme|disk|hd|vd)\w*/.test(s),
    reason: 'writes directly to a disk device, which destroys its data.',
  },
  {
    test: (s) => /^(?:chmod|chown|chgrp)\s+(?:-\S*R\S*|--recursive)\b/.test(s) && new RegExp(String.raw`\s["']?(?:/|~|\$HOME|\$\{HOME\})["']?(?:\s|$)`).test(s),
    reason: 'recursively changes permissions or ownership of / or your home folder.',
  },
  {
    test: (s) => /^(?:curl|wget)\b/.test(s) && /\|\s*(?:sudo\s+)?(?:ba|z|da|k)?sh\b/.test(s),
    reason: 'pipes a script from the internet straight into a shell. Download it, read it, then run it.',
  },
  {
    test: (s) => /\bdrop\s+(?:database|schema)\b/i.test(s) && /^(?:psql|mysql|mariadb|sqlite3|sqlcmd|mongosh|clickhouse(?:-client)?|cockroach)\b/.test(s),
    reason: 'drops a whole database or schema.',
  },
  {
    test: (s) => /^(?:terraform|tofu)\s+(?:destroy\b|apply\b.*\s-destroy\b)/.test(s) && /\s-auto-approve\b/.test(s),
    reason: 'destroys infrastructure without a review step. Run the plan and let a person approve it.',
  },
];

function check(event) {
  const command = typeof event.command === 'string' ? event.command : '';
  // Checked on the whole command: a fork bomb contains `;`, which the segment split would cut.
  if (/:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/.test(command)) {
    return { block: true, reason: 'Blocked by kete-loom (block-dangerous-commands): this command is a fork bomb.' };
  }
  // Pipes stay inside a segment so `curl ... | sh` is seen whole.
  for (const raw of command.split(SEGMENT_SPLIT)) {
    const segment = raw.trim().replace(SUDO, '');
    if (!segment) continue;
    const rule = RULES.find((r) => r.test(segment));
    if (rule) return { block: true, reason: `Blocked by kete-loom (block-dangerous-commands): \`${segment.slice(0, 120)}\` ${rule.reason}` };
  }
  return { block: false };
}

module.exports = { check };
