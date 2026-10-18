---
name: security
description: Always-on secure coding rules for any language, covering input validation, injection, authorization, least privilege, deserialisation, dependencies and keeping secrets and personal data out of logs.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

- Treat all external input as untrusted: request data, headers, cookies, uploaded files, queue messages, LLM output and third-party API responses.
- Validate input at the trust boundary against an allowlist of type, length, range and format. Reject what fails; do not try to clean it up.
- Use parameterised queries or the ORM's bound parameters. Never build SQL, NoSQL or LDAP queries by string concatenation or formatting.
- Run external commands with an argument array and no shell. Never pass user input into a shell string, `eval` or dynamic code execution.
- Encode output for its context (HTML, attribute, URL, JS) and use the framework's auto-escaping; never mark untrusted data as safe.
- Resolve user-supplied file paths against a fixed base directory and reject any result outside it.
- Enforce authentication and authorization on the server for every request and every object accessed. Hidden UI or client checks are not access control.
- Grant least privilege: minimal scopes for tokens, database users, service accounts, CI jobs and file permissions.
- Never deserialise untrusted data with formats that can run code (`pickle`, Java native serialization, unsafe YAML loaders). Use JSON or a safe loader with a schema.
- Validate outbound URLs built from user input against an allowlist of hosts to prevent SSRF.
- Use the platform's vetted crypto and password-hashing libraries and a cryptographically secure random source for tokens. Never write your own crypto.
- Keep TLS certificate verification on. Never disable it to make a request work.
- Never log secrets, tokens, passwords, session IDs or personal data. Redact them in errors, traces and analytics too.
- Return generic error messages to clients; keep stack traces and internal details in server logs.
- Add dependencies only when needed, from the official registry, pinned through the lockfile. Check the name for typosquats and run the project's audit tool after changes.
- Default to secure configuration: deny by default, `Secure`, `HttpOnly` and `SameSite` on session cookies, CSRF protection on state-changing requests that use cookie auth, debug mode off in production.

For more, load the security-review skill.
