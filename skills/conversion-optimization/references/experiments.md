# A/B test planning and reading

## Sample size for a conversion rate (two variants, fixed horizon)

n per variant = (z_alpha/2 + z_beta)^2 x [p1(1 - p1) + p2(1 - p2)] / (p2 - p1)^2

- p1: baseline conversion rate of the primary metric, from a recent full period.
- p2: p1 x (1 + minimum detectable effect). Pick the smallest lift worth acting on, not the lift you hope for.
- alpha 0.05 two-sided: z = 1.96. Power 80%: z = 0.84 (90%: 1.28).

Worked example: baseline 4.0%, minimum detectable relative lift 20% (to 4.8%), alpha 0.05, power 80%:
(1.96 + 0.84)^2 x (0.04 x 0.96 + 0.048 x 0.952) / 0.008^2 = about 10,300 visitors per variant.

Run length = total sample / eligible daily traffic, rounded up to full weeks. More than two variants: split alpha (for example Bonferroni) or plan for it; each extra variant raises the sample needed.

Halving the detectable effect roughly quadruples the sample. If the number is out of reach, test a bolder change or accept a weaker method.

## Plan template (fill before launch)

```
Hypothesis: Because <evidence>, changing <element> to <change> will raise <primary metric> for <audience>.
Primary metric: <exact definition, numerator / denominator, attribution window>
Guardrails: <metric - threshold that blocks a ship>
Baseline: <rate, period, source>
Minimum detectable effect: <relative %>   Alpha: 0.05   Power: 0.8
Sample per variant: <n>   Run length: <full weeks>   Split: 50/50
Audience and exclusions: <new visitors, devices, bots/internal excluded>
Stop rule: fixed horizon at <date or n> / sequential method <name>
Decision: win -> ship; loss -> keep control; inconclusive -> keep simpler variant, log learning
Owner, sign-off date:
```

## Sample ratio mismatch

Chi-square goodness of fit on assignment counts against the planned split. With 50/50: chi2 = sum((observed - expected)^2 / expected). With 1 degree of freedom, chi2 above 3.84 means p < 0.05; many teams use a stricter p < 0.001 (chi2 above 10.83) to flag SRM. Causes: redirects that lose one variant's users, bot filtering applied unevenly, assignment after a slow script, caching.

## Result summary template

```
Test: <name>   Dates: <start - end>   Planned n reached: yes/no
SRM check: <counts, p-value>
Primary: control <rate> vs variant <rate>; difference <abs and rel> (95% CI <low, high>)
Guardrails: <each - ok / breached>
Decision (per plan): <ship / keep control / inconclusive>
Learning and next test: <...>
```
