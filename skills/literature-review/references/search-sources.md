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

## OpenAlex

- Open index of scholarly works (over 300 million records when checked in October 2026), CC0 metadata, REST API at `https://api.openalex.org/`. No key is needed for basic queries; a free key (`api_key=` parameter, from openalex.org account settings) raises the daily budget and is required for cursor paging past the first page. Keyless use is limited to 10 requests per second and a small shared daily budget. Ask the user before creating an account or a key on their behalf.
- Search and sort: `https://api.openalex.org/works?search=sleep+deprivation+working+memory&filter=publication_year:>2014&sort=cited_by_count:desc&per_page=50`
- Filters combine with commas (AND); `|` gives OR within one filter: `filter=type:article|preprint,open_access.is_oa:true`.
- Lookup by DOI: `https://api.openalex.org/works/doi:10.7717/peerj.4375`
- Snowballing from a work ID such as `W2741809807`:
  - backward: the record's `referenced_works` list, or `filter=cited_by:W2741809807`;
  - forward: `filter=cites:W2741809807` (sort by `cited_by_count:desc` or `publication_year:desc`);
  - sideways: the record's `related_works`, or `filter=related_to:W2741809807`.
- Useful fields: `doi`, `ids` (PMID, PMCID when known), `cited_by_count`, `is_retracted` (from Retraction Watch), `type`, `open_access.is_oa`, `open_access.oa_url`, `best_oa_location.pdf_url` and `.landing_page_url`. Use `select=` to fetch only these.
- `per_page` is at most 100; basic paging stops at 10,000 results. A 429 means slow down or the daily budget is spent.
- Coverage and metadata are machine-built: confirm titles, authors and years against the publisher page or DOI before citing.

## Crossref

- DOI metadata from publishers: `https://api.crossref.org/works/<doi>` (for example `/works/10.7717/peerj.4375`). Fields include `title`, `author`, `issued`, `container-title`, `is-referenced-by-count`, `reference` (only when the publisher deposited references) and `link`.
- No key needed. Add `mailto=<your email>` (or identify yourself in the `User-Agent`) to use the "polite" pool, which allows more requests and concurrency than the anonymous one; current limits are returned in the `x-rate-limit-*` response headers. Back off on 429.
- Use it to resolve DOIs found in reference lists and to check that a DOI you are about to cite exists and matches the paper.

## Google Scholar

- Useful for breadth, citations ("Cited by" for forward snowballing) and grey literature.
- Operators documented in Scholar help: quotes for phrases, `author:`, `site:`; use Advanced search for title-only words and the sidebar for a date range. Each query returns at most 1,000 results.
- Results are personalised and change over time; record them as supplementary and not as a reproducible search. No official API; do not scrape it.

## Other sources worth naming to the user

- Europe PMC (includes preprints and full text, has a REST API), Semantic Scholar (API with citation graph), bioRxiv / medRxiv (life-science preprints), Cochrane Library (systematic reviews), ClinicalTrials.gov (registered and unpublished trials), field databases such as Embase, Web of Science, Scopus, PsycINFO, IEEE Xplore, ACM DL (often need an institutional subscription).

## Search log template

| Source | Date run | Exact query | Filters | Hits | Exported to |
|---|---|---|---|---|---|
