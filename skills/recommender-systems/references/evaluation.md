# Recommender evaluation details

Read this when implementing offline metrics or reviewing an evaluation someone else built.

## Definitions (per user, then averaged over users)

- **Hit rate@k**: 1 if any held-out item is in the top k, else 0.
- **Recall@k**: (held-out items in the top k) / (number of held-out items, or min(k, that number) if you normalise; state which).
- **Precision@k**: (relevant items in the top k) / k.
- **MRR**: 1 / rank of the first relevant item (0 if none in the list).
- **DCG@k**: sum over positions i = 1..k of (2^rel_i − 1) / log2(i + 1). With binary relevance this is rel_i / log2(i + 1).
- **NDCG@k**: DCG@k / IDCG@k, where IDCG is the DCG of the ideal ordering of that user's relevant items. Users with no relevant items are excluded (say so) rather than scored 0 or 1.
- **Catalogue coverage**: distinct items recommended across all users / items eligible.
- **Popularity concentration**: share of recommended slots taken by the top 1% most-interacted items.

## Splits

| Split | Use | Pitfall |
|---|---|---|
| Global time cutoff | Default | Users who appear only after the cutoff are cold-start; report them separately |
| Leave-last-out per user | Sequence models | Still leaks if other users' later events are in training; prefer a global cutoff |
| Random interaction split | Never | Future events train the model |

Rebuild features with the same cutoff. Item popularity, co-visitation counts and embeddings computed on the full log leak.

## Common mistakes

1. Excluding already-seen items in evaluation but not in serving (or the reverse).
2. Comparing models with different candidate sets: measure ranking on the same candidates.
3. Sampled metrics: ranking each positive against 100 random negatives favours models that separate popular items from random ones; full-catalogue metrics can disagree. Report full metrics when feasible.
4. Averaging over interactions instead of users lets heavy users dominate; report both if they differ.
5. Ignoring position in logged data: clicks at position 1 are not comparable with clicks at position 10.

## Online metrics checklist

- Primary: the success action per user (or per session), decided before launch.
- Guardrails: revenue per user, latency p99, error rate, complaints or hides, unsubscribes.
- Diagnostics: click-through by position, coverage, share of exploration slots that got engagement.
- Sample ratio mismatch: chi-squared test of assignment counts against the planned split before reading any metric.
