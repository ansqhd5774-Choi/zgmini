ZGMINI MARKET CALENDAR R45 - PC CORE OBSERVER SAFE DETACH
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  Stop the historical R45 market-importance snapshot sidecar in the existing
  five-minute PC Core collector. Keep B1, provider, Core Task, schedules,
  data files, R43 research, and annual manual FHS-R3 untouched.

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
