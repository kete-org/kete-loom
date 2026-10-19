---
name: vendor-evaluation
description: Buyer-side selection of a SaaS or software vendor - agreeing weighted must-have and scored criteria with stakeholders before any demo, checking each vendor's claims against its documentation, public status history, pricing pages, security reports and customer references, logging contradictions and unanswered questions, asking about security, data processing, lock-in and exit costs, and producing a scored comparison with a recommendation and its risks. Use when a team is choosing between software tools or platforms, writing an RFP or shortlist, sanity-checking a sales pitch, or needs a defensible record of why one vendor was picked.
license: MIT
compatibility: Any Agent Skills host. Web access helps for checking public documentation, status pages and pricing.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Vendor evaluation

Pick software the way an auditor would want it picked: criteria first, evidence for every score, and a clear note of what nobody could confirm. You work for the buyer, not for any vendor.

## Ground rules

1. **Criteria and weights before vendors.** Agree them with the people who will use, pay for and secure the tool, and freeze them before the first demo. Changing weights after seeing scores is how a favourite wins.
2. **Separate must-haves from scored criteria.** A must-have is pass or fail (for example data residency in the EU, SSO via SAML, an API for X). A vendor that fails one is out, however well it scores elsewhere.
3. **Every score cites evidence.** Each score links to a document, a test, a reference call, or is marked "vendor claim, unverified". Marketing pages and sales decks count as claims.
4. **Public sources first, then the vendor.** Read docs, API reference, changelog, status page history, pricing page, terms, data processing agreement and subprocessor list before talking to sales, so you know which claims to test.
5. **Total cost, not list price.** Include licences at the expected seat count in year 3, implementation, integration, training, add-ons sold separately, overage pricing, price-increase caps and exit cost.
6. **No confidential data to vendors during evaluation** without an NDA and the data owner's agreement.

## Steps

1. **Frame the decision**: the problem, who decides, budget range, deadline, and what happens if nothing is bought. Stop and ask if no one owns the decision.
2. **Draft criteria** in five groups: functional fit, technical (integration, API, performance, admin), security and compliance, commercial (cost, terms, vendor viability), and support and exit. Mark must-haves; give scored criteria weights that sum to 100. Get sign-off.
3. **Long list to shortlist**: apply must-haves using public sources only; keep three to five vendors. Record why each excluded vendor was dropped.
4. **Evidence pass per vendor**, using the question bank below. Log each claim with its source and status: verified, contradicted, or unverified.
5. **Hands-on test**: a scripted trial or proof of concept using your own realistic (non-sensitive) scenarios, the same script for every vendor, scored by the people who will use it.
6. **References**: speak to at least two customers of similar size and use case, ideally ones you found yourself rather than the vendor's picks. Ask what went wrong and what they would negotiate differently.
7. **Score**: 1 to 5 per criterion against written anchors (1 = does not meet, 3 = meets, 5 = exceeds with evidence), multiply by weight, total. Run a sensitivity check: does the winner change if the top two weights move by 10 points?
8. **Recommend** with the risks of the winner and how to mitigate them in the contract.

## Question bank

- **Security**: current SOC 2 Type II report or ISO/IEC 27001 certificate (scope and date), last penetration test summary, SSO and SCIM support, MFA enforcement, encryption at rest and in transit, incident notification time, a completed standard questionnaire (for example CAIQ or SIG) if your security team uses one.
- **Data**: where data is stored and processed, subprocessor list and change notice, DPA terms, retention and deletion on request, whether customer data trains the vendor's models, and how to opt out.
- **Reliability**: uptime commitment and how it is measured, service credits, status page history for the last 12 months, support hours and response times by severity.
- **Exit**: export formats and completeness (including attachments and history), API rate limits for bulk export, termination assistance, data deletion certificate, notice periods and auto-renewal terms.
- **Viability**: years trading, funding or profitability signals, customer count in your segment, product roadmap commitments in writing only.
- **Contradictions to look for**: features in the deck missing from the docs, "unlimited" plans with fair-use caps in the terms, uptime claims beyond the status history, certifications whose scope excludes the product you are buying.

## Stop and ask the user

- Before any criterion or weight changes after vendor scoring has started.
- When a must-have is failed by every vendor: relax it, build, or wait is the user's call.
- On contract terms: liability caps, indemnities and data protection terms need review by legal and, for personal data, the privacy lead. This skill does not give legal advice.

## Never

- Accept a vendor's comparison chart as evidence about competitors.
- Score a criterion without a source or an "unverified" mark.
- Share one vendor's pricing or proposal with another.

## Report format

```
# Vendor evaluation: <category>, <date>
Decision owner: <name/role>   Deadline: <date>   Budget: <range>

## Criteria (frozen <date>)
Must-haves: <list>
| criterion | group | weight | 1/3/5 anchors |

## Shortlist and exclusions
| vendor | status | reason |

## Scores
| criterion | weight | vendor A | vendor B | vendor C |   (score, evidence ref)
| weighted total | | | | |
Sensitivity: <does the ranking hold?>

## 3-year cost
| item | A | B | C |

## Contradictions and open questions
| vendor | claim | evidence | status |

## Recommendation
<vendor>, because <reasons>. Risks: <list> -> contract asks: <list>.
```
