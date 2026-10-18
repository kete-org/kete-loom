# Kubernetes manifest examples

Annotated starting points. Replace names, image, ports and numbers with the project's real values.

## Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: { app.kubernetes.io/name: web }
spec:
  # replicas omitted: the HPA below owns the count
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 600
  selector:
    matchLabels: { app.kubernetes.io/name: web }   # immutable after creation
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    metadata:
      labels: { app.kubernetes.io/name: web }
    spec:
      serviceAccountName: web
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 30
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: web
          image: registry.example.com/web:1.4.2
          ports: [{ name: http, containerPort: 8080 }]
          envFrom:
            - configMapRef: { name: web-config }
            - secretRef: { name: web-secrets }
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { memory: 512Mi }
          startupProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 5
            failureThreshold: 24          # up to 2 minutes to start
          readinessProbe:
            httpGet: { path: /readyz, port: http }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 10
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: tmp, mountPath: /tmp }
      volumes:
        - { name: tmp, emptyDir: {} }
```

## Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: { app.kubernetes.io/name: web }   # must match pod labels
  ports:
    - { name: http, port: 80, targetPort: http }
```

## HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: web }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }   # % of the CPU request
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

## PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  minAvailable: 1          # must be below the replica count
  selector:
    matchLabels: { app.kubernetes.io/name: web }
```

## Probe sizing rules of thumb

- `startupProbe`: `failureThreshold × periodSeconds` ≥ worst observed startup time, with margin.
- `readinessProbe`: short period (5s) so pods leave endpoints quickly when unhealthy.
- `livenessProbe`: conservative (`failureThreshold` 3 or more) so a GC pause or a brief spike doesn't restart the pod.
- Use separate endpoints for readiness (may check dependencies) and liveness (process-local only) when the app can offer them.
