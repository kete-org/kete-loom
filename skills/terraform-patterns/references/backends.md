# Remote state backends

Check the backend's docs for your CLI version before copying; argument names change between releases.

## AWS S3 (S3-native locking)

```hcl
terraform {
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "prod/network/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true   # writes a .tflock object next to the state
  }
}
```

- The bucket should have versioning on, public access blocked, and default encryption (SSE-S3 or SSE-KMS).
- With `use_lockfile`, the caller needs `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` on the lock object as well as the state object.
- Migrating from `dynamodb_table` locking: the two can be set together during the transition. Add `use_lockfile = true`, run `terraform init -reconfigure`, confirm runs create the `.tflock` object, then remove `dynamodb_table`.

## Google Cloud Storage

```hcl
terraform {
  backend "gcs" {
    bucket = "acme-terraform-state"
    prefix = "prod/network"
  }
}
```

GCS locks natively. Enable object versioning on the bucket.

## Azure Storage

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform"
    storage_account_name = "acmetfstate"
    container_name       = "tfstate"
    key                  = "prod/network.tfstate"
  }
}
```

Azure locks via blob leases. Enable blob versioning or soft delete on the storage account.

## Partial configuration

Keep environment-specific backend values out of shared code:

```hcl
terraform {
  backend "s3" {}
}
```

```sh
terraform init -backend-config=backend.prod.hcl
```

## Changing backends

`terraform init -migrate-state` copies state to the new backend. Before running it: confirm with the user, take a copy with `terraform state pull > backup.tfstate` (store it securely, it contains secrets), and make sure no other run is in progress.
