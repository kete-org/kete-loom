<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Agent Skills, subagents na commands zilizochaguliwa kwa makini na kujaribiwa, kwa ajili ya coding agents.</strong><br/>
Chanzo kimoja. Husakinishwa bila mabadiliko katika Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot na Kete Code.</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

---

Kete Loom ni maktaba ya skills inayotumiwa na [Kete Code](https://ketecode.ai). Inatoa aina tatu za vipengele: **skills** (folda ambazo agent huzipakia zinapohitajika), **agents** (subagents ambao agent hukabidhi kazi kwao) na **commands** (slash commands unazoandika mwenyewe). Inatanguliza ubora: vipengele vichache, na kila kimoja ni

- **kinachohamishika (portable)**: kinatumia sehemu ndogo kabisa ya pamoja na yenye masharti makali zaidi ya muundo wa [Agent Skills](https://agentskills.io), kwa hivyo hakuna host inayokikataa;
- **kilichojaribiwa**: skills na agents huja na trigger evals zinazohakikisha zinapakiwa kwa maombi sahihi na hazijiingizi kwenye maombi yasiyo yao;
- **kifupi**: chini ya mistari 300, na maelezo ya kina yamehamishiwa `references/` ambayo agent huisoma tu inapohitajika;
- **chenye toleo na lebo**: semver, kategoria na kiwango cha hatari (`read-only`, `writes-files`, `runs-commands`, `network`) katika metadata yake;
- **kinachotegemea scripts** pale ambapo kazi ni deterministic (matokeo yanatabirika).

## Usakinishaji

### Agent yoyote (inapendekezwa)

```bash
npx @ketecode/loom install
```

Hii husakinisha kila skill ndani ya `~/.agents/skills` (inayosomwa na Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot na Kete Code) na `~/.claude/skills` (Claude Code). Agents na commands huwekwa ndani ya `~/.claude/agents` na `~/.claude/commands` (zinazosomwa na Claude Code, na kwa agents pia Cursor na VS Code Copilot), pamoja na folda za Codex, OpenCode, Gemini CLI na Kete Code zenyewe pale hosts hizo zimesakinishwa. Kila agent na command hubadilishwa kuwa muundo ambao host yake inatarajia. Anzisha upya agent yako baadaye.

Au chagua profile badala ya kusakinisha kila kitu:

| Profile | Kinachosakinishwa |
|---|---|
| `minimal` | Kazi ya test-first, uthibitishaji, ukaguzi wa usalama, code review |
| `core` | Mambo muhimu, upangaji, git, onboarding na makabidhiano ya session, **pamoja na language na framework packs ambazo mradi wako unatumia** (zinatambuliwa kutoka `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile` na kadhalika) |
| `developer` | `core` pamoja na hooks nne za usalama |
| `security` | Kila kipengele cha usalama na compliance, pamoja na hooks za usalama |
| `ai`, `data` | `core` pamoja na kila kipengele cha AI au data |
| `business` | Skills za marketing, utafiti, wawekezaji, uandishi, PRD na operations |
| `full` | Kila kitu, ikiwemo kila hook |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

Profiles zinaweza kuunganishwa na `--skill`, `--agent`, `--command` na `--hook`, na `uninstall --profile <name>` huondoa vipengele vya profile hiyo pekee.

Chaguo zinazotumika mara nyingi:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

Huna Node? Tumia shell installers, ambazo hurudi kwenye kunakili skills tu (agents na commands zinahitaji installer ya Node):

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Usakinishaji kama plugin asilia

| Host | Command |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` kisha `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` kisha `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Tumia installer ya `npx` (Gemini husoma `~/.agents/skills`). `gemini-extension.json` imejumuishwa kwa ajili ya `gemini extensions install https://github.com/Kete-org/kete-loom` (ya majaribio) |
| CLI yoyote ya skills | `npx skills add Kete-org/kete-loom` |

Usakinishaji wa plugin husasishwa kupitia plugin manager ya host yenyewe. Kwa host moja, tumia ama usakinishaji wa plugin ama installer ya `npx`, si zote mbili, la sivyo host inaweza kuonyesha kila skill mara mbili.

## Skills

Orodha kamili iko kwenye README ya Kiingereza: [Skills](../../README.md#skills), na pia ndani ya `catalog.json`.

## Agents

Subagents ambao agent wako anaweza kuwakabidhi kazi. Kila mmoja huendesha ndani ya context yake mwenyewe na kurudisha matokeo.

Orodha kamili iko kwenye README ya Kiingereza: [Agents](../../README.md#agents), na pia ndani ya `catalog.json`.

## Commands

Slash commands unazoandika, kwa mfano `/verify`. Zinatumika katika Claude Code, OpenCode, Gemini CLI na Kete Code; hosts nyingine zinaunganisha commands ndani ya skills, kwa hivyo huko tumia skill inayolingana.

Orodha kamili iko kwenye README ya Kiingereza: [Commands](../../README.md#commands), na pia ndani ya `catalog.json`.

## Rules

Kanuni fupi zinazofanya kazi muda wote ambazo agent huzifuata bila kuombwa, kama vile "usijenge SQL kutoka kwa strings" au "endesha go vet". Rules za lugha fulani hutumika tu kwa faili za lugha hiyo pale host inapounga mkono (Claude Code, Copilot, Cursor). Kete Code, Gemini CLI, OpenCode na Codex haziwezi kuwekea rules mipaka kwa paths, kwa hivyo hupata tu rules unazochagua, kupitia block iliyowekewa alama ndani ya faili lao la maelekezo.

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

Orodha kamili iko kwenye README ya Kiingereza: [Rules](../../README.md#rules), na pia ndani ya `catalog.json`.

## Hooks

Ukaguzi unaoendeshwa kiotomatiki katika hatua fulani za mzunguko wa agent: kabla ya shell command au kuhariri faili (na ukaguzi huo unaweza kuizuia, huku ukitoa sababu ambayo agent huiona), baada ya kuhariri, au session inapoanza. Hooks ni za hiari: `install` haiziongezi kamwe usipoziomba.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

Installer husajili kila hook kwa Claude Code na kila host nyingine inayoipata: Claude Code na Gemini CLI ndani ya `settings.json` zao, Kete Code ndani ya `kete.json`, Codex na Cursor ndani ya `hooks.json` zao, Copilot CLI ndani ya `~/.copilot/hooks/` na OpenCode kama plugin. Huongeza na kuondoa entries zake tu, huhifadhi nakala ya faili kama `<file>.kete-loom-backup` kabla ya kulibadilisha, na kamwe haiandiki upya faili lenye comments (badala yake huchapisha kipande cha kubandika). Codex huendesha hook mpya tu baada ya wewe kuiamini kwa `/hooks`. Hooks husakinishwa kwa mtumiaji wako pekee, si kwa kila mradi. Cursor haina hook ya kabla ya kuhariri na OpenCode haina inayoongeza context mwanzoni mwa session, kwa hivyo hooks hizo huruka hosts hizo.

Orodha kamili iko kwenye README ya Kiingereza: [Hooks](../../README.md#hooks), na pia ndani ya `catalog.json`.

## MCP servers

Configs za MCP servers zilizochaguliwa kwa makini, zinazosajiliwa kwa kila host unayotumia katika muundo wa host hiyo yenyewe. Hakuna hata moja inayoweka token ndani ya faili la config: remote servers huingia (sign in) kwa OAuth kupitia host (`/mcp` katika Claude Code, `codex mcp login`, `kete mcp auth`…), na local servers hazihitaji siri zozote. MCP servers ni za hiari: `install` haiziongezi kamwe usipozitaja kwa majina.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

Packs: `mcp-web`, `mcp-code` (GitHub, Git, Sentry), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Supabase read-only, Stripe), `mcp-design` (Figma). Servers za Claude Code huongezwa kwa `claude mcp add-json --scope user` (au `.mcp.json` kwa `--project`); Codex huzipata ndani ya block iliyowekewa alama ya `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode na Kete Code ndani ya faili zao za MCP config. Server uliyokwisha kuisanidi kwa jina lilelile haibadilishwi kamwe. Copilot CLI hupata local servers pekee, kwa sababu haina njia iliyoandikwa rasmi ya kuingia kwenye remote servers.

Orodha kamili iko kwenye README ya Kiingereza: [MCP servers](../../README.md#mcp-servers), na pia ndani ya `catalog.json`.

## Mahali hosts hutafuta

### Skills

| Host | Folda ya mtumiaji | Folda ya mradi |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode pekee | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor pekee | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI pekee | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot pekee | `~/.copilot/skills` | `.github/skills` |
| Kete Code pekee | `~/.config/kete/skills` | `.kete/skills` |

### Agents na commands

| Host | Agents | Commands | Husakinishwa kwa chaguo-msingi |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | ndiyo |
| Cursor, VS Code Copilot | husoma `~/.claude/agents` | hazisakinishwi (za Cursor bado ziko beta; VS Code hutumia prompt files za mradi) | ndiyo, kupitia folda ya Claude |
| Codex | `~/.codex/agents` (TOML) | zimeachwa (deprecated) na Codex | pale `~/.codex` ipo |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | pale `~/.config/opencode` ipo |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | pale `~/.config/kete` ipo |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | pale `~/.gemini` ipo |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | hazitumiki | kwa `--target copilot` |

Usakinishaji wa mradi (`--project`) hutumia folda zilezile ndani ya repo (`.github/agents` kwa Copilot, `.kete/` kwa Kete Code).

## Kuchangia

Soma [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agents na commands) na [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Kila pull request lazima ipite:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

Skill ya `skill-authoring` humwongoza agent wako hatua kwa hatua kuandika skill mpya inayofikia kiwango hiki.

## Leseni

MIT © Kete-org. Tazama [LICENSE](../../LICENSE).
