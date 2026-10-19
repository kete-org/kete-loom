# Prioritisation methods

Whatever the method, every input gets a source column: interview count, analytics query, sales data, engineering estimate, or "guess".

## RICE

Score = (Reach x Impact x Confidence) / Effort

| Input | Scale | Source it from |
|---|---|---|
| Reach | people or events per period (for example customers per quarter) | analytics, CRM counts |
| Impact | 3 massive, 2 high, 1 medium, 0.5 low, 0.25 minimal | interviews, past experiments |
| Confidence | 100% high, 80% medium, 50% low | how much evidence backs reach and impact |
| Effort | person-months (or person-weeks, used consistently) | engineering estimate |

Below 50% confidence, don't score; run a test first.

## ICE

Score = Impact x Confidence x Ease, each 1 to 10. Fast and coarse; use it to sort early ideas, not to fund work. Write one line on why each number was chosen.

## Cost of delay and CD3

- Cost of delay: value lost per week while the item is not live (lost revenue, cost of manual work, penalty risk). Name the type: standard, urgent with a deadline, or fixed date.
- CD3 = cost of delay per week / duration in weeks. Highest first.
- Good when items differ a lot in size and timing; weak when value can't be estimated in money at all.

## Presenting

| Idea | Reach (source) | Impact (source) | Confidence | Effort (source) | Score | Why |
|---|---|---|---|---|---|---|

Then add a sensitivity line: which single input, changed by a plausible amount, would change the top pick.
