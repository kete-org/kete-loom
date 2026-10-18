---
name: network-automation
description: Automates configuration of routers, switches and firewalls with Netmiko, NAPALM, Nornir or Ansible network collections, building a source-of-truth inventory, idempotent templates and resource modules, dry runs that show a diff before any push, commit-confirm style rollback, vaulted credentials, and testing against a containerlab or CML lab before production. Use when writing or fixing a Python or Ansible script that pushes config to many network devices, choosing between these tools, adding a check-mode diff or automatic revert to a device rollout, or moving device passwords out of an inventory file.
license: MIT
compatibility: Any Agent Skills host. Needs Python 3 with netmiko, napalm or nornir, or ansible-core with the vendor collection (for example cisco.ios), plus SSH reach to a lab or devices.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: network
  kete-loom/requires: "python3"
  kete-loom/owner: "Kete-org"
---

# Network automation

Push configuration to network devices so that every run shows its diff first, does nothing when nothing changed, can be undone without console access, and never leaks a credential.

For per-tool code shapes (inventory files, tasks, playbooks), read `references/tool-snippets.md`.

## 0. Before you start

1. Find what exists: search the repo for `inventory/`, `hosts.yaml`, `group_vars/`, `ansible.cfg`, `config.yaml` (Nornir), `requirements.txt`, Jinja2 templates (`*.j2`), and any NetBox or Nautobot URL.
2. Ask the user, if not stated:
   - Which platforms and OS versions (`ios`, `iosxe`, `nxos`, `eos`, `junos`, `iosxr`)? Behaviour differs per driver.
   - Is there a lab (containerlab, Cisco Modeling Labs, GNS3, EVE-NG) or only production?
   - What is the change window, and who approves a production push?
3. **Stop and ask** before running anything against a production device. Default target is the lab or one named canary device.

## 1. Pick the tool

| Situation | Use |
|---|---|
| A few show commands or a one-off push, any vendor with SSH | Netmiko (`ConnectHandler`, `send_command`, `send_config_set`) |
| Diff before push, merge or full replace, commit and rollback across vendors | NAPALM (`load_merge_candidate`, `load_replace_candidate`, `compare_config`, `commit_config`, `rollback`) |
| Python, many devices in parallel, inventory filtering | Nornir with `nornir_napalm` / `nornir_netmiko` |
| Team already on Ansible, declarative desired state | Ansible with `ansible.netcommon.network_cli` and vendor resource modules (`cisco.ios.ios_vlans`, `ios_interfaces`, `ios_l3_interfaces` ...) |

Prefer what the repo already uses. Do not add a second framework for one task.

## 2. Inventory and source of truth

1. One inventory: hosts with `platform`/`ansible_network_os`, management IP, site and role. Group variables hold shared settings; hosts hold only what differs.
2. If NetBox or Nautobot exists, read the inventory from it (the `nornir-netbox` package's `NetBoxInventory2` plugin, or Ansible's `netbox.netbox.nb_inventory`) instead of copying data into YAML.
3. Intended config is data plus templates. Variables in YAML, rendering in Jinja2, no hand-edited per-device files.

## 3. Secrets

- Never put passwords, enable secrets, SNMP communities or API tokens in inventory, templates, playbooks or git history.
- Use `ansible-vault` (`ansible-vault encrypt_string`), environment variables read at runtime, or the team's secret manager. Nornir: set `username`/`password` in a transform function from `os.environ`.
- Mark Ansible tasks that handle secrets with `no_log: true`. Do not print rendered configs that contain secrets; redact before logging diffs.
- If you find a committed secret, tell the user it must be rotated. Removing it from the file is not enough.

## 4. Make every change idempotent

1. Declarative first: Ansible resource modules with `state: merged` (add/update only) or `state: replaced` (this resource exactly). Treat `state: overridden` and NAPALM `load_replace_candidate` as high risk: anything not in your data is removed. Confirm with the user before using them.
2. With `ios_config`/`*_config` line modules, give `parents` and `lines` that match the running config exactly as the device prints it, or every run reports a change.
3. Netmiko is not idempotent: `send_config_set` sends whatever you give it. Fetch the running config first, compute what is missing, and send only that.
4. A second run against an unchanged device must report zero changes. Test this in the lab.

## 5. Dry run and diff

- Ansible: `ansible-playbook site.yml --check --diff --limit <canary>`.
- NAPALM: `load_*_candidate`, print `compare_config()`, then `discard_config()`.
- Nornir: `napalm_configure(dry_run=True)` or `InitNornir(dry_run=True)`; print `result.diff`.
- Netmiko: show the computed command list and the current running section side by side.

Show the diff to the user. **Stop and ask** before committing if the diff touches management access (VTY lines, ACLs on the management interface, AAA, SSH, routing toward the management network) or deletes anything.

## 6. Rollback

1. Take a backup of the running config before every push (`ios_config: backup: true`, NAPALM `get_config()`, or `show running-config` saved per host with a timestamp).
2. Use the platform's confirmed commit so a change that cuts you off reverts on its own:
   - NAPALM: `commit_config(revert_in=300)` then `confirm_commit()` after checks pass. On IOS this needs the `archive` feature; the driver rounds down to whole minutes and accepts 60 to 7200 seconds (IOS `revert timer` is 1 to 120 minutes).
   - Junos: `commit confirmed <minutes>` then `commit` to confirm. IOS-XR: `commit confirmed <seconds>` (or `commit confirmed minutes <n>`; the bare number is seconds, and the allowed range differs by release, so check that release's command reference) then `commit`. Cisco IOS by hand: see the `cisco-ios-config` skill.
3. Rollback plan in the change ticket: the command or playbook that restores the backup, tested in the lab.

## 7. Rollout

1. Lab first, then one canary, then batches: Ansible `serial: [1, 5, "25%"]` with `max_fail_percentage: 0` (the percentage must be exceeded, so any failure in a batch stops the play); Nornir: filter to a small group per run.
2. Capture state before and after: interfaces up, neighbors (`get_lldp_neighbors`, OSPF/BGP neighbor counts), route counts. Compare; any drop stops the rollout.
3. Save to startup only after verification (`save_when: modified`, Netmiko `save_config()`).
4. Stop on the first unexpected failure. Do not retry a failed push in a loop.

## 8. Test

- Lab: containerlab topology (`clab deploy -t lab.clab.yml`) with vendor images the user is licensed for, or CML/GNS3/EVE-NG.
- Offline: render templates in CI and run `ansible-playbook --syntax-check`, `ansible-lint`, or unit tests on the rendering. Batfish can check reachability and ACL behaviour on rendered configs without devices.
- State checks: `napalm_validate` with a validation YAML, or pyATS/Genie parsers.

## Never

- Run against `all` hosts without a `--limit` or filter on the first run.
- Disable SSH host key checking permanently in shared config. Accepting keys in a lab is fine; say so in the file.
- Push to production without a diff the user has seen, a backup, and a rollback path.
- Store device output containing secrets in CI logs or artifacts.

## Report back

```
Targets: <hosts/groups>, platform(s)
Tool and mode: <tool>, <merge|replace|resource state>
Dry-run diff: <summary, lines added/removed per host>
Applied: <yes/no>, rollback mechanism: <revert timer / backup path>
Verification: <checks run, before/after counts>
Idempotency: second run changed = <0 or list>
Open risks: <anything not tested in the lab>
```
