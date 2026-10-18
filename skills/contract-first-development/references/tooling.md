# Contract tooling

Prefer tools already in the repo. Check flags with `--help` for the installed version.

## OpenAPI

| Job | Tool and command |
|---|---|
| Lint | `npx @redocly/cli lint openapi.yaml`, or `spectral lint openapi.yaml` with a `.spectral.yaml` ruleset |
| Breaking changes | `oasdiff breaking --fail-on ERR <base> <revision>`; bases can be files, URLs or `<git-ref>:<path>`; `--fail-on WARN` is stricter |
| Changelog | `oasdiff changelog <base> <revision>` |
| Mock server | `npx @stoplight/prism-cli mock openapi.yaml` (serves examples; `-d` for dynamic data) |
| Validating proxy | `prism proxy openapi.yaml <upstream-url>` reports requests and responses that violate the spec |
| TypeScript types | `npx openapi-typescript openapi.yaml -o src/api/schema.d.ts`, with `openapi-fetch` for a typed client |
| Clients and stubs, many languages | `openapi-generator-cli generate -i openapi.yaml -g <generator> -o <dir>` |
| Go | `oapi-codegen` with a config file selecting client, server or types |
| Property-based API tests | Schemathesis, run against a provider test instance |

## protobuf (buf)

| Job | Command |
|---|---|
| Lint | `buf lint` |
| Breaking changes | `buf breaking --against '.git#branch=main'` (or a BSR module, or a tag) |
| Generate | `buf generate` with `buf.gen.yaml` listing plugins |
| Format | `buf format -w` |

Rules: never change a field number or type; `reserved` removed numbers and names; add fields as optional.

## AsyncAPI

- Validate: `asyncapi validate asyncapi.yaml` (AsyncAPI CLI).
- Generate code or docs: `asyncapi generate fromTemplate asyncapi.yaml <template>`.
- Payload schemas can be JSON Schema or Avro; keep Avro schemas in a schema registry with compatibility mode set (for example BACKWARD) if the platform has one.

## JSON Schema

- Validate examples and fixtures in tests with the language's validator (Ajv for JS/TS, `jsonschema` for Python).
- Declare `$schema` so tools pick the right draft.

## Pact

- Consumer libraries: pact-js, pact-python, pact-jvm, pact-go, pact-net and others; consumer tests write pact files to `pacts/`.
- Publish: `pact-broker publish pacts/ --consumer-app-version <sha> --branch <branch> --broker-base-url <url>`.
- Provider verification runs in the provider's test suite with a provider-states setup endpoint or hook.
- Gate deploys: `pact-broker can-i-deploy --pacticipant <name> --version <sha> --to-environment <env>`; then `pact-broker record-deployment --pacticipant <name> --version <sha> --environment <env>`.
