ZGMINI MARKET CALENDAR R56 - R45 CORE PASSIVE CAPTURE UPDATE
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  R45 is already installed in the existing PC Core/B1 collector.
  This patch removes an unrelated S&P 500 coverage gate that could prevent
  reuse of already-downloaded full-market MarketParquet rows.
  No separate 5-minute job, external API request, DB or site change is made.

WINDOWS PC - ONE-TIME RUN
  1. Extract this ZIP into a NEW folder.
  2. Run MARKET_CALENDAR_R56_PC_APPLY.cmd once.
  3. It may wait up to 3 minutes for natural Core lock release.
  4. Review MARKET_CALENDAR_R56_PC_APPLY_RESULT.txt in the same folder.
  5. Send that result TXT to the developer if a decision is needed.

ONLY SUCCESS
  decision: R56_PC_R45_PASSIVE_CAPTURE_INSTALLED

SAFETY GATES
  - Registered Core Task -> existing R51 launcher chain -> actual PC source.
  - Exact approved PC HEAD 1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3
    and config.source must match; clean protected worktree is required.
  - Exact prior single provider-file SHA256 is required.
  - Core lock is never removed, renamed or bypassed when owned by another PID.
  - If orphaned, unknown or still busy after 3 minutes, stop unchanged.
  - Backup + readback + one-file local Git commit + config.source update.
  - No provider call, forced B1 collection, DB/D1/publication or scheduler change.

If the PC source was changed by another approved project after R53, the
installer must stop rather than replace or overwrite those changes.
Do not manually delete a Core lock or re-register a Windows Task.

This update is NOT proof of a new R45 stock day or public R43 grades.
It preserves the already-installed R45 sidecar and its storage/checks.
