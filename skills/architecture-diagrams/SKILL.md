---
name: architecture-diagrams
description: System and cloud architecture drawn as diagrams-as-code in Mermaid, D2, PlantUML or draw.io XML, derived from what the code, Terraform, Kubernetes manifests and Compose files actually declare rather than from memory, organised by C4 level (context, container, component) plus sequence and deployment views, using official AWS, Azure and Google Cloud icon sets where icons help, with the source kept editable in the repo and exported to SVG or PNG, and optional step-by-step animated diagrams for a request flow. Use when someone wants an architecture or infrastructure diagram of this system, a sequence diagram of a request path, a cloud topology drawn from IaC, or stale diagrams brought back in line with the code.
license: MIT
compatibility: Any Agent Skills host. Rendering needs one of the mermaid-cli (mmdc, via Node), d2, PlantUML (Java) or the draw.io desktop app; Mermaid also renders natively on GitHub and GitLab.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Architecture diagrams

A diagram is a claim about the system. Draw it from evidence in the repository, keep its source next to the code, and make it small enough to read. Written architecture overviews are the `/codemap` command; decisions belong in `architecture-decision-records`.

## 0. Scope the diagram

Ask, or infer and state, before drawing:

1. **Audience and question.** "How does a payment flow?" is a sequence diagram. "What runs where?" is a deployment diagram. "What are the parts?" is a container diagram.
2. **Level** (C4): Context (the system, its users and external systems), Container (deployable units and data stores), Component (inside one container). Never mix levels in one picture.
3. **Format**: whatever the repo already uses. Otherwise follow the table below.

| Need | Use |
|---|---|
| Lives in Markdown and must render on GitHub/GitLab without a build step | Mermaid (`flowchart`, `sequenceDiagram`, `C4Context`, `architecture-beta`) |
| Larger graphs, clean automatic layout, nested containers, animation | D2 (`d2 in.d2 out.svg`, `--layout elk` for dense graphs) |
| Team already on PlantUML, or C4 with a standard library | PlantUML with C4-PlantUML (`!include <C4/C4_Container>`) |
| Non-developers will edit it, or provider-styled cloud icons are required | draw.io (`.drawio` XML), exported with the desktop app |

## 1. Gather evidence

Search the repository and write down each element with the file that proves it:

- **Services and entry points**: `docker-compose.yml` services, Kubernetes `Deployment`/`Service`/`Ingress`, `Procfile`, serverless configs, `main` packages.
- **Infrastructure**: Terraform `resource` blocks (`aws_lambda_function`, `aws_db_instance`, `azurerm_*`, `google_*`), CloudFormation/CDK, Helm values. `terraform graph` gives a dependency graph to read, not to publish.
- **Connections**: HTTP clients and base URLs, queue and topic names, database URLs in config, gRPC stubs, environment variables naming other services.
- **External systems**: SDK imports (Stripe, an email provider, an identity provider).

Rules:
- Draw only what you found. Anything inferred gets a dashed line or a "(assumed)" label, and goes in the report as an open question.
- **Stop and ask** if the evidence contradicts what the user described, or if environments differ (staging has a queue that production does not). Draw one environment per diagram.
- Never put secrets, internal IPs or account IDs in labels.

## 2. Draw

1. One diagram, one question. Aim for 5 to 15 boxes; split anything bigger into a context diagram plus zoomed-in diagrams.
2. Every box: a name and its technology (`Orders API [Node, ECS]`). Every arrow: a direction and a verb or protocol (`publishes OrderPlaced`, `HTTPS/JSON`). Unlabelled arrows are the most common defect.
3. Group with boundaries (VPC, cluster, trust boundary, team ownership), not with colour alone. If colour carries meaning, add a legend and keep it readable in greyscale.
4. Flow reads left to right or top to bottom; put users and external callers on the left or top.
5. Cloud icons: use the provider's official architecture icon set (AWS Architecture Icons, Azure architecture icons, Google Cloud icons) through the tool's library: draw.io's built-in AWS/Azure/GCP shape libraries, PlantUML's AWS icon includes, or D2 `icon:` URLs. Follow each provider's icon usage terms; do not recolour or distort them. An icon never replaces the text label.
6. Sequence diagrams: one participant per service, include the failure path (timeout, retry, error response) when that is what the reader needs, and number steps if the prose refers to them.

Syntax for each tool, C4 and icon includes: `references/syntax.md`.

## 3. Store and export

- Source in the repo, beside the docs that use it: `docs/architecture/<name>.mmd|.d2|.puml|.drawio`. The source is the truth; exports are build output.
- Export SVG for docs (sharp at any zoom, diffable) and PNG only where SVG is not accepted:
  - Mermaid: `npx -p @mermaid-js/mermaid-cli mmdc -i orders.mmd -o orders.svg`
  - D2: `d2 orders.d2 orders.svg`
  - PlantUML: `plantuml -tsvg orders.puml` (or `java -jar plantuml.jar -tsvg orders.puml`)
  - draw.io: `drawio --export --format svg --embed-diagram -o orders.drawio.svg orders.drawio` (embedding keeps the exported file editable in draw.io)
- Mermaid in Markdown on GitHub needs no export: a fenced `mermaid` block renders in place. `architecture-beta` icons from extra icon packs do not render there; use built-in icons or another tool.
- Optional animation for walking through a flow: D2 `steps` exported with `d2 --animate-interval=1500 flow.d2 flow.svg`. Keep it to a few steps, and also commit a static version for print and PDF.
- If the repo has CI for docs, add a render step so a broken diagram fails the build.

## 4. Check before you finish

1. Render it and look at the output: overlapping labels, crossing arrows, unreadable text at page width.
2. Walk every arrow back to its evidence. Remove what you cannot justify.
3. Compare with any existing diagram; list what changed.

## Report

```
Diagram: <path to source> -> <exported files>
Type and level: <C4 container | sequence | deployment>, environment: <prod | staging | n/a>
Elements: <n> boxes, <n> connections, each traced to <files>
Assumed (dashed): <list or none>
Open questions: <contradictions or missing evidence>
Render check: <tool and command used, issues fixed>
```
