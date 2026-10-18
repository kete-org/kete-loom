---
name: homelab-network-setup
description: Plans and builds a self-hosted home lab network from an address and VLAN plan through inter-VLAN firewall policy, local DNS filtering with Pi-hole or AdGuard Home, WireGuard remote access, configuration backups, and exposing a few services to the internet without opening the whole LAN. Use when someone is designing or rebuilding a home or small-office network, isolating IoT or guest devices, setting up a VPN to reach home from outside, or deciding how to publish a self-hosted app safely.
license: MIT
compatibility: Any Agent Skills host. Vendor-neutral; applies to OPNsense, pfSense, OpenWrt, MikroTik, UniFi and similar routers. WireGuard commands need wireguard-tools.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Home lab network setup

Produce a written plan first, then configs. A home lab is usually run by one person with no out-of-band access, so every step must leave a way back in.

WireGuard configs and key handling are in `references/wireguard.md`. A starting firewall policy matrix and DNS details are in `references/firewall-and-dns.md`. Read them when you reach those steps.

## Ground rules

1. **Plan before touching the router.** Write the address plan, VLAN list and firewall matrix and get the user to confirm it.
2. **Keep a way back in.** Before changing the router or firewall: export its configuration, keep a wired port on the management network, and know how to factory-reset and restore. Never change the VLAN or rules on the port or Wi-Fi you are using to manage it without a rollback.
3. **Default deny between segments.** Each VLAN reaches only what the matrix allows. The internet never reaches the LAN except through the VPN or an explicitly published service.
4. **Prefer VPN to port forwards.** A service reachable only over WireGuard has no internet attack surface beyond one UDP port that ignores unauthenticated packets.
5. **Secrets stay local.** Never print or commit private keys, PSKs, admin passwords or API tokens. Generate keys on the device that uses them.

## Step 1: Gather facts (ask if unknown)

- Router/firewall hardware and OS, and whether switches and access points support 802.1Q VLANs (managed or "smart" switches; unmanaged switches do not).
- ISP setup: does the router's WAN address match the public IP shown by an external "what is my IP" check? A WAN address in `100.64.0.0/10`, or one that does not match, means CGNAT: inbound port forwards and a plain WireGuard server will not work. Stop and offer a relay option (a VPS endpoint or a mesh VPN service) or asking the ISP for a public IPv4.
- Devices by trust level, and which services must be reachable from where.
- Whether IPv6 is delivered. If it is, every rule below must be written for IPv6 too, because IPv6 hosts are globally addressable.

## Step 2: Address and VLAN plan

Use one `/24` per VLAN from `10.0.0.0/8` or `172.16.0.0/12`, and avoid `192.168.0.0/24` and `192.168.1.0/24`: they collide with most remote networks you will VPN in from. Make the third octet equal the VLAN ID so addresses are self-describing.

| VLAN | Name | Example subnet | Holds |
|---|---|---|---|
| 10 | mgmt | 10.10.10.0/24 | Router, switch, AP and hypervisor admin interfaces |
| 20 | trusted | 10.10.20.0/24 | Your laptops and phones |
| 30 | servers | 10.10.30.0/24 | Self-hosted services, NAS |
| 40 | iot | 10.10.40.0/24 | TVs, smart plugs, speakers |
| 50 | guest | 10.10.50.0/24 | Visitors, internet only |
| 60 | cameras | 10.10.60.0/24 | IP cameras, no internet |
| — | wg | 10.10.99.0/24 | WireGuard clients (not a VLAN, a routed tunnel subnet) |

- Use `home.arpa` (reserved for home networks by RFC 8375) or a subdomain of a domain you own for local names. Do not use `.local` (mDNS) or an invented TLD.
- Reserve static DHCP leases for servers and infrastructure; keep a dynamic range for the rest.
- Switch ports: trunk (tagged) to the router, APs and hypervisors; access (untagged) ports for single devices. Map each Wi-Fi SSID to one VLAN.

## Step 3: Firewall policy

Write the policy as a matrix, source rows by destination columns, before writing any rule. Start from `references/firewall-and-dns.md` and adapt it. Then on each internal interface, in this order:

1. Allow established and related traffic.
2. Allow DNS (UDP and TCP 53) and DHCP to the router or the DNS server only.
3. Allow the specific source-to-destination ports from the matrix (for example trusted → servers TCP 443, 22).
4. Block the interface's traffic to all private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and the router's own addresses on other VLANs, including its admin UI).
5. Allow to the internet (any remaining destination), except for VLANs that must stay offline, such as cameras.

- Admin UIs (router, switch, hypervisor, NAS) answer only from mgmt and trusted, never from IoT or guest.
- Casting and discovery across VLANs need an mDNS reflector or repeater on the router plus narrow allow rules; enable them only for the pairs that need them.
- Turn UPnP/NAT-PMP off, or limit it to one gaming console's address. It lets any LAN device open inbound ports.

## Step 4: DNS

1. Run Pi-hole or AdGuard Home on a static address in the servers or mgmt VLAN, with upstream either a public DoT/DoH resolver or a local recursive resolver such as Unbound.
2. Hand it out by DHCP on every VLAN. Do not list a public resolver as a second DNS server: clients use both, and filtering silently stops.
3. If you want a fallback, run a second filtering instance, not a public resolver.
4. Optionally redirect or block outbound port 53 from clients so hard-coded resolvers go through yours. Devices using DNS-over-HTTPS will bypass this; that needs DoH blocklists, not a port rule.
5. Add local records for each service (`nas.home.arpa`) so you never browse by IP.

## Step 5: WireGuard remote access

Follow `references/wireguard.md`. The essentials:

- Run the server on the router or a server in the servers VLAN; forward one UDP port (51820 by convention) to it.
- One key pair per client device. `AllowedIPs` on the server side is that peer's single tunnel address (`/32`).
- Split tunnel (clients route only the home subnets) by default; full tunnel (`0.0.0.0/0, ::/0`) only when the user wants all traffic to exit at home.
- Treat the `wg` subnet as its own source in the firewall matrix: usually the same access as trusted, never more.
- For a dynamic home IP, point a DNS name at it with dynamic DNS and use that name as the client `Endpoint`.

## Step 6: Publishing a service safely

Ask first whether the service really needs to be public. If only the user and family use it, the VPN is the answer. When it must be public:

1. Put it in the servers VLAN (or a dedicated DMZ VLAN) that cannot initiate connections to trusted or mgmt.
2. Expose only a reverse proxy on TCP 443 with automatic certificates; forward nothing else. Never forward SSH, RDP, SMB, database ports, or any admin UI.
3. Add authentication in front of apps that lack strong login (a forward-auth or SSO layer), and rate limiting or ban-on-failure.
4. As an alternative to a port forward, an outbound tunnel service keeps the home IP private and works behind CGNAT. Note that the provider then sees the traffic.
5. Keep the published software patched; subscribe to its release notes.

## Step 7: Backups and change safety

- Export router, switch and AP configs after every change and store them off the device (encrypted if they contain keys). Note firmware versions with them.
- Back up the DNS server's config and the WireGuard configs the same way.
- Before applying firewall changes remotely, schedule an automatic rollback (use the router's own mechanism if it has one, such as MikroTik Safe Mode; on Linux, schedule a restore of the saved ruleset with `at` or a timer) and cancel it only once you have reconnected.
- Follow 3-2-1 for data on the NAS: three copies, two media, one off-site.

## Stop and ask the user

- Before applying any change to the router, firewall or switch you connect through.
- When CGNAT is detected, or the hardware cannot do VLANs.
- Before exposing anything to the internet; confirm which service, who uses it, and the auth in front of it.

## Never

- Never put admin interfaces on the WAN or in the guest/IoT VLANs.
- Never reuse one WireGuard key pair on several devices.
- Never write keys, passwords or real public IPs into files that will be committed or shared.

## Deliverable

```
1. Facts: hardware, ISP/CGNAT result, IPv6 yes/no
2. Address and VLAN plan (table)
3. Firewall matrix (table) and rule order per interface
4. DNS: server, upstream, records, how clients get it
5. Remote access: WireGuard server, port, peers, split or full tunnel
6. Published services: name, path (proxy/tunnel), auth
7. Backup and rollback plan
8. Order of work, with the step that could cut access marked
9. Open questions for the user
```
