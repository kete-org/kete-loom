---
name: deployment-strategies
description: Plans and runs low-risk production releases with blue-green switches, progressive canary rollouts, feature flags that separate deploy from release, expand-and-contract database changes ordered so old and new code both work, readiness and liveness health checks, rollback triggered automatically by error and latency signals, and smoke tests after every deploy. Use when shipping a risky change to production, designing a rollout or rollback plan, deploying alongside a schema change, or deciding between blue-green, canary and flags.
license: MIT
compatibility: Any Agent Skills host and any platform (Kubernetes, ECS, Cloud Run, App Service, VMs). Commands depend on the project's deploy tooling.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Deployment strategies

Ship so that a bad release reaches few users, is detected by numbers rather than by complaints, and can be undone in minutes without losing data. CI pipeline mechanics are in `github-actions-ci`; migration tooling in `database-migrations`; tags and changelogs in `release-management`.

## Ground rules

1. **Rollback must be possible before you roll forward.** Know the exact rollback command and that the previous version still runs against the current database. If you can't say how to undo a deploy, **stop and ask** before deploying.
2. **Deploy is not release.** Code can reach production switched off behind a flag; releasing is turning it on for users.
3. **Build once, promote the same artifact** (image digest, not a tag like `latest`) through staging to production.
4. **Every version must run against the schema of its neighbour.** During any rollout old and new code run at the same time.
5. **Decide health by signals agreed in advance:** error rate, latency (p95/p99), saturation, and one business metric (checkouts, sign-ins). Write the thresholds down before you start.
6. **Production changes need the user's go-ahead.** Ask before each promotion step unless the user has approved an automated rollout with defined thresholds.

## Choosing a strategy

| Situation | Strategy |
|---|---|
| Small low-risk change, good tests, fast rollback | Rolling update with health checks |
| Need instant full cutover and instant revert, can afford double capacity briefly | Blue-green |
| Risky change, enough traffic for statistics | Canary (1% → 5% → 25% → 50% → 100%) |
| Behaviour change you want to target, test in prod, or kill quickly | Feature flag (with any deploy method) |
| Schema change | Expand and contract, always, combined with one of the above |

Low-traffic services can't produce meaningful canary statistics; use blue-green plus a flag instead.

## Health checks

- **Readiness:** "can this instance serve traffic now?" Checks the app is initialised and can reach its required dependencies. Load balancers and orchestrators route only to ready instances.
- **Liveness:** "is this process stuck?" Checks only the process itself. Never make liveness depend on a database or downstream service, or one outage restarts every pod.
- **Startup grace:** give slow-starting apps a startup probe or initial delay so they aren't killed while booting.
- Implement graceful shutdown: on SIGTERM stop accepting new requests, finish in-flight ones, then exit.

## Blue-green

1. Deploy the new version (green) beside the live one (blue), on the same database.
2. Run smoke tests against green directly.
3. Switch traffic at the router (load balancer target, DNS weight, slot swap, service selector).
4. Watch the signals for an agreed window. Keep blue running and untouched.
5. Revert by switching back. Remove blue only after the window passes.

## Canary

1. Route a small slice of traffic (or an internal cohort) to the new version.
2. Compare canary vs baseline on the agreed signals, not against last week.
3. Promote in steps, holding at each long enough to see real traffic. Automate with the platform's progressive delivery tool (Argo Rollouts, Flagger, ECS/CodeDeploy, Cloud Run traffic splitting, App Service slots with traffic percentage) where available.
4. **Automatic rollback:** if any threshold is breached, shift all traffic back and alert. A human decides when to retry.

## Feature flags

- Default off; ship the code dark, then enable for staff, then a percentage, then everyone.
- Flag checks happen server-side for anything that matters for security or money.
- Every flag has an owner and a removal date. Delete the flag and the dead branch once it is at 100% and stable.
- A kill switch for a risky dependency is a flag too: test that turning it off works.

## Database-compatible ordering (expand and contract)

Never ship a schema change and code that needs it in a single step. For renaming a column, for example:

1. **Expand:** add the new column (nullable or with a default). No code change. Old code ignores it.
2. **Dual write:** deploy code that writes both columns and reads the old one.
3. **Backfill** existing rows in batches, outside the deploy.
4. **Switch reads:** deploy code that reads the new column (still writing both).
5. **Stop writing the old column:** deploy.
6. **Contract:** drop the old column in a later release, once no running or rollback-target version uses it.

Rules: additive changes go before the code that uses them; destructive changes go after the code stops using them. Avoid migrations that lock big tables during a deploy; see `database-migrations`. **Stop and ask** before any step that drops or rewrites data.

## Post-deploy verification

1. Confirm the running version is the one you meant (version endpoint, image digest).
2. Run smoke tests for the critical paths: sign-in, the main read, the main write, payment if any.
3. Check the dashboards for the agreed signals over the hold window, and the error tracker for new error types.
4. Confirm background workers and scheduled jobs picked up the new version too.
5. Announce completion, or roll back and announce that.

## Never

- Deploy on top of a failing or unknown-state production.
- Run destructive migrations in the same release as the code change.
- Remove the old environment or the rollback artifact before the hold window ends.
- Turn off alerts "to get through the deploy".

## Rollout plan format

Produce this before deploying anything non-trivial:

```
Change: <what ships>
Strategy: <rolling | blue-green | canary | flag> and why
Schema steps: <expand/contract steps and which release each goes in>
Signals and thresholds: <metric: limit>
Steps: <numbered, with hold time per step>
Rollback: <exact command or action, and how long it takes>
Verification: <smoke tests and dashboards>
Approval needed at: <steps where you stop for the user>
```
