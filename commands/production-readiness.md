---
name: production-readiness
description: Audit a service before launch for health checks, observability, rollback, backups, limits, secrets and runbooks, and return a go/no-go list with evidence.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[service path or name]"
  kete-loom/owner: "Kete-org"
---

Audit this service for production readiness. Do not edit files and do not run anything that changes infrastructure or data; read the code, config and docs, and run only read-only commands.

1. Find the service: the path or name below, or the repository root. Identify how it is built, deployed (Dockerfile, Kubernetes manifests, Helm, Terraform, CI workflows) and configured.
2. Check each area, using the matching Kete Loom skill as the standard when it is available:
   - **Health checks**: liveness and readiness endpoints, wired into the deploy config, readiness checking real dependencies (`kubernetes-patterns`, `deployment-strategies`).
   - **Observability**: structured logs with trace IDs, RED metrics, traces, SLOs, alerts that link to runbooks, an on-call dashboard (`observability`).
   - **Rollback**: a tested way back to the previous version, and schema changes that the old version survives (`deployment-strategies`, `database-migrations`).
   - **Backups**: automated backups of every stateful store, retention, and a restore that has actually been tested.
   - **Limits**: CPU and memory requests and limits, timeouts and retries with backoff on outbound calls, rate limits, connection pool sizes, autoscaling bounds.
   - **Secrets**: no secrets in the repo or images, read from a secret store or environment, rotation possible (`security-review` for depth).
   - **Runbooks and ownership**: an owner, an on-call rotation, a runbook for each paging alert (`runbook-writing`).
   - **Dependencies and images**: pinned base images, no known critical vulnerabilities (`dependency-audit`, `docker-patterns`).
3. For deeper infrastructure review delegate to the `infra-reviewer` agent if it is available. If none of the skills are installed, apply the checks above directly.
4. Mark each item from evidence: a file and line, a command output, or a link. If you cannot find evidence, mark it **unknown**, not pass. Ask the user about anything that lives outside the repo (backup restore tests, on-call rotation).

Return:

```
## Production readiness: <service>
Verdict: GO | GO WITH CONDITIONS | NO-GO
Blockers (must fix before launch)
- <area>: <finding>. Evidence: <path:line or output>. Fix: <action>
Conditions (fix within <agreed time> after launch)
- ...
Passed
- <area>: <evidence>
Unknown (needs an answer from the team)
- <question>
```

Any blocker means NO-GO. Health checks, rollback, backups for stateful data and secrets handling are blockers when missing.

Service or focus from the user, if any: $ARGUMENTS
