# THEME FEAR & GREED — R13 SEC PIT evidence (2026-10-19)

## PC runtime evidence
R12 user-executed PC log: 39/39 candidate ETF tickers in 10/10 R9 stored-price groups; latest invocation fetched final 2 groups (2 Alpaca calls), missing tickers 0, public writes 0. This is **PRICE BACKFILL COMPLETE**, not five-axis data complete. Nine researched fund-identity/strategy epochs show fewer than 628 post-epoch price bars, 30 other fund epochs remain unresearched. Security identities verified 0/39, ETF holdings PIT verified 0/39, scores ready 0/30. Preserve R9 raw history, including past-ticker observations, but exclude invalid epochs from *derived* input after verification.

## Official primary-source alternative to proprietary historical holdings
- SEC official company_tickers_mf.json: https://www.sec.gov/files/company_tickers_mf.json . Contains **cik, seriesId, classId, symbol**. Use CIK + series/class to distinguish multiple ETFs owned by one investment company. This mapping is current metadata, not proof of historical ticker identity.
- SEC public historical N-PORT datasets, 2019–2026: https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets . Fund-specific reports are historical **sparse** snapshots, normally with significant reporting delay; the public-filing timestamp must not be rewritten as portfolio as-of time. Dataset is available as quarterly ZIPs, each hundreds of megabytes. No download, provider call or operational scheduled task was introduced at this stage.
- SEC rule 6c-11 daily portfolio disclosure: https://www.sec.gov/about/divisions-offices/division-investment-management/accounting-disclosure-information/adi-2025-15-website-posting-requirements . ETF issuers relying on this rule disclose **previous day's holdings** before the next market open. This proves that *prospective issuer daily snapshot capture* may be possible, NOT that an issuer provides 3 years of historical daily archives.
- SEC N-PORT regulatory amendment compliance delays (Federal Register): https://public-inspection.federalregister.gov/2025-06861.pdf . Do not assume revised monthly *public* disclosures are currently comprehensive/historical.
- Direct SEC fund examples: BOTZ CIK=0001432353, series S000054693, class C000171853 (https://www.sec.gov/Archives/edgar/data/1432353/000175272425183092/0001752724-25-183092-index.htm); ROKT CIK=0001064642, series S000063361, class C000205414 (https://www.sec.gov/Archives/edgar/data/1064642/000141036826020118/0001410368-26-020118-index.htm). Example identifiers are source references, not verified current portfolios or 756-observation history.

## R13 source implementation
- lib/market-score/theme-fear-greed-r13-pit-holdings.mjs:
  - resolveThemeFundRegistryR13(secMf, requestedTickers) => candidate SEC CIK/series/class or explicit missing/ambiguous.
  - auditThemeFundPITR13({ticker,identity,reports,studyDates}) => rejects wrong ETF series, missing public accession, malformed/as-of/known-at timestamps, missing holdings identifiers; reports availability **only after** known public filing timestamp.
  - Always returns scoreReady=false and published=false. Does not calculate, infer daily positions, assume that last filing applies to every intervening session, invent missing holdings, or invoke APIs/storage.
- tests/theme-fear-greed-r13-pit-holdings.test.mjs: 12 fixture unit cases. Local Node tests passed 12/12. No production, D1, scheduler or actual SEC runtime ingestion validation.

## Data architecture and planned next action
1. For each of 39 price-collected ETFs, acquire/reconcile SEC CIK/series/class identity against dated issuer and exchange evidence (including ticker reuse/strategy changes), without mistaking a registrant-level CIK for the ETF.
2. Obtain **historical ETF holdings with as-of and publicly-known-at timestamps**; free SEC N-PORT provides *lagged periodic points* only. Do not replay the reported portfolios into days **before** disclosure. No silent previous-snapshot fill over unobserved daily periods without a separately approved model and demonstrated robustness.
3. Audit actual constituent symbol/CUSIP coverage vs locally stored 547 stock-price series, especially non-US holdings. SPY/ETF price coverage alone does not recreate sector-R3 breadth and demand. Existing 756 reference and rolling 252, approved 5 axes, 2–5 ETF weights unchanged.
4. If usable historical daily PIT holdings cannot be obtained at acceptable rights/cost, propose and *seek approval* for a separately versioned alternative; DO NOT silently substitute ETF-flow or current-holdings historical proxy.
5. Eligible theme Shadow scores and commercial rights remain NOT_READY until source+stored inputs+PIT+runtime verified. No public release, DB migration, deploy or DNS.

## Source coordination
R13 base latest GitHub main at branch creation: 31a316ae1a64c71b53cc2fea9093347085f94e39. Independent development branch codex/theme-fg-r13-sec-pit; earlier R6/R11/R12 branch codex/theme-fear-greed-r6-shadow has diverged and must not be whole-merged. No changes to previous R3 or original raw stores.
