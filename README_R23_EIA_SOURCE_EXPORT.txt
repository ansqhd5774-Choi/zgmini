ZGMINI MARKET CALENDAR R23 - EIA OFFICIAL SOURCE EXPORT (READ-ONLY)
2026-10-28

1. Extract the entire R23 ZIP to a new folder on the approved Windows PC.
2. Run MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT.cmd from that folder.
3. Upload MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_RESULT.txt from the same folder.

One-time public GETs (exactly one request per source, sequential, with a gap):
  https://www.eia.gov/reports/upcoming.php
  https://www.eia.gov/petroleum/supply/weekly/schedule.php
  https://www.eia.gov/petroleum/supply/weekly/
  https://ir.eia.gov/ngs/schedule.html
  https://www.eia.gov/outlooks/steo/release_schedule.php
  https://www.eia.gov/outlooks/steo/

All returned official HTML, status, and SHA256 are embedded in the single TXT.
This is ONLY a source-structure capture, not an R23 collector or PC installer.
It never reads or changes PC Core, config, tasks, SQLite, logs, Git, D1, or
the publisher. It does not run or force the regular collection cycle.

For reliable release dates and holiday shifts we will inspect the exact
official HTML before writing a new parser. No dates or release times will be
fabricated from stale snapshots or presumed recurrence rules.

If one source fails, please return the same TXT anyway. Never disable EIA
access controls or bypass a block. EIA's privacy and security policy forbids
excessive automated requests. This tool runs once, with fixed URLs, no loops
or background schedule, and a 1.2-second pause between source requests.
