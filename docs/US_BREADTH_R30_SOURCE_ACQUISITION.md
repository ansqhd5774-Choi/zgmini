# US Breadth R30 — MarketParquet full-stock R2 source acquisition

## Evidence and decision (2026-11-01)

The approved Windows R29 authenticated `stock_daily` manifest probe returned:

- Requested: 251 adjacent MarketParquet sessions, `2025-10-31`–`2026-10-30`.
- Accessible: 250 sessions, `2025-11-03`–`2026-10-30`.
- Missing entire daily file: `2025-10-31`.
- One manifest GET; no stock downloads, local or remote writes.

The missing **entire day** must not be fabricated as unchanged. The user's
permission to classify an individual stock with an unavailable previous price
as unchanged applies only **inside a real, available stock_daily date**.
250 consecutive daily files yield at most 249 day-over-day comparisons; the
required R2 250-point preview needs 251 adjacent files.

After the 2026-11-02 NY session finishes **and** the provider actually lists its
stock_daily file, the rolling sequence `2025-11-03`–`2026-11-02` *may* contain
251 accessible dates. This is a future check, not a guaranteed provider result.
Do not buy data, alter calendars or publish incomplete data to bypass this gate.

## Isolated source and security contract

R30 is separate from the legacy confirmed R1 universe, key, API and 250-session
history. Only the following additive directory is eligible for R30 stock files:

`E:\ZGmini\data\us-breadth-confirmed-r2\marketparquet-stock-daily\`

Each date uses `stock_daily_YYYY-MM-DD.parquet` and a same-stem `.audit.json`
recording an actual SHA-256 digest, source, collection time, and completeness.
The audit is local evidence only: **MarketParquet manifest currently provides
sizes and download URLs, not a provider-supplied SHA**. R24 must independently
fetch provider bytes and compare them with every local audit before considering
an R21 manifest candidate.

Safety rules:

1. `--plan-only`: read-only one authenticated manifest GET. No source downloads,
   E: data writes, Core Task mutations, D1 writes or publications.
2. `--download-staging`: explicit operator action. The **entire exact** 251-day
   manifest must validate before any data creation. A partial/out-of-range
   manifest fails closed, including when the first available date is one later.
3. Accept only tightly validated provider-signed HTTPS object URLs; never log
   signed URLs, bearer tokens or raw prices. Reject redirected and oversized
   downloads, incorrect dates, sizes and Parquet magic.
4. Write only new R2 files and audits. Validate existing files for resumability;
   refuse to overwrite conflicting contents. Do not install or change the
   approved Windows `ZGMINI-PC-Local-Core` Action, launcher, source config,
   scheduler, locks, existing R1 source or R1 historical rows.
5. **Logs belong in `%USERPROFILE%\Downloads`**, falling back to `%TEMP%`.
   E: is intentional storage for approved *new stock_daily raw data only*, not
   a diagnostic-log destination. Use `E:\ZGmini\runtime\node.exe` v24.19.0,
   bypassing the known broken `C:\nvm4w\nodejs\node.exe` shim.

An interrupted collection may leave a partial **new R2-only** directory; this
does not constitute a verified or publishable year. Do not delete or clean any
other production directory to recover. Subsequent collection must recheck
existing sources and fail on mismatches.

## Operator sequence

1. Extract the R30 ZIP to a regular user folder such as Downloads (not an
   active Core source); retain the same relative `scripts/` and `lib/` layout.
2. Run `US_BREADTH_R30_PLAN.cmd`, then attach the produced TXT from Downloads.
   If status is `PROVIDER_YEAR_PARTIAL`, stop. R30 is **not yet approved for stock downloads**.
3. Once `READY_TO_STAGE` lists all 251 adjacent dates, and the operator
   explicitly chooses to acquire raw data, run
   `US_BREADTH_R30_COLLECT.cmd`. This can download up to 251 full-stock files
   over the internet and write the new R2 E: source directory. Upload its TXT.
4. Run the R22 read-only inventory against exactly 251 new source days. The
   required state is `localComplete=true`, with all audit SHA matches and no
   ambiguous duplicates. This is **not** provider authentication.
5. Run R24 `--verify-provider`: a second authenticated manifest and independent
   byte-by-byte provider download of the 251 daily files. Then run R25
   `--preview-only` to check 250 real comparison points.
6. Review results and separately approve any R2 candidate publication. Existing
   R1/D1 and live Core remain unchanged until a separate production decision.

The Alpaca IEX approximately 503-stock **provisional** series retains its
15-minute display contract, distinct source, labels and validation gates.
There is no provisional 98% coverage or direction-matching obligation. The
MarketParquet full-stock R2 confirmed candidate is not a 503-stock product.

