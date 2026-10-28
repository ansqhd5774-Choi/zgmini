MARKET CALENDAR R29 - PC PRIVATE EARNINGS INSTALL V3

Why V3:
 - V1 safely stopped on an unexpected collect-local.mjs version.
 - V2 passed source checks but stopped before completing a backup.
 - V2 did not report its exact OS error code or phase, so root cause is unknown.
 - V3 keeps the same three-file R27-based patch, and adds phase/error reporting.

V3 behavior:
 - Checks existing PC Core worktree, R27 parser/collector SHA, PC config and
   clean protected source before ANY write.
 - Checks whether local-cycle.lock already exists. If it does, V3 reports
   R29_V3_CORE_LOCK_PRESENT_STOP and DOES NOT delete the file or retry.
 - If a lock race occurs, V3 reports R29_V3_CORE_LOCK_RACE_STOP.
 - If any other operation fails, V3 reports phase and safe errorCode.
 - Backs up the existing collector and config before writing.
 - Changes only release-calendar.mjs and two NEW private earnings modules.
 - Does not change collect-local.mjs, scheduled tasks, DB schema or D1 output.
 - Never automatically runs a collection or pushes to GitHub.

How to run:
 1. Extract this V3 ZIP completely, preserving folders.
 2. Run MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V3.cmd ONCE.
 3. Read MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V3_RESULT.txt.
 4. Success ONLY when decision is:
    R29_V3_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION
    Any other decision is STOP. Send only the result TXT; do not retry blindly.

Do NOT delete local-cycle.lock or stop a task to force the installer through.
Do NOT upload providers.env, EARNINGS_API_KEY, or any credential backups.
Vendor dates remain VENDOR_UNVERIFIED; site publication is not enabled.
