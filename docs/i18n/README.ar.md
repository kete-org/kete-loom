<p align="center">
  <img src="../../assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center" dir="rtl"><strong>مجموعة منتقاة ومُختبَرة من الـ Agent Skills والوكلاء الفرعيين (subagents) والأوامر لوكلاء البرمجة.</strong><br/>
مصدر واحد، يُثبَّت كما هو في Claude Code وCodex وOpenCode وCursor وGemini CLI وGitHub Copilot وKete Code وKiro.</p>

<!-- translated from README.md, source 5fdefea7ddee -->

<!-- counts:start -->
<!-- counts:end -->

<!-- languages:start -->
<p align="center"><a href="../../README.md">English</a> · <a href="README.ar.md">العربية</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://kete-org.github.io/kete-loom/">Browse the catalog ↗</a></p>
<!-- languages:end -->

<div dir="rtl">

---

Kete Loom هي مكتبة المهارات التي تقف خلف [Kete Code](https://ketecode.ai). وهي توفّر **المهارات (skills)**، وهي مجلدات يحمّلها الوكيل عند الحاجة إليها؛ و**الوكلاء (agents)**، وهم وكلاء فرعيون (subagents) يفوّض إليهم المهام؛ و**الأوامر (commands)**، وهي أوامر شرطة مائلة (slash commands) تكتبها بنفسك؛ و**القواعد (rules)**، وهي إرشادات قصيرة مفعّلة دائمًا؛ و**الخطافات (hooks)**، وهي فحوصات تعمل حول استدعاءات الوكيل للأدوات وعند انتهائه؛ و**إعدادات خوادم MCP**. والمكتبة تضع الجودة أولًا: عناصر أقل، وكل واحد منها

- **قابل للنقل**: يستخدم أكثر المجموعات الفرعية المشتركة صرامةً من صيغة [Agent Skills](https://agentskills.io)، فلا ترفضه أي بيئة مضيفة (host)؛
- **مُختبَر**: تأتي المهارات والوكلاء مع اختبارات تقييم للتفعيل (trigger evals) تتحقق من أنها تُحمَّل للطلبات الصحيحة ولا تتدخل في الطلبات غير المناسبة، وتضيف مهارات الانضباط اختبارات تقييم للسلوك (behaviour evals) تتحقق من أن الوكيل يتبعها فعلًا تحت الضغط، مقارنةً بتشغيل دون المهارة؛
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

يثبّت هذا الأمر كل المهارات في `~/.agents/skills` (التي يقرؤها Codex وOpenCode وCursor وGemini CLI وGitHub Copilot وKete Code) وفي `~/.claude/skills` (لـ Claude Code). أما الوكلاء والأوامر فتُثبَّت في `~/.claude/agents` و`~/.claude/commands` (التي يقرؤها Claude Code، ويقرأ Cursor وVS Code Copilot منها الوكلاء أيضًا)، وكذلك في المجلدات الخاصة بكلٍّ من Codex وOpenCode وGemini CLI وKete Code وKiro إذا كانت هذه البيئات مثبّتة (ويحصل Kiro أيضًا على نسخته الخاصة من المهارات). ويُحوَّل كل وكيل وأمر إلى الصيغة التي تتوقعها بيئته المضيفة. أعد تشغيل وكيلك بعد ذلك.

أو اختر ملفًا تعريفيًا (profile) بدلًا من تثبيت كل شيء:

| الملف التعريفي | ما يثبّته |
|---|---|
| `minimal` | العمل بأسلوب الاختبار أولًا، والتحقق، والمراجعة الأمنية، ومراجعة الشيفرة |
| `core` | الأساسيات، والتخطيط، وgit، والتهيئة للمشروع، وتسليم الجلسة، **إضافةً إلى حزم اللغات وأطر العمل التي يستخدمها مشروعك** (تُكتشف من `package.json` و`go.mod` و`pyproject.toml` و`Cargo.toml` و`Dockerfile` وغيرها) |
| `developer` | `core` إضافةً إلى خطافات الأمان (hooks) الأربعة |
| `strict` | `developer` إضافةً إلى الضوابط الاختيارية: القراءة قبل التعديل، وحماية إعدادات الفحص (lint)، وتشغيل خوادم التطوير في الخلفية، والبقاء داخل الـ worktree، ومنع قراءة الأسرار والتعليمات المدسوسة، والتحذير من النصوص المحقونة فيما يقرؤه، ومنع اقتطاع الملفات عن غير قصد، والتحذير قبل امتلاء السياق، ورسائل إيداع (commit) صالحة، وعدم ترك أجزاء غير مكتملة (stubs) أو إخفاقات في الفحص (lint) والتحقق من الأنواع عند الانتهاء |
| `method` | منهجية تطوير كاملة: التصميم قبل الشيفرة، وخطط مفصّلة، ووكيل فرعي جديد لكل مهمة مع مراجعة للمواصفات وللجودة، وتصحيح منهجي للأخطاء، والرد على المراجعات، وworktrees، وإنهاء نظيف |
| `project` | `method` إضافةً إلى تخطيط المشروع: خارطة طريق بمراحل في `.planning/`، وتوضيح المتطلبات، وفحص الخطط قبل كتابة الشيفرة، واختبار القبول معك، وسجل للأفكار، وتجارب جدوى (spikes)، وأوامر للاستعادة |
| `security` | كل عناصر الأمان والامتثال، إضافةً إلى خطافات الأمان |
| `ai`، `data` | `core` إضافةً إلى كل عناصر الذكاء الاصطناعي أو البيانات |
| `business` | مهارات التسويق، ومحتوى LinkedIn، والبحث، والمستثمرين، والكتابة، ووثائق متطلبات المنتج (PRD)، والعمليات |
| `design` | `core` مع أعمال واجهات المستخدم: أنظمة تصميم مبنية على سياق المنتج مع رموز (tokens) مفحوصة التباين وملف DESIGN.md، والتحسين البصري، وإمكانية الوصول، والحركة، ومدقق الواجهات و`/design-ui` |
| `full` | كل شيء، مع كل خطاف غير اختياري |

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

## منهجية للتطوير

ثبّت `--profile method` لتحصل على طريقة عمل كاملة، من الفكرة حتى دمج الفرع، مع بوابة مراجعة في كل خطوة:

| الخطوة | ما تستخدمه | ما يحدث |
|---|---|---|
| 1. التصميم | `/brainstorm` (`design-brainstorming`) | سؤال واحد في كل مرة، ونهجان أو ثلاثة مع موازنة بين مزايا كلٍّ منها وعيوبه، وموافقتك قسمًا قسمًا، ونماذج HTML أولية للخيارات المرئية، ثم وثيقة تصميم في المستودع. |
| 2. العزل | `git-worktrees` | worktree منفصلة ومُتجاهَلة في git، مع تثبيت الاعتماديات وتشغيل أساسي للاختبارات، لتكون الإخفاقات الموجودة مسبقًا معروفة. |
| 3. التخطيط | `/plan-feature` (`implementation-plans`) | مهام تستغرق كلٌّ منها بضع دقائق، مع الملفات المحددة، والاختبار الفاشل الذي يُكتب أولًا، والأمر الذي يُشغَّل ومخرجاته المتوقعة، وإيداع (commit) لكل مهمة. |
| 4. البناء | `subagent-driven-development` مع الوكيل `task-implementer` | يعمل وكيل فرعي جديد على كل مهمة بأسلوب الاختبار أولًا ويُبلغ عن حالتها. يتحقق `spec-reviewer` منها مقابل المهمة، ثم يتحقق `code-reviewer` من جودتها، ويتكرر ذلك حتى تجتاز المراجعتين. |
| 5. تصحيح الأخطاء | `/debug` (`systematic-debugging`) | السبب الجذري قبل أي إصلاح: أعد إنتاج المشكلة، وتتبّع القيمة الخاطئة حتى مصدرها، وفرضية واحدة في كل مرة. وبعد ثلاثة إصلاحات فاشلة يتوقف ويعيد النظر في التصميم. |
| 6. المراجعة | `responding-to-code-review` | يتحقق من كل تعليق مقابل الشيفرة، ويعترض بالأدلة حين يكون الاقتراح خاطئًا، ويرد في سلسلة المراجعة. |
| 7. الإنهاء | `/finish-branch` (`finishing-a-branch`) | الاختبارات أولًا، ثم الدمج محليًا، أو فتح طلب سحب (pull request)، أو الإبقاء على الفرع، أو التخلص منه (فقط بعد أن تكتب تأكيدًا). |

يشغّل `/feature-dev` التسلسل كله مع توقف لأخذ موافقتك بين المراحل، وتجعل القاعدة `use-skills` الوكيل يلجأ إلى هذه المهارات بدلًا من العمل اعتمادًا على ذاكرته.

وللعمل الأكبر من ميزة واحدة، يضيف `--profile project` التخطيط المحيط بها. يُحفظ كل شيء في ملفات Markdown عادية داخل `.planning/`، يمكنك قراءتها وتعديلها وإيداعها:

| الحاجة | ما تستخدمه |
|---|---|
| خارطة طريق من محطات ومراحل مرتبطة بمتطلبات مرقّمة، مع حالة حالية تبقى محفوظة بين الجلسات | `project-roadmap`؛ ويخبرك `/progress` بموقع العمل ويحدد الإجراء التالي |
| تثبيت المتطلبات قبل التخطيط: المناطق الرمادية، وافتراضات الوكيل مع أدلتها، والحالات الحدّية | `spec-clarification`، `assumptions-analyzer` |
| خطة تُفحص مقابل هدفها قبل كتابة أي شيفرة | `plan-checker` |
| الإجابة عن سؤال «هل يمكن أن ينجح هذا أصلًا؟» بتجربة محددة المدة وحكم واضح | `feasibility-spike` |
| اختبار القبول معك، مُخرَجًا واحدًا في كل مرة | `/uat` (`acceptance-testing`)، `ui-auditor` |
| حفظ الأفكار والمهام دون الخروج عن المهمة الحالية | `/capture` (`idea-backlog`) |
| الاستعادة: إصلاح قائمة من ملاحظات المراجعة، ومعرفة سبب تعثّر جهد امتد عبر عدة جلسات، والتراجع عن العمل بأمان | `/fix-findings`، `/forensics`، `/revert-work` |

### التعلّم من كل جلسة

تتحسّن المهارات بفضل مواطن الاحتكاك التي تظهر في العمل الفعلي، لذا يحتفظ Kete Loom بسجلّ لها. تدوّن المهارة `skill-observations` كل ملاحظة لحظة حدوثها: تصحيح قدّمته، أو قاعدة خالفها الوكيل، أو خطوة ناقصة، أو طريقة عمل تستحق مهارة خاصة بها. وتكتب كل ملاحظة في ملف صغير عبر `kete-loom observe`. ثم يحوّل `/skill-review` السجلّ لاحقًا إلى تغييرات توافق عليها واحدًا تلو الآخر.

<div dir="ltr">

```bash
npx @ketecode/loom observe scan        # open findings, whether a review is due, rules broken twice
npx @ketecode/loom observe list --skill tdd-workflow
```

</div>

السجلّ ملكك ويبقى على جهازك، في `~/.kete-loom/observations/`. ويُحفظ على مستوى المستخدم، فلا تتوزّع الملاحظات بين المشاريع ولا تضيع مع حذف worktree. وتفرض واجهة سطر الأوامر (CLI) قواعد التدوين:
- لا تتكرر المعرّفات أبدًا، ولا يُستبدل ملف موجود أبدًا؛
- تُرفض الملاحظة المُعاد صياغتها، ويُطلب بدلًا من ذلك توسيع الملاحظة الأصلية؛
- يجب أن تسجّل كل ملاحظة المهارات ذات الصلة التي جرى فحصها؛
- القاعدة التي تُخالَف مرتين تُعلَّم لتتحول إلى خطاف (`/hookify`) بدلًا من إعادة صياغتها مرة أخرى.

تُجهّز المراجعات التغييرات ولا تعدّل أبدًا مهارة Kete Loom مثبّتة في مكانها، لأن `update` سيستبدلها؛ وتتحول تلك التغييرات إلى مسودة تغيير للمصدر الأصلي (upstream)، ومعها قاعدة للمشروع عند الحاجة. ومع تثبيت الخطاف `load-session-context`، تبدأ كل جلسة وهي تعرف ما لا يزال مفتوحًا. والعنصران كلاهما ضمن `--profile method`.

هذا النهج مقتبس من [Task Observer](https://github.com/rebelytics/one-skill-to-rule-them-all) من تأليف Eoghan Henn والمساهمين (CC BY 4.0).

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

فحوصات تعمل تلقائيًا عند نقاط محددة في حلقة عمل الوكيل: قبل تنفيذ أمر صدفة أو تعديل ملف (ويمكنها منعه مع ذكر سبب يراه الوكيل)، أو بعد التعديل، أو بعد قراءة ملف أو صفحة ويب أو أي استدعاء لأداة (ويمكنها إضافة ملاحظة للوكيل)، أو عند بدء الجلسة، أو عندما ينهي الوكيل دوره (ويمكنها إعادته إلى العمل). الخطافات اختيارية: لا يضيفها `install` أبدًا ما لم تطلبها. والخطافات الموسومة بأنها اختيارية (opt-in) تغيّر طريقة عمل الوكيل، لذا يستثنيها `--hooks`؛ سمّها بأسمائها، أو استخدم `--profile strict`.

<div dir="ltr">

```bash
npx @ketecode/loom install --hook block-dangerous-commands,guard-secrets   # chosen hooks
npx @ketecode/loom install --hooks                           # everything, plus every hook not marked opt-in
npx @ketecode/loom uninstall --hook block-dangerous-commands
```

</div>

يسجّل المثبّت كل خطاف في Claude Code وفي كل بيئة مضيفة أخرى يجدها: في `settings.json` لكلٍّ من Claude Code وGemini CLI، وفي `kete.json` لـ Kete Code، وفي `hooks.json` لكلٍّ من Codex وCursor، وفي `~/.copilot/hooks/` لـ Copilot CLI، وكإضافة (plugin) في OpenCode. وهو يضيف ويزيل مدخلاته الخاصة فقط، وينسخ الملف احتياطيًا إلى `<file>.kete-loom-backup` قبل تغييره، ولا يعيد أبدًا كتابة ملف يحتوي على تعليقات (بل يطبع المقتطف لتلصقه بنفسك). لا يشغّل Codex خطافًا جديدًا إلا بعد أن تمنحه الثقة عبر `/hooks`. تُثبَّت الخطافات لمستخدمك فقط، لا لكل مشروع على حدة. ليس في Cursor خطاف يعمل قبل التعديل، وليس في OpenCode خطاف يضيف سياقًا عند بدء الجلسة، لذا تتجاوزهما الخطافات المعنية؛ أما الخطافات التي تعيد الوكيل إلى العمل عند انتهائه فتتجاوز Kete Code وOpenCode، لأن خطافات التوقف فيهما لا تستطيع ذلك. وخطافات Kiro جزء من إعدادات وكلائه، فلا تُثبَّت.

القائمة الكاملة موجودة في ملف README الإنجليزي: [Hooks](../../README.md#hooks)، وفي `catalog.json`.

## خوادم MCP

إعدادات منتقاة لخوادم MCP، تُسجَّل في كل بيئة مضيفة تستخدمها وبالصيغة الخاصة بها. لا يضع أيٌّ منها رمز وصول (token) في ملف إعدادات: فالخوادم البعيدة تسجّل الدخول عبر OAuth من خلال البيئة المضيفة (`/mcp` في Claude Code، و`codex mcp login`، و`kete mcp auth`…)، والخوادم المحلية لا تحتاج إلى أي أسرار. خوادم MCP اختيارية: لا يضيفها `install` أبدًا ما لم تسمّها.

<div dir="ltr">

```bash
npx @ketecode/loom install --mcp github,playwright          # chosen servers
npx @ketecode/loom install --profile mcp-web                # a pack: playwright, chrome-devtools, context7, fetch, exa, firecrawl
npx @ketecode/loom uninstall --mcp github
```

</div>

الحزم: `mcp-web`، و`mcp-code` (GitHub وGit وSentry، و`lsp` للتنقّل عبر خادم اللغة)، و`mcp-team` (Linear وNotion وAtlassian)، و`mcp-cloud` (Cloudflare وVercel وSupabase للقراءة فقط وStripe)، و`mcp-design` (Figma). تُضاف خوادم Claude Code عبر `claude mcp add-json --scope user` (أو `.mcp.json` مع `--project`)؛ ويحصل عليها Codex في كتلة مُعلَّمة داخل `config.toml`؛ أما Gemini CLI وCursor وCopilot CLI وOpenCode وKete Code ففي ملفات إعدادات MCP الخاصة بها. ولا يُستبدَل أبدًا خادم سبق أن أعددته بالاسم نفسه. يحصل Copilot CLI على الخوادم المحلية فقط، لأنه لا يملك طريقة موثّقة لتسجيل الدخول إلى الخوادم البعيدة.

القائمة الكاملة موجودة في ملف README الإنجليزي: [MCP servers](../../README.md#mcp-servers)، وفي `catalog.json`.

## الصيانة (Housekeeping)

<div dir="ltr">

```bash
npx @ketecode/loom@latest update      # refresh exactly what you installed, in the hosts it's in
npx @ketecode/loom outdated           # installed items older than the latest Kete Loom
npx @ketecode/loom audit              # score this project's readiness for coding agents, with fixes
npx @ketecode/loom check ./my-skills  # lint your own skills, agents, commands, rules or hooks
npx @ketecode/loom doctor             # what is installed where
npx @ketecode/loom doctor --fix       # repair the hook runtime and drop stale hook registrations
```

</div>

يفحص `audit` الأمور التي تجعل الوكلاء يعملون جيدًا في المستودع: تعليمات الوكيل (`AGENTS.md`/`CLAUDE.md`)، وحزم Kete Loom الخاصة بالتقنيات التي يكتشفها، وأوامر الاختبار والفحص (lint)، وCI، وخطافات الأمان، والتأكد من أن ملفات `.env` مُتجاهَلة وغير مُودَعة (committed). ويخرج برمز غير صفري عند فشل أي فحص، لذا يمكن تشغيله في CI.

داخل وكيلك، يعثر `/loom` على العناصر المناسبة لمهمة ما، ويحفظ `/checkpoint` لقطة قابلة للاستعادة دون إيداع (commit)، ويعرض `/sessions` ملاحظات التسليم (handoff notes) وينظّمها، ويكتب `/codemap` خريطة معمارية قصيرة، ويقترح `/model-route` مستوى النموذج، ويجيب `/aside` عن سؤال جانبي دون أن يُخرج المهمة عن مسارها. أما لإعداد وكيلك نفسه، فيفحص `/lint-agent-config` ملف AGENTS.md والمهارات (skills) والخطافات (hooks) وإعدادات MCP وملفات بيان الإضافات (plugin manifests) بحثًا عن إعدادات معطوبة أو خطرة، ويقارن `/rules-review` جلساتك الأخيرة بقواعدك ويقترح ما تضيفه أو تعيد صياغته أو تُلغيه، ويلخّص `/usage-report` استهلاك الرموز (tokens) والتكلفة من سجلات الجلسات المحلية.

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
| Kiro | `~/.kiro/skills` | `.kiro/skills` |

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
| Kiro | `~/.kiro/agents` | `~/.kiro/prompts` | عند وجود `~/.kiro` |

</div>

تستخدم عمليات التثبيت على مستوى المشروع (`--project`) المجلدات نفسها داخل المستودع (`.github/agents` لـ Copilot، و`.kete/` لـ Kete Code، و`.kiro/` لـ Kiro). وتصبح قواعد Kiro ملفات توجيه (steering files) في `~/.kiro/steering`، محصورة النطاق عبر `fileMatch`.

## المساهمة

اقرأ [`docs/SKILL_SPEC.md`](../../docs/SKILL_SPEC.md) (للمهارات والوكلاء والأوامر) و[`CONTRIBUTING.md`](../../CONTRIBUTING.md). يجب أن يجتاز كل طلب سحب (pull request) ما يلي:

<div dir="ltr">

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # trigger and behaviour eval file checks (CI also runs them live)
```

</div>

نوعان من اختبارات التقييم يحافظان على مصداقية العناصر:

- **اختبارات تقييم التفعيل (trigger evals)** (`evals/triggers.json`): يوجّه نموذجٌ موجّهاتٍ (prompts) واقعية وحالاتٍ قريبة من الحد كما تفعل البيئات المضيفة، ويجب أن يُختار كل عنصر لموجّهاته هو، ولها فقط.
- **اختبارات تقييم السلوك (behaviour evals)** (`evals/behavior.json`): سيناريوهات تضغط على الوكيل ليتخطى انضباط العنصر («رقّعها فحسب، سنطلق الإصدار خلال عشر دقائق»). يُشغَّل كلٌّ منها مع العنصر ودونه، ويقيّم نموذجٌ حَكَم كل رد، ويُظهر التقرير ما يضيفه العنصر. ويشغّلها `--host claude` كجلسات Claude Code حقيقية دون واجهة (headless).

<div dir="ltr">

```bash
npm run eval:live -- --skill my-skill                     # routing
npm run eval:behavior -- --live --skill my-skill          # behaviour, with and without the skill
```

</div>

ترشد المهارة `skill-authoring` وكيلك خطوة بخطوة لكتابة مهارة جديدة وفق هذا المعيار.

## الترخيص

MIT © Kete-org. راجع [LICENSE](../../LICENSE).

</div>
