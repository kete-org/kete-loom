---
name: literature-review
description: Scientific literature review that plans a reproducible search across PubMed, Google Scholar and arXiv, screens papers against written inclusion and exclusion criteria, appraises study design and risk of bias, extracts effect sizes into a table, cites each claim to a DOI or PMID, and states how certain the evidence is. Use when someone needs a literature review, a background or related-work section for a paper or grant, an evidence summary on a scientific or clinical question, or a PRISMA-style record of how studies were found and screened.
license: MIT
compatibility: Any Agent Skills host. Searching needs network access to PubMed (NCBI E-utilities), arXiv, OpenAlex, Crossref and Google Scholar; without it, work only from papers the user supplies.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: data
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Literature review

Produce a review a reader could repeat: the same search, the same screening rules, and every claim traceable to a paper you actually read.

## Scope and limits

- This skill organises and summarises published evidence. It is **not** a formal systematic review, meta-analysis or clinical guideline. If the output will inform patient care, regulatory submissions or a published systematic review, say so and tell the user a qualified reviewer (and, for a systematic review, a second independent screener and an information specialist) must check it.
- Never invent a paper, author, DOI, PMID, page number, sample size or effect size. If you cannot open a source, say "not retrieved" rather than guessing what it says.

## 1. Frame the question (stop and ask if unclear)

1. Write the question in one sentence. For clinical or intervention questions, break it into PICO: Population, Intervention or exposure, Comparator, Outcome. For other fields use the closest equivalent (system, method, baseline, metric).
2. Agree with the user on: review type (narrative overview, scoping review, or systematic-style), date range, languages, study types wanted, and the deliverable (related-work section, evidence table, full report).
3. If the user cannot state the outcome they care about, stop and ask. A review without a defined outcome cannot be screened.

## 2. Write the inclusion and exclusion criteria before searching

Record them as a short list, for example:

- Include: peer-reviewed primary studies or preprints, 2015 onward, adult humans, reports outcome X.
- Exclude: editorials, conference abstracts without data, animal-only studies, duplicate reports of the same cohort.

Decide now how preprints are handled (included but flagged is the usual choice). Do not change the criteria after seeing results without noting the change and why.

## 3. Build and run the search

1. List synonyms and controlled vocabulary for each concept. Combine synonyms with `OR`, concepts with `AND`.
2. Run the strategy in each source and record the exact query string, the date run and the hit count. Source-specific syntax, field tags and API endpoints are in `references/search-sources.md`.
3. Use at least two sources. PubMed for biomedicine, arXiv for physics, maths, CS and quantitative fields, OpenAlex for a reproducible cross-disciplinary index with a citation graph, Google Scholar for breadth and grey literature (its results are not reproducible, so record it as supplementary).
4. Find landmark papers: in OpenAlex, sort the topic query by citation count, then read the top results' abstracts to confirm they are on topic. High citation counts favour older papers; also sort recent years separately.
5. Snowball: check the reference lists of key included papers (backward) and papers that cite them (forward). OpenAlex gives both directions and a list of related works for each record; Crossref resolves a DOI to its metadata and, where the publisher deposited them, its references.
6. For each included paper, take the open-access full-text link from its OpenAlex record when one exists, and read the full text before extracting numbers.
7. Respect source limits: NCBI E-utilities allow 3 requests per second without an API key and 10 with one; the arXiv API asks for no more than one request every three seconds on a single connection; OpenAlex and Crossref rate-limit with 429 responses, so back off and retry (details in `references/search-sources.md`). Do not scrape Google Scholar programmatically.

## 4. Screen

1. De-duplicate by DOI, then by title and first author.
2. Screen titles and abstracts against the criteria; then screen full texts for anything that passes.
3. Log every exclusion at full-text stage with one reason from your criteria list.
4. Keep counts for each stage (identified, duplicates removed, screened, full texts assessed, excluded with reasons, included). These are the numbers a PRISMA 2020 flow diagram needs.

## 5. Appraise quality

Judge each included study by its design before you weigh its findings. Use the checklist in `references/appraisal.md`:

- Design hierarchy as a starting point: systematic reviews of RCTs, RCTs, cohort, case-control, cross-sectional, case series, expert opinion. Benchmarks and simulation studies in computational fields are judged on dataset, baselines, and whether code and data are available.
- Named tools when the field uses them: Cochrane RoB 2 for randomised trials, ROBINS-I for non-randomised intervention studies, Newcastle-Ottawa Scale for cohort and case-control studies.
- Always note: sample size, preregistration, conflicts of interest, funding, retractions (check the journal page or Retraction Watch), and whether the result has been replicated.

## 6. Extract findings

Fill one row per study in an evidence table:

| Study (first author, year) | ID (DOI/PMID/arXiv) | Design | N | Population | Intervention / method | Comparator | Outcome and effect (with CI or error) | Risk of bias | Notes |

- Copy numbers exactly as reported, with units and the confidence interval or standard error. Mark values you computed yourself.
- Report the effect measure the paper uses (risk ratio, odds ratio, mean difference, accuracy); never convert between them without saying so.

## 7. Synthesise and state uncertainty

1. Group studies by outcome, then by design. Describe agreement and disagreement; explain disagreements by design, population or method where you can.
2. Do not count votes ("7 studies positive, 3 negative") as evidence strength. Weigh by size, design and risk of bias.
3. Rate certainty per main outcome. For health questions use GRADE wording (high, moderate, low, very low) and give the reasons for downgrading: risk of bias, inconsistency, indirectness, imprecision, publication bias. For other fields use the same four words and the same reasons in plain language.
4. Name the gaps: populations not studied, outcomes not measured, methods never compared.
5. Do not pool numbers into a meta-analysis unless the user asked for one and the studies are comparable; if pooled, a statistician should check it.

## 8. Cite correctly

- Cite every factual claim to a specific paper. Prefer the DOI; give PMID or arXiv ID too when present.
- Cite the version you read. If a preprint has since been published, cite the published version and say so.
- Use the style the user names (Vancouver, APA, a journal's own). If none is given, use author-year in text and a full reference list with DOIs.
- Quote sparingly and with page or section. Paraphrase faithfully; never strengthen a hedged finding ("associated with" stays "associated with", not "causes").

## Never

- Cite a paper from its abstract alone when the claim depends on methods or numbers in the full text; mark it "abstract only" if that is all you could access.
- Present a Google Scholar-only or unsearched topic as comprehensive.
- Drop studies that contradict the expected answer.

## Report format

```
# <Question>
Scope: <review type, date range, sources, date searched>
## Search
<source>: <exact query> (<date>, <hits>)  ... one line per source
## Screening
Identified N, duplicates N, screened N, full text N, excluded N (reasons), included N
## Evidence table
<table from step 6>
## Synthesis
<per outcome: what the evidence shows, certainty rating, reasons>
## Gaps and limitations
<including limits of this review itself>
## References
<full list with DOIs>
```

If the user wants only a related-work section, still keep the search and screening log as an appendix so the review can be checked.
