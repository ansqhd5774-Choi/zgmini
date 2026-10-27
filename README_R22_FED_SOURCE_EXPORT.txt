ZGMINI R22 Federal Reserve official calendar source inspection (read only)

1. Extract this ZIP file, preserving all directories.
2. Double-click MARKET_CALENDAR_R22_FED_SOURCE_EXPORT.cmd on the authorized Windows PC.
3. Upload MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt from the SAME directory as the CMD.

The CMD performs up to five GET requests to official www.federalreserve.gov
calendar pages (current month and next 2 months, statistical calendar,
FOMC calendar). It does not read, stop, lock, or modify the existing Core,
SQLite, source/config, scheduler, Git, or publisher. It does not force
the scheduled release-calendar collection.

The single resulting TXT includes public official HTML encoded as Base64
for parser development. An unavailable future calendar is reported as
SOURCE_READ_FAILED; other successful official pages remain in the TXT.
This is source-format inspection only, NOT an R22 runtime installation.

If HTTP requests fail, still upload the TXT. Do not run multiple attempts.
The CMD file must remain next to its scripts directory inside the ZIP.
