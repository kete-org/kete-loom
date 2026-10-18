# Command equivalents by OS

Use the row for the user's OS. All are read-only unless marked.

| Check | Linux | macOS | Windows (PowerShell) |
|---|---|---|---|
| Addresses | `ip -br addr` | `ifconfig` or `ipconfig getifaddr en0` | `Get-NetIPAddress` or `ipconfig /all` |
| Routes | `ip route` | `netstat -rn` | `Get-NetRoute` or `route print` |
| Route for one destination | `ip route get <ip>` | `route -n get <ip>` | `Find-NetRoute -RemoteIPAddress <ip>` |
| Neighbour/ARP table | `ip neigh` | `arp -an` | `Get-NetNeighbor` |
| Trace path | `traceroute -n`, `tracepath`, `mtr` | `traceroute -n`, `mtr` (Homebrew) | `tracert -d`, `pathping` |
| DNS query | `dig`, `getent hosts` | `dig`, `dscacheutil -q host -a name <name>` | `Resolve-DnsName <name>`, `nslookup` |
| Resolver in use | `resolvectl status` or `/etc/resolv.conf` | `scutil --dns` | `Get-DnsClientServerAddress` |
| Flush DNS cache (changes state) | `resolvectl flush-caches` | `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` | `Clear-DnsClientCache` or `ipconfig /flushdns` |
| TCP port test | `nc -vz -w 5 <host> <port>` | `nc -vz -G 5 <host> <port>` | `Test-NetConnection <host> -Port <port>` |
| Listening sockets | `ss -tulpn` | `lsof -nP -iTCP -sTCP:LISTEN` | `Get-NetTCPConnection -State Listen` or `netstat -ano` |
| Host firewall | `nft list ruleset`, `iptables -S`, `ufw status verbose`, `firewall-cmd --list-all` | `sudo pfctl -sr`, `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` | `Get-NetFirewallProfile`, `Get-NetFirewallRule -Enabled True` |
| Don't-fragment ping (1500 path) | `ping -M do -s 1472 <host>` | `ping -D -s 1472 <host>` | `ping -f -l 1472 <host>` |
| Packet capture | `sudo tcpdump -ni any <filter>` | `sudo tcpdump -ni en0 <filter>` | `pktmon` or Wireshark |

## Reading traceroute

- `* * *` on one hop, later hops answer: that router does not reply to probes. Ignore it.
- `* * *` from some hop to the end: traffic is dropped there or the destination filters probes. Test the real port with `nc` before concluding anything.
- A sudden large latency jump that stays for every later hop is a real slow link; a jump at one hop only is the router deprioritising ICMP.

## UDP checks

`nc -vzu` cannot tell "open" from "filtered" because UDP has no handshake. Test UDP services with their own client instead: `dig @<server> <name>` for DNS, `wg show` handshake time for WireGuard, `ntpdate -q` or `sntp` for NTP, or capture with `tcpdump` on the server to see whether packets arrive.

## IPv6 versus IPv4

If a name has both `A` and `AAAA` records, clients usually try IPv6 first. When IPv6 is broken, connections stall then fall back. Force each family to compare: `curl -4 ...` and `curl -6 ...`, `ping -4` / `ping -6` (or `ping6`).
