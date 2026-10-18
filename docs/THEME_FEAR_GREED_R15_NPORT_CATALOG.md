# Theme Fear & Greed — R14 result and R15 SEC N-PORT pilot (2026-10-19)

## Evidence: PC R14
- User-run diagnostic output R14: CACHED_PC_SEC_REGISTRY, fetchedAt 2026-10-18T18:31:26.032Z.
- 28,593 SEC registry rows; 39 proposed ETF tickers, 38 mapped to *present-day* CIK+series+class, LYTE not found in ticker registry. Source SHA256: 0d929faefd93374ec3f39a7650b51ff4c1e115f3ab1244f3b17b312819c91298.
- All security identity continuity, fund-holdings PIT, 5-axis theme scores remain **NOT VERIFIED**.

## Independent official LYTE fund identification
- SEC 485BPOS 2026-08-03 EDGAR filing identifies Roundhill Photonics & Optics ETF: CIK 0001976517, series S000107086, class C000277973.
- Official SEC filing index: https://www.sec.gov/Archives/edgar/data/1976517/000139834426013286/0001398344-26-013286-index.htm .
- The summary prospectus labels its exchange ticker LYTE: https://www.sec.gov/Archives/edgar/data/1976517/000139834426013360/fp0100216-2_497k.htm .
- This resolves a **fund filing identity candidate** beyond the SEC ticker registry; it does not validate ticker history, underlying holdings, daily PIT or commercial publication permission.

## R15 implementation: isolated user-run CMD packet
- Delivered separately as ZGMINI_THEME_R15_NPORT_CATALOG_2026-10-19.zip; **not yet deployed to PC**.
- Only four SEC registrant submissions endpoint pilot CIKs: 0001432353, 0001137360, 0001100663, 0001364608; they cover 24 proposed ETFs by SEC registry but the filings index is **registrant-wide**, not assigned to a particular ETF without filing-specific series/class.
- At most **4** official SEC HTTP GETs per invocation, no retries; existing snapshot checkpoint preserved. Cached SEC raw snapshots only in isolated E-drive writer subdirectory, checksum and read-back.
- Prints concise metadata dates, accession and archive pointer counts; never retrieves N-PORT primary portfolio XML or enumerates ETF daily constituents at this stage.
- Prerequisites R9 full 10/10 stored and R14 SEC source cache hash verification.
- Verified local fixture testing: Node 22.16.0, **15/15 PASS**, ZIP extraction and test re-run PASS. This is NOT a live SEC runtime test.

## Gates remain
- Distinguish actual as-of date from first public filing date and exchange availability; prevent historical look-ahead.
- Identify the **correct series ID in each specific N-PORT filing**, not just one registrant CIK.
- Source historical ETF holdings with known-at semantics; determine non-US constituent prices/volumes and reuse unchanged R3 five axes, 756 reference, 252 final dates.
- Commercial rights, user-approved basket eligibility/weights, scoring/backtest, production deployment all still NOT_READY.
- No DB/schema, scheduler, current formula, publish, DNS or Production change.

The R13 development branch is research-only. Do not merge entire branches or auto-deploy without separate gates.
