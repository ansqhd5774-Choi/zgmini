# ZGMINI Theme Fear & Greed — R158 58th target Node test evidence

- Observed: 2026-11-14 KST.
- Owner: theme-fear-greed-integration, existing branch `codex/theme-fear-greed-integration-20261025`.
- Test source HEAD (before this evidence-only commit): `a183796dc59e1d13ec7d6fb7df4c840fb1d7a418`.
- Execution environment: isolated temporary Linux workspace with Node.js `v22.16.0`; no full repo clone or operating-PC execution.
- Retrieval: exact GitHub branch source/test/dependency reconstructed, with local `git hash-object` SHA-1 matching all three original Git blobs:
  - `lib/market-score/theme-etf-provisional-score.mjs` — `25f594c7fc5bfa93b175184d041c4d84a61cc7b3`
  - `lib/market-score/theme-etf-provisional.mjs` — `7bd56fb5cef795ff2af72231b0db7859eca90593`
  - `tests/theme-etf-provisional-score-r158.test.mjs` — `b7bf3f1aec932b41298c32c928f654c52665dfc0`
- Executed command: `node --test tests/theme-etf-provisional-score-r158.test.mjs`.
- Result: TAP v13, `tests 5, pass 5, fail 0, duration_ms 3123.752416`, exit code 0.
- Passed:
  1. Unchanged T40/R20/V40 and two-day private candidate.
  2. Single newer session and no synthetic second date.
  3. Missing ETF/SPY, duplicate session dates, zero price, baseline drift rejected.
  4. Early 701-session SPY null and ROBO NaN rejected with `THEME_R158_PRICE_INVALID_*`.
  5. 2023-02-30 history and 2025-02-30 new session rejected with `THEME_R158_PRICE_DATES_*` / `THEME_R158_NEW_PRICE_DATE_OR_COVERAGE`.
- No R158 source change required. This is the complete **targeted test** only, not full repository CI, Windows PC runtime, D1 readback, or public API recovery.
- LAST PASS: targeted R158 Node test 5/5; exact three remote Git blobs 3/3.
- FIRST FAIL (operational, carried forward): `AUTOMATION_BLOCKED(NO_APPROVED_THEME_SEVEN_KEY_READBACK_EXECUTION_CONFIRMED)` for the seven D1-key readback. Existing market ER1 Writer 25-file B manifests exclude PR #1065 runtime files; no implied authority for other paths.
- Remaining independent gaps: R181 collection STOP with HTTP/LAST_PASS/FIRST_FAIL unknown, R179 and R183 separate failures; 14 ETF/SPY ×701 actual stored-price completeness unverified; 7 D1 keys and R178 checkpoint unverified, provider-derived publication rights not established, last public API audit 503/STORED_DATA_STALE/themes=[].
- Technical progress: T1 20% → 20%; last public recovery: 0/10. Neither number is advanced by a local test.
- Zero operating side effects: no provider requests, no PC Runner/Controller/Writer invocation or installation, no SQL/D1 writes, no scheduled-task/DNS/Cloudflare changes.
- Next single independent functional action: investigate R181 existing collection failure evidence to identify the first failing stage/HTTP status without replaying a PC job, while market ER1 separately owns the read-only Writer scope decision under #835.
- Instruction: [central 58th #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864999213). Prior [55th theme evidence #1009](https://github.com/ansqhd5774-Choi/zgmini/issues/1009#issuecomment-6864559104).
