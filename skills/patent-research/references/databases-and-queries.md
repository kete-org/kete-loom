# Databases and query patterns

Read this when building a search (section 1). Syntax changes; if a query fails, check the database's own help page and note the syntax you used in the search log.

## Patent databases

| Database | URL | Best for |
|---|---|---|
| USPTO Patent Public Search | ppubs.uspto.gov | full text of US grants and published applications; Basic and Advanced search with field codes |
| USPTO Patent Center | patentcenter.uspto.gov | US file wrappers, status, fees paid |
| Global Dossier | via the USPTO site | file histories across the main patent offices for one family |
| EPO Espacenet | worldwide.espacenet.com | worldwide coverage, families (simple and INPADOC), CPC browsing, INPADOC legal status |
| European Patent Register | register.epo.org | authoritative status of European applications and patents |
| Google Patents | patents.google.com | fast full-text search with machine translation, CPC filters, citations, "similar documents"; status is not authoritative |
| WIPO PATENTSCOPE | patentscope.wipo.int | PCT international applications, national collections, cross-lingual search |
| CPC scheme | cooperativepatentclassification.org | class definitions and titles (CPC is run jointly by the EPO and USPTO) |

## Trademark databases

| Database | URL | Notes |
|---|---|---|
| USPTO Trademark Search | tmsearch.uspto.gov | replaced TESS in November 2023; different syntax from TESS |
| TMview | via tmdn.org | EUIPO and many national and international registers in one search |
| WIPO Global Brand Database | branddb.wipo.int | international registrations (Madrid) and many national collections |
| Nice Classification | WIPO site | goods and services classes; check the edition in force |

## Query patterns

Build each query as concept blocks joined with AND, synonyms inside a block joined with OR, and a class block when you have one.

Espacenet Smart search (field identifiers such as `ti` title, `ab` abstract, `ta` title or abstract, `cl` claims, `cpc` classification, `pa` applicant, `pd` publication date; `txt` covers different fields in different interfaces, and a `/low` qualifier widens a CPC symbol to its child groups; check the current help page):

```
ta=(drone OR "unmanned aerial") AND ta=(parcel OR package) AND cpc=B64U
pa="acme" AND pd>=2018
```

Google Patents (search box terms plus filters; `cpc:B64U` includes child codes, `CPC=B64U/low` is the field form; `TI=`, `AB=`, `CL=`, `TAC=` restrict to title, abstract, claims or all three; the advanced form shows the date and country syntax it generates):

```
(drone OR "unmanned aerial vehicle") (parcel OR package) (winch OR tether)
cpc:B64U  before:priority:20200101  country:US,EP
```

USPTO Patent Public Search: use the Advanced search with field codes (for example `.ti.` title, `.ab.` abstract, `.clm.` claims, `.cpc.` classification) and proximity operators such as `ADJ`, `NEAR` and `SAME`; the system's help lists the full set.

## Tips

- Start broad, then add a block at a time; record hit counts at each step.
- Search claims text separately for FTO; a feature that appears only in the description is not claimed.
- Use applicant searches for competitors, then harmonise name variants (subsidiaries, old names).
- Check translations of non-English hits before dismissing them.
