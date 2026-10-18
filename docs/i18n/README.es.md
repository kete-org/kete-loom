<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Agent Skills, subagentes y comandos seleccionados y probados para agentes de programación.</strong><br/>
Una sola fuente. Se instala sin cambios en Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot, Kete Code y Kiro.</p>

<!-- translated from README.md, source afc59924c2be -->

<!-- counts:start --><!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom es la biblioteca de skills que hay detrás de [Kete Code](https://ketecode.ai). Incluye **skills** (carpetas que el agente carga cuando son relevantes), **agentes** (subagentes en los que delega), **comandos** (comandos de barra que escribes tú), **reglas** (indicaciones breves siempre activas), **hooks** (comprobaciones que se ejecutan en torno a las llamadas a herramientas del agente y cuando termina) y **configuraciones de servidores MCP**. Prioriza la calidad: menos elementos, y cada uno de ellos es

- **portable**: usa el subconjunto común más estricto del formato [Agent Skills](https://agentskills.io), para que ningún host lo rechace;
- **probado**: los skills y los agentes incluyen evals de activación que comprueban que se cargan ante las peticiones adecuadas y no interfieren ante las que no lo son, y los skills de disciplina añaden evals de comportamiento que comprueban que el agente realmente los sigue bajo presión, en comparación con una ejecución sin el skill;
- **breve**: menos de 300 líneas, con el detalle trasladado a `references/`, que el agente lee solo cuando lo necesita;
- **versionado y etiquetado**: semver, categoría y un nivel de riesgo (`read-only`, `writes-files`, `runs-commands`, `network`) en sus metadatos;
- **respaldado por scripts** cuando el trabajo es determinista.

## Instalación

### Cualquier agente (recomendado)

```bash
npx @ketecode/loom install
```

Esto instala todos los skills en `~/.agents/skills` (que leen Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot y Kete Code) y en `~/.claude/skills` (Claude Code). Los agentes y los comandos van a `~/.claude/agents` y `~/.claude/commands` (que lee Claude Code y, en el caso de los agentes, también Cursor y VS Code Copilot), y a las carpetas propias de Codex, OpenCode, Gemini CLI, Kete Code y Kiro cuando esos hosts están instalados (Kiro también recibe su propia copia de los skills). Cada agente y cada comando se convierte al formato que espera su host. Después, reinicia tu agente.

O elige un perfil en lugar de instalarlo todo:

| Perfil | Qué instala |
|---|---|
| `minimal` | Trabajo guiado por pruebas, verificación, revisión de seguridad, revisión de código |
| `core` | Lo esencial, planificación, git, incorporación al proyecto y traspaso entre sesiones, **más los paquetes de lenguaje y framework que usa tu proyecto** (detectados a partir de `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile`, etc.) |
| `developer` | `core` más los cuatro hooks de seguridad |
| `strict` | `developer` más las salvaguardas opcionales: leer antes de editar, configuraciones de lint protegidas, servidores de desarrollo en segundo plano, permanecer en el worktree, ni lecturas de secretos ni instrucciones inyectadas, avisos sobre texto inyectado en lo que lee, ningún truncamiento accidental de archivos, un aviso antes de que se llene el contexto, mensajes de commit válidos y, al final, ni stubs sin terminar ni fallos de lint o de comprobación de tipos |
| `method` | Un método de desarrollo completo: diseño antes del código, planes granulares, un subagente nuevo por tarea con revisión de especificación y de calidad, depuración sistemática, respuesta a las revisiones, worktrees y un cierre limpio |
| `project` | `method` más la planificación del proyecto: una hoja de ruta con fases en `.planning/`, aclaración de requisitos, comprobación de los planes antes del código, pruebas de aceptación contigo, un backlog de ideas, spikes de viabilidad y comandos de recuperación |
| `security` | Todos los elementos de seguridad y cumplimiento normativo, más los hooks de seguridad |
| `ai`, `data` | `core` más todos los elementos de IA o de datos |
| `business` | Skills de marketing, investigación, inversores, redacción, PRD y operaciones |
| `full` | Todo, con todos los hooks que no son opcionales |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

Los perfiles se combinan con `--skill`, `--agent`, `--command` y `--hook`, y `uninstall --profile <name>` elimina solo los elementos de ese perfil.

Opciones habituales:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

¿No tienes Node? Usa los instaladores de shell, que recurren a una copia simple de los skills (los agentes y los comandos requieren el instalador de Node):

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Instalación como plugin nativo

| Host | Comando |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` y después `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` y después `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Usa el instalador `npx` (Gemini lee `~/.agents/skills`). Se incluye un `gemini-extension.json` para `gemini extensions install https://github.com/Kete-org/kete-loom` (experimental) |
| Cualquier CLI de skills | `npx skills add Kete-org/kete-loom` |

Las instalaciones como plugin se actualizan mediante el gestor de plugins del propio host. Para un mismo host, usa o bien la instalación como plugin o bien el instalador `npx`, no ambos; de lo contrario, el host podría mostrar cada skill dos veces.

## Un método de desarrollo

Instala `--profile method` para tener una forma de trabajar completa, desde la idea hasta la rama fusionada, con un control de revisión en cada paso:

| Paso | Usa | Qué ocurre |
|---|---|---|
| 1. Diseñar | `/brainstorm` (`design-brainstorming`) | Una pregunta cada vez, dos o tres enfoques con sus pros y contras, tu aprobación sección por sección, maquetas HTML para las decisiones visuales y, después, un documento de diseño en el repositorio. |
| 2. Aislar | `git-worktrees` | Un worktree independiente e ignorado por git, con las dependencias instaladas y una ejecución de pruebas de referencia, para conocer los fallos existentes. |
| 3. Planificar | `/plan-feature` (`implementation-plans`) | Tareas de unos pocos minutos cada una, con los archivos exactos, la prueba que falla que hay que escribir primero, el comando que hay que ejecutar y su salida esperada, y un commit por tarea. |
| 4. Construir | `subagent-driven-development` con el agente `task-implementer` | Un subagente nuevo por tarea trabaja guiado por pruebas e informa de un estado. El `spec-reviewer` lo comprueba frente a la tarea y después `code-reviewer` comprueba su calidad, repitiendo hasta que ambos lo aprueban. |
| 5. Depurar | `/debug` (`systematic-debugging`) | La causa raíz antes de cualquier corrección: reproducir, rastrear el valor erróneo hasta su origen, una hipótesis cada vez. Tras tres correcciones fallidas, se detiene y cuestiona el diseño. |
| 6. Revisar | `responding-to-code-review` | Contrasta cada comentario con el código, rebate con pruebas cuando una sugerencia es incorrecta y responde en el hilo de la revisión. |
| 7. Terminar | `/finish-branch` (`finishing-a-branch`) | Primero las pruebas; después, fusionar localmente, abrir un pull request, conservar la rama o descartarla (solo después de que escribas una confirmación). |

`/feature-dev` ejecuta toda la secuencia con una pausa para tu aprobación entre etapas, y la regla `use-skills` hace que el agente recurra a estos skills en lugar de trabajar de memoria.

Para trabajos más grandes que una sola funcionalidad, `--profile project` añade la planificación que los rodea. Todo se guarda en archivos Markdown simples dentro de `.planning/`, que puedes leer, editar e incluir en un commit:

| Necesidad | Usa |
|---|---|
| Una hoja de ruta de hitos y fases vinculados a requisitos numerados, con un estado actual que se conserva entre sesiones | `project-roadmap`; `/progress` indica en qué punto están las cosas y nombra la siguiente acción |
| Requisitos bien definidos antes de planificar: las zonas grises, las suposiciones del agente con sus pruebas, los casos límite | `spec-clarification`, `assumptions-analyzer` |
| Un plan comprobado frente a su objetivo antes de escribir código | `plan-checker` |
| "¿Puede esto funcionar siquiera?" respondido con un experimento de duración limitada y un veredicto | `feasibility-spike` |
| Pruebas de aceptación contigo, un entregable cada vez | `/uat` (`acceptance-testing`), `ui-auditor` |
| Ideas y tareas pendientes guardadas sin desviarte de la tarea actual | `/capture` (`idea-backlog`) |
| Recuperación: corregir una lista de hallazgos de revisión, averiguar por qué falló un esfuerzo de varias sesiones, deshacer trabajo de forma segura | `/fix-findings`, `/forensics`, `/revert-work` |

## Skills

La lista completa está en el README en inglés: [Skills](../../README.md#skills), y en `catalog.json`.

## Agentes

Subagentes en los que tu agente puede delegar. Cada uno se ejecuta en su propio contexto y devuelve un resultado.

La lista completa está en el README en inglés: [Agentes](../../README.md#agents), y en `catalog.json`.

## Comandos

Comandos de barra que escribes tú, por ejemplo `/verify`. Son compatibles con Claude Code, OpenCode, Gemini CLI y Kete Code; los demás hosts están integrando los comandos en los skills, así que allí usa el skill correspondiente.

La lista completa está en el README en inglés: [Comandos](../../README.md#commands), y en `catalog.json`.

## Reglas

Convenciones breves y siempre activas que el agente sigue sin que se lo pidas, como "nunca construyas SQL a partir de cadenas" o "ejecuta go vet". Las reglas de un lenguaje se aplican solo a los archivos de ese lenguaje cuando el host lo permite (Claude Code, Copilot, Cursor). Kete Code, Gemini CLI, OpenCode y Codex no pueden limitar las reglas a determinadas rutas, así que solo reciben las reglas que elijas, mediante un bloque marcado en su archivo de instrucciones.

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

La lista completa está en el README en inglés: [Reglas](../../README.md#rules), y en `catalog.json`.

## Hooks

Comprobaciones que se ejecutan automáticamente en ciertos puntos del ciclo del agente: antes de un comando de shell o de la edición de un archivo (y pueden bloquearlo, con un motivo que el agente ve), después de una edición, después de leer un archivo o una web o de cualquier llamada a una herramienta (y pueden añadir una nota para el agente), al iniciar una sesión o cuando el agente termina su turno (y pueden devolverlo al trabajo). Los hooks son opcionales: `install` nunca los añade a menos que lo pidas. Los hooks marcados como opcionales cambian la forma de trabajar del agente, así que `--hooks` los deja fuera; nómbralos o usa `--profile strict`.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

El instalador registra cada hook en Claude Code y en cualquier otro host que encuentre: Claude Code y Gemini CLI en su `settings.json`, Kete Code en `kete.json`, Codex y Cursor en su `hooks.json`, Copilot CLI en `~/.copilot/hooks/` y OpenCode como plugin. Solo añade y elimina sus propias entradas, hace una copia de seguridad del archivo en `<file>.kete-loom-backup` antes de modificarlo y nunca reescribe un archivo que contenga comentarios (en su lugar, muestra el fragmento que debes pegar). Codex solo ejecuta un hook nuevo después de que lo marques como de confianza con `/hooks`. Los hooks se instalan solo para tu usuario, no por proyecto. Cursor no tiene un hook previo a la edición y OpenCode no tiene ninguno que añada contexto al iniciar la sesión, así que esos hooks se omiten en ellos; los hooks que devuelven al agente al trabajo cuando termina omiten Kete Code y OpenCode, cuyos hooks de parada no pueden hacerlo. Los hooks de Kiro forman parte de sus configuraciones de agente y no se instalan.

La lista completa está en el README en inglés: [Hooks](../../README.md#hooks), y en `catalog.json`.

## Servidores MCP

Configuraciones seleccionadas de servidores MCP, registradas en cada host que uses con el formato propio de ese host. Ninguna guarda un token en un archivo de configuración: los servidores remotos inician sesión con OAuth a través del host (`/mcp` en Claude Code, `codex mcp login`, `kete mcp auth`…), y los servidores locales no necesitan secretos. Los servidores MCP son opcionales: `install` nunca los añade a menos que los nombres.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

Paquetes: `mcp-web`, `mcp-code` (GitHub, Git, Sentry), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Supabase en solo lectura, Stripe), `mcp-design` (Figma). Los servidores de Claude Code se añaden con `claude mcp add-json --scope user` (o en `.mcp.json` con `--project`); Codex los recibe en un bloque marcado de `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode y Kete Code, en sus archivos de configuración de MCP. Un servidor que ya hayas configurado con el mismo nombre nunca se reemplaza. Copilot CLI solo recibe servidores locales, porque no tiene una forma documentada de iniciar sesión en los remotos.

La lista completa está en el README en inglés: [Servidores MCP](../../README.md#mcp-servers), y en `catalog.json`.

## Mantenimiento

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

`audit` comprueba lo que hace que los agentes funcionen bien en un repositorio: las instrucciones para agentes (`AGENTS.md`/`CLAUDE.md`), los paquetes de Kete Loom para el stack que detecta, los comandos de pruebas y de lint, la CI, los hooks de seguridad y que los archivos `.env` estén ignorados y no se hayan confirmado en el repositorio. Termina con un código distinto de cero cuando falla una comprobación, así que puede ejecutarse en CI.

Dentro de tu agente, `/loom` encuentra los elementos adecuados para una tarea, `/checkpoint` guarda una instantánea restaurable sin hacer commit, `/sessions` lista y ordena las notas de traspaso, `/codemap` escribe un mapa breve de la arquitectura, `/model-route` sugiere un nivel de modelo y `/aside` responde una pregunta secundaria sin desviar la tarea.

## Dónde buscan los hosts

### Skills

| Host | Carpeta de usuario | Carpeta de proyecto |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Solo OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| Solo Cursor | `~/.cursor/skills` | `.cursor/skills` |
| Solo Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| Solo GitHub Copilot | `~/.copilot/skills` | `.github/skills` |
| Solo Kete Code | `~/.config/kete/skills` | `.kete/skills` |
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

### Agentes y comandos

| Host | Agentes | Comandos | Instalado por defecto |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | sí |
| Cursor, VS Code Copilot | leen `~/.claude/agents` | no se instalan (los de Cursor están en beta; VS Code usa archivos de prompt del proyecto) | sí, a través de la carpeta de Claude |
| Codex | `~/.codex/agents` (TOML) | obsoletos en Codex | cuando existe `~/.codex` |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | cuando existe `~/.config/opencode` |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | cuando existe `~/.config/kete` |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | cuando existe `~/.gemini` |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | no compatible | con `--target copilot` |
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | cuando existe `~/.kiro` |

Las instalaciones de proyecto (`--project`) usan las mismas carpetas dentro del repositorio (`.github/agents` para Copilot, `.kete/` para Kete Code, `.kiro/` para Kiro). Las reglas de Kiro se convierten en archivos de steering en `~/.kiro/steering`, delimitados con `fileMatch`.

## Contribuir

Lee [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agentes y comandos) y [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Cada pull request debe superar:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

Dos tipos de evals mantienen honestos los elementos:

- **Evals de activación** (`evals/triggers.json`): un modelo enruta prompts realistas y casi aciertos como lo hacen los hosts, y cada elemento debe elegirse para sus propios prompts y solo para esos.
- **Evals de comportamiento** (`evals/behavior.json`): escenarios que presionan al agente para que se salte la disciplina del elemento ("just patch it, we ship in ten minutes"). Cada uno se ejecuta con el elemento y sin él, un modelo juez califica cada respuesta y el informe muestra lo que aporta el elemento. `--host claude` los ejecuta como sesiones reales de Claude Code sin interfaz.

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

El skill `skill-authoring` guía a tu agente para escribir un skill nuevo conforme a este estándar.

## Licencia

MIT © Kete-org. Consulta [LICENSE](../../LICENSE).
