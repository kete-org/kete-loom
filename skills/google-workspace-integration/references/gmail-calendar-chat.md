# Gmail, Calendar and Chat reference notes

Read this when writing Gmail, Calendar or Chat calls. Names come from the Gmail v1, Calendar v3 and Chat v1 REST references; confirm against developers.google.com/workspace if a call is rejected. Scope prefix `https://www.googleapis.com/auth/` unless shown in full.

## Scopes: pick the narrowest row that covers the feature

| Feature | Scope | Classification |
|---|---|---|
| Send mail only, no reading | `gmail.send` | sensitive |
| Create, update and send drafts | `gmail.compose` | restricted |
| Read and search mail | `gmail.readonly` | restricted |
| Read, label, archive, trash | `gmail.modify` | restricted |
| Headers and labels only (no `q` search, no bodies) | `gmail.metadata` | restricted |
| Create and edit labels themselves | `gmail.labels` | non-sensitive |
| Permanent delete bypassing trash | `https://mail.google.com/` | restricted; avoid |
| Check availability | `calendar.freebusy` (own calendars) or `calendar.events.freebusy` (calendars you can access) | check consent screen |
| Create events on calendars the user owns | `calendar.events.owned` | check consent screen |
| Events only on calendars the app creates | `calendar.app.created` | check consent screen |
| Chat app posts as itself | `chat.bot` (service account only) | non-sensitive |
| Post as the signed-in user | `chat.messages.create` | sensitive |
| Read messages as the user | `chat.messages.readonly` | restricted |
| App reads messages without a user | `chat.app.messages.readonly` | restricted; needs one-time admin approval |

Restricted Gmail and Chat scopes in a public app trigger Google's restricted-scope verification and possibly a security assessment. The Calendar docs don't publish a classification per scope; the consent-screen configuration shows it when you add the scope.

## Gmail

Draft, then send after approval:

```http
POST /gmail/v1/users/me/drafts
{ "message": { "raw": "<base64url RFC 2822 message>", "threadId": "<thread, for a reply>" } }

POST /gmail/v1/users/me/drafts/send
{ "id": "<draft id>" }
```

- Build the MIME message with a library (Node `nodemailer`'s MailComposer, Python `email.message.EmailMessage`), never by string concatenation of user input into headers (header injection via `\r\n`).
- Replies stay in the thread when `threadId` is set, `Subject` matches, and `In-Reply-To` and `References` carry the original `Message-ID`.
- `messages.list?q=...` uses Gmail search-box syntax, space means AND:

```
from:billing@example.com has:attachment newer_than:7d
subject:(invoice OR receipt) -label:processed
in:inbox is:unread after:2026/10/01 before:2026/10/08
```

- `maxResults` defaults to 100, at most 500; page with `pageToken`. List calls return IDs only; fetch with `messages.get?format=metadata&metadataHeaders=Subject&metadataHeaders=From` when you don't need bodies.
- Labels: create once with `labels.create`, cache the label ID, then `messages.modify` with `addLabelIds`/`removeLabelIds` (up to 100 each) or `messages.batchModify` for many messages.
- For new mail, prefer `users.watch` (Cloud Pub/Sub push) plus `history.list` from the saved `historyId` over polling `messages.list`. Renew the watch before it expires.

## Calendar

```http
POST /calendar/v3/freeBusy
{ "timeMin": "2026-10-20T09:00:00Z", "timeMax": "2026-10-20T17:00:00Z",
  "timeZone": "Africa/Accra", "items": [ { "id": "ama@example.com" }, { "id": "primary" } ] }

POST /calendar/v3/calendars/primary/events?sendUpdates=none
{ "summary": "Contract review",
  "start": { "dateTime": "2026-10-20T14:00:00", "timeZone": "Africa/Accra" },
  "end":   { "dateTime": "2026-10-20T14:30:00", "timeZone": "Africa/Accra" },
  "attendees": [ { "email": "ama@example.com" } ] }
```

- `freeBusy` returns busy intervals per calendar, plus `errors` for calendars you can't see; treat an error as unknown, not free.
- `start`/`end`: `dateTime` with an offset or a `timeZone` (IANA name); `date` (`yyyy-mm-dd`) for all-day events, end date exclusive. Recurring events need `timeZone` and an `RRULE` in `recurrence`.
- `sendUpdates`: `all`, `externalOnly` or `none`. Use `none` in tests; switch to `all` only when the user approves invitations.
- Video meetings: `conferenceDataVersion=1` with `conferenceData.createRequest` and a unique `requestId`.
- Idempotency: set your own event `id` (lowercase `a`-`v` and `0`-`9` only, 5 to 1024 characters, unique per calendar; a UUID without hyphens, lowercased, fits) so a retried insert is rejected as a duplicate instead of creating a second event.

## Chat

```http
POST https://chat.googleapis.com/v1/spaces/<SPACE_ID>/messages
{ "text": "Build 412 passed. <https://ci.example.com/412|Details>" }
```

- App authentication (`chat.bot`, service account): the app must be added to the space first. User authentication (`chat.messages.create`): the message appears as that user.
- Both need the Google Chat API enabled and the Chat app configured (name, icon, description) in the Cloud console, and a Business or Enterprise Workspace account.
- For one-way notifications into a single space, an incoming webhook URL from the space settings is simpler than an app; treat that URL as a secret.
- Set a custom `messageId` on create (starts with `client-`, lowercase letters, digits and hyphens, up to 63 characters, unique in the space) so you can update or delete the message later without storing the server ID. Before retrying a failed create, check whether that ID already exists in the space.
