# Edge and prohibition probes

Pick the probes whose trigger matches the change. Skip any the spec already answers. Phrase each as a concrete question with the case filled in ("What happens when the CSV has a header row but no data rows?"), not as the category name.

## Edge probes, by what the change handles

| If the change... | Ask about |
|---|---|
| Takes user input or a file | Empty input; whitespace only; maximum size and one over it; wrong encoding or format; a valid-looking but malicious value |
| Takes a number, date or amount | Zero; negative; the largest allowed; rounding and units; time zones and daylight-saving changes; dates at month or year end |
| Works on a list or collection | No items; one item; very many items (pagination, timeouts); duplicates; ordering |
| Creates or updates a record | The record already exists; it was deleted meanwhile; two requests at the same moment; a retry after a timeout |
| Calls another service or API | It is slow; it returns an error; it times out after doing the work; it returns something unexpected; it is down for an hour |
| Runs in steps or a job | It fails halfway; it is run twice; it is stopped and restarted; what the user sees while it runs |
| Depends on who the caller is | Not signed in; signed in without permission; acting on someone else's data; an admin; a deleted or suspended account |
| Changes existing behaviour | Existing data in the old shape; clients on the old version; how to roll it back |
| Sends something to people | The address is invalid; the person opted out; the message is sent twice; language and locale |
| Is time-based | It runs late; it runs early; the clock jumps; it overlaps with the previous run |

## Prohibition probes, by domain

Offer the ones that fit; ask the user to confirm, reword or reject each.

- **Data:** never delete or overwrite user data without a recoverable copy; never mix one tenant's data into another's view.
- **Money:** never charge without a matching order; never charge or pay out twice for one action; never trust an amount sent by the client.
- **Messages:** never send to someone who opted out; never send one person's details to another.
- **Security:** never log secrets, tokens or full card numbers; never return another user's record by changing an ID; never weaken an existing permission check.
- **Compatibility:** never change a public API, file format or database column in a way that breaks current callers without a migration.
- **Operations:** never block the main request path on a slow external call; never run a destructive migration without a backup step.
- **Product:** never show a success state when the action failed.

For each confirmed prohibition, agree on how it is checked: a test that tries the forbidden thing and expects refusal, a database constraint, a lint or a review checklist line.

## Question bank for thin specs

When a dimension is stuck at 0, start with one of these.

- **Goal:** Who uses this first, and what are they doing right before they need it? What would make you call this a failure even if it works?
- **Boundaries:** What is the closest thing this should *not* turn into? Which existing screens, endpoints or jobs must behave exactly as before?
- **Constraints:** Is there a response time, data volume or cost this must stay under? Any library, service or pattern we must use or must avoid?
- **Acceptance:** If you tried this for five minutes, what would you do to convince yourself it works? What data would you use?
