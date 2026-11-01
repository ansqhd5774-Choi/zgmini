# 바이오 R7 Windows 작업 스케줄러 cscript 복구

- Screenshot evidence 2026-10-24: `cscript.exe` failed to start (`0xc0000142`) when launching `BIOTECH_R7_SETUP.cmd`.
- Failure classification: **PC installation stage**, not evidence of failure in any of the seven existing themes.
- Last completed stage is **unknown until `BIOTECH_R7_SETUP_LOG.txt` is read**. In particular, a pending R2 D1 write, cloud deployment, or task registration is not implied by the screenshot.
- Remediation: `BIOTECH_R7_TASK_MIRROR_NODE.mjs` replaces only the two cscript invocations in the Desktop `BIOTECH_R7_SETUP.cmd`. The 13 approved R7 operation-source files, score formula, persisted raw data, D1 keys, and original published scores remain byte-identical.
- It queries `\\ZGMINI-PC-GetMarketHistory-ETF` using Windows `schtasks /query /xml`; preserves XML triggers, principal and settings; replaces only the cloned action and registers **new** `\\ZGMINI-PC-Theme-Biotech` with `schtasks /create /xml` **without `/f`**.
- If a target task already exists, its action/triggers/security context are verified and it is not overwritten.
- Password-dependent principal, disabled source task, malformed XML, source drift, or inaccessible Task Scheduler are STOP conditions.
- `schtasks` invocation uses the approved PC Node runtime. No `cscript.exe`, PowerShell, WSL, service modification, seven-theme task edit, or provider change.
- The Desktop ZIP package includes the original SHA-verified R7 operational snapshot. Local tests exercise no-scheduler-write planning, action-only XML cloning, existing-task verification, forbidden principals, and drift rejection.

**User execution**: Extract `BIOTECH_R7_NODE_RECOVERY_DESKTOP.zip` to a new Desktop folder; run `BIOTECH_R7_SETUP.cmd` once; attach the resulting `BIOTECH_R7_SETUP_LOG.txt` from that folder. Do not manually re-run on `D1_READBACK_VERIFIED_PUBLIC_READER_PENDING` or unknown submission status until stored state has been checked.

**Completion conditions**: screenshot does not verify Windows execution. Need PC log, D1 R2 readback, current public API evidence, and the first regular scheduled run. Existing seven must remain unchanged. Provisional biotech requires separate verified current prices.
