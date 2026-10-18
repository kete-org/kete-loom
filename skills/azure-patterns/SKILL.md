---
name: azure-patterns
description: Sets up and audits Microsoft Azure workloads with Entra ID and managed identities instead of stored credentials, Azure RBAC at resource scope, a reasoned choice among App Service, Container Apps, Azure Functions and AKS, Azure SQL and Cosmos DB configuration, Key Vault references, virtual networks with private endpoints and NSGs, and Azure spending pitfalls like idle App Service plans and over-provisioned RUs. Use when building on Azure, wiring a managed identity, deciding where an Azure app should run, or explaining an Azure invoice.
license: MIT
compatibility: Any Agent Skills host. Live checks need the Azure CLI signed in to the target subscription. Infrastructure code may be Bicep, ARM or Terraform.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "az"
  kete-loom/owner: "Kete-org"
---

# Azure patterns

Build on Azure so apps authenticate with managed identities, secrets live in Key Vault, data services sit behind private endpoints, and costs are predictable. Terraform detail is in `terraform-patterns`, Kubernetes manifests in `kubernetes-patterns`, CI login in `github-actions-ci`, .NET code in `aspnet-core-patterns`.

## Ground rules

1. **Structure:** management groups, then one subscription per environment (or at least per prod / non-prod), then resource groups per application and environment. Resource groups share a lifecycle: everything in one is deployed and deleted together.
2. **Managed identities for workloads.** Use a system-assigned identity when one resource needs access; a user-assigned identity when several resources share it or it must exist before the resource. In code use `DefaultAzureCredential` (or the language's equivalent) so the same code works locally with a developer sign-in and in Azure with the identity.
3. **No client secrets in apps.** If an app registration secret seems needed, **stop and ask** whether a managed identity or workload identity federation (for CI and for AKS) works instead. If a secret is unavoidable, store it in Key Vault and set an expiry reminder.
4. **Azure RBAC, narrowest scope, data-plane roles.** Grant `Key Vault Secrets User` on the vault, `Storage Blob Data Reader` on the storage account or container. Never Owner or Contributor on a subscription for a workload.
5. **Key Vault for secrets, keys and certificates.** Use the RBAC permission model, soft delete and purge protection. App Service and Functions read secrets through Key Vault references in app settings; Container Apps through secret references to Key Vault.
6. **Everything in IaC** (Bicep, ARM or Terraform). Preview with `az deployment group what-if` or `terraform plan`.

## Choosing compute

| Need | Pick | Watch out for |
|---|---|---|
| Web app or API, code or container, simple ops | App Service | The App Service plan bills while running even with zero traffic; deployment slots for zero-downtime swaps |
| Containerised microservices, scale to zero, Dapr or KEDA scaling | Container Apps | Set min replicas deliberately; workload profiles for dedicated capacity |
| Event-driven functions (queues, timers, HTTP) | Azure Functions, Flex Consumption plan for new serverless apps | Linux Consumption is legacy and scheduled for retirement; check timeouts per plan |
| Full Kubernetes control, many teams, custom operators | AKS | You own upgrades and node pools; use workload identity, not pod-managed identity |
| Lift-and-shift VM software | Virtual Machines / scale sets | Patch management; Bastion instead of public RDP/SSH |

Decision rule: App Service or Container Apps first. Choose AKS only when the user names a requirement those can't meet.

## Networking basics

1. One virtual network per environment (or hub-and-spoke for larger estates), with subnets per tier.
2. Data services (Azure SQL, Cosmos DB, Storage, Key Vault) get **private endpoints** and public network access disabled; add the matching Private DNS zones so names resolve to the private IP.
3. App Service and Functions reach the VNet through VNet integration; Container Apps run in a VNet-integrated environment.
4. NSGs on subnets allow only the ports each tier needs, by service tag or application security group. Never open RDP (3389) or SSH (22) to the internet; use Azure Bastion.
5. Public HTTP goes through Application Gateway or Front Door, with WAF if the user needs it.

## Data

- **Azure SQL Database:** Entra ID authentication with the app's managed identity (no SQL passwords in connection strings), Entra-only auth where possible; geo-redundant backups and point-in-time restore configured; serverless tier with auto-pause for dev.
- **Cosmos DB:** choose the partition key from the dominant query; serverless or autoscale throughput rather than high fixed RU/s; use data-plane RBAC with the managed identity instead of account keys, and disable key-based auth when nothing needs it.
- **Storage accounts:** disable anonymous blob access and shared key auth where clients support Entra; soft delete for blobs and containers; lifecycle management to cool or archive tiers.

## Cost traps

- App Service plans and Premium Functions plans that keep billing for apps nobody uses; several small plans that could share one.
- Cosmos DB provisioned RU/s far above actual use; one container per tenant with minimum RU each.
- AKS node pools that never scale down; forgotten dev clusters.
- Log Analytics ingestion with no daily cap or retention policy.
- Unattached managed disks, public IPs, idle Application Gateways, VMs stopped but not deallocated.

Create a budget with alerts on each subscription first.

## Steps for a change

1. Confirm the subscription and resource group: `az account show`. If it is not the one the user means, **stop and ask**.
2. Write the change in IaC with identities, RBAC assignments and private endpoints in the same change.
3. Preview: `az deployment group what-if` or `terraform plan`. Read every delete and replace line.
4. **Stop and ask before** any deployment in `Complete` mode, any delete or replace of a database, storage account or vault, any role assignment at subscription scope, or any production change.
5. After deploying, verify the app's health endpoint, that the identity has exactly the intended role assignments (`az role assignment list --assignee <principalId>`), and that public network access is off where intended.

## Never

- Put storage account keys, Cosmos keys or SQL passwords in app settings or source.
- Purge a soft-deleted Key Vault or delete a resource group without the user confirming the exact name.
- Grant Owner to a service principal used by CI "to save time".

## Review output

```
Azure review: <subscription/env>
Critical: <secrets in config, public data endpoints, Owner on workloads>
High: <no managed identity, missing backups, open NSG rules>
Cost: <each trap found>
Suggested IaC changes: <file: change>
Not checked: <what you had no access to>
```
