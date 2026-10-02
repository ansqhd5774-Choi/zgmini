# ZGMINI D1 R5.1 — Public Projection Optimization

## Why this stage exists
R5 proved:
- 2DB routing is correct
- imported data is intact
- static shells remain fast
- candidate write guard is intact

The remaining Free-plan failure is request-time recomputation in public GET APIs.

Observed CPU:
- inflation-detail P95 ~345ms
- recession/liquidity/credit/earnings/asset/debt/supply routes hit the 10ms CPU ceiling
- KFG public read occasionally exceeds 10ms
- market-score is already close to the desired stored-snapshot pattern

Cloudflare Free D1 is also account-limited to 5M rows read/day and 100k rows written/day. Splitting databases does not multiply those daily account quotas.

## Optimization principle
Move approved calculation from visitor GET time to producer/precompute time.

Visitor GET:
- one bounded SELECT from DB_CORE
- JSON response
- no history reconstruction
- no percentile/volatility recomputation
- no provider calls

Formula and stored-history contracts remain unchanged.

## Storage
Reuse existing CORE table:
`market_public_snapshots_v1`

No new table/schema migration is required.

Projection keys:
- detail:inflation:v1
- detail:recession:v1
- detail:liquidity-crisis:v1
- detail:credit-risk:v1
- detail:earnings-recession:v1
- detail:asset-bubble:v1
- detail:debt-risk:v1
- detail:supply-shock:v1
- public:korea-fear-greed:v1

Helper:
`worker/market-public-projection-store.mjs`

## Producer
At the approved precompute point:
1. read stored source inputs from CORE/HISTORY as required
2. run the exact existing approved builders
3. produce the same JSON currently returned by each API
4. persist the final JSON projection in DB_CORE
5. record storedAt

No provider calls are introduced into public GET.

## Detail API contract
After a projection exists, each detail GET reads exactly its fixed projection key.

Required:
- response body parity with current route implementation at the same snapshot
- 503 if projection absent/stale
- no fallback to expensive request-time recalculation in Production
- no silent fallback to a different shard

During migration testing, a diagnostic header may identify STORED projection mode.

## KFG
KFG source history remains in DB_HISTORY.
The producer computes the public KFG response from HISTORY and writes the final small public JSON projection to DB_CORE.

This prevents each public visitor from reading hundreds/thousands of HISTORY rows.

The KFG research-v2 endpoint already measured within CPU; do not move it unless quota/profile evidence requires it.

## CPU target
After projection cutover:
- each detail API P99 <= 10ms
- KFG public P99 <= 10ms
- no exceededCpu responses
- no 1102

## D1 quota target
Measure rows read/request after optimization.

Expected qualitative outcome:
- visitor detail GET becomes O(1) stored projection read
- KFG public GET becomes O(1) stored projection read
- history-heavy D1 reads occur only during scheduled producer/precompute, not per visitor

## Snapshot TTL
Do not use short 30-minute market-score TTL for monthly/quarterly detail domains unless their actual update cadence requires it.

Projection freshness must be tied to source/precompute cadence.
A stale projection should fail truthfully rather than trigger request-time recomputation.

## Migration sequencing
1. implement pure projection builders by extracting current route calculation logic without formula change
2. unit-test old route-body vs builder output equality
3. write projections from precompute path
4. candidate GET routes switch to storedProjectionResponse
5. deploy candidate with DB_CORE/DB_HISTORY
6. after D1 quota reset, run parity + CPU + rows-read verification
7. only then proceed to final delta/writer cutover

## Production safety
This stage does not change Sites Production, DNS, Custom Domain or main.
