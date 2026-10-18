# .planning/ file templates

Copy a template, fill every bracket, delete any section that would stay empty. Keep each file short: a reader should get the picture in two minutes.

## PROJECT.md

```markdown
# <Project name>

Updated: <YYYY-MM-DD>

## What it is
<Two or three sentences: what it does and for whom.>

## Core value
<The one thing that must work well, even if everything else is cut.>

## Users
- <User type>: <what they need from it>

## Constraints
- <Stack, platform, deadline, budget, compliance or hosting limits, each with its source>

## Out of scope
- <Things people might expect that this project will not do>

## Key decisions
| Date | Decision | Why | Status |
|------|----------|-----|--------|
| <YYYY-MM-DD> | <decision> | <reason> | locked / open / superseded by <date> |
```

## REQUIREMENTS.md

```markdown
# Requirements

IDs are permanent. Status: planned, in-progress, met, deferred, dropped.

## <Area, e.g. Authentication>
| ID | Requirement | Acceptance | Priority | Phase | Status |
|----|-------------|-----------|----------|-------|--------|
| AUTH-01 | <user-visible behaviour> | <one testable check> | must | 02 | planned |

## Deferred and dropped
| ID | Reason | Decided |
|----|--------|---------|
```

## ROADMAP.md

```markdown
# Roadmap

## Milestone <version>: <name> (<active | closed, see milestones/<version>/>)
Goal: <one sentence>

### Phase 01: <name> - <status>
Goal: <what a user or caller can do when it is done>
Requirements: <IDs>
Depends on: <phase numbers or "none">
Track: <workstream name, only when workstreams are used>
Success criteria:
1. <observable check, e.g. "POST /login with a wrong password returns 401 and logs no password">
2. <...>
```

## STATE.md

```markdown
# State

Updated: <YYYY-MM-DD>

Milestone: <version> - <name>
Phase: <NN> <name> (<NN> of <total in milestone>)
Status: <planned | specified | planned-in-detail | in-progress | verifying | done | between milestones>
Last activity: <YYYY-MM-DD> - <what happened>
Last commit checked: <short sha>

## Blockers
- <blocker, who can clear it> (or "none")

## Recent decisions
- <YYYY-MM-DD> <decision> (full entry in PROJECT.md)

## Next
<one concrete action>
```

## DEFECTS.md

```markdown
# Defects ledger

Known problems found but not fixed in the scope where they were found. Severity: critical, high, medium, low.

| ID | Found | Where | Problem | Severity | Status | Target |
|----|-------|-------|---------|----------|--------|--------|
| D-001 | <YYYY-MM-DD>, phase 02 | <path:line> | <one line> | high | open / fixed in <sha> / accepted (<reason>) | phase 04 / next milestone |
```

## milestones/<version>/SUMMARY.md

```markdown
# Milestone <version>: <name>

Closed: <YYYY-MM-DD>

## Shipped
- <ID>: <one line>

## Deferred
- <ID>: <reason, where it went>

## Decisions
- <decision and date>

## Defects carried forward
- <D-NNN>: <one line>

## Lessons
- <at most five>
```
