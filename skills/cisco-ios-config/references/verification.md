# Verification commands

Capture each relevant command before and after a change. Exact output columns vary by platform and release.

## Device and config state

| Command | Look for |
|---|---|
| `show version` | Platform, release, uptime, config register |
| `show running-config \| section <kw>` | The block you changed, as the device stores it |
| `show archive` | Archive enabled, the most recent archive file names |
| `show archive config differences <a> <b>` | Line-level diff between two configs (for example an archive file and `system:running-config`) |
| `show archive log config all` | Who changed what, if `archive` + `log config` + `logging enable` are configured |
| `show logging` | `%LINK-3-UPDOWN`, `%LINEPROTO-5-UPDOWN`, `%SYS-5-CONFIG_I`, error messages after the change |

## Interfaces and switching

| Command | Look for |
|---|---|
| `show ip interface brief` | Status/Protocol `up up`; `administratively down` means `shutdown` |
| `show interfaces status` | Per port: VLAN, duplex, speed, `err-disabled`, `notconnect` |
| `show interfaces <if>` | Input/CRC errors, output drops, duplex mismatch symptoms |
| `show interfaces trunk` | Mode, native VLAN, allowed VLANs and VLANs forwarding on each trunk |
| `show vlan brief` | VLAN exists, active, and which access ports are in it |
| `show vtp status` | VTP mode and configuration revision |
| `show spanning-tree vlan <id>` | Root bridge, port roles; blocked ports you did not expect |
| `show mac address-table interface <if>` | Hosts learned on the port |
| `show cdp neighbors detail` / `show lldp neighbors` | What is cabled to each port |
| `show errdisable recovery` | Why a port went err-disabled and whether it recovers |

## ACLs

| Command | Look for |
|---|---|
| `show access-lists <NAME>` | Sequence numbers and per-entry match counters rising for the traffic you expect |
| `show ip interface <if> \| include access list` | Which ACL is applied inbound and outbound |
| `show line` / `show running-config \| section line vty` | VTY line count and the `access-class` applied |

## Routing

| Command | Look for |
|---|---|
| `show ip route <prefix>` | Which source and next hop won, and its distance/metric |
| `show ip route summary` | Route counts per source, before vs after |
| `show ip protocols` | Running routing processes, networks, passive interfaces |
| `show ip ospf neighbor` | Adjacencies in `FULL` (or `2WAY` to DROTHER on broadcast segments) |
| `show ip ospf interface brief` | Interfaces in OSPF, area, cost, state |
| `ping <ip> source <if>` / `traceroute <ip>` | Reachability along the path you changed |

## Management

| Command | Look for |
|---|---|
| `show ip ssh` | SSH enabled and version |
| `show users` | Your own session still listed, and from which line |
| `show ntp associations` | A synced peer (`*`) so logs have correct timestamps |

## Sources

- `configure terminal revert timer` and `configure revert` (1 to 120 minutes), `configure replace`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/cf_command_ref/C_commands.html
- Archive `maximum` (1 to 14, default 10) and configuration rollback: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-6/configuration_guide/sys_mgmt/b_166_sys_mgmt_9500_cg/b_166_sys_mgmt_9500_cg_chapter_01001.html
- Configuration change logger (`archive` / `log config` / `logging enable`, `show archive log config`): https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/syst-mgmt/b-system-management/m_cm-config-logger-0.html
- Type 8 and type 9 (`algorithm-type scrypt`) secrets and release support: https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-npe-hardening-Dkel83jP
