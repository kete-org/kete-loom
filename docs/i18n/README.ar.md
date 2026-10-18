<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center" dir="rtl"><strong>مجموعة منتقاة ومُختبَرة من الـ Agent Skills والوكلاء الفرعيين (subagents) والأوامر لوكلاء البرمجة.</strong><br/>
مصدر واحد، يُثبَّت كما هو في Claude Code وCodex وOpenCode وCursor وGemini CLI وGitHub Copilot وKete Code.</p>

<!-- translated from README.md, source 11b4fb1ab2a5 -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a></p>
<!-- languages:end -->

<div dir="rtl">

---

Kete Loom هي مكتبة المهارات التي تقف خلف [Kete Code](https://ketecode.ai). وهي توفّر ثلاثة أنواع من العناصر: **المهارات (skills)**، وهي مجلدات يحمّلها الوكيل عند الحاجة إليها؛ و**الوكلاء (agents)**، وهم وكلاء فرعيون (subagents) يفوّض إليهم المهام؛ و**الأوامر (commands)**، وهي أوامر شرطة مائلة (slash commands) تكتبها بنفسك. والمكتبة تضع الجودة أولًا: عناصر أقل، وكل واحد منها

- **قابل للنقل**: يستخدم أكثر المجموعات الفرعية المشتركة صرامةً من صيغة [Agent Skills](https://agentskills.io)، فلا ترفضه أي بيئة مضيفة (host)؛
- **مُختبَر**: تأتي المهارات والوكلاء مع اختبارات تقييم للتفعيل (trigger evals) تتحقق من أنها تُحمَّل للطلبات الصحيحة ولا تتدخل في الطلبات غير المناسبة؛
- **قصير**: أقل من 300 سطر، مع نقل التفاصيل إلى `references/` التي لا يقرؤها الوكيل إلا عند الحاجة؛
- **مُرقَّم الإصدار ومُصنَّف**: يحمل في بياناته الوصفية (metadata) رقم إصدار وفق semver، وفئة، ومستوى خطورة (`read-only`، `writes-files`، `runs-commands`، `network`)؛
- **مدعوم بسكربتات** حيثما كان العمل حتميًا.

## التثبيت

### أي وكيل (موصى به)

<div dir="ltr">

```bash
npx @ketecode/loom install
```

</div>

يثبّت هذا الأمر كل المهارات في `~/.agents/skills` (التي يقرؤها Codex وOpenCode وCursor وGemini CLI وGitHub Copilot وKete Code) وفي `~/.claude/skills` (لـ Claude Code). أما الوكلاء والأوامر فتُثبَّت في `~/.claude/agents` و`~/.claude/commands` (التي يقرؤها Claude Code، ويقرأ Cursor وVS Code Copilot منها الوكلاء أيضًا)، وكذلك في المجلدات الخاصة بكلٍّ من Codex وOpenCode وGemini CLI وKete Code إذا كانت هذه البيئات مثبّتة. ويُحوَّل كل وكيل وأمر إلى الصيغة التي تتوقعها بيئته المضيفة. أعد تشغيل وكيلك بعد ذلك.

أو اختر ملفًا تعريفيًا (profile) بدلًا من تثبيت كل شيء:

| الملف التعريفي | ما يثبّته |
|---|---|
| `minimal` | العمل بأسلوب الاختبار أولًا، والتحقق، والمراجعة الأمنية، ومراجعة الشيفرة |
| `core` | الأساسيات، والتخطيط، وgit، والتهيئة للمشروع، وتسليم الجلسة، **إضافةً إلى حزم اللغات وأطر العمل التي يستخدمها مشروعك** (تُكتشف من `package.json` و`go.mod` و`pyproject.toml` و`Cargo.toml` و`Dockerfile` وغيرها) |
| `developer` | `core` إضافةً إلى خطافات الأمان (hooks) الأربعة |
| `security` | كل عناصر الأمان والامتثال، إضافةً إلى خطافات الأمان |
| `ai`، `data` | `core` إضافةً إلى كل عناصر الذكاء الاصطناعي أو البيانات |
| `business` | مهارات التسويق، والبحث، والمستثمرين، والكتابة، ووثائق متطلبات المنتج (PRD)، والعمليات |
| `full` | كل شيء، بما في ذلك كل الخطافات |

<div dir="ltr">

```bash
npx @ketecode/loom install --profile developer     # run it inside your project so detection sees it
npx @ketecode/loom profiles                        # what each profile would install here
```

</div>

يمكن الجمع بين الملفات التعريفية والخيارات `--skill` و`--agent` و`--command` و`--hook`، ويزيل الأمر `uninstall --profile <name>` عناصر ذلك الملف التعريفي فقط.

خيارات شائعة:

<div dir="ltr">

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --agent code-reviewer --command verify
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only items kete-loom installed
```

</div>

لا يتوفر لديك Node؟ استخدم مثبّتات الصدفة (shell)، التي تلجأ عندئذٍ إلى نسخ المهارات نسخًا بسيطًا (أما الوكلاء والأوامر فتحتاج إلى مثبّت Node):

<div dir="ltr">

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

</div>

### التثبيت كإضافة أصلية (plugin)

| البيئة المضيفة | الأمر |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` ثم `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` ثم `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | استخدم مثبّت `npx` (إذ يقرأ Gemini من `~/.agents/skills`). ويتضمن المستودع ملف `gemini-extension.json` لاستخدام `gemini extensions install https://github.com/Kete-org/kete-loom` (تجريبي) |
| أي واجهة أوامر للمهارات | `npx skills add Kete-org/kete-loom` |

تُحدَّث الإضافات المثبّتة عبر مدير الإضافات الخاص بالبيئة المضيفة. استخدم لكل بيئة مضيفة إما التثبيت كإضافة أو مثبّت `npx`، لا الاثنين معًا، وإلا فقد تعرض البيئة كل مهارة مرتين.

## المهارات (Skills)

القائمة الكاملة موجودة في ملف README الإنجليزي: [Skills](../../README.md#skills)، وفي `catalog.json`.

## الوكلاء (Agents)

وكلاء فرعيون يمكن لوكيلك تفويض المهام إليهم. يعمل كلٌّ منهم في سياقه الخاص ثم يعيد نتيجة.

القائمة الكاملة موجودة في ملف README الإنجليزي: [Agents](../../README.md#agents)، وفي `catalog.json`.

## الأوامر (Commands)

أوامر شرطة مائلة تكتبها بنفسك، مثل `/verify`. وهي مدعومة في Claude Code وOpenCode وGemini CLI وKete Code؛ أما البيئات الأخرى فتدمج الأوامر في المهارات، لذا استخدم المهارة المقابلة فيها.

القائمة الكاملة موجودة في ملف README الإنجليزي: [Commands](../../README.md#commands)، وفي `catalog.json`.

## القواعد (Rules)

أعراف قصيرة مفعّلة دائمًا يتبعها الوكيل دون أن يُطلب منه ذلك، مثل «لا تبنِ استعلامات SQL من سلاسل نصية أبدًا» أو «شغّل go vet». وتنطبق قواعد كل لغة على ملفات تلك اللغة فقط حيثما تدعم البيئة المضيفة ذلك (Claude Code وCopilot وCursor). أما Kete Code وGemini CLI وOpenCode وCodex فلا يمكنها قصر القواعد على مسارات محددة، لذا لا تحصل إلا على القواعد التي تختارها، عبر كتلة مُعلَّمة في ملف التعليمات الخاص بها.

<div dir="ltr">

```bash
npx @ketecode/loom install --rule common,security,python
npx @ketecode/loom install --profile core      # common rules plus the ones for your project's languages
```

</div>

القائمة الكاملة موجودة في ملف README الإنجليزي: [Rules](../../README.md#rules)، وفي `catalog.json`.

## الخطافات (Hooks)

فحوصات تعمل تلقائيًا عند نقاط محددة في حلقة عمل الوكيل: قبل تنفيذ أمر صدفة أو تعديل ملف (ويمكنها منعه مع ذكر سبب يراه الوكيل)، أو بعد التعديل، أو عند بدء الجلسة. الخطافات اختيارية: لا يضيفها `install` أبدًا ما لم تطلبها.

<div dir="ltr">

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

</div>

يسجّل المثبّت كل خطاف في Claude Code وفي كل بيئة مضيفة أخرى يجدها: في `settings.json` لكلٍّ من Claude Code وGemini CLI، وفي `kete.json` لـ Kete Code، وفي `hooks.json` لكلٍّ من Codex وCursor، وفي `~/.copilot/hooks/` لـ Copilot CLI، وكإضافة (plugin) في OpenCode. وهو يضيف ويزيل مدخلاته الخاصة فقط، وينسخ الملف احتياطيًا إلى `<file>.kete-loom-backup` قبل تغييره، ولا يعيد أبدًا كتابة ملف يحتوي على تعليقات (بل يطبع المقتطف لتلصقه بنفسك). لا يشغّل Codex خطافًا جديدًا إلا بعد أن تمنحه الثقة عبر `/hooks`. تُثبَّت الخطافات لمستخدمك فقط، لا لكل مشروع على حدة. ليس في Cursor خطاف يعمل قبل التعديل، وليس في OpenCode خطاف يضيف سياقًا عند بدء الجلسة، لذا تتجاوزهما الخطافات المعنية.

القائمة الكاملة موجودة في ملف README الإنجليزي: [Hooks](../../README.md#hooks)، وفي `catalog.json`.

## خوادم MCP

إعدادات منتقاة لخوادم MCP، تُسجَّل في كل بيئة مضيفة تستخدمها وبالصيغة الخاصة بها. لا يضع أيٌّ منها رمز وصول (token) في ملف إعدادات: فالخوادم البعيدة تسجّل الدخول عبر OAuth من خلال البيئة المضيفة (`/mcp` في Claude Code، و`codex mcp login`، و`kete mcp auth`…)، والخوادم المحلية لا تحتاج إلى أي أسرار. خوادم MCP اختيارية: لا يضيفها `install` أبدًا ما لم تسمّها.

<div dir="ltr">

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch
npx @ketecode/loom uninstall --mcp github
```

</div>

الحزم: `mcp-web`، و`mcp-code` (GitHub وGit وSentry)، و`mcp-team` (Linear وNotion وAtlassian)، و`mcp-cloud` (Cloudflare وSupabase للقراءة فقط وStripe)، و`mcp-design` (Figma). تُضاف خوادم Claude Code عبر `claude mcp add-json --scope user` (أو `.mcp.json` مع `--project`)؛ ويحصل عليها Codex في كتلة مُعلَّمة داخل `config.toml`؛ أما Gemini CLI وCursor وCopilot CLI وOpenCode وKete Code ففي ملفات إعدادات MCP الخاصة بها. ولا يُستبدَل أبدًا خادم سبق أن أعددته بالاسم نفسه. يحصل Copilot CLI على الخوادم المحلية فقط، لأنه لا يملك طريقة موثّقة لتسجيل الدخول إلى الخوادم البعيدة.

القائمة الكاملة موجودة في ملف README الإنجليزي: [MCP servers](../../README.md#mcp-servers)، وفي `catalog.json`.

## أين تبحث البيئات المضيفة

### المهارات

<div dir="ltr">

| البيئة المضيفة | مجلد المستخدم | مجلد المشروع |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode فقط | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor فقط | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI فقط | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot فقط | `~/.copilot/skills` | `.github/skills` |
| Kete Code فقط | `~/.config/kete/skills` | `.kete/skills` |

</div>

### الوكلاء والأوامر

<div dir="ltr">

| البيئة المضيفة | الوكلاء | الأوامر | مثبّت افتراضيًا |
|---|---|---|---|
| Claude Code | `~/.claude/agents` | `~/.claude/commands` | نعم |
| Cursor، VS Code Copilot | تقرأ من `~/.claude/agents` | لا تُثبَّت (أوامر Cursor في مرحلة تجريبية، وVS Code يستخدم ملفات الموجّهات (prompt files) الخاصة بالمشروع) | نعم، عبر مجلد Claude |
| Codex | `~/.codex/agents` (TOML) | أوقف Codex دعمها | عند وجود `~/.codex` |
| OpenCode | `~/.config/opencode/agents` | `~/.config/opencode/commands` | عند وجود `~/.config/opencode` |
| Kete Code | `~/.config/kete/agents` | `~/.config/kete/commands` | عند وجود `~/.config/kete` |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/commands` (TOML) | عند وجود `~/.gemini` |
| Copilot CLI | `~/.copilot/agents` (`.agent.md`) | غير مدعومة | مع `--target copilot` |

</div>

تستخدم عمليات التثبيت على مستوى المشروع (`--project`) المجلدات نفسها داخل المستودع (`.github/agents` لـ Copilot، و`.kete/` لـ Kete Code).

## المساهمة

اقرأ [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (للمهارات والوكلاء والأوامر) و[`CONTRIBUTING.md`](../../CONTRIBUTING.md). يجب أن يجتاز كل طلب سحب (pull request) ما يلي:

<div dir="ltr">

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

</div>

ترشد المهارة `skill-authoring` وكيلك خطوة بخطوة لكتابة مهارة جديدة وفق هذا المعيار.

## الترخيص

MIT © Kete-org. راجع [LICENSE](../../LICENSE).

</div>
