# ZGMINI Cloudflare D1 R4 — Target Create + Import Gate

## Goal
Create an isolated target Cloudflare D1 database, import the verified Sites export, and prove schema/row/freshness parity before binding it to the candidate Worker.

## Source export evidence
Authoritative Sites export:
- preserved tables: 53
- row total: 2,966,623
- schema hash: f059e789e8c3401c40040359bbd40dba66b91599e89c9826d6c71adcfe7267c4
- exported rows: 2,966,623
- chunks: 7,018
- raw NDJSON bytes: 1,895,420,549
- consistency: PASS
- manifest: PASS

Source export remains local/private. Raw rows must not be committed or pasted into chat.

## Target database
Create a NEW isolated D1 in account:
6e9b57e718b247330a6efa42a9516e95

Use a migration-specific name. Do not bind it to Production or DNS.

Record:
- database name
- database_id
- created_at
- account id

## Import preparation
The local NDJSON export must be transformed into an import form that preserves:
- null
- integer
- real
- text
- primary/composite keys
- row order is not semantically required, but duplicate keys are forbidden

There are no observed BLOB values and no unsafe large integers in the authoritative export.

Do not import Cloudflare internal table _cf_KV.
Preserve sqlite_sequence behavior according to actual AUTOINCREMENT tables; do not blindly synthesize it before verifying target schema/import semantics.

## Schema creation
Use the live exported schema as authority, not source-code DDL.

Before data:
- create application tables
- create required indexes at the correct safe stage
- no triggers/views expected from source evidence

If large imports are materially faster/safer with secondary index creation after data, record that execution choice but preserve final schema parity.

## Batch/import safety
The 2.97M-row dataset is large enough that one monolithic request should not be assumed safe.

Use bounded, resumable import:
- one table/chunk at a time or official bulk SQL files within D1 limits
- deterministic checkpoint
- idempotent/restart-safe behavior
- record successful table/chunk boundaries

Do not silently skip failed statements.

## Target verification
After import, collect:
- sqlite_master object inventory
- table count
- per-table exact COUNT(*)
- row total
- freshness marker per table
- schema hash compatible with exported user schema

Expected application table count: 53.
Expected total rows: 2,966,623.

Internal D1 objects such as _cf_KV are excluded from application parity.

## Verification command
Use:
`node scripts/verify-d1-import-r4.mjs <source-manifest.json> <target-integrity.json>`

PASS requires:
- every source table present
- no unexpected application table
- every per-table row count equal
- total rows equal
- schema/freshness equal when supplied

## Candidate binding
Do NOT bind target D1 until target import verification is PASS.

After PASS, next stage is:
CLOUDFLARE_D1_R5_CANDIDATE_BIND_PARITY_CPU

## Production safety
Throughout R4:
- Sites Production remains authoritative
- current Sites writer remains active
- candidate Worker remains isolated until target verification
- no DNS/Custom Domain/main cutover
