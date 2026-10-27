ZGMINI MARKET CALENDAR R21 - CORRECTED PC INSTALL (2026-10-28)

BRANCH: codex/zgmini-gpt-workspace-20261025
This corrected package replaces the 2026-10-27 R21 installation package.

WHY THE FIRST PACKAGE STOPPED
- Approved PC Core collector and the GitHub reference have identical code.
- The PC version uses CRLF line endings; GitHub has LF line endings.
- The first installer wrongly required the GitHub LF byte-level checksum.
- The first run changed zero files. R20 remained installed.

THIS PACKAGE
- Requires approved R20 PC HEAD and installed R20 Census parser.
- Checks the exact real PC CRLF collector SHA256 and normalized LF SHA256.
- Preserves PC CRLF line endings in the updated R21 collector.
- Uses official Census current and next year release calendars with fallback
  to the official generic list for annual HTML without usable year rows.
- Retains BLS, BEA, Fed, cached attempts, locks, release history and IDs.

RUN ON THE APPROVED PC
1. Extract this entire ZIP to a new, separate folder. Keep all subfolders.
2. Double-click MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF.cmd.
3. Upload MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF_RESULT.txt from the
   same folder as that CMD. The CMD writes the TXT automatically.
4. If the result says CORE_LOCK_ALREADY_EXISTS, allow the normal Core run to
   finish and retry. Do not terminate Core or delete the lock.

EXPECTED RESULT
  decision: R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION
  phase: INSTALLED
  changedFiles: [scripts/pc-writer/release-calendar.mjs]

STOPS SAFELY IF PC SOURCE, WORKTREE, CONFIG, PARSER, COLLECTOR, GIT STATUS,
OR LOCK DIFFERS FROM THE APPROVED R20 STATE.

This install does not force a collection, change the scheduler, database,
publisher, GitHub remote/main, or deploy the website.

SOURCE CHECKSUMS (SHA256)
R20 PC collector CRLF: 1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6
Same R20 code in LF: 4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc
R21 candidate source LF: 2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0
R21 PC installed CRLF: 8105a2922ff0d05d29b329dc22dcf66d0d5920ea0d1661337066cef877f45bc5
