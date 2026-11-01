ZGMINI R49 - ANONYMIZED WRAPPER SYNTAX CHECK (READ ONLY)
=======================================================

R46 and R48 installer attempts both stopped BEFORE any source write.
The active WScript wrapper does not expose a directly quoted .mjs/.cmd
reference in the formats those installers were able to verify.

1. Extract both files from the ZIP to one new folder on the Windows PC.
2. Run MARKET_CALENDAR_R49_WRAPPER_SHAPE_READONLY.cmd once.
3. Share MARKET_CALENDAR_R49_WRAPPER_SHAPE_RESULT.txt.

This diagnostic is NOT an installer. No collection, API, DB, Git, task,
publish, schedule or source changes are performed.

Only the current Core task-referenced VBS file is read. Every string
literal, variable name, numeric literal and path is anonymized into a
category token. The report shows command structure and booleans only.
No raw wrapper lines, file paths, credentials or data are included.

If the R49 result identifies the wrapper pattern, the next installer
can be tailored to the current approved PC source without weakening
the Git/config/lock/backup safety gates.

Keep CMD and .mjs together. Existing result TXT is never overwritten.
