ZGMINI MARKET CALENDAR R45 - PC CORE OBSERVER SAFE DETACH
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  Stop the historical R45 market-importance snapshot sidecar in the existing
  five-minute PC Core collector. Keep B1, provider, Core Task, schedules,
  data files, R43 research, and annual manual FHS-R3 untouched.

FIX1 PREFLIGHT DIAGNOSTIC (2026-11-01)
  The previous read-only preflight stopped safely with
  R45_DETACH_CORE_LAUNCHER_CHANGED_STOP. No files were changed.
  FIX1 keeps the same hard stop and reports the underlying R51 origin status,
  outer-wrapper checksum match, bounded VBS count and whether the existing
  config.source matches the previously approved R56 source. No Task XML,
  commands, paths, config body or secrets are included.
  Unpack this FIX1 package into a NEW folder; do not reuse old result files.

PREPARATION
  1. Extract the entire ZIP to a NEW folder OUTSIDE the PC project worktree.
     Do not copy these scripts into E:\ZGmini\projects\ or run git pull.
  2. Use the already approved Node E:\ZGmini\runtime\node.exe (Node 24).
     The package contains the R51 Core-origin resolver required by the helper.

READ-ONLY PREFLIGHT
  Run: MARKET_CALENDAR_R45_PC_DETACH.cmd
  Check MARKET_CALENDAR_R45_PC_DETACH_PREFLIGHT_RESULT.txt:
    decision = R45_DETACH_PREFLIGHT_READY_NO_CHANGES
  If that decision is absent, STOP; do not run --apply.

EXPLICIT ONE-TIME APPLY
  Only after successful preflight, run from the SAME folder:
    MARKET_CALENDAR_R45_PC_DETACH.cmd --apply
  Check MARKET_CALENDAR_R45_PC_DETACH_APPLY_RESULT.txt:
    decision = R45_DETACH_INSTALLED_LOCAL_ONLY
  Any other decision is not an installation success. Do not repeatedly run
  the installer, delete a lock, force a Core run or reset local Git.

PROTECTION
  - Exact R56 approved PC HEAD and target collector blob are required.
  - BUSY, ORPHAN or ambiguous Core locks stop immediately without waiting.
  - Only scripts/pc-writer/collect-local.mjs is patched, committed locally,
    backed up and read back; config.source tracks the new local commit.
  - Never overwrite prior result reports; use a new extracted folder if
    another review is necessary.
  - No extra provider calls, automated collection, DB/D1 writes, public
    grade publication, task scheduling changes or remote Git push.
  - Old R45 archive files are preserved; successful code installation
    does not itself prove an operational Core cycle.

This is an optional user-PC package; creating or downloading the ZIP does
NOT apply the change to the user's computer.
