---
name: product-naming
description: Name generation for products, open-source projects, packages, features and companies, working from a written naming brief through metaphor and root-word exploration to a long candidate list, screening it for sound, spelling, meaning in other languages and confusion with rivals, then running a required availability gate (domains, npm, PyPI and crates.io names, GitHub organisation, trademark registers) before presenting a ranked shortlist with reasons. Use when someone needs a name for something new, is choosing between candidate names, or wants to know whether a name is taken.
license: MIT
compatibility: Any Agent Skills host. Availability checks need network access (web fetch or curl); whois is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/requires: "curl"
  kete-loom/owner: "Kete-org"
---

# Product naming

Find a name that fits, sounds right and is actually available. The availability gate is not optional: a name nobody has checked is a liability. Deciding positioning, audience and values comes first and belongs to `brand-strategy`; if that brief exists, read it and start from it.

## 0. Naming brief

Get answers before generating anything. Ask for what is missing, in one block:

1. **What is being named** and its kind: company, product, feature, open-source library, CLI, internal codename.
2. **What it does**, in one sentence, and for whom.
3. **Feeling and personality**: three words, plus three it must not be.
4. **Name style wanted or ruled out**: descriptive (Dropbox-like compounds), invented (coined words), real word used out of context, founder or place names, acronyms.
5. **Constraints**: maximum length, must work in which languages and markets, must match an existing product family, must be typeable as a package or command.
6. **Rivals**: names in the space it must not resemble.
7. **Where it must be available**: which domains (.com, country code, .dev, .io), which package registries, social handles, trademark regions and classes.

Write the brief back as a short list and get a yes before step 1.

## 1. Explore territory

Before candidates, map ideas. Produce four to six territories, each a cluster of meaning:

- the job it does (verbs and outcomes),
- metaphors from nature, craft, travel, science, myth or the user's own culture,
- the feeling from the brief,
- roots from Latin, Greek or other languages relevant to the market (check meaning, never guess),
- sound shapes: short and punchy, soft and flowing.

Show the territories to the user and let them strike any before generating names.

## 2. Generate wide

Produce 30-60 candidates across the kept territories, using several techniques: compounds, blends, truncations, altered spellings, real words repurposed, prefixes and suffixes, coined words. Do not self-censor at this stage.

## 3. Screen

Cut candidates that fail any of these, and say which test cut them:

| Test | Fails when |
|---|---|
| Say it | Two reasonable people would pronounce it differently, or it is hard to say aloud. |
| Spell it | Hearing it once is not enough to type it correctly. |
| Meaning | It means something negative, rude or unfortunate in a target market's language or slang. Check, do not rely on memory. |
| Confusion | It is close in sound or spelling to a rival or a well-known product in the same field. |
| Fit | It contradicts the brief's feeling or misdescribes what the thing does. |
| Length | It breaks the length limit or makes an awkward command or package name. |
| Generic | It is a plain descriptive phrase (hard to protect and hard to search for). |

Keep 8-12 survivors.

## 4. Availability gate (required)

Run every check in `references/availability-checks.md` for each survivor, for every channel the brief lists. Record the result and the date. Rules:

- A free registry name or unregistered domain is evidence, not a guarantee; record exactly what you checked.
- A check that errored, was blocked or has no service for that TLD is reported as `not checked`, never as free.
- A name that is taken on the brief's primary channel (the main domain, or the package registry for a library) is cut unless the user accepts a variant.
- Trademark search results are a first screen only. Say so in the report.
- Never register a domain, publish a placeholder package or claim a handle. Report and let the user act.

## 5. Shortlist report

```
Naming: <thing>, brief agreed <date>, checks run <date>

Shortlist (best first)
1. <Name>: <pronunciation>
   Why: <fit with the brief in one or two lines>
   Risks: <sound, meaning or confusion notes>
   Availability: domain <result> | npm <result> | PyPI <result> | crates <result> | GitHub <result> | trademark <result, register and class searched>

Cut at the gate: <name: what was taken>
Cut at screening: <name: test>
Next steps: <for example, run a full clearance search with a trademark professional>
```

Present three to five names. Fewer strong names beat a long list.

## Stop and ask the user when

- The brief is missing what is being named or which markets it is for.
- A favourite name is taken on the main channel: offer variants, but let them decide.
- The name is for a company, a commercial product or anything to be trademarked: state that the automated search is not legal clearance and that a trademark attorney or agent should run a full search in each target region before launch or spending on branding.
