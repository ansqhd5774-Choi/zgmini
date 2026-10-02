# ZGMINI D1 R5 — Candidate 2DB Binding / Routing Contract

## Goal
Bind the imported Free D1 pair to the isolated candidate and prove read parity + Free CPU without changing Production.

Bindings:
- DB_CORE -> zgmini-core-r42 / d7a25e98-8d52-47a4-9e37-695e4d84d18b
- DB_HISTORY -> zgmini-history-r42 / 55f17650-dc84-46c9-829a-d448ca1b2417

## Routing
HISTORY owns every preserved table matching:
- kfg_v2_*
- kfg_rev7_*

CORE owns every other preserved application table.

## Candidate env contract
For candidate-only builds:
- env.DB_CORE: SELECT-only wrapper over native DB_CORE
- env.DB_HISTORY: SELECT-only wrapper over native DB_HISTORY
- env.DB: compatibility alias to DB_CORE only where legacy non-KFG modules still require env.DB
- ASSETS unchanged
- no write-capable native binding exposed to app modules

## KFG routing rule
Any code path reading KFG V2/REV7 tables must receive/use DB_HISTORY.

Examples requiring HISTORY:
- D1KoreaMarketHistoryStore
- Rev7D1Store
- korea-funds publicSnapshot/defaultLoadProgress/defaultLoadRows
- KFG V2/REV7 canary/read APIs
- Korea research V2 reads based on KFG stores

Mixed route example:
app/api/korea-research-v2/route.ts
- D1KoreaMarketHistoryStore -> DB_HISTORY
- publicSnapshot -> must observe DB_HISTORY for REV7 reads
Do not route the whole request to CORE simply because another helper is present.

## Safety
Candidate remains read-only:
- POST/PUT/PATCH/DELETE blocked
- internal/admin/favorites/auth writes blocked
- DB_CORE and DB_HISTORY both use SELECT-only D1 wrappers
- batch/exec/dump/run denied
- no cron/scheduled export
- no Production routes/custom domains

## Build-time routing
Prefer explicit binding selection or a candidate-only import adapter over runtime SQL parsing.

Forbidden:
- inspect arbitrary SQL at runtime and dynamically choose a DB after prepare()
- emulate cross-DB JOINs
- silently retry a missing table on the other DB
- route by table name supplied by the request

The selected database must be deterministic from the application module/store contract.

## Candidate configuration
Create a NEW candidate config derived from the validated candidate config.
Do not replace the DB-unbound R7/R11 config until the 2DB candidate passes.

Expected D1 bindings:
- DB_CORE
- DB_HISTORY

No binding named DB to a third database.
A compatibility DB alias, if required, should be implemented in the candidate env adapter as DB_CORE.

## Parity
Compare the live Sites source with the 2DB candidate using the R13 exact JSON comparator.

Required APIs:
- /api/market-score
- /api/inflation-detail
- /api/recession-detail
- /api/liquidity-crisis-detail
- /api/credit-risk-detail
- /api/earnings-recession-detail
- /api/asset-bubble-detail
- /api/debt-risk-detail
- /api/supply-shock-detail

Additionally test KFG public/read surfaces separately because those are the routes moved to DB_HISTORY.

## Snapshot drift
The imported pair represents the authoritative export snapshot, while Sites writers resumed afterwards.

Therefore exact parity against current Sites may fail from legitimate post-snapshot source drift.

For exact comparison:
- compare fields tied to the exported snapshot boundary where possible, or
- perform/record a controlled final-delta snapshot before declaring data mismatch.

Do not suppress field differences merely to force PASS.

## CPU
Run DB-bound API CPU profiling after routing/parity works.

Static shell CPU is already PASS and need not be reoptimized unless the generated bundle changes.

## Exit
R5 PASS requires:
- two candidate D1 bindings only
- KFG routes use HISTORY
- other migrated reads use CORE
- both wrapped SELECT-only
- no missing-table fallback across shards
- expected read APIs work
- parity status explained against snapshot boundary
- CPU within Free gate
- Production isolation 0 changes
