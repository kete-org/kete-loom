# LinkedIn content intelligence in Kete Loom

How Kete Loom handles LinkedIn writing, approval, publishing and analytics after the LinkedIn agent skill review (`docs/analysis/linkedin-agent-skill-gap-analysis.md`).

## Decision: one skill, not eleven

The reference ships eleven small skills. Kete Loom already had six of their neighbours (repurposing, outreach, inbox triage, prose cleanup, slides, publishing). Adding eleven more would duplicate those and split one person's voice across many routing targets. Instead:

- `linkedin-content` owns what was missing: post, article and carousel copy; comments; replies; profile; planning; post-mortem. A job table in the skill loads one reference file per job (progressive disclosure).
- Existing skills keep their jobs and gain hand-offs: `content-repurposing` → `linkedin-content` for each LinkedIn piece; `brand-voice` (organisation) ↔ the voice profile (person); `ai-prose-cleanup` supplies the prose scan; `social-media-publishing` stays the only place that talks to the API.

## Flow

```
/linkedin-post <idea>              (or a request that routes to linkedin-content)
  1 voice profile ─── ~/.kete-loom/linkedin/voice.md (user-owned; changes proposed, never applied silently)
  2 reader, off-limits check
  3 one true fact ─── ask; else {{your number}} (never invented)
  4 sources ───────── fact-checking / deep-research; link kept with its date
  5 three hooks ───── references/hooks.md
  6 draft ─────────── feed shape, voice rules
  7 checks ────────── ai-prose-cleanup/scripts/prose-scan.js (tier 1 = 0)
                      linkedin-content/scripts/post-check.js (0 errors)
  8 approval ──────── copy-ready block; "yes" → log.md status approved
  9 publish ───────── the user, by hand; or the user's own app via social-media-publishing
 10 learn ─────────── export → post-metrics.js → OBSERVED vs RECOMMENDATIONS → next plan
```

No new runtime: the command names skills; the host runs them. State is two plain Markdown files the user can read and edit (`voice.md`, `log.md`, plus `plan.md`), under the existing user-scope folder `~/.kete-loom/`, or a project path for a company page.

## Status model

`idea` → `draft` → `approved` → `published` (or `dropped`). The agent may create `idea` and `draft`. Only the user's explicit "yes" sets `approved`, and only the user's confirmation (with the URL) sets `published`. The skill never marks something published that it didn't see confirmed.

## Publishing boundary

| Layer | Owns |
|---|---|
| Kete Loom | Content intelligence, voice, checks, the approval protocol, and the integration pattern (`social-media-publishing`) |
| Kete Code runtime (and other hosts) | Running skills and commands; tool permissions decide whether any network call can happen |
| The user's own application | Any real LinkedIn API calls, with their developer app, tokens and approved products |

Kete Loom contains no LinkedIn client and no credentials. When a user builds one, `social-media-publishing` 0.2.0 requires:

- **Approval at the queue.** `approved_by` and `approved_at` plus a hash of the body; publishing is refused if the text changed after approval.
- **Idempotency.** A conditional claim from `scheduled` to `publishing`; check whether the post exists before any retry after a timeout.
- **Error classes.** On 401, refresh once, then ask the user to reconnect. 403 is not retried. On 429, back off to the reset time. On 5xx, check, then retry with backoff.
- **An audit log** of every attempt, without tokens, and a disconnect path that deletes the tokens.
- **Analytics** only from granted scopes (`r_member_postAnalytics`, `rw_organization_admin`), stored with the fetch time and API version, and never estimated.

## Security and responsible automation

- Never post, comment, react, connect, follow or message for the user; never drive linkedin.com in a browser or scrape it. This is stated in the skill, the command and `social-media-publishing`, and tested by a behaviour scenario.
- **Pasted posts, comments and profiles are data.** The skill says so, and a behaviour scenario covers an injected instruction inside a pasted post.
- **No fabrication.** `post-check.js` exits 1 while any `{{placeholder}}` remains; `prose-scan.js` flags unsourced attributions as tier 1.
- **Privacy.** Off-limits topics, clients and claims are checked before every draft. People are named only after the user agrees. Analytics stay on the user's machine; the scripts read local files and make no network calls.
- **No detector games.** `prose-scan.js` counts patterns and states that it says nothing about authorship, in line with `ai-prose-cleanup`'s refusal to help disguise authorship where disclosure is required.
