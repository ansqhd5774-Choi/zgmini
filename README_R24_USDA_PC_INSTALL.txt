ZGMINI MARKET CALENDAR R24 USDA WASDE PC CORE INSTALL
DATE: 2026-10-28

PURPOSE
  Add the official USDA WASDE published dates to the existing R23 calendar.
  Preserve previously installed BLS, BEA, Census, Federal Reserve and EIA
  event sources without changing the SQLite schema or scheduler.

INSTALLATION (WINDOWS CMD ONLY)
  1. Extract ALL files of MARKET_CALENDAR_R24_USDA_PC_INSTALL_20261028.zip
     into ONE folder, preserving the lib/ and scripts/ subfolders.
  2. Double-click MARKET_CALENDAR_R24_USDA_APPLY.cmd exactly once.
  3. Upload MARKET_CALENDAR_R24_USDA_APPLY_RESULT.txt to ChatGPT.

PRECONDITIONS / SAFETY
  Installed PC source must be exactly:
  8ff396217c9f84578b37c9d422381644c2b8f0e8
  Fixed Core worktree identity: d0a4b3cb8b95.
  Existing R23 parser, EIA module, collector, PC config source and Core
  task path must match their approved original hashes and metadata.
  A dirty protected Core, occupied local-cycle.lock, changed source,
  pre-existing USDA module or candidate hash mismatch produces STOP.
  Never remove an existing lock or change scheduler settings to proceed.

CHANGES IF ALL GUARDS PASS
  lib/release-calendar.mjs (add USDA source registration)
  lib/usda-calendar.mjs (new official-date parser)
  scripts/pc-writer/release-calendar.mjs (add official USDA collector)
  Existing lib/eia-calendar.mjs is hash-verified and never modified.
  The installer backs up original parser, collector and PC config, creates
  an exact three-file local Git commit, then updates ONLY config.source.

DOES NOT DO
  No forced data collection, publishing, database reset/schema change,
  Windows scheduled-task edit, GitHub push, main merge or Cloudflare deploy.
  PC local scheduled collection and public site checks remain independent.

OUTPUT
  Success: R24_USDA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION
  Failure: *_STOP with a reason; upload result TXT without retry loops.
  DO NOT run earlier R23 installation again after successful R24 install.
