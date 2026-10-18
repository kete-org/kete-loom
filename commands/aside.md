---
name: aside
description: Answer a quick side question without changing files or losing the thread of the current task, then pick the task up where it was.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: read-only
  kete-loom/argument-hint: "<your side question>"
  kete-loom/owner: "Kete-org"
---

The user has a side question. Answer it without disturbing the task in progress.

- Answer briefly and directly. You may read files and search the codebase to answer; do not edit files, run commands that change anything, or start new work.
- If answering properly needs a change or a longer investigation, say so in one line and offer to do it after the current task.
- Then add one line restating where the main task stands and the next step, and continue it unless the user says otherwise.

Side question: $ARGUMENTS
