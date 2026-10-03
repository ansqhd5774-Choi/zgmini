# ZGMINI D1 R5.3 — Queue CPU Optimization

## Observed blocker
R5.2 remote Queue:
- inflation ACK
- recession ACK
- remaining projections repeatedly exceeded Worker CPU
- Production/DNS/main/Sites writer remained unchanged

## First optimization
The R5.2 source loader read and decoded all seven operational input batches for almost every projection.

R5.3 makes source loading projection-specific.

Batch plan:
- recession: macro
- liquidityCrisis: macro + credit
- creditRisk: macro + credit
- earningsRecession: no generic operational batch
- assetBubble: macro
- debtRisk: macro + credit + bisDsr + bisTc
- supplyShock: macro + supply
- inflation: dedicated PIT/PC1 reader
- koreaFearGreed: dedicated REV7 reader

No scoring formula changes.

## Profiling
Candidate Queue logs a sanitized phase profile:
- invalidate
- source snapshot
- source inputs / domain-specific source
- load-total
- build
- checkpoint-after

Do not log raw rows, credentials, provider payloads or projection bodies.

## Revalidation order
Run one projection message at a time.

Start:
1. liquidityCrisis
2. creditRisk
3. earningsRecession
4. assetBubble
5. debtRisk
6. supplyShock
7. koreaFearGreed

Do not resend inflation/recession unless regression verification is needed.

For each failed projection capture the last completed phase.

## Escalation
If selective loading still exceeds CPU:
- if source/decode dominates: persist smaller derived input/precompute slices during source collection
- if builder dominates: split that builder into deterministic staged precompute messages with persisted intermediate derived data
- if KFG dominates: build public projection at REV7 snapshot production time using the already-calculated result; visitor path remains one-row DB_CORE read

Do not increase formula approximations or reduce history windows merely to meet CPU.

## Exit
R53_PASS when all nine projections are remotely stored, exact parity holds and visitor GET CPU/rows-read gates pass.
