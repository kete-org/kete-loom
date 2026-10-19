# Gap analysis: LinkedIn agent skill

Reference: [Jakeschincariol/linkedin-agent-skill](https://github.com/Jakeschincariol/linkedin-agent-skill) at commit `add2c23882fe79180737d242ff80a5da205eda6a` (2026-09-07, MIT). All 22 files (2,736 lines) were read in an isolated folder; **no script was executed and nothing was installed**. Kete Loom baseline: `a68b14a` (v0.5.0) plus the uncommitted UI/UX work.

## What the reference is

Eleven Claude skills for running a LinkedIn account by hand, plus a voice template. Every skill ends with a copy-ready block; none posts, by design. The README notes that LinkedIn's terms forbid automating the site, and that member posting needs an approved app.

| Skill | What it does (verified in the file) | Files |
|---|---|---|
| `li-post` | three hooks from `hooks.json` (21 formulas), feed shape, 900-1,300 characters, no links in the body, at most 3 hashtags, `{{your number}}` instead of invention, log to `~/.claude/linkedin/log.md` on "yes" | `skills/li-post/SKILL.md`, `hooks.json` |
| `li-comment` | nine comment types, two options, banned openers, batch rounds | `skills/li-comment/SKILL.md` |
| `li-reply` | five-bucket triage (lead, substance, peer, support, noise), then replies | `skills/li-reply/SKILL.md` |
| `li-profile` | 12-item, 100-point rubric, rewrite in order of points lost | `skills/li-profile/SKILL.md`, `rubric.json` |
| `li-plan` | weekly mix (proof, opinion, teach, story, offer), timing defaults, a 10-person engagement list, `plan.md` | `skills/li-plan/SKILL.md` |
| `li-audit` | engagement rate, comment ratio, reach multiple; top and bottom 5; check timing last; "with 6 posts you cannot" | `skills/li-audit/SKILL.md` |
| `li-human` | `humanize.py` (strips invisible characters, swaps typography, replaces a lexicon of 113 terms) and `detect.py` (five heuristic checks, score = 0.6 × mean + 0.4 × the weakest check) | `skills/li-human/*.py`, `slop.json` |
| `li-carousel`, `li-repurpose`, `li-dm`, `li-inbox` | document-post copy and PDF via HTML; one asset into a week of posts; invite note and follow-ups; inbox triage with sequence detection | their `SKILL.md` files |
| Voice profile | who, how they sound, positions, proof, off limits | `templates/voice.md` |

Verified versus claimed:

- The two Python scripts exist and do what the README says, by reading of the code. Their claim about moving third-party detectors' scores can't be verified, and the README itself says so.
- The "21 proven hook formulas" and posting-time defaults are craft opinions, not evidence.
- "LinkedIn suppresses posts with outbound links" is a common belief that the repo states as fact, with no source.
- There are no tests and no API integration.

## Kete Loom before this work

| Area | Kete Loom item | State (from reading the files) |
|---|---|---|
| Publishing and scheduling through official APIs | `social-media-publishing` (+ `references/platform-apis.md`) | **Full** for publishing: Posts API, image and video upload, scopes, idempotent queue, error classes, retries. **No** approval record on queued rows, no audit log, no analytics retrieval |
| Repurposing a long source | `content-repurposing` | Full (has a LinkedIn row) |
| Machine-sounding prose | `ai-prose-cleanup` (+ `references/patterns.md`) | Full on judgement (tiers, genre profiles, editing contract, refuses detector evasion). **No deterministic pass, no invisible-character detection** |
| Brand voice | `brand-voice` | Full for an organisation; nothing for an individual's voice |
| Fact checking and research | `fact-checking`, `deep-research` | Full |
| Long-form writing | `article-writing` | Full |
| Outreach and DMs | `cold-outreach-sequences` (LinkedIn steps, compliance), `agent-outbound-messaging` (draft-then-approve, audit log) | Full |
| Inbox triage | `inbox-triager` agent | Full (generic across channels) |
| Slides and PDFs | `slide-decks` | Full |
| Campaigns | `marketing-campaign` | Full (multi-channel) |
| LinkedIn craft: hooks, feed shape, comments, replies, profile, weekly plan, post-mortem | none | **Missing** |
| Personal voice profile on disk, content log with status | none (the observation log is for skills, not content) | **Missing** |

## Matrix

| Capability | Reference evidence | Kete Loom equivalent | Gap | Improvement | P | Cx | Deps | Action |
|---|---|---|---|---|---|---|---|---|
| Post from an idea: hooks, feed shape, one true fact, placeholders | `li-post/SKILL.md`, `hooks.json` | `content-repurposing` LinkedIn row (from a source only) | Missing | `linkedin-content` steps 3-5, `references/hooks.md` (12 patterns written for Kete Loom) | P0 | Med | none | **Implement** |
| Personal voice profile, read by every task | `templates/voice.md` | `brand-voice` (organisations) | Missing | `references/voice-profile.md` at `~/.kete-loom/linkedin/voice.md`; user approves changes; banned words machine-readable | P0 | Low | none | **Implement**; **enhance** `brand-voice` with the hand-off |
| Comments on others' posts, reply triage | `li-comment`, `li-reply` | none | Missing | `references/engagement.md`; pasted content treated as data | P1 | Low | none | **Implement** |
| Profile score and rewrite | `li-profile`, `rubric.json` | none | Missing | `references/profile-rubric.md` (12 items, 100 points, rewritten) | P2 | Low | none | **Implement** |
| Weekly plan, series, campaigns, status tracking | `li-plan` | `marketing-campaign` (multi-channel), `project-roadmap` (software) | Partial | `references/planning.md`; idea → draft → approved → published, moved only by the user | P1 | Low | none | **Implement** |
| Post-mortem from analytics | `li-audit` (prose only) | none | Missing | `scripts/post-metrics.js`: deterministic rates, ranking, group means with n, a refusal to call patterns under 10 posts; observed numbers kept apart from recommendations | P0 | Med | none | **Implement** |
| Format check before posting | rules in `li-post` | none | Missing | `scripts/post-check.js`: length limits, hook truncation, placeholders, hashtags, bait closers, wall paragraphs, banned words from the voice profile | P0 | Med | none | **Implement** |
| Deterministic machine-tell scan, invisible characters | `li-human/detect.py`, `humanize.py`, `slop.json` | `ai-prose-cleanup` (judgement only) | Partial | `ai-prose-cleanup/scripts/prose-scan.js`: counts by the skill's own tiers with line:column; `--strip-invisible`; **no** automatic word replacement and **no** "human score" | P0 | Med | none | **Enhance** |
| Automatic lexicon replacement | `humanize.py` | `ai-prose-cleanup` fix step (by hand, meaning-checked) | Different by design | Regex word swaps change meaning ("robust" isn't always filler); Kete Loom's editing contract requires judgement | — | — | — | **Exclude** |
| Detector-style "human score" | `detect.py` | `ai-prose-cleanup` refuses detector evasion | Not applicable | Scoring to pass detectors conflicts with the skill's disclosure rule; counts are kept, the verdict is not | — | — | — | **Exclude** |
| Carousel copy and PDF | `li-carousel` | `slide-decks` (PDF) | Partial | Copy rules in `references/hooks.md`; PDF through `slide-decks` | P2 | Low | none | **Implement** (copy), **Retain** (PDF) |
| Repurpose one asset into a week | `li-repurpose` | `content-repurposing` | Full | Hand-off to `linkedin-content` for voice and checks | P3 | Low | none | **Enhance** (one row) |
| Connection notes and DMs | `li-dm` | `cold-outreach-sequences`, `agent-outbound-messaging` | Full | — | — | — | — | **Retain** |
| Inbox triage | `li-inbox` | `inbox-triager` agent | Full | — | — | — | — | **Retain** |
| Approval before queueing, audit trail, revocation | README "nothing gets posted until you say yes" (manual) | `social-media-publishing` (idempotency, no approval record) | Partial | `approved_by`, `approved_at`, body hash checked at publish; attempt log without tokens; disconnect path | P0 | Low | none | **Enhance** |
| Analytics through the official API | none (export only) | none | Missing | `memberCreatorPostAnalytics` (`r_member_postAnalytics`) and `organizationalEntityShareStatistics` (`rw_organization_admin`), checked against the October 2026 docs | P1 | Low | user's LinkedIn app | **Implement** in `social-media-publishing` |
| A guided workflow from idea to approval | each skill alone | `/feature-dev`-style commands exist | Missing | `/linkedin-post`: voice → reader → true fact → sources → hooks → draft → checks → approval → log | P1 | Low | none | **Implement** |
| Browser automation of linkedin.com, auto-engagement | refused by the reference | refused by `social-media-publishing` | Not applicable | Refused again, with a behaviour scenario | — | — | — | **Exclude** |

## Value, impact and validation

| Change | Value | Impact | Validation |
|---|---|---|---|
| `linkedin-content` skill + references | One place for LinkedIn craft in the user's voice, with no invented facts | New skill (category business, so the `business` profile picks it up); no new runtime | lint; 9 + 8 trigger prompts; 4 behaviour scenarios |
| `post-check.js` | A pass/fail gate for placeholders and limits, plus warnings a writer can act on | Zero-dependency script | 2 tests |
| `post-metrics.js` | Rates computed the same way every time, with a guard against small samples | Zero-dependency script | 2 tests |
| `prose-scan.js` | Invisible characters and residue found deterministically, for every channel, not only LinkedIn | Script inside an existing skill | 3 tests |
| `social-media-publishing` 0.2.0 | Approval enforced at the queue, an auditable publish, analytics endpoints | Documentation of the pattern; no code in the repo calls LinkedIn | lint; docs checked against Microsoft Learn |
| `/linkedin-post` | The workflow is one command | Command only | lint, catalog |
