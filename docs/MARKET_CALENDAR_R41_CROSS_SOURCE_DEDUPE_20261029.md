# R41 – verified Census/BEA trade-release display deduplication (2026-10-29)

## Actual PC evidence
R40 read-only report generated 2026-10-29T06:28:08.212Z, stored 2026-10-29T05:30:02.100Z:
- Official output 1,302 observations, Census 338
- Exactly 22 BEA/Census paired trade-release observations for same date, indicator and reference month/year.
- 0 cross-source pending/uncertain pairs, 0 confirmed different periods.
- 17 same-source/same-day title collisions: preserve (different Census survey months; separate TIC reporting types).
- 22 pairs span 2026-01-08 through 2027-12-07; no raw data deletion.

## Change
Display-only `collapseCrossSourceTradeDuplicates` inside `mergeOfficial` before rendering official event rows, preferring BEA solely when both BEA and Census titles, source-specific IDs, dates and reference periods agree on the U.S. International Trade in Goods and Services release. Preserve all other schedules, especially Census standalone rows and distinct periods; original 1,302 records in SQLite/D1 and API are not modified. Current UI filters, importance and earnings view unchanged.

## Verification
Local isolated Node 22: 5/5 tests PASS; 22/22 exact PC evidence pairs collapsed to 22 BEA display rows; test input arrays remain unchanged. These are source/fixture tests, not claims of live UI or deployment. GitHub CI and Cloudflare exact-SHA deployment require separate verification.

No schema, provider, cadence, weights, DNS, direct Wrangler deploy, force or scheduler changes.
