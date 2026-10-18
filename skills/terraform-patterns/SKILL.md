---
name: terraform-patterns
description: Terraform and OpenTofu infrastructure-as-code practice, from root and child module layout, pinned providers and remote state with locking, through per-environment variables, reading a plan before apply, detecting drift, adopting existing resources with import blocks, and renaming or moving resources safely with moved and removed blocks instead of destroy and recreate. Use when writing or restructuring .tf code, setting up a state backend, reviewing what terraform plan will replace or destroy, or bringing hand-made cloud resources under Terraform.
license: MIT
compatibility: Any Agent Skills host. Needs terraform or tofu on PATH and cloud credentials for plan and apply. Commands are the same for both CLIs; substitute tofu for terraform when the project uses OpenTofu.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "terraform"
  kete-loom/owner: "Kete-org"
---

# Terraform patterns

Change infrastructure through code that plans cleanly, keeps state safe, and never destroys something by accident. Cloud-specific service choices belong to `aws-patterns`, `gcp-patterns` or `azure-patterns`; this skill covers the Terraform layer itself.

## 0. Orient

1. Detect the CLI: `.terraform.lock.hcl`, `required_version`, a `.terraform-version` / `.opentofu-version` file, or CI steps tell you whether it is `terraform` or `tofu`, and which version. Use that one throughout.
2. Find the root modules (directories with a `backend` block or that CI runs `plan` in), the child modules (`modules/`), and how environments are split (separate root directories per env, workspaces, or a wrapper such as Terragrunt).
3. Read the backend block. Note where state lives and whether locking is on.
4. **Stop and ask the user** before `apply`, `destroy`, `import` on the CLI, any `state` subcommand that writes (`mv`, `rm`, `push`), `force-unlock`, or `init -migrate-state`. `fmt`, `validate`, `init` (without migration) and `plan` are fine.

## 1. Layout

```
modules/
  network/        main.tf variables.tf outputs.tf versions.tf README.md
  service/
envs/
  dev/            main.tf backend.tf terraform.tfvars versions.tf
  prod/
```

- One root module per environment (or per environment and component) with its own state. Keep blast radius small: networking, data stores and apps in separate states when they change at different rates.
- Child modules take inputs and return outputs; they don't configure providers or backends. Pass providers explicitly (`providers = { aws = aws.eu }`) when a module needs an aliased one.
- Pin versions: `required_version` in every root, and `required_providers` with a `~>` constraint. Commit `.terraform.lock.hcl` for root modules.
- Pin module sources: registry modules with `version = "~> x.y"`, git sources with `?ref=<tag>`.
- Prefer `for_each` over `count` for anything that has identity, so removing one item doesn't shift the indexes of every other.

## 2. Variables and environments

- Declare a `type` and `description` for every variable; add `validation` blocks for values with rules (CIDRs, allowed names).
- Mark secrets `sensitive = true`, and better, don't pass them as variables at all: read them from a secret manager data source or have the service fetch them at runtime. Sensitive values are still stored in state in plain text.
- Per-environment values in `envs/<env>/terraform.tfvars` or `-var-file`. Never commit a tfvars file containing secrets.
- Use `locals` for derived names and common tags instead of repeating expressions.

## 3. Remote state and locking

- Never keep state for shared infrastructure on a laptop or in git. Use a remote backend with locking and encryption: S3 (with `use_lockfile = true` for S3-native locking on current Terraform; the older `dynamodb_table` locking is deprecated), GCS, `azurerm`, HCP Terraform, or the backend the team already uses. Examples are in `references/backends.md`.
- Turn on versioning for the state bucket so a bad write can be recovered.
- Restrict who can read state: it contains every attribute of every resource, including secrets.
- Read another stack's outputs with `terraform_remote_state` or, better, a data source that looks the resource up, rather than copying IDs by hand.
- If a lock is stale (a crashed run), confirm with the user that no run is in progress before `force-unlock <LOCK_ID>`.

## 4. The plan is the review

Run `terraform plan -out=tfplan` and read it before anything is applied.

1. Read the summary line: `Plan: X to add, Y to change, Z to destroy`.
2. Search the plan for `must be replaced`, `forces replacement` and `will be destroyed`. For each, name the attribute that forces it.
3. Treat replacement or destruction of a stateful resource (databases, buckets, disks, DNS zones, KMS keys, clusters, IAM roles other systems depend on) as a stop: explain it to the user and propose an alternative (a `moved` block, `ignore_changes` for an attribute managed elsewhere, or an in-place change).
4. Check for unexpected changes to resources you didn't touch: that is drift or a provider upgrade, not your change. Report it separately.
5. Apply only the saved plan (`terraform apply tfplan`), so what runs is exactly what was reviewed.

For machine-readable checks: `terraform show -json tfplan` and look at `resource_changes[].change.actions` for `"delete"`.

Protect critical resources with `lifecycle { prevent_destroy = true }`, and use `create_before_destroy = true` where a replacement must not cause downtime.

## 5. Drift

- `terraform plan -refresh-only` shows what changed outside Terraform without proposing to revert it.
- Decide per item with the user: bring the code in line with reality, or let the next apply revert the manual change. Don't silently revert a hotfix someone made in the console.
- `-detailed-exitcode` (exit 2 means changes) lets CI detect drift on a schedule.

## 6. Safe refactors

Renaming or moving a resource address without telling Terraform plans a destroy and a create. Use config-driven blocks, which show up in the plan and get reviewed like any other change:

```hcl
moved {
  from = aws_s3_bucket.logs
  to   = module.logging.aws_s3_bucket.this
}

import {
  to = aws_s3_bucket.assets
  id = "my-existing-assets-bucket"
}

removed {
  from = aws_instance.legacy
  lifecycle { destroy = false }   # forget it, keep the real resource
}
```

- `moved` for renames, `count` → `for_each`, and moving resources into or out of modules. The plan should then show no destroy for those addresses.
- `import` blocks to adopt existing resources; `terraform plan -generate-config-out=generated.tf` drafts the matching configuration. Edit the generated code until plan shows no changes for the imported resource.
- `removed` with `destroy = false` to stop managing something without deleting it.
- These blocks need a reasonably recent CLI, and Terraform and OpenTofu added them (and options such as `removed`'s `lifecycle { destroy = false }`) in different releases. Check the docs for the CLI and version in `required_version`; if not, stop and ask before falling back to `terraform state mv` / `state rm`, which change state immediately and skip review.
- Keep `moved` blocks in shared modules for at least one release so every caller's state migrates; remove `import` and `removed` blocks after the apply.

## 7. Verify

Run, and report each as pass or fail:

1. `terraform fmt -check -recursive`
2. `terraform init -backend=false` then `terraform validate` in each changed root (no credentials needed).
3. Linters the project already uses (`tflint`, `checkov`, `trivy config`).
4. `terraform plan` in each affected environment if credentials are available; paste the summary line and every replace or destroy.

## Never

- Never run `apply -auto-approve` or `destroy` on the user's behalf without explicit approval for that environment.
- Never edit a state file by hand or commit `*.tfstate`, `.terraform/` or secret-bearing tfvars.
- Never use `-target` as a routine workflow; it is for recovery, and leaves the rest of the config unreviewed.
- Never upgrade a provider's major version as a side effect of another change.

## Report back

End with: CLI and version, roots changed, the plan summary per environment (add/change/destroy) with every replacement or destroy named and justified, the verification commands with pass or fail, and anything you could not plan because of missing credentials.
