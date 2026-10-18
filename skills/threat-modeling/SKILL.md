---
name: threat-modeling
description: STRIDE threat modelling for a planned feature or an existing system, done before or alongside the code. Maps the data flow, trust boundaries and assets, enumerates spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege threats per element, and ends with a ranked list of mitigations the team can turn into tickets. Use when designing a feature that touches auth, money, personal data, uploads, webhooks or third-party integrations, when someone asks what could go wrong or how this could be attacked, or before a security sign-off on an architecture.
license: MIT
compatibility: Any Agent Skills host. Reads design docs and code only; no tools required.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Threat modelling (STRIDE)

Answer four questions for one feature or system: what are we building, what can go wrong, what are we doing about it, and did we do a good enough job. Keep it lightweight: one sitting, one document, a ranked list at the end. This skill designs defences; it does not review a diff line by line (use the security-review skill or the security-reviewer agent for that).

## 1. Set the scope

1. Name the one feature, service or flow being modelled. If the request is "the whole platform", **stop and ask** which flow matters most and model that first.
2. Collect what exists: design doc, ticket, API spec, architecture diagram, or the code if it is already built (search for route definitions, queue consumers, webhook handlers, cron jobs, outbound HTTP clients).
3. Note the assumptions you are making (hosting, who the users are, which parts are out of scope). List them in the output; a wrong assumption is the most common reason a model misses the real threat.

## 2. Draw the data flow

Write a text data-flow diagram. Use five element types:

| Element | Example |
|---|---|
| External entity | browser user, admin, partner API, payment provider |
| Process | API server, worker, Lambda, LLM agent with tools |
| Data store | Postgres, S3 bucket, Redis, log pipeline |
| Data flow | HTTPS request, queue message, webhook, file upload |
| Trust boundary | internet to edge, app to database, tenant A to tenant B, your code to a third party |

```
[User browser] --HTTPS (session cookie)--> (API) --SQL--> [(orders DB)]
        ======= boundary: internet | VPC =======
(API) --HTTPS (secret key)--> [Payment provider] --webhook (signed)--> (API)
```

Mark every place data crosses a trust boundary. Threats cluster there.

## 3. List the assets

What would hurt if stolen, changed or made unavailable: credentials and tokens, personal data, payment state, money movement, admin capability, availability of a critical path, audit logs, model prompts and tool permissions. Rate each **high, medium or low** by impact.

## 4. Walk STRIDE per element

For each element and each boundary-crossing flow, ask the questions that apply:

| Threat | Property broken | Applies to | Ask |
|---|---|---|---|
| **S**poofing | Authentication | entities, processes | Can someone pretend to be this user, service or webhook sender? |
| **T**ampering | Integrity | flows, stores, processes | Can input, a message, a file or a stored row be changed in transit or at rest? Can the client set a price, role or owner ID? |
| **R**epudiation | Non-repudiation | entities, processes | Could a user deny an action and we can't prove otherwise? Are security events logged with who, what, when? |
| **I**nformation disclosure | Confidentiality | flows, stores, processes | Can data leak via responses, errors, logs, URLs, caches, backups, other tenants, or an LLM's output? |
| **D**enial of service | Availability | flows, stores, processes | Can one caller exhaust CPU, memory, connections, queue depth, paid API quota or disk? Is there a rate limit and size limit? |
| **E**levation of privilege | Authorization | processes | Can a normal user reach admin actions, another tenant's data (IDOR), or code execution via injection or deserialisation? |

Rules while walking:

- Write each threat as **actor + action + asset + consequence**: "An unauthenticated caller replays a captured webhook to mark an unpaid order as paid."
- Only list threats that are plausible for this design. Skip a STRIDE letter for an element when it genuinely does not apply; don't pad.
- Check what already mitigates it (framework CSRF protection, signed webhooks, row-level security). Record it; a threat with a working control is still worth listing at low priority.

## 5. Rate and decide

Rate each threat with a simple likelihood x impact (each high, medium or low). Do not invent precise scores. Then pick one response:

- **Mitigate**: add a control (name the concrete one: "verify HMAC on raw body", "scope query by tenant_id", "argon2id hashing").
- **Eliminate**: remove the feature or data (don't store card numbers; don't log tokens).
- **Transfer**: move it to a provider built for it (hosted payment page, managed identity provider).
- **Accept**: only the user or owner can accept a risk. **Stop and ask** before marking anything high as accepted.

## 6. Check your work

- Every trust boundary has at least one threat considered.
- Every high asset has at least one threat and one control.
- Every mitigation is specific enough to become a ticket and to test.
- Re-read the assumptions: if one is false, which threats change?

## Never

- Never produce a generic OWASP list unrelated to the diagram.
- Never claim the system is secure; say what was modelled and what was not.
- Never mark a high risk as accepted on the user's behalf.
- Never include real secrets, hostnames or customer data from the codebase in the document.

## Output format

```
# Threat model: <feature>
Scope: <what is in and out>    Date: <date>
Assumptions: <bulleted>

## Data flow
<text diagram with trust boundaries marked>

## Assets
| Asset | Impact |

## Threats
| ID | STRIDE | Element / flow | Threat (actor, action, asset, consequence) | Existing control | L | I | Response |

## Prioritised mitigations
1. [high] T3, T7: <concrete control> (owner: ?, test: <how to prove it works>)
2. ...

## Open questions
<things only the team can answer>
```

Order the mitigations by risk (high likelihood and high impact first), and group threats fixed by one control into a single line.
