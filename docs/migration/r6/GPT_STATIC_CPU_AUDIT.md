# ZGMINI Cloudflare R6 — GPT Static CPU Audit

## Scope
Static analysis only. Baseline: `b696afd6bafdb4b7c5aa59f4fc48199edd49edca`.
No Production, DNS, D1, Worker, or migration branch changes were made.

## Key finding
R5's aggregate P99 79.52ms is not enough to prove the current active candidate violates Free CPU limits because the metric combined multiple deployed versions. The active version median was 0.63ms and CPU-limit errors were 0. Route/version-isolated measurements are required.

## High-probability CPU candidates
1. Detail APIs recompute diagnostics on every GET. Affected examples: recession, credit-risk, asset-bubble, debt-risk, supply-shock detail APIs.
2. `readStoredMarketInputs()` synchronously decodes stored input batches with `gunzipSync` + `JSON.parse`, reading seven batch families; macro can decode latest and prior batches.
3. Several builders repeatedly scan historical arrays for percentile/volatility calculations. Recession, supply shock, bond volatility, asset/debt builders are the main candidates.
4. `marketOperationalStore().initialize()` issues four `CREATE TABLE IF NOT EXISTS` statements before reads. A public read path should not need schema initialization, and this is also relevant to the intended read-only candidate boundary.
5. `app/page.tsx` is a large client component with embedded fallback/regional datasets and many UI dependencies. This is primarily bundle/parse cost, but the root RSC/SSR route should be measured separately.

## Lower-risk route
`/api/market-score` reads an already-published snapshot and returns it. It does not call providers or recompute scores. This is the preferred Free-plan pattern if CPU measurements confirm detail APIs as outliers.

## Safe optimization direction if measurements confirm
Do not change formulas. Move detail calculation to collection/precompute time and persist final public detail JSON snapshots:
1. collector/precompute computes detail payloads after source updates
2. store final public detail snapshots
3. GET detail API performs one bounded SELECT + JSON response
4. client detail pages remain unchanged
5. no fake interpolation, no formula change, no history loss

## Measurement priorities for Codex R6
Measure the current active version only and separate routes:
- /
- /api/market-score
- /api/recession-detail
- /api/credit-risk-detail
- /api/asset-bubble-detail
- /api/debt-risk-detail
- /api/supply-shock-detail
- corresponding detail HTML pages

Record P50/P95/P99/max per route. Do not use combined Worker P99 as the final route-level verdict.

## Decision rules
- If `/api/market-score` stays below 10ms while detail APIs exceed it, prioritize precomputed detail snapshots.
- If HTML pages exceed 10ms but their APIs do not, investigate Vinext RSC/SSR/static generation before touching data logic.
- If only cold samples exceed 10ms and warm P95/P99 remain below the limit with no 1102 errors, retain WARN until enough version-isolated samples exist.
- If active-version warm P95 repeatedly exceeds 10ms, Free suitability is FAIL for that route until optimized.

## Non-blocking observations
- Detail page components are client components and fetch their APIs after load, so page shell and data computation are already separable.
- Candidate middleware isolation means the Production canonical redirect is not a CPU optimization target.
- R5 D1-unbound candidate could not exercise real D1 decode/recompute paths, so DB-bound CPU may be higher than R5 evidence.

## No runtime code change yet
Wait for active-version route CPU measurements before implementing precomputed detail snapshots or page staticization.
