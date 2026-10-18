#!/usr/bin/env bash
# Kete Loom installer for macOS / Linux / WSL.
#
#   curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
#   curl -fsSL .../install.sh | bash -s -- --project --skill tdd-workflow
#
# Uses the Node CLI when Node 18+ is available (all options supported).
# Without Node it falls back to a plain copy into ~/.agents/skills and
# ~/.claude/skills (or ./.agents/skills and ./.claude/skills with --project).
set -euo pipefail

REPO="${KETE_LOOM_REPO:-https://github.com/Kete-org/kete-loom.git}"
REF="${KETE_LOOM_REF:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/bin/kete-loom.js" ]; then
  SRC="$SCRIPT_DIR"
else
  command -v git >/dev/null || { echo "kete-loom: git is required" >&2; exit 1; }
  SRC="$(mktemp -d)"
  trap 'rm -rf "$SRC"' EXIT
  git clone --quiet --depth 1 --branch "$REF" "$REPO" "$SRC"
fi

if command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]; then
  [ $# -eq 0 ] && set -- install
  # Options only (e.g. `--project`) mean install; any command goes to the CLI as-is.
  case "$1" in -h|--help|-v|--version) ;; -*) set -- install "$@" ;; esac
  exec node "$SRC/bin/kete-loom.js" "$@"
fi

echo "kete-loom: Node 18+ not found, using basic copy install (no filters)."
BASE="$HOME"
for arg in "$@"; do
  if [ "$arg" = "--project" ] || [ "$arg" = "-p" ]; then BASE="$PWD"; fi
done
for dest in "$BASE/.agents/skills" "$BASE/.claude/skills"; do
  mkdir -p "$dest"
  for skill in "$SRC"/skills/*/; do
    name="$(basename "$skill")"
    if [ -e "$dest/$name" ] && [ ! -f "$dest/$name/.kete-loom.json" ]; then
      echo "skipped   $name (exists, not installed by kete-loom)"; continue
    fi
    rm -rf "$dest/$name"
    cp -R "$skill" "$dest/$name"
    rm -rf "$dest/$name/evals"
    printf '{ "source": "kete-loom", "skill": "%s" }\n' "$name" > "$dest/$name/.kete-loom.json"
    echo "installed $name -> $dest/$name"
  done
done
echo "Restart your agent so it picks up the new skills."
