---
name: hexagonal-architecture
description: Applies ports and adapters (hexagonal, clean or onion architecture) pragmatically, keeping domain rules and use cases free of framework, database and HTTP imports, pointing dependencies inward, and untangling an existing codebase one seam at a time. Use when business logic is mixed into controllers or ORM models, when a core module must be testable without a database, when deciding whether layering is worth it for a project, or when carving a use case out of legacy code.
license: MIT
compatibility: Any Agent Skills host. Language neutral; needs the project's test command to verify each step.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Hexagonal architecture (ports and adapters)

One rule matters: **source code dependencies point inward.** The domain knows nothing about HTTP, the database, queues or the framework. Everything else is detail.

## Is it worth it here?

Decide before you add a single interface.

| Signal | Verdict |
|---|---|
| Real business rules (pricing, eligibility, state machines) that change often | Worth it for that module |
| Two or more delivery mechanisms (HTTP + queue + CLI) for the same logic | Worth it |
| Need to swap or fake an external system (payments, email, a vendor API) | Worth it at that boundary only |
| CRUD over a table with validation, nothing else | Overkill. Use the framework directly |
| Prototype, script, or a service you expect to throw away | Overkill |
| Team unfamiliar with it and no rule above applies | Overkill |

Apply it **per module**, not per repo. A CRUD admin area and a ports-and-adapters billing core can live side by side. If the verdict is unclear, **stop and ask the user** what they want to be able to test or swap.

## The shape

```
adapters (driving)          core                         adapters (driven)
HTTP controller ─┐   ┌───────────────────────────┐   ┌─ PostgresOrderRepository
CLI command  ────┼──▶│ use case (application)    │──▶├─ StripePaymentGateway
queue consumer ──┘   │   uses domain + ports     │   └─ SmtpMailer
                     │ domain (entities, rules)  │
                     └───────────────────────────┘
```

- **Domain**: entities, value objects, domain rules. Pure code. No I/O, no framework, no ORM annotations if you can avoid them.
- **Use cases (application services)**: one per user intention (`PlaceOrder`, `CancelSubscription`). Orchestrate domain objects and call ports. Own the transaction boundary.
- **Ports**: interfaces the core defines, in core terms. Driven ports: `OrderRepository`, `PaymentGateway`, `Clock`. Driving ports: the use case's input/output types.
- **Adapters**: implement driven ports (Postgres, Stripe, SMTP) or call driving ports (HTTP, CLI, consumers). All framework code lives here.
- **Composition root**: one place (main, DI container config) wires adapters into use cases.

## Rules

1. The core imports only the language standard library and its own code. Enforce it with a check (an import-lint rule, an architecture test such as ArchUnit, dependency-cruiser or import-linter, or package visibility), not with good intentions.
2. Ports are named for what the core needs (`PaymentGateway.charge(amount, customer)`), not for the technology (`StripeClient`). Vendor DTOs never cross into the core; adapters translate.
3. One port per real external dependency. Don't wrap things you'll never replace or fake (the standard library, pure utility libraries).
4. Use cases take and return plain data or domain types, never HTTP request objects or ORM entities.
5. Validation of input shape happens in the driving adapter; business invariants live in the domain.
6. Tests: domain and use cases are unit-tested with in-memory fakes for ports; each adapter has its own integration test against the real thing (test database, sandbox API). Few end-to-end tests on top.
7. Don't create a folder per layer per entity with one-line pass-through classes. If a use case only forwards to a repository, the module is probably CRUD; see the table above.

## Migrating a tangled codebase

Never do a big-bang rewrite. Move one use case at a time, keeping the suite green after each step.

1. **Pick the seam**: the use case with the most business logic and the most pain (bugs, hard to test). Read every caller.
2. **Pin behaviour**: add characterisation tests at the current entry point (HTTP or function level) before moving anything. If you can't test it, stop and tell the user what blocks it.
3. **Extract the use case**: move the logic out of the controller/model into a use-case function or class that takes its dependencies as parameters. Keep calling the same database code for now.
4. **Introduce ports**: replace each direct infrastructure call in the use case with an interface defined next to the use case. The existing code becomes the first adapter.
5. **Move domain rules** out of ORM models or services into domain types, one rule at a time.
6. **Thin the controller**: it parses input, calls the use case, maps the result to a response. Nothing more.
7. **Add the dependency check** so the extracted module can't regress.
8. Run the test command after every step. Commit each step separately.

Stop and ask the user before: changing a public API or database schema as part of the move, introducing a DI framework, or moving more than one use case in one change.

## Never

- Leak ORM entities, HTTP requests or vendor SDK types into the domain.
- Add an interface with exactly one implementation and no fake "for flexibility" outside a real boundary.
- Let the domain call the database "just this once."
- Restructure the whole repo into layers before a single use case benefits.

## Report back

```
Verdict: apply | partial (modules) | skip, and why
Core modules: paths, and the dependency check that guards them
Ports added: name → adapter(s)
Steps done: list, each with test command result
Next seam: the next use case worth extracting
```
