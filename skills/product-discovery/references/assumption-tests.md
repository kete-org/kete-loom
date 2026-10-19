# Assumption tests

Pick the cheapest test that could prove the assumption wrong. Write assumption, test, metric, pass line and fail line before running it.

| Test | Good for | Cost | Watch out for |
|---|---|---|---|
| Data mining (analytics, support tickets, sales notes) | Does the behaviour already happen? How often? | Hours | Survivorship: you only see people who stayed |
| Follow-up interviews on one assumption | Why people act as they do | Days | Small N; behaviour still beats stated intent |
| One-question in-product survey | Frequency of a situation | Days | Ask about the past, not intent |
| Fake door / painted door | Desirability of an entry point | Days | Tell clickers it is coming; don't run on paying flows without sign-off |
| Landing page with sign-up | Demand from a new segment | 1 to 2 weeks | Traffic source shapes the result; compare to a baseline page |
| Concierge (do it by hand for a few customers) | Value of the outcome before building | Weeks | Doesn't test whether software can deliver it |
| Wizard of Oz (looks automated, a person does it) | Usability and value of a flow | Weeks | Hide nothing unethical; never collect data people didn't agree to |
| Clickable prototype usability test | Usability, comprehension | Days | Tests "can they", not "will they" |
| Technical spike | Feasibility | Days | Use the `feasibility-spike` skill |
| Pre-order / letter of intent | Willingness to pay (B2B) | Weeks | Legal and refund terms need a qualified reviewer |

## Reading the result

- Pass: move on to the next riskiest assumption; don't re-test to feel better.
- Fail: drop or reshape the solution; record what you learned under the opportunity.
- In between: decide in advance what you'll change and rerun once. A second muddy result counts as a fail.
