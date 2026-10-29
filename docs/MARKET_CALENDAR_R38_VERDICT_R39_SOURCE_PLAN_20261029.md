# Market Calendar R38 inventory verdict and R39 candidate gates — 2026-10-29

## Evidence, verified on actual PC SQLite (read-only)
Artifact: `MARKET_CALENDAR_R38_CENSUS_INVENTORY_RESULT.txt`, generated at 2026-10-29T05:21:43.255Z.
- Calendar status READY; Census status READY; stored/checked at 2026-10-28T23:25:03.318Z; freshness WITHIN_48H.
- Total 1,302 saved events across sources; Census 338 records / 17 distinct release titles.
- Census already includes: Durable Goods Advance (25); New Residential Construction / permits (27); New Residential Sales (27); Construction Spending (26); Manufacturing and Trade inventories/sales (25). Combined 130 events, not 130 unique dates. No new Census collector warranted.
- New source candidate `matchingSavedEvents=0` for each of unemployment initial claims, ISM Manufacturing PMI, ISM Services PMI, Michigan consumer sentiment and Conference Board consumer confidence. This is R38 **literal title regex comparison against stored output**, not an exhaustive check of every UI/manual feed or semantic synonym.

## Official sources checked on 2026-10-29
1. U.S. Department of Labor weekly initial claims. Official weekly schedule: Thursdays at 08:30 Eastern, exceptions listed (2026-11-25 Wednesday). https://oui.doleta.gov/unemploy/archive.asp
2. ISM Manufacturing PMI: 2026-11-02; ISM Services PMI: 2026-11-04, 10:00 Eastern. Use **explicit 2026 official dates** rather than naively assuming first/third business day during holidays. https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/
3. University of Michigan Surveys of Consumers: next preliminary 2026-11-06, 10:00 Eastern; preliminary and final releases must not be collapsed. https://www.sca.isr.umich.edu/
4. Conference Board Consumer Confidence: next 2026-11-24, 10:00 Eastern, but site has restrictions on reproducing proprietary data. This project needs only the announcement date. Check publication/automation terms before implementing scraping. https://www.conference-board.org/topics/consumer-confidence/

## R39 revised scope: NO fixed count or five-item cap (2026-10-29 user correction)
The earlier five candidates were just an example subset. The actual goal is to integrate all **valuable, verifiable, legally usable, freely accessible release schedules** missing from the unified market calendar. No arbitrary fixed limits (5, 10, 20) on indicator count, country, or number of source feeds. This is a release-calendar project: do not confuse dates/times with live economic values or schedule estimates.

### Work in parallel by independent source families, not five hard-coded indicators
- United States federal statistical releases: BLS, BEA, Census, Federal Reserve/FOMC, DOL unemployment insurance, Treasury refunding/auctions/TIC, EIA energy, USDA agriculture, CFTC derivatives; inventory each agency's entire official calendar, not only principal headline indicators. Existing PC output proves coverage for bls, bea, census, fed, fed_calendar, eia, usda, cftc, treasury and tic; **do not re-import these without a gap check**.
- United States other official/industry releases: ISM manufacturing/services, University of Michigan surveys (preliminary/final separately), Conference Board confidence, and other documented calendars identified during the comprehensive coverage audit. Do not scrape/reproduce protected proprietary content without rights confirmation.
- South Korea monetary/statistical releases: Bank of Korea rate decisions, monetary committee minutes, macro/statistical releases; national data agency price, employment, industrial activity, online shopping and other monthly publication plans; trade ministry exports/imports and other market-relevant official release schedules. The current 1,302-row PC report is US-source-only and therefore not evidence of completed KR coverage.
- Other economic/financial events: official treasury financing/refunding, buyback schedules, commodity reports, auctions and other material announced release events. Keep existing CFTC/EIA/USDA/Treasury items if already present and prevent duplicates.
- Earnings calendar: previously connected vendor display; issuer-confirmed dates distinguished from vendor-estimated dates. **Do not merge these indiscriminately into Census and government economic releases**.

### Gate every candidate
For each source and release family: official URL; source terms/permission; publicly stated date, time, timezone and preliminary/tentative/confirmed status; machine-readable or stable source; free quota and refresh behavior; holidays/late changes; unique-ID dedupe against the actual stored PC feed plus manual/earnings display; parser tests; PC collect/store/re-read; published D1 and API/UI read-back. Assign states:
- ALREADY_CONNECTED_VERIFIED: actual stored and public output evidence, never re-add.
- GAP_CONFIRMED: absent after semantic dedupe; source eligible.
- SOURCE_FEASIBILITY_PENDING: official schedule/rights/exceptions not yet substantiated.
- BLOCKED_BY_SOURCE: paid-only, terms restriction, or unusable technical source.
- RUNTIME_PENDING: source tested but PC/D1/UI not yet demonstrated.

### Parallel execution and bounded integration
1. Inventory the official calendars and the real 1,302-row PC records, including alternate names, survey periods, holidays, and manual entries. Build a comprehensive register that can expand as new sources are discovered.
2. Research and create isolated tests for independent source families concurrently. Share providers across indicators; avoid redundant HTTP calls.
3. Keep each source failure independent (PARTIAL/SOURCE_FAILED with last good data preserved). No synthetic dates, unconfirmed clock times, or success claims based on a 200 response alone.
4. Only integrate validated missing schedules in controlled batches into the **existing** PC Core job. Reuse SQLite input/output and D1 publication; no new task, schema, paid provider, source overwrite, weighting change or direct production deployment without approval.
5. Validate exact PC execution/read-back → D1 → API → desktop/mobile. A staged source test is not live success. Continue working on independent supported sources if another source is blocked.

### Public source starting points
- https://www.bls.gov/schedule/2026/
- https://www.bea.gov/news/schedule/
- https://www.census.gov/economic-indicators/calendar-listview.html
- https://www.bok.or.kr/portal/main/contents.do?menuNo=200755
- https://www.mods.go.kr/newsPln.es?mid=a10305000000
- https://home.treasury.gov/policy-issues/financing-the-government/quarterly-refunding/most-recent-quarterly-refunding-documents/
- https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/
- https://oui.doleta.gov/unemploy/archive.asp
- https://www.sca.isr.umich.edu/
- https://www.conference-board.org/topics/consumer-confidence/

## Current status
R38 stored-data audit PASS. R39 new-provider code integration NOT STARTED, new-provider calls NOT RUN, PC runtime unchanged, no publication or deployment.
