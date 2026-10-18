---
name: email-deliverability
description: Gets email into the inbox instead of spam by setting up SPF, DKIM, DMARC and BIMI DNS records with alignment, splitting transactional and marketing mail onto separate subdomains and streams, choosing a sending provider, processing bounces and complaints, keeping lists clean and warming a new domain or IP. Use when mail lands in spam or bounces, a domain needs authenticating before sending, Gmail, Yahoo or Outlook bulk-sender rules must be met, or a new sending domain is about to go live.
license: MIT
compatibility: Any Agent Skills host. DNS checks use dig or nslookup; header checks need a raw message (.eml) or the provider's logs. Changes are made in the user's DNS host and email provider.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: network
  kete-loom/requires: "dig"
  kete-loom/owner: "Kete-org"
---

# Email deliverability

Make mail provably come from the domain it claims, keep receipts and password resets away from the reputation of newsletters, and stop sending to people who bounce, complain or never engage.

## Ground rules

1. **Authenticate every sending domain** with SPF and DKIM, then DMARC. Gmail requires SPF or DKIM for everyone, and SPF, DKIM and DMARC (`p=none` allowed) for anyone sending more than 5,000 messages a day to personal Gmail accounts. Outlook.com (hotmail.com, live.com, outlook.com) requires SPF and DKIM to pass and DMARC to pass with alignment (`p=none` allowed) for senders of 5,000 or more messages from one `From:` domain, and rejects failures with `550 5.7.515`.
2. **Alignment is what DMARC checks**: the `From:` domain must match the DKIM `d=` domain or the SPF (Return-Path) domain. A provider signing with its own domain passes DKIM but fails DMARC. Use custom DKIM and a custom return-path on your domain.
3. **Separate streams.** Transactional mail (receipts, resets, alerts) and marketing mail use different subdomains (for example `mail.example.com` and `news.example.com`) and, where the provider supports it, different streams or IP pools. A bad campaign must never delay a password reset.
4. **Never buy, rent or scrape lists** for marketing mail. Purchased lists contain spam traps and drive complaints; no technical setup fixes that.
5. **Marketing mail needs one-click unsubscribe**: a `List-Unsubscribe` header with an HTTPS URL, `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), and a visible link in the body. Honour it quickly (Google says within 48 hours; US CAN-SPAM allows at most 10 business days).
6. **Watch the complaint rate.** Keep Gmail's user-reported spam rate in Postmaster Tools under 0.1% and never let it reach 0.3%.
7. **Change DNS carefully.** Read the existing records before editing. A second SPF record, or a DMARC jump to `p=reject` before every sender is aligned, breaks real mail.

## Diagnose first

When the user says "our emails go to spam", collect before changing anything:

1. The exact `From:` address, the provider(s) that send for that domain (app, marketing tool, CRM, helpdesk, Google Workspace or Microsoft 365), and daily volume per stream.
2. Current records: `dig +short TXT example.com` (SPF), `dig +short TXT _dmarc.example.com`, `dig +short TXT <selector>._domainkey.example.com`, `dig +short MX example.com`.
3. Raw headers of one message that landed in spam. Read `Authentication-Results:` for `spf=`, `dkim=`, `dmarc=` and the domains each checked.
4. Data from Google Postmaster Tools and Microsoft SNDS if set up, plus the provider's bounce and complaint numbers.

Then decide:

| Finding | Fix |
|---|---|
| `dmarc=fail` with `dkim=pass` | DKIM signed by the provider's domain; set up custom DKIM on yours |
| `spf=permerror` | More than 10 DNS lookups or two SPF records; merge and flatten (`references/dns-records.md`) |
| All auth passes, still spam | Reputation or content: check complaint rate, list source, engagement, sudden volume jumps |
| Bounces with `5.7.x` codes | Policy rejection: authentication or reputation; read the bounce text, it usually names the rule |
| Only one mailbox provider affected | Check that provider's postmaster tools and its own requirements |

## Set up a sending domain

1. Choose subdomains per stream. List every service that will send as each one.
2. Add the provider's DKIM records (2048-bit keys where offered; Gmail requires at least 1024) and its custom return-path or bounce domain (a CNAME or MX record).
3. Publish one SPF record per domain name that sends, including only the services that use it: `v=spf1 include:<provider> ~all`. Record shapes in `references/dns-records.md`.
4. Publish DMARC at `p=none` with an aggregate report address: `v=DMARC1; p=none; rua=mailto:dmarc@example.com`. Read the reports for a few weeks (2 to 4 is a common rule of thumb) to find every legitimate sender.
5. Move to `p=quarantine`, then `p=reject` once reports show all real mail aligned. **Stop and ask the user** before each step.
6. BIMI only after DMARC is at `quarantine` or `reject`; it needs an SVG Tiny PS logo and, for Gmail, a mark certificate (a VMC, or a CMC for a logo that is not trademarked). Other mailbox providers, including Apple Mail, set their own BIMI rules; check the provider's current documentation before buying a certificate. Treat it as a branding extra, not a deliverability fix.
7. Set valid forward and reverse DNS (PTR) if you run your own sending IPs; hosted providers do this for you.

## Choose a provider

- Transactional: a provider with a dedicated transactional stream, webhooks for bounces and complaints, and per-message logs (for example Postmark, Amazon SES, SendGrid, Mailgun, Resend).
- Marketing: a tool that handles consent, unsubscribes, suppression lists and one-click headers for you.
- Shared IPs are right under roughly tens of thousands of messages a month; a dedicated IP needs steady volume to build a reputation. Ask the user for volume before recommending one.
- Never send bulk mail through a personal Google Workspace or Microsoft 365 mailbox.

## Bounces, complaints and list hygiene

1. Subscribe to the provider's bounce and complaint webhooks (or SES notifications) and write them to a suppression table keyed by address.
2. Hard bounce (`5.x.x`, unknown user): suppress immediately and permanently.
3. Soft bounce (`4.x.x`, mailbox full, throttled): retry per the provider; suppress after repeated failures across several sends.
4. Complaint (feedback loop, "report spam"): suppress from all marketing at once; it counts as an unsubscribe.
5. Check suppression before every send, across every tool that mails the same domain.
6. Use confirmed opt-in for sign-ups from public forms. Sunset marketing contacts with no opens or clicks for a long stretch (6 to 12 months is a common rule of thumb, not a provider rule) after a re-engagement attempt (opens are unreliable since Apple Mail Privacy Protection, so weight clicks).

## Warm a new domain or IP

1. Start with the most engaged recipients (recent sign-ups, active customers), not the whole list.
2. Grow volume gradually, roughly doubling while bounce and complaint rates stay low; hold or drop back if they rise. Two to six weeks is a common rule of thumb, not a mailbox-provider rule; follow the sending provider's warm-up plan if it has one.
3. Keep volume and timing steady; avoid one huge blast after weeks of silence.
4. Send transactional mail from day one; it is high-engagement and builds reputation.

## Never

- Publish two SPF TXT records, or use `+all`.
- Put a DMARC record at `p=reject` without reading reports first.
- Hide or break the unsubscribe link, or require login to unsubscribe.
- Re-import suppressed or bounced addresses into another tool.
- Rotate domains or IPs to escape a bad reputation ("snowshoeing").

## Report format

```
Domain(s): ...            Streams: transactional / marketing
Auth status: SPF pass|fail (lookups n/10)  DKIM aligned yes|no  DMARC p=...
Main problem: one sentence
Fixes, in order: 1. ... (DNS record or setting, exact value) 2. ...
Needs user decision: ...
Re-test: send to a seed list and read Authentication-Results
```

Mailbox-provider rules change. Check Google's and Yahoo's sender guidelines and Microsoft's Outlook sender requirements before stating a threshold as current; links are in `references/dns-records.md`.
