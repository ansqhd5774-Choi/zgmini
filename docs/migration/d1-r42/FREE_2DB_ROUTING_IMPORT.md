# ZGMINI D1 R4.2 — Free 2DB Routing + Import Contract

## Decision
Use the validated Free 2DB layout as the primary migration path.

Bindings:
- DB_CORE
- DB_HISTORY

Compatibility during migration:
- existing DB may remain as a candidate-only alias to DB_CORE only if required by unchanged modules
- final Production configuration should make binding ownership explicit; do not silently point KFG history tables at DB_CORE

## Partition
HISTORY contains every preserved table whose name starts with:
- kfg_v2_
- kfg_rev7_

Expected:
- HISTORY: 11 tables
- CORE: 42 tables
- combined: 53 tables / 2,966,623 rows

No table truncation, history deletion, formula change, or index removal is authorized.

## Expected capacity
From R4.1 evidence:
- CORE estimated total with 16 MiB allowance: 205,955,072 bytes
- HISTORY estimated total with 16 MiB allowance: 403,091,456 bytes

The actual remote D1 size after import must be measured. These local estimates are not a substitute for D1 storage evidence.

## Import order
1. Create two isolated Free D1 databases.
2. Import CORE 42 tables only into DB_CORE.
3. Import HISTORY 11 KFG tables only into DB_HISTORY.
4. Recreate each shard's indexes belonging to its own tables.
5. Verify per-shard table inventory and exact row counts.
6. Verify combined row count equals 2,966,623.
7. Only after import PASS, wire both bindings to the isolated candidate.

## Routing contract
Default application data remains DB_CORE.

DB_HISTORY is used only for the complete KFG V2 / REV7 domain:
- collectors
- backfills
- current/history stores
- snapshots
- progress/checkpoint/lock rows
- KFG public read path

Any source file that reads/writes both KFG and non-KFG tables must be reviewed before binding selection. Do not infer atomic safety from filename alone.

## Atomicity
Prohibited:
- one logical atomic transaction split between DB_CORE and DB_HISTORY
- cross-DB JOIN emulation that changes formulas
- partial writes where the current contract requires one D1 batch

R4.1 evidence found KFG dependency groups self-contained. R4.2 runtime implementation must preserve that result.

## Candidate read-only protection
Both DB_CORE and DB_HISTORY must be wrapped by the same SELECT-only candidate policy before live parity testing.

Candidate:
- GET reads allowed
- writes blocked
- arbitrary SQL blocked
- no scheduler/cron
- no Production writer

## Production writer migration
Do not modify the Sites writer during initial import/candidate parity.

Later writer cutover must route:
- KFG V2/REV7 writes -> DB_HISTORY
- all other migrated writes -> DB_CORE

The writer transition is a separate final-sync/cutover step.

## Import verification
Generate a deterministic partition manifest from R4.1 analysis:
`node scripts/build-d1-2db-partition-r42.mjs <analysis.json> <partition.json>`

After remote imports, produce one integrity JSON per D1 and verify:
`node scripts/verify-d1-2db-import-r42.mjs <partition.json> <core-integrity.json> <history-integrity.json>`

PASS requires:
- CORE 42/42
- HISTORY 11/11
- unexpected application tables 0
- combined rows 2,966,623
- source/table-specific counts equal when recorded
- no missing indexes required by shard schema

## Next gate
When import verification passes:
D1_R5_CANDIDATE_2DB_BIND_PARITY_CPU

DNS / Custom Domain remains deferred until that gate and final sync pass.
