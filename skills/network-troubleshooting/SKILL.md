---
name: network-troubleshooting
description: Layer-by-layer diagnosis of network faults on Linux, macOS and Windows, working up from link and IP routing through DNS resolution, TCP/UDP port reachability and firewalls, TLS certificates and SNI, to latency, packet loss and MTU black holes, with the exact command for each check and how to read its output. Use when a host, site or service is unreachable, name resolution fails, a connection times out or is refused, a TLS handshake errors, or a link is slow or drops large transfers.
license: MIT
compatibility: Any Agent Skills host with a shell. Uses standard OS tools (ping, ip or ifconfig, dig or nslookup, nc, curl, openssl); mtr and tcpdump are optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "ping, curl"
  kete-loom/owner: "Kete-org"
---

# Network troubleshooting

Find the lowest layer that is broken, prove it with one command, then fix only that. Most "the network is down" reports are DNS, a firewall, or a wrong route, and guessing wastes hours.

Per-OS command equivalents are in `references/commands.md`. Read it when the user is not on Linux or a command below is missing.

## Ground rules

1. **Read-only first.** Every check in this skill observes state. Do not flush caches, restart services, change routes or edit firewall rules until you have shown which layer is broken, and ask the user before any change on a remote machine you are connected through: a wrong rule cuts you off.
2. **Pin down the symptom before testing.** Get: source host, destination (name and port), protocol, the exact error text, when it last worked, and what changed. "Connection refused" and "timed out" point to different layers.
3. **Test from where the failure is.** A check from your laptop proves nothing about the server's path. Run each command on the failing source, or say clearly where you ran it.
4. **One variable at a time.** Compare against a known-good target (`1.1.1.1`, another host on the same subnet) so each result splits the problem in half.
5. **Never paste secrets** (VPN keys, tokens in URLs, cookies from `curl -v`) into the report.

## Step 1: Local link and address

```sh
ip -br addr            # interface up, has the expected IPv4/IPv6 address?
ip route               # is there a default route, via the right gateway?
ip route get 1.1.1.1   # which interface and source address a packet would use
ping -c 3 <gateway>
```

- No address, or a `169.254.x.x` address: DHCP failed. Check cable/Wi-Fi association and the DHCP server, not DNS.
- Gateway does not answer but has an entry in `ip neigh` marked `FAILED`/`INCOMPLETE`: layer 2 problem (wrong VLAN, cable, switch port).
- Two default routes, or a VPN that installed `0.0.0.0/1` routes: traffic may be leaving by the wrong interface.

## Step 2: IP reachability beyond the gateway

```sh
ping -c 3 1.1.1.1        # internet by IP, no DNS involved
traceroute -n <dest-ip>  # or: mtr -rwnc 50 <dest-ip>
```

- IP works but names fail: go to step 3.
- Path stops at a hop and never continues: routing or a firewall at that hop. Note the last hop that answered.
- Many networks drop ICMP. A failed ping alone does not prove a host is down; test the real port in step 4.

## Step 3: DNS

```sh
dig example.com                 # what the system's configured resolver says
dig @1.1.1.1 example.com        # what a public resolver says
dig +trace example.com          # walk from the root; shows which delegation breaks
getent hosts example.com        # what applications see (honours /etc/hosts and nsswitch)
resolvectl status               # systemd-resolved: which DNS server per interface
```

Read the `status:` field in the dig header:

| Result | Meaning | Next |
|---|---|---|
| `NOERROR` with answers | Name resolves | Check the answer is the IP you expect |
| `NOERROR`, no answers | Name exists, no record of that type | Query `A` and `AAAA` separately |
| `NXDOMAIN` | Name does not exist at that resolver | Typo, missing record, or split-horizon DNS |
| `SERVFAIL` | Resolver could not get an answer | DNSSEC failure or broken authoritative servers; try `dig +cd` |
| `connection timed out; no servers could be reached` | Resolver unreachable | Firewall on UDP/TCP 53, wrong resolver IP, or VPN DNS |

- `dig` and `getent` disagree: an `/etc/hosts` entry, a local cache, or search-domain expansion is involved.
- Public resolver right, local one wrong: stale cache or an internal zone overriding the public one. Compare TTLs.
- After a DNS change, the old answer lives until its TTL expires in every cache along the way.

## Step 4: Port reachability and firewalls

```sh
nc -vz -w 5 <host> <port>                     # TCP
curl -sv --connect-timeout 5 http://<host>:<port>/ -o /dev/null
```

| Error | What it means |
|---|---|
| `Connection refused` | Packet reached the host; nothing listening on that port, or a firewall REJECT (TCP reset or ICMP port-unreachable) |
| Timed out | Packet or reply dropped silently: firewall DROP, security group, wrong route, or host down |
| `No route to host` | ARP failed on the local subnet, or a firewall REJECT with ICMP host-prohibited |

On the destination, check what listens and what filters:

```sh
ss -tulpn                       # listening sockets; 127.0.0.1:port is local-only
sudo nft list ruleset           # or: sudo iptables -S ; sudo ufw status verbose ; sudo firewall-cmd --list-all
```

- `curl` fails but `nc` works: check `env | grep -i proxy` (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`); a proxy setting sends the request somewhere else.
- Service bound to `127.0.0.1` or `::1` only: it is not reachable from outside, whatever the firewall says.
- Check every filter on the path: host firewall, cloud security group or network ACL, router port forward, and the container runtime's own rules.
- Capture to settle it: `sudo tcpdump -ni any host <client-ip> and port <port>`. SYN arrives with no SYN-ACK: the host's firewall or the service. No SYN arrives: something upstream drops it.

## Step 5: TLS

```sh
openssl s_client -connect <host>:443 -servername <host> -showcerts </dev/null
openssl s_client -connect <host>:443 -servername <host> </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
curl -v https://<host>/ -o /dev/null
```

`-ext` needs OpenSSL 1.1.1 or newer; on older OpenSSL or LibreSSL (macOS) use `-noout -text` and read the `Subject Alternative Name` block.

- `Verify return code: 0 (ok)` means the chain is trusted from this machine.
- `unable to get local issuer certificate`: the server does not send its intermediate certificate, or this client lacks the root. Browsers can hide this; `curl` and most libraries do not.
- `certificate has expired` or `notAfter` in the past: renew. Also check the client clock with `date`.
- Hostname mismatch: the name is not in `subjectAltName`. Without `-servername` (no SNI) many servers return a default certificate, so always pass it.
- To test one backend behind a load balancer or before DNS changes: `curl -v --resolve <host>:443:<ip> https://<host>/`.

## Step 6: Latency, loss and MTU

```sh
mtr -rwnc 100 <host>
curl -o /dev/null -s -w 'dns %{time_namelookup}  connect %{time_connect}  tls %{time_appconnect}  ttfb %{time_starttransfer}  total %{time_total}\n' https://<host>/
ping -M do -s 1472 -c 3 <host>   # 1472 + 28 bytes of headers = 1500
```

- In `mtr`, loss at one middle hop that does not continue to later hops is ICMP rate limiting, not real loss. Loss that starts at a hop and persists to the destination is real.
- The `curl -w` timings say which phase is slow: DNS, TCP connect, TLS, or the server itself (time to first byte).
- **MTU black hole** signs: ping and small requests work, but large downloads, `git clone`, TLS handshakes with big certificate chains, or SSH sessions after login hang. Lower `-s` until the do-not-fragment ping succeeds; the working size plus 28 is the path MTU. Typical culprits are VPNs (WireGuard commonly uses 1420), PPPoE (1492) and firewalls that block ICMP "fragmentation needed". Fix with a lower interface MTU or TCP MSS clamping on the router, and say which.

## Stop and ask the user

- Before any change that could drop your own session (firewall, routes, interface down, VPN restart) on a machine you reach over the network.
- When the fault is outside what you can see: ISP, cloud provider console, a corporate proxy, or a device you have no shell on. Say exactly what to check there.
- When a fix needs credentials or admin access you do not have.

## Never

- Never disable a firewall entirely "to test" on an internet-facing host.
- Never use `curl -k` or turn off certificate verification as the fix; it only hides the TLS fault.
- Never conclude "host is down" from ping alone.

## Report

```
Symptom: <source> → <destination:port/proto>: <exact error>
Broken layer: <link | IP/routing | DNS | port/firewall | TLS | MTU/latency>
Evidence: <command> → <the output line that proves it>
Cause: <one sentence>
Fix: <smallest change, and where to apply it> (applied | proposed, needs approval)
Checked and fine: <layers verified working>
Not checked: <what you could not test, and why>
```
