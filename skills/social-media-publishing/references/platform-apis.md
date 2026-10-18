# Platform API shapes

Request shapes for the common publish paths. Check each platform's docs for the current API version, access tier and limits before relying on these.

## X (docs.x.com)

Auth: OAuth 2.0 authorization code with PKCE, user-context token in `Authorization: Bearer`. `POST /2/tweets` accepts only user-context tokens (OAuth 2.0 user token with `tweet.read`, `users.read`, `tweet.write`, or OAuth 1.0a user token); app-only tokens cannot post. Without `offline.access` the token lasts two hours and no refresh token is issued.

Chunked media upload:

```
POST https://api.x.com/2/media/upload/initialize
{ "media_type": "video/mp4", "total_bytes": 10485760, "media_category": "tweet_video" }
-> { "data": { "id": "<media_id>", ... } }

POST https://api.x.com/2/media/upload/<media_id>/append      (multipart: segment_index, media)
POST https://api.x.com/2/media/upload/<media_id>/finalize
GET  https://api.x.com/2/media/upload?command=STATUS&media_id=<media_id>
     repeat after processing_info.check_after_secs until state is "succeeded"
```

- Do not send `command=INIT|APPEND|FINALIZE` to `POST /2/media/upload`; that is the previous protocol.
- Keep each chunk at or under 5 MB (the server maximum is 8 MB). `media_category` values include `tweet_image`, `tweet_gif`, `tweet_video`, `amplify_video`, `dm_image`, `dm_gif`, `dm_video`, `subtitles`. Status states are `pending`, `in_progress`, `succeeded`, `failed`. Size and duration limits depend on the user's account type.

Create the post:

```
POST https://api.x.com/2/tweets
{ "text": "Shipping today", "media": { "media_ids": ["<media_id>"] } }
```

`media_ids` takes 1 to 4 IDs.

Threads: post the first, then each next post with `"reply": { "in_reply_to_tweet_id": "<previous id>" }`.

Access tiers and pricing change; confirm in the developer console which endpoints and volumes the user's plan includes.

## LinkedIn (learn.microsoft.com/linkedin)

Every versioned call sends `Linkedin-Version: YYYYMM` and `X-Restli-Protocol-Version: 2.0.0`. Versions are released monthly and supported for at least one year before sunset; a sunset or missing version returns an error, so keep the header current.

Image:

```
POST https://api.linkedin.com/rest/images?action=initializeUpload
{ "initializeUploadRequest": { "owner": "urn:li:organization:123" } }
-> { "value": { "uploadUrl": "https://www.linkedin.com/dms-uploads/...", "image": "urn:li:image:C4E..." } }

PUT <uploadUrl>   (raw bytes, Authorization header)
GET https://api.linkedin.com/rest/images/urn:li:image:C4E...   until status is AVAILABLE
```

Video: `POST /rest/videos?action=initializeUpload` with `owner` and `fileSizeBytes` returns `uploadInstructions` (one upload URL per 4 MB byte range) and an `uploadToken`. PUT each part and keep the `ETag` response header, then `POST /rest/videos?action=finalizeUpload` with `video`, `uploadToken` and `uploadedPartIds` (the ETags, in part order). Poll `GET /rest/videos/{urn}` until status is `AVAILABLE`.

Post:

```
POST https://api.linkedin.com/rest/posts
{
  "author": "urn:li:organization:123",
  "commentary": "Text of the post",
  "visibility": "PUBLIC",
  "distribution": { "feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": [] },
  "content": { "media": { "id": "urn:li:image:C4E...", "altText": "Describe the image" } },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
-> 201, post URN in the x-restli-id response header
```

- Member posts: `w_member_social`, author `urn:li:person:<sub from /v2/userinfo>`.
- Company posts: `w_organization_social`, and the member must hold the ADMINISTRATOR, CONTENT_ADMIN or DIRECT_SPONSORED_CONTENT_POSTER role on the page.
- LinkedIn Help gives 3,000 characters as the post limit; the API returns `FIELD_LENGTH_TOO_LONG` when `commentary` is over its maximum. `commentary` uses LinkedIn's "little text" format: escape the reserved characters `| { } @ [ ] ( ) < > # \ * _ ~` with a backslash whenever they are plain text rather than mention or hashtag syntax. Mentions are `@[Name](urn:li:organization:123)`; the name must match the entity's name.
- `ugcPosts` is legacy (the Posts API replaces it); use `/rest/posts`.

## Facebook Page (developers.facebook.com, Graph API)

Use a Page access token for a Page the user manages. Facebook Login requests `pages_manage_engagement`, `pages_manage_posts`, `pages_read_engagement` and `pages_read_user_engagement`, plus `publish_video` for video.

```
POST https://graph.facebook.com/<version>/<page-id>/feed
  message=...&link=https://...
POST https://graph.facebook.com/<version>/<page-id>/photos
  url=https://.../image.jpg&caption=...
Scheduled: add published=false&scheduled_publish_time=<unix time>   (10 minutes to 30 days from the request)
```

Pin a Graph API version in the URL (`v<major>.0`) and upgrade before Meta retires it.

## Instagram professional account

```
POST https://graph.facebook.com/<version>/<ig-user-id>/media          (Facebook Login)
POST https://graph.instagram.com/<version>/<ig-user-id>/media         (Instagram Login)
  image_url=https://public.example.com/a.jpg&caption=...
  or media_type=REELS&video_url=...
  or media_type=CAROUSEL with children=<up to 10 container ids>
-> { "id": "<container id>" }

GET  .../<container id>?fields=status_code     IN_PROGRESS -> FINISHED (or ERROR; EXPIRED if not published within 24 hours)
POST .../<ig-user-id>/media_publish   creation_id=<container id>
GET  .../<ig-user-id>/content_publishing_limit   current usage against the 24-hour cap
```

- Media must be at a publicly reachable HTTPS URL; Meta fetches it.
- There is a rolling 24-hour cap on API-published posts per account (carousels count as one). Meta's pages have stated different numbers over time; read `content_publishing_limit` instead of hard-coding it.
- The API requires an Instagram professional (business or creator) account; personal accounts are not supported.
- Captions: at most 2,200 characters, 30 hashtags and 20 @ tags.
- Permissions: `instagram_business_basic` and `instagram_business_content_publish` (Instagram Login, `graph.instagram.com`), or `instagram_basic`, `instagram_content_publish` and `pages_read_engagement` (Facebook Login, `graph.facebook.com`).

## Sources

- X chunked upload: https://docs.x.com/x-api/media/quickstart/media-upload-chunked . Create post: https://docs.x.com/x-api/posts/create-post . Scopes: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code . Character counting: https://docs.x.com/fundamentals/counting-characters
- LinkedIn Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api . little text: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format . Videos: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api . Versioning: https://learn.microsoft.com/en-us/linkedin/marketing/versioning . Post length: https://www.linkedin.com/help/linkedin/answer/a528176
- Facebook Pages posts: https://developers.facebook.com/docs/pages-api/posts
- Instagram publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing . Media reference (caption limits): https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
