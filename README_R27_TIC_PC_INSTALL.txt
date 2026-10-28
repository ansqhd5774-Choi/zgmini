ZGMINI MARKET CALENDAR - R27 TREASURY TIC SAFE PC INSTALL

1) Extract ALL 7 files in the R27 ZIP to ONE NEW Windows folder.
2) Run MARKET_CALENDAR_R27_TIC_APPLY.cmd exactly ONCE.
3) Upload MARKET_CALENDAR_R27_TIC_APPLY_RESULT.txt to ChatGPT.

Required successfully installed PC R26 source:
c948f2485a55ed24a3b47f42e6c070af8b1f5a62

ONLY these three source files are changed after all safety checks:
- lib/release-calendar.mjs (add TIC to preserved source registry)
- lib/tic-calendar.mjs (new official 2026/2027 TIC HTML parser)
- scripts/pc-writer/release-calendar.mjs (independent TIC reader/store/collector)

EIA, USDA, CFTC, Treasury, BLS, BEA, Fed and Census remain unchanged.
R26 baseline SHA256 for parser, Treasury module and collector plus other
protected sources, exact Core worktree, scheduled task origin, config.source,
dirty worktree and local-cycle.lock are checked before any write.

SOURCE:
Official Treasury release dates URL:
https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data
PC-read-only original HTML: HTTP 200, 111191 bytes, SHA256:
d4078362e4746da2f38ffeaab8b8661b973d1484b46a4b1f8d463306ef710486
Official 2026/2027 table yields 49 distinct event records.
Five fields only: id/date/title/source/sourceUrl. The 4pm New York clock
is derived by the calendar UI to reflect Eastern daylight saving and KST.
The raw fetched HTML is stored before parsing. Source failure retains
previously observed TIC dates. No synthetic or weekday-extrapolated dates.

SAFETY:
- Exact R26 PC HEAD/config.source required. Any drift STOPS.
- Back up original files, commit exact three files to local Git,
  and read back updated config.source.
- No forced collection, publication, SQLite/D1 migration or task change.
- No GitHub push, main merge or Cloudflare deployment.
- If STOP occurs, do NOT retry, bypass, replace files or force collection.
  Upload result for inspection.
