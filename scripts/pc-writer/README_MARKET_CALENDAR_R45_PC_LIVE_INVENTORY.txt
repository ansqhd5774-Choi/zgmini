ZGMINI R45: LIVE CORE TASK INVENTORY FIX4 - READ ONLY
Branch: codex/zgmini-gpt-workspace-20261025

FIX4 NOTE (2026-11-01)
  PC R3 confirmed the inner 20-line VBS has three dynamically assembled Run
  commands, with Chr() and concatenation. The repository does not contain
  that private PC launcher. FIX4 safely resolves only literal expressions,
  prior string assignments, printable Chr(n), and '&' without running code.
  Non-constant expressions stay unresolved. Any remaining unknown VBS is
  described by anonymized syntax tokens, never by raw commands or paths.
  A static result still requires source/config validation and is NOT an
  approval for any PC source or Task change.
  Use a NEW extraction folder and upload only the resulting report TXT.

FIX3 NOTE (2026-11-01)
  FIX2 tightened the parenthesized Run rule and stopped at the outer wrapper
  that R1 had already traced. FIX3 restores the original R50/R1 parentheses
  recognizer, plus the additional strict bare-literal recognizer and
  anonymized nested shape output. It does not change the user's PC Core.
  Use a NEW extraction folder and upload only the resulting report TXT.

FIX2 NOTE (2026-11-01)
  Previous R1 report found two VBS files, but stopped on the inner VBS with
  CORE_RUN_SHAPE_UNVERIFIED. FIX2 understands two literal VBScript Run forms
  and adds only bounded, anonymized syntax counts/hints for unresolved code.
  It still never treats observed launcher or config hashes as approval.
  Extract into a NEW folder; do not reuse the first package report.

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
  If the shape remains unresolved, report the anonymized coreChainShape only;
  do not paste raw VBS, Task XML, environment values or Git configs.
  Current worktree configuration and exact file diff require separate review.

  The CMD wrapper writes ONE local report in the extracted package directory.
  Existing reports are never overwritten; reuse a fresh directory if needed.
  The report omits paths, Task XML, raw commands, config body and credentials.
  The tool does not determine whether a running Core PID is making progress.

  Never copy this package into the PC Core project, replace an existing
  scheduler, change the Core five-minute interval, or use git pull for this.
