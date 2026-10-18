# Google Workspace API reference notes

Read this when writing Drive queries, Sheets ranges or batchUpdate bodies. Field names come from the v3 Drive, v4 Sheets, v1 Docs and v1 Slides REST references; confirm against developers.google.com/workspace if a call is rejected.

## Scopes (prefix `https://www.googleapis.com/auth/`)

| Scope | Classification | Grants |
|---|---|---|
| `drive.file` | non-sensitive | files the app created or the user opened with it (Picker) |
| `drive.appdata` | non-sensitive | the app's hidden config folder |
| `drive.readonly` | restricted | read every Drive file |
| `drive` | restricted | read and write every Drive file |
| `drive.metadata.readonly` | restricted | metadata of every file |
| `spreadsheets.readonly` / `spreadsheets` | sensitive | all of the user's Sheets |
| `documents.readonly` / `documents` | sensitive | all of the user's Docs |
| `presentations.readonly` / `presentations` | sensitive | all of the user's Slides |

## Drive `files.list` queries (`q`)

```
'FOLDER_ID' in parents and trashed = false
mimeType = 'application/vnd.google-apps.spreadsheet'
name contains 'Invoice' and modifiedTime > '2026-01-01T00:00:00'
appProperties has { key='orderId' and value='A123' }
```

Escape a `'` inside a value as `\'`. Combine with `and`, `or`, `not`.

Common params: `fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime)`, `pageSize` (up to 1000), `pageToken`, `orderBy=modifiedTime desc`, `supportsAllDrives=true`, `includeItemsFromAllDrives=true`, `corpora=drive&driveId=...` for one shared drive.

Native MIME types: `application/vnd.google-apps.document`, `.spreadsheet`, `.presentation`, `.folder`. Export targets include `application/pdf`, `text/csv` (first sheet only), `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

Upload: `uploadType=media` for small content-only uploads, `multipart` for content plus metadata, `resumable` for large files or unreliable networks.

## Drive quotas (projects created on or after 1 May 2026)

Per-unit: 1,000,000 units per minute per project, 325,000 per minute per user per project. Costs: read 5, list 100, download 200, edit 50, other (e.g. `files.generateIds`) 5. Usage above 400,000,000 units per project per day may be billed, so prefer `changes.list` over repeated full `files.list` scans. 750 GB per user per day of uploads and copies across My Drive and shared drives. Projects that used the API between November 2025 and April 2026 keep their previous quotas. Errors: `403 userRateLimitExceeded`, `429`.

## Sheets

Quota: 300 read and 300 write requests per minute per project, 60 per minute per user per project; a batch counts as one request. Recommended payload under 2 MB; a request times out after 180 s.

A1 notation:

| Range | Meaning |
|---|---|
| `Sheet1!A1:C10` | block on Sheet1 |
| `'Q3 Sales'!A:A` | whole column; quote titles with spaces or symbols, double any `'` inside |
| `Sheet1!2:2` | whole row 2 |
| `Sheet1!A5:C` | columns A-C from row 5 down |
| `Sheet1` | whole sheet |
| `A1:B2` | first visible sheet (avoid; be explicit) |

Values calls:

```http
PUT /v4/spreadsheets/{id}/values/'Orders'!A2:C2?valueInputOption=RAW
{ "values": [["A123", 4999, "paid"]] }

POST /v4/spreadsheets/{id}/values/Orders!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS
{ "values": [["A124", 1500, "pending"]] }

POST /v4/spreadsheets/{id}/values:batchUpdate
{ "valueInputOption": "USER_ENTERED", "data": [ { "range": "Summary!B1", "values": [["=SUM(Orders!B:B)"]] } ] }
```

`valueRenderOption`: `FORMATTED_VALUE` (default, display strings), `UNFORMATTED_VALUE`, `FORMULA`. `dateTimeRenderOption`: `SERIAL_NUMBER` (default) or `FORMATTED_STRING`, only when not `FORMATTED_VALUE`.

Structure changes use `spreadsheets.batchUpdate` with requests such as `addSheet`, `repeatCell` (with a `GridRange` of `sheetId`, zero-based, end-exclusive row and column indexes and a `fields` mask), `autoResizeDimensions`, `addProtectedRange`. Get `sheetId`s from `spreadsheets.get?fields=sheets.properties`.

## Docs `documents.batchUpdate`

```json
{
  "requests": [
    { "replaceAllText": { "containsText": { "text": "{{customer_name}}", "matchCase": true }, "replaceText": "Ama Mensah" } },
    { "insertText": { "location": { "index": 120 }, "text": "Second paragraph\n" } },
    { "insertText": { "location": { "index": 1 }, "text": "Heading\n" } }
  ],
  "writeControl": { "requiredRevisionId": "<revisionId from documents.get>" }
}
```

Order index-based edits highest index first. `targetRevisionId` instead of `requiredRevisionId` merges with collaborators' edits rather than failing.

## Slides `presentations.batchUpdate`

```json
{
  "requests": [
    { "replaceAllText": { "containsText": { "text": "{{quarter}}", "matchCase": true }, "replaceText": "Q3 2026" } },
    { "replaceAllShapesWithImage": { "containsText": { "text": "{{chart}}" }, "imageUrl": "https://example.com/chart.png", "imageReplaceMethod": "CENTER_INSIDE" } },
    { "createSlide": { "objectId": "summary_slide_01", "slideLayoutReference": { "predefinedLayout": "TITLE_AND_BODY" } } }
  ]
}
```

Images: public PNG, JPEG or GIF, under 50 MB and 25 megapixels, URL at most 2 KB; fetched once at insert. `objectId`: 5-50 chars, first char `[a-zA-Z0-9_]`, then `[a-zA-Z0-9_-:]`.

## Backoff helper (TypeScript)

```ts
const RETRYABLE = new Set(["rateLimitExceeded", "userRateLimitExceeded", "backendError"]);

export async function withBackoff<T>(call: () => Promise<T>, maxTries = 6): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await call();
    } catch (err: any) {
      // googleapis/gaxios: HTTP status is on response.status; err.code may be a network code string like "ECONNRESET"
      const status = err?.response?.status ?? (typeof err?.code === "number" ? err.code : undefined);
      const reason = err?.response?.data?.error?.errors?.[0]?.reason ?? err?.errors?.[0]?.reason;
      const network = status === undefined && ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(err?.code);
      const retryable = network || status === 429 || status >= 500 || (status === 403 && RETRYABLE.has(reason));
      if (!retryable || n + 1 >= maxTries) throw err;
      const wait = Math.min(2 ** n * 1000 + Math.random() * 1000, 64_000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
```
