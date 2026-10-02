# ZGMINI R13 — D1-bound Candidate Parity + CPU Gate

## Preconditions
Run only after R12 has produced one of:
- SAME_D1_BIND_READY, or
- EXPORT_READY followed by a successful isolated target D1 import.

Do not point DNS or Production writers at the target yet.

## Candidate binding
Bind the verified target D1 to the isolated candidate only.

Keep unchanged:
- candidate Worker identity
- write guard
- static shell
- routes/custom domains absent
- cron absent
- Production Sites writer still authoritative

## Exact API parity
Run:

`node scripts/compare-api-parity-r13.mjs https://zgmini.kr https://<candidate-workers-dev>`

The comparator checks exact canonical JSON equality for:
- /api/market-score
- /api/inflation-detail
- /api/recession-detail
- /api/liquidity-crisis-detail
- /api/credit-risk-detail
- /api/earnings-recession-detail
- /api/asset-bubble-detail
- /api/debt-risk-detail
- /api/supply-shock-detail

Object key ordering is normalized only.
Array order and all payload fields remain significant.
No score/date/source/updatedAt tolerance is allowed.

If the source changes during comparison because the Sites writer is still active, capture a same-snapshot boundary before claiming FAIL. Do not silently ignore legitimate source drift.

## API CPU
Run after parity is established:

`node scripts/profile-d1-apis-r13.mjs --base=https://<candidate-workers-dev> --worker=zgmini-migration-candidate-r5`

Each dynamic API requires at least 31 captured official CPU samples.

PASS:
- P99 <= 10ms

WARN:
- P95 <= 10ms and only isolated P99 exceedance

FAIL:
- P95 > 10ms
- repeated >10ms
- runtime error

## If a detail API fails CPU
Do not alter formulas.
Move the already-approved calculation to producer/precompute time and persist the final public projection.
Visitor GET should become a bounded read.

## Exit
R13_PASS requires:
- target D1 integrity PASS
- exact API parity PASS at a controlled snapshot boundary
- dynamic API CPU PASS/WARN with no unresolved repeated over-limit path
- write guard PASS
- Production isolation PASS

Only then can DNS/Custom Domain cutover become ACTIVE rather than DEFERRED_CUTOVER.
