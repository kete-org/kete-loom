---
name: kubernetes-patterns
description: Kubernetes workload manifests and day-two operations with kubectl, covering Deployments, startup, readiness and liveness probes, CPU and memory requests and limits, ConfigMaps and Secrets, rolling updates and rollbacks, HorizontalPodAutoscaler, PodDisruptionBudgets and a step-by-step pod debugging routine. Use when writing or fixing Deployment, Service or HPA YAML, a rollout is stuck or needs undoing, or pods are in CrashLoopBackOff, Pending, OOMKilled or ImagePullBackOff.
license: MIT
compatibility: Any Agent Skills host. Cluster commands need kubectl configured for the target cluster; Helm or Kustomize only if the project already uses them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "kubectl"
  kete-loom/owner: "Kete-org"
---

# Kubernetes patterns

Write workloads that start reliably, roll out without downtime, can be rolled back, and tell you why they are failing. Building the container image belongs to `docker-patterns`; provisioning the cluster itself belongs to `terraform-patterns`.

## 0. Before touching anything

1. Find how manifests are managed: plain YAML, Kustomize (`kustomization.yaml`), Helm (`Chart.yaml`, `values*.yaml`) or a GitOps tool (Argo CD, Flux). Edit the source of truth, never the live object, when GitOps is in use: a `kubectl edit` will be reverted.
2. Run `kubectl config current-context` and say which cluster and namespace you are on.
3. **Stop and ask the user before any write to a cluster** (`apply`, `delete`, `rollout undo`, `scale`, `edit`, `patch`), and always before anything in a context or namespace that looks like production. Read-only commands (`get`, `describe`, `logs`, `events`, `top`, `diff`) are fine.
4. Prefer `kubectl diff -f <file>` before `kubectl apply -f <file>`, and show the diff.

## 1. Deployment checklist

Every long-running workload gets all of these. A full annotated example is in `references/manifests.md`.

1. **Labels**: a stable `selector.matchLabels` (it is immutable after creation) and the same labels on the pod template. Use `app.kubernetes.io/name` and `app.kubernetes.io/instance`.
2. **Image** pinned to an immutable tag or digest, never `latest`. `imagePullPolicy: IfNotPresent` for immutable tags.
3. **Replicas** at least 2 for anything user-facing, unless an HPA owns the count. When an HPA manages the Deployment, remove `replicas` from the manifest so an apply does not reset it.
4. **Resources**: set `requests` for CPU and memory on every container, and a memory `limit`. Memory over the limit gets the container OOMKilled. A CPU limit throttles rather than kills; set one only if the team's policy requires it, and know it can add latency.
5. **Probes**, each with a distinct job:
   - `startupProbe` for slow starters: holds off the other probes until it passes. Size `failureThreshold × periodSeconds` to the worst startup time.
   - `readinessProbe`: "can I take traffic now". Failing it removes the pod from Service endpoints; it does not restart it. It may check critical dependencies.
   - `livenessProbe`: "am I stuck and need a restart". Keep it cheap and local; never check the database or another service here, or one outage restarts every pod.
6. **Graceful shutdown**: the app handles `SIGTERM`, and `terminationGracePeriodSeconds` covers in-flight requests. A short `preStop` sleep (a few seconds) helps load balancers drain, if the image has a `sleep` binary.
7. **Security context**: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true` where the app allows (mount an `emptyDir` for `/tmp`), `capabilities.drop: ["ALL"]`, `seccompProfile.type: RuntimeDefault`.
8. **Rollout strategy**: `RollingUpdate` with `maxUnavailable: 0` and `maxSurge: 1` (or 25%) for zero downtime. Set `revisionHistoryLimit` so rollbacks are possible.
9. **PodDisruptionBudget** for workloads with 2+ replicas, so node drains keep some pods up. `minAvailable` must be lower than the replica count, or drains block forever.
10. **ServiceAccount**: a dedicated one, with `automountServiceAccountToken: false` unless the app calls the API.

## 2. Configuration and secrets

- Non-secret settings in a ConfigMap, consumed via `envFrom` or a mounted file.
- Credentials in a Secret. A Secret is base64-encoded, not encrypted: never commit a plain Secret manifest with real values. Use what the project already has (External Secrets Operator, Sealed Secrets, SOPS, the cloud's secret store CSI driver) and stop and ask if there is nothing.
- Pods do not restart when a ConfigMap or Secret used as env changes. Trigger a rollout (`kubectl rollout restart deployment/<name>`), or use a checksum annotation in Helm or Kustomize's `configMapGenerator` hash suffix.

## 3. Rollouts and rollbacks

```sh
kubectl rollout status deployment/<name> -n <ns> --timeout=5m
kubectl rollout history deployment/<name> -n <ns>
kubectl rollout undo deployment/<name> -n <ns>                 # previous revision
kubectl rollout undo deployment/<name> -n <ns> --to-revision=N
kubectl rollout pause|resume deployment/<name> -n <ns>
```

- Set `progressDeadlineSeconds` so a stuck rollout reports `ProgressDeadlineExceeded` instead of hanging.
- With GitOps, roll back by reverting the commit; `rollout undo` will be overwritten on the next sync.
- A rollback does not undo database migrations. Check before rolling back past a schema change.

## 4. Autoscaling

- Use `autoscaling/v2` HorizontalPodAutoscaler. CPU-utilisation targets are a percentage of the **request**, so requests must be set.
- Needs metrics-server (or a custom metrics adapter); check `kubectl top pods` works first.
- Set `minReplicas` ≥ 2 for availability, and a `behavior.scaleDown.stabilizationWindowSeconds` to avoid flapping.
- Don't run an HPA and a VerticalPodAutoscaler in update mode on the same CPU or memory metric.

## 5. Debugging a failing pod

Work in this order and stop when you find the cause:

1. `kubectl get pods -n <ns> -o wide`: status, restarts, node.
2. `kubectl describe pod <pod> -n <ns>`: read **Events** at the bottom and each container's **Last State** (reason, exit code).
3. `kubectl logs <pod> -n <ns> -c <container>` and `--previous` for the crashed instance.
4. `kubectl get events -n <ns> --sort-by=.lastTimestamp`.
5. If the image has no shell: `kubectl debug -it <pod> -n <ns> --image=busybox --target=<container>`. This adds an ephemeral container to the live pod, so it is a cluster write: ask first.

Common causes:

| Symptom | Look at |
|---|---|
| `Pending` | Events: insufficient CPU/memory, unbound PVC, node selector/taints/affinity with no match |
| `ImagePullBackOff` / `ErrImagePull` | Image name or tag typo, private registry without `imagePullSecrets`, wrong architecture |
| `CrashLoopBackOff` | `logs --previous`; bad config or missing env var; liveness probe killing a slow start (add a startupProbe) |
| `OOMKilled` (exit 137) | Memory limit too low for real usage, or a leak; check `kubectl top pod` |
| Running but no traffic | Readiness failing, Service `selector` not matching pod labels, wrong `targetPort`; check `kubectl get endpointslices -l kubernetes.io/service-name=<svc>` |
| `CreateContainerConfigError` | Referenced ConfigMap/Secret or key does not exist |

Report the cause with the exact event or log line that proves it, before proposing a fix.

## 6. Verify

- Validate before applying: `kubectl apply --dry-run=client -f <file>` offline, or `kubectl apply --dry-run=server -f <file>` (needs cluster access; runs admission checks without persisting). If the project uses `kubeconform`, `helm lint` or `helm template`, or `kustomize build`, run them.
- After an approved apply: `kubectl rollout status` reaches success, pods are `Ready`, and the Service has endpoints.

## Never

- Never `kubectl delete` a namespace, PVC or StatefulSet, or `--force --grace-period=0` a pod, without explicit user approval.
- Never put secret values in a ConfigMap, a manifest committed to git, or a command line that ends up in shell history.
- Never set `privileged: true`, `hostNetwork`, `hostPID` or a `hostPath` mount unless the user asks and states why.

## Report back

End with: cluster context and namespace used, files changed, commands run (marking which ones wrote to the cluster and that the user approved them), the rollout or debug result with the evidence line, and what you did not check.
