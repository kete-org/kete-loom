---
name: aws-patterns
description: Designs and reviews workloads on Amazon Web Services, covering least-privilege IAM roles and policies, picking Lambda versus ECS Fargate versus EC2, S3 bucket hardening, RDS and Aurora setup, VPC subnets and security groups, Secrets Manager and Parameter Store, and the bill surprises that come from NAT gateways, public IPv4 and idle resources. Use when building or changing something on AWS, writing an IAM policy, choosing an AWS compute service, or asking why an AWS account costs more than expected.
license: MIT
compatibility: Any Agent Skills host. Live checks need the AWS CLI with credentials for the target account. Infrastructure code may be Terraform, CloudFormation, CDK or SAM.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "aws"
  kete-loom/owner: "Kete-org"
---

# AWS patterns

Build on AWS so that every principal has only the access it needs, nothing is public by accident, secrets never sit in code, and the monthly bill holds no surprises. Terraform syntax itself belongs to `terraform-patterns`; container image detail to `docker-patterns`; CI wiring to `github-actions-ci`.

## Ground rules

1. **Everything is code.** Create resources through the project's IaC (Terraform, CloudFormation, CDK or SAM). Console changes are for exploring only; if you find drift, report it, don't "fix" it by clicking.
2. **Roles, not users.** Workloads get IAM roles (Lambda execution role, ECS task role, EC2 instance profile). People sign in through IAM Identity Center. Never create long-lived access keys for an app or a CI system; CI uses OIDC federation (see `github-actions-ci`).
3. **Least privilege, scoped by resource.** No `"Action": "*"` or `"Resource": "*"` on write actions. Name the ARNs. Use conditions (`aws:SourceArn`, `aws:PrincipalOrgID`, `s3:prefix`) when a service or cross-account principal is involved.
4. **Private by default.** S3 Block Public Access stays on at account and bucket level. Databases live in private subnets with no public endpoint. Serve public content through CloudFront with origin access control, not a public bucket.
5. **Secrets in Secrets Manager or SSM Parameter Store (`SecureString`).** Never in environment variables committed to the repo, task definitions in git, or user data. Grant `secretsmanager:GetSecretValue` on that one secret ARN only.
6. **Encrypt and log.** Encryption at rest on S3, EBS, RDS (default keys are fine unless compliance asks for customer-managed KMS keys). CloudTrail on in every region for the account.
7. **Tag everything** with at least owner, environment and cost centre so cost reports mean something.

## Choosing compute

| Need | Pick | Watch out for |
|---|---|---|
| Event-driven, spiky, short tasks (API, queue consumer, cron) | Lambda | 15-minute maximum run time; cold starts; database connection storms (use RDS Proxy) |
| Long-running containers without managing servers | ECS on Fargate | Pay per vCPU/memory even when idle; right-size tasks |
| Many services, team already runs Kubernetes | EKS | Control-plane fee per cluster plus node cost; operational load. See `kubernetes-patterns` |
| GPUs, special kernels, licensed software, steady high load | EC2 (Auto Scaling group) | You patch the OS; use SSM Session Manager instead of SSH keys and open port 22 |
| Static site | S3 + CloudFront | Bucket stays private behind origin access control |

Decision rule: start with the simplest option that meets the run-time and scaling need. If the user wants EKS for one or two services, ask whether they have Kubernetes experience before committing.

## Networking basics

1. One VPC per environment, spread across at least two Availability Zones.
2. Public subnets hold only load balancers and NAT gateways. App and database subnets are private.
3. Security groups reference other security groups, not CIDR ranges: the database SG allows port 5432 from the app SG only. Never `0.0.0.0/0` on anything but 80/443 on a load balancer.
4. Add a gateway VPC endpoint for S3 (and DynamoDB if used): it costs nothing and keeps that traffic off the NAT gateway.
5. Use interface endpoints for other heavy AWS API traffic (ECR, Secrets Manager, CloudWatch Logs) when NAT data charges are high.

## Data

- **S3:** versioning on for anything you can't regenerate; lifecycle rules to move or expire old objects and abort incomplete multipart uploads; bucket policy that denies non-TLS requests (`aws:SecureTransport` = false).
- **RDS / Aurora:** Multi-AZ for production, automated backups with a retention that matches the recovery need, deletion protection on, storage encrypted, credentials managed by Secrets Manager (RDS can manage and rotate the master password). Connect with IAM auth or a secret, never a password in config.
- **DynamoDB:** design keys around access patterns first; on-demand capacity until traffic is predictable.

## Cost traps to check every time

- NAT gateway hourly charge plus per-GB processing; one per AZ multiplies it. Traffic to S3 through NAT is the classic waste.
- Public IPv4 addresses are billed per hour, including ones attached to running instances and idle Elastic IPs.
- Cross-AZ and internet data transfer.
- Unattached EBS volumes, old snapshots, idle load balancers, forgotten dev RDS instances.
- CloudWatch Logs with no retention set (the default is never expire).
- Lambda with oversized memory or a retry loop on a failing event source.

Set an AWS Budgets alert on every account before building anything else.

## Steps for a change

1. Read the existing IaC and identify the account, region and environment. If you can't tell which account a change targets, **stop and ask**.
2. Write the change in IaC following the ground rules.
3. Validate it: `terraform plan`, `cdk diff`, `sam validate` or `aws cloudformation validate-template`. For IAM, run `aws accessanalyzer validate-policy --policy-type IDENTITY_POLICY --policy-document file://policy.json` and fix every error and security warning.
4. Show the user the plan. **Stop and ask before** any apply that deletes or replaces a stateful resource (database, bucket, volume), widens a security group to the internet, or touches production.
5. After apply, verify: `aws sts get-caller-identity` for identity, the service's health check, and that no new resource is public.

## Never

- Commit access keys, or put them in `.env` files that reach git.
- Use the root user for anything except the few tasks that require it; root has MFA and no access keys.
- Attach `AdministratorAccess` to a workload role "to get it working".
- Run destructive CLI commands (`aws s3 rm --recursive`, `delete-db-instance`) without the user confirming the exact target.

## Review output

When asked to review AWS setup, report:

```
AWS review: <account/env>
Critical: <public data, admin roles, leaked keys>
High: <missing encryption, open security groups, no backups>
Cost: <each trap found, rough monthly impact if known>
Suggested IaC changes: <file: change>
Not checked: <what you had no access to>
```
