# UAT file template

Copy this into the UAT file and fill it in as the session runs. Update the summary counts and `updated` line after every result, so a later session can resume from the file alone.

```markdown
# UAT: <feature or phase name>

- Source of truth: <plan, ticket, spec path or link>
- Branch / commit: <branch> @ <sha>
- Started: <date>   Updated: <date>
- Status: in progress | complete
- Summary: <n> pass, <n> fail, <n> skipped, <n> blocked, <n> pending

## Cold start

- Method: fresh clone in <tmp path> | container <image> | not needed (<why>)
- Result: pass | fail | blocked
- Notes: <every missing, wrong or unclear setup step>

## Checks

### R1.1 Sign up with email (happy path)
- Do: open http://localhost:3000/signup, enter `uat+1@example.test` and a 12-character password, submit.
- Expect: redirected to /welcome showing "Check your inbox"; one email in the test mailbox.
- Status: pass
- Notes:

### R1.2 Sign up with an existing email (error)
- Do: repeat R1.1 with the same address.
- Expect: stays on /signup with "An account with this email already exists" under the email field.
- Status: fail [major]
- Reported: "It just spins forever, nothing happens."
- Reproduction: steps above on <branch>@<sha>, Chrome; network tab shows POST /api/signup 500.
- Handed off: systematic-debugging, <date>
- Fix: <sha>, re-tested <date> -> fixed

## Gaps

- <requirement ID>: <what is missing or failing>, severity, next step

## Still unverified

- <requirement or check>: <skipped | blocked | no check | out of scope> - <reason>
```
