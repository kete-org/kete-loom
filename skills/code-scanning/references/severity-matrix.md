# Severity × exposure → priority

Severity is the impact if the finding is exploited, which you confirm in triage rather than take from the scanner's label. Exposure is who can reach the vulnerable code. Read the priority from the table and put it in the report next to the severity.

| Severity ↓ / Exposure → | Public (anonymous internet) | Authenticated (any signed-in user, other tenants) | Internal (VPN, private network, maintainers only) | Test-only / dev tooling, never shipped |
|---|---|---|---|---|
| **Critical** | P0: fix now, consider taking the endpoint down | P0 | P1 | P3 |
| **High** | P0 | P1 | P2 | P3 |
| **Medium** | P1 | P2 | P3 | P4 |
| **Low** | P2 | P3 | P4 | P4 |

- **P0**: fix before anything else ships. For a leaked live secret, rotate it today, even if the key is "internal".
- **P1**: fix this sprint, and gate the release.
- **P2**: schedule it, and track it with an issue.
- **P3**: fix when the code is next touched, or record an accepted risk with a reason.
- **P4**: hardening backlog. Suppress only with a reason.

## Deciding exposure

- **Public**: the code runs behind a route, webhook, queue or file input that an anonymous caller can reach. A CI workflow triggered by `pull_request_target`, `issue_comment` or `issues` counts as public, because anyone can open a PR or an issue.
- **Authenticated**: the caller needs an account. Self-signup makes "authenticated" nearly public. Say so, and move one column left.
- **Internal**: reachable only from a private network or by people with write access. SSRF and supply-chain chains can make internal code reachable. Check for them before choosing this column.
- **Test-only**: the file never reaches production builds or images. Confirm with the build config (`files` in `package.json`, `.dockerignore`, build tags). Code that sits in `src/` and is only called from tests is not test-only.

## Secrets are their own case

A committed credential's exposure is everyone who can read the repository **or its history**, at any time since the commit. Public repository: Public column. Private: Authenticated column at least, because forks, CI logs, laptops and ex-staff all hold copies. Removing the file does not change the column. Only rotation closes it.
