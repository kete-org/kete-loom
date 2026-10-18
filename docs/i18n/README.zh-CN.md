<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>为编程 agent 精选并经过测试的 Agent Skills、subagent 与命令。</strong><br/>
一套源文件，无需改动即可安装到 Claude Code、Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot 和 Kete Code。</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

---

Kete Loom 是 [Kete Code](https://ketecode.ai) 背后的 skill 库。它提供三类内容：**skill**（技能，agent 在相关时加载的文件夹）、**agent**（可被委派任务的 subagent，即子代理）和 **命令**（你输入的斜杠命令）。它坚持质量优先：条目宁少勿滥，而且每一项都满足以下要求：

- **可移植**：采用 [Agent Skills](https://agentskills.io) 格式中最严格的通用子集，任何宿主都不会拒绝加载；
- **经过测试**：skill 和 agent 都附带触发评测（trigger eval），确保它们在该出现的请求中被加载，在无关请求中不会干扰；
- **简短**：不超过 300 行，细节移到 `references/` 中，agent 只在需要时才读取；
- **有版本、有标签**：元数据中包含语义化版本号（semver）、分类和风险等级（`read-only`、`writes-files`、`runs-commands`、`network`）；
- **有脚本支撑**：凡是结果确定的工作，都交由脚本完成。

## 安装

### 适用于任意 agent（推荐）

```bash
npx @ketecode/loom install
```

该命令会把所有 skill 安装到 `~/.agents/skills`（Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot 和 Kete Code 会读取该目录）以及 `~/.claude/skills`（Claude Code）。agent 和命令会安装到 `~/.claude/agents` 和 `~/.claude/commands`（由 Claude Code 读取；其中 agent 也会被 Cursor 和 VS Code Copilot 读取）；如果本机装有 Codex、OpenCode、Gemini CLI 或 Kete Code，也会安装到它们各自的目录中。每个 agent 和命令都会被转换为对应宿主所需的格式。安装完成后请重启你的 agent。

也可以选择一个配置档（profile），而不是全部安装：

| 配置档 | 安装内容 |
|---|---|
| `minimal` | 测试先行开发、结果验证、安全审查、代码审查 |
| `core` | 基础必备项、规划、git、项目上手与会话交接，**以及你的项目所用语言和框架的扩展包**（根据 `package.json`、`go.mod`、`pyproject.toml`、`Cargo.toml`、`Dockerfile` 等文件自动检测） |
| `developer` | `core` 加上四个安全 hook |
| `security` | 所有安全与合规相关条目，以及安全 hook |
| `ai`、`data` | `core` 加上所有 AI 或数据相关条目 |
| `business` | 市场营销、调研、投资者、写作、PRD 和运营类 skill |
| `full` | 全部内容，包括所有 hook |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

配置档可以与 `--skill`、`--agent`、`--command` 和 `--hook` 组合使用；`uninstall --profile <name>` 只会移除该配置档安装的条目。

常用选项：

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

没有 Node？可以使用 shell 安装脚本，它会退而改为直接复制 skill 文件（agent 和命令需要使用 Node 安装器）：

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### 原生插件安装

| 宿主 | 命令 |
|---|---|
| Claude Code | 先运行 `/plugin marketplace add Kete-org/kete-loom`，再运行 `/plugin install kete-loom@kete-loom` |
| Codex | 先运行 `codex plugin marketplace add Kete-org/kete-loom`，再运行 `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | 使用 `npx` 安装器（Gemini 会读取 `~/.agents/skills`）。仓库中也附带了 `gemini-extension.json`，可用于 `gemini extensions install https://github.com/Kete-org/kete-loom`（实验性） |
| 任意 skills CLI | `npx skills add Kete-org/kete-loom` |

通过插件安装的内容由宿主自身的插件管理器负责更新。对同一个宿主，请只选择插件安装或 `npx` 安装器中的一种，不要同时使用，否则宿主可能会把每个 skill 列出两次。

## Skills

完整列表见英文版 README：[Skills](../../README.md#skills)，也可查阅 [catalog.json](../../catalog.json)。

## Agents

你的 agent 可以把任务委派给这些 subagent。每个 subagent 在独立的上下文中运行，并返回结果。

完整列表见英文版 README：[Agents](../../README.md#agents)，也可查阅 [catalog.json](../../catalog.json)。

## 命令

你输入的斜杠命令，例如 `/verify`。Claude Code、OpenCode、Gemini CLI 和 Kete Code 支持命令；其他宿主正在把命令并入 skill，因此在这些宿主中请使用对应的 skill。

完整列表见英文版 README：[Commands](../../README.md#commands)，也可查阅 [catalog.json](../../catalog.json)。

## 规则

简短、始终生效的约定，agent 无需提醒就会遵守，例如“绝不用字符串拼接 SQL”或“运行 go vet”。在支持的宿主上（Claude Code、Copilot、Cursor），语言规则只作用于该语言的文件。Kete Code、Gemini CLI、OpenCode 和 Codex 无法按路径限定规则，因此它们只会获得你选择的规则，以一个带标记的区块写入其指令文件。

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

完整列表见英文版 README：[Rules](../../README.md#rules)，也可查阅 [catalog.json](../../catalog.json)。

## Hooks

在 agent 循环的特定节点自动运行的检查（hook，钩子）：在执行 shell 命令或编辑文件之前（可以阻止该操作，并给出 agent 能看到的原因）、在编辑之后，或在会话开始时。hook 需要主动启用：除非你明确要求，`install` 不会添加任何 hook。

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

安装器会把每个 hook 注册到 Claude Code 以及它找到的所有其他宿主：Claude Code 和 Gemini CLI 写入各自的 `settings.json`，Kete Code 写入 `kete.json`，Codex 和 Cursor 写入各自的 `hooks.json`，Copilot CLI 写入 `~/.copilot/hooks/`，OpenCode 则以插件形式注册。安装器只增删自己的条目，修改文件前会先备份为 `<file>.kete-loom-backup`，并且绝不改写带有注释的文件（而是打印出需要你手动粘贴的片段）。Codex 只有在你通过 `/hooks` 信任新 hook 之后才会运行它。hook 只安装到当前用户，不按项目安装。Cursor 没有编辑前的 hook，OpenCode 没有在会话开始时注入上下文的 hook，因此相应的 hook 会跳过这两个宿主。

完整列表见英文版 README：[Hooks](../../README.md#hooks)，也可查阅 [catalog.json](../../catalog.json)。

## MCP 服务器

精选的 MCP 服务器配置，会以各宿主自己的格式注册到你使用的每个宿主。这些配置都不会把令牌写进配置文件：远程服务器通过宿主使用 OAuth 登录（Claude Code 中的 `/mcp`、`codex mcp login`、`kete mcp auth`……），本地服务器则不需要任何密钥。MCP 服务器需要主动启用：除非你指名，`install` 不会添加任何服务器。

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

配置包：`mcp-web`、`mcp-code`（GitHub、Git、Sentry）、`mcp-team`（Linear、Notion、Atlassian）、`mcp-cloud`（Cloudflare、Supabase 只读、Stripe）、`mcp-design`（Figma）。Claude Code 的服务器通过 `claude mcp add-json --scope user` 添加（使用 `--project` 时写入 `.mcp.json`）；Codex 的服务器写入 `config.toml` 中一个带标记的区块；Gemini CLI、Cursor、Copilot CLI、OpenCode 和 Kete Code 则写入各自的 MCP 配置文件。如果你已经用同一名称配置过某个服务器，它绝不会被替换。Copilot CLI 只会获得本地服务器，因为它没有公开文档说明如何登录远程服务器。

完整列表见英文版 README：[MCP servers](../../README.md#mcp-servers)，也可查阅 [catalog.json](../../catalog.json)。

## 各宿主的查找位置

### Skills

| 宿主 | 用户目录 | 项目目录 |
|---|---|---|
| Codex、OpenCode、Cursor、Gemini CLI、Copilot、Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| 仅 OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| 仅 Cursor | `~/.cursor/skills` | `.cursor/skills` |
| 仅 Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| 仅 GitHub Copilot | `~/.copilot/skills` | `.github/skills` |
| 仅 Kete Code | `~/.config/kete/skills` | `.kete/skills` |

### Agents 与命令

| 宿主 | Agents | 命令 | 默认安装 |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | 是 |
| Cursor、VS Code Copilot | 读取 `~/.claude/agents` | 不安装（Cursor 的命令仍处于 beta 阶段；VS Code 使用项目级 prompt 文件） | 是，通过 Claude 的目录 |
| Codex | `~/.codex/agents`（TOML） | Codex 已弃用 | 当 `~/.codex` 存在时 |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | 当 `~/.config/opencode` 存在时 |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | 当 `~/.config/kete` 存在时 |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands`（TOML） | 当 `~/.gemini` 存在时 |
| Copilot CLI | `~/.copilot/agents`（`.agent.md`） | 不支持 | 使用 `--target copilot` 时 |

项目级安装（`--project`）使用仓库内的相同目录（Copilot 使用 `.github/agents`，Kete Code 使用 `.kete/`）。

## 参与贡献

请阅读 [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md)（涵盖 skill、agent 和命令）以及 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。每个 pull request 都必须通过：

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

`skill-authoring` 这个 skill 会引导你的 agent 按照此标准编写新的 skill。

## 许可证

MIT © Kete-org。详见 [LICENSE](../../LICENSE)。
