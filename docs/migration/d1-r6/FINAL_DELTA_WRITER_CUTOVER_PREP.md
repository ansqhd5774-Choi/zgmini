# ZGMINI D1 R6 — Final Delta Sync / Writer Cutover Preparation

## Purpose
Prepare the final synchronization and writer cutover after R5.2 live projection parity/CPU passes.

This document does NOT authorize final cutover yet.

## Preconditions
R6 execution may start only after:
- all 9 stored public projections are remotely READY
- projection visitor reads are fixed-key SELECT-only with measured rows_read=1
- candidate public routes are healthy
- candidate write guard / Production isolation remain intact
- temporary candidate verification crons/probes are removed
- current migration implementation is present in GitHub source-of-truth

Current proven precondition state (2026-10-04):
- 9/9 public projection endpoints: HTTP 200
- liquidityCrisis: READY and scoreMatch=true
- all 9 fixed projection reads: rows_read=1
- temporary credit cron/probes: removed
- latest migration source includes R6 Production Worker preparation
- current Sites vs candidate exact JSON equality is not expected until final source delta is synchronized because Sites writers resumed after the authoritative export snapshot

## Authoritative source
Sites D1 remains source-of-truth until final writer cutover.
The imported Cloudflare pair is only a snapshot target until final delta is applied.

Target:
- DB_CORE = zgmini-core-r42
- DB_HISTORY = zgmini-history-r42

Partition authority:
- kfg_v2_* / kfg_rev7_* -> DB_HISTORY
- all other preserved application tables -> DB_CORE

## Final sync strategy

### Phase A — freeze Sites writers
Freeze only actual writer/scheduler entrypoints.
Keep public read/UI alive.

Do not:
- delete/alter stale lock rows
- modify stored history
- call providers for migration purposes
- change DNS

Freeze proof requires:
- writer jobs 0
- lease progression 0
- row counts/freshness stable over repeated windows
- no provider/store side effects

### Phase B — source final-state manifest
After freeze stability:
capture all 53 preserved tables:
- source row count
- schema identity
- primary key/cursor identity
- newest observation/freshness marker
- deterministic table hash when feasible

This manifest defines FINAL_SOURCE.

### Phase C — target comparison
For each table compare FINAL_SOURCE vs current target shard.

Classify:
- EXACT
- APPEND_ONLY_DELTA
- UPSERT_DELTA
- DELETE_REQUIRED
- SCHEMA_MISMATCH
- UNKNOWN

Never infer append-only only from row-count growth.
Use primary-key and deterministic row comparison.

### Phase D — apply bounded delta
Apply only the rows/operations required to bring each shard to FINAL_SOURCE.

Safety:
- DB_CORE receives CORE tables only
- DB_HISTORY receives KFG V2/REV7 only
- no cross-shard transaction invented
- no formula changes
- no history pruning
- no index removal
- batches bounded below D1 limits
- resumable checkpoints
- each applied chunk hashed/logged without row payload in GitHub evidence

### Phase E — exact final parity
After delta:
- 53/53 table inventory
- exact per-table counts
- exact schema/index inventory
- exact freshness markers
- exact deterministic hashes where available
- critical public snapshot/body parity
- target rows total equals frozen source rows total

Any unexplained mismatch blocks cutover.

## Writer cutover

Only after final target parity:
1. deploy Production Worker configuration with DB_CORE / DB_HISTORY
2. route all non-KFG writes -> DB_CORE
3. route all KFG V2/REV7 writes -> DB_HISTORY
4. enable approved producer/precompute/queue path
5. keep Sites writer frozen
6. run one controlled target writer probe
7. verify expected target change only
8. verify source remains unchanged

If target writer probe fails, rollback Worker writer config while Sites remains frozen.

## Public projection after final delta
After target source parity:
- enqueue/rebuild all 9 public projections from target data
- verify storedAt/sourceStoredAt are at or after final sync
- candidate/Production reads use final target projections

## DNS cutover gate
DNS/Custom Domain is still AFTER:
- final data parity
- target writer probe PASS
- Production Worker runtime PASS
- current public projection PASS

## Rollback
Before DNS cutover:
- rollback = restore target Worker config or resume Sites writers as appropriate
- no DNS action needed

After DNS cutover:
- restore previous DNS/Sites route only if runtime/data failure requires it
- target data is preserved for diagnosis

## Evidence
Do not publish raw DB rows.
Evidence should contain:
- counts
- hashes
- schema/index inventories
- freshness dates
- delta operation counts
- deployment/version ids
- writer probe side effects
