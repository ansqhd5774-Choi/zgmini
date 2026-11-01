ZGMINI R45: LIVE CORE TASK INVENTORY - READ ONLY
Branch: codex/zgmini-gpt-workspace-20261025

PURPOSE
  Identify the CURRENT Core Task -> outer VBS -> nested Core dispatcher,
  current PC config.source and Git HEAD, and the exact R45 observer state.
  The older R51 fixed outer wrapper hash is a historical comparison ONLY.

STEPS
  1. Extract this package to a NEW directory OUTSIDE the PC Git worktree.
  2. Run MARKET_CALENDAR_R45_PC_LIVE_INVENTORY.cmd once (no arguments).
  3. Share only MARKET_CALENDAR_R45_PC_LIVE_INVENTORY_RESULT.txt.
  4. Do NOT run any previous R45 detach --apply based on this inventory.

PROTECTIONS
  This script reads the existing schtasks Core XML, referenced launcher files,
  config.source, tracked Git status, collector source and current lock state.
  It does NOT run Core or launcher commands, collect providers, touch the
  Task/launcher, change config/source, delete locks, edit DB/D1, or publish.
  It DOES NOT grant permission to install or detach anything.
  Wrapper file hashes and Git SHAs are evidence, not current approval stamps.
  Current worktree configuration and exact file diff require separate review.

  The CMD wrapper writes ONE local report in the extracted package directory.
  Existing reports are never overwritten; reuse a fresh directory if needed.
  The report omits paths, Task XML, raw commands, config body and credentials.
  The tool does not determine whether a running Core PID is making progress.

  Never copy this package into the PC Core project, replace an existing
  scheduler, change the Core five-minute interval, or use git pull for this.
