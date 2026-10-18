# DNS record shapes

Replace `example.com`, selectors and provider includes with the user's values. Always read existing records first.

## SPF (RFC 7208)

One TXT record at each name that appears as an envelope sender (Return-Path).

```
example.com.        TXT "v=spf1 include:_spf.google.com include:amazonses.com ~all"
```

- Only one `v=spf1` record per name. Two records is a `permerror`.
- At most 10 DNS-querying mechanisms (`include`, `a`, `mx`, `ptr`, `exists`, `redirect`), counted recursively. Over 10 is a `permerror`, which counts as a fail.
- To get under 10: move senders to subdomains (each subdomain has its own SPF), remove services no longer used, or replace an `include` with `ip4:`/`ip6:` ranges only if the provider publishes stable ones.
- `~all` (softfail) is normal once DMARC is in place; `-all` is fine when the list is complete. Never `+all`.
- A domain that never sends mail: `v=spf1 -all`.

## DKIM

The provider gives the selector and key, usually as a CNAME so it can rotate keys.

```
s1._domainkey.example.com.  CNAME  s1.domainkey.u123.wl.provider.net.
s1._domainkey.example.com.  TXT    "v=DKIM1; k=rsa; p=MIIBIjANBgkq..."
```

- Use 2048-bit RSA where offered. Long TXT values may need splitting into several quoted strings; most DNS hosts do this for you.
- Check: `dig +short TXT s1._domainkey.example.com`. In a received message, `DKIM-Signature: d=` must be your domain for alignment.

## DMARC (RFC 9989, which obsoletes RFC 7489)

```
_dmarc.example.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; adkim=r; aspf=r"
```

| Tag | Meaning |
|---|---|
| `p` | `none` (monitor), `quarantine`, `reject` |
| `sp` | policy for subdomains, defaults to `p` |
| `rua` | where aggregate XML reports go; use a mailbox or a DMARC report service |
| `pct` | RFC 7489 only: share of failing mail the policy applies to, default 100. RFC 9989 removed it (along with `rf` and `ri`) and added `t=y`, a test flag asking receivers to apply one policy level lower. Older receivers may still read `pct`; do not depend on it for rollout |
| `adkim` / `aspf` | `r` relaxed (organisational domain match, the default) or `s` strict |

Reports sent to a different domain need an authorisation record at that domain (`example.com._report._dmarc.reports.net TXT "v=DMARC1"`); report services set this up.

Rollout: `p=none` for a few weeks (2 to 4 is a rule of thumb), then `p=quarantine`, then `p=reject`. Rolling out per subdomain with `sp=` is a safer stage than `pct`.

## BIMI

```
default._bimi.example.com.  TXT  "v=BIMI1; l=https://example.com/bimi/logo.svg; a=https://example.com/bimi/vmc.pem"
```

- Requires DMARC at `quarantine` or `reject` on the organisational domain; Gmail also requires `pct=100` if `pct` is present.
- `l=` is an HTTPS URL to an SVG Tiny PS file. `a=` is the PEM certificate (Gmail accepts a VMC or a CMC; other providers set their own rules).
- Display is at the mailbox provider's discretion even when everything validates.

## One-click unsubscribe headers (RFC 8058)

```
List-Unsubscribe: <https://example.com/unsub?t=opaque-token>, <mailto:unsub@example.com?subject=unsub>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

- The HTTPS endpoint must accept a POST with body `List-Unsubscribe=One-Click` and unsubscribe without further confirmation or login.
- Both headers must be covered by the DKIM signature.
- The token identifies the recipient and list; it must not be guessable or expose the address.

## Useful checks

```
dig +short TXT example.com
dig +short TXT _dmarc.example.com
dig +short TXT default._bimi.example.com
dig +short -x <sending-ip>        # reverse DNS (PTR)
```

## Sources

- Gmail sender guidelines: https://support.google.com/a/answer/81126 and FAQ (48-hour unsubscribe): https://support.google.com/a/answer/14229414
- Outlook.com high-volume senders (`550 5.7.515`): https://support.microsoft.com/en-us/outlook/fix-ndr-error-550-5-7-515-in-outlook-com
- Gmail BIMI: https://knowledge.workspace.google.com/admin/security/set-up-bimi
- SPF: https://www.rfc-editor.org/rfc/rfc7208 . DMARC: https://www.rfc-editor.org/rfc/rfc9989 . One-click unsubscribe: https://www.rfc-editor.org/rfc/rfc8058
- CAN-SPAM: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
