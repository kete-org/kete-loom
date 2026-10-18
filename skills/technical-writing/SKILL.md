---
name: technical-writing
description: Writes and restructures developer-facing documentation people actually use, such as READMEs, how-to guides, tutorials and API reference, by naming the audience first, organising around the reader's task, shipping copy-paste examples that are run before publishing, and keeping docs beside the code they describe. Use when drafting or rewriting a README, a getting-started or how-to guide, reference docs for a library, CLI or HTTP API, or when docs are confusing, stale or nobody reads them.
license: MIT
compatibility: Any Agent Skills host. Running examples needs the project's own toolchain.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Technical writing

Docs exist so a reader can finish a task. Every decision below follows from that: know who reads, know what they're trying to do, show them a working path, and keep it true.

## 1. Pin down audience and job

Before writing, answer these. Ask the user for any you can't infer from the repo:

1. **Who reads it?** First-time user, integrating developer, operator, contributor. One primary reader per document.
2. **What are they trying to do?** Install, try it, solve one specific problem, look up an exact detail, understand a design.
3. **What do they already know?** Language, framework, domain terms.

The answer to question 2 picks the document type. Don't mix types in one page.

| Reader wants to | Write a | Shape |
|---|---|---|
| learn by doing, first time | tutorial | one guided path, every step succeeds, no choices |
| solve a specific problem | how-to guide | goal in the title, prerequisites, numbered steps, result |
| look up an exact fact | reference | complete, consistent, structured like the code |
| understand why | explanation | prose, trade-offs, diagrams, links to the rest |

This is the Diátaxis split. Use it to decide, not as jargon in the docs.

## 2. Structure task-first

- Title says the task or the thing: "Send a webhook test event", not "Webhooks overview".
- Put the shortest successful path first. Options, edge cases and theory come after.
- Number steps that must happen in order. One action per step. Put the expected result after the step that produces it.
- State prerequisites up front (versions, accounts, permissions), never halfway down.
- Use headings a reader would search for. Keep paragraphs short.

### README order

1. Name and one sentence on what it does and for whom.
2. Install (one command where possible).
3. Quick start: the smallest example that does something real, with its output.
4. Common tasks or a link to guides.
5. Configuration (table: key, default, meaning).
6. Links: full docs, contributing, license, support.

Badges, history and architecture go below this or in other files.

## 3. Examples that run

- Every example is complete enough to paste and run: imports, setup, and placeholder values that are obviously placeholders (`YOUR_API_KEY`, `example.com`).
- Show the expected output or response.
- Run every example before you publish it, using the project's toolchain. If you can't run one, mark it "not run" in your report and tell the user.
- Use the project's real names, flags and defaults. Search the code to confirm each one; don't recall them.
- Label code blocks with their language. Split commands from their output.
- Never put real secrets, tokens, internal hostnames or customer data in examples.

## 4. Reference docs

- Generate from the source where the project already has a generator (docstrings, OpenAPI, typedoc-style tools). Fix the source comments, not the generated output.
- For each item: signature or endpoint, parameters (name, type, required, default, meaning), return value or response, errors, one example.
- Keep the same order and wording pattern for every entry so readers can scan.
- Document behaviour callers depend on: units, limits, side effects, idempotency, thread safety, deprecation and what replaces it.

## 5. Keep docs with the code

- Put docs in the repo, next to what they describe (`README.md` at package roots, `docs/` for guides, docstrings for reference).
- When code and docs disagree, the code is the truth. Fix the docs, or tell the user if the code looks wrong.
- Prefer links over copies. Duplicate text goes stale in one place first.
- If the project has docs linting, link checking or doctests, run them.
- When a code change alters behaviour, update docs in the same change. For that job, delegate to the `doc-updater` agent if it's available.

## 6. Style

- Second person, active voice, present tense: "Run `make test`", not "The tests can be run".
- Plain words. Define a term the first time, then use it the same way every time.
- Be specific: "takes about 2 minutes", not "may take some time"; "requires Node 18 or later" only after checking the project's engines field or CI.
- Cut filler: "simply", "just", "easy", "obviously". They insult the reader who's stuck.
- Follow the project's existing style guide and spelling if it has one.

## Stop and ask

- The audience or document type is unclear and changes the outcome.
- The docs would describe behaviour you can't confirm in the code.
- You'd delete or restructure existing docs that other pages or external sites may link to.

## Report back

Return the files you wrote or changed, the reader and document type each targets, which examples you ran (with the command) and which you didn't, and any doc-versus-code mismatches you found. For a guided walkthrough of code, use `code-tour`; for getting oriented yourself, use `codebase-onboarding`.
