# Planning and post-mortems

## Weekly or monthly plan

Inputs: the voice profile, the log (`~/.kete-loom/linkedin/log.md`), the last post-mortem if any, and what actually happened this week (a client conversation, a number, a mistake, something built). If the log is empty, ask for those four things and the 10-20 people or companies worth being visible to.

- **Rhythm the user can keep** beats an ambitious one; three or four posts a week is plenty for most people.
- **Mix types** and never put two of the same type back to back: proof, opinion, teach, story, offer (offer at most every other week).
- **Each slot gets an angle, not a topic:** "the proposal we lost because the draft read as generic", not "AI".
- **Themes:** three or four the user wants to be known for; an editorial series (a weekly teardown, a monthly numbers post) is a recurring slot with a fixed name.
- **Timing:** post when the audience works, in the audience's time zone. Treat any "best time" as a prior to test, not a rule; it matters far less than the hook. Use the user's own post-mortem data when there is enough of it.
- **Engagement list:** about ten names: people whose audience the user wants to reach, peers who reciprocate, and potential buyers (never pitched in comments). The user engages manually.
- **Campaigns:** a launch or event gets a short arc: problem → proof → offer → follow-up, spread over one to two weeks, with every post standing on its own.

Write the plan to `~/.kete-loom/linkedin/plan.md` (or the project path), as a table:

```
WEEK OF <date>   themes: <a, b, c>
| Day | Time (audience TZ) | Type | Angle | Hook pattern | Status |
|-----|-----|-----|-----|-----|-----|
| Tue | 08:15 | Proof | <angle> | before and after | idea |
ENGAGE: <names, split reach / peers / buyers>
```

Status values used in the plan and log: `idea` → `draft` → `approved` → `published` (or `dropped`). Only the user moves a post to `approved` or `published`. Nothing is scheduled or posted by this skill.

## Post-mortem

Inputs, in order of preference: the LinkedIn analytics export (Analytics → Content → Export; save the per-post sheet as CSV), numbers the user pastes, or, for an app the user built, the official API (`memberCreatorPostAnalytics` for a member's own posts, `organizationalEntityShareStatistics` for a page; see `social-media-publishing`). Never estimate numbers that weren't provided.

Run:

```bash
node <skill-dir>/scripts/post-metrics.js posts.csv --followers <n> --group hook --group format
```

Group columns come from the log or the user's own tagging (add `hook`, `format`, `theme` columns to the CSV). The script reports:

- **Engagement rate**: (reactions + comments + reposts) / impressions; whether a post earned its reach.
- **Comment ratio**: comments / reactions; whether it started a conversation.
- **Reach multiple**: impressions / followers; whether it travelled beyond the existing audience.
- Save rate when the export has saves.

It ranks by engagement rate (not impressions), shows top and bottom posts, and gives group means with n. Fewer than 10 posts: report numbers, draw no conclusions.

Then write findings in two clearly separated parts:

```
OBSERVED (from <source>, <n> posts, <date range>)
- <metric facts with n, copied from the script output>

RECOMMENDATIONS (judgement, test them)
- <what to do more or less of, each tied to an observed line and its n, with a confidence word>
```

Check timing last and only if format, hook and theme show nothing. Say plainly when the data shows no pattern. Feed the recommendations into the next plan.
