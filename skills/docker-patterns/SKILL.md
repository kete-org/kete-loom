---
name: docker-patterns
description: Writes and fixes Dockerfiles and Docker Compose files that build small, cacheable, non-root images, using multi-stage builds, a tight .dockerignore, BuildKit cache and secret mounts, healthchecks, and a Compose setup for local development with dependent services. Use when containerising an app, shrinking a bloated or slow image build, removing secrets baked into image layers, or wiring a local stack of app, database and queue with Compose.
license: MIT
compatibility: Any Agent Skills host. Building and running images needs Docker with BuildKit (default in current Docker Engine and Docker Desktop) and the docker compose plugin.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "docker"
  kete-loom/owner: "Kete-org"
---

# Docker patterns

Produce images that are small, rebuild fast, run as a non-root user and carry no secrets. Production deployment on Kubernetes belongs to `kubernetes-patterns`; this skill stops at the image and local Compose.

## 0. Read before you write

1. Find the runtime and its lockfile (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `uv.lock`, `go.sum`, `Cargo.lock`, `pom.xml`, `*.csproj`). The lockfile drives the dependency layer.
2. Find the build command, the start command, the port and any files the app reads at runtime (templates, migrations, static assets).
3. Check for an existing `Dockerfile`, `compose.yaml` / `docker-compose.yml`, `.dockerignore` and CI build steps. Edit what exists; keep the image name and tags CI uses.
4. Stop and ask the user if the target platform is unclear (for example `linux/amd64` servers built on an `arm64` laptop) or if the app needs native libraries you cannot identify.

## 1. Dockerfile rules

1. **Pin the base image** to a specific version tag (`node:22-bookworm-slim`, `python:3.12-slim`), never `latest`. Pin by digest (`@sha256:...`) when the project asks for reproducible builds.
2. **Multi-stage**: a `build` stage with compilers and dev dependencies, and a final stage that copies only the built output and runtime dependencies. For static binaries (Go, Rust) the final stage can be `gcr.io/distroless/static` or `scratch`.
3. **Order for caching**: copy the manifest and lockfile, install dependencies, then copy the source. Source changes must not invalidate the dependency layer.
4. **Install reproducibly** from the lockfile: `npm ci`, `pnpm install --frozen-lockfile`, `pip install --no-cache-dir -r requirements.txt`, `uv sync --frozen`, `go mod download`.
5. **Clean in the same layer**: `apt-get update && apt-get install -y --no-install-recommends ... && rm -rf /var/lib/apt/lists/*`. A later `RUN rm` does not shrink the image.
6. **Non-root**: create or use an unprivileged user and set `USER` before `CMD`. Many official images ship one (`node` in Node images, `nonroot` in distroless). Copy app files with `COPY --chown=` so the user can read them, and don't make the app directory writable unless it must be.
7. **Exec form for the entrypoint**: `CMD ["node", "server.js"]`, not `CMD node server.js`, so the process is PID 1 and receives `SIGTERM`. If the app spawns children or ignores signals, add `--init` at run time or a small init such as `tini`.
8. **`EXPOSE` the port** the app listens on, and make the app bind `0.0.0.0`, not `127.0.0.1`.
9. **`HEALTHCHECK`** only with a tool that exists in the final image (`curl`, `wget` or the app's own `healthcheck` subcommand). Distroless images have no shell or curl; skip `HEALTHCHECK` there and rely on the orchestrator's probes.
10. **`ARG` vs `ENV`**: `ARG` for build-time values, `ENV` for runtime defaults. Neither is a safe place for secrets: both can be read back from image metadata or history.

A template per runtime is in `references/dockerfiles.md`.

## 2. Secrets

- Never `COPY` a `.env`, key file or credentials file into any stage, and never pass a token with `--build-arg`.
- Build-time secrets (private registry token, package-index credential): `RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci` with `docker build --secret id=npmrc,src=$HOME/.npmrc .`. The secret is not written to a layer.
- Private Git dependencies: `RUN --mount=type=ssh` with `docker build --ssh default .`.
- Runtime secrets come from the environment or a mounted file at `docker run` / Compose / orchestrator level, never from the image.
- If a secret was already baked into a pushed image, removing it from the Dockerfile is not enough: tell the user to rotate it.

## 3. .dockerignore

Always present. Start from:

```
.git
**/node_modules
**/__pycache__
**/.venv
dist
build
target
coverage
.env
.env.*
*.pem
*.key
Dockerfile*
compose*.yaml
docker-compose*.yml
```

Adjust so the build output you need is not excluded (for example, keep `dist` if you build outside Docker and copy it in).

## 4. Faster builds

- Cache package downloads across builds: `RUN --mount=type=cache,target=/root/.npm npm ci`, `--mount=type=cache,target=/root/.cache/pip`, `--mount=type=cache,target=/go/pkg/mod`.
- Keep the build context small (`.dockerignore`) and put rarely changing steps first.
- In CI, use the builder's registry or CI cache backend (`--cache-from` / `--cache-to`), not a fresh build each time.

## 5. Compose for local development

Use `compose.yaml` (the current default file name) and no top-level `version:` key; it is obsolete.

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env            # local only, git-ignored
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev-only
    volumes: [db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
volumes:
  db-data:
```

- `depends_on` with `condition: service_healthy` waits for the healthcheck, not just for the container to start.
- Services reach each other by service name (`db:5432`), not `localhost`.
- Bind-mount source for hot reload, or use `develop.watch` with `docker compose watch`. Don't bind-mount over a directory the image built (such as `node_modules`) without an anonymous volume to protect it.
- Bind database ports to localhost only when exposed: `"127.0.0.1:5432:5432"`.
- Use profiles (`profiles: [tools]`) for optional services instead of extra Compose files.

## 6. Verify

Run, and report the results:

1. `docker build -t <name>:dev .` succeeds.
2. `docker image ls <name>:dev` for the size; compare with the old image if there was one.
3. `docker run --rm <name>:dev id` (or check `docker inspect --format '{{.Config.User}}'`) shows a non-root user.
4. `docker history --no-trunc <name>:dev` shows no secrets in any layer command.
5. `docker run --rm -p <port>:<port> <name>:dev` and hit the health endpoint; then `docker stop` returns quickly (signals handled).
6. For Compose: `docker compose config` validates, `docker compose up -d` and `docker compose ps` shows services healthy.

If an image scanner is available (`docker scout cves`, `trivy image`), run it and list high and critical findings.

## Never

- Never use `latest` or an unpinned base in a production Dockerfile.
- Never run the final stage as root without the user's explicit reason.
- Never add `--privileged`, the Docker socket mount (`/var/run/docker.sock`) or `network_mode: host` unless the user asks for it and understands the risk.
- Never `chmod -R 777`.

## Report back

End with: files changed, base image and final size (before and after if known), user the container runs as, the verification commands you ran with pass or fail, and anything you could not check.
