---
name: gcp-patterns
description: Guides Google Cloud projects through service-account-based IAM without key files, choosing Cloud Run, GKE or Cloud Run functions, Cloud SQL connections through the Auth Proxy or connectors, Cloud Storage access control, Secret Manager, VPC and firewall basics, and the GCP billing gotchas such as idle GKE nodes, egress, and log ingestion. Use when deploying to or designing on Google Cloud, granting roles to a service account, picking a GCP runtime, or tracing an unexpected Google Cloud charge.
license: MIT
compatibility: Any Agent Skills host. Live checks need the gcloud CLI authenticated to the target project. Infrastructure code may be Terraform or gcloud scripts.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "gcloud"
  kete-loom/owner: "Kete-org"
---

# Google Cloud patterns

Run workloads on Google Cloud with one dedicated identity per service, no downloaded keys, private data stores and a bill you can explain. Terraform mechanics are in `terraform-patterns`, Kubernetes manifests in `kubernetes-patterns`, CI auth wiring in `github-actions-ci`.

## Ground rules

1. **One project per environment** (dev, staging, prod), grouped under folders in an organization. Projects are the blast-radius and billing boundary.
2. **One user-managed service account per workload.** Never run services as the default Compute Engine service account; in older projects it may hold the broad Editor role.
3. **No service account key files.** Workloads on Google Cloud get credentials from the metadata server automatically. CI uses Workload Identity Federation; GKE pods use Workload Identity Federation for GKE. If someone asks for a JSON key, **stop and ask** what it's for and offer federation first. Recommend the org policy `iam.disableServiceAccountKeyCreation`.
4. **Predefined roles, granted at the narrowest resource.** Grant `roles/secretmanager.secretAccessor` on the one secret, `roles/storage.objectViewer` on the one bucket, not at project level. Never grant basic roles (Owner, Editor, Viewer) to workloads.
5. **Secrets in Secret Manager**, mounted or exposed as env vars by Cloud Run / GKE from a pinned version or `latest` deliberately. Never in source, `app.yaml`, or build args.
6. **Everything in IaC.** Console clicks are for exploring. Enable APIs (`gcloud services enable ...`) in code too.

## Choosing compute

| Need | Pick | Watch out for |
|---|---|---|
| Stateless HTTP service or container, scale to zero | Cloud Run (service) | Request timeout limits; CPU is throttled outside requests under the default request-based billing, so background work needs instance-based billing (`--no-cpu-throttling`); set `max-instances` to cap cost and DB connections |
| Batch or run-to-completion container | Cloud Run jobs | Set task timeout and retries explicitly |
| Single function on an event (Pub/Sub, Storage, Eventarc) | Cloud Run functions (formerly Cloud Functions) | Same limits as Cloud Run; 1st gen is legacy, prefer the current generation |
| Many services, need Kubernetes APIs, daemons or GPUs on nodes | GKE (Autopilot first, Standard if you need node control) | Cluster fee plus node or pod cost; idle node pools on Standard |
| Legacy VM software | Compute Engine with a managed instance group | Use OS Login / IAP TCP forwarding, no public SSH |

Decision rule: default to Cloud Run. Move to GKE only when a concrete requirement (sidecars Cloud Run can't host, node-level access, very high steady load) is named.

## Networking basics

1. Use a custom-mode VPC with explicit subnets per region; don't build on the `default` network, whose firewall rules are broad.
2. Firewall rules target service accounts or network tags, not "all instances". No `0.0.0.0/0` ingress except to a load balancer.
3. Private Google Access on subnets so private VMs reach Google APIs without external IPs.
4. Cloud Run reaches private resources (Cloud SQL private IP, Memorystore) through Direct VPC egress or a Serverless VPC Access connector.
5. Outbound internet from private resources goes through Cloud NAT. Put public HTTP behind an external Application Load Balancer with Cloud Armor if the user needs WAF rules.

## Data

- **Cloud SQL:** private IP, automated backups and point-in-time recovery on, high availability for production, deletion protection on. Connect through the Cloud SQL Auth Proxy or the language connector libraries (IAM-authorized, TLS) rather than allowlisting IPs. Prefer IAM database authentication where the engine supports it.
- **Cloud Storage:** uniform bucket-level access on; public access prevention enforced; object versioning or soft delete for data you can't regenerate; lifecycle rules for old objects. Give out signed URLs for temporary access, never `allUsers`.
- **Firestore / Spanner / BigQuery:** pick by access pattern; BigQuery bills by bytes scanned on on-demand pricing, so partition and cluster large tables and never `SELECT *` on them.

## Cost traps

- GKE Standard node pools left at fixed size; GKE clusters for one tiny service.
- Cloud Run with `min-instances` > 0 or instance-based billing on services that are mostly idle.
- Internet and cross-region egress; Cloud NAT data processing.
- Cloud Logging ingestion from chatty debug logs; set exclusion filters and retention.
- BigQuery full-table scans; unattached persistent disks and old snapshots; static external IPs not in use.

Set a budget with alert thresholds on the billing account first.

## Steps for a change

1. Confirm the project ID and environment (`gcloud config get-value project`). If the active project is not the one the user means, **stop and ask**.
2. Write the change in IaC; enable the APIs it needs in the same change.
3. Validate: `terraform plan`; for gcloud scripts, `describe` the current state first, since most gcloud commands have no dry-run mode. For IAM, list what the change grants and to whom.
4. **Stop and ask before** applying anything that deletes or recreates a database, bucket or disk, grants a basic role, makes a resource public, or targets production.
5. After apply, verify the service's health endpoint, check `gcloud run services describe` (or equivalent) shows the intended service account, and confirm nothing became public.

## Never

- Download a service account key "temporarily".
- Grant `roles/owner` or `roles/editor` to a service account or to `allAuthenticatedUsers`.
- Delete a project, bucket or Cloud SQL instance without the user confirming the exact name.

## Review output

```
GCP review: <project/env>
Critical: <public buckets, key files, basic roles on workloads>
High: <default SA in use, no backups, open firewall rules>
Cost: <each trap found>
Suggested IaC changes: <file: change>
Not checked: <what you had no access to>
```
