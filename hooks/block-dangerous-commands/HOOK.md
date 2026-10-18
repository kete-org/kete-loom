---
name: block-dangerous-commands
description: Stops the agent before it runs shell commands that destroy data or systems, such as rm -rf on / or your home folder, force-pushing main, wiping disks, piping curl into a shell, dropping databases or auto-approved terraform destroy.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-shell"
  kete-loom/owner: "Kete-org"
---

# Block dangerous commands

Runs before every shell command the agent starts. If the command matches one of the rules below, the host refuses to run it and the agent sees why, so it can choose a safer command. Anything else runs as normal.

| Blocks | Example |
|---|---|
| Recursive forced delete of `/`, `~`, `$HOME`, `.` or `..` | `rm -rf ~` |
| Force-push to `main`, `master`, `trunk`, `release`, `prod` or `production` | `git push -f origin main` |
| Writing to a disk device | `mkfs.ext4 /dev/sdb1`, `dd of=/dev/sda` |
| A fork bomb | `:(){ :\|:& };:` |
| Recursive `chmod`/`chown` of `/` or `~` | `chmod -R 777 /` |
| Piping a downloaded script into a shell | `curl ... \| bash` |
| Dropping a database or schema from a database CLI | `psql -c 'DROP DATABASE app'` |
| Destroying infrastructure with auto-approve | `terraform destroy -auto-approve` |

It is a seatbelt against mistakes, not a security boundary: it reads the command text, so a determined user or unusual quoting can get past it. `--force-with-lease`, force-pushing your own branches, deleting specific folders like `node_modules`, and `terraform destroy` with its normal confirmation prompt are all allowed.

To stop using it, run `npx @ketecode/loom uninstall --hook block-dangerous-commands`.
