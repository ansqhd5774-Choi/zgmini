# ZGMINI D1 R4.1 — Free Shard Feasibility

## Goal
Determine whether the 575,537,152-byte restored database can remain on Cloudflare D1 Free by splitting the 53 preserved application tables across multiple D1 databases without changing approved formulas or losing stored history.

This stage is analysis only.

## Current facts
- preserved tables: 53
- source rows: 2,966,623
- restored SQLite after VACUUM: 575,537,152 bytes
- single Free D1 limit: 500 MB per database
- source export and manifest: PASS
- target D1 not yet created

## Required measurements
Run against the fully restored local SQLite database:

`python scripts/analyze-d1-shard-r41.py <restored.sqlite>`

This records:
- table data bytes
- index bytes
- row counts
- FK edges
- page/freelist metrics
- top size contributors

Then run:

`node scripts/analyze-d1-table-deps-r41.mjs <analysis.json> > work/d1-r41-deps.json`

This records conservative code-level table co-references.

## Sharding principles
Do not split by table size alone.

Tables that participate in:
- the same SQL JOIN
- the same transaction/batch
- atomic producer/read-model update
- FK relationship requiring local enforcement
- one request that depends on D1 batch semantics

should remain together unless code is explicitly changed and revalidated.

Source co-reference alone is not proof of a hard dependency; inspect the actual query/transaction.

## Preferred split
Prefer domain-level separation:
- operational/current/read-model tables in CORE
- large historical/raw/backfill tables in HISTORY

Only use this split if query dependency evidence supports it.

## Capacity buffer
Do not target 499-500 MB.

Use a practical target below the hard per-DB ceiling to allow:
- future history growth
- new indexes
- SQLite/D1 internal overhead
- final sync delta

Suggested engineering target:
- <= 400-425 MB per shard at cutover

This is an internal safety target, not a Cloudflare limit.

## Pass criteria
FREE_SHARD_READY when:
1. every proposed shard is below the chosen safety target,
2. combined account storage remains within Free account capacity,
3. no required cross-DB transaction is introduced,
4. visitor read APIs can be routed deterministically to the right binding,
5. writer paths can write each domain without breaking approved atomicity,
6. no score formula or history-retention contract changes,
7. final-sync strategy exists for each shard.

## Fail criteria
FREE_SHARD_NOT_RECOMMENDED when:
- a mandatory atomic dependency group itself exceeds the per-DB limit,
- splitting requires broad application/schema redesign,
- cross-shard consistency cannot preserve current contracts,
- expected growth would immediately breach the free ceiling.

In that case compare the engineering cost/risk against Workers Paid / larger D1 limits before implementation.

## Important
No database is created by this feasibility stage.
No table is dropped or history truncated to fit Free.
No schema/formula changes are authorized.
