ZGMINI MARKET CALENDAR - R25 CFTC SOURCE READ-ONLY EXPORT

1) Extract ALL contents of the ZIP to a new folder on the Windows PC.
2) Run MARKET_CALENDAR_R25_CFTC_SOURCE_EXPORT.cmd exactly ONCE.
3) Upload MARKET_CALENDAR_R25_CFTC_SOURCE_EXPORT_RESULT.txt in ChatGPT.

OFFICIAL URL:
https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm

The export makes one HTTP GET to the official CFTC 2026 Commitments of
Traders (COT) report release schedule. It records the original HTML in
Base64, the SHA256 checksum, and HTTP status. No report data is assumed
to have been fetched or installed before the result file is examined.

READ-ONLY SAFETY:
- Does not open or modify the operational PC Core worktree or Git branch.
- Does not touch D1, SQLite, stored source files, config, scheduled tasks,
  collector, publisher, deploy, or existing release calendar events.
- No retry, alternate host, or bypass if CFTC denies a request.
- This is source inspection only, NOT collection integration.
- Source dates are tentative; never infer dates in unannounced years.
