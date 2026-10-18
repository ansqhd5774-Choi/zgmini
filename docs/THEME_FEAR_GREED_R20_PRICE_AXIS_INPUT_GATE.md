# Theme fear/greed R20 — price-axis date availability, no score

Date 2026-10-19 KST. Standalone PC read-only package: `ZGMINI_THEME_R20_PRICE_AXES_AUDIT_2026-10-19.zip` SHA-256 `f3705ae8a0308d79c210486f7702ec7d0f089483991aa2475c2ed977b4f2065d`.

## R19 actual PC evidence
- User-run R19 SEC same-date CUSIP bridge status `SEC_SAME_ASOF_CUSIP_LINKAGE_RESEARCH_ONLY`.
- CIBR source: June 30, 2026 snapshot, 42 equity lines, only 34 with BOTH parsed ticker and CUSIP. 715 stock files / 578,145 rows scanned, invalid rows 0.
- SMH: 25 equity positions, 1 additional exact-as-of matching CUSIP mapped to a locally priced ticker, reported position weight 5.2803%, common-known-at boundary 2026-08-27.
- SOXX: 30 equity positions, 1 additional exact-as-of matching CUSIP mapped to a locally priced ticker, reported position weight 6.0771%, common-known-at boundary 2026-08-26.
- BOTZ's as-of Feb 28, 2026 differs from CIBR Jun 30, 2026: intentionally 0 cross-fund bridges. R18 CIBR 17/41 explicit priced tickers remains partial. No ETF historical daily PIT, true issuer ticker continuity, commercial publication rights, or any five-axis theme score was verified.
- Retrying this low-yield CUSIP-pair cross-matching is DEFERRED unless a verifiable historical security master is obtained.

## R20 parallel development
1. Source-only pure gate: `lib/market-score/theme-fear-greed-r20-price-window-gate.mjs`; checks date/window *availability*, NEVER computes an R3 percentile, 3-axis numeric score or published theme composite.
2. Existing R3 derivation date offsets (unchanged): ETF trend index 124; volatility index 62; ETF/SPY relative-strength aligned index 125; a 252-observation rolling percentile begins at each raw input's index 251. For 252 resulting dates, theoretical 628 aligned price rows (125+251+252) are needed for relative-strength; exactly 627 is insufficient.
3. R20 standalone read-only CMD compares the 39 already stored R9 ETF price series with SPY from existing R3 source stores (IEX, gap, 2026-08-27 verified repair, split-adjusted incremental). Detects source-date close conflicts. Applies 9 conservative original launch/strategy cutovers before date-window assessment; EVX split is NOT a new fund.
4. R20 output: each ETF three-price-axis 252-date input potential, SPY overlap, aggregate theme candidate availability, all marked `scoreReady=false`. No assertion of actual 756 reference verification, historic ETF constituent PIT, breadth/demand or equal 252 true scored dates.
5. R20 local fixture tests: **38/38 PASS**, including full simulated 39 ETFs+SPY storage/no-write integration. Independent ZIP extracted suite **38/38 PASS**. GitHub R20 pure-module blob `0b2ff29029ad50caf42148bc848bea69a05a44c3` equals the one included in the standalone ZIP. No real PC R20 test yet.
6. User runs one CMD `ZGMINI_THEME_R20_PRICE_AXES_AUDIT.cmd`, sends `ZGMINI_THEME_R20_RESULT.txt`. Stop on errors. Only output TXT beside the CMD; no E: writes, API, D1, production, deployment, schema, scheduler, config or DNS changes.

## Independent official primary-source research and decisions
- SEC public N-PORT datasets are structured quarterly releases of fund portfolio snapshots; they **do not provide historical as-known daily ETF baskets**: https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets .
- SEC 2026 N-PORT proposal discusses replacing monthly public information with quarterly/lagged public reports. Do not assume monthly released backfills are currently freely available: https://www.sec.gov/files/rules/proposed/2026/ic-35962.pdf .
- ETF rule 6c-11 portfolio website disclosures provide a possible **prospective daily** feed, not an automatic two-to-three-year public historical archive. Existing data licensing/commercial reuse and stable historical identifiers must be separately checked.
- Current five-axis sector R3 method and 756 reference, 252-date 1Y output, approved prospective 2–5 ETF contract remain unmodified. Price-only date gate results must not silently become three-axis score replacement.
- If sustainable, licensed free historical daily PIT holdings cannot be obtained, a separately versioned **price-only alternative** with explicit approval and clear UI naming could be considered; not implemented/approved here.

Development branch `codex/theme-fg-r20-price-axis-input` based on GitHub main `e1dc4a584309b611539296f6f786d4436e29802b`. This source is not merged into main and not deployed. R19 and older branches are divergent; do not merge them wholesale.
