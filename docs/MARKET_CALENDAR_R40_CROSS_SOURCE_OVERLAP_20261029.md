# Market Calendar R40 — Cross-source duplicate verification

## Approved goal
Preserve all 338 Census events and all existing 1,302 official source observations. Inspect across BLS, BEA, Census, Fed, Treasury and the other connected sources for exact duplicate release dates. In the UI merge only the SAME title, SAME date and SAME observed reference period. Never erase SQLite/D1 original rows or duplicate dates with distinct survey periods.

## State
R38 PC read-only report (2026-10-29T05:21:43.255Z) confirmed total 1,302 rows, Census 338 rows across 17 titles, but **did not expose per-event cross-source matches**. GitHub `main` and this long-running branch have diverged; do not overwrite main UI with stale branch contents.

## R40 read-only audit
One-click ZIP: MARKET_CALENDAR_R40_OVERLAP_AUDIT_20261029.zip. Runs `MARKET_CALENDAR_R40_OVERLAP_AUDIT.cmd` using the approved preinstalled Node and SQLite DB. No provider requests, new timers, quotas, DB mutation, D1 publish, Git push or production deploy.

Classification: `EXACT_SAME_PERIOD` only for same normalized report name + same date + explicitly identical reference period across different sources; `PERIOD_UNVERIFIED` never automatically merge; `DIFFERENT_PERIOD` preserve; `SAME_SOURCE` is not necessarily duplicate. Print sample source/title/period pairs, not raw provider payloads or credentials.

## Gate for UI change
Read actual `MARKET_CALENDAR_R40_OVERLAP_AUDIT_RESULT.txt` first. Check every candidate pair and provider alias. Implement a narrowly scoped UI-only collapse with stable preferred source and tests. Source event counts in SQLite/D1 remain unchanged. Validate R40 result, code tests, deployment SHA and site desktop/mobile independently.

## Evidence
Isolated local Node 22 synthetic fixture: 4/4 PASS. Actual PC audit not yet executed.
