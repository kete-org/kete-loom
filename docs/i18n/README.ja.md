<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>コーディングエージェントのための、厳選されテスト済みの Agent Skills、サブエージェント、コマンド。</strong><br/>
ひとつのソースから、Claude Code、Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot、Kete Code にそのままインストールできます。</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

---

Kete Loom は [Kete Code](https://ketecode.ai) を支える skill ライブラリです。提供するアイテムは 3 種類あります。**skill**(必要なときにエージェントが読み込むフォルダー)、**agent**(作業を委任するサブエージェント)、**command**(ユーザーが入力するスラッシュコマンド)です。品質を最優先にしており、アイテムの数を絞ったうえで、そのすべてが次の条件を満たしています。

- **ポータブル**: [Agent Skills](https://agentskills.io) 形式のうち最も厳格な共通サブセットだけを使うため、どのホストにも拒否されません。
- **テスト済み**: skill と agent にはトリガー eval が付属しており、適切なリクエストでは読み込まれ、無関係なリクエストでは邪魔をしないことを確認しています。
- **簡潔**: 300 行未満に収め、詳細は `references/` に移しています。エージェントは必要なときだけそれを読みます。
- **バージョン管理とラベル付け**: メタデータに semver、カテゴリー、リスクレベル(`read-only`、`writes-files`、`runs-commands`、`network`)を持ちます。
- **スクリプトによる裏付け**: 処理が決定的な部分はスクリプトで実行します。

## インストール

### すべてのエージェント向け(推奨)

```bash
npx @ketecode/loom install
```

すべての skill を `~/.agents/skills`(Codex、OpenCode、Cursor、Gemini CLI、GitHub Copilot、Kete Code が読み込みます)と `~/.claude/skills`(Claude Code)にインストールします。agent と command は `~/.claude/agents` と `~/.claude/commands` に入り(Claude Code が読み込み、agent については Cursor と VS Code Copilot も読み込みます)、Codex、OpenCode、Gemini CLI、Kete Code がインストールされている場合は、それぞれのホスト専用のフォルダーにも入ります。各 agent と command は、ホストが期待する形式に変換されます。インストール後はエージェントを再起動してください。

すべてをインストールする代わりに、プロファイルを選ぶこともできます。

| プロファイル | インストールされる内容 |
|---|---|
| `minimal` | テストファーストの作業、検証、セキュリティレビュー、コードレビュー |
| `core` | 基本セット、計画、git、オンボーディング、セッションの引き継ぎに加えて、**プロジェクトで使っている言語とフレームワークのパック**(`package.json`、`go.mod`、`pyproject.toml`、`Cargo.toml`、`Dockerfile` などから検出) |
| `developer` | `core` と 4 つの安全用 hook |
| `security` | セキュリティとコンプライアンスに関するすべてのアイテムと、安全用 hook |
| `ai`, `data` | `core` と、AI またはデータに関するすべてのアイテム |
| `business` | マーケティング、リサーチ、投資家向け、ライティング、PRD、オペレーションの skill |
| `full` | すべてのアイテム(すべての hook を含む) |

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

エージェントループの特定の時点で自動的に実行されるチェックです。シェルコマンドの実行前やファイル編集の前(理由をエージェントに示したうえでブロックすることもできます)、編集の後、セッションの開始時に実行されます。hook はオプトインです。明示的に指定しない限り、`install` が hook を追加することはありません。

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

インストーラーは、各 hook を Claude Code と、検出したその他すべてのホストに登録します。Claude Code と Gemini CLI はそれぞれの `settings.json`、Kete Code は `kete.json`、Codex と Cursor はそれぞれの `hooks.json`、Copilot CLI は `~/.copilot/hooks/`、OpenCode はプラグインとして登録されます。インストーラーは自分のエントリーだけを追加・削除し、ファイルを変更する前に `<file>.kete-loom-backup` にバックアップを取ります。コメントを含むファイルは書き換えず、代わりに貼り付け用のスニペットを表示します。Codex では、`/hooks` で信頼済みにした後でなければ新しい hook は実行されません。hook はユーザー単位でのみインストールされ、プロジェクト単位ではインストールされません。Cursor には編集前の hook がなく、OpenCode にはセッション開始時にコンテキストを追加する hook がないため、該当する hook はこれらのホストではスキップされます。

全一覧は英語版 README の [Hooks](../../README.md#hooks) と `catalog.json` にあります。

## MCP サーバー

厳選された MCP サーバー設定を、使用しているすべてのホストに、各ホスト独自の形式で登録します。設定ファイルにトークンを書き込むものは 1 つもありません。リモートサーバーはホスト経由の OAuth でサインインし(Claude Code の `/mcp`、`codex mcp login`、`kete mcp auth` など)、ローカルサーバーにはシークレットが不要です。MCP サーバーはオプトインです。名前を指定しない限り、`install` が追加することはありません。

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

パック: `mcp-web`、`mcp-code`(GitHub、Git、Sentry)、`mcp-team`(Linear、Notion、Atlassian)、`mcp-cloud`(Cloudflare、Supabase 読み取り専用、Stripe)、`mcp-design`(Figma)。Claude Code のサーバーは `claude mcp add-json --scope user`(`--project` を指定した場合は `.mcp.json`)で追加されます。Codex には `config.toml` のマーク付きブロックに、Gemini CLI、Cursor、Copilot CLI、OpenCode、Kete Code にはそれぞれの MCP 設定ファイルに追加されます。同じ名前ですでに設定済みのサーバーが置き換えられることはありません。Copilot CLI にはローカルサーバーだけが追加されます。リモートサーバーにサインインする方法が文書化されていないためです。

全一覧は英語版 README の [MCP servers](../../README.md#mcp-servers) と `catalog.json` にあります。

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

プロジェクトへのインストール(`--project`)では、リポジトリ内の同じフォルダーが使われます(Copilot は `.github/agents`、Kete Code は `.kete/`)。

## コントリビュート

[`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md)(skill、agent、command)と [`CONTRIBUTING.md`](../../CONTRIBUTING.md) を読んでください。すべてのプルリクエストは次のチェックに合格する必要があります。

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

`skill-authoring` skill は、この基準に沿った新しい skill の書き方をエージェントに順を追って案内します。

## ライセンス

MIT © Kete-org。詳しくは [LICENSE](../../LICENSE) を参照してください。
