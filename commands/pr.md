---
name: pr
description: Open a pull request for the current branch: check it is ready, write the title and description, push, and create the PR, asking before anything leaves the machine.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[base branch] [draft]"
  kete-loom/owner: "Kete-org"
---

Open a pull request for the current branch.

1. **Ready?** Make sure the branch is not the default branch, the working tree is clean (or ask what to do with uncommitted changes), and the project's checks pass (`/verify`). If checks fail, stop and report.
2. **Base.** Use the base given below, or the repository's default branch. Show `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`.
3. **Title and description.** Write them as `/pr-describe` does: a Conventional Commits style title, what changed and why, how it was tested, and risks. Show them to the user.
4. **Push and create, after the user agrees.** Push with `git push -u origin <branch>` (never force). Create the PR with the GitHub CLI if it is installed (`gh pr create --base <base> --title ... --body-file ...`, add `--draft` if asked), otherwise give the user the compare URL and the text to paste.
5. Report the PR URL.

Request: $ARGUMENTS
