<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>コーディングエージェントのための、厳選されテスト済みの Agent Skills、サブエージェント、コマンド。</strong><br/>
ひとつのソースから、Claude Code、Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot、Kete Code、Kiro にそのままインストールできます。</p>

<!-- translated from README.md, source 5fdefea7ddee -->

<!-- counts:start --><!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

Kete Loom は [Kete Code](https://ketecode.ai) を支える skill ライブラリです。提供するのは、**skill**(必要なときにエージェントが読み込むフォルダー)、**agent**(作業を委任するサブエージェント)、**command**(ユーザーが入力するスラッシュコマンド)、**rule**(常に適用される短いガイダンス)、**hook**(エージェントのツール呼び出しの前後や、エージェントが作業を終えるときに実行されるチェック)、そして **MCP サーバー設定**です。品質を最優先にしており、アイテムの数を絞ったうえで、そのすべてが次の条件を満たしています。

- **ポータブル**: [Agent Skills](https://agentskills.io) 形式のうち最も厳格な共通サブセットだけを使うため、どのホストにも拒否されません。
- **テスト済み**: skill と agent にはトリガー eval が付属しており、適切なリクエストでは読み込まれ、無関係なリクエストでは邪魔をしないことを確認しています。さらに規律系の skill には振る舞い eval があり、プレッシャーのかかる状況でもエージェントが実際にそれに従うことを、skill なしの実行と比較して確認しています。
- **簡潔**: 300 行未満に収め、詳細は `references/` に移しています。エージェントは必要なときだけそれを読みます。
- **バージョン管理とラベル付け**: メタデータに semver、カテゴリー、リスクレベル(`read-only`、`writes-files`、`runs-commands`、`network`)を持ちます。
- **スクリプトによる裏付け**: 処理が決定的な部分はスクリプトで実行します。

## インストール

### すべてのエージェント向け(推奨)

```bash
npx @ketecode/loom install
```

すべての skill を `~/.agents/skills`(Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot、Kete Code が読み込みます)と `~/.claude/skills`(Claude Code)にインストールします。agent と command は `~/.claude/agents` と `~/.claude/commands` に入り(Claude Code が読み込み、agent については Cursor と VS Code Copilot も読み込みます)、Codex、OpenCode、Gemini CLI、Kete Code、Kiro がインストールされている場合は、それぞれのホスト専用のフォルダーにも入ります(Kiro には skill のコピーも別途入ります)。各 agent と command は、ホストが期待する形式に変換されます。インストール後はエージェントを再起動してください。

すべてをインストールする代わりに、プロファイルを選ぶこともできます。

| プロファイル | インストールされる内容 |
|---|---|
| `minimal` | テストファーストの作業、検証、セキュリティレビュー、コードレビュー |
| `core` | 基本セット、計画、git、オンボーディング、セッションの引き継ぎに加えて、**プロジェクトで使っている言語とフレームワークのパック**(`package.json`、`go.mod`、`pyproject.toml`、`Cargo.toml`、`Dockerfile` などから検出) |
| `developer` | `core` と 4 つの安全用 hook |
| `strict` | `developer` に加えて、オプトインのガードレール: 編集前の読み込み、lint 設定の保護、開発サーバーのバックグラウンド実行、worktree 内にとどまること、秘密情報を読まないことと仕込まれた指示に従わないこと、読み込んだ内容に注入されたテキストへの警告、ファイルの誤った切り詰めの防止、コンテキストが埋まる前の警告、有効なコミットメッセージ、そして最後に未完成のスタブや lint と型チェックの失敗が残らないこと |
| `method` | 完全な開発手法: コードの前の設計、細かな粒度の計画、タスクごとに新しいサブエージェントを使い仕様と品質をレビュー、体系的なデバッグ、レビューへの対応、worktree、そしてきれいな仕上げ |
| `project` | `method` に加えてプロジェクト計画: `.planning/` 内のフェーズ付きロードマップ、要件の明確化、コードの前の計画チェック、あなたと行う受け入れテスト、アイデアのバックログ、実現可能性のスパイク、そして復旧用の command |
| `security` | セキュリティとコンプライアンスに関するすべてのアイテムと、安全用 hook |
| `ai`, `data` | `core` と、AI またはデータに関するすべてのアイテム |
| `business` | マーケティング、LinkedIn コンテンツ、リサーチ、投資家向け、ライティング、PRD、オペレーションの skill |
| `design` | `core` に UI 作業を追加：プロダクトの文脈から作るデザインシステム（コントラスト検証済みのトークンと DESIGN.md）、仕上げ、アクセシビリティ、モーション、UI 監査、`/design-ui` |
| `full` | すべてのアイテム(オプトインでないすべての hook を含む) |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

プロファイルは `--skill`、`--agent`、`--command`、`--hook` と組み合わせて使えます。また、`uninstall --profile <name>` はそのプロファイルのアイテムだけを削除します。

よく使うオプション:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

Node がない場合は、シェルインストーラーを使ってください。skill を単純にコピーする方式にフォールバックします(agent と command には Node インストーラーが必要です)。

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### ネイティブプラグインとしてのインストール

| ホスト | コマンド |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` の後に `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` の後に `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | `npx` インストーラーを使ってください(Gemini は `~/.agents/skills` を読み込みます)。`gemini extensions install https://github.com/Kete-org/kete-loom` 用の `gemini-extension.json` も同梱しています(実験的) |
| 任意の skills CLI | `npx skills add Kete-org/kete-loom` |

プラグインとしてインストールした場合は、ホスト自身のプラグインマネージャーで更新されます。1 つのホストに対しては、プラグインインストールと `npx` インストーラーのどちらか一方だけを使ってください。両方を使うと、ホストに各 skill が二重に表示されることがあります。

## 開発手法

`--profile method` をインストールすると、アイデアからブランチのマージまで、各ステップにレビューのゲートを備えた完全な作業の進め方が手に入ります。

| ステップ | 使うもの | 内容 |
|---|---|---|
| 1. 設計 | `/brainstorm` (`design-brainstorming`) | 質問は一度に 1 つずつ。トレードオフ付きで 2〜3 のアプローチを示し、セクションごとに承認を得て、見た目の選択には HTML モックアップを使い、最後にリポジトリに設計ドキュメントを残します。 |
| 2. 分離 | `git-worktrees` | git で無視される独立した worktree を作り、依存関係をインストールしてベースラインのテストを実行するため、既存の失敗が把握できます。 |
| 3. 計画 | `/plan-feature` (`implementation-plans`) | 数分ずつのタスクに分け、正確なファイル、最初に書く失敗するテスト、実行するコマンドとその期待される出力、そしてタスクごとのコミットを定めます。 |
| 4. 構築 | `subagent-driven-development` と `task-implementer` agent | タスクごとに新しいサブエージェントがテストファーストで作業し、ステータスを報告します。`spec-reviewer` がタスクに照らしてチェックし、続いて `code-reviewer` が品質をチェックし、両方が合格するまで繰り返します。 |
| 5. デバッグ | `/debug` (`systematic-debugging`) | 修正の前に根本原因を突き止めます。再現し、おかしな値をその発生源までたどり、仮説は一度に 1 つずつ検証します。修正に 3 回失敗したら手を止め、設計を見直します。 |
| 6. レビュー | `responding-to-code-review` | 各コメントをコードに照らして確認し、提案が誤っている場合は根拠を示して反論し、レビューのスレッドで返信します。 |
| 7. 仕上げ | `/finish-branch` (`finishing-a-branch`) | まずテストを実行し、そのうえでローカルでマージする、プルリクエストを開く、ブランチを残す、または破棄する(確認の入力後のみ)のいずれかを行います。 |

`/feature-dev` は、段階ごとに承認のための一時停止を挟みながら一連の流れ全体を実行します。また `use-skills` rule により、エージェントは記憶に頼って作業するのではなく、これらの skill を使い続けます。

1 つの機能より大きな作業には、`--profile project` がその周りの計画を追加します。すべては `.planning/` 配下のプレーンな Markdown ファイルに保存され、読む、編集する、コミットすることができます:

| 必要なこと | 使うもの |
|---|---|
| 番号付きの要件に結び付いたマイルストーンとフェーズのロードマップと、セッションをまたいで保たれる現在の状態 | `project-roadmap`。`/progress` が現状を伝え、次のアクションを示します |
| 計画の前に要件を確定させる: あいまいな点、根拠付きのエージェントの前提、エッジケース | `spec-clarification`、`assumptions-analyzer` |
| コードを書く前に、目標に照らしてチェックされた計画 | `plan-checker` |
| 「そもそもこれは実現できるのか」に、時間を区切った実験と結論で答える | `feasibility-spike` |
| あなたと行う受け入れテスト、成果物を 1 つずつ | `/uat` (`acceptance-testing`)、`ui-auditor` |
| 今のタスクを脱線させずにアイデアや todo を保存する | `/capture` (`idea-backlog`) |
| 復旧: レビュー指摘のリストを修正する、複数セッションにわたる作業がなぜうまくいかなかったかを突き止める、作業を安全に取り消す | `/fix-findings`、`/forensics`、`/revert-work` |

### すべてのセッションから学ぶ

skill は実際の作業で見つかった摩擦から改善されるため、Kete Loom はその記録を残します。`skill-observations` skill は、発見をその都度記録します。あなたが行った修正、エージェントが破ったルール、抜けていた手順、あるいは独自の skill にする価値のあるワークフローです。それぞれを `kete-loom observe` を通じて小さなファイルとして書き出します。後で `/skill-review` がその記録を変更案に変え、あなたが 1 つずつ承認します。

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

記録はあなたのものであり、あなたのマシンの `~/.kete-loom/observations/` に保存されます。ユーザースコープで保持されるため、発見がプロジェクトごとに分散したり、削除した worktree とともに失われたりすることはありません。記録の管理は CLI が徹底します。
- ID は重複せず、既存のファイルが上書きされることもありません。
- 同じ発見を言い換えたものは拒否され、元の発見を拡張するよう求められます。
- すべての発見に、関連するどの skill を確認したかを記録する必要があります。
- 2 回破られたルールは、言い回しをまた変えるのではなく、hook (`/hookify`) にするよう指摘されます。

レビューは変更をステージするだけで、インストール済みの Kete Loom の skill をその場で編集することはありません。`update` で上書きされてしまうためです。そうした変更は、アップストリームへの変更の下書きと、必要に応じてプロジェクトの rule になります。`load-session-context` hook をインストールしておくと、各セッションは未解決の項目を把握した状態で始まります。どちらのアイテムも `--profile method` に含まれています。

この手法は、Eoghan Henn とコントリビューターによる [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all) (CC BY 4.0) を基にしています。

## Skill

全一覧は英語版 README の [Skills](../../README.md#skills) と `catalog.json` にあります。

## Agent

エージェントが作業を委任できるサブエージェントです。それぞれ独自のコンテキストで動作し、結果を返します。

全一覧は英語版 README の [Agents](../../README.md#agents) と `catalog.json` にあります。

## Command

`/verify` のように入力するスラッシュコマンドです。Claude Code、OpenCode、Gemini CLI、Kete Code でサポートされています。その他のホストでは command が skill に統合されつつあるため、対応する skill を使ってください。

全一覧は英語版 README の [Commands](../../README.md#commands) と `catalog.json` にあります。

## Rule

「SQL を文字列から組み立てない」「go vet を実行する」のように、指示しなくてもエージェントが常に従う短い規約です。ホストが対応している場合(Claude Code、Copilot、Cursor)、言語別の rule はその言語のファイルにだけ適用されます。Kete Code、Gemini CLI、OpenCode、Codex は rule をパスで限定できないため、選択した rule だけが、指示ファイル内のマーク付きブロックを通じて適用されます。

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

全一覧は英語版 README の [Rules](../../README.md#rules) と `catalog.json` にあります。

## Hook

エージェントループの特定の時点で自動的に実行されるチェックです。シェルコマンドの実行前やファイル編集の前(理由をエージェントに示したうえでブロックすることもできます)、編集の後、ファイルや Web の読み込みまたは任意のツール呼び出しの後(エージェント向けのメモを追加することもできます)、セッションの開始時、またはエージェントがターンを終えるとき(作業に差し戻すこともできます)に実行されます。hook はオプトインです。明示的に指定しない限り、`install` が hook を追加することはありません。オプトインと記された hook はエージェントの作業の進め方を変えるため、`--hooks` には含まれません。名前を指定するか、`--profile strict` を使ってください。

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

インストーラーは、各 hook を Claude Code と、検出したその他すべてのホストに登録します。Claude Code と Gemini CLI はそれぞれの `settings.json`、Kete Code は `kete.json`、Codex と Cursor はそれぞれの `hooks.json`、Copilot CLI は `~/.copilot/hooks/`、OpenCode はプラグインとして登録されます。インストーラーは自分のエントリーだけを追加・削除し、ファイルを変更する前に `<file>.kete-loom-backup` にバックアップを取ります。コメントを含むファイルは書き換えず、代わりに貼り付け用のスニペットを表示します。Codex では、`/hooks` で信頼済みにした後でなければ新しい hook は実行されません。hook はユーザー単位でのみインストールされ、プロジェクト単位ではインストールされません。Cursor には編集前の hook がなく、OpenCode にはセッション開始時にコンテキストを追加する hook がないため、該当する hook はこれらのホストではスキップされます。また、エージェントが作業を終えるときに差し戻す hook は、stop hook でそれができない Kete Code と OpenCode ではスキップされます。Kiro の hook はエージェント設定に属するため、インストールされません。

全一覧は英語版 README の [Hooks](../../README.md#hooks) と `catalog.json` にあります。

## MCP サーバー

厳選された MCP サーバー設定を、使用しているすべてのホストに、各ホスト独自の形式で登録します。設定ファイルにトークンを書き込むものは 1 つもありません。リモートサーバーはホスト経由の OAuth でサインインし(Claude Code の `/mcp`、`codex mcp login`、`kete mcp auth` など)、ローカルサーバーにはシークレットが不要です。MCP サーバーはオプトインです。名前を指定しない限り、`install` が追加することはありません。

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

パック: `mcp-web`、`mcp-code`(GitHub、Git、Sentry、言語サーバーによるコードナビゲーションの `lsp`)、`mcp-team`(Linear、Notion、Atlassian)、`mcp-cloud`(Cloudflare、Vercel、Supabase 読み取り専用、Stripe)、`mcp-design`(Figma)。Claude Code のサーバーは `claude mcp add-json --scope user`(`--project` を指定した場合は `.mcp.json`)で追加されます。Codex には `config.toml` のマーク付きブロックに、Gemini CLI、Cursor、Copilot CLI、OpenCode、Kete Code にはそれぞれの MCP 設定ファイルに追加されます。同じ名前ですでに設定済みのサーバーが置き換えられることはありません。Copilot CLI にはローカルサーバーだけが追加されます。リモートサーバーにサインインする方法が文書化されていないためです。

全一覧は英語版 README の [MCP servers](../../README.md#mcp-servers) と `catalog.json` にあります。

## ハウスキーピング

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

`audit` は、リポジトリでエージェントがうまく動作するための条件をチェックします。対象は、エージェント向けの指示(`AGENTS.md`/`CLAUDE.md`)、検出したスタックに対応する Kete Loom のパック、テストと lint のコマンド、CI、安全用 hook、そして `.env` ファイルが無視されていてコミットされていないことです。チェックに失敗すると 0 以外の終了コードで終了するため、CI で実行できます。

エージェント内では、`/loom` がタスクに適したアイテムを見つけ、`/checkpoint` がコミットせずに復元可能なスナップショットを保存し、`/sessions` が引き継ぎメモを一覧表示して整理し、`/codemap` が短いアーキテクチャマップを書き、`/model-route` がモデルのティアを提案し、`/aside` がタスクを脱線させずに横道の質問に答えます。エージェントのセットアップ自体については、`/lint-agent-config` が AGENTS.md、skill、hook、MCP 設定、プラグインマニフェストに壊れた設定や危険な設定がないかをチェックし、`/rules-review` が最近のセッションとルールを比較して、追加・修正・廃止すべき点を提案し、`/usage-report` がローカルのセッションログからトークン使用量とコストをまとめます。

## ホストが参照する場所

### Skill

| ホスト | ユーザーフォルダー | プロジェクトフォルダー |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode のみ | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor のみ | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI のみ | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot のみ | `~/.copilot/skills` | `.github/skills` |
| Kete Code のみ | `~/.config/kete/skills` | `.kete/skills` |
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

### Agent と command

| ホスト | Agent | Command | デフォルトでインストール |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | はい |
| Cursor, VS Code Copilot | `~/.claude/agents` を読み込む | インストールされない(Cursor のものはベータ版、VS Code はプロジェクトのプロンプトファイルを使用) | はい(Claude のフォルダー経由) |
| Codex | `~/.codex/agents` (TOML) | Codex で非推奨 | `~/.codex` が存在する場合 |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | `~/.config/opencode` が存在する場合 |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | `~/.config/kete` が存在する場合 |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | `~/.gemini` が存在する場合 |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | サポートされない | `--target copilot` を指定した場合 |
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | `~/.kiro` が存在する場合 |

プロジェクトへのインストール(`--project`)では、リポジトリ内の同じフォルダーが使われます(Copilot は `.github/agents`、Kete Code は `.kete/`、Kiro は `.kiro/`)。Kiro の rule は `~/.kiro/steering` の steering ファイルになり、`fileMatch` で適用範囲が限定されます。

## コントリビュート

[`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md)(skill、agent、command)と [`CONTRIBUTING.md`](../../CONTRIBUTING.md) を読んでください。すべてのプルリクエストは次のチェックに合格する必要があります。

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

2 種類の eval がアイテムの品質を保ちます。

- **トリガー eval**(`evals/triggers.json`): モデルが、現実的なプロンプトとニアミスのプロンプトをホストと同じ方法で振り分けます。各アイテムは、自分のプロンプトに対してだけ選ばれなければなりません。
- **振る舞い eval**(`evals/behavior.json`): アイテムの規律を省くようエージェントにプレッシャーをかけるシナリオです(「とりあえずパッチを当てて、10 分後に出荷だから」)。各シナリオはアイテムありとなしで実行され、判定モデルがすべての返答を採点し、レポートでそのアイテムがもたらす違いを示します。`--host claude` を指定すると、実際のヘッドレス Claude Code セッションとして実行されます。

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

`skill-authoring` skill は、この基準に沿った新しい skill の書き方をエージェントに順を追って案内します。

## ライセンス

MIT © Kete-org。詳しくは [LICENSE](../../LICENSE) を参照してください。
