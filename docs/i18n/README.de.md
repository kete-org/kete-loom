<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Kuratierte, getestete Agent Skills, Subagents und Commands für Coding-Agents.</strong><br/>
Eine Quelle. Lässt sich unverändert in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot und Kete Code installieren.</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom ist die Skill-Bibliothek hinter [Kete Code](https://ketecode.ai). Sie liefert drei Arten von Bausteinen: **Skills** (Ordner, die der Agent bei Bedarf lädt), **Agents** (Subagents, an die er Aufgaben delegiert) und **Commands** (Slash-Commands, die du eintippst). Qualität geht vor Menge: lieber weniger Bausteine, dafür ist jeder einzelne

- **portabel**: nutzt die strengste gemeinsame Teilmenge des [Agent-Skills](https://agentskills.io)-Formats, sodass kein Host ihn ablehnt;
- **getestet**: Skills und Agents bringen Trigger-Evals mit, die prüfen, dass sie bei den passenden Anfragen geladen werden und sich bei unpassenden heraushalten;
- **kurz**: unter 300 Zeilen, Details sind nach `references/` ausgelagert, und der Agent liest sie nur bei Bedarf;
- **versioniert und gekennzeichnet**: Semver, Kategorie und eine Risikostufe (`read-only`, `writes-files`, `runs-commands`, `network`) in den Metadaten;
- **durch Skripte gestützt**, wo die Arbeit deterministisch ist.

## Installation

### Für jeden Agent (empfohlen)

```bash
npx @ketecode/loom install
```

Damit wird jeder Skill nach `~/.agents/skills` (gelesen von Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot und Kete Code) und nach `~/.claude/skills` (Claude Code) installiert. Agents und Commands landen in `~/.claude/agents` und `~/.claude/commands` (gelesen von Claude Code, Agents außerdem von Cursor und VS Code Copilot) sowie in den eigenen Ordnern von Codex, OpenCode, Gemini CLI und Kete Code, sofern diese Hosts installiert sind. Jeder Agent und jeder Command wird in das Format umgewandelt, das sein Host erwartet. Starte deinen Agent danach neu.

Statt alles zu installieren, kannst du auch ein Profil wählen:

| Profil | Was es installiert |
|---|---|
| `minimal` | Test-first-Arbeit, Verifikation, Security-Review, Code-Review |
| `core` | Das Wesentliche, Planung, Git, Onboarding und Session-Übergabe, **plus die Sprach- und Framework-Pakete, die dein Projekt nutzt** (erkannt anhand von `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile` usw.) |
| `developer` | `core` plus die vier Sicherheits-Hooks |
| `security` | Alle Bausteine zu Sicherheit und Compliance, plus die Sicherheits-Hooks |
| `ai`, `data` | `core` plus alle KI- bzw. Daten-Bausteine |
| `business` | Skills für Marketing, Recherche, Investoren, Schreiben, PRDs und Operations |
| `full` | Alles, einschließlich aller Hooks |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

Profile lassen sich mit `--skill`, `--agent`, `--command` und `--hook` kombinieren, und `uninstall --profile <name>` entfernt nur die Bausteine dieses Profils.

Häufige Optionen:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

Kein Node? Dann nimm die Shell-Installer. Sie greifen auf ein einfaches Kopieren der Skills zurück (für Agents und Commands brauchst du den Node-Installer):

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Native Plugin-Installation

| Host | Befehl |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom`, danach `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom`, danach `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Nutze den `npx`-Installer (Gemini liest `~/.agents/skills`). Für `gemini extensions install https://github.com/Kete-org/kete-loom` liegt eine `gemini-extension.json` bei (experimentell) |
| Beliebige Skills-CLI | `npx skills add Kete-org/kete-loom` |

Plugin-Installationen werden über den Plugin-Manager des jeweiligen Hosts aktualisiert. Nutze für einen Host entweder die Plugin-Installation oder den `npx`-Installer, nicht beides, sonst listet der Host jeden Skill womöglich doppelt.

## Skills

Die vollständige Liste findest du im englischen README: [Skills](../../README.md#skills), sowie in [`catalog.json`](../../catalog.json).

## Agents

Subagents, an die dein Agent Aufgaben delegieren kann. Jeder läuft in seinem eigenen Kontext und liefert ein Ergebnis zurück.

Die vollständige Liste findest du im englischen README: [Agents](../../README.md#agents), sowie in [`catalog.json`](../../catalog.json).

## Commands

Slash-Commands, die du eintippst, zum Beispiel `/verify`. Unterstützt in Claude Code, OpenCode, Gemini CLI und Kete Code; andere Hosts gehen dazu über, Commands in Skills aufzunehmen, nutze dort also den passenden Skill.

Die vollständige Liste findest du im englischen README: [Commands](../../README.md#commands), sowie in [`catalog.json`](../../catalog.json).

## Rules

Kurze, immer aktive Konventionen, die der Agent befolgt, ohne dass du ihn darum bitten musst, etwa „never build SQL from strings“ oder „run go vet“. Sprachspezifische Rules gelten nur für Dateien der jeweiligen Sprache, sofern der Host das unterstützt (Claude Code, Copilot, Cursor). Kete Code, Gemini CLI, OpenCode und Codex können Rules nicht auf Pfade beschränken; sie erhalten daher nur die Rules, die du auswählst, über einen markierten Block in ihrer Anweisungsdatei.

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

Die vollständige Liste findest du im englischen README: [Rules](../../README.md#rules), sowie in [`catalog.json`](../../catalog.json).

## Hooks

Prüfungen, die an bestimmten Punkten der Agent-Schleife automatisch laufen: vor einem Shell-Befehl oder einer Dateiänderung (wobei sie diese blockieren können, mit einer Begründung, die der Agent sieht), nach einer Änderung oder beim Start einer Session. Hooks sind Opt-in: `install` fügt sie nur hinzu, wenn du das ausdrücklich verlangst.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

Der Installer registriert jeden Hook bei Claude Code und bei jedem weiteren Host, den er findet: Claude Code und Gemini CLI in ihrer `settings.json`, Kete Code in `kete.json`, Codex und Cursor in ihrer `hooks.json`, Copilot CLI in `~/.copilot/hooks/` und OpenCode als Plugin. Er fügt nur eigene Einträge hinzu und entfernt nur diese, sichert eine Datei vor jeder Änderung nach `<file>.kete-loom-backup` und schreibt nie eine Datei um, die Kommentare enthält (stattdessen gibt er das Snippet zum Einfügen aus). Codex führt einen neuen Hook erst aus, nachdem du ihm mit `/hooks` vertraut hast. Hooks werden nur für deinen Benutzer installiert, nicht pro Projekt. Cursor hat keinen Hook vor einer Dateiänderung und OpenCode keinen, der beim Session-Start Kontext hinzufügt, daher überspringen die betreffenden Hooks diese Hosts.

Die vollständige Liste findest du im englischen README: [Hooks](../../README.md#hooks), sowie in [`catalog.json`](../../catalog.json).

## MCP-Server

Kuratierte MCP-Server-Konfigurationen, die bei jedem Host, den du nutzt, in dessen eigenem Format registriert werden. Keine davon legt ein Token in einer Konfigurationsdatei ab: Remote-Server melden sich per OAuth über den Host an (`/mcp` in Claude Code, `codex mcp login`, `kete mcp auth`…), und lokale Server brauchen keine Secrets. MCP-Server sind Opt-in: `install` fügt sie nur hinzu, wenn du sie namentlich angibst.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

Pakete: `mcp-web`, `mcp-code` (GitHub, Git, Sentry), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Supabase read-only, Stripe), `mcp-design` (Figma). Für Claude Code werden Server mit `claude mcp add-json --scope user` hinzugefügt (bzw. in `.mcp.json` mit `--project`); Codex erhält sie in einem markierten Block der `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode und Kete Code in ihren MCP-Konfigurationsdateien. Ein Server, den du bereits unter demselben Namen konfiguriert hast, wird nie ersetzt. Copilot CLI erhält nur lokale Server, weil es keinen dokumentierten Weg gibt, sich dort bei Remote-Servern anzumelden.

Die vollständige Liste findest du im englischen README: [MCP-Server](../../README.md#mcp-servers), sowie in [`catalog.json`](../../catalog.json).

## Wo Hosts suchen

### Skills

| Host | Benutzerordner | Projektordner |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Nur OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| Nur Cursor | `~/.cursor/skills` | `.cursor/skills` |
| Nur Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| Nur GitHub Copilot | `~/.copilot/skills` | `.github/skills` |
| Nur Kete Code | `~/.config/kete/skills` | `.kete/skills` |

### Agents und Commands

| Host | Agents | Commands | Standardmäßig installiert |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | ja |
| Cursor, VS Code Copilot | lesen `~/.claude/agents` | nicht installiert (bei Cursor noch Beta; VS Code nutzt Prompt-Dateien im Projekt) | ja, über den Ordner von Claude |
| Codex | `~/.codex/agents` (TOML) | von Codex als veraltet markiert | wenn `~/.codex` existiert |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | wenn `~/.config/opencode` existiert |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | wenn `~/.config/kete` existiert |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | wenn `~/.gemini` existiert |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | nicht unterstützt | mit `--target copilot` |

Projektinstallationen (`--project`) verwenden dieselben Ordner innerhalb des Repos (`.github/agents` für Copilot, `.kete/` für Kete Code).

## Mitwirken

Lies [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (Skills, Agents und Commands) und [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Jeder Pull Request muss Folgendes bestehen:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

Der Skill `skill-authoring` führt deinen Agent Schritt für Schritt durch das Schreiben eines neuen Skills nach diesem Standard.

## Lizenz

MIT © Kete-org. Siehe [LICENSE](../../LICENSE).
