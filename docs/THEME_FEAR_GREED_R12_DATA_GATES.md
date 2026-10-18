# ZGMINI theme fear & greed — R12 price identity/strategy epoch gate

Date: 2026-10-19 KST. This document records verified R11 PC evidence and the offline R12 execution package. No production changes.

## PC evidence
- User-run R11: R9 resumed 4 more groups with 4 Alpaca IEX requests, no missing symbols, 8/10 groups stored, 2 groups pending.
- R11 read-only timeline audit: 39 proposed tickers; 5 previously researched epoch/cutover policies, 4 applied so far (HEAL group pending). Pre-cutover rows 1,521 (COOL 547, ARKX 974); post-cutover rows 568. Security ID verified 0; holdings PIT verified 0; theme scores ready 0.
- Remaining R9 groups: #9 EVX/IBB/GNOM/IHI, #10 HEAL/ARKG/ESPO. One more bounded invocation should require at most 2 Alpaca provider requests if existing checkpoint stays consistent.

## R12 official-source verification — new
1. POWR: SEC official prospectus states iShares MSCI Global Energy Producers ETF FILL -> iShares U.S. Power Infrastructure ETF POWR, *ticker and underlying index and strategy* changed effective 2025-10-29. Earlier prices cannot be treated as same power-infrastructure strategy. https://www.sec.gov/Archives/edgar/data/930667/000119312525253997/d42531d497.htm
2. METV: issuer September 22, 2026 supplement states passive Ball Metaverse Index strategy -> actively managed metaverse ETF, effective after close 2026-09-30; treat 2026-10-01 as new strategy epoch. Name-only change would not be enough to reset, but *investment method changed*. https://www.roundhillinvestments.com/assets/pdfs/lift_roundhill_sai.pdf
3. HUMN: Cboe new listing 2025-06-26. https://www.cboe.com/us/equities/listings/listed_products/symbols/HUMN/
4. JEDI: official Defiance inception 2025-09-25; ETF uses global-listed constituents and prospectus includes possible private-asset exposure, which cannot be handled by ordinary US constituent OHLCV without policy/data gate. https://www.defianceetfs.com/jedi/
5. EVX: VanEck 5:1 share split effective 2025-02-06; CUSIP unchanged. This is **not** a new-fund/strategy epoch. Check split-adjusted continuity but **retain** valid pre-split observations rather than applying a false cutover. https://www.vaneck.com/us/en/press-releases/vaneck-announces-change-to-etf-product-line/

Prior R11 boundaries COOL, LYTE, WQTM, HEAL, ARKX remain in effect. Candidate lists do not become approved ETF baskets because a price series was obtained.

## Implementation/fixture evidence
- User-facing standalone ZIP: ZGMINI_THEME_R12_CONTINUE_2026-10-19.zip
- Original R9 collector bytes unchanged and re-used from R11 package; it uses existing local Alpaca credentials only and has a strict 4-request-per-invocation ceiling. Checkpoint is required, and old raw group files are never overwritten.
- After collection, R12 pure read-only audit layers the 4 new fund identity/strategy epochs and EVX corporate-action notice on R10/R11 price audit.
- Local isolated ZIP verification using Node 22.16.0: **25/25 fixture tests PASS** (R9 10, R10 4, R11 6, R12 5). These tests do not imply the 39 live ETF prices or constituent data are scoring-ready.
- R12 theoretical lower bound of ETF PRICE observations for fully continuous sector-R3 252-score output is 628, derived from relativeStrength first raw index 125, first percentile axis score at index 376 and 252 final output days ending index 627. This is arithmetic only; it does **not** reduce or replace approved 756-reference contract or independently verify holdings/volume/PIT and common dates.
- R12 report sets all 39 security IDs and all 30 theme scores to **NOT VERIFIED / NOT READY**, even if raw price dates are sufficient.

## Operational status / next
1. User runs ZIP's ZGMINI_THEME_R12_CONTINUE.cmd **once**, shares ZGMINI_THEME_R12_RESULT.txt. On failure, stop; do not retry.
2. If 10/10 complete, isolate pre-strategy/pre-listing periods in derived calculation inputs **without modifying raw R9 files**.
3. Validate ETF constituents known-at/as-of (global and private holdings are NOT covered by 547 US stocks), constituent price/volume breadth and demand, AUM/overlap and commercial derived-score license.
4. Run 30-theme shadow readiness / sensitivity/backtest, then gated review for public release.

Source/branch boundary: codex/theme-fear-greed-r6-shadow is development-only and diverged from newest main due to unrelated credit-risk changes. Do not merge whole branch or auto-deploy.
