# KFG V2-A: exact-date research snapshot

Research only (`productionEligible=false`). Public Korea V1 and its weights are unchanged.

The existing Phase3 route accepts `mode=snapshot&basDt=YYYYMMDD`. This mode uses only Stock V2, not the legacy authentication comparison. It requires an explicit real calendar date, fetches 10,000 rows/page, caps at 5 pages, never retries, and compares received rows to a stable totalCount. All provider rows are date-validated before KOSPI/KOSDAQ retention. KONEX is diagnostic-only. Zero rows means no observation, not a zero score.

Standard rows contain date (original YYYYMMDD), ISIN-preferred securityId, shortCode, market, close, returnPct, tradingValue, marketCap. Blank/null and invalid numeric values are separately recognized; unavailable standardized numeric fields are null. Negative monetary amounts are invalid. Zero is valid. Duplicate identity with identical raw fields collapses; conflicts invalidate the factor. No current security list is used.

Breadth = 100 * (0.60 * (up + 0.5*flat)/validReturnCount + 0.40 * (upValue + 0.5*flatValue)/totalTradingValue).
The value denominator includes all valid nonnegative trading values, even when return is unavailable; those rows cannot enter up/flat numerators. Coverage is reported independently. Missing subfactors never cause weight renormalization; invalid totals, incomplete snapshots and conflicts produce null score. No filling, clamping or synthetic observation dates.

KoreaMarketHistoryStore is a memory-only contract with date snapshots, security history, factor snapshots/history and backfill progress. Checkpoint fields: latestProcessedDate, oldestProcessedDate, successfulTradingDates, requestCount, rowsProcessed, status. No persistent resource is provisioned and no backfill runs in this step.

Snapshot responses contain counts/coverage/factor summaries only. The standardized row array stays internal. Cache lasts 15 minutes, concurrent requests coalesce, and the existing Phase3 expiry applies. Safe errors are fixed codes; upstream bodies/credentials are not returned.

Inventory before implementation: Stock V2 provider PARTIAL (probe/parser); standardized row, history store, breadth and backfill MISSING. Momentum/Strength/Volatility have feasibility labels only, no Korea V2 implementations.
