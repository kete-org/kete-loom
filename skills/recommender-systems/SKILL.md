---
name: recommender-systems
description: Designs and debugs recommendation, ranking and personalised feed systems as a multi-stage pipeline, from candidate generation with co-visitation, two-tower retrieval and approximate nearest neighbour indexes (FAISS, ScaNN, HNSW), through a learned ranker on logged impressions, to re-ranking for diversity, freshness and business rules, plus cold-start fallbacks, leakage-free time-based offline evaluation with recall@k, NDCG and coverage, and online A/B tests with guardrail metrics. Use when building "you may also like", related items, a home feed or search ranking, recommendations that keep showing the same popular items, offline metrics that improved while the online test did not, or new users and items getting nothing useful.
license: MIT
compatibility: Any Agent Skills host. Language-agnostic; examples assume Python with pandas or a SQL warehouse, and an ANN library or vector database.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Recommender systems

Build a recommender in stages, each with its own measurable job: retrieve a few hundred plausible items fast, rank them well, then re-rank for what the business and the user experience need. Prove every change offline on a time-based split, then online.

Document retrieval for LLM answers belongs to `rag-pipeline-patterns`. Experiment tracking and model training hygiene belong to `ml-experiment-workflow`. Product KPI boards belong to `metrics-dashboards`.

## 0. Frame the problem first

Before any model, write down with the user:

1. **Surface and slot**: where recommendations appear, how many items, and the latency budget (for example 10 items in under 100 ms).
2. **Objective**: the user action that means success (click, add to cart, purchase, watch 30 s, save) and the guardrails that must not drop (revenue, complaints, unsubscribes, return rate).
3. **Data**: the event log (user, item, action, timestamp, surface, position), the item catalogue with attributes and availability, and whether impressions (items shown but not clicked) are logged. Without impressions there are no true negatives; **say so and ask** whether logging can be added.
4. **Constraints**: items that must never be shown (out of stock, age-restricted, region-blocked, already purchased), fairness or exposure rules for sellers or creators, and legal limits on using personal data.

If the objective or the never-show rules are unclear, **stop and ask**.

## 1. Baselines before models

Ship and measure these first; many products never need more:

1. Popularity in the last N days, per segment (region, category).
2. Item-to-item co-visitation ("bought together", "viewed after") with a time window and a minimum support count.
3. The user's recent items and their neighbours.

Every later model must beat the best baseline on the same evaluation.

## 2. Candidate generation (recall)

Goal: a few hundred candidates per request that contain the items the ranker would pick.

- Combine several sources and merge them: co-visitation, content similarity (embeddings of title, text, image), collaborative embeddings, popularity fallback.
- **Two-tower retrieval**: a user (or query) tower and an item tower trained so their dot product predicts interaction; train with in-batch or sampled negatives and correct the sampling bias towards popular items (logQ correction). Serve item vectors from an ANN index.
- **ANN index**: FAISS (IVF, HNSW, PQ), ScaNN, hnswlib, or the vector store already in the stack (pgvector, OpenSearch, Vespa, Qdrant). Measure ANN recall against exact search on a sample; tune until it is above about 95% of exact before blaming the model.
- Apply hard filters (availability, region, never-show rules) here or immediately after, so the ranker never sees forbidden items.
- Measure each source by recall@k of the next real interaction.

## 3. Ranking

1. Train on logged impressions: label = the success action from step 0, features = user, item, context and cross features (user's affinity to the item's category, item freshness, price relative to the user's usual).
2. Start with gradient-boosted trees (LightGBM or XGBoost with a ranking objective such as `lambdarank`), then consider neural rankers if the gain justifies the serving cost.
3. Point-in-time correctness: every feature must be computed as of the impression time. Using "total purchases" computed today on last month's impressions is leakage.
4. Handle position bias: items at the top get clicked more. Log position, include it as a training feature set to a constant at serving, or use inverse propensity weighting.
5. Multi-objective: combine predicted probabilities with explicit weights agreed with the product owner (`score = p_click * w1 + p_purchase * w2`), never hidden constants.

## 4. Re-ranking and business rules

Apply after the ranker, in this order, and log what each step changed:

1. Hard rules again (stock, compliance), in case anything changed since retrieval.
2. Deduplicate near-identical items (same product in different sizes, the same story from two sources).
3. Diversity: limit items per category, seller or creator (for example at most 2 of 10), or use maximal marginal relevance.
4. Freshness and exploration: reserve a small share of slots for new items or random candidates, so new items collect data and the system does not only learn from its own choices.
5. Sponsored or boosted items: label them, and cap them.

## 5. Cold start

- **New user**: popularity by context (region, device, entry page), onboarding choices, and the session's own clicks as soon as there is one.
- **New item**: content-based embedding from its attributes, the exploration slots from step 4, and similarity to items it resembles.
- Decide the threshold (number of interactions) at which a user or item moves from fallback to the personalised path.

## 6. Offline evaluation

1. Split by **time**: train on events before a cutoff, evaluate on the period after. Never random-split interactions; it leaks the future.
2. Metrics, at the slot size k:
   - Retrieval: recall@k (or hit rate@k) of held-out interactions.
   - Ranking: NDCG@k, MRR or MAP on the impressions actually shown.
   - Beyond accuracy: catalogue coverage, share of recommendations from the top 1% most popular items, novelty, and diversity within a list.
3. Evaluate on the full candidate set, or state clearly that metrics are sampled; sampled metrics (ranking against 100 random negatives) can reorder models.
4. Report by segment: new versus returning users, head versus tail items.

Details of formulas and pitfalls are in `references/evaluation.md`.

## 7. Online evaluation

1. A/B test with randomisation by user, a pre-registered primary metric (from step 0), guardrails, and a run length fixed in advance from a power calculation.
2. Check for sample ratio mismatch before reading results.
3. Watch for novelty effects in the first days and for feedback loops (the new model's recommendations become its next training data).
4. Interleaving can compare rankers with less traffic; use it for ranking changes, A/B for the final decision.

If offline gains do not show online, check in order: train/serve feature skew, leakage in offline features, position bias, a mismatch between the offline label and the online metric.

## 8. Serving

- Precompute what you can (item embeddings, co-visitation lists, batch recommendations for low-traffic surfaces); compute per request only what depends on the session.
- Log every served list with request ID, model version, candidates' sources, scores and positions, so outcomes can be joined back for training and debugging.
- Keep a fallback (popularity list) for timeouts and missing features.

## Never

- Never evaluate on a random split of interaction logs.
- Never ship a model that has not beaten the best baseline on the same split.
- Never use sensitive attributes (health, religion, sexuality, ethnicity, precise location) as features or targeting without explicit review by the data owner and legal; flag it and stop.
- Never let business boosts bypass the hard never-show rules.

## Report back

```
## Recommender: <surface>
Objective: <success action>, guardrails: <list>
Pipeline: candidates <sources, k> -> ranker <model, features> -> re-rank <rules>
Cold start: <users>, <items>
Offline (time split <dates>): baseline vs model on recall@k, NDCG@k, coverage, by segment
Online plan: <A/B design, primary metric, guardrails, duration>
Logging gaps: <impressions, positions, model version>
Risks: <leakage, feedback loops, sensitive data>
```
