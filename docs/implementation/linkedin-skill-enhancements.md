# LinkedIn skill enhancements

What was built from the LinkedIn agent skill review. Reference `add2c23` (MIT). Ideas were adapted and the text written for Kete Loom; no file, lexicon or rubric was copied.

## New

| Item | Files | What it does |
|---|---|---|
| `linkedin-content` skill 0.1.0 | `skills/linkedin-content/SKILL.md` (115 lines); `references/voice-profile.md`, `hooks.md`, `engagement.md`, `profile-rubric.md`, `planning.md`; `evals/triggers.json` (9 + 8); `evals/behavior.json` (4 scenarios) | Voice profile; job table; one true fact; sourced claims; three hooks; feed shape; checks; approval block; content log with statuses; comments; reply triage; profile rubric; plans, series and campaigns; post-mortem |
| `post-check.js` | `skills/linkedin-content/scripts/post-check.js` | Errors: over 3,000 characters for a post or 1,250 for a comment, unfilled `{{...}}` or `[...]`. Warnings: hook over ~140 characters, more than 3 hashtags, bait closers, long paragraphs, words banned by the voice profile. Notes: links in the body, length outside the common range. Exit 0, 1 or 2 |
| `post-metrics.js` | `skills/linkedin-content/scripts/post-metrics.js` | CSV (BOM, CRLF and quoted fields handled) → engagement rate, comment ratio, reach multiple (`--followers`), save rate; top and bottom by engagement rate; `--group` means with n; posts without impressions skipped and counted; refuses to call patterns under 10 posts; reports observed numbers only. Exit 0 or 2 |
| `prose-scan.js` | `skills/ai-prose-cleanup/scripts/prose-scan.js` | Counts by the skill's three tiers with line:column. Tier 1: assistant framing, placeholders, unsourced attributions, invisible format characters including Unicode tag characters. Tier 2: stock vocabulary, openers and closers, false contrasts, signposting, intensifiers. Tier 3: em dashes, curly quotes, ellipsis characters, odd spaces, uniform sentence length. `--strip-invisible`; exit 1 on any tier-1 hit |
| `/linkedin-post` 0.1.0 | `commands/linkedin-post.md` | The idea-to-approval workflow; never publishes |

## Enhanced

| Item | Version | Change |
|---|---|---|
| `ai-prose-cleanup` | 0.1.0 → 0.2.0 | Deterministic first pass with `scripts/prose-scan.js`; counts stated as prompts, not verdicts |
| `social-media-publishing` | 0.1.0 → 0.2.0 | Approval record and body hash required before queueing; audit trail and revocation; "Reading analytics" section; `references/platform-apis.md` gains verified `memberCreatorPostAnalytics` and `organizationalEntityShareStatistics` details and sources |
| `content-repurposing` | 0.1.0 → 0.1.1 | LinkedIn derivatives go through the voice profile and `post-check.js` |
| `brand-voice` | 0.1.0 → 0.1.1 | Hand-off to the personal voice profile for individuals |

## Documentation and configuration

- `README.md` and the eight translations: the `business` profile row mentions LinkedIn content; source hash `5fdefea7ddee`, none stale. Catalog regenerated (250 skills, 59 commands).
- Configuration: the voice profile template (`references/voice-profile.md`) is the example config; default paths are `~/.kete-loom/linkedin/{voice,log,plan}.md`, or a project path for a company page.
- `CLAUDE.md` / `AGENTS.md`: no change needed. The skill-script rule added in the UI/UX work already covers the new scripts.

## Dependencies

None. All three scripts use Node built-ins only and make no network calls.

## Deferred

- An optional LinkedIn API client as an MCP server. It needs the user's own approved app, and Kete Loom ships no credentials. Revisit if a user asks for in-app publishing.
- `.xlsx` input for `post-metrics.js`. LinkedIn exports Excel workbooks; reading XLSX without a dependency would need a ZIP and XML parser. Users save the per-post sheet as CSV for now.
- Live trigger and behaviour evals, which need an API key.
