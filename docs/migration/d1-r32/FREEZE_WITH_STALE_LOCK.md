# ZGMINI Sites D1 Export Bridge R3.2 — Freeze Without Natural-Lock Wait

## Approved change
Natural expiry of the stale employment shadow lock is no longer a prerequisite.

The lock must NOT be deleted, mutated, have its TTL changed, or be treated as absent.

A stale-but-not-expired lock may be classified NON_BLOCKING_STALE_LOCK only after a real writer freeze proves:
- active writer jobs = 0
- active collection lease growth = 0
- new DB writes = 0 across repeated observation
- source row counts/freshness remain unchanged

## Current known state
- preserved application tables: 53
- _cf_KV excluded as Cloudflare internal
- sqlite_sequence retained
- earlier observed row total 2,966,610 is NOT authoritative
- stale lock: employment-r4-bed-runtime-dispatch
- writer/lease were still active at the previous observation

## Execution order
1. Freeze actual D1 write producers/schedulers using the smallest reversible configuration change.
2. Keep public UI, GET APIs, static assets available.
3. Do not touch the stale lock record.
4. Observe at least two post-freeze windows.
5. Require:
   - no RUNNING jobs
   - no active writer lease progression
   - no row-count/freshness changes
   - no provider/collector write activity
6. Capture authoritative PRE_EXPORT schema/count/freshness only after the above holds.
7. Start the 53-table full export immediately after PRE_EXPORT passes.
8. Keep the source frozen through POST_EXPORT consistency verification.

## Stale lock classification
If freeze proof passes while the old shadow lock row remains present:
- classify it NON_BLOCKING_STALE_LOCK
- record key, expiry, and associated failed run metadata
- never remove or rewrite it for migration convenience

## Failure
If DB state continues changing after the freeze action:
- FREEZE_FAIL
- do not export authoritative data
- restore normal writer configuration if the freeze action itself caused a regression
- investigate the remaining writer path

## Authority
The authoritative row total is the PRE_EXPORT total captured after freeze stability, not the earlier 2,966,610 observation.
