---
name: security-review
description: Security review of a code change or module covering secrets, injection, authentication and authorization, input validation, data exposure, dependencies and unsafe configuration, with findings ranked by severity and concrete fixes. Use when the user asks for a security review, audit or vulnerability check, or before shipping code that handles auth, payments, user input, files or personal data.
license: MIT
compatibility: Any Agent Skills host. The secret scanner needs Node 18+ and git.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/requires: "git, node"
  kete-loom/owner: "Kete-org"
---

# Security review

Find real, exploitable problems in the code in front of you and explain how to fix them. This skill is **read-only**: report findings, and change code only if the user asks.

## 1. Set the scope

- Default scope is the current change: `git diff <base>...HEAD` plus uncommitted work. If the user names files or a module, review that instead.
- Identify the trust boundaries the code touches: HTTP handlers, CLI args, file uploads, webhooks, queues, database, third-party APIs, LLM prompts.

## 2. Scan for secrets first

Run the scanner from the root of the repo being reviewed, pointing at this skill's folder (`<skill-dir>` is the folder holding this SKILL.md):

```
node <skill-dir>/scripts/scan-secrets.js            # changed files vs. HEAD and staged work
node <skill-dir>/scripts/scan-secrets.js --all      # every tracked file
```

Treat any hit as **critical** until shown to be a test fixture or placeholder. If a real secret was committed, tell the user it must be **rotated**: removing it from the code is not enough, because it stays in git history.

## 3. Walk the checklist

Read `references/checklist.md` and apply each section that matches the code in scope. The essentials:

1. **Injection**: SQL/NoSQL built with string concatenation, shell commands with user input, template injection, path traversal (`../`), SSRF in URL fetchers, prompt injection where user text reaches an LLM with tool access.
2. **AuthN / AuthZ**: every sensitive route checks the session *and* that this user may act on this specific resource (no IDOR). Password hashing uses bcrypt/scrypt/argon2. Tokens expire.
3. **Input validation**: validated at the boundary with a schema; size limits on bodies and uploads; file type checked by content, not just extension.
4. **Data exposure**: no secrets, tokens, PII or stack traces in logs, errors or API responses; least-privilege queries (no `SELECT *` sent to clients).
5. **Web**: CSRF protection on cookie-authenticated mutations, output encoding (XSS), strict CORS, security headers, secure cookie flags.
6. **Payments and webhooks**: signatures verified on the raw body, amounts computed server-side, idempotency on retries.
7. **Dependencies**: run the ecosystem's audit (`npm audit`, `pip-audit`, `govulncheck`, `cargo audit`) if available; flag new dependencies that are unmaintained or unpinned.
8. **Config**: debug mode off in production, no default credentials, secrets read from the environment or a secret manager.

Trace each suspicious input from where it enters to where it is used before calling it a finding. No path from untrusted input means no finding.

## 4. Report

Order findings by severity: **Critical** (exploitable now, data or money at risk), **High**, **Medium**, **Low**. For each finding give:

- **Where:** `file:line`
- **What:** one sentence on the flaw.
- **Exploit:** how an attacker would trigger it.
- **Fix:** a concrete code change.

Finish with what you checked and found clean, and anything you couldn't assess (for example infrastructure you can't see). Don't pad the report with generic advice; if the change is clean, say so.
