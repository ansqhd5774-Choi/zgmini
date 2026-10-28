ZGMINI MARKET CALENDAR R23 - APPROVED PC EIA SOURCE INSTALL
2026-10-28

The approved R22 operating PC source must be exactly:
  a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e
The existing PC Core task/worktree, config source, and file hashes are checked.
If they changed, the installer stops and does not overwrite newer work.

Steps on the approved Windows PC:
1. Extract the ENTIRE ZIP to a NEW folder (do not extract only the CMD).
2. Run MARKET_CALENDAR_R23_EIA_APPLY.cmd once.
3. Upload MARKET_CALENDAR_R23_EIA_APPLY_RESULT.txt from that folder.

This EXPLICIT APPLY installer touches at most the following three PC Core files:
  lib/eia-calendar.mjs              (new, only if absent)
  lib/release-calendar.mjs           (R22 preserved, add EIA source registry)
  scripts/pc-writer/release-calendar.mjs (R22 preserved, add EIA collector)

Before changing any file, the installer checks the scheduled Core task
identity, worktree ID, exact R22 source SHA, config source, all baseline file
hashes, candidate hashes, protected dirty files, and the existing cycle lock.
It backs up both existing Core files and config. It uses the existing Core
lock; it will never steal or remove someone else's lock.

On successful installation, ONLY those three Core files are committed locally
and config.source advances to that local commit. It does not force a regular
collection or publication, alter the database or scheduled task, change any
formulas, push GitHub, merge main, deploy Cloudflare, or touch DNS.

The next ordinary PC collection can collect official EIA WPSR JSON,
WNGSR holiday exceptions, and STEO announced dates. All captured raw
source documents are stored before the existing saved-input parse.

Expected success in the uploaded TXT:
  phase: INSTALLED
  decision: R23_EIA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION

If the result shows any *_STOP code, please upload the TXT anyway.
Do NOT force-delete locks, reset the PC repository, or run another installer.
