---
name: network-design
description: Produces a vendor-neutral design for an enterprise campus or multi-site network before anything is configured, from requirements and an aggregatable IPv4 and IPv6 addressing plan through OSPF area layout, the BGP edge to ISPs, VLANs, VRFs and segmentation zones, first-hop redundancy and dual uplinks, WAN or SD-WAN topology, and a staged cutover plan with rollback points and validation tests. Use when planning a new office, data centre or branch network, redesigning a flat or outgrown network, merging two company networks, choosing between MPLS, internet VPN and SD-WAN, or writing the migration plan for a network change that must not cause an outage.
license: MIT
compatibility: Any Agent Skills host. Produces design documents and plans; no device access needed. Device configuration belongs to the vendor or automation skills.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Network design

Turn requirements into a network design someone can build and migrate to safely. This skill decides what the network should be. Typing the config is for the Cisco IOS or network automation skills, diagnosing faults is for network troubleshooting or BGP diagnostics, and a home lab is for the homelab skill.

## 0. Gather requirements (stop and ask for anything missing)

Write down, per site: users and devices now and in three years, critical applications and where they run (on site, data centre, cloud), required uptime, existing hardware and contracts, ISPs and circuits, compliance zones (card data, OT/industrial, guest), and the team's operational skills. Ask for the existing addressing and any overlapping ranges from partners or acquired companies.

Do not design until you know the growth figure, the uptime target and which systems must be isolated.

## 1. Addressing plan

1. Pick a private IPv4 supernet per organisation from RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and give each site one contiguous block so it summarises to a single route (for example `10.<site>.0.0/16`). Avoid `192.168.0.0/24` and `192.168.1.0/24` (home VPN clashes) and anything a partner or cloud VPC already uses.
2. Inside a site, carve by function in fixed positions so every site looks alike: infrastructure (loopbacks `/32`, point-to-points `/31` per RFC 3021), management, users, voice, wireless, servers, IoT, guest.
3. Size each subnet for the three-year count plus 30 to 50 percent; prefer `/24` for user VLANs for readability unless hosts exceed it.
4. IPv6: get a provider-independent or provider-assigned prefix, give each site a `/48` (or `/56` for small sites), each VLAN a `/64`. Map the VLAN ID into the IPv6 subnet ID where it fits so addresses are readable.
5. Reserve blocks for future sites and for NAT, VPN client pools and cloud.
6. Record the plan as a table: site, function, VLAN ID, IPv4 prefix, IPv6 prefix, gateway, DHCP scope, zone.

## 2. Routing design

- **Interior:** use OSPF (or IS-IS) with area 0 as the backbone. Put each site or region in its own area attached to area 0, and summarise at the area border routers. Use stub or totally stubby areas for branches with one way out. Keep area 0 small and contiguous.
- **Static routes** only for stub edges with no alternative path, and always with a tracked next hop or floating backup.
- **BGP edge:** needs your own public ASN and provider-independent (or ISP-assigned and portable) address space; without them, use each ISP's default route with tracked failover and NAT per ISP, and ask the user before planning an ASN or PI request. With them: eBGP to each ISP. Advertise only your own aggregates (inbound and outbound prefix lists, max-prefix limits), register ROAs for RPKI, use local preference to choose the primary exit and AS-path prepending or provider communities to steer inbound traffic. Take default routes, or full tables only if the routers have the memory and you need the path choice. Use iBGP between edge routers.
- **Cloud and partners:** BGP over IPsec or the provider's private interconnect; filter what each side may send.
- Make the failure behaviour explicit: for each link and device, write which path traffic takes when it fails and how long convergence takes (BFD where sub-second matters).

## 3. Layer 2 and segmentation

1. Use a collapsed core (core plus access) for one building, three tiers (core, distribution, access) for campuses. Route at the distribution or core; keep VLANs local to an access block, never stretched across the campus or between sites without a clear need (and then use EVPN/VXLAN, not spanning tree across a WAN).
2. One VLAN per function per access block. Disable unused ports into a parking VLAN; never carry user traffic on VLAN 1; native VLAN unused.
3. Spanning tree: rapid PVST+ or MST, root bridge pinned on the distribution pair, BPDU guard on edge ports.
4. Segment by zone (users, servers, management, guest, IoT, card data, OT) with VRFs or firewall zones. Write the inter-zone policy as a matrix (source zone, destination zone, allowed services) with default deny.
5. Management network out of band or in its own VRF; only jump hosts reach it.
6. Port security with 802.1X/NAC where the organisation can operate it; otherwise MAC limits and DHCP snooping with dynamic ARP inspection.

## 4. Redundancy

- Gateways: a first-hop redundancy protocol (VRRP per RFC 5798 is the open standard; HSRP or GLBP on Cisco) or an active-active design such as anycast gateways in EVPN, or multi-chassis link aggregation (vPC, MLAG, StackWise Virtual) with LACP uplinks.
- Every access switch dual-homed to two distribution switches; every distribution switch to two core switches.
- Two ISPs with different physical paths into the building, on two edge routers and two firewalls in an HA pair.
- Power: dual PSUs on separate feeds, UPS for core, edge and wireless controllers.
- Write down single points of failure that remain and why they are accepted.

## 5. WAN and SD-WAN

| Option | Choose when |
|---|---|
| MPLS L3VPN | strict latency or SLA needs, carrier-managed QoS, budget allows |
| Internet with IPsec (hub and spoke or full mesh) | few sites, cost first, team can run VPNs |
| SD-WAN | many sites, mixed circuits (broadband, LTE/5G, MPLS), need application-aware path choice and central policy |

For SD-WAN: two transports per important site, central controller design and its failure mode, local internet breakout with security (SSE/firewall), QoS classes for voice and critical apps, and how SD-WAN routes are redistributed into OSPF/BGP without loops (tags, filters). Confirm vendor features and licensing with the vendor; do not assume them.

## 6. Migration plan

Write a staged plan. Every stage has: scope, prerequisites, a maintenance window, exact steps, validation tests, a go/no-go decision, and a rollback that is tested and timed.

1. Stage 0: document the current state (configs backed up, current routing tables and traffic baselines captured).
2. Build the new core or edge in parallel where possible; connect it with a temporary routed link.
3. Move one low-risk segment or pilot site first; run it for a defined soak period.
4. Move remaining segments in batches, critical systems last, never all in one window.
5. Decommission old paths only after the soak and after removing their routes.
6. Rollback triggers: name them up front (for example, a critical app unreachable for 5 minutes, routing table size off by more than 10 percent).

Validation per stage: reachability between every zone pair the policy allows (and denial for the ones it blocks), gateway failover by shutting one device, ISP failover, DNS and DHCP from each VLAN, application tests by their owners.

## Never

- Never reuse an address range that overlaps another site, partner or cloud network.
- Never advertise more than your own aggregates to an ISP or accept routes without filters.
- Never plan a cutover without a tested rollback and a named person who decides go or no-go.
- Never stretch Layer 2 between sites to avoid re-addressing without the user accepting the risk.

## Report back

```
Requirements and assumptions: <list, with what the user still has to confirm>
Addressing plan: <table>
Routing: <IGP areas, BGP edge, failure paths>
Segmentation: <zones, VRFs, policy matrix>
Redundancy: <per layer; remaining single points of failure>
WAN: <choice and why>
Migration: <stages with validation and rollback>
Risks and open questions: <list>
```
