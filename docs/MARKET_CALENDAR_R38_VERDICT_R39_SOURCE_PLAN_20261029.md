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

## R39 recommended priority and safe action boundary
1. Start with read-only source/rights evaluation for DOL and ISM and confirm existing UI/manual-calendar semantic overlap. Build isolated parser fixtures and schedule tests before any PC collector integration.
2. Next Michigan prelim/final. Conference Board after verifying terms and stable published exception dates.
3. Keep existing schedule, collect cadence, quota policy, SQLite and D1 schemas, scoring/importance mapping, public API contract and PC runtime unchanged until explicitly approved. Do **not** call new provider URLs from production or deploy a new scheduler during this audit.
4. For any eventual approved new collector, follow original source→stored input read-back→stored output→D1 read-back→API/UI, distinguishing staged source tests from live PC runtime.

## Current status
R38 stored-data audit PASS. R39 new-provider code integration NOT STARTED, new-provider calls NOT RUN, PC runtime unchanged, no publication or deployment.
