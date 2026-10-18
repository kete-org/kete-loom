# Tool snippets

Minimal, working shapes. Adapt names to the repo; keep secrets out of every file shown.

## Netmiko

```python
import os
from netmiko import ConnectHandler

device = {
    "device_type": "cisco_ios",          # cisco_xe, cisco_nxos, arista_eos, juniper_junos ...
    "host": "10.0.0.11",
    "username": os.environ["NET_USER"],
    "password": os.environ["NET_PASS"],
    "secret": os.environ.get("NET_ENABLE", ""),
}
with ConnectHandler(**device) as conn:
    conn.enable()
    # Read only the interface you change, so a match elsewhere cannot hide a missing line.
    running = conn.send_command("show running-config interface GigabitEthernet1/0/10")
    wanted = ["interface GigabitEthernet1/0/10", " description uplink-core1"]
    # Send only what is missing; Netmiko does not diff for you.
    if not any(line.strip() == "description uplink-core1" for line in running.splitlines()):
        print(conn.send_config_set(wanted))
        conn.save_config()
```

`send_command(..., use_textfsm=True)` returns parsed data when a TextFSM (ntc-templates) template exists for that command.

## NAPALM

```python
from napalm import get_network_driver

driver = get_network_driver("ios")       # eos, junos, nxos, nxos_ssh, iosxr ...
with driver("10.0.0.11", user, password, optional_args={"secret": enable}) as dev:
    dev.load_merge_candidate(config=rendered)   # or load_replace_candidate(filename=...)
    diff = dev.compare_config()
    if not diff:
        dev.discard_config()
    elif approved(diff):
        dev.commit_config(revert_in=300)        # seconds; IOS rounds to minutes, needs archive
        if checks_pass(dev):
            dev.confirm_commit()
        else:
            dev.rollback()
    else:
        dev.discard_config()
```

IOS driver prerequisites: `ip scp server enable` on the device, `archive` configured with a local path for revert and replace, and a replace file that matches IOS indentation and ends with `end`.

## Nornir (3.x)

`config.yaml`:

```yaml
inventory:
  plugin: SimpleInventory
  options:
    host_file: inventory/hosts.yaml
    group_file: inventory/groups.yaml
    defaults_file: inventory/defaults.yaml
runner:
  plugin: threaded
  options:
    num_workers: 10
```

```python
import os
from nornir import InitNornir
from nornir.core.filter import F
from nornir_napalm.plugins.tasks import napalm_configure
from nornir_utils.plugins.functions import print_result

nr = InitNornir(config_file="config.yaml")
nr.inventory.defaults.username = os.environ["NET_USER"]
nr.inventory.defaults.password = os.environ["NET_PASS"]

def push(task):
    # napalm_configure does not expand {host} in filename; build the path per host.
    return task.run(task=napalm_configure, filename=f"out/{task.host.name}.cfg", dry_run=True)

canary = nr.filter(F(site="lab") & F(role="access"))
result = canary.run(task=push)
print_result(result)
```

`napalm_configure` (signature in the nornir_napalm repo) takes `dry_run`, `filename`, `configuration`, `replace`, `commit_message` and `revert_in`. Render per-host files first, or pass `configuration=` from a task that renders the template.

## Ansible

`inventory/group_vars/ios.yml`:

```yaml
ansible_connection: ansible.netcommon.network_cli
ansible_network_os: cisco.ios.ios
ansible_user: "{{ vault_net_user }}"
ansible_password: "{{ vault_net_pass }}"
ansible_become: true
ansible_become_method: enable
ansible_become_password: "{{ vault_net_enable }}"
```

Playbook:

```yaml
- hosts: ios
  gather_facts: false
  serial: [1, 5, "25%"]
  max_fail_percentage: 0
  tasks:
    - name: Backup running config
      cisco.ios.ios_config:
        backup: true
        backup_options:
          dir_path: backups/
    - name: VLANs as data
      cisco.ios.ios_vlans:
        config: "{{ vlans }}"
        state: merged          # replaced / overridden remove what is not listed
    - name: Save if running differs from startup
      cisco.ios.ios_config:
        save_when: modified
```

Run: `ansible-playbook site.yml --check --diff --limit lab-sw1`, then without `--check` on the same limit, then widen.

`state: rendered` prints the commands a resource module would send without connecting; `state: gathered` reads current state as structured data, useful for before/after checks.

## containerlab

```yaml
name: lab
topology:
  nodes:
    sw1: { kind: arista_ceos, image: ceos:<version you have> }
    sw2: { kind: arista_ceos, image: ceos:<version you have> }
  links:
    - endpoints: ["sw1:eth1", "sw2:eth1"]
```

`clab deploy -t lab.clab.yml`, `clab inspect`, `clab destroy -t lab.clab.yml`. Vendor images (cEOS for `arista_ceos`, `cisco_iol`, `cisco_c8000v` built with vrnetlab) must be obtained under the vendor's licence. Kind names: https://containerlab.dev/manual/kinds/

## Sources

- NAPALM base API (`commit_config(revert_in=seconds)`): https://napalm.readthedocs.io/en/latest/base.html ; IOS caveats (archive, `ip scp server enable`, replace file format): https://napalm.readthedocs.io/en/latest/support/ios.html
- Ansible `serial` lists: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html ; `max_fail_percentage`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- `cisco.ios.ios_config` (`backup_options`, `save_when`) and `ios_vlans` states: https://github.com/ansible-collections/cisco.ios
- IOS-XR `commit confirmed`: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/system-management/b-system-management/m-conf-mgmt-commands.html
- containerlab deploy: https://containerlab.dev/cmd/deploy/
