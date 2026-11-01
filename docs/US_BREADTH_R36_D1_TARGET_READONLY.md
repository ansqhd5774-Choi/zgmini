# R36 — isolate R35 D1 read failure without another source download

R35's user-provided operator log confirmed the previously approved percent-only
provider preview, then returned `D1_HISTORY_READ_UNAVAILABLE`, with D1 writes
reported as zero. Repeating R35 would redundantly download/verify the daily
source and would not explain a database read failure.

The existing R1 public breadth publisher writes `market_public_snapshots_v1`
to the approved PC's `config.core` D1 role. R33's R2 history publisher was
instead wired to `config.history`. **That mismatch is a likely cause, not yet
proof of the actual PC's D1 schema.** No D1 writes or schema creation should
occur on the basis of the source-code inference alone.

R36 makes at most one public-table metadata SELECT per distinct configured D1
role, plus one targeted R2-history-key SELECT when the core table exists. It
does not retrieve other users' data, print raw stored bodies, publish results,
call MarketParquet, write E:, modify the old R1 250-session history, or change
the Core scheduled task.

Run `US_BREADTH_R36_D1_TARGET_READONLY.cmd` from the root of the supplied ZIP.
The approved `E:\ZGmini\runtime\node.exe` writes only a sanitized diagnostic
TXT to `%USERPROFILE%\Downloads` (or `%TEMP%` fallback). Attach that TXT.

If the core table is present and the history table absent, and the targeted
R2 key is absent, a *separate* R37 targeted code fix and fresh readback tests
can switch the R2 writer to the approved core public table. If D1 auth, DB
binding or schema access fails, fix that exact issue before any publication.
Never replay the R35 write until the destination and current D1 state are
verified, and never mutate a deployment-only branch to perform this diagnosis.
