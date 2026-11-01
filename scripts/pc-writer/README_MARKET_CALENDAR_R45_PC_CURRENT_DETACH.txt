ZGMINI R45 PC CURRENT-SOURCE DETACH - GUARDED SINGLE FILE
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  The PC Core launcher and source were identified by the latest R45
  read-only inventory. R45 remains in the collector while the PC checkout
  source has advanced. Never restore the old R56 checkout or launcher.

PC OPERATOR: ONE-CLICK APPLY (ONLY AFTER CHATGPT REVIEWED YOUR READY RESULT)
  1. Extract the ENTIRE ZIP into a NEW folder OUTSIDE the PC Git project.
     Do NOT copy any CMD or JS file to a Core Task or project directory.
  2. Double-click MARKET_CALENDAR_R45_PC_APPLY_ONE_CLICK.cmd.
     No terminal commands or manual arguments are required.
     This explicitly requests local-only APPLY, and first runs a fresh
     READ-ONLY preflight in the NEW folder. It applies ONLY if READY.
  3. The window stays open. Upload the EXACT TXT file shown after
     SEND THIS TXT FILE TO CHATGPT. If stopped before apply, upload the
     PREFLIGHT_RESULT.txt or ONE_CLICK_RESULT.txt instead.
  4. Do not rerun after an ambiguous outcome. Existing reports are
     preserved and will not be overwritten in the same folder.

ALTERNATE TWO-STAGE OPERATOR FLOW
  Run MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd with no arguments to
  create PREFLIGHT_RESULT.txt (read-only), then have it reviewed. Once
  specifically approved, run the CMD with --apply in the SAME folder.
  Both successful and pre-Node error paths now save a TXT result.

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

Do not double-click the APPLY_ONE_CLICK file merely because the package
exists. It is intended only after the earlier PC preflight READY result
has been reviewed and explicit apply has been approved.
