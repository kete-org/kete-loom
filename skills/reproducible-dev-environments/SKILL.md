---
name: reproducible-dev-environments
description: Pins a project's whole toolchain so a fresh laptop and the CI runner get identical versions from one setup command, choosing between Nix flakes or Flox, Dev Containers, and mise or asdf version files, pinning the JavaScript package manager through the packageManager field and corepack, committing every lockfile, and making CI install from the same pins. Use when onboarding takes a day of manual installs, "works on my machine" bugs come from tool version drift, CI uses different Node, Python or Go versions than developers, or a team is adding a devcontainer.json, flake.nix, mise.toml or .tool-versions.
license: MIT
compatibility: Any Agent Skills host. Uses whichever of nix, flox, mise, asdf, docker or the Dev Containers CLI the project picks; macOS, Linux and WSL2.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Reproducible dev environments

Goal: clone, run one command, get the same compilers, runtimes, CLIs and package-manager versions as everyone else and as CI. Every version lives in a committed file; nothing depends on what happens to be installed globally.

Writing the production image belongs to `docker-patterns`; CI pipeline design belongs to `github-actions-ci`. This skill owns the developer toolchain and makes CI read the same pins.

## 0. Inventory

1. List what a developer needs: language runtimes, package managers, CLIs (terraform, kubectl, protoc), databases or services, and system libraries (openssl, libpq, imagemagick).
2. Find existing pins: `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `mise.toml`, `rust-toolchain.toml`, `go.mod` `toolchain` line, `flake.nix`, `.flox/`, `.devcontainer/`, `packageManager` in `package.json`, and the versions CI installs.
3. Note mismatches between them. Report them before changing anything.

## 1. Pick one mechanism

| Situation | Choose |
|---|---|
| Only language runtimes and CLIs need pinning, mixed OSes, low ceremony | **mise** (`mise.toml`) or **asdf** (`.tool-versions`; mise reads it too) |
| System libraries matter too, or the same locked toolchain versions on macOS and Linux | **Nix flake** (`flake.nix` + `flake.lock`) or **Flox** (Nix underneath, simpler CLI) |
| Editor-integrated containers, Codespaces, Windows developers, or services alongside (database, queue) | **Dev Container** (`.devcontainer/devcontainer.json`) |
| Team already uses one | Keep it and fix its gaps; do not add a second |

A devcontainer can still use mise or Nix inside. Do not make two files authoritative for the same tool. If the choice is unclear (team habits, Windows support, Nix learning curve), **stop and ask the user**.

## 2. Write the pins

### mise

```toml
# mise.toml
[tools]
node = "22.11.0"
python = "3.12.7"
terraform = "1.9.8"

[env]
_.python.venv = { path = ".venv", create = true }
```

`mise install` installs everything; `mise use node@22.11.0` updates the file. Pin exact versions, not `lts` or `latest`.

### asdf

`.tool-versions`, one tool per line (`nodejs 22.11.0`). Each tool needs `asdf plugin add <name>` first; list the plugins in the README or setup script.

### Nix flake

1. A `devShells.default` in `flake.nix` listing packages from a pinned `nixpkgs` input.
2. Commit `flake.lock`. Update deliberately with `nix flake update` in its own commit.
3. Enter with `nix develop`; add `direnv` with `use flake` in `.envrc` for automatic activation.

### Flox

`flox init`, `flox install nodejs python3 ...`, commit the `.flox/` directory (it holds `env/manifest.toml` and the lock). Developers run `flox activate`.

### Dev Container

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "app",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22.11.0" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" }
  },
  "postCreateCommand": "make setup",
  "forwardPorts": [3000]
}
```

Pin the base image by tag at least, by digest for strict reproducibility. Use `dockerComposeFile` when services (Postgres, Redis) are needed. Test it headless with the Dev Containers CLI: `devcontainer up --workspace-folder .` then `devcontainer exec --workspace-folder . <test command>`.

## 3. Package managers and lockfiles

1. JavaScript: set `"packageManager": "pnpm@9.12.3"` (or yarn, npm) in `package.json`. Corepack reads it and runs that exact version. Corepack ships with Node up to 24 (opt in with `corepack enable`) but is no longer bundled from Node 25; there install it with `npm install -g corepack`, or let mise pin the package manager instead.
2. Commit the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`, `poetry.lock`, `Cargo.lock` for applications, `go.sum`). In CI install in frozen mode: `npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `uv sync --locked`, `poetry install` with the lock checked by `poetry check --lock`.
3. Python: pin the interpreter (`.python-version` or the chosen tool) and use a project-local virtual environment, never the system Python.

## 4. One setup command

Provide exactly one entry point, documented first in the README: `mise install && <deps>`, `nix develop`, `flox activate`, or "Reopen in Container". If more steps are needed, put them in one `make setup` or `just setup` target (or a setup script it calls) that:

- is idempotent (safe to run twice),
- checks prerequisites and prints what is missing instead of failing obscurely,
- copies `.env.example` to `.env` only if `.env` does not exist, and never writes real secrets,
- ends by running a quick smoke check (build or a fast test).

## 5. CI uses the same pins

- mise: `jdx/mise-action` in GitHub Actions, or `mise install` in any CI.
- Nix: install Nix, then `nix develop --command <test command>`.
- Dev Container: `devcontainers/ci` action, or the Dev Containers CLI.
- Setup actions that read version files: `actions/setup-node` with `node-version-file: .nvmrc` or `package.json`, `actions/setup-python` with `python-version-file`.

Remove hard-coded versions from CI YAML once CI reads the pin file. A version bump is then one file change that dev and CI both pick up.

## 6. Verify

1. In a clean environment (fresh container, new clone, or CI), run the setup command, then the test command.
2. Print the resolved versions (`node -v`, `python -V`, `pnpm -v`, ...) locally and in CI; they must match the pins.
3. Run the setup command a second time; it must succeed and change nothing.

## Never

- Never pin with ranges or `latest` for toolchains.
- Never rely on globally installed tools that are not in the pin file.
- Never commit secrets in setup scripts, `.envrc` or `devcontainer.json`.
- Never update the lockfile or `flake.lock` as a side effect of setup.

## Report back

```
## Dev environment: <project>
Mechanism: <mise | asdf | Nix | Flox | Dev Container> and why
Pinned: <tool@version list>
Setup command: <one line>
CI: <how it reads the same pins>
Mismatches fixed: <before -> after>
Verified: clean setup yes/no, versions match CI yes/no, rerun idempotent yes/no
```
