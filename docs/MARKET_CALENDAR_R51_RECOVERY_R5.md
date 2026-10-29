# Market Calendar R51 — network recovery R5

## Reason for this revision

The user-provided resume summary `MARKET_CALENDAR_R51_RESUME_RESULT_20261029T134610296Z_26528.txt` records `R51_BATCH_STORED` for batch 2 and `R51_LOCAL_OR_NETWORK_FAILURE` while trying batch 3. It does **not** identify the precise network failure. The old collector used a 20-second request timeout; the prior CMD had a permanent single-run marker and no automatic transient retry. The first two row checkpoints total 240 planned tickers. No known public data, stars, SQLite, D1 or scheduler writes occurred.

## Scope, preconditions and safety

- Preserve the existing pinned plan SHA `4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138` and the 2,394 tickers across 20 batches.
- Read existing raw pages and contiguous `rows/batch-*.json` checkpoints in the user's approved `E:\ZGmini\data\pc-writer\market-calendar-r51-alpaca` folder. Never modify or delete completed batch rows, raw pages or the plan.
- One Windows CMD launch uses the existing approved Node runtime, pinned plan and credentials already present on PC; no keys in the ZIP or reports.
- Raise network request timeout from 20 to 45 seconds; label transient timeouts or network failures distinctly, and retry a failed batch at most twice with 3s then 6s delay. Retry only those transient conditions and HTTP 500/502/503/504; do not retry 403, 429, schema/rights errors or any other STOP.
- Maximum **12 API requests per batch across all recovery attempts in one invocation**, maximum 120 tickers per batch, 40 per symbol group, at most 19 new completed batches per launch. The existing collector resumes partially saved raw pages without re-fetching them.
- A separate `resume-recovery.lock` permits one recovery process. Existing `run.lock` remains owned solely by the original collector. If a lock already exists, STOP; never remove another process's lock.
- Console shows batch progress. Every batch attempt writes an immutable timestamped result; the same folder's `MARKET_CALENDAR_R51_LATEST_RESULT.txt` is the single easily identified summary to upload. The CMD pauses at the end, including success.
- Protected: SQLite, D1, market cap, stars, UI, scheduler, deployment. This recovers **prices only**. Package preparation and unit tests do not imply actual PC operation success.

## User execution

1. Download the ZIP into a **new empty folder** and fully extract it. Do not overwrite a previous ZIP folder or any operational `E:` path.
2. Double-click **`MARKET_CALENDAR_R51_RECOVER_AND_CONTINUE.cmd`** once. Leave the console open until it says `EXIT_CODE` and asks for any key.
3. Send only **`MARKET_CALENDAR_R51_LATEST_RESULT.txt`** from that same extracted folder. No need to find the per-step failure report, raw prices or credentials.
4. `R51_RESUME_COMPLETE` with `LATEST_BATCH=20` proves local row collection only. The next phase is shares outstanding and market capitalization validation, before changing stars or the public site.

The GitHub working branch remains `codex/ui-improvements`. New branches are prohibited for this task.
