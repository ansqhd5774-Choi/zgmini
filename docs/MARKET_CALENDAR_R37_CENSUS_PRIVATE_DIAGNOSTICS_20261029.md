# R37 Census collection diagnostics (2026-10-29)

## Scope
Existing R29/R33 PC collector only; no new collection source or scheduler. The **current public calendar output and event schema stay unchanged**. The patch records bounded diagnostic codes in PC SQLite private input keys `release-calendar:census:diagnostic:YYYY`.

## Cases
- HTTP 429 / HTTP 404
- timeout or abort
- empty or wrong-year HTML
- oversize HTML / parser problem
- current-year success with next-year failure (current remains READY)
- both official endpoints fail (last valid calendar output preserved)
- diagnostic input-write failure (official collection still proceeds)

The two endpoint attempts keep only `annual` / `official-list` and allowlisted error codes. Raw HTML, credentials, full exception messages and URLs are not recorded in the diagnostic payload.

## Installation and safety
Local CMD package: MARKET_CALENDAR_R37_CENSUS_DIAGNOSTICS_20261029.zip.
Known latest PC installed source from R33 log: `eb0d20f5354ff7cf52dd79960b408345bcce0010`.
The installer verifies that exact commit, worktree identity, active `config.json` source, clean protected paths and known collector SHA256 (both LF and CRLF variants). It backs up one collector and config, waits up to 20 minutes for Core lock, then commits **only** `scripts/pc-writer/release-calendar.mjs`. If the baseline differs, it stops without modifying files.
No forced provider requests, D1 publication, schedule changes, new branches, merges, or production deployment.
Check existing Core normal execution after installation; never count installation as data-fetch success.

## Verification
Local isolated Node tests: 7/7 PASS (diagnostic classification, fallback, current/next-year separation, preserving old data, install fail-closed). Actual PC installation and runtime latest-state verification: NOT EXECUTED.
Reference official source: https://www.census.gov/economic-indicators/calendar-listview.html
