# Availability checks

Run these for each shortlisted name and each channel in the brief. Record the command or URL, the result and the date. Lowercase the name for registries. Be polite: one request at a time, a short pause between names, and an identifying User-Agent.

## Domains

- RDAP (structured, works for most gTLDs):
  `curl -sL -w '\n%{http_code}\n' https://rdap.org/domain/<name>.<tld>`
  rdap.org redirects to the registry's own RDAP server (hence `-L`). `200` with a domain record means registered. A `404` from the registry usually means not registered, but rdap.org also returns `404` with the body title "No RDAP service is available for this resource" when the TLD has no RDAP service (many country-code TLDs, for example `.ch`). Always read the body: that message means "not checked", never "free"; fall back to whois or the registry's own search.
- whois, if installed: `whois <name>.<tld>` and read the registrar and status lines. Wording for "not found" varies by registry.
- An unregistered domain may still be a premium or reserved name at a high price; check a registrar's search page before recommending it.
- A registered domain may be parked and for sale; report it as taken.

## Package registries

Status 404 means the name is free in that registry; 200 means it exists.

| Registry | Check | Notes |
|---|---|---|
| npm | `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/<name>` | A 404 is not a guarantee: npm refuses new names that match an existing one once punctuation is removed (`reactnative` vs `react-native`) and runs further undocumented similarity checks at publish time. A scoped name (`@org/<name>`) avoids clashes. |
| PyPI | `curl -s -o /dev/null -w '%{http_code}\n' https://pypi.org/pypi/<name>/json` | PyPI normalises names (PEP 503: case-insensitive, runs of `-`, `_` and `.` are equal), so check the normalised name. PyPI can also reject a free name at upload as "too similar to an existing project". |
| crates.io | `curl -s -o /dev/null -w '%{http_code}\n' -A '<project> naming check (<contact>)' https://crates.io/api/v1/crates/<name>` | crates.io returns `403` without an identifying User-Agent and asks API users to stay under one request per second. It treats `-` and `_` as the same name, and the API resolves either spelling. |
| Others | Look up the registry the brief names (RubyGems, Go module path, Homebrew, app stores) on its own site. | |

## Code hosting and handles

- GitHub organisation or user: `curl -s -o /dev/null -w '%{http_code}\n' https://github.com/<name>`; 404 suggests free. With the GitHub CLI, `gh api users/<name>` returns 404 when the login is unused.
- Social handles: check each platform's profile URL by hand; many block automated checks. Report as "not checked" rather than guessing.

## Trademarks (first screen only)

Search the registers for the regions in the brief, in the relevant classes of goods and services:

- United States: USPTO Trademark Search at `https://tmsearch.uspto.gov` (federal marks only; state and unregistered common-law marks are not included).
- European Union and many national offices: TMview at `https://www.tmdn.org/tmview`.
- International registrations: WIPO Global Brand Database at `https://branddb.wipo.int`.
- Other countries: the national IP office's own search.

Look for identical and confusingly similar marks (sound, spelling, meaning) in related classes, not only exact matches. Also do a plain web search for the name plus the product category, since unregistered use can still create conflicts.

Always state in the report that this is not a clearance opinion and that a qualified trademark professional should review before the name is adopted commercially.
