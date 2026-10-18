---
name: guard-secrets
description: Stops the agent from writing API keys, tokens, passwords, connection strings or private keys into files, using the same rules as the security-review secret scanner.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-edit"
  kete-loom/owner: "Kete-org"
---

# Guard secrets

Runs before every file write or edit and checks the new text for secrets: AWS, GitHub, Anthropic, OpenAI, Paystack, Stripe, Slack and Google keys, private key blocks, JWTs, connection strings with passwords, and hard-coded `password`/`api_key`/`token` assignments. If it finds one, the edit is refused and the agent is told to read the value from an environment variable or secret store.

Placeholders such as `<your-api-key>`, `${API_KEY}`, `process.env...`, `changeme` or `your_key_here` are allowed. The reason message masks the value, so the secret isn't echoed back.

It uses the same rules as `skills/security-review/scripts/scan-secrets.js`, which a test keeps in sync. Not available in Cursor, which has no documented hook before an edit.
