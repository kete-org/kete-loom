# Appraising study quality

Read this in step 5. Record a judgement and a one-line reason for every item; "unclear" is an allowed answer.

## Any primary study

1. Is the question and primary outcome stated in advance (registration, protocol, preregistration)?
2. Is the sample size adequate, and was it justified (power calculation)?
3. How were participants or data selected? Could selection explain the result?
4. Are the comparison groups comparable at baseline?
5. Were outcomes measured the same way in every group, ideally blind to group?
6. How much missing data or loss to follow-up, and how was it handled?
7. Are confounders measured and adjusted for (observational designs)?
8. Are all prespecified outcomes reported, or only the significant ones?
9. Effect size with a confidence interval, not just a p-value?
10. Funding source and conflicts of interest declared?
11. Retracted, corrected or subject to an expression of concern?

## Named tools

| Design | Tool | Domains (summary) |
|---|---|---|
| Randomised trial | Cochrane RoB 2 | randomisation process, deviations from intended interventions, missing outcome data, outcome measurement, selection of the reported result |
| Non-randomised intervention study | ROBINS-I V2 (Nov 2025 draft; check riskofbias.info for the current version) | confounding, classification of intervention, selection into the study, missing data, measurement of the outcome, selection of the reported result (V2 dropped the 2016 version's deviations-from-intended-interventions domain) |
| Cohort or case-control | Newcastle-Ottawa Scale | selection, comparability, outcome or exposure |
| Diagnostic accuracy | QUADAS-2 | patient selection, index test, reference standard, flow and timing |
| Systematic review | AMSTAR 2 | 16 items, including protocol, search, duplicate selection and extraction, risk-of-bias assessment, meta-analysis methods, publication bias |

Apply the tool's official guidance documents; this table is a reminder, not a substitute. Sources: RoB 2 and ROBINS-I at https://www.riskofbias.info/ , Cochrane Handbook chapter 8 (https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-08), QUADAS-2 (Whiting 2011, PMID 22007046), AMSTAR 2 (https://amstar.ca/Amstar_Checklist.php), GRADE Handbook (https://gdt.gradepro.org/app/handbook/handbook.html).

## Computational and benchmark studies

- Dataset: public, described, and free from train/test leakage?
- Baselines: strong, recent and tuned with the same effort?
- Variance: multiple seeds or runs, with error bars?
- Code and data available, and does the reported result reproduce?
- Claims match the evaluation (no general claims from one dataset)?

## Certainty of a body of evidence (GRADE-style)

Start high for randomised evidence and low for observational evidence, then move down for: risk of bias, inconsistency (results disagree), indirectness (different population or outcome from the question), imprecision (wide intervals, small samples), publication bias. Observational evidence may move up for a large effect, a dose-response gradient, or when all plausible residual confounding would have reduced the observed effect. State the final level (high, moderate, low, very low) and each reason.
