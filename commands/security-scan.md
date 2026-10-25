---
name: security-scan
description: Scan the current change for vulnerabilities, leaked secrets and unsafe dependencies, and report findings by severity.
license: MIT
metadata:
  kete-loom/version: "0.2.0"
  kete-loom/category: security
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[files, commit range or area]"
  kete-loom/owner: "Kete-org"
---

Run a security review of the current change. Do not edit files; report only.

If the scope below is the whole repository ("everything", "the repo", "full scan", git history) or scanners such as Opengrep, Semgrep, Gitleaks, Checkov or zizmor are installed, and the `code-scanning` skill is available, follow it, and stop at its report: skip its fix step and ask before installing any scanner. Otherwise use the review below.

If the `security-reviewer` agent is available, delegate to it with the scope below. Otherwise, if the `security-review` skill is available, follow it. If neither is available:

1. Take the change set from the scope below, or the diff against `HEAD` plus untracked files, or the branch diff against the default branch.
2. Check the diff for: injection (SQL, shell, template, path traversal), missing authentication or authorisation checks, unsafe deserialisation, SSRF, secrets or tokens in code or config, weak crypto, sensitive data in logs, and unvalidated input at trust boundaries.
3. If dependency manifests or lockfiles changed, run the ecosystem's audit command if installed (for example `npm audit`, `pip-audit`, `govulncheck ./...`, `cargo audit`, `bundle-audit check`).
4. Confirm each finding by reading the code path from input to sink. Drop anything you cannot trace.
5. Report:

```
## Security scan: <scope>
- [critical|high|medium|low] path:line: issue. How it is exploited. Fix.
Dependencies: audit command and result, or "not run: <reason>".
Verdict: no issues found | issues found
```

If you find a live secret, tell the user at the top of the report to rotate it; removing it from the code is not enough.

Scope from the user, if any: $ARGUMENTS
