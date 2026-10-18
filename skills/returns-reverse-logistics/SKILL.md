---
name: returns-reverse-logistics
description: Returns and reverse-logistics flow design for physical goods, from writing the return policy and issuing RMA authorisations to receiving, inspecting and grading items, routing each one to restock, refurbish, liquidate, recycle or dispose, timing the refund against receipt, and flagging return-fraud patterns such as wardrobing, item swaps and empty boxes. Use when building or fixing a returns portal, RMA workflow or grading rules, deciding when refunds are released, or reducing return losses and abuse.
license: MIT
compatibility: Any Agent Skills host. Applies to a store platform, WMS, order system or spreadsheet; consumer law references are EU/UK and must be checked for other markets.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Returns and reverse logistics

Every return becomes an RMA with a reason, a physical route and a money outcome, and each step changes one status. The goal is to recover the most value per returned unit while refunding honest customers fast.

## 0. Before you design

Ask for, or find in the codebase and docs:

1. Markets sold into, and whether customers are consumers or businesses. Consumer law sets minimum rights you cannot design away.
2. Product types: apparel, electronics with serials, perishables, hygiene items, made-to-order. Each has different returnability.
3. Current return rate and top reasons, if known.
4. Who pays return shipping, and whether you use prepaid labels, drop-off points or the customer's own carrier.
5. Systems: order system, store platform, WMS, payment provider (for refunds).

If the user wants a policy that may breach consumer law in a market (for example no returns at all for distance sales to EU consumers), **stop and say so**; a lawyer must sign off the final policy text.

## 1. Return policy

Decide and write down:

- Return window and when it starts (delivery date, not order date).
- Condition rules: unused, tags on, original packaging; what is non-returnable (sealed hygiene items once unsealed, perishables, custom items) where the law allows.
- Who pays return shipping per reason (defect or wrong item: seller; change of mind: per policy).
- Refund method (original payment method by default), exchange and store-credit options.
- Restocking fees, only where legal and disclosed before purchase.

Legal floor examples, verify current law per market:
- EU (Consumer Rights Directive 2011/83/EU) and UK (Consumer Contracts Regulations 2013): consumers have 14 days to withdraw from a distance sale, and the trader must refund within 14 days of being told, but may hold the refund until it receives the goods or proof they were sent back, whichever is first.
- Faulty goods have separate statutory remedies that a change-of-mind policy does not limit.

## 2. RMA process

States: `requested -> authorised -> label_issued -> in_transit -> received -> inspected -> dispositioned -> refunded | exchanged | rejected -> closed`.

1. Customer requests a return with order line, quantity and a **reason code** from a fixed list (wrong size, not as described, defective, damaged in transit, changed mind, arrived late, other + text).
2. Auto-authorise inside policy; route exceptions (outside window, high value, repeat returner) to a person.
3. Issue the RMA number and label; print the RMA on the label or packing slip so the warehouse can match the parcel.
4. Damaged in transit goes to the logistics-exception-management flow for a carrier claim, not just a return.

## 3. Receive, inspect, grade

- Scan the RMA on arrival; record date, weight and photos for high-value items.
- Check: correct item (SKU, serial or IMEI matches the outbound record), quantity, condition, accessories, signs of use.
- Grade on a fixed scale with written criteria and photo examples:

| Grade | Meaning | Default route |
|---|---|---|
| A | As new, sealed or unworn, full packaging | Restock as new |
| B | Opened, fully working, light packaging wear | Restock as open-box or B-stock |
| C | Cosmetic damage or missing accessories, works | Refurbish or sell as graded |
| D | Faulty or heavily damaged | Repair if cost < recovery value, else return to vendor, recycle or dispose |
| X | Wrong item, empty box or tampered | Hold, fraud review, no refund until resolved |

Set an inspection SLA (for example 2 business days from receipt) because refunds wait on it.

## 4. Disposition rule

For each graded unit: compare **recovery value** (resale price at that grade minus refurbish, repack and handling cost) across restock, refurbish, return to vendor, liquidate, donate, recycle and dispose. Pick the highest; prefer restock or refurbish over disposal. Log the decision so finance can book the right inventory value. Check vendor return-to-vendor terms and any rules on disposing of unsold goods in your markets.

## 5. Refund timing

- Pick the trigger per risk: on carrier first scan (fast, more fraud exposure), on receipt, or on inspection (slowest). Low-value, low-risk items can refund on first scan; high-value and serialised items refund on inspection.
- Respect the legal maximum where it applies (section 1), so inspection must be fast enough to fit inside it.
- Refund through the payment provider's refund API, keyed by an idempotency key per RMA so a retry cannot refund twice.
- Partial refunds for missing parts or wear only where the policy and law allow, with the reason and photos stored.

## 6. Fraud and abuse signals

Flag for review, never auto-ban:
- Wardrobing: worn items returned (deodorant, makeup, removed tags reattached), often after events.
- Item swap: serial mismatch, counterfeit or older model returned.
- Empty box or weight far below the outbound weight.
- Serial returner: return rate far above peers, many "not received" plus "defective" claims.
- Refund to a different payment method than the purchase, or return from a different address.

## Rules

- Never auto-refuse a refund that the law requires; route doubtful cases to a person.
- Never release a refund twice for one RMA; check status and idempotency.
- Never restock a returned item as new without grading.
- Do not publish policy text as legally compliant; tell the user it needs legal review.

## Report

For a design: the policy summary, the RMA state machine, the grading table, disposition and refund-trigger rules, and the integration points. For a review of existing returns: return rate and top reasons, average days from receipt to refund, recovery value per return, fraud flags raised and confirmed, and the three changes with the biggest saving.
