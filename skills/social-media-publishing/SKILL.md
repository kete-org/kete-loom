---
name: social-media-publishing
description: Posts text, images and video to X, LinkedIn, Facebook Pages and Instagram through their official APIs, covering OAuth app setup and token refresh, the scopes each platform needs, media upload flows, rate and publishing limits, queued scheduling with retries, and per-platform length and formatting rules. Use when building or fixing code that publishes or schedules social posts programmatically, a post or media upload call fails with a 401, 403 or rate-limit error, or one message must be formatted correctly for several networks.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to api.x.com, api.linkedin.com and graph.facebook.com, and developer apps the user owns on each platform. Examples are plain HTTP; the rules apply to any SDK.
metadata:
  kete-loom/version: "0.2.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Social media publishing

Publish to social networks through official APIs only, with tokens stored safely, media uploaded the way each platform expects, every post idempotent, and failures retried without double-posting.

## Ground rules

1. **Official APIs only.** No browser automation, scraped endpoints or shared passwords; they break platform terms and get accounts banned.
2. **The user owns the developer apps.** Each platform needs an app the user registers and, for some scopes, gets approved (LinkedIn's Community Management API for company pages, Meta App Review for Page and Instagram publishing). **Stop and ask the user** for app IDs and which accounts to post as; never invent them.
3. **Tokens are secrets.** Store access and refresh tokens encrypted server-side, per connected account, with their expiry and granted scopes. Never log them or send them to the browser.
4. **Request the least scope** that the feature needs (table below).
5. **Media first, then the post.** Every platform uploads or registers media in a separate step and returns an ID or container that the post references. Wait until processing finishes before posting.
6. **Approved, then idempotent.** A post reaches the queue only after a named person approves that exact text and media: store `approved_by`, `approved_at` and a hash of the body, and refuse to publish if the body changed after approval. Write a `scheduled_posts` row (account, platform, body, media, `publish_at`, status) before calling the API; mark `publishing` with a conditional update, store the returned post ID, and never retry a call that may have succeeded without first checking whether the post exists.
7. **Respect rate limits.** Read the platform's rate-limit headers or usage endpoint, back off on `429`, and spread scheduled posts instead of firing them all at the top of the hour.
8. **Read the current docs.** These APIs, their access tiers and pricing change often. Check the version and limits in the official docs before stating them; details in `references/platform-apis.md`.

## Platform map

| Platform | Auth | Post endpoint | Media | Scopes / permissions |
|---|---|---|---|---|
| X | OAuth 2.0 with PKCE, user context | `POST https://api.x.com/2/tweets` | `POST /2/media/upload/initialize`, `/{id}/append`, `/{id}/finalize`, then poll status | `tweet.read`, `tweet.write`, `users.read`, `media.write`, `offline.access` for refresh |
| LinkedIn | OAuth 2.0 three-legged | `POST https://api.linkedin.com/rest/posts` with `Linkedin-Version: YYYYMM` and `X-Restli-Protocol-Version: 2.0.0` | `POST /rest/images?action=initializeUpload`, PUT bytes to `uploadUrl`, use the `urn:li:image:...` | `w_member_social` (member), `w_organization_social` (company page; member needs the ADMINISTRATOR, CONTENT_ADMIN or DIRECT_SPONSORED_CONTENT_POSTER page role) |
| Facebook Page | Facebook Login, Page access token | `POST /{page-id}/feed` (text, link) or `/{page-id}/photos`, `/{page-id}/videos` | in the same call by URL or upload | `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `pages_read_user_engagement`; add `publish_video` for video |
| Instagram (professional account) | Instagram Login or Facebook Login | `POST /{ig-user-id}/media` creates a container, then `POST /{ig-user-id}/media_publish` | media fetched by Meta from a public `image_url` / `video_url` | `instagram_business_basic` + `instagram_business_content_publish` (Instagram Login), or `instagram_basic` + `instagram_content_publish` + `pages_read_engagement` (Facebook Login) |

## Build steps

1. **Connect accounts.** Implement the OAuth authorization-code flow per platform with a `state` value checked on return (and PKCE for X). Save tokens, expiry, scopes and the account's ID or URN (`urn:li:person:...` from LinkedIn's OpenID `userinfo` `sub`, `urn:li:organization:...` for pages, the Page ID, the IG user ID).
2. **Refresh before expiry.** A job refreshes tokens ahead of `expires_at`. When refresh fails (revoked, password changed, scope removed), mark the account `needs_reconnect` and tell the user; do not keep retrying.
3. **Format per platform** using the rules below. Validate length and media count before queueing, not at publish time.
4. **Upload media.** X: chunked upload (keep chunks at or under 5 MB), then poll status until `processing_info.state` is `succeeded`. LinkedIn: `initializeUpload`, PUT the file, wait until the image or video is `AVAILABLE`. Instagram: host the file at a public HTTPS URL, create the container, poll `status_code` until `FINISHED` (about once a minute, at most 5 minutes) before `media_publish`.
5. **Publish** from a worker that picks due rows, claims them with `UPDATE ... SET status='publishing' WHERE id=? AND status='scheduled'`, calls the API, then stores the platform post ID and URL.
6. **Handle errors** by class: `401` refresh once then mark reconnect; `403` missing scope, role or tier (do not retry); `429` back off using the reset header; `5xx` or timeout check whether the post exists, then retry with backoff. Record the platform's error body.
7. **Audit trail.** Log every attempt (post ID, account, approver, request time, platform response code, platform post ID or error body), without tokens. Keep a way to revoke a connected account: delete its tokens and mark it `disconnected`.
8. **Scheduling.** Store `publish_at` in UTC with the user's time zone for display. Native scheduling exists on some platforms (Facebook Pages accept `published=false` with `scheduled_publish_time`, 10 minutes to 30 days ahead), but a single queue of your own keeps behaviour the same everywhere.

## Reading analytics

Only from what the user's app is granted; never estimate missing numbers.

- **LinkedIn member posts:** `GET /rest/memberCreatorPostAnalytics?q=entity&entity=(share:{urn})&queryType=IMPRESSION` (or `(ugc:{urn})`), one `queryType` per call (`IMPRESSION`, `MEMBERS_REACHED`, `REACTION`, `COMMENT`, `RESHARE`; newer versions add `POST_SAVE`, `POST_SEND`, `LINK_CLICKS` and others), `aggregation=TOTAL|DAILY`; `q=me` aggregates all the member's posts. Needs `r_member_postAnalytics`.
- **LinkedIn company pages:** `GET /rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity={org urn}` (add `shares=List(...)` for specific posts, or `timeIntervals` for day or month buckets; rolling 12 months only). Needs `rw_organization_admin` and the ADMINISTRATOR page role. Organic only.
- Store metrics with the time they were fetched and the API version; counts are best-effort and change over time. Details in `references/platform-apis.md`.

## Formatting differences

| | X | LinkedIn | Facebook Page | Instagram |
|---|---|---|---|---|
| Text length | 280 weighted characters (emoji and CJK count as 2); any URL counts as 23 | 3,000 characters | long posts allowed; first lines show before "See more" | caption up to 2,200 characters |
| Links | inline, shortened by t.co | inline; link preview via article content | link preview from the `link` field | not clickable in captions |
| Hashtags | 1 or 2 (style choice) | a few at the end (style choice) | sparing | at most 30 per caption |
| Mentions | `@handle` in text | `@` + `[Name]` + `(urn)` mention syntax in the commentary; name must match | Page tags need IDs | `@handle` in caption, at most 20 |
| Media | up to 4 media IDs per post | images, video, documents, multi-image | photos, video | required: image, video, reel, or carousel of up to 10 |

Confirm current limits in each platform's docs before enforcing them in code.

## Stop and ask the user

- Which accounts and pages to post as, and who approved posting on their behalf.
- Before applying for elevated access or a paid API tier.
- Before posting anything live during development: use a test account, private visibility, or draft state where the platform offers one.
- Before deleting or editing published posts in bulk.

## Never

- Post the same text to every network unchanged when it breaks a platform's length or mention rules.
- Automate likes, follows, replies or DMs at scale; platform rules forbid most of it.
- Store tokens in the client, or share one token across customers.
- Retry a publish blindly after a timeout.

## Report format

When reviewing or finishing an integration, report:

```
Platforms: ...                 Accounts: member / page / IG professional
Auth: flow, scopes granted, refresh handled yes|no
Media: upload path and processing wait per platform
Queue: idempotent claim yes|no, retry policy, timezone handling
Gaps: ... (each with the fix)
Needs user action: app review, tier, page roles
```
