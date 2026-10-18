---
name: protect-files
description: Stops the agent from editing files that should never be hand-edited, such as .env files with secrets, package lockfiles, anything inside .git, and private keys.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-edit"
  kete-loom/owner: "Kete-org"
---

# Protect files

Runs before every file write or edit. Blocks:

| Files | Why | What the agent should do instead |
|---|---|---|
| `.env`, `.env.local`, `.env.production`… (not `.env.example`/`.sample`/`.template`) | They hold real secrets | Edit `.env.example` and tell you which values to set |
| Lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `go.sum`, `Gemfile.lock`, `composer.lock` and others) | Hand edits break dependency resolution | Run the package manager, which rewrites the lockfile |
| Anything under `.git/` | Editing git's internals can corrupt the repository | Use git commands |
| Private keys and keystores (`id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.p12`…; `.pub` files are fine) | Keys don't belong in the repository | Generate and store keys outside it |

Not available in Cursor, which has no documented hook before an edit.
