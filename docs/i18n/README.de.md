<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Kuratierte, getestete Agent Skills, Subagents und Commands für Coding-Agents.</strong><br/>
Eine Quelle. Lässt sich unverändert in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot, Kete Code und Kiro installieren.</p>

<!-- translated from README.md, source 1098500fc32b -->

<!-- counts:start --><!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom ist die Skill-Bibliothek hinter [Kete Code](https://ketecode.ai). Sie liefert **Skills** (Ordner, die der Agent bei Bedarf lädt), **Agents** (Subagents, an die er Aufgaben delegiert), **Commands** (Slash-Commands, die du eintippst), **Rules** (kurze, immer aktive Vorgaben), **Hooks** (Prüfungen, die rund um die Tool-Aufrufe des Agents und bei dessen Abschluss laufen) und **MCP-Server-Konfigurationen**. Qualität geht vor Menge: lieber weniger Bausteine, dafür ist jeder einzelne

- **portabel**: nutzt die strengste gemeinsame Teilmenge des [Agent-Skills](https://agentskills.io)-Formats, sodass kein Host ihn ablehnt;
- **getestet**: Skills und Agents bringen Trigger-Evals mit, die prüfen, dass sie bei den passenden Anfragen geladen werden und sich bei unpassenden heraushalten, und die Disziplin-Skills ergänzen Verhaltens-Evals, die prüfen, ob der Agent sie auch unter Druck tatsächlich befolgt, verglichen mit einem Lauf ohne den Skill;
- **kurz**: unter 300 Zeilen, Details sind nach `references/` ausgelagert, und der Agent liest sie nur bei Bedarf;
- **versioniert und gekennzeichnet**: Semver, Kategorie und eine Risikostufe (`read-only`, `writes-files`, `runs-commands`, `network`) in den Metadaten;
- **durch Skripte gestützt**, wo die Arbeit deterministisch ist.

## Installation

### Für jeden Agent (empfohlen)

```bash
npx @ketecode/loom install
```

Damit wird jeder Skill nach `~/.agents/skills` (gelesen von Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot und Kete Code) und nach `~/.claude/skills` (Claude Code) installiert. Agents und Commands landen in `~/.claude/agents` und `~/.claude/commands` (gelesen von Claude Code, Agents außerdem von Cursor und VS Code Copilot) sowie in den eigenen Ordnern von Codex, OpenCode, Gemini CLI, Kete Code und Kiro, sofern diese Hosts installiert sind (Kiro erhält außerdem eine eigene Kopie der Skills). Jeder Agent und jeder Command wird in das Format umgewandelt, das sein Host erwartet. Starte deinen Agent danach neu.

Statt alles zu installieren, kannst du auch ein Profil wählen:

| Profil | Was es installiert |
|---|---|
| `minimal` | Test-first-Arbeit, Verifikation, Security-Review, Code-Review |
| `core` | Das Wesentliche, Planung, Git, Onboarding und Session-Übergabe, **plus die Sprach- und Framework-Pakete, die dein Projekt nutzt** (erkannt anhand von `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile` usw.) |
| `developer` | `core` plus die vier Sicherheits-Hooks |
| `strict` | `developer` plus die Opt-in-Leitplanken: Lesen vor dem Bearbeiten, geschützte Lint-Konfigurationen, Dev-Server im Hintergrund, Verbleib im Worktree, kein Lesen von Secrets und keine eingeschleusten Anweisungen, Warnungen vor eingeschleustem Text in dem, was er liest, kein versehentliches Kürzen von Dateien, eine Warnung, bevor sich der Kontext füllt, gültige Commit-Messages und am Ende keine unfertigen Stubs und keine fehlschlagende Lint- oder Typprüfung |
| `method` | Eine vollständige Entwicklungsmethode: Design vor Code, kleinteilige Pläne, ein frischer Subagent pro Aufgabe mit Spec- und Qualitäts-Review, systematisches Debugging, Umgang mit Reviews, Worktrees und ein sauberer Abschluss |
| `project` | `method` plus Projektplanung: eine Roadmap mit Phasen in `.planning/`, Klärung der Anforderungen, Planprüfungen vor dem Code, Abnahmetests gemeinsam mit dir, ein Ideen-Backlog, Machbarkeits-Spikes und Recovery-Commands |
| `security` | Alle Bausteine zu Sicherheit und Compliance, plus die Sicherheits-Hooks |
| `ai`, `data` | `core` plus alle KI- bzw. Daten-Bausteine |
| `business` | Skills für Marketing, LinkedIn-Inhalte, Recherche, Investoren, Schreiben, PRDs und Operations |
| `design` | `core` plus UI-Arbeit: Designsysteme aus dem Produktkontext mit kontrastgeprüften Tokens und einer DESIGN.md, Feinschliff, Barrierefreiheit, Animation, der UI-Auditor und `/design-ui` |
| `full` | Alles, mit jedem Hook, der nicht Opt-in ist |

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

## Eine Entwicklungsmethode

Installiere `--profile method` für eine vollständige Arbeitsweise, von der Idee bis zum gemergten Branch, mit einem Review-Gate bei jedem Schritt:

| Schritt | Verwendung | Was passiert |
|---|---|---|
| 1. Design | `/brainstorm` (`design-brainstorming`) | Eine Frage nach der anderen, zwei oder drei Ansätze mit ihren Vor- und Nachteilen, deine Freigabe Abschnitt für Abschnitt, HTML-Mockups für visuelle Entscheidungen, danach ein Design-Dokument im Repo. |
| 2. Isolieren | `git-worktrees` | Ein separater, von Git ignorierter Worktree mit installierten Abhängigkeiten und einem Baseline-Testlauf, sodass bestehende Fehlschläge bekannt sind. |
| 3. Planen | `/plan-feature` (`implementation-plans`) | Aufgaben von jeweils wenigen Minuten, mit genauen Dateien, dem fehlschlagenden Test, der zuerst zu schreiben ist, dem auszuführenden Befehl samt erwarteter Ausgabe und einem Commit pro Aufgabe. |
| 4. Bauen | `subagent-driven-development` mit dem Agent `task-implementer` | Ein frischer Subagent pro Aufgabe arbeitet test-first und meldet einen Status. Der `spec-reviewer` prüft das Ergebnis gegen die Aufgabe, danach prüft `code-reviewer` die Qualität, und das wiederholt sich, bis beide bestehen. |
| 5. Debuggen | `/debug` (`systematic-debugging`) | Erst die Ursache, dann der Fix: reproduzieren, den falschen Wert bis zu seiner Quelle zurückverfolgen, eine Hypothese nach der anderen. Nach drei gescheiterten Fixes hält es an und stellt das Design infrage. |
| 6. Review | `responding-to-code-review` | Prüft jeden Kommentar am Code, widerspricht mit Belegen, wenn ein Vorschlag falsch ist, und antwortet im Review-Thread. |
| 7. Abschließen | `/finish-branch` (`finishing-a-branch`) | Zuerst die Tests, dann lokal mergen, einen Pull Request öffnen, den Branch behalten oder ihn verwerfen (erst nachdem du eine Bestätigung eintippst). |

`/feature-dev` führt die gesamte Abfolge aus und hält zwischen den Phasen für deine Freigabe an, und die Rule `use-skills` sorgt dafür, dass der Agent zu diesen Skills greift, statt aus dem Gedächtnis zu arbeiten.

Für Arbeit, die größer ist als ein einzelnes Feature, ergänzt `--profile project` die Planung drumherum. Alles liegt in einfachen Markdown-Dateien unter `.planning/`, die du lesen, bearbeiten und committen kannst:

| Bedarf | Verwendung |
|---|---|
| Eine Roadmap aus Meilensteinen und Phasen, verknüpft mit nummerierten Anforderungen, mit einem aktuellen Stand, der über Sessions hinweg erhalten bleibt | `project-roadmap`; `/progress` sagt, wo die Dinge stehen, und nennt die nächste Aktion |
| Anforderungen, die vor der Planung festgezurrt werden: Grauzonen, die Annahmen des Agents samt Belegen, die Randfälle | `spec-clarification`, `assumptions-analyzer` |
| Ein Plan, der gegen sein Ziel geprüft wird, bevor Code geschrieben wird | `plan-checker` |
| „Kann das überhaupt funktionieren?“, beantwortet durch ein zeitlich begrenztes Experiment und ein Urteil | `feasibility-spike` |
| Abnahmetests gemeinsam mit dir, ein Ergebnis nach dem anderen | `/uat` (`acceptance-testing`), `ui-auditor` |
| Ideen und Todos festhalten, ohne die aktuelle Aufgabe zu unterbrechen | `/capture` (`idea-backlog`) |
| Recovery: eine Liste von Review-Befunden abarbeiten, herausfinden, warum ein Vorhaben über mehrere Sessions schiefging, Arbeit sicher rückgängig machen | `/fix-findings`, `/forensics`, `/revert-work` |

### Aus jeder Session lernen

Skills werden besser durch Reibung, die bei echter Arbeit auftritt, deshalb führt Kete Loom ein Protokoll darüber. Der Skill `skill-observations` hält jeden Befund fest, sobald er auftritt: eine Korrektur, die du gegeben hast, eine Rule, die der Agent gebrochen hat, ein fehlender Schritt oder ein Workflow, der einen eigenen Skill verdient. Jeden Befund schreibt er als kleine Datei über `kete-loom observe`. `/skill-review` macht aus dem Protokoll später Änderungen, die du einzeln freigibst.

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

Das Protokoll gehört dir und bleibt auf deinem Rechner, in `~/.kete-loom/observations/`. Es liegt im Benutzerbereich, sodass Befunde weder auf Projekte verteilt werden noch mit einem gelöschten Worktree verloren gehen. Die CLI erzwingt die Buchführung:
- IDs wiederholen sich nie, und eine bestehende Datei wird nie überschrieben;
- ein erneut formulierter Befund wird abgelehnt, stattdessen wird das Original erweitert;
- jeder Befund muss festhalten, welche verwandten Skills geprüft wurden;
- eine Rule, die zweimal gebrochen wurde, wird für einen Hook (`/hookify`) markiert statt für eine weitere Umformulierung.

Reviews bereiten Änderungen vor und bearbeiten nie einen installierten Kete-Loom-Skill direkt, da `update` ihn überschreiben würde; daraus werden ein Entwurf für eine Änderung im Upstream und, falls nötig, eine Projekt-Rule. Mit installiertem Hook `load-session-context` beginnt jede Session mit dem Wissen, was offen ist. Beide sind in `--profile method` enthalten.

Der Ansatz ist adaptiert von [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all) von Eoghan Henn und Mitwirkenden (CC BY 4.0).

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

Prüfungen, die an bestimmten Punkten der Agent-Schleife automatisch laufen: vor einem Shell-Befehl oder einer Dateiänderung (wobei sie diese blockieren können, mit einer Begründung, die der Agent sieht), nach einer Änderung, nach dem Lesen einer Datei oder Webseite oder nach jedem Tool-Aufruf (wobei sie eine Notiz für den Agent hinzufügen können), beim Start einer Session oder wenn der Agent seinen Zug beendet (wobei sie ihn zurück an die Arbeit schicken können). Hooks sind Opt-in: `install` fügt sie nur hinzu, wenn du das ausdrücklich verlangst. Als Opt-in markierte Hooks verändern die Arbeitsweise des Agents, daher lässt `--hooks` sie weg; gib sie namentlich an oder nutze `--profile strict`.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

Der Installer registriert jeden Hook bei Claude Code und bei jedem weiteren Host, den er findet: Claude Code und Gemini CLI in ihrer `settings.json`, Kete Code in `kete.json`, Codex und Cursor in ihrer `hooks.json`, Copilot CLI in `~/.copilot/hooks/` und OpenCode als Plugin. Er fügt nur eigene Einträge hinzu und entfernt nur diese, sichert eine Datei vor jeder Änderung nach `<file>.kete-loom-backup` und schreibt nie eine Datei um, die Kommentare enthält (stattdessen gibt er das Snippet zum Einfügen aus). Codex führt einen neuen Hook erst aus, nachdem du ihm mit `/hooks` vertraut hast. Hooks werden nur für deinen Benutzer installiert, nicht pro Projekt. Cursor hat keinen Hook vor einer Dateiänderung und OpenCode keinen, der beim Session-Start Kontext hinzufügt, daher überspringen die betreffenden Hooks diese Hosts; Hooks, die den Agent bei seinem Abschluss zurückschicken, überspringen Kete Code und OpenCode, deren Stop-Hooks das nicht können. Kiro-Hooks gehören zu dessen Agent-Konfigurationen und werden nicht installiert.

Die vollständige Liste findest du im englischen README: [Hooks](../../README.md#hooks), sowie in [`catalog.json`](../../catalog.json).

## MCP-Server

Kuratierte MCP-Server-Konfigurationen, die bei jedem Host, den du nutzt, in dessen eigenem Format registriert werden. Keine davon legt ein Token in einer Konfigurationsdatei ab: Remote-Server melden sich per OAuth über den Host an (`/mcp` in Claude Code, `codex mcp login`, `kete mcp auth`…), und lokale Server brauchen keine Secrets. MCP-Server sind Opt-in: `install` fügt sie nur hinzu, wenn du sie namentlich angibst.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

Pakete: `mcp-web`, `mcp-code` (GitHub, Git, Sentry und `lsp` für die Navigation per Language-Server), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Vercel, Supabase read-only, Stripe), `mcp-design` (Figma). Für Claude Code werden Server mit `claude mcp add-json --scope user` hinzugefügt (bzw. in `.mcp.json` mit `--project`); Codex erhält sie in einem markierten Block der `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode und Kete Code in ihren MCP-Konfigurationsdateien. Ein Server, den du bereits unter demselben Namen konfiguriert hast, wird nie ersetzt. Unter Windows lassen sich Claude-Code-Server so nur mit dem nativen Installer von Claude Code (`claude.exe`) hinzufügen; bei einer npm-Installation gibt kete-loom den Befehl `claude mcp add-json` aus, den du selbst ausführst. Copilot CLI erhält nur lokale Server, weil es keinen dokumentierten Weg gibt, sich dort bei Remote-Servern anzumelden.

Die vollständige Liste findest du im englischen README: [MCP-Server](../../README.md#mcp-servers), sowie in [`catalog.json`](../../catalog.json).

## Wartung

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

`audit` prüft, was dafür sorgt, dass Agents in einem Repository gut arbeiten: Agent-Anweisungen (`AGENTS.md`/`CLAUDE.md`), die Kete-Loom-Pakete für den erkannten Stack, Test- und Lint-Befehle, CI, die Sicherheits-Hooks und dass `.env`-Dateien ignoriert und nicht committet sind. Schlägt eine Prüfung fehl, endet es mit einem Exit-Code ungleich null, sodass es in CI laufen kann.

In deinem Agent findet `/loom` die passenden Bausteine für eine Aufgabe, `/checkpoint` speichert einen wiederherstellbaren Snapshot, ohne zu committen, `/sessions` listet Übergabenotizen auf und räumt sie auf, `/codemap` schreibt eine kurze Architekturübersicht, `/model-route` schlägt eine Modellstufe vor, und `/aside` beantwortet eine Nebenfrage, ohne die Aufgabe aus der Bahn zu werfen. Für dein Agent-Setup selbst prüft `/lint-agent-config` AGENTS.md, Skills, Hooks, MCP-Konfigurationen und Plugin-Manifeste auf fehlerhafte oder riskante Einstellungen, `/rules-review` vergleicht deine letzten Sessions mit deinen Regeln und schlägt vor, was hinzugefügt, umformuliert oder entfernt werden sollte, und `/usage-report` fasst Token-Verbrauch und Kosten aus lokalen Session-Logs zusammen.

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
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

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
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | wenn `~/.kiro` existiert |

Projektinstallationen (`--project`) verwenden dieselben Ordner innerhalb des Repos (`.github/agents` für Copilot, `.kete/` für Kete Code, `.kiro/` für Kiro). Kiro-Rules werden zu Steering-Dateien in `~/.kiro/steering`, eingegrenzt mit `fileMatch`.

## Mitwirken

Lies [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (Skills, Agents und Commands) und [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Jeder Pull Request muss Folgendes bestehen:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

Zwei Arten von Evals halten die Bausteine ehrlich:

- **Trigger-Evals** (`evals/triggers.json`): Ein Modell ordnet realistische Prompts und Beinahe-Treffer so zu, wie Hosts es tun, und jeder Baustein muss für seine eigenen Prompts gewählt werden und nur für diese.
- **Verhaltens-Evals** (`evals/behavior.json`): Szenarien, die den Agent unter Druck setzen, die Disziplin des Bausteins zu überspringen („just patch it, we ship in ten minutes“). Jedes läuft mit dem Baustein und ohne ihn, ein Judge-Modell bewertet jede Antwort, und der Bericht zeigt, was der Baustein beiträgt. `--host claude` führt sie als echte Headless-Sessions von Claude Code aus.

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

Der Skill `skill-authoring` führt deinen Agent Schritt für Schritt durch das Schreiben eines neuen Skills nach diesem Standard.

## Lizenz

MIT © Kete-org. Siehe [LICENSE](../../LICENSE).
