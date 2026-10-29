<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Des Agent Skills, sous-agents et commandes sélectionnés et testés pour les agents de code.</strong><br/>
Une seule source. S'installe tel quel dans Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot, Kete Code et Kiro.</p>

<!-- translated from README.md, source 71f6d298dd66 -->

<!-- counts:start --><!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom est la bibliothèque de skills sur laquelle repose [Kete Code](https://ketecode.ai). Elle fournit des **skills** (des dossiers que l'agent charge quand ils sont pertinents), des **agents** (des sous-agents auxquels il délègue du travail), des **commandes** (des commandes slash que vous tapez), des **règles** (de courtes consignes toujours actives), des **hooks** (des vérifications qui s'exécutent autour des appels d'outils de l'agent et lorsqu'il termine) et des **configurations de serveurs MCP**. Elle privilégie la qualité : moins d'éléments, mais chacun d'eux est

- **portable** : il s'en tient au sous-ensemble commun le plus strict du format [Agent Skills](https://agentskills.io), si bien qu'aucun hôte ne le rejette ;
- **testé** : les skills et les agents sont livrés avec des evals de déclenchement qui vérifient qu'ils se chargent pour les bonnes requêtes et restent à l'écart des autres, et les skills de discipline y ajoutent des evals de comportement qui vérifient que l'agent les suit réellement sous pression, en comparaison avec une exécution sans le skill ;
- **court** : moins de 300 lignes, les détails étant déplacés dans `references/`, que l'agent ne lit qu'en cas de besoin ;
- **versionné et étiqueté** : un numéro semver, une catégorie et un niveau de risque (`read-only`, `writes-files`, `runs-commands`, `network`) dans ses métadonnées ;
- **appuyé sur des scripts** lorsque le travail est déterministe.

## Installation

### Tout agent (recommandé)

```bash
npx @ketecode/loom install
```

Cette commande installe chaque skill dans `~/.agents/skills` (lu par Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot et Kete Code) et dans `~/.claude/skills` (Claude Code). Les agents et les commandes vont dans `~/.claude/agents` et `~/.claude/commands` (lus par Claude Code, ainsi que par Cursor et VS Code Copilot pour les agents), et dans les dossiers propres à Codex, OpenCode, Gemini CLI, Kete Code et Kiro lorsque ces hôtes sont installés (Kiro reçoit aussi sa propre copie des skills). Chaque agent et chaque commande est converti au format attendu par son hôte. Redémarrez ensuite votre agent.

Vous pouvez aussi choisir un profil au lieu de tout installer :

| Profil | Ce qu'il installe |
|---|---|
| `minimal` | Développement piloté par les tests, vérification, revue de sécurité, revue de code |
| `core` | L'essentiel, la planification, git, la prise en main d'un projet et le passage de relais entre sessions, **plus les packs de langages et de frameworks utilisés par votre projet** (détectés à partir de `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile`, etc.) |
| `developer` | `core` plus les quatre hooks de sécurité |
| `strict` | `developer` plus les garde-fous optionnels : lire avant de modifier, configurations de lint protégées, serveurs de développement en arrière-plan, rester dans le worktree, aucune lecture de secrets ni d'instructions dissimulées, des avertissements sur le texte injecté dans ce qu'il lit, aucune troncature accidentelle de fichier, un avertissement avant que le contexte ne se remplisse, des messages de commit valides, et ni ébauches inachevées ni échec du lint et de la vérification des types à la fin |
| `method` | Une méthode de développement complète : la conception avant le code, des plans détaillés, un sous-agent neuf par tâche avec revue de conformité à la spécification et de qualité, un débogage méthodique, la réponse aux revues, des worktrees et une fin de branche propre |
| `project` | `method` plus la planification de projet : une feuille de route avec des phases dans `.planning/`, la clarification des exigences, la vérification des plans avant le code, des tests d'acceptation avec vous, un backlog d'idées, des spikes de faisabilité et des commandes de récupération |
| `security` | Tous les éléments de sécurité et de conformité, plus les hooks de sécurité |
| `ai`, `data` | `core` plus tous les éléments IA ou données |
| `business` | Skills de marketing, de contenu LinkedIn, de recherche, de relations investisseurs, de rédaction, de PRD et d'opérations |
| `design` | `core` plus le travail d'interface : des design systems issus du contexte produit, avec des tokens au contraste vérifié et un DESIGN.md, la finition, l'accessibilité, l'animation, l'auditeur d'UI et `/design-ui` |
| `full` | Tout, avec chaque hook qui n'est pas optionnel |

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

Le plugin Claude Code active aussi les quatre hooks de sécurité du profil `developer` (`block-dangerous-commands`, `block-no-verify`, `guard-secrets`, `protect-files`). Ils sont en lecture seule et ne font que bloquer les commandes shell et les modifications risquées ; ils ont besoin de Node.js dans votre `PATH`. Si vous en avez déjà installé avec `npx`, désinstallez cette copie (`npx @ketecode/loom uninstall --hook <name>`), sinon ils s'exécutent deux fois. Les autres hooks s'installent toujours avec l'installateur `npx`.

## Une méthode de développement

Installez `--profile method` pour une façon de travailler complète, de l'idée à la branche fusionnée, avec un point de contrôle de revue à chaque étape :

| Étape | Outil | Ce qui se passe |
|---|---|---|
| 1. Concevoir | `/brainstorm` (`design-brainstorming`) | Une question à la fois, deux ou trois approches avec leurs compromis, votre validation section par section, des maquettes HTML pour les choix visuels, puis un document de conception dans le dépôt. |
| 2. Isoler | `git-worktrees` | Un worktree séparé, ignoré par git, avec les dépendances installées et une exécution de référence des tests, afin de connaître les échecs existants. |
| 3. Planifier | `/plan-feature` (`implementation-plans`) | Des tâches de quelques minutes chacune, avec les fichiers exacts, le test en échec à écrire d'abord, la commande à exécuter et sa sortie attendue, et un commit par tâche. |
| 4. Construire | `subagent-driven-development` avec l'agent `task-implementer` | Un sous-agent neuf par tâche travaille en commençant par les tests et rend compte d'un statut. Le `spec-reviewer` le vérifie par rapport à la tâche, puis `code-reviewer` en vérifie la qualité, en boucle jusqu'à ce que les deux soient satisfaits. |
| 5. Déboguer | `/debug` (`systematic-debugging`) | La cause racine avant tout correctif : reproduire, remonter la valeur erronée jusqu'à sa source, une hypothèse à la fois. Après trois correctifs ratés, il s'arrête et remet en question la conception. |
| 6. Revue | `responding-to-code-review` | Vérifie chaque commentaire par rapport au code, conteste avec des preuves lorsqu'une suggestion est erronée, et répond dans le fil de la revue. |
| 7. Terminer | `/finish-branch` (`finishing-a-branch`) | Les tests d'abord, puis fusionner en local, ouvrir une pull request, conserver la branche ou la supprimer (seulement après que vous avez tapé une confirmation). |

`/feature-dev` exécute toute la séquence en s'arrêtant pour attendre votre validation entre les étapes, et la règle `use-skills` pousse l'agent à recourir à ces skills au lieu de travailler de mémoire.

Pour un travail plus vaste qu'une seule fonctionnalité, `--profile project` ajoute la planification autour. Tout est conservé dans de simples fichiers Markdown sous `.planning/`, que vous pouvez lire, modifier et committer :

| Besoin | Outil |
|---|---|
| Une feuille de route de jalons et de phases liés à des exigences numérotées, avec un état courant qui persiste d'une session à l'autre | `project-roadmap` ; `/progress` indique où en sont les choses et nomme la prochaine action |
| Des exigences précisées avant la planification : les zones d'ombre, les hypothèses de l'agent avec leurs preuves, les cas limites | `spec-clarification`, `assumptions-analyzer` |
| Un plan vérifié par rapport à son objectif avant qu'une seule ligne de code soit écrite | `plan-checker` |
| « Est-ce que cela peut seulement fonctionner ? » tranché par une expérience limitée dans le temps et un verdict | `feasibility-spike` |
| Des tests d'acceptation avec vous, un livrable à la fois | `/uat` (`acceptance-testing`), `ui-auditor` |
| Des idées et des tâches à faire enregistrées sans faire dérailler la tâche en cours | `/capture` (`idea-backlog`) |
| Récupération : corriger une liste de constats de revue, comprendre pourquoi un effort sur plusieurs sessions a mal tourné, annuler du travail en toute sécurité | `/fix-findings`, `/forensics`, `/revert-work` |

### Apprendre de chaque session

Les skills s'améliorent grâce aux frictions rencontrées dans le travail réel, c'est pourquoi Kete Loom en tient un journal. Le skill `skill-observations` note chaque constat au moment où il se produit : une correction que vous avez donnée, une règle que l'agent a enfreinte, une étape manquante ou un workflow qui mérite son propre skill. Il écrit chacun d'eux sous forme d'un petit fichier via `kete-loom observe`. `/skill-review` transforme ensuite le journal en modifications que vous approuvez une par une.

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

Le journal vous appartient et reste sur votre machine, dans `~/.kete-loom/observations/`. Il est conservé au niveau de l'utilisateur, afin que les constats ne soient pas dispersés entre les projets ni perdus avec un worktree supprimé. La CLI impose la tenue du registre :
- les identifiants ne se répètent jamais, et un fichier existant n'est jamais écrasé ;
- un constat reformulé est refusé au profit d'une extension de l'original ;
- chaque constat doit indiquer quels skills liés ont été vérifiés ;
- une règle enfreinte deux fois est signalée pour un hook (`/hookify`) plutôt que pour une nouvelle reformulation.

Les revues préparent les modifications et ne modifient jamais sur place un skill Kete Loom installé, puisque `update` l'écraserait ; ces modifications deviennent un brouillon de modification en amont plus, si nécessaire, une règle de projet. Avec le hook `load-session-context` installé, chaque session commence en sachant ce qui reste ouvert. Les deux éléments font partie de `--profile method`.

L'approche est adaptée de [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all) par Eoghan Henn et ses contributeurs (CC BY 4.0).

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

Des vérifications qui s'exécutent automatiquement à certains moments de la boucle de l'agent : avant une commande shell ou la modification d'un fichier (avec la possibilité de la bloquer, en donnant une raison que l'agent voit), après une modification, après la lecture d'un fichier ou d'une page web ou tout appel d'outil (avec la possibilité d'ajouter une note pour l'agent), au démarrage d'une session, ou lorsque l'agent termine son tour (avec la possibilité de le renvoyer au travail). Les hooks sont optionnels : `install` ne les ajoute jamais sauf si vous le demandez. Les hooks marqués comme optionnels changent la façon dont l'agent travaille ; `--hooks` les laisse donc de côté : nommez-les, ou utilisez `--profile strict`.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

L'installateur enregistre chaque hook auprès de Claude Code et de tous les autres hôtes qu'il trouve : Claude Code et Gemini CLI dans leur `settings.json`, Kete Code dans `kete.json`, Codex et Cursor dans leur `hooks.json`, Copilot CLI dans `~/.copilot/hooks/` et OpenCode sous forme de plugin. Il n'ajoute et ne supprime que ses propres entrées, sauvegarde un fichier dans `<file>.kete-loom-backup` avant de le modifier, et ne réécrit jamais un fichier qui contient des commentaires (il affiche alors l'extrait à coller vous-même). Codex n'exécute un nouveau hook qu'une fois que vous lui avez accordé votre confiance avec `/hooks`. Les hooks s'installent uniquement pour votre compte utilisateur, pas par projet. Cursor n'a pas de hook avant modification et OpenCode n'en a aucun qui ajoute du contexte au démarrage de session ; les hooks concernés ignorent donc ces hôtes ; les hooks qui renvoient l'agent au travail lorsqu'il termine ignorent Kete Code et OpenCode, dont les hooks d'arrêt n'en sont pas capables. Les hooks de Kiro font partie de ses configurations d'agents et ne sont pas installés.

La liste complète se trouve dans le README en anglais : [Hooks](../../README.md#hooks), ainsi que dans `catalog.json`.

## Serveurs MCP

Des configurations de serveurs MCP sélectionnées, enregistrées auprès de chaque hôte que vous utilisez, dans le format propre à cet hôte. Aucune ne place de jeton dans un fichier de configuration : les serveurs distants s'authentifient via OAuth par l'intermédiaire de l'hôte (`/mcp` dans Claude Code, `codex mcp login`, `kete mcp auth`…), et les serveurs locaux ne nécessitent aucun secret. Les serveurs MCP sont optionnels : `install` ne les ajoute jamais sauf si vous les nommez.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

Packs : `mcp-web`, `mcp-code` (GitHub, Git, Sentry, et `lsp` pour la navigation par serveur de langage), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Vercel, Supabase en lecture seule, Stripe), `mcp-design` (Figma). Les serveurs pour Claude Code sont ajoutés avec `claude mcp add-json --scope user` (ou dans `.mcp.json` avec `--project`) ; Codex les reçoit dans un bloc balisé de `config.toml` ; Gemini CLI, Cursor, Copilot CLI, OpenCode et Kete Code dans leurs fichiers de configuration MCP. Un serveur que vous avez déjà configuré sous le même nom n'est jamais remplacé. Sous Windows, les serveurs Claude Code ne peuvent être ajoutés ainsi qu'avec l'installateur natif de Claude Code (`claude.exe`) ; avec une installation npm, kete-loom affiche la commande `claude mcp add-json` à lancer vous-même. Copilot CLI ne reçoit que les serveurs locaux, car il n'offre aucun moyen documenté de s'authentifier auprès des serveurs distants.

La liste complète se trouve dans le README en anglais : [MCP servers](../../README.md#mcp-servers), ainsi que dans `catalog.json`.

## Maintenance

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

`audit` vérifie ce qui permet aux agents de bien fonctionner dans un dépôt : les instructions pour les agents (`AGENTS.md`/`CLAUDE.md`), les packs Kete Loom correspondant à la stack qu'il détecte, les commandes de test et de lint, la CI, les hooks de sécurité, et le fait que les fichiers `.env` sont ignorés et non commités. Il se termine avec un code non nul lorsqu'une vérification échoue, ce qui permet de l'exécuter en CI.

Dans votre agent, `/loom` trouve les éléments adaptés à une tâche, `/checkpoint` enregistre un instantané restaurable sans faire de commit, `/sessions` liste et range les notes de passage de relais, `/codemap` rédige une courte carte de l'architecture, `/model-route` suggère un niveau de modèle, et `/aside` répond à une question annexe sans détourner l'agent de sa tâche. Pour la configuration de votre agent elle-même, `/lint-agent-config` vérifie AGENTS.md, les skills, les hooks, les configurations MCP et les manifestes de plugin à la recherche de réglages cassés ou risqués, `/rules-review` compare vos sessions récentes avec vos règles et suggère ce qu'il faut ajouter, reformuler ou retirer, et `/usage-report` résume la consommation de tokens et le coût à partir des journaux de session locaux.

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
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

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
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | si `~/.kiro` existe |

Les installations au niveau du projet (`--project`) utilisent les mêmes dossiers, à l'intérieur du dépôt (`.github/agents` pour Copilot, `.kete/` pour Kete Code, `.kiro/` pour Kiro). Les règles de Kiro deviennent des fichiers de steering dans `~/.kiro/steering`, limités avec `fileMatch`.

## Contribuer

Lisez [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agents et commandes) et [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Chaque pull request doit passer :

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

Deux types d'evals garantissent la fiabilité des éléments :

- **Evals de déclenchement** (`evals/triggers.json`) : un modèle aiguille des prompts réalistes et des quasi-correspondances comme le font les hôtes, et chaque élément doit être choisi pour ses propres prompts, et uniquement pour ceux-là.
- **Evals de comportement** (`evals/behavior.json`) : des scénarios qui poussent l'agent à contourner la discipline de l'élément (« corrige-le vite fait, on livre dans dix minutes »). Chacun s'exécute avec l'élément et sans lui, un modèle juge note chaque réponse, et le rapport montre ce que l'élément apporte. `--host claude` les exécute sous forme de véritables sessions Claude Code headless.

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

Le skill `skill-authoring` guide votre agent dans la rédaction d'un nouveau skill conforme à ce standard.

## Licence

MIT © Kete-org. Voir [LICENSE](../../LICENSE).
