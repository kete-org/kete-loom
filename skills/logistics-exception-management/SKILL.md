---
name: logistics-exception-management
description: Shipment exception handling for parcels and freight that are late, damaged, lost, refused or stuck on a bad address, covering triage by exception type, evidence capture, carrier claim deadlines, customer messages, SLA clocks and a root-cause log that shows which lane, carrier or packaging keeps failing. Use when a delivery has gone wrong and someone must decide what to do, when building an exceptions queue or claims tracker, or when setting up rules and templates for delay, damage and loss cases.
license: MIT
compatibility: Any Agent Skills host. Works from carrier tracking exports, a ticket or order system, or a spreadsheet tracker; carrier API calls need network access.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Logistics exception management

Turn every failed delivery into one tracked case with an owner, a deadline and a cause. Resolve the customer first, recover money from the carrier second, and fix the pattern third.

## 0. Before you act

1. Identify the shipment: order ID, tracking or waybill number, carrier and service, origin and destination, ship date, declared value, and the Incoterm or shipping terms if B2B.
2. Get the latest carrier scan events and the promised delivery date.
3. Find the policy that applies: your customer SLA (reship or refund rules), the carrier's contract or tariff, and any insurance.

If you cannot tell who bears the risk in transit (seller, buyer or carrier), **stop and ask the user**. That decides who files the claim.

## 1. Triage by exception type

| Type | Signals | First action |
|---|---|---|
| Delay | No scan for 2+ business days, missed promised date, weather or customs hold | Open a trace with the carrier; tell the customer with a new ETA |
| Address issue | "Address incomplete", "Recipient moved", return-to-sender pending | Contact the customer to confirm the address; request an address correction from the carrier before it returns |
| Damage | Customer photos, "damaged" scan, refused delivery | Collect evidence (below); decide reship or refund; keep the goods and packaging |
| Loss | Tracking stops, carrier confirms not found, or "delivered" but customer says not received | Open a trace; for "delivered not received" check GPS/photo proof of delivery and neighbours before claiming |
| Customs hold | "Clearance delay", duties unpaid, documents requested | Send the missing document or payment; route classification questions to the customs-trade-compliance skill |
| Refused / undeliverable | Recipient refused, unpaid COD or duties | Decide: return, abandon or re-deliver, by goods value vs return cost |

Set a severity: **P1** high value, perishable, medical or a key account; **P2** standard order past SLA; **P3** informational (delay inside SLA).

## 2. Evidence for damage and loss

Collect within the carrier's window, before anything is thrown away:

- Photos of the outer box (all sides, labels), inner packaging, and the damaged item with the serial or SKU visible.
- Weight at dispatch vs weight at delivery if available.
- Commercial invoice or proof of value, packing list, and proof of delivery (signature, notes, photo).
- For freight: the delivery receipt or bill of lading with exceptions written on it. A clean signature with no noted damage makes a claim much harder. Train receivers to write the specific damage (for example "3 cartons crushed, 1 wet") before signing; a generic "subject to inspection" note often does not protect the claim.

## 3. Carrier claims

1. Check the carrier's own terms for filing windows and liability limits. They vary by carrier, service and contract; read the current tariff instead of assuming.
2. Reference points that are set by law, not the carrier:
   - US interstate motor freight (Carmack Amendment, 49 U.S.C. 14706): carriers may not set a claim filing period shorter than 9 months (standard bill of lading terms count it from delivery, or from when a reasonable time for delivery has passed), nor less than 2 years to sue after a claim is declined.
   - International air cargo (Montreal Convention, Article 31): written complaint within 14 days of receipt for damage and within 21 days of being placed at disposal for delay. Any court action must start within 2 years (Article 35), which is the outer limit for a lost shipment.
3. Claim the provable value (invoice cost, or as the contract says) up to the liability limit; declared value or cargo insurance governs anything above it.
4. Record claim number, amount, date filed, deadline and status. Chase at fixed intervals.

Never miss a filing window to wait for a perfect evidence pack; file on time and add documents later if the carrier allows it.

## 4. Customer communication

- First message within your SLA (for example same business day for P1). Say what happened, what you are doing, and when they will next hear from you.
- Offer the resolution your policy allows: reship now, refund, or wait for trace. Do not make the customer wait for the carrier claim to finish.
- Never blame the carrier in a way that implies the customer must chase them; the seller owns the relationship.
- Use templates per exception type; keep the tracking link and case ID in every message.

## 5. SLA clocks

Track per case: opened at, first customer response at, carrier trace opened at, resolution offered at, claim filed at, closed at. Report breaches by type and carrier.

## 6. Root-cause log

Every closed case gets one primary cause from a fixed list: carrier handling, packaging, address data, warehouse pick/pack, customs documentation, weather/force majeure, customer unavailable, fraud suspected, unknown. Review weekly:

- Exception rate by carrier, service, lane and packaging type.
- Repeated "delivered not received" by address or customer, which may be fraud; send to a person, do not auto-block.
- Address errors traced to checkout validation.

## Rules

- Never promise a refund or reship outside written policy without the user's approval.
- Never discard damaged goods or packaging before the carrier says the claim does not need an inspection.
- Never file a claim or contact a carrier on the user's behalf without confirmation.
- Do not state a carrier's deadline or liability limit you have not read in its current terms.

## Case record and report

```
case_id | order_id | tracking | carrier/service | type | severity | opened | sla_due | customer_action | claim_no | claim_deadline | claim_amount | status | root_cause
```

Summary for a review: open cases by type and age, SLA breaches, claims filed vs recovered, and the top three root causes with a proposed fix each.
