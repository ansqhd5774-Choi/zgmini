ZGMINI MARKET CALENDAR R23 - EIA WPSR CALENDAR JSON EXPORT
2026-10-28

This package is a single-request, READ-ONLY source check. The earlier six
official EIA HTML pages were already captured; do not run that export again.

1. Extract this entire ZIP to a new folder on the approved Windows PC.
2. Run MARKET_CALENDAR_R23_EIA_WPSR_JSON_EXPORT.cmd from that folder.
3. Upload MARKET_CALENDAR_R23_EIA_WPSR_JSON_RESULT.txt from that folder.

Exactly one public JSON GET:
  https://www.eia.gov/petroleum/supply/weekly/includes/wpsr-calendar.json

The WPSR official HTML refers to this endpoint for release dates.
The report contains the public JSON bytes (Base64), checksum and status.
It does NOT install/alter PC Core, config, scheduler, SQLite, Git, D1,
the market calendar site, publisher, or routine collection cycle.

Even if the tool displays a failed source status, upload the TXT so its
non-secret error code can be checked. Do not bypass EIA access controls.
