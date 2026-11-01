# US Breadth R31 — collect the available 250 full-stock days first

## Decision

The R29/R30 PC manifest actually returned 250 authenticated-accessible
`stock_daily` session filenames from 2025-11-03 through 2026-10-30. The only
unavailable older date was 2025-10-31. The old R30 program unnecessarily
prohibited collecting all 250 real available files.

R31 removes that collection blocker. It does **not** invent the missing daily
file, classify an entire missing session as flat, modify the old 250-session
history, or replace the confirmed R1 public key. A missing individual stock's
previous price *within a real observed date* retains the approved unchanged
imputation and separate accounting.

## R31 source collection

`US_BREADTH_R31_COLLECT_250.cmd` uses the existing authenticated MarketParquet
manifest and the same isolated R2 staging directory:

`E:\ZGmini\data\us-breadth-confirmed-r2\marketparquet-stock-daily\`

- It permits the already-observed **one missing oldest baseline day** so that
  all 250 consecutive available source days can be downloaded now.
- It still rejects a missing date **inside** the available consecutive range,
  malformed manifest entries, unsigned/untrusted URLs, redirects, invalid bytes,
  conflicting old files, junction escapes, and unsafe writes.
- When 251 days later become available, the same program may stage all 251;
  251 is *not* a prerequisite for acquiring 250.
- Network download and new E: R2 raw-source writes are intentional **only** in
  the operator-invoked collection CMD. Existing Core task/source and D1 writes
  remain prohibited. Re-runs reuse SHA-audited files without overwriting them.

The collection TXT is saved in `%USERPROFILE%\Downloads` (or `%TEMP%` fallback),
never E:. The launcher calls approved `E:\ZGmini\runtime\node.exe` directly.

## R31 independent verification and preview

After successful collection, the separate
`US_BREADTH_R31_PREVIEW_249.cmd` is read-only locally and reuses the R22→R24→R25
verification pipeline:

1. R22 audits the latest 250 **actual** adjacent source dates with sidecar
   SHA-256 metadata and rejects multiple copies or root escape.
2. R24 independently obtains the official provider manifest and compares 250
   signed provider downloads against local bytes. A local audit SHA by itself
   does not prove provider provenance.
3. R25 generates 249 *real day-over-day comparisons* in memory. The earliest
   first day's movement cannot be computed without the previous real daily
   file; it is not set to unchanged.

The preview never publishes or changes the legacy R1 history. Once the chart
and full-stock breadth composition are inspected, any R2 publication is a
separate gated step. The Alpaca IEX ~503-stock 15-minute provisional series
remains separate, without the confirmed 98% or directional-match gate.

The user should run the collection launcher first and attach its Downloads TXT.
Do not automatically invoke the preview launcher on a failed/incomplete
collection. Neither launcher is installed into the approved Core task.
