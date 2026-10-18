---
name: cisco-ios-config
description: Reads and writes Cisco IOS and IOS-XE running configuration by hand without cutting off access, covering access and trunk switchports, VLANs and VTP, named extended ACLs edited by sequence number, static routes and basic OSPF, SSH and local user hardening, config archive with configure replace and revert timers, and the show commands that prove each change worked. Use when someone needs CLI commands for a Catalyst switch or ISR/ASR/Catalyst 8000 router, wants a pasted show running-config explained, is about to change a trunk, ACL or VTY line remotely, or needs to roll a Cisco device back to an earlier config.
license: MIT
compatibility: Any Agent Skills host. Works from pasted configuration; live use needs an SSH or console session to the device. Syntax varies by platform and release; check the command reference for the exact IOS/IOS-XE version.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Cisco IOS and IOS-XE configuration

Produce Cisco CLI changes that are minimal, reversible and verified, and explain existing configuration accurately. The operator pastes the commands; this skill writes them, the safety net and the checks.

For a per-area list of verification commands and expected output, read `references/verification.md`.

## 0. Before writing any command

1. Get `show version` (platform, IOS or IOS-XE release) and the relevant section of the running config: `show running-config | section <keyword>` or `show running-config interface <if>`. Never write a change against a config you have not seen.
2. Ask how the operator is connected: console, or SSH through which interface and VLAN. Any change on that path is a **lockout risk**.
3. **Stop and ask** before changing: the management VLAN/SVI, the uplink trunk, VTY `access-class`, AAA/`login` settings, the default route, or routing toward the management network. Propose the change with the revert timer from step 1 below and wait for agreement.

## 1. Safety net for every remote change

Enable the archive once (if `show archive` says it is not configured):

```
archive
 path flash:archive
 maximum 10
 write-memory
```

Use `bootflash:` instead of `flash:` where that is the platform's local file system. `write-memory` saves an archive copy each time the config is saved.

Then, for each change:

```
configure terminal revert timer 10
 ... changes ...
end
```

Verify (step 4). If good, `configure confirm` within the timer, then save. If you lose access, the device rolls back to the archived config when the timer (minutes) runs out. Where the archive is not available, the older fallback is `reload in 10` before the change and `reload cancel` after verifying; it only works if the startup config is the known-good one, and it reboots the device.

To return to a saved state on purpose: `configure replace flash:<file>` (replaces the whole running config, unlike `copy <file> running-config`, which only merges). Preview with `show archive config differences flash:<file> system:running-config`.

## 2. Writing changes

**Interfaces and VLANs**
- Access port: `switchport mode access`, `switchport access vlan <id>`, `spanning-tree portfast` (edge ports only), `description <what is connected>`.
- Trunks: add VLANs with `switchport trunk allowed vlan add <ids>`. `switchport trunk allowed vlan <ids>` without `add` **replaces** the whole list and is a classic outage. Remove with `remove`.
- Native VLAN: `switchport trunk native vlan <id>` must match on both ends, or untagged traffic (and often the management path) breaks and CDP logs a native VLAN mismatch. Change it with the revert timer running, and plan both ends of the link.
- Some platforms need `switchport trunk encapsulation dot1q` before `switchport mode trunk`.
- Create VLANs with `vlan <id>` + `name <name>`. Check `show vtp status` first: a switch in VTP server/client mode can have its VLAN database overwritten by a higher revision. Recommend `vtp mode transparent` or `off` unless VTP is deliberately in use.
- Reset a port to defaults with `default interface <if>` rather than removing lines one by one.

**ACLs**
- Use named extended ACLs with explicit sequence numbers: `ip access-list extended <NAME>`, `10 permit tcp 10.1.0.0 0.0.255.255 host 10.2.0.5 eq 443`. Remember the implicit `deny any` at the end; add an explicit `deny ip any any log` only when the operator wants the logging.
- Edit in place: insert with a new sequence number, delete with `no <seq>`, renumber with `ip access-list resequence <NAME> 10 10`. Never delete and re-create an ACL that is applied to a live interface or VTY line.
- Apply: `ip access-group <NAME> in|out` on the interface; `access-class <NAME> in` under `line vty 0 15` (check how many VTY lines exist with `show line`).
- Wildcard masks are inverse: `/24` is `0.0.0.255`.

**Routing basics**
- Static: `ip route <prefix> <mask> <next-hop> [distance] name <label>`. A floating backup route uses a higher distance than the primary.
- OSPF: `router ospf <pid>`, `router-id <x.x.x.x>`, `passive-interface default` then `no passive-interface <uplink>`, and `network <net> <wildcard> area <n>` or `ip ospf <pid> area <n>` on the interface. Changing a router ID or area on a live router resets adjacencies; plan a window.
- Never remove `router ospf` or `router bgp` to "start clean" on a live device.

**Management hardening**
- `ip ssh version 2` (or the release default), `transport input ssh` under VTY lines, `login local` or AAA, `exec-timeout 10 0`.
- Local users: `username <u> privilege 15 algorithm-type scrypt secret <pw>` and `enable algorithm-type scrypt secret <pw>` where the release supports it. Type 7 (`password` + `service password-encryption`) is reversible; do not treat it as protection.
- `no ip http server` unless the web UI is needed; prefer `ip http secure-server` if it is.

## 3. Explaining a pasted config

Go section by section (interfaces, VLANs, ACLs, routing, management, AAA, logging/NTP/SNMP). For each: what it does, anything risky (any/any rules, SNMP `public`, telnet enabled, type 7 or plaintext passwords, unused ports in VLAN 1 and up), and anything inconsistent (ACL referenced but not defined, VLAN on a trunk that does not exist). Replace every password, secret, key and community with `<redacted>` in your reply.

## 4. Verify every change

Run the matching checks from `references/verification.md` and compare with the output captured before the change. Minimum: `show ip interface brief`, the section you changed, `show logging | include <if or feature>`, and reachability from the management station. Only then `configure confirm` and `copy running-config startup-config` (or `write memory`).

## Never

- `write erase`, `erase startup-config`, `delete flash:*`, `reload` without a scheduled `reload cancel` plan, or `format`.
- `no vlan <id>` or trunk allowed-list changes on uplinks without checking which ports and neighbors use the VLAN.
- Paste a large config block into a live session without a revert timer.
- Save to startup before the change is verified.
- Echo secrets back to the user, even from their own paste.

## Report back

```
Device: <hostname>, platform <model>, release <version>
Change: <one line>
Commands: <block, with revert timer wrapping>
Verify: <show commands and the expected result>
Rollback: <configure revert now / configure replace <file> / reload cancel>
Lockout risk: <none | what could cut access and how the timer covers it>
```
