# US Breadth R39 — portable, read-only approved Core source provenance

Branch: `codex/us-breadth-public-r1-20261031`. This is a PC **diagnostic**, not a Core source promotion, change of scheduled Task, or publication.

## Why this is needed

The R26 log proved that `E:\ZGmini\runtime\node.exe` v24.19.0 x64 runs, while the earlier `node` from PATH failed with a Windows 16-bit application error. R27 scanned E project names for R24 provider tooling; R28 inspected a candidate provider package. Neither diagnosed the **actually registered** `ZGMINI-PC-Local-Core` Task Action→VBS launcher→approved PC Core source. R23's read-only inspector sets `actionChainVerified:false` and, when run from a standalone ZIP, its relative Git root is the ZIP directory, not the scheduled Core source.

The authority remains GitHub `main` `AGENTS.md` §20-1 and `docs/PC_CORE_5MIN_CONFLICT_RUNBOOK.md`. **Do not treat historical E project paths as approved current source.**

## One-click Windows operator procedure

1. Extract the **entire** `US_BREADTH_R39_CORE_ACTION_READONLY.zip` into a writable folder (for example a new Downloads subfolder), keeping `US_BREADTH_R39_CORE_ACTION_READONLY.cmd` beside its `scripts\pc-writer\` subdirectory. Do not run the CMD from inside the ZIP.
2. Double-click the extracted `US_BREADTH_R39_CORE_ACTION_READONLY.cmd`. It invokes only `E:\ZGmini\runtime\node.exe`; it does not use the broken PATH `node`.
3. Upload `US_BREADTH_R39_CORE_ACTION_*.txt` from **the same extracted folder as the CMD** (`%~dp0`). The log contains `LOG_LOCATION=NEXT_TO_CMD` and the CMD displays the full TXT path before opening it in Notepad. There is no Downloads-root or `%TEMP%` fallback: if the folder is not writable, extract the ZIP into a writable folder and run the CMD there. No `E:` data or logs are created. The TXT contains only status fields; never upload `config.json`, Task XML, launcher source, D1 credentials or raw provider data.

The script calls **only** `schtasks.exe /Query /TN ZGMINI-PC-Local-Core /XML`, `git rev-parse HEAD`, `git --no-optional-locks status --porcelain`, and bounded local reads of config, explicit registered E launcher references, and latest IEX/early/cycle summaries. It does not call MarketParquet, Alpaca, D1, or public APIs. It does not create/modify a Task, source checkout, lock, PID, E log, database, or D1 row.

`APPROVED_SOURCE_STATIC_CHAIN` means registered Task contains one Exec, PT5M and IgnoreNew, a statically followed launcher references `local-cycle.mjs` in exactly one explicit E project, and its clean Git HEAD matches approved `config.source` with enabled PC target. It proves a **static reference only**, not that Core ran, emitted IEX observations, or published D1. Dynamic dispatcher, ambiguous project paths, missing wrapper, dirty Git, mismatch, missing config or absent Task are reported as non-approved review statuses. Nothing is auto-fixed.

## Natural 15-minute evidence is separate

This portable ZIP captures **one snapshot only**. The next gate requires at least **three consecutive naturally executed NY regular-session 15-minute IEX slots**, checking each for local `LOCAL_READY`/early `VERIFIED` or `ALREADY_VERIFIED`, same-slot D1 **read-only** readback and public API `slotEndUtc` progression. Use the already-approved PC source's R23 `--inspect --d1-readback` (if that script is deployed under the real approved source) or a separately reviewed read-only operator method. Capture three distinct timestamps; don't replay writers, re-register Tasks, delete `local-cycle.lock` or `quota-runner.lock`, kill PIDs or infer slot success from a PT5M trigger. `IgnoreNew` may skip cycles if a previous run takes too long.

The IEX provisional ~503-symbol observation phase remains separate from MarketParquet full-market R2 confirmed ~6500-symbol history; confirmed R1/250-day data is immutable. Public output is percentages only; missing IEX observations are **unobserved**, not flat, and R2 98%/directional-match gates do not apply to IEX.
