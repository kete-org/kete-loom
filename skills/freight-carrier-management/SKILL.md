---
name: freight-carrier-management
description: Truckload, LTL and intermodal carrier sourcing and governance for shippers and brokers, covering FMCSA operating authority and safety record checks on SAFER and SMS, certificates of insurance and cargo cover, double-brokering and identity fraud red flags, lane rate benchmarking against spot and contract indices, carrier scorecards for on-time, tender acceptance and claims, routing-guide tendering, and contract and rate negotiation. Use when onboarding or vetting a new carrier, running a freight bid or RFP, building a routing guide or carrier scorecard, or deciding which carriers to keep, grow or drop on a lane.
license: MIT
compatibility: Any Agent Skills host. FMCSA lookups need network access to safer.fmcsa.dot.gov and ai.fmcsa.dot.gov; rate benchmarks need the user's own index or TMS data. US-centred; other countries have their own carrier registers. Not legal or insurance advice.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Freight carrier management

Put only legitimate, insured, safe carriers on your freight, pay a defensible rate for each lane, and keep the routing guide honest with data. This skill covers the carrier base before and between loads. A shipment that has already gone wrong (late, damaged, lost) belongs to the `logistics-exception-management` skill; duties and border paperwork to `customs-trade-compliance`.

## 0. Scope the job

Ask the user, then restate:

1. Mode and equipment: truckload (dry van, reefer, flatbed), LTL, intermodal (rail with drayage), or a mix.
2. Lanes: origin and destination (3-digit ZIP or city), annual or weekly volume, seasonality, hazmat or temperature control.
3. Who the user is: a shipper buying from carriers and brokers, or a broker buying from carriers. Brokers carry their own FMCSA duties.
4. The output wanted: onboarding checklist, vetting result for named carriers, bid package, scorecard, or negotiation plan.

If lane volumes or service requirements are missing, **stop and ask**: a bid or benchmark without them is guesswork.

## 1. Vet a carrier before the first load

Run every check and record the date, the source and the result.

1. **Identity.** Get the USDOT number (and MC/docket number if issued) from the carrier, not from an email signature. Look it up on SAFER Company Snapshot (safer.fmcsa.dot.gov). Check legal name, DBA, physical address, phone, power units and drivers match what the carrier told you. FMCSA has been moving to a USDOT-number-only identifier; check the current FMCSA registration guidance before relying on MC numbers in your process.
2. **Authority.** On FMCSA Licensing and Insurance (L&I), operating authority for the right type (common or contract carrier of property; broker is a separate authority) must be `ACTIVE`, not pending, revoked or inactive. Note the authority grant date: very new authority is higher risk, not disqualifying.
3. **Safety.** Read the safety rating (Satisfactory, Conditional, Unsatisfactory, or not rated) and the SMS results at ai.fmcsa.dot.gov/SMS: out-of-service rates against the national average, crash history, and any category marked as over the intervention threshold. FMCSA has announced a revised SMS methodology that replaces the BASICs with new safety categories; read whichever version is live and record which one you used. Unsatisfactory or out-of-service: do not use.
4. **Insurance.** Get the certificate of insurance from the agent, not the carrier, and confirm it with the agent by phone or email to an address you found yourself. Check: auto liability at or above the federal minimum for the commodity ($750,000 for general freight in interstate commerce over 10,001 lb GVWR under 49 CFR 387.9; more for hazmat) and at or above your own contract minimum (many shippers require $1,000,000); cargo cover sized to your highest load value, with exclusions read (reefer breakdown, unattended vehicle, theft, high-value commodities); general liability if they come on site; you named as certificate holder or additional insured as your contract requires. Federal filings on L&I must match. Cargo cover is not federally required for general freight, so your contract must require it.
5. **Brokers.** When the capacity comes from a broker, check broker authority (separate from carrier authority) is `ACTIVE` on L&I and that its $75,000 financial security (BMC-84 surety bond or BMC-85 trust fund, 49 CFR 387.307) is on file. Ask which carriers they use and whether they vet them to your standard.
6. **Paperwork.** Signed carrier agreement, W-9, remit-to details, and for brokers buying capacity, the carrier's acceptance of your no-re-brokering clause.
7. **Fraud red flags** (any one means **stop and escalate** to whoever owns carrier risk):
   - Contact email on a free domain that does not match the SAFER record, or phone numbers that changed recently.
   - Recent change of address, ownership or contact details, or dormant authority suddenly active.
   - Remit-to bank account changed by email; verify any payment change by calling a number already on file.
   - Rates far below market with eager acceptance, or the truck's DOT on arrival differs from the one booked (double brokering).
   - Equipment count on SAFER that cannot cover the loads being accepted.
8. Use a carrier-monitoring service (the user's choice) for continuous alerts on authority, insurance and safety changes. Re-vet at least yearly and on any alert.

## 2. Benchmark the rate

1. Break every rate into linehaul, fuel surcharge (and the table it references, usually tied to the US EIA weekly diesel price), and accessorials (detention, layover, stop-off, lumper, liftgate, TONU).
2. Compare linehaul per mile, ex-fuel, against the user's own history for the lane and a market index they subscribe to (spot and contract). State the index, date and date range; never invent a market rate.
3. LTL is priced differently: base rate from a tariff (a carrier's own, or a neutral base such as SMC3 CzarLite), a discount percentage, an absolute minimum charge, freight class from density, and accessorials. Compare net cost per shipment on a sample of real shipments, not discount percentages.
4. Intermodal: compare door-to-door all-in against truckload, including drayage both ends, chassis, and transit days. It usually suits lanes long enough to absorb the extra handling and that tolerate longer transit.
5. Flag lanes where the contract rate is well below spot: tender rejections will follow.

## 3. Run a bid

1. Package: lanes with volume, equipment, service requirements, accessorial schedule, fuel table, payment terms, insurance minimums and contract term.
2. Invite only vetted carriers and brokers; give a deadline and a fixed response template (one row per lane).
3. Award per lane: a primary, one or two backups, and a spot fallback. Weigh rate against scorecard history, not rate alone.
4. Confirm awards in writing with committed volume (a range, not a promise you cannot keep) and the rate validity period.

## 4. Routing guide and tendering

- Tender in routing-guide order with a response deadline (for example 2 hours for next-day pickup). On rejection, go to the next carrier; log every tender, acceptance and rejection with time.
- Track tender acceptance rate per carrier and lane. A primary below the agreed acceptance level for several weeks gets a conversation, then a re-sequence.
- Never tender to an unvetted carrier because a load is urgent; use a vetted broker instead.

## 5. Scorecard

Score monthly per carrier, from shipment data, with the same definitions for everyone:

| Metric | Definition |
|---|---|
| Tender acceptance | accepted tenders / tenders offered |
| On-time pickup | picked up within the appointment window / pickups |
| On-time delivery | delivered within window / deliveries |
| Tracking compliance | loads with location updates at the agreed interval / loads |
| Claims ratio | claim value / freight spend, and claim count / loads |
| Invoice accuracy | invoices paid without dispute / invoices |
| Cost | average cost per mile or per shipment vs lane benchmark |

Share the scorecard with the carrier before acting on it. Decide grow / hold / improve plan / exit per carrier, with the numbers that drove it.

## 6. Contract and negotiation

- Terms to set: liability for cargo loss (Carmack Amendment applies to interstate carriers by default; any limit must be agreed in writing), claims filing and payment periods, indemnity, insurance minimums, no re-brokering, confidentiality, payment terms, fuel table, accessorial schedule, detention free time, and termination.
- Negotiate with data: lane history, volume certainty, payment speed, and drop-trailer or fast load and unload times are worth rate.
- **Stop and ask the user to involve a transportation lawyer** for indemnity changes, cargo liability limits, broker-carrier agreements, or anything the carrier redlines in liability or insurance. Drafting the agreement itself belongs to the `contract-drafting` skill.

## Rules

- Never book a carrier whose authority is not active or whose insurance you have not confirmed with the agent.
- Never change remit-to bank details on email instructions alone.
- Never state a market rate, FMCSA rule or insurance minimum you have not checked on the day; record source and date.
- Do not use a carrier's safety data to rank drivers or make employment decisions; it is a carrier-level signal.

## Report

```
Carrier vetting: <legal name> | USDOT <n> | checked <date>
- Authority: <type, status, granted date>       source: L&I
- Safety: <rating>; SMS: <categories flagged / none>  methodology: <BASICs | revised>
- Insurance: auto <limit>, cargo <limit, key exclusions>; confirmed with <agent, date>
- Red flags: <none | list>
- Decision: approve | approve with conditions | reject | escalate
```

For a bid or scorecard: lane table (lane, volume, incumbent rate, benchmark with source and date, bids, award), carrier scorecard table, decisions with reasons, and items that need legal or insurance review.
