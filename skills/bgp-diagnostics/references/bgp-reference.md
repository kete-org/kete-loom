# BGP reference

## FSM states (RFC 4271)

`Idle` → `Connect` → `Active` → `OpenSent` → `OpenConfirm` → `Established`. `Connect` and `Active` mean TCP to port 179 has not completed. `OpenSent`/`OpenConfirm` mean TCP is up and OPEN messages are being exchanged.

## NOTIFICATION error codes (RFC 4271)

| Code | Meaning | Typical subcodes |
|---|---|---|
| 1 | Message Header Error | bad length or type |
| 2 | OPEN Message Error | 2 Bad Peer AS, 3 Bad BGP Identifier, 4 Unsupported Optional Parameter, 6 Unacceptable Hold Time, 7 Unsupported Capability (RFC 5492) |
| 3 | UPDATE Message Error | malformed attribute list, invalid next hop, malformed AS_PATH |
| 4 | Hold Timer Expired | no keepalive or update within the hold time |
| 5 | Finite State Machine Error | |
| 6 | Cease | see below |

Cease subcodes (RFC 4486): 1 Maximum Number of Prefixes Reached, 2 Administrative Shutdown, 3 Peer De-configured, 4 Administrative Reset, 5 Connection Rejected, 6 Other Configuration Change, 7 Connection Collision Resolution, 8 Out of Resources.

Cisco IOS default timers: keepalive 60 s, hold 180 s. The negotiated hold time is the lower of the two sides.

## Best-path selection, Cisco IOS/IOS-XE order

A path whose next hop is unreachable is not a candidate. Then:

1. Highest weight (Cisco-local, not advertised)
2. Highest local preference (default 100)
3. Locally originated (`network`, redistribution, aggregate)
4. Shortest AS_PATH (an AS_SET counts as 1; skipped with `bgp bestpath as-path ignore`)
5. Lowest origin: IGP < EGP < Incomplete
6. Lowest MED, compared only between paths from the same neighbor AS unless `bgp always-compare-med` (set it AS-wide or not at all)
7. eBGP over iBGP
8. Lowest IGP metric to the next hop
9. Multipath decision, if `maximum-paths` is set
10. Oldest eBGP path (skipped with `bgp bestpath compare-routerid`)
11. Lowest router ID (originator ID with route reflection)
12. Shortest cluster list
13. Lowest neighbor address

Other vendors follow the same broad order without weight; Junos and FRR differ in details (for example MED handling and the oldest-path step). Check the vendor's doc for the exact release.

## Well-known communities

| Community | Value | Effect |
|---|---|---|
| NO_EXPORT | 65535:65281 | Do not advertise outside the AS (or confederation) |
| NO_ADVERTISE | 65535:65282 | Do not advertise to any peer |
| NO_EXPORT_SUBCONFED | 65535:65283 | Do not advertise to external peers, including other confederation member ASes |
| GRACEFUL_SHUTDOWN | 65535:0 | RFC 8326: receiver lowers local preference before planned maintenance |
| BLACKHOLE | 65535:666 | RFC 7999: request the neighbor to discard traffic to the prefix (only if the neighbor supports it) |

Regular communities are `ASN:value` (RFC 1997). Large communities are `ASN:value1:value2` (RFC 8092) and are needed for 4-byte ASNs. Provider-specific action communities (prepend, local-pref, no-export to a region) are documented by each provider; look them up, never guess. On IOS, communities are only sent to a neighbor with `neighbor <ip> send-community` (`both` or `extended`/`large` as needed).

## RPKI route origin validation (RFC 6811)

Result per route: Valid (a ROA covers the prefix with the same origin AS and the prefix length is within max-length), Invalid (covered but wrong origin or too long), NotFound (no covering ROA). Many networks drop Invalid.

## Command equivalents

| Task | Cisco IOS/IOS-XE | Junos | Arista EOS | FRR (vtysh) |
|---|---|---|---|---|
| Summary | `show bgp ipv4 unicast summary` | `show bgp summary` | `show ip bgp summary` | `show bgp summary` |
| Neighbor detail | `show bgp ipv4 unicast neighbors <ip>` | `show bgp neighbor <ip>` | `show ip bgp neighbors <ip>` | `show bgp neighbors <ip>` |
| Prefix detail | `show bgp ipv4 unicast <prefix>` | `show route <prefix> detail` | `show ip bgp <prefix>` | `show bgp ipv4 unicast <prefix>` |
| Sent to peer | `show bgp ipv4 unicast neighbors <ip> advertised-routes` | `show route advertising-protocol bgp <ip>` | `show ip bgp neighbors <ip> advertised-routes` | `show bgp ipv4 unicast neighbors <ip> advertised-routes` |
| Received from peer (before policy) | `... neighbors <ip> received-routes` (needs `soft-reconfiguration inbound`) | `show route receive-protocol bgp <ip>` | `show ip bgp neighbors <ip> received-routes` | `... neighbors <ip> received-routes` (configure `soft-reconfiguration inbound` to keep the pre-policy table) |
| Soft refresh inbound (operator runs) | `clear bgp ipv4 unicast <ip> soft in` | `clear bgp neighbor <ip> soft-inbound` | `clear ip bgp <ip> soft in` | `clear bgp ipv4 unicast <ip> soft in` |

Check whether `received-routes` / `receive-protocol` output on your release is before or after inbound policy before drawing conclusions from it.

## Sources

- RFC 4271 (FSM, NOTIFICATION codes, OPEN subcodes, hold time): https://www.rfc-editor.org/rfc/rfc4271
- RFC 4486 (Cease subcodes): https://www.rfc-editor.org/rfc/rfc4486
- RFC 5492 (subcode 7, Unsupported Capability): https://www.rfc-editor.org/rfc/rfc5492
- IANA well-known communities: https://www.iana.org/assignments/bgp-well-known-communities/
- RFC 8092 (large communities), RFC 6811 (origin validation), RFC 8212 (eBGP default reject)
- Cisco best-path algorithm: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html
- Cisco IOS BGP timers (`neighbor timers`): https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp4.html
- FRR BGP (`ebgp-requires-policy`, show and clear commands): https://docs.frrouting.org/en/latest/bgp.html
- Junos `clear bgp neighbor`: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/ref/command/clear-bgp-neighbor.html
