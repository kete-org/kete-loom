<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>为编程 agent 精选并经过测试的 Agent Skills、subagent 与命令。</strong><br/>
一套源文件，无需改动即可安装到 Claude Code、Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot、Kete Code 和 Kiro。</p>

<!-- translated from README.md, source f072ba777c4f -->

<!-- counts:start --><!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom 是 [Kete Code](https://ketecode.ai) 背后的 skill 库。它提供 **skill**（技能，agent 在相关时加载的文件夹）、**agent**（可被委派任务的 subagent，即子代理）、**命令**（你输入的斜杠命令）、**规则**（简短、始终生效的指导）、**hook**（在 agent 调用工具前后以及它完成工作时运行的检查）和 **MCP 服务器配置**。它坚持质量优先：条目宁少勿滥，而且每一项都满足以下要求：

- **可移植**：采用 [Agent Skills](https://agentskills.io) 格式中最严格的通用子集，任何宿主都不会拒绝加载；
- **经过测试**：skill 和 agent 都附带触发评测（trigger eval），确保它们在该出现的请求中被加载，在无关请求中不会干扰；纪律类 skill 还附带行为评测（behaviour eval），与不使用该 skill 的运行对比，检查 agent 在压力下是否真正遵循它们；
- **简短**：不超过 300 行，细节移到 `references/` 中，agent 只在需要时才读取；
- **有版本、有标签**：元数据中包含语义化版本号（semver）、分类和风险等级（`read-only`、`writes-files`、`runs-commands`、`network`）；
- **有脚本支撑**：凡是结果确定的工作，都交由脚本完成。

## 安装

### 适用于任意 agent（推荐）

```bash
npx @ketecode/loom install
```

该命令会把所有 skill 安装到 `~/.agents/skills`（Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot 和 Kete Code 会读取该目录）以及 `~/.claude/skills`（Claude Code）。agent 和命令会安装到 `~/.claude/agents` 和 `~/.claude/commands`（由 Claude Code 读取；其中 agent 也会被 Cursor 和 VS Code Copilot 读取）；如果本机装有 Codex、OpenCode、Gemini CLI、Kete Code 或 Kiro，也会安装到它们各自的目录中（Kiro 还会获得一份单独的 skill 副本）。每个 agent 和命令都会被转换为对应宿主所需的格式。安装完成后请重启你的 agent。

也可以选择一个配置档（profile），而不是全部安装：

| 配置档 | 安装内容 |
|---|---|
| `minimal` | 测试先行开发、结果验证、安全审查、代码审查 |
| `core` | 基础必备项、规划、git、项目上手与会话交接，**以及你的项目所用语言和框架的扩展包**（根据 `package.json`、`go.mod`、`pyproject.toml`、`Cargo.toml`、`Dockerfile` 等文件自动检测） |
| `developer` | `core` 加上四个安全 hook |
| `strict` | `developer` 加上需主动启用的防护：先读后改、保护 lint 配置、在后台运行开发服务器、始终留在 worktree 中、禁止读取机密和植入的指令、对读取内容中被注入的文本发出警告、防止意外截断文件、在上下文即将填满前发出警告、提交信息格式有效，以及结束时不留未完成的桩代码、不出现 lint 和类型检查失败 |
| `method` | 一套完整的开发方法：先设计后编码、细粒度计划、每个任务使用一个全新的 subagent 并进行规格与质量审查、系统化调试、回应审查意见、worktree 以及干净的收尾 |
| `project` | `method` 加上项目规划：在 `.planning/` 中按阶段划分的路线图、需求澄清、编码前的计划检查、与你一起进行验收测试、想法待办清单、可行性探索（spike）以及恢复类命令 |
| `security` | 所有安全与合规相关条目，以及安全 hook |
| `ai`、`data` | `core` 加上所有 AI 或数据相关条目 |
| `business` | 市场营销、LinkedIn 内容、调研、投资者、写作、PRD 和运营类 skill |
| `design` | `core` 加上界面工作：基于产品背景生成设计系统（对比度已校验的 token 和 DESIGN.md）、视觉打磨、无障碍、动效、UI 审查和 `/design-ui` |
| `full` | 全部内容，以及所有非主动启用的 hook |

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

Claude Code 插件还会启用 `developer` 配置中的四个安全 hook (`block-dangerous-commands`, `block-no-verify`, `guard-secrets`, `protect-files`)。它们是只读的，只会拦截有风险的 shell 命令和编辑；需要 `PATH` 中有 Node.js。如果你已经用 `npx` 安装过其中任何一个，请卸载那份副本（`npx @ketecode/loom uninstall --hook <name>`），否则它会运行两次。其他 hook 仍需通过 `npx` 安装器安装。

## 一套开发方法

安装 `--profile method`，即可获得一套从想法到分支合并的完整工作方式，每一步都设有审查关口：

| 步骤 | 使用 | 过程 |
|---|---|---|
| 1. 设计 | `/brainstorm`（`design-brainstorming`） | 一次只问一个问题，给出两到三种方案及其取舍，逐节征得你的同意，对视觉选择提供 HTML 原型，最后在仓库中写出一份设计文档。 |
| 2. 隔离 | `git-worktrees` | 一个独立且被 git 忽略的 worktree，已安装依赖并运行过一次基线测试，从而明确已有的失败。 |
| 3. 计划 | `/plan-feature`（`implementation-plans`） | 每个任务只需几分钟，写明确切的文件、需要先写的失败测试、要运行的命令及其预期输出，并且每个任务一次提交。 |
| 4. 构建 | `subagent-driven-development` 配合 `task-implementer` agent | 每个任务由一个全新的 subagent 以测试先行的方式完成，并报告状态。`spec-reviewer` 对照任务检查它，随后 `code-reviewer` 检查其质量，循环往复，直到两者都通过。 |
| 5. 调试 | `/debug`（`systematic-debugging`） | 先找根因再修复：复现问题，把错误的值追溯到源头，一次只验证一个假设。三次修复失败后，它会停下来质疑设计本身。 |
| 6. 审查 | `responding-to-code-review` | 对照代码检查每条评论，在建议有误时用证据反驳，并在审查讨论串中回复。 |
| 7. 收尾 | `/finish-branch`（`finishing-a-branch`） | 先运行测试，然后在本地合并、发起 pull request、保留分支或丢弃分支（丢弃需要你输入确认后才会执行）。 |

`/feature-dev` 会运行整个流程，并在各阶段之间停下来等待你的批准；`use-skills` 规则则让 agent 始终调用这些 skill，而不是凭记忆工作。

对于比单个功能更大的工作，`--profile project` 会为其补上外围的规划。所有内容都保存在 `.planning/` 下的纯 Markdown 文件中，你可以阅读、编辑并提交它们：

| 需求 | 使用 |
|---|---|
| 一份由里程碑和阶段组成、与编号需求相关联的路线图，其当前状态可跨会话保留 | `project-roadmap`；`/progress` 会说明当前进展并指出下一步行动 |
| 在制定计划前把需求确定下来：模糊地带、agent 的假设及其依据、边界情况 | `spec-clarification`、`assumptions-analyzer` |
| 在编写任何代码之前，对照目标检查计划 | `plan-checker` |
| 用限时实验回答“这到底行不行得通？”，并给出结论 | `feasibility-spike` |
| 与你一起进行验收测试，一次一个交付物 | `/uat`（`acceptance-testing`）、`ui-auditor` |
| 保存想法和待办事项，而不打断当前任务 | `/capture`（`idea-backlog`） |
| 恢复：修复一组审查发现的问题、查明跨多个会话的工作为何出错、安全地撤销工作 | `/fix-findings`、`/forensics`、`/revert-work` |

### 从每次会话中学习

Skill 会因实际工作中发现的摩擦而变得更好，因此 Kete Loom 会记录这些摩擦。`skill-observations` skill 会在每个发现出现时把它记下来：你给出的一次纠正、agent 违反的一条规则、缺失的一个步骤，或是值得单独做成 skill 的工作流。它通过 `kete-loom observe` 把每个发现写成一个小文件。之后，`/skill-review` 会把这份记录转化为由你逐条批准的修改。

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

这份记录归你所有，并保存在你的机器上，位于 `~/.kete-loom/observations/`。它保存在用户范围内，因此发现不会分散在各个项目中，也不会随着删除 worktree 而丢失。CLI 会强制执行以下记录规则：
- id 永不重复，已有文件永不被覆盖；
- 重复陈述的发现会被拒绝，应改为扩充原有发现；
- 每个发现都必须记录检查过哪些相关的 skill；
- 被违反两次的规则会被标记为需要一个 hook（`/hookify`），而不是再改一次措辞。

审查会暂存修改，绝不会直接编辑已安装的 Kete Loom skill，因为 `update` 会覆盖它；这些修改会变成一份上游修改草案，必要时再加上一条项目规则。安装 `load-session-context` hook 后，每次会话开始时都会知道有哪些未处理的发现。这两项都包含在 `--profile method` 中。

该方法改编自 Eoghan Henn 及其贡献者的 [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all)（CC BY 4.0）。

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

在 agent 循环的特定节点自动运行的检查（hook，钩子）：在执行 shell 命令或编辑文件之前（可以阻止该操作，并给出 agent 能看到的原因）、在编辑之后、在读取文件或网页或任何工具调用之后（可以为 agent 添加一条提示）、在会话开始时，或在 agent 结束本轮时（可以让它返回继续工作）。hook 需要主动启用：除非你明确要求，`install` 不会添加任何 hook。标记为需主动启用（opt-in）的 hook 会改变 agent 的工作方式，因此 `--hooks` 不会包含它们；请指名安装，或使用 `--profile strict`。

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

安装器会把每个 hook 注册到 Claude Code 以及它找到的所有其他宿主：Claude Code 和 Gemini CLI 写入各自的 `settings.json`，Kete Code 写入 `kete.json`，Codex 和 Cursor 写入各自的 `hooks.json`，Copilot CLI 写入 `~/.copilot/hooks/`，OpenCode 则以插件形式注册。安装器只增删自己的条目，修改文件前会先备份为 `<file>.kete-loom-backup`，并且绝不改写带有注释的文件（而是打印出需要你手动粘贴的片段）。Codex 只有在你通过 `/hooks` 信任新 hook 之后才会运行它。hook 只安装到当前用户，不按项目安装。Cursor 没有编辑前的 hook，OpenCode 没有在会话开始时注入上下文的 hook，因此相应的 hook 会跳过这两个宿主；在 agent 完成时让它返回工作的 hook 会跳过 Kete Code 和 OpenCode，因为它们的停止 hook 做不到这一点。Kiro 的 hook 属于其 agent 配置，因此不会安装。

完整列表见英文版 README：[Hooks](../../README.md#hooks)，也可查阅 [catalog.json](../../catalog.json)。

## MCP 服务器

精选的 MCP 服务器配置，会以各宿主自己的格式注册到你使用的每个宿主。这些配置都不会把令牌写进配置文件：远程服务器通过宿主使用 OAuth 登录（Claude Code 中的 `/mcp`、`codex mcp login`、`kete mcp auth`……），本地服务器则不需要任何密钥。MCP 服务器需要主动启用：除非你指名，`install` 不会添加任何服务器。

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

配置包：`mcp-web`、`mcp-code`（GitHub、Git、Sentry，以及用于语言服务器导航的 `lsp`）、`mcp-team`（Linear、Notion、Atlassian）、`mcp-cloud`（Cloudflare、Vercel、Supabase 只读、Stripe）、`mcp-design`（Figma）。Claude Code 的服务器通过 `claude mcp add-json --scope user` 添加（使用 `--project` 时写入 `.mcp.json`）；Codex 的服务器写入 `config.toml` 中一个带标记的区块；Gemini CLI、Cursor、Copilot CLI、OpenCode 和 Kete Code 则写入各自的 MCP 配置文件。如果你已经用同一名称配置过某个服务器，它绝不会被替换。Copilot CLI 只会获得本地服务器，因为它没有公开文档说明如何登录远程服务器。

完整列表见英文版 README：[MCP servers](../../README.md#mcp-servers)，也可查阅 [catalog.json](../../catalog.json)。

## 日常维护

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

`audit` 会检查那些让 agent 在仓库中良好工作的要素：agent 指令（`AGENTS.md`/`CLAUDE.md`）、与它检测到的技术栈对应的 Kete Loom 配置包、测试和 lint 命令、CI、安全 hook，以及 `.env` 文件是否已被忽略且未被提交。只要有一项检查失败，它就会以非零状态码退出，因此可以在 CI 中运行。

在你的 agent 中，`/loom` 为任务找到合适的条目，`/checkpoint` 保存一个可恢复的快照而无需提交，`/sessions` 列出并整理交接笔记，`/codemap` 写出一份简短的架构图，`/model-route` 建议一个模型档位，`/aside` 回答一个旁支问题而不会让当前任务偏离方向。针对你的 agent 配置本身，`/lint-agent-config` 检查 AGENTS.md、skill、hook、MCP 配置和插件清单中是否存在损坏或有风险的设置，`/rules-review` 将你最近的会话与你的规则进行比较，并建议需要新增、改写或废弃的内容，`/usage-report` 根据本地会话日志汇总 token 用量和费用。

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
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

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
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | 当 `~/.kiro` 存在时 |

项目级安装（`--project`）使用仓库内的相同目录（Copilot 使用 `.github/agents`，Kete Code 使用 `.kete/`，Kiro 使用 `.kiro/`）。Kiro 的规则会变成 `~/.kiro/steering` 中的 steering 文件，并通过 `fileMatch` 限定作用范围。

## 参与贡献

请阅读 [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md)（涵盖 skill、agent 和命令）以及 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。每个 pull request 都必须通过：

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

有两类评测确保各条目名副其实：

- **触发评测**（`evals/triggers.json`）：由一个模型像宿主那样对真实提示词和近似但不该匹配的提示词进行路由，每个条目必须在属于自己的提示词中被选中，而且只在这些提示词中被选中。
- **行为评测**（`evals/behavior.json`）：用场景向 agent 施压，促使它跳过该条目所要求的纪律（“just patch it, we ship in ten minutes”）。每个场景分别在使用和不使用该条目的情况下运行，由一个评审模型为每条回复打分，报告会展示该条目带来的改进。`--host claude` 会以真实的无头 Claude Code 会话运行这些评测。

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

`skill-authoring` 这个 skill 会引导你的 agent 按照此标准编写新的 skill。

## 许可证

MIT © Kete-org。详见 [LICENSE](../../LICENSE)。
