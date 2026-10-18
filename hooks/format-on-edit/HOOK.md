---
name: format-on-edit
description: After the agent edits a file, formats it with the formatter the project already uses (Biome or Prettier, Ruff or Black, gofmt, rustfmt), so agent changes match the project's style.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/event: "post-edit"
  kete-loom/owner: "Kete-org"
---

# Format on edit

Runs after each file write or edit and formats the changed file, only with a formatter the project has chosen:

| Files | Formatter | Used when |
|---|---|---|
| JS, TS, JSON, CSS, HTML, Markdown, YAML, Vue, Svelte… | Biome, else Prettier | the project has `biome.json` and a local Biome, or a local Prettier in `node_modules` |
| Python | Ruff, else Black | `[tool.ruff]`, `ruff.toml` or `[tool.black]` is configured and the tool is on your PATH |
| Go | `gofmt -w` | `gofmt` is on your PATH |
| Rust | `rustfmt`, with the edition from `Cargo.toml` | `rustfmt` is on your PATH |

It never installs anything, never formats files outside the project, never uses the network, and never fails an edit: if the formatter errors (for example on a half-finished edit), the file is left as the agent wrote it. Each run is limited to 15 seconds per file.
