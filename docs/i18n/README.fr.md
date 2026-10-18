<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Des Agent Skills, sous-agents et commandes sélectionnés et testés pour les agents de code.</strong><br/>
Une seule source. S'installe tel quel dans Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot et Kete Code.</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

---

Kete Loom est la bibliothèque de skills sur laquelle repose [Kete Code](https://ketecode.ai). Elle fournit trois types d'éléments : des **skills** (des dossiers que l'agent charge quand ils sont pertinents), des **agents** (des sous-agents auxquels il délègue du travail) et des **commandes** (des commandes slash que vous tapez). Elle privilégie la qualité : moins d'éléments, mais chacun d'eux est

- **portable** : il s'en tient au sous-ensemble commun le plus strict du format [Agent Skills](https://agentskills.io), si bien qu'aucun hôte ne le rejette ;
- **testé** : les skills et les agents sont livrés avec des evals de déclenchement qui vérifient qu'ils se chargent pour les bonnes requêtes et restent à l'écart des autres ;
- **court** : moins de 300 lignes, les détails étant déplacés dans `references/`, que l'agent ne lit qu'en cas de besoin ;
- **versionné et étiqueté** : un numéro semver, une catégorie et un niveau de risque (`read-only`, `writes-files`, `runs-commands`, `network`) dans ses métadonnées ;
- **appuyé sur des scripts** lorsque le travail est déterministe.

## Installation

### Tout agent (recommandé)

```bash
npx @ketecode/loom install
```

Cette commande installe chaque skill dans `~/.agents/skills` (lu par Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot et Kete Code) et dans `~/.claude/skills` (Claude Code). Les agents et les commandes vont dans `~/.claude/agents` et `~/.claude/commands` (lus par Claude Code, ainsi que par Cursor et VS Code Copilot pour les agents), et dans les dossiers propres à Codex, OpenCode, Gemini CLI et Kete Code lorsque ces hôtes sont installés. Chaque agent et chaque commande est converti au format attendu par son hôte. Redémarrez ensuite votre agent.

Vous pouvez aussi choisir un profil au lieu de tout installer :

| Profil | Ce qu'il installe |
|---|---|
| `minimal` | Développement piloté par les tests, vérification, revue de sécurité, revue de code |
| `core` | L'essentiel, la planification, git, la prise en main d'un projet et le passage de relais entre sessions, **plus les packs de langages et de frameworks utilisés par votre projet** (détectés à partir de `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile`, etc.) |
| `developer` | `core` plus les quatre hooks de sécurité |
| `security` | Tous les éléments de sécurité et de conformité, plus les hooks de sécurité |
| `ai`, `data` | `core` plus tous les éléments IA ou données |
| `business` | Skills de marketing, de recherche, de relations investisseurs, de rédaction, de PRD et d'opérations |
| `full` | Tout, y compris chaque hook |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

Les profils se combinent avec `--skill`, `--agent`, `--command` et `--hook`, et `uninstall --profile <name>` ne supprime que les éléments de ce profil.

Options courantes :

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

Pas de Node ? Utilisez les installateurs shell, qui se rabattent sur une simple copie des skills (les agents et les commandes nécessitent l'installateur Node) :

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Installation en tant que plugin natif

| Hôte | Commande |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` puis `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` puis `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Utilisez l'installateur `npx` (Gemini lit `~/.agents/skills`). Un fichier `gemini-extension.json` est fourni pour `gemini extensions install https://github.com/Kete-org/kete-loom` (expérimental) |
| Toute CLI de skills | `npx skills add Kete-org/kete-loom` |

Les installations par plugin se mettent à jour via le gestionnaire de plugins de l'hôte. Pour un hôte donné, utilisez soit l'installation par plugin, soit l'installateur `npx`, mais pas les deux : sinon l'hôte risque d'afficher chaque skill en double.

## Skills

La liste complète se trouve dans le README en anglais : [Skills](../../README.md#skills), ainsi que dans `catalog.json`.

## Agents

Des sous-agents auxquels votre agent peut déléguer du travail. Chacun s'exécute dans son propre contexte et renvoie un résultat.

La liste complète se trouve dans le README en anglais : [Agents](../../README.md#agents), ainsi que dans `catalog.json`.

## Commandes

Des commandes slash que vous tapez, par exemple `/verify`. Elles sont prises en charge dans Claude Code, OpenCode, Gemini CLI et Kete Code ; les autres hôtes intègrent progressivement les commandes aux skills : utilisez donc le skill correspondant sur ces hôtes.

La liste complète se trouve dans le README en anglais : [Commands](../../README.md#commands), ainsi que dans `catalog.json`.

## Règles

Des conventions courtes, toujours actives, que l'agent suit sans qu'on le lui demande, comme « ne jamais construire de SQL à partir de chaînes » ou « exécuter go vet ». Les règles propres à un langage ne s'appliquent qu'aux fichiers de ce langage lorsque l'hôte le permet (Claude Code, Copilot, Cursor). Kete Code, Gemini CLI, OpenCode et Codex ne savent pas limiter les règles à certains chemins : ils ne reçoivent donc que les règles que vous choisissez, via un bloc balisé dans leur fichier d'instructions.

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

La liste complète se trouve dans le README en anglais : [Rules](../../README.md#rules), ainsi que dans `catalog.json`.

## Hooks

Des vérifications qui s'exécutent automatiquement à certains moments de la boucle de l'agent : avant une commande shell ou la modification d'un fichier (avec la possibilité de la bloquer, en donnant une raison que l'agent voit), après une modification, ou au démarrage d'une session. Les hooks sont optionnels : `install` ne les ajoute jamais sauf si vous le demandez.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

L'installateur enregistre chaque hook auprès de Claude Code et de tous les autres hôtes qu'il trouve : Claude Code et Gemini CLI dans leur `settings.json`, Kete Code dans `kete.json`, Codex et Cursor dans leur `hooks.json`, Copilot CLI dans `~/.copilot/hooks/` et OpenCode sous forme de plugin. Il n'ajoute et ne supprime que ses propres entrées, sauvegarde un fichier dans `<file>.kete-loom-backup` avant de le modifier, et ne réécrit jamais un fichier qui contient des commentaires (il affiche alors l'extrait à coller vous-même). Codex n'exécute un nouveau hook qu'une fois que vous lui avez accordé votre confiance avec `/hooks`. Les hooks s'installent uniquement pour votre compte utilisateur, pas par projet. Cursor n'a pas de hook avant modification et OpenCode n'en a aucun qui ajoute du contexte au démarrage de session ; les hooks concernés ignorent donc ces hôtes.

La liste complète se trouve dans le README en anglais : [Hooks](../../README.md#hooks), ainsi que dans `catalog.json`.

## Serveurs MCP

Des configurations de serveurs MCP sélectionnées, enregistrées auprès de chaque hôte que vous utilisez, dans le format propre à cet hôte. Aucune ne place de jeton dans un fichier de configuration : les serveurs distants s'authentifient via OAuth par l'intermédiaire de l'hôte (`/mcp` dans Claude Code, `codex mcp login`, `kete mcp auth`…), et les serveurs locaux ne nécessitent aucun secret. Les serveurs MCP sont optionnels : `install` ne les ajoute jamais sauf si vous les nommez.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

Packs : `mcp-web`, `mcp-code` (GitHub, Git, Sentry), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Supabase en lecture seule, Stripe), `mcp-design` (Figma). Les serveurs pour Claude Code sont ajoutés avec `claude mcp add-json --scope user` (ou dans `.mcp.json` avec `--project`) ; Codex les reçoit dans un bloc balisé de `config.toml` ; Gemini CLI, Cursor, Copilot CLI, OpenCode et Kete Code dans leurs fichiers de configuration MCP. Un serveur que vous avez déjà configuré sous le même nom n'est jamais remplacé. Copilot CLI ne reçoit que les serveurs locaux, car il n'offre aucun moyen documenté de s'authentifier auprès des serveurs distants.

La liste complète se trouve dans le README en anglais : [MCP servers](../../README.md#mcp-servers), ainsi que dans `catalog.json`.

## Où les hôtes cherchent

### Skills

| Hôte | Dossier utilisateur | Dossier du projet |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode uniquement | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor uniquement | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI uniquement | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot uniquement | `~/.copilot/skills` | `.github/skills` |
| Kete Code uniquement | `~/.config/kete/skills` | `.kete/skills` |

### Agents et commandes

| Hôte | Agents | Commandes | Installé par défaut |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | oui |
| Cursor, VS Code Copilot | lisent `~/.claude/agents` | non installées (celles de Cursor sont en bêta ; VS Code utilise des fichiers de prompts propres au projet) | oui, via le dossier de Claude |
| Codex | `~/.codex/agents` (TOML) | dépréciées par Codex | si `~/.codex` existe |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | si `~/.config/opencode` existe |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | si `~/.config/kete` existe |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | si `~/.gemini` existe |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | non prises en charge | avec `--target copilot` |

Les installations au niveau du projet (`--project`) utilisent les mêmes dossiers, à l'intérieur du dépôt (`.github/agents` pour Copilot, `.kete/` pour Kete Code).

## Contribuer

Lisez [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agents et commandes) et [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Chaque pull request doit passer :

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

Le skill `skill-authoring` guide votre agent dans la rédaction d'un nouveau skill conforme à ce standard.

## Licence

MIT © Kete-org. Voir [LICENSE](../../LICENSE).
