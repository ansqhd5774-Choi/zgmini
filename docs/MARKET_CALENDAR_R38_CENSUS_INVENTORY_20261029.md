# Market Calendar R38 – Census 338-row deduplication audit
2026-10-29 · read only.

## Evidence
Last PC record from R37: Census READY, 338 events, source checked 2026-10-28T23:25:03.318Z. Record contains event count but **not individual titles**. The R27/R29 parser collects all parseable Census release titles; UI recognizes dynamic `census-` IDs. Previously proposed Census durable goods, residential construction, residential sales, construction spending and inventories/sales all occur on the Census official 2026 calendar. No duplicate collection source should be installed.

## Current task
Run `MARKET_CALENDAR_R38_CENSUS_INVENTORY.cmd` from the R38 ZIP once on the existing PC. Reads only `E:\ZGmini\data\pc-writer\storage\core.sqlite`, `kind=output`, `feed_key=release-calendar`, `snapshot_key=current`. It prints Census title/row counts, target availability, and newly proposed non-Census source candidates; no provider calls, no DB mutations, no D1, no schedule change, no Git push.

The uploaded result must establish the 338 group counts before adding any new Census item. New-source shortlist: DOL initial claims, ISM Manufacturing and Services PMI, Michigan Surveys of Consumers preliminary/final, Conference Board Consumer Confidence. Compare exact existing saved titles before implementing.

Official references:
- https://www.census.gov/economic-indicators/calendar-listview.html
- https://oui.doleta.gov/unemploy/archive.asp
- https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/
- https://www.sca.isr.umich.edu/
- https://www.conference-board.org/topics/consumer-confidence/

## Verified
Local mock DB test (Node 22): 2/2 PASS. Zip archive integrity: PASS. Actual R38 PC audit: NOT EXECUTED; source-only availability is not proof of current PC title counts. No main merge or deployment.
