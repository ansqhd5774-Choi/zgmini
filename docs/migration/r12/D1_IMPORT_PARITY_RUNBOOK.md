# ZGMINI R12 — D1 Import and Parity Runbook

## Goal
Execute only after official support supplies a direct-bind or complete-export path.

## Path A — same D1 bind/transfer
1. Record database_id/database_name/owning account.
2. Confirm authorized target account access.
3. Bind only to isolated candidate first.
4. Keep Production writer unchanged.
5. Execute read-only inventory/count/freshness queries.
6. Compare public API payloads and CPU.
7. Do not cut DNS until parity passes.

## Path B — SQL export/import
1. Preserve original export file unchanged.
2. Record SHA-256 and byte size.
3. Run:
   `node scripts/validate-d1-export-r12.mjs <export.sql>`
4. Require every R4 LIVE_CONFIRMED table in the export.
5. Create a new isolated target D1 only after export validation.
6. Import using the official Cloudflare procedure supplied/confirmed by support.
7. Generate target verification SQL:
   `node scripts/generate-d1-integrity-sql-r12.mjs > work/r12-integrity.sql`
8. Run the generated queries against target D1.
9. Record object inventory, exact row counts, and freshness markers.
10. Bind target D1 to candidate only.
11. Run API/data parity and DB-bound CPU validation.

## Mandatory parity surface
- /api/market-score
- inflation detail
- recession detail
- liquidity-crisis detail
- credit-risk detail
- earnings-recession detail
- asset-bubble detail
- debt-risk detail
- supply-shock detail
- representative 1Y chart/history payloads
- observationDate / updatedAt / source fields

## CPU gate
Static pages are already PASS.
After real D1 binding, profile dynamic APIs separately.

If a dynamic detail API repeatedly exceeds the Free CPU limit:
- do not alter formulas
- precompute its public projection at collection/precompute time
- store the final public JSON
- make visitor GET a bounded read

## Writer cutover
Production writer remains on Sites until:
- target read parity passes
- target CPU passes
- target schema/data integrity passes

Writer transition is a separate authorized step.

## DNS
DNS/Custom Domain remains DEFERRED_CUTOVER until D1 is verified.

## Rollback
Any parity/integrity failure:
- candidate target remains isolated
- no DNS change
- Sites Production/writer remains authoritative
