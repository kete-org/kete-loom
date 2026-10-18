# Firewall matrix and DNS details

## Starting matrix

Rows are sources, columns are destinations. "Ports" means only the listed ports; everything not listed is blocked. Adapt it with the user, then turn each cell into rules.

| From \ To | mgmt | trusted | servers | iot | guest | cameras | internet |
|---|---|---|---|---|---|---|---|
| mgmt | allow | allow | allow | allow | no | allow | allow |
| trusted | admin ports (443, 22) | allow | service ports | control ports (casting, app) | no | NVR ports | allow |
| wg (VPN) | admin ports, if wanted | same as trusted | service ports | no | no | NVR ports | per tunnel mode |
| servers | no | no | allow | no | no | NVR pulls streams | allow (updates) |
| iot | no | replies only | specific ports (Home Assistant, MQTT) | allow or no | no | no | allow |
| guest | no | no | no | no | no (client isolation) | no | allow |
| cameras | no | no | NVR only | no | no | no | **no** |

"Replies only" is covered by the established/related rule; it never needs its own allow.

Every VLAN also needs: DNS to the DNS server, DHCP to the router, and NTP to the router (or allow NTP out) so clocks stay correct for TLS.

## Rule example (nftables, one internal interface)

```nft
table inet filter {
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    ct state invalid drop
    iifname "vlan40" ip daddr 10.10.30.53 meta l4proto { tcp, udp } th dport 53 accept   # iot -> Pi-hole/AdGuard
    iifname "vlan40" ip daddr 10.10.30.10 tcp dport { 1883, 8123 } accept   # iot -> Home Assistant, MQTT
    iifname "vlan40" ip daddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } drop
    iifname "vlan40" oifname "wan" accept
  }
}
```

Check a ruleset file without applying it: `sudo nft -c -f ruleset.nft`. Put every allow to a private address (DNS server included) above the private-range drop, or it never matches. Rules for traffic to the router itself (its DNS, admin UI) go in the `input` chain, not `forward`.

## DNS details

- **Recursive upstream.** Running Unbound locally as Pi-hole/AdGuard's upstream means no third-party resolver sees your queries; the trade-off is your ISP sees queries to authoritative servers in clear text. A DoT/DoH upstream hides queries from the ISP but trusts that provider.
- **Conditional forwarding** lets the DNS server ask the router for names of DHCP clients (`laptop.home.arpa`) and for reverse lookups of local addresses.
- **Router's own DNS.** If the router also runs a resolver, either point it at the filter too or disable it, so there is one source of truth.
- **IPv6.** Router advertisements can hand out their own DNS server (RDNSS). Make it the filter's IPv6 address, or clients will bypass the filter over IPv6.
- **Do not expose DNS to the WAN.** An open resolver on port 53 is abused for amplification attacks. Allow port 53 only from internal interfaces and the VPN.
