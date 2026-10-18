# Theme F&G R11: R9/R10 actual input evidence and identity timeline gates

Date: 2026-10-19 KST. Development only. Sector R3, production, D1, DB schema, DNS, scheduler and existing PC raw storage remain unchanged.

## Latest evidence from user-executed PC diagnostics
- R8: 547 unique stored stocks; 578,145 valid stock daily bars across 715 files. These ARE NOT ETF-holdings PIT data.
- R9 first bounded invocation: 4 of 10 immutable collection groups stored, 16 proposed thematic ETF tickers, 4 provider requests; 6 groups remain PENDING. Stored 39 ETF candidates are not final approved selections.
- R10 partial audit: 16,412 bars, 16 ETFs with prices; 15 have at least 252 price bars, 13 at least 756 price bars. **Zero themes validated for five-axis scoring**.
- COOL historical raw ticker series starts 2022 even though today's AI cooling ETF first listed 2026-08-13. Never merge these into one security's long history. Past COOL used by Corner Growth Acquisition Corp.
- LYTE started 2026-08-06; WQTM started 2025-10-09. HEAL changed ticker and investment strategy effective 2025-04-01; ARKX broadened strategy 2025-11-23. A 756-day original-ticker price count does not establish a 756-day same-identity/same-strategy score reference.

## Evidence links (official sources)
- COOL exchange new listing: https://www.nasdaqtrader.com/TraderNews.aspx?id=ETP2026-127
- COOL former company SEC 8-K: https://www.sec.gov/Archives/edgar/data/1829953/000110465924029414/R1.htm
- LYTE Cboe new listing: https://www.cboe.com/us/equities/listings/listed_products/symbols/LYTE/
- WQTM Cboe new listing: https://www.cboe.com/us/equities/listings/listed_products/symbols/WQTM/
- HEAL prospectus SEC: https://www.sec.gov/Archives/edgar/data/1432353/000143235325000249/a497khealthtech.htm
- ARKX fund issuer: https://www.ark-funds.com/funds/arkx

## R11 isolated local execution packet
- User-run CMD packet: ZGMINI_THEME_R11_CONTINUE_2026-10-19.zip (delivered in conversation, NOT part of GitHub repo).
- Single CMD invocation calls original R9 existing approved Alpaca IEX historical-price collector at most **four requests once**, resuming immutable saved checkpoint; then performs R11 **read-only** timeline audit through R10.
- Initial R9 checkpoint is mandatory; if absent, STOP rather than silently reinitialize or replace the live E: storage.
- Audit records the above 5 dated event cutovers; 34 other tickers remain timeline-identity UNVERIFIED rather than being presumed valid.
- All 39 funds remain ineligible for Production until an independent same-security/CUSIP/strategy plus ETF holdings PIT, 5 axes and commercial licensing evidence.
- R11 local fixture tests: six tests, combined R9/R10/R11 package: **20/20 PASS**. These are fixture tests only.
- GitHub main has moved since R6 branch base; do not merge the entire branch or force sync. Check main and selectively recover reviewed file changes when appropriate.

## Next evidence and gates
1. Obtain user-generated R11 result TXT (existing R9 groups 5–8 on next bounded invocation, then groups 9–10 in following invocation; stop immediately on errors).
2. Read-only full 39 ETF price consistency and timestamp-cutover audit. Raw R9 price store retained unchanged; exclude pre-cutover ticker or strategy records only in derived scoring inputs.
3. For each ETF independently verify security identifiers/issuer records, strategy epoch, historical holdings known-at, constituent pricing including non-US markets, SPY price comparator, and R3 five-axis reference and 252 date alignment.
4. Shadow calculation, benchmark event validation and separate publishing approval; do not claim any live theme score before then.
