---
name: explain
description: Explain how a piece of code or a flow works, tracing it through the codebase with file:line references, without changing anything.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: read-only
  kete-loom/argument-hint: "<file, symbol or flow>"
  kete-loom/owner: "Kete-org"
---

Explain how the code or flow below works. Read only; do not edit files.

If the user named nothing, ask which file, function or flow to explain and stop.

If the `code-tour` skill is available, follow its tracing steps but answer in the reply only; do not write a tour file unless the user asks. Otherwise:

1. Find the starting point: search for the symbol, route, command or file name the user gave.
2. Trace the path in execution order: entry point, the calls it makes, data it reads and writes, and where it returns or hands off. Read each file you cite.
3. Note what is surprising: side effects, error paths, config or feature flags that change behaviour.
4. Answer:

```
## How <thing> works
Summary: 2-3 sentences.
Steps
1. path:line: what happens here and why.
2. ...
Data: what goes in, what comes out, what is stored.
Gotchas: ...
Not traced: parts you did not follow, and why.
```

Cite only lines you read. If behaviour depends on runtime config you cannot see, say so instead of guessing.

Target: $ARGUMENTS
