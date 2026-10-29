# Market Calendar R51 — bounded resume R3

## Evidence and approved data scope

- Existing branch: `codex/ui-improvements`. Follow `AGENTS.md`, the R51 plan and central `codex/theme-fear-greed-integration-20261025:docs/CMD_EXECUTION_PLAYBOOK.md`.
- The PC `MARKET_CALENDAR_R51_COLLECT_RESULT_20261029T132607466Z_15144.txt` reported `R51_BATCH_STORED`, `batchNumber=1`, `plannedInBatch=120`, `newPriceTickerCandidates=120`, `providerRequests=3`, `noBarTickerCount=0`, `batchReadbackVerified=true`, DB/D1 writes 0.
- Existing immutable plan SHA: `4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138`; 2,394 missing tickers in 20 batches.
- Last verified R51 core source: `70920bad758797d9487e1702cdb39e56f317f8ee`.
- Neither the PC's subsequent batches nor market capitalization/stars/UI/public runtime have been verified.

## Implementation

`scripts/pc-writer/market-calendar-r51-resume.mjs` wraps the **existing exported R51 `runPc('collect')`**, one batch at a time, with no concurrent requests. It pins the plan SHA and ticker count, requires the first batch and contiguous checkpoint filenames, rejects existing R51 lock, validates the existing collector's result and readback, and stops on any non-success status. A single user invocation performs up to 19 *individually bounded* batches with per-batch result files. A failure preserves raw pages and completed rows; it does not auto-retry, remove locks, replace sources, or advance a scheduler.

`MARKET_CALENDAR_R51_RESUME_REMAINING.cmd` runs the helper using only approved `E:\ZGmini\runtime\node.exe`; it logs a launch result and passes the package folder as output directory. The package includes the full static import closure, Korean run instructions, and SHA-256 manifest.

## User execution and STOP

1. Extract the ZIP **fully** into a *new empty folder* outside the operational checkout. No git checkout is needed.
2. Double-click `MARKET_CALENDAR_R51_RESUME_REMAINING.cmd` **exactly once**, without inputs. Wait; batch result files are written after each independently bounded collector invocation.
3. Expect `STATUS=R51_RESUME_COMPLETE`, `EXIT_CODE=0`, `LATEST_BATCH=20`. Send `MARKET_CALENDAR_R51_RESUME_LAUNCH_RESULT.txt` and `MARKET_CALENDAR_R51_RESUME_RESULT_*.txt`. Do not send credentials or raw prices.
4. If there is a STOP, do not retry blindly, remove a lock, terminate relevant processes, overwrite source trees or change the scheduler. Report the exact STOP and completed batch; inspect readback before another execution.

Never equate this package or fixture tests with the PC's full collection, market cap acquisition, public stars, D1, deployment or scheduled runtime success.
