# R127 — IEX direct HIST ETF-theme source migration (shadow gate only)

2026-10-20. User-approved source preference: **direct IEX HIST** instead of Alpaca for the ETF-only theme fear/greed input lane. Approved five-axis formula and 2-ETF weighting **remain unchanged**.

## Verified external facts
- IEX HIST historical equity data is advertised **free, T+1**, with the **most recent 12 months** offered for download: https://www.iex.io/products/market-data-connectivity
- Access/use and distribution fall under https://www.iex.io/legal/hist-data-terms. Any distribution must preserve the exact official IEX attribution specified in the contract file.
- HIST publishes PCAP binary captures, rather than a per-ETF daily OHLCV API. An actual official list entry on 2026-10-07 advertised an approximately **9.99 GB TOPS file**. Do not start large batch retrieval without separately verifying storage/network/bounds: https://iextrading.com/trading/market-data/
- IEX's API was retired in 2021; do not confuse it with HIST: https://www.iex.io/products/market-data-connectivity
- The repository's older B1 `IEX_HIST_VIA_SOPHOSTECHNE` path fetches `bars.sophostechne.com`, a *third party*; it is **not** a verified direct-IEX historical download.

## Precisely staged changes
- `lib/market-score/theme-iex-hist-r127-contract.mjs`: direct-source identity, attribution, unchanged 17 ETF universe and 756-session requirement; fail-closed observed-date coverage checker.
- `tests/theme-iex-hist-r127-contract.test.mjs`: tests for IEX-only lineage, date uniqueness, missing/zero trade rejection, publication denial.
- `lib/market-score/theme-iex-hist-r127-direct.mjs` is the offline streaming Node.js TOPS1.6 PCAP/PCAPNG (+gzip) parser for one local file, with trade-break handling and per-ETF missing-trade reporting.
- `tests/theme-iex-hist-r127-direct.test.mjs` adds synthetic capture/quality tests. The separate R127 research ZIP additionally has an optional local CMD pilot. **Neither is installed as a scheduled PC collector.**

## Fail-closed criteria before cutover
1. Obtain a genuine official direct IEX TOPS HIST file with verified source URL, size, version, SHA and successful decoding; synthetic PCAP tests are **not** actual-provider verification.
2. Demonstrate the 17 ETF trading-date/volume coverage. No-trade in IEX ≠ no-trade across US markets. Never replace missing with zero or fabricate a bar.
3. The unchanged 756-session lookback cannot be fulfilled immediately using only newly downloadable 12 months; identify a qualified **free and commercially permitted** continuation for older data *and explicitly verify no licensing conflict*.
4. IEX last sale is **not** the official closing price and its direct HIST data is not split-adjusted. Reconcile against the original adjusted R9 OHLCV contract before comparing R125's eight 252-point scores.
5. Only after source, rights, accuracy, time series, PC storage/checkpoints and published API/UI runtime pass should an exact release switch be executed. Keep legacy R9 and R125 snapshots intact.

**Deployment guard:** this branch and PR must not change the active collector, D1, database, Cron, writer config, live source selection, published scores, license disclosures or site UI. Do not merge to production-triggering main based solely on CI.

**Result:** Source selection **approved**; PC proof-of-concept **implemented locally and synthetically tested**; actual IEX market-data ingestion **not yet verified**; production cutover **blocked** by official 12-month window, feed representativeness and migration parity.
