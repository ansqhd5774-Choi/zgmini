ZGMINI MARKET CALENDAR R24 USDA WASDE PC INSTALL - V2
DATE: 2026-10-28

WHY V2
  A different PC writer advanced PC Core from R23 source 8ff396217c9f8457...
  to source 4e2a12ccf486d760a21c3269a9f77a4bfe4f48df.
  The R24 V1 safely stopped before changing any files.
  The actual PC read-only log verified that R23 is an ancestor and that
  five unrelated earnings/collection source files were changed. The three
  R24 calendar installation targets remain identical to approved R23.

STEPS
  1. Extract the WHOLE MARKET_CALENDAR_R24_USDA_PC_INSTALL_V2_20261028.zip
     into one folder, preserving scripts/ and staging/ subdirectories.
  2. Run MARKET_CALENDAR_R24_USDA_APPLY_V2.cmd ONCE.
  3. Upload MARKET_CALENDAR_R24_USDA_APPLY_V2_RESULT.txt.

STRICT SAFETY GATES
  - Exact PC source HEAD and config.source:
    4e2a12ccf486d760a21c3269a9f77a4bfe4f48df
  - Core worktree identity d0a4b3cb8b95.
  - Git R23 source must be an ancestor of this exact HEAD.
  - Only these five protected paths changed between R23 and this HEAD:
    lib/market-score/sec-earnings-e1-r4-provider.mjs
    scripts/pc-writer/collect-local.mjs
    scripts/pc-writer/collection-events.mjs
    scripts/pc-writer/local-data-alert.mjs
    worker/market-operational-refresh.mjs
  - Original R23 calendar parser, EIA module, collector hashes exact.
  - No existing lib/usda-calendar.mjs, no dirty protected tracked files,
    and no occupied PC local-cycle.lock.
  - Any mismatch STOP. No reset, cleanup or forced retries.

CHANGES ONLY IF EVERY GATE PASSES
  lib/release-calendar.mjs
  lib/usda-calendar.mjs
  scripts/pc-writer/release-calendar.mjs
  Original two files and config are backed up. Exactly three files are
  committed locally; config.source is updated to that local commit.
  The five unrelated files, EIA module and all other Core files are never
  modified by this installer.

NEVER PERFORMS
  No collection, publisher, task/scheduler change, SQLite schema/write,
  GitHub push, main merge or Cloudflare deploy.

RESULT
  Success: R24_USDA_V2_INSTALLED_NO_FORCED_COLLECTION
  Failure: *_STOP; upload result TXT and do not retry previous V1/V2.
