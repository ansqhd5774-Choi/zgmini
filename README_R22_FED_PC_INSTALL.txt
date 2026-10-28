ZGMINI MARKET CALENDAR R22 - OFFICIAL FED CALENDAR / PC INSTALL
2026-10-28

1. Unzip the entire R22 package into one new Windows directory.
2. On the approved E:\ZGmini PC, run MARKET_CALENDAR_R22_FED_APPLY.cmd.
3. Upload MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt from that same directory.

The installer changes only two tracked Core files:
  lib/release-calendar.mjs
  scripts/pc-writer/release-calendar.mjs

It requires:
  R21 installed HEAD b5e860d09ac87087e158193613425b146fa9a1e5
  Core worktree identity d0a4b3cb8b95
  PC config.enabled=true, collectionTarget=pc and source=R21 HEAD
  Exact R21 parser and collector SHA256 and a clean protected source
  The local-cycle.lock must not be occupied by the running Core task.

The installer performs source checks before and after acquiring its own lock,
backs up both changed files and config.json, commits precisely the two Core
files locally, and advances config.source to the new local commit only after
verification. It does NOT collect, publish, run tasks, change schedules,
alter the database, push to GitHub, or merge branches.

If the result says STOP, do not bypass locks or edit config/source manually.
Return the complete RESULT.txt for diagnosis. If a local commit succeeded but
config update failed, stop: the backup is retained for manual recovery.

Fed calendar dates are official US publisher dates. The additional source
feeds FOMC minutes, Beige Book and statistical releases; existing FOMC
decisions, press conferences and G.17 are excluded to avoid duplication.
The collector records current and two following months without inventing
unpublished calendar dates. Execution and public-page collection checks
remain separate from this installer run.
