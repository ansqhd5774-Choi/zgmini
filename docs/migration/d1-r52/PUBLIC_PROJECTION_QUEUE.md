# ZGMINI D1 R5.2 — Public Projection Queue Contract

## Decision
Continue the approved migration without waiting for D1 quota reset.

The public detail/KFG read path will use precomputed projections stored in DB_CORE.
History-heavy calculations run outside visitor HTTP requests.

## Queue role
Queue messages are only invalidation/recompute signals.
They do not carry provider payloads, secrets, or raw database history.

Message contract:
- id: one fixed projection id
- sourceVersion: optional bounded string
- sourceStoredAt: finite timestamp

Allowed projection ids are derived from PUBLIC_PROJECTION_KEYS.

## Consumer contract
For each message:
1. validate fixed id
2. read stored source data from DB_CORE / DB_HISTORY
3. run the existing approved calculation
4. produce the exact public response body
5. write one final JSON projection to DB_CORE
6. ACK only after successful write
7. RETRY on build/write failure

No formula change is allowed.

## Visitor path
Each public detail GET:
- reads one fixed projection key from market_public_snapshots_v1
- returns the stored JSON
- performs no provider calls
- performs no history reconstruction
- performs no request-time percentile/volatility calculation
- does not fall back to the expensive legacy route

## Queue binding
Use a migration-only queue name first.
Suggested:
zgmini-public-projection-r1

Producer and consumer may be the same candidate Worker during validation, but no Production route/DNS cutover occurs at this stage.

## Projection set
- inflation
- recession
- liquidityCrisis
- creditRisk
- earningsRecession
- assetBubble
- debtRisk
- supplyShock
- koreaFearGreed

korea-research-v2 is excluded initially because R5 CPU passed there. Add only if quota evidence requires it.

## Trigger policy
Enqueue only after relevant stored source data/precompute changes.
Do not enqueue on every visitor GET.

A coarse first implementation may enqueue all 9 projection ids after a successful stored-score/source refresh if the daily queue/read/write quotas remain comfortably within Free limits.
A later selective changed-domain propagation is preferred if already available.

## Candidate validation
Before Production use:
- pure builder parity against legacy route body
- queue consumer ack/retry tests
- projection write/read tests
- live candidate queue delivery
- no secret/raw row in message body
- DB_CORE/DB_HISTORY routing PASS
- detail API P99 <= 10ms
- KFG public P99 <= 10ms
- rows read/request materially reduced
- no exceededCpu / no D1_QUOTA after quota reset

## Failure behavior
If projection is missing/stale:
- return truthful 503
- do not recompute synchronously in public GET

## Production safety
No Sites writer/DNS/main change during R5.2 candidate validation.
