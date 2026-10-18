# Theme Fear & Greed R18 — local stock-bar matching to SEC N-PORT (2026-10-19)

## Actual PC evidence from user-run R17
- 4 verified official SEC N-PORT sparse snapshots: BOTZ 51 entries (49 EC, 27 non-US jurisdiction), SMH 26 (25 EC, 5 non-US), SOXX 33 (30 EC, 9 non-US), CIBR 44 (42 EC, 11 non-US).
- Total NPORT positions: **154**; CUSIP detected 154; ISIN 151; explicit ticker tags: BOTZ 2, SMH 0, SOXX 0, CIBR 43. Asset categories non-equity include STIV/RA/DE.
- This contradicts earlier R16 \`issuerCusip=0\` field-only check: underlying XML uses other CUSIP tag arrangements. Do NOT treat R16 output as evidence no CUSIP exists.
- Sum of raw report percentages >100 for some funds. Non-equity financing and derivative lines exist, so **do not** renormalize shares or silently override approved thematic ETF weights.
- Four fund/filing header matches PASS; **historical daily holdings PIT, US stock-bar coverage, issuer-to-security/CUSIP mapping and commercial rights not yet verified**.
- Country code (US/non-US) identifies reported investments and is NOT evidence of listing exchange or data provider coverage (ADR/foreign listings are possible).

## R18 isolated diagnostic implementation
- User-run ZIP: \`ZGMINI_THEME_R18_LOCAL_STOCK_COVERAGE_2026-10-19.zip\`. SHA-256 \`03bd2f97b1707202c994a359454b68cf6e4b7a5fd781b9096aa03faed92cf9f0\`.
- ZIP includes source \`scripts/pc-writer/theme-fear-greed-r18-local-ticker-coverage.mjs\`, CMD, original R15/R16/R17 supporting scripts and 68 combined fixture tests.
- Applies original R16 XML provenance/CIK+series+class/date validation and R17 per-holding structural verification, reads the four original R16 checksummed SEC XML snapshots, then extracts **explicitly filed EC stock ticker tags only**.
- Reads only locally stored \`asset-r10-alpaca/group-*.json\` and \`asset-r10-alpaca/incremental/*.json\`. Counts exact matching tickers with valid dated close/volume, deduplicates dates, and reports covered ticker counts + 252/756 raw-price-day counts and known-at-or-later price existence. **Does not infer CUSIP from issuer names**, modify PIT, or calculate 5 axes.
- Report contains aggregates only. Never exports individual ticker symbols, CUSIPs, issuer names, stock/holdings rows, original XML, secrets.
- **0 provider/network calls, 0 original E: PC writes, 0 DB/D1/API/Production writes**. CMD writes only a result TXT next to itself.
- Local Node fixture tests: 15/15 R18; combined R15+R16+R17+R18 68/68; independent ZIP-extracted R18 test 15/15. Real R18 PC runtime not yet executed.
- ZIP intentionally standalone and not installed in operating writer. No collector/scheduler/version/weights/formula/source-format changes.
- Operator once only: extract a new folder and invoke \`ZGMINI_THEME_R18_LOCAL_STOCK_COVERAGE.cmd\`, share \`ZGMINI_THEME_R18_RESULT.txt\`, STOP if error.

## Next decisions and gates
1. Evaluate PC direct-ticker matching for BOTZ, SMH, SOXX, CIBR. A direct ticker in SEC NPORT does not prove the local stock batch is the **same CUSIP security**; and zero SEC ticker tags does NOT mean no stock prices.
2. If direct match insufficient, source a verifiable historical CUSIP/ISIN-to-trading-symbol crosswalk with exchange and corporate-action effective dates; do not invent an issuer-name mapping or manually guess foreign symbols.
3. Recover daily holdings PIT only if actually public and known-at; lagged quarterly NPORT cannot be treated as past daily known-at basket. Distinguish ETF strategy epoch and split periods.
4. Confirm license/commercial publish rights and tested R3 five-axis breadth/demand/reference=756/score-history=252. Otherwise \`NOT_READY\`, no public scores.
5. If free historical PIT remains unavailable, present a separately versioned explicitly proposed alternative (approval required before replacing axes or weights).

Development base is latest main SHA 008c4fbf3742bc9c7ca3323ef50ffe4e1e9fac3a. This documentation file is the only GitHub write in R18; standalone ZIP source is not part of production.
