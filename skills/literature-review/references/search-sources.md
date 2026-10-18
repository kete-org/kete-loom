# Search sources

Read this when building or running the search in step 3.

## PubMed

- Web: https://pubmed.ncbi.nlm.nih.gov/ . Use "Advanced" to see the query translation PubMed actually ran, and record it.
- Field tags: `[tiab]` title/abstract, `[mh]` MeSH heading, `[majr]` MeSH major topic, `[au]` author, `[dp]` publication date, `[pt]` publication type.
- Example: `("sleep deprivation"[mh] OR "sleep restriction"[tiab]) AND ("working memory"[tiab] OR "memory, short-term"[mh]) AND 2015:2025[dp]`
- Look up MeSH terms in the MeSH database before relying on them; newer papers may not be indexed with MeSH yet, so always pair `[mh]` with `[tiab]` synonyms.
- Programmatic access, NCBI E-utilities, base `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`:
  - `esearch.fcgi?db=pubmed&term=<query>&retmax=200&usehistory=y` returns PMIDs (and a WebEnv for large sets).
  - `efetch.fcgi?db=pubmed&id=<pmids>&rettype=abstract&retmode=xml` returns records.
  - `esummary.fcgi?db=pubmed&id=<pmids>` returns brief metadata.
  - Pass `tool`, `email` and, if you have one, `api_key`. Limit: 3 requests/second without a key, 10 with one.
- Biopython wrapper: `Bio.Entrez` (set `Entrez.email` first).

## arXiv

- Web search: https://arxiv.org/search/ ; API: `https://export.arxiv.org/api/query?search_query=<q>&start=0&max_results=100` returns Atom XML.
- Field prefixes: `ti:` title, `abs:` abstract, `au:` author, `cat:` category (for example `cat:cs.LG`), `all:`. Combine with `AND`, `OR`, `ANDNOT`.
- Example: `search_query=abs:"graph neural network" AND cat:q-bio.QM`. URL-encode it in the request: spaces as `+`, quotes as `%22` (`abs:%22graph+neural+network%22+AND+cat:q-bio.QM`).
- Terms of use: no more than one request every three seconds, one connection at a time.
- arXiv papers are preprints and are not peer reviewed. Check whether a later published version exists (the arXiv page often lists a journal reference or DOI).

## Google Scholar

- Useful for breadth, citations ("Cited by" for forward snowballing) and grey literature.
- Operators documented in Scholar help: quotes for phrases, `author:`, `site:`; use Advanced search for title-only words and the sidebar for a date range. Each query returns at most 1,000 results.
- Results are personalised and change over time; record them as supplementary and not as a reproducible search. No official API; do not scrape it.

## Other sources worth naming to the user

- Europe PMC (includes preprints and full text, has a REST API), Semantic Scholar (API with citation graph), Crossref (DOI metadata), bioRxiv / medRxiv (life-science preprints), Cochrane Library (systematic reviews), ClinicalTrials.gov (registered and unpublished trials), field databases such as Embase, Web of Science, Scopus, PsycINFO, IEEE Xplore, ACM DL (often need an institutional subscription).

## Search log template

| Source | Date run | Exact query | Filters | Hits | Exported to |
|---|---|---|---|---|---|
