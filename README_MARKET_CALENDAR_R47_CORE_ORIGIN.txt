ZGMINI R47 - READ-ONLY CORE TASK ORIGIN DIAGNOSTIC
================================================

Previous R46 PC install returned R46_CORE_ORIGIN_CHANGED_STOP.
No source file or database was modified by that stopped install.

1. Extract the ZIP to one folder on the Windows PC.
2. Double-click MARKET_CALENDAR_R47_CORE_ORIGIN_DIAGNOSE.cmd once.
3. Send MARKET_CALENDAR_R47_CORE_ORIGIN_DIAGNOSE_RESULT.txt.

Keep the .cmd and .mjs together. Do not move the CMD alone.
An existing result is preserved and will not be overwritten.

The diagnostic reads the existing Core scheduled-task XML and, only when
referenced, its launcher/wrapper files. It reports path structure and short
worktree identity only, NOT raw private paths or launcher file contents.
It never installs, edits Git/config/DB/schedulers, collects from an API,
changes any data, publishes results, or pushes to GitHub.

This ZIP is not the R46 installer. Re-running R46 without correcting the
verified origin mismatch cannot safely complete the installation.
