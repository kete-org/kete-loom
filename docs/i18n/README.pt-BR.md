<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Agent Skills, subagents e comandos selecionados e testados para agentes de programação.</strong><br/>
Uma única fonte. Instala sem alterações no Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot, Kete Code e Kiro.</p>

<!-- translated from README.md, source 71f6d298dd66 -->

<!-- counts:start -->
<!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

---

O Kete Loom é a biblioteca de skills por trás do [Kete Code](https://ketecode.ai). Ele traz **skills** (pastas que o agente carrega quando são relevantes), **agents** (subagents para os quais ele delega tarefas), **commands** (slash commands que você digita), **rules** (orientações curtas e sempre ativas), **hooks** (verificações que rodam em torno das chamadas de ferramenta do agente e quando ele termina) e **configurações de servidores MCP**. A prioridade é a qualidade: menos itens, e cada um deles é

- **portável**: usa o subconjunto comum mais restrito do formato [Agent Skills](https://agentskills.io), para que nenhum host o rejeite;
- **testado**: skills e agents vêm com evals de acionamento que verificam se eles são carregados nas solicitações certas e não são acionados nas erradas, e as skills de disciplina acrescentam evals de comportamento que verificam se o agente realmente as segue sob pressão, em comparação com uma execução sem a skill;
- **curto**: menos de 300 linhas, com os detalhes movidos para `references/`, que o agente lê só quando precisa;
- **versionado e rotulado**: semver, categoria e nível de risco (`read-only`, `writes-files`, `runs-commands`, `network`) nos metadados;
- **apoiado por scripts** quando o trabalho é determinístico.

## Instalação

### Qualquer agente (recomendado)

```bash
npx @ketecode/loom install
```

Isso instala todas as skills em `~/.agents/skills` (lido por Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot e Kete Code) e em `~/.claude/skills` (Claude Code). Agents e commands vão para `~/.claude/agents` e `~/.claude/commands` (lidos pelo Claude Code e, no caso dos agents, também pelo Cursor e pelo VS Code Copilot), e para as pastas próprias do Codex, OpenCode, Gemini CLI, Kete Code e Kiro quando esses hosts estão instalados (o Kiro também recebe sua própria cópia das skills). Cada agent e command é convertido para o formato que o host espera. Depois, reinicie o seu agente.

Ou escolha um perfil em vez de instalar tudo:

| Perfil | O que instala |
|---|---|
| `minimal` | Desenvolvimento orientado a testes, verificação, revisão de segurança, revisão de código |
| `core` | O essencial, planejamento, git, onboarding e passagem de sessão, **além dos pacotes de linguagem e framework que o seu projeto usa** (detectados a partir de `package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `Dockerfile` etc.) |
| `developer` | `core` mais os quatro hooks de segurança |
| `strict` | `developer` mais as proteções opcionais (opt-in): ler antes de editar, configurações de lint protegidas, servidores de desenvolvimento em segundo plano, permanecer na worktree, nada de ler segredos nem de instruções plantadas, avisos sobre texto injetado no que ele lê, nenhum truncamento acidental de arquivos, um aviso antes de o contexto encher, mensagens de commit válidas e, no final, nenhum stub inacabado nem falha de lint e de verificação de tipos |
| `method` | Um método de desenvolvimento completo: design antes do código, planos granulares, um subagent novo por tarefa com revisão de especificação e de qualidade, depuração sistemática, resposta a revisões, worktrees e uma finalização limpa |
| `project` | `method` mais planejamento de projeto: um roadmap com fases em `.planning/`, esclarecimento de requisitos, verificação dos planos antes do código, testes de aceitação com você, um backlog de ideias, spikes de viabilidade e commands de recuperação |
| `security` | Todos os itens de segurança e compliance, mais os hooks de segurança |
| `ai`, `data` | `core` mais todos os itens de IA ou de dados |
| `business` | Skills de marketing, conteúdo para LinkedIn, pesquisa, investidores, redação, PRD e operações |
| `design` | `core` mais trabalho de interface: design systems a partir do contexto do produto, com tokens de contraste verificado e um DESIGN.md, acabamento, acessibilidade, animação, o auditor de UI e `/design-ui` |
| `full` | Tudo, com todos os hooks que não são opt-in |

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

Os perfis podem ser combinados com `--skill`, `--agent`, `--command` e `--hook`, e `uninstall --profile <name>` remove apenas os itens daquele perfil.

Opções comuns:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

Não tem Node? Use os instaladores de shell, que recorrem a uma cópia simples das skills (agents e commands precisam do instalador Node):

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Instalação como plugin nativo

| Host | Comando |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` e depois `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` e depois `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Use o instalador `npx` (o Gemini lê `~/.agents/skills`). Um `gemini-extension.json` está incluído para `gemini extensions install https://github.com/Kete-org/kete-loom` (experimental) |
| Qualquer CLI de skills | `npx skills add Kete-org/kete-loom` |

Instalações via plugin são atualizadas pelo próprio gerenciador de plugins do host. Para um mesmo host, use a instalação via plugin ou o instalador `npx`, não os dois; caso contrário, o host pode listar cada skill duas vezes.

O plugin do Claude Code também ativa os quatro hooks de segurança do perfil `developer` (`block-dangerous-commands`, `block-no-verify`, `guard-secrets`, `protect-files`). Eles são somente leitura e apenas bloqueiam comandos de shell e edições arriscados; precisam do Node.js no seu `PATH`. Se você já instalou algum deles com o `npx`, desinstale essa cópia (`npx @ketecode/loom uninstall --hook <name>`) ou ele será executado duas vezes. Os demais hooks continuam vindo do instalador `npx`.

## Um método de desenvolvimento

Instale `--profile method` para ter uma forma completa de trabalhar, da ideia à branch mesclada, com uma etapa de revisão em cada passo:

| Passo | Use | O que acontece |
|---|---|---|
| 1. Design | `/brainstorm` (`design-brainstorming`) | Uma pergunta por vez, duas ou três abordagens com seus prós e contras, a sua aprovação seção por seção, mockups em HTML para escolhas visuais e, por fim, um documento de design no repositório. |
| 2. Isolar | `git-worktrees` | Uma worktree separada e ignorada pelo git, com as dependências instaladas e uma execução de testes de referência, para que as falhas existentes sejam conhecidas. |
| 3. Planejar | `/plan-feature` (`implementation-plans`) | Tarefas de poucos minutos cada, com os arquivos exatos, o teste que falha a ser escrito primeiro, o comando a rodar e a saída esperada, e um commit por tarefa. |
| 4. Construir | `subagent-driven-development` com o agent `task-implementer` | Um subagent novo por tarefa trabalha com testes primeiro e informa um status. O `spec-reviewer` o confere com a tarefa e depois o `code-reviewer` verifica a qualidade, repetindo até que ambos aprovem. |
| 5. Depurar | `/debug` (`systematic-debugging`) | Causa raiz antes de qualquer correção: reproduzir, rastrear o valor incorreto até a origem, uma hipótese por vez. Depois de três correções que falharam, ele para e questiona o design. |
| 6. Revisar | `responding-to-code-review` | Confere cada comentário com o código, contesta com evidências quando uma sugestão está errada e responde na thread da revisão. |
| 7. Finalizar | `/finish-branch` (`finishing-a-branch`) | Testes primeiro e, então, mesclar localmente, abrir um pull request, manter a branch ou descartá-la (só depois que você digitar uma confirmação). |

`/feature-dev` executa a sequência inteira com uma pausa para a sua aprovação entre as etapas, e a rule `use-skills` faz o agente recorrer a essas skills em vez de trabalhar de memória.

Para trabalhos maiores que uma feature, `--profile project` adiciona o planejamento em torno dela. Tudo fica em arquivos Markdown simples em `.planning/`, que você pode ler, editar e commitar:

| Necessidade | Use |
|---|---|
| Um roadmap de marcos e fases ligados a requisitos numerados, com um estado atual que persiste entre sessões | `project-roadmap`; `/progress` diz em que pé as coisas estão e indica a próxima ação |
| Requisitos definidos antes do planejamento: as zonas cinzentas, as suposições do agente com evidências, os casos de borda | `spec-clarification`, `assumptions-analyzer` |
| Um plano verificado em relação ao seu objetivo antes de qualquer código ser escrito | `plan-checker` |
| "Isso pode mesmo funcionar?" respondido com um experimento de tempo limitado e um veredito | `feasibility-spike` |
| Testes de aceitação com você, uma entrega por vez | `/uat` (`acceptance-testing`), `ui-auditor` |
| Ideias e tarefas pendentes salvas sem desviar da tarefa atual | `/capture` (`idea-backlog`) |
| Recuperação: corrigir uma lista de apontamentos de revisão, descobrir por que um esforço de várias sessões deu errado, desfazer trabalho com segurança | `/fix-findings`, `/forensics`, `/revert-work` |

### Aprendendo com cada sessão

As skills melhoram com os atritos encontrados no trabalho real, por isso o Kete Loom mantém um registro deles. A skill `skill-observations` anota cada achado no momento em que ele acontece: uma correção que você fez, uma regra que o agente quebrou, um passo que faltou ou um fluxo de trabalho que merece uma skill própria. Ela grava cada um como um pequeno arquivo por meio de `kete-loom observe`. Depois, `/skill-review` transforma o registro em mudanças que você aprova uma a uma.

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

O registro é seu e fica na sua máquina, em `~/.kete-loom/observations/`. Ele é mantido no escopo do usuário, para que os achados não fiquem divididos entre projetos nem se percam com uma worktree apagada. A CLI impõe o controle:
- ids nunca se repetem, e um arquivo existente nunca é sobrescrito;
- um achado repetido com outras palavras é recusado, e o original deve ser ampliado;
- todo achado precisa registrar quais skills relacionadas foram verificadas;
- uma regra quebrada duas vezes é sinalizada para virar um hook (`/hookify`) em vez de ganhar mais uma reformulação.

As revisões preparam as mudanças e nunca editam no lugar uma skill do Kete Loom já instalada, pois o `update` a sobrescreveria; essas viram uma proposta de mudança upstream e, se necessário, uma rule do projeto. Com o hook `load-session-context` instalado, cada sessão começa sabendo o que está em aberto. Os dois itens estão em `--profile method`.

A abordagem é adaptada de [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all), de Eoghan Henn e colaboradores (CC BY 4.0).

## Skills

A lista completa está no README em inglês: [Skills](../../README.md#skills), e em [`catalog.json`](../../catalog.json).

## Agents

Subagents para os quais o seu agente pode delegar tarefas. Cada um roda em seu próprio contexto e devolve um resultado.

A lista completa está no README em inglês: [Agents](../../README.md#agents), e em [`catalog.json`](../../catalog.json).

## Commands

Slash commands que você digita, por exemplo `/verify`. Suportados no Claude Code, OpenCode, Gemini CLI e Kete Code; os outros hosts estão incorporando os commands às skills, então use a skill correspondente neles.

A lista completa está no README em inglês: [Commands](../../README.md#commands), e em [`catalog.json`](../../catalog.json).

## Rules

Convenções curtas e sempre ativas que o agente segue sem que seja preciso pedir, como "nunca monte SQL a partir de strings" ou "rode go vet". As rules de linguagem valem apenas para os arquivos daquela linguagem nos hosts que permitem isso (Claude Code, Copilot, Cursor). Kete Code, Gemini CLI, OpenCode e Codex não conseguem restringir rules por caminho, então recebem só as rules que você escolher, por meio de um bloco marcado no arquivo de instruções.

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

A lista completa está no README em inglês: [Rules](../../README.md#rules), e em [`catalog.json`](../../catalog.json).

## Hooks

Verificações que rodam automaticamente em pontos do loop do agente: antes de um comando de shell ou da edição de um arquivo (podendo bloqueá-los, com um motivo que o agente vê), depois de uma edição, depois da leitura de um arquivo ou da web ou de qualquer chamada de ferramenta (podendo adicionar uma nota para o agente), quando uma sessão começa ou quando o agente termina a sua vez (podendo mandá-lo de volta ao trabalho). Os hooks são opcionais (opt-in): o `install` nunca os adiciona, a menos que você peça. Os hooks marcados como opt-in mudam a forma como o agente trabalha, então o `--hooks` os deixa de fora; indique-os pelo nome ou use `--profile strict`.

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

O instalador registra cada hook no Claude Code e em todos os outros hosts que encontrar: Claude Code e Gemini CLI no `settings.json` de cada um, Kete Code no `kete.json`, Codex e Cursor no `hooks.json` de cada um, Copilot CLI em `~/.copilot/hooks/` e OpenCode como plugin. Ele só adiciona e remove as próprias entradas, faz backup do arquivo em `<file>.kete-loom-backup` antes de alterá-lo e nunca reescreve um arquivo que tenha comentários (nesse caso, imprime o trecho para você colar). O Codex só executa um hook novo depois que você confia nele com `/hooks`. Os hooks são instalados apenas para o seu usuário, não por projeto. O Cursor não tem hook antes de uma edição e o OpenCode não tem nenhum que adicione contexto no início da sessão, então esses hooks não se aplicam a eles; os hooks que mandam o agente de volta quando ele termina não se aplicam ao Kete Code e ao OpenCode, cujos hooks de parada não conseguem fazer isso. Os hooks do Kiro pertencem às configurações de agent dele e não são instalados.

A lista completa está no README em inglês: [Hooks](../../README.md#hooks), e em [`catalog.json`](../../catalog.json).

## Servidores MCP

Configurações selecionadas de servidores MCP, registradas em cada host que você usa, no formato próprio daquele host. Nenhuma delas coloca um token em arquivo de configuração: servidores remotos fazem login com OAuth pelo host (`/mcp` no Claude Code, `codex mcp login`, `kete mcp auth`…), e servidores locais não precisam de segredos. Os servidores MCP são opcionais (opt-in): o `install` nunca os adiciona, a menos que você os indique pelo nome.

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

Pacotes: `mcp-web`, `mcp-code` (GitHub, Git, Sentry e `lsp` para navegação via servidor de linguagem), `mcp-team` (Linear, Notion, Atlassian), `mcp-cloud` (Cloudflare, Vercel, Supabase somente leitura, Stripe), `mcp-design` (Figma). Os servidores do Claude Code são adicionados com `claude mcp add-json --scope user` (ou em `.mcp.json` com `--project`); o Codex os recebe em um bloco marcado do `config.toml`; Gemini CLI, Cursor, Copilot CLI, OpenCode e Kete Code, nos respectivos arquivos de configuração MCP. Um servidor que você já configurou com o mesmo nome nunca é substituído. No Windows, os servidores do Claude Code só podem ser adicionados assim com o instalador nativo do Claude Code (`claude.exe`); com uma instalação via npm, o kete-loom mostra o comando `claude mcp add-json` para você executar. O Copilot CLI recebe apenas servidores locais, porque não tem uma forma documentada de fazer login nos remotos.

A lista completa está no README em inglês: [Servidores MCP](../../README.md#mcp-servers), e em [`catalog.json`](../../catalog.json).

## Manutenção

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

O `audit` verifica o que faz os agentes funcionarem bem em um repositório: instruções para o agente (`AGENTS.md`/`CLAUDE.md`), os pacotes do Kete Loom para a stack que ele detecta, comandos de teste e de lint, CI, os hooks de segurança e se os arquivos `.env` são ignorados e não estão no repositório. Ele sai com código diferente de zero quando uma verificação falha, então pode rodar no CI.

Dentro do seu agente, `/loom` encontra os itens certos para uma tarefa, `/checkpoint` salva um snapshot restaurável sem fazer commit, `/sessions` lista e organiza as notas de passagem de contexto, `/codemap` escreve um mapa curto da arquitetura, `/model-route` sugere um nível de modelo e `/aside` responde a uma pergunta paralela sem desviar da tarefa. Para a própria configuração do seu agente, `/lint-agent-config` verifica AGENTS.md, skills, hooks, configurações MCP e manifestos de plugin em busca de configurações quebradas ou arriscadas, `/rules-review` compara suas sessões recentes com suas regras e sugere o que adicionar, reformular ou aposentar, e `/usage-report` resume o uso de tokens e o custo a partir dos logs de sessão locais.

## Onde os hosts procuram

### Skills

| Host | Pasta do usuário | Pasta do projeto |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Somente OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| Somente Cursor | `~/.cursor/skills` | `.cursor/skills` |
| Somente Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| Somente GitHub Copilot | `~/.copilot/skills` | `.github/skills` |
| Somente Kete Code | `~/.config/kete/skills` | `.kete/skills` |
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

### Agents e commands

| Host | Agents | Commands | Instalado por padrão |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | sim |
| Cursor, VS Code Copilot | leem `~/.claude/agents` | não instalado (os do Cursor estão em beta; o VS Code usa arquivos de prompt do projeto) | sim, pela pasta do Claude |
| Codex | `~/.codex/agents` (TOML) | descontinuado pelo Codex | quando `~/.codex` existe |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | quando `~/.config/opencode` existe |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | quando `~/.config/kete` existe |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | quando `~/.gemini` existe |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | não suportado | com `--target copilot` |
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | quando `~/.kiro` existe |

Instalações de projeto (`--project`) usam as mesmas pastas dentro do repositório (`.github/agents` para o Copilot, `.kete/` para o Kete Code, `.kiro/` para o Kiro). As rules do Kiro viram arquivos de steering em `~/.kiro/steering`, com escopo definido por `fileMatch`.

## Como contribuir

Leia [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (skills, agents e commands) e [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Todo pull request precisa passar em:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

Dois tipos de evals mantêm os itens honestos:

- **Evals de acionamento** (`evals/triggers.json`): um modelo roteia prompts realistas e quase acertos do mesmo jeito que os hosts fazem, e cada item precisa ser escolhido para os próprios prompts e somente para eles.
- **Evals de comportamento** (`evals/behavior.json`): cenários que pressionam o agente a pular a disciplina do item ("só corrige isso, a gente publica em dez minutos"). Cada um roda com o item e sem ele, um modelo juiz avalia cada resposta, e o relatório mostra o que o item acrescenta. `--host claude` os executa como sessões reais do Claude Code em modo headless.

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

A skill `skill-authoring` orienta o seu agente na escrita de uma nova skill seguindo este padrão.

## Licença

MIT © Kete-org. Veja [LICENSE](../../LICENSE).
