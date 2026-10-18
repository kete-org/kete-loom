# WireGuard remote access

## Keys

Generate each key pair on the device that will use it, so the private key never travels:

```sh
umask 077
wg genkey | tee client.key | wg pubkey > client.pub
wg genpsk > client.psk   # optional pre-shared key per peer, adds a symmetric layer
```

Only public keys (and the PSK, over a secure channel) are exchanged. Phone apps generate their own pair; copy only the public key off the phone. If you must generate a config for a phone elsewhere and show it as a QR code (`qrencode -t ansiutf8 < phone.conf`), delete the file afterwards.

## Server (`/etc/wireguard/wg0.conf`)

```ini
[Interface]
Address = 10.10.99.1/24
ListenPort = 51820
PrivateKey = <server private key>

[Peer]
# laptop
PublicKey = <laptop public key>
PresharedKey = <laptop psk>
AllowedIPs = 10.10.99.2/32

[Peer]
# phone
PublicKey = <phone public key>
AllowedIPs = 10.10.99.3/32
```

- Server-side `AllowedIPs` is both a route and an access check: packets from that peer are accepted only from those source addresses. Give each client a single `/32` (and `/128` for IPv6). Add a subnet only for a site-to-site peer that routes a whole network.
- The server needs IP forwarding (`net.ipv4.ip_forward=1`, and `net.ipv6.conf.all.forwarding=1` for IPv6) and firewall rules allowing `wg0` to reach the permitted VLANs. If the home subnets do not know the route back to `10.10.99.0/24` (the server is not the router), add that route on the router or NAT the tunnel traffic.
- On router OSes (OPNsense, pfSense, OpenWrt, MikroTik) the same fields exist in the WireGuard UI; the firewall rules go on the WireGuard interface.

## Client

```ini
[Interface]
Address = 10.10.99.2/32
PrivateKey = <laptop private key>
DNS = 10.10.30.53           # your Pi-hole/AdGuard, so home names resolve

[Peer]
PublicKey = <server public key>
PresharedKey = <laptop psk>
Endpoint = vpn.example.com:51820
AllowedIPs = 10.10.0.0/16   # split tunnel: home subnets only
PersistentKeepalive = 25    # only needed if the client sits behind NAT and must receive traffic
```

- Full tunnel: `AllowedIPs = 0.0.0.0/0, ::/0`. Then home DNS and the server's NAT to the internet must work, or the client loses all connectivity.
- If the client's own LAN uses the same subnet as home, routing breaks. That is why the plan avoids `192.168.0.0/24` and `192.168.1.0/24`.

## Bring up and check

```sh
sudo wg-quick up wg0
sudo wg show            # after sending traffic (ping the server tunnel IP): a recent "latest handshake" and rising transfer counters = working
sudo systemctl enable wg-quick@wg0   # start at boot on systemd hosts
```

- No handshake at all: the UDP port forward, the ISP (CGNAT), the `Endpoint` name, or mismatched public keys.
- Handshake but no traffic: `AllowedIPs` on either side, IP forwarding, or firewall rules on `wg0`.
- Handshake and pings work but web pages or SSH stall: MTU. Set `MTU = 1280` in the client `[Interface]` to test, then raise it.

## Revoking a device

Delete its `[Peer]` block from the server's `wg0.conf`, then apply without dropping other peers: `sudo wg syncconf wg0 <(sudo wg-quick strip wg0)` (bash), or remove it live with `sudo wg set wg0 peer <pubkey> remove`. Do both, or the peer returns on the next restart. Because each device has its own key, nothing else changes.
