ZGMINI - US market breadth R5 one-shot manual refresh

1. Extract the R5 ZIP completely to a new writable Windows folder.
2. Double-click US_BREADTH_PC_R5_MANUAL.cmd exactly once.
3. Keep the CMD window open while the approved collector runs (up to 20 minutes).
4. After it finishes, send US_BREADTH_PC_R5_MANUAL_RESULT.txt.

This manual operation skips only the NY morning time gate. It does NOT bypass:
- Approved PC source SHA, approved config, source cleanliness and Node identity.
- Existing approved collector verification and latest-session source audit.
- Required coverage, count contract, newer remote data protection and D1 readback.

The manual operation never changes task definitions or the 21:00 scheduled job.
It does not edit the approved PC repository or overwrite the automatic run report.
If status is WAIT_COLLECTOR or WAIT_VERIFIED_SOURCE, data was not published.
If status is PUBLISHED_OR_ALREADY_VERIFIED, verify public API in the next step.
If status is FAILED, do not retry repeatedly; send the result file first.

Do not start it while US or existing core collection is already running.
Do not delete local locks, SQLite, checkpoints, junctions, or scheduled tasks.
