ZGMINI R45 PC CURRENT-SOURCE DETACH - GUARDED SINGLE FILE
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  The PC Core launcher and source were identified by the latest R45
  read-only inventory. R45 remains in the collector while the PC checkout
  source has advanced. Never restore the old R56 checkout or launcher.

IMPORTANT: TWO SEPARATE MANUAL ACTIONS
  1. Extract this ZIP into a NEW folder OUTSIDE the PC Git project.
  2. Run MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd with no arguments.
     The first run is READ-ONLY and creates one PREFLIGHT_RESULT.txt.
  3. Share this preflight result for review BEFORE any apply.
  4. Only after review and a READY decision, the operator may explicitly
     run MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd --apply in the SAME folder.
     This creates APPLY_RESULT.txt, preserves a private local backup,
     changes exactly collect-local.mjs, commits locally, and updates source.

GUARDS
  - Exact current PC source HEAD, worktree ID, three VBS hashes, and raw
    collector blob must match the previously observed evidence.
  - The Git canonical hash of the working source must equal HEAD's blob.
    This separates CRLF conversion from real file drift.
  - Three exact R45 observer segments must each occur once and leave no
    further R45 observer references after removal.
  - The five-minute Core Task and R7 helper launcher are never changed.
  - APPLY requires FREE Core lock; other active/ambiguous locks stop.
    Existing Core locks are never deleted or force-released.
  - Only the new operation's OWN lock is released after guarded action.
  - No forced collection, API calls, DB/D1 writes, schedule changes, Git
    push, or public rating changes. Existing R45 archives are preserved.
  - Errors after local Git commit require human readback/recovery.

Do not run --apply solely because the package exists or because a prior
inventory identified a R45 marker. Read the preflight result first.
