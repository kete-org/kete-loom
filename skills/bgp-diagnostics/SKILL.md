---
name: bgp-diagnostics
description: Diagnoses Border Gateway Protocol problems on Cisco, Juniper, Arista and FRR routers by reading neighbor state (Idle, Active, OpenSent, Established) and NOTIFICATION codes, checking which prefixes are received, accepted and advertised through prefix-lists, route-maps and max-prefix limits, walking best-path selection, decoding standard and large communities, spotting RPKI-invalid or leaked routes, and confirming what the internet sees from RIPEstat, RouteViews and other looking glasses. Use when a BGP session will not come up or keeps flapping, a prefix is missing, not propagating or taking the wrong path, a provider says they are not receiving an announcement, or traffic shifted after a routing change or an upstream incident.
license: MIT
compatibility: Any Agent Skills host. Works from pasted router output; live checks need read-only CLI access to the router and web access to public looking glasses and route collectors.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# BGP diagnostics

Find out why a BGP session or route is not doing what the operator expects, using read-only commands and public data, and hand back a cause with evidence and a proposed fix the operator applies.

For NOTIFICATION codes, best-path order, well-known communities and per-vendor command equivalents, read `references/bgp-reference.md`.

## Ground rules

1. **Read-only.** Use `show`/`display` commands and public looking glasses. Never run `clear ip bgp`, `clear bgp`, `neighbor ... shutdown`, policy edits or `soft` resets yourself; propose them and let the operator run them in a window. A hard reset drops every route from that peer.
2. Work from evidence: ask for the exact command output, router platform and OS version, local AS, peer AS and peer address.
3. Separate the two questions: **is the session up?** and **is the route right?** Fix the first before the second.
4. Treat every public looking-glass result as a sample from one vantage point. Check at least two sources before telling the user "the internet can't see it".

## 1. Session not Established

Get `show bgp summary` (or `show ip bgp summary`, Junos `show bgp summary`, FRR `vtysh -c "show bgp summary"`) and `show bgp neighbors <peer>`.

| State seen | Usual cause | Check |
|---|---|---|
| `Idle` | Admin shutdown, no route to peer, max-prefix tripped, or waiting after errors | `show bgp neighbors` last reset reason; `Idle (Admin)` / `Idle (PfxCt)` on IOS |
| `Active` / `Connect` cycling | TCP 179 never completes: wrong peer IP, ACL or firewall, peer not configured, wrong source interface | Ping the peer from the configured source; `update-source` on loopback peers; ACLs and CoPP for TCP 179 |
| `OpenSent` / `OpenConfirm` then reset | OPEN rejected: wrong remote AS, bad router ID, capability or hold-time mismatch, MD5/TCP-AO password mismatch | Logs for NOTIFICATION code 2/x; on IOS `%TCP-6-BADAUTH` means password mismatch |
| Up then flaps every ~3 min | Hold timer expiry: loss, CPU, MTU problems on large updates | NOTIFICATION 4; interface errors; ping with DF at full MTU |
| Up then drops at a prefix count | Max-prefix limit | Cease subcode 1; compare received count to `maximum-prefix` |

Also check:
- eBGP to a non-directly-connected address needs `ebgp-multihop` (or `ttl-security` on both sides), because eBGP packets default to TTL 1.
- Some platforms refuse to send or accept eBGP routes with no policy configured (RFC 8212): IOS-XR ("no policy; defaults to 'drop'", overridable with `bgp unsafe-ebgp-policy`) and FRR in its default traditional profile (`bgp ebgp-requires-policy`, shown as `(Policy)` in `show bgp summary`). Session `Established` with 0 prefixes both ways often means this.
- Address family activated on both sides (`address-family ipv6` + `neighbor ... activate`).

## 2. Prefix missing or wrong

Walk the path step by step and stop at the first step that fails.

1. **Originated?** The prefix is in the local BGP table: `show bgp ipv4 unicast <prefix>`. A `network` statement needs an exact match in the RIB (same mask); otherwise use a static to Null0 or an aggregate.
2. **Advertised?** `show bgp ipv4 unicast neighbors <peer> advertised-routes`. If absent, check outbound prefix-list, route-map, `no-export`/`no-advertise` communities, and iBGP split-horizon (iBGP-learned routes are not sent to other iBGP peers without a route reflector).
3. **Received by the peer?** Ask the peer, or use their looking glass. On your side for inbound routes: `received-routes` needs `soft-reconfiguration inbound` on IOS; otherwise use `show bgp ... neighbors <peer> routes` for accepted routes only.
4. **Accepted?** Inbound filters, max-prefix, AS-path loop (own AS in path; `allowas-in` only if the design needs it), RPKI-invalid dropped by ROV, or IRR-based filters at the provider missing your route object.
5. **Best?** `show bgp ipv4 unicast <prefix>` lists all paths; walk the best-path order in the reference and name the step that decided. Common surprises: weight set on one neighbor, local-pref from a route-map, MED compared only within one neighbor AS, IGP metric to next hop.
6. **Installed?** `show ip route <prefix>`: an IGP or static with lower administrative distance wins; next hop unreachable makes the path invalid (`inaccessible`).

## 3. What the internet sees

For a public prefix or ASN:
- RIPEstat (`stat.ripe.net`): Routing Status, Looking Glass and BGPlay widgets show visibility across RIS collectors and the history of announcements and withdrawals.
- RouteViews collectors (`route-views.routeviews.org` and others) and bgp.tools or bgp.he.net for origin AS, upstreams and visibility.
- RPKI: check the prefix and origin pair is Valid in the RIPEstat RPKI widget or your RIR portal. An Invalid (wrong origin or max-length too short) is dropped by many networks.
- IRR: `whois -h whois.radb.net <prefix>` or the provider's IRR; missing or wrong `route`/`route6` objects cause providers to filter you.
- PeeringDB for the peer's NOC contact, prefix limits they expect, and IX details.

## 4. Common outage causes to rule out

1. ROA created with a max-length shorter than the announced more-specific, or for the wrong origin AS.
2. A route leak: your prefix seen with an unexpected AS in the path, or you announcing learned routes to another provider (missing outbound filter). Check outbound policy matches only your own prefixes.
3. Hijack or more-specific announced by someone else: a different origin AS for your prefix or a longer prefix inside it.
4. Max-prefix tripped after a peer sent a full table.
5. Password, AS or IP changed on one side during maintenance.
6. Policy change applied without a soft refresh, so the new policy never took effect; or a soft reset expected to fix something it cannot.
7. Upstream incident: check the provider status page and RIPEstat for many prefixes moving at once.

**Stop and tell the user to contact the provider or a qualified network engineer** when evidence points at the upstream, a suspected hijack, or a change that would affect transit for the whole network.

## Report back

```
Session: <peer IP / AS> state <state>, last reset <reason/code>
Prefix: <prefix> originated <y/n> advertised <y/n> seen by peer <y/n/unknown> best <y/n, decided at step N>
External view: <sources checked, visibility, RPKI status, IRR status>
Cause: <one sentence>, evidence: <command output lines>
Proposed fix: <exact commands for the operator>, impact: <soft refresh vs session reset>
Not verified: <what was not checked>
```
