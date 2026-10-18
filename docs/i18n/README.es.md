<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Agent Skills, subagentes y comandos seleccionados y probados para agentes de programación.</strong><br/>
Una sola fuente. Se instala sin cambios en Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot y Kete Code.</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

---

Kete Loom es la biblioteca de skills que hay detrás de [Kete Code](https://ketecode.ai). Incluye tres tipos de elementos: **skills** (carpetas que el agente carga cuando son relevantes), **agentes** (subagentes en los que delega) y **comandos** (comandos de barra que escribes tú). Prioriza la calidad: menos elementos, y cada uno de ellos es

- **portable**: usa el subconjunto común más estricto del formato [Agent Skills](https://agentskills.io), para que ningún host lo rechace;
- **probado**: los skills y los agentes incluyen evals de activación que comprueban que se cargan ante las peticiones adecuadas y no interfieren ante las que no lo son;
- **breve**: menos de 300 líneas, con el detalle trasladado a `references/`, que el agente lee solo cuando lo necesita;
- **versionado y etiquetado**: semver, categoría y un nivel de riesgo (`read-only`, `writes-files`, `runs-commands`, `network`) en sus metadatos;
- **respaldado por scripts** cuando el trabajo es determinista.

## Instalación

### Cualquier agente (recomendado)

```bash
npx @ketecode/loom install
```

Esto instala todos los skills en `~/.agents/skills` (que leen Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot y Kete Code) y en `~/.claude/skills` (Claude Code). Los agentes y los comandos van a `~/.claude/agents` y `~/.claude/commands` (que lee Claude Code y, en el caso de los agentes, también Cursor y VS Code Copilot), y a las carpetas propias de Codex, OpenCode, Gemini CLI y Kete Code cuando esos hosts están instalados. Cada agente y cada comando se convierte al formato que espera su host. Después, reinicia tu agente.

O elige un perfil en lugar de instalarlo todo:

| Perfil | Qué instala |
|---|---|
| `minimal` | Trabajo guiado por pruebas, verificación, revisión de seguridad, revisión de código |
| `core` | Lo esencial, planificación, git, incorporación al proyecto y traspaso entre sesiones, **más los paquetes de lenguaje y framework que usa tu proyecto** (detectados a partir de `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile`, etc.) |
| `developer` | `core` más los cuatro hooks de seguridad |
| `security` | Todos los elementos de seguridad y cumplimiento normativo, más los hooks de seguridad |
| `ai`, `data` | `core` más todos los elementos de IA o de datos |
| `business` | Skills de marketing, investigación, inversores, redacción, PRD y operaciones |
| `full` | Todo, incluidos todos los hooks |

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

Comprobaciones que se ejecutan automáticamente en ciertos puntos del ciclo del agente: antes de un comando de shell o de la edición de un archivo (y pueden bloquearlo, con un motivo que el agente ve), después de una edición o al iniciar una sesión. Los hooks son opcionales: `install` nunca los añade a menos que lo pidas.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

El instalador registra cada hook en Claude Code y en cualquier otro host que encuentre: Claude Code y Gemini CLI en su `settings.json`, Kete Code en `kete.json`, Codex y Cursor en su `hooks.json`, Copilot CLI en `~/.copilot/hooks/` y OpenCode como plugin. Solo añade y elimina sus propias entradas, hace una copia de seguridad del archivo en `<file>.kete-loom-backup` antes de modificarlo y nunca reescribe un archivo que contenga comentarios (en su lugar, muestra el fragmento que debes pegar). Codex solo ejecuta un hook nuevo después de que lo marques como de confianza con `/hooks`. Los hooks se instalan solo para tu usuario, no por proyecto. Cursor no tiene un hook previo a la edición y OpenCode no tiene ninguno que añada contexto al iniciar la sesión, así que esos hooks se omiten en ellos.

La lista completa está en el README en inglés: [Hooks](../../README.md#hooks), y en `catalog.json`.

## Servidores MCP

Configuraciones seleccionadas de servidores MCP, registradas en cada host que uses con el formato propio de ese host. Ninguna guarda un token en un archivo de configuración: los servidores remotos inician sesión con OAuth a través del host (`/mcp` en Claude Code, `codex mcp login`, `kete mcp auth`…), y los servidores locales no necesitan secretos. Los servidores MCP son opcionales: `install` nunca los añade a menos que los nombres.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

Paquetes: `mcp-web`, `mcp-code` (GitHub, Git, Sentry), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Supabase en solo lectura, Stripe), `mcp-design` (Figma). Los servidores de Claude Code se añaden con `claude mcp add-json --scope user` (o en `.mcp.json` con `--project`); Codex los recibe en un bloque marcado de `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode y Kete Code, en sus archivos de configuración de MCP. Un servidor que ya hayas configurado con el mismo nombre nunca se reemplaza. Copilot CLI solo recibe servidores locales, porque no tiene una forma documentada de iniciar sesión en los remotos.

La lista completa está en el README en inglés: [Servidores MCP](../../README.md#mcp-servers), y en `catalog.json`.

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

Las instalaciones de proyecto (`--project`) usan las mismas carpetas dentro del repositorio (`.github/agents` para Copilot, `.kete/` para Kete Code).

## Contribuir

Lee [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agentes y comandos) y [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Cada pull request debe superar:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

El skill `skill-authoring` guía a tu agente para escribir un skill nuevo conforme a este estándar.

## Licencia

MIT © Kete-org. Consulta [LICENSE](../../LICENSE).
