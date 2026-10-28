ZGMINI MARKET CALENDAR R24 - PC SOURCE DRIFT READ ONLY
DATE: 2026-10-28

WHY
  R24 installer returned PC_SOURCE_CHANGED_STOP before writing any Core files.
  It must not be retried without discovering the current approved PC source.

STEPS
  1. Extract all files from MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY_20261028.zip
     to one directory, preserving scripts/pc-writer subdirectories.
  2. Run MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY.cmd only once.
  3. Upload MARKET_CALENDAR_R24_SOURCE_DRIFT_RESULT.txt.

READ ONLY
  Reads task origin, current local Git HEAD and differences in protected
  source names, approved file SHA256 hashes and config.source. No absolute
  PC paths, credentials or other configuration values are exported.

NEVER PERFORMS
  No Core source change, config write, Git commit/push, SQLite access,
  lock removal/acquisition, collection, publisher, task or deployment action.
  Does not re-run the failed R24 installer.
