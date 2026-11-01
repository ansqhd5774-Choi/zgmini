ZGMINI MARKET CALENDAR R56 FIX1 - EXACT ANCHOR PATCH
Branch: codex/zgmini-gpt-workspace-20261025

WHY THIS PACKAGE EXISTS
  The PC R56 result at 2026-11-01T11:09:05Z stopped safely with:
    R56_PROVIDER_SOURCE_CHANGED_STOP
  The approved PC HEAD and Core launcher matched, but the provider file
  SHA was different from the over-restrictive baseline assumed by R56.
  No source, database, scheduled task or public data changed in that run.

  This correction never overwrites the provider with a packaged file.
  It verifies the same approved PC HEAD and a clean protected worktree,
  then changes only TWO unique R45 source anchors in the actual file:
    (1) removes the unrelated B1 S&P500 minimum-coverage import;
    (2) lets the already-fetched full-stock rows reach R45 independently
        of B1's match coverage.
  All other existing code bytes are retained, with a private backup.

ONE-TIME WINDOWS PC APPLY
  1. Extract the entire FIX1 ZIP into a NEW folder (not the previous R56 folder).
  2. Run MARKET_CALENDAR_R56_FIX1_PC_APPLY.cmd once.
  3. Allow up to 3 minutes for natural existing Core lock release.
  4. Send MARKET_CALENDAR_R56_FIX1_PC_APPLY_RESULT.txt.

SUCCESS ONLY IF
  decision: R56_PC_R45_PASSIVE_CAPTURE_INSTALLED

SAFETY
  - Existing registered Core launcher and approved source are rechecked.
  - Invalid, missing or duplicate R45 patch anchors stop unchanged.
  - A live Core owner, orphaned or ambiguous lock is never forcibly removed.
  - The installer backs up the real provider/config; reads back one changed
    file; commits it only to the existing PC-local Git; updates config.source.
  - No forced collection, new provider requests, database/D1 changes,
    Task modification, site publication or public grade adjustment.
  - A newer approved PC commit is not overwritten; source drift stops.

The result only proves the one-file PC update, not a new R45 trading day
or final R43 132-company grades.
