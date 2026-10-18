# Remotion Lambda setup and rendering

Check www.remotion.dev/docs/lambda for the current version before changing anything; the function and the site must be on the same Remotion version as the project.

## One-time setup

1. `npx remotion add @remotion/lambda` (keeps every `remotion` and `@remotion/*` package on the same version).
2. In AWS IAM create a role named `remotion-lambda-role` with the policy printed by `npx remotion lambda policies role`.
3. Create a user with the policy from `npx remotion lambda policies user` and an access key. Put the key in a gitignored `.env`:

   ```txt
   REMOTION_AWS_ACCESS_KEY_ID=...
   REMOTION_AWS_SECRET_ACCESS_KEY=...
   ```

4. Check it: `npx remotion lambda policies validate`.
5. See your concurrency limit: `npx remotion lambda quotas`. New AWS accounts often have a low limit; request an increase before big renders.

## Deploy

```bash
npx remotion lambda functions deploy                       # once per Remotion version / memory / timeout / region
npx remotion lambda sites create src/index.ts --site-name=my-video   # every time the video code changes
```

`sites create` prints a serve URL. Redeploying with the same `--site-name` overwrites it, so a stable name keeps the URL.

## Render from the CLI

```bash
npx remotion lambda render <serve-url-or-site-name> <composition-id> [out.mp4] \
  --privacy=private --props=./props.json
```

- `--concurrency=<n>` or `--frames-per-lambda=<n>` controls how the video is split (one or the other, at most 200 functions).
- `--privacy`: `public` (default), `private` (use `presignUrl()` to hand out a link) or `no-acl`.
- Without an output path the file stays in the S3 bucket.

## Render from Node

```ts
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';

const { renderId, bucketName } = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName,            // from getFunctions({ region, compatibleOnly: true })
  serveUrl,
  composition: 'Intro',
  inputProps: { title },
  codec: 'h264',
  privacy: 'private',
});

// Poll from a job, not from an HTTP request handler
const progress = await getRenderProgress({ renderId, bucketName, functionName, region: 'us-east-1' });
// progress.done, progress.overallProgress, progress.outputFile, progress.fatalErrorEncountered, progress.errors
```

Store `renderId` and `bucketName` with your job row so a restart can resume polling. A `webhook` option on `renderMediaOnLambda` can notify you instead of polling; verify every delivery against the secret you set, using `validateWebhookSignature({ secret, body, signatureHeader })` from `@remotion/lambda/client` with the `X-Remotion-Signature` request header, before you trust it.

## Common failures

- Version mismatch between project, function and site: redeploy both after upgrading.
- Fonts missing on Lambda: load them with `@remotion/google-fonts` or `@remotion/fonts`; Lambda has few system fonts.
- `delayRender` timeouts on Lambda but not locally: remote assets are slower to fetch; raise `timeoutInMilliseconds` for that call or host assets in the same region.
- Rate limit / concurrency errors: lower `--concurrency` or raise the AWS quota.
