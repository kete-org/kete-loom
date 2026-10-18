---
name: contract-first-development
description: Coordinates frontend and backend teams, or two services, around one machine-checked interface contract in OpenAPI, AsyncAPI, protobuf or JSON Schema that is reviewed and merged before code, then drives generated clients and server stubs, mock servers for parallel work, CI gates for breaking changes with oasdiff and buf breaking, and Pact consumer-driven contract tests with can-i-deploy checks. Use when two teams or services must build against the same interface at the same time, a spec keeps drifting from the implementation, or a provider change broke a consumer that nobody tested against.
license: MIT
compatibility: Any Agent Skills host. Uses the contract tooling the repo already has (for example oasdiff, buf, Prism, openapi-generator, Pact); network access only for a Pact Broker.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Contract-first development

One contract file is the source of truth for an interface. Both sides generate from it or test against it, CI blocks breaking edits to it, and nobody codes against a Slack message or a screenshot of a JSON payload.

For designing the API itself (resource naming, status codes, pagination, versioning policy) use the `api-design` skill if installed; this skill is about the workflow around the contract once its shape is being agreed.

## 0. Pick the format and the owner

| Interface | Contract format |
|---|---|
| HTTP/REST | OpenAPI 3.x (3.1 aligns schemas with JSON Schema 2020-12) |
| Events, queues, WebSockets | AsyncAPI 3.x, payloads in JSON Schema or Avro |
| gRPC / internal RPC | protobuf with buf |
| A data file or message without a transport | JSON Schema |

1. Use the format already in the repo. If there are several, ask the user which is authoritative; never keep two hand-written sources of the same interface.
2. Decide where the contract lives: in the provider repo, or a shared contracts repo/package. Record the owner who approves changes (a `CODEOWNERS` entry is ideal).
3. **Stop and ask** if the implementation exists and the spec is generated from code: switching to spec-first is a team decision.

## 1. Write and review the contract before code

1. Draft the change as a pull request that touches only the contract (plus examples).
2. Every operation or message has: request and response schemas, required vs optional fields, error responses, at least one realistic example, and an `operationId` (OpenAPI) so generated code has stable names.
3. Lint it: `redocly lint` or `spectral lint` for OpenAPI, `asyncapi validate` for AsyncAPI, `buf lint` for protobuf, and validate examples against the schemas.
4. Both sides review. A consumer approval is required for anything they will call.
5. Merge, then tag or version the contract so both sides pin the same revision.

## 2. Work in parallel from the contract

- **Consumer side**: generate a typed client and start against a mock server built from the contract (`prism mock openapi.yaml` for OpenAPI; buf/connect or a generated stub for protobuf; AsyncAPI generators or a test broker for events). Never hand-write request types that the generator can produce.
- **Provider side**: generate server interfaces or stubs, or validate requests and responses against the spec at runtime in tests, so the implementation can't silently diverge.
- Commit generated code or regenerate in the build; follow whichever the repo already does, and make CI fail when the committed output is stale. Tools and commands: `references/tooling.md`.

## 3. Block breaking changes in CI

On every PR that touches a contract, compare with the base branch:

- OpenAPI: `oasdiff breaking --fail-on ERR origin/main:openapi.yaml HEAD:openapi.yaml`; `oasdiff changelog` for the PR description.
- protobuf: `buf breaking --against '.git#branch=main'` (default rule set `FILE`; set `breaking.use` in `buf.yaml`).
- JSON Schema / AsyncAPI: run the repo's diff tool, or treat removed properties, newly required fields, narrowed types and removed enum values as breaking in review.

A breaking change needs one of: a new version (path, package, or message type), an additive alternative plus deprecation, or written agreement from every consumer. **Stop and ask the user** before merging any breaking change.

Common breaking edits: removing or renaming a field, endpoint, message or enum value; making an optional request field required; changing a type or format; tightening validation; reusing a protobuf field number. Also breaking for many consumers: adding a value to a response enum (strict clients and exhaustive switches fail) and changing default values. Usually safe: adding optional request fields, adding response fields (only if consumers ignore unknown fields), adding endpoints.

## 4. Consumer-driven contract tests (Pact)

Use when consumers depend on behaviour a schema can't express (which fields they actually read, state-dependent responses), or when providers deploy independently.

1. Consumer tests run against the Pact mock and write a pact file describing only the interactions the consumer uses.
2. Publish pacts to a Pact Broker (or PactFlow) tagged with the consumer's git SHA and branch.
3. The provider verifies pacts in its CI with provider states set up through a test hook, never against shared staging data.
4. Before each deploy: `pact-broker can-i-deploy --pacticipant <name> --version <sha> --to-environment <env>`; after it: `pact-broker record-deployment --pacticipant <name> --version <sha> --environment <env>`.
5. Pact does not replace schema checks; run both.

## Never

- Never edit generated code by hand; change the contract or the generator config.
- Never let the mock server drift from the spec (generate it from the spec, don't hand-write fixtures).
- Never disable a breaking-change check to get a PR green.
- Never reuse a deleted protobuf field number or name; `reserved` them.

## Report

```
## Contract: <interface> (<format>, <path>@<revision>)
Owner: <team/person>
Lint: <command> -> pass/fail
Breaking-change check: <command> -> <n breaking> (<list>)
Generated: client <tool/path>, server <tool/path>, stale: yes/no
Mock: <command or none>
Consumer contracts: <Pact status, can-i-deploy result, or not used>
Needs agreement: <breaking changes and which consumers must approve>
```
