# THEME-FEAR-GREED-R6 — execution plan and shadow start

Date: 2026-10-18 (KST). Repository: ansqhd5774-Choi/zgmini.

## Scope and authority
- Base: GitHub latest main at work start, 8d4359291d3970998b212862308c7579fbf0886d.
- Development branch: codex/theme-fear-greed-r6-shadow.
- R5 direction: adapt sector R3 five-axis calculation and combine 2–5 ETFs per theme.
- This branch is shadow-only. It does not modify existing sector R3, collectors, D1, API, scheduler, schema, Production, DNS, or publication logic.
- Do not merge or deploy until actual stored-data, PIT, licensing and runtime gates pass.

## Implementation order and evidence gates
1. Contract — keep 30 theme names; reuse scoreSectorFearGreedR3 without changing axis definitions. Preserve referenceObservations=756, separately from 252-point rolling normalization and 252-point published history.
2. ETF selection (pending) — obtain holdings, known-at timestamps, AUM, 30-day trading value, spread, overlap. Screen strategy changes and delistings. Treat R5 thresholds (65% theme purity, 80% overlap alert, monthly reconstitution, 10 holdings/90% priced coverage) as proposals until real data validation.
3. Stored-input shadow aggregation (implemented) — accept only 2–5 independently scored ETFs, locked rank, aligned 252-date five-axis history, explicit lineage and PIT/holdings markers. Weights 2: .60/.40; 3: .50/.30/.20; 4: .45/.25/.20/.10; 5: .40/.25/.15/.12/.08. Missing => NOT_READY; no zeros or weight redistribution.
4. Tests (fixture scope) — 10 unit tests: weights, example 66, 2/4/5 counts, invalid counts, axis missing/out of bounds, R3 normalization, PIT/lineage, date mismatch, duplicate tickers/rank, invalid calendar date.
5. PC diagnosis (pending) — inspect real saved ETF/stock OHLCV, holdings as-of/known-at and strategy records in E:\ZGmini\data\pc-writer\. No provider calls while computing. Chat session cannot access Windows E:; AUTOMATION_BLOCKED for this diagnostic only, not proof of writer failure.
6. 30-theme PIT shadow backtest (pending) — R3 five axes from genuinely eligible stock holdings then 252-date composite histories; market event directional validation.
7. Publishing (pending) — commercial reuse rights, explicit approval, Cloudflare Git integration deployment authority, D1 readback, PC/mobile UI.

## R6 stage 1 input/output contract
Each ETF needs ticker, locked rank, referenceObservations=756, normalization=R3_ROLLING_252; explicit upstream pitVerified/holdingsVerified/sourceVerified markers; sourceVersion/sourceStoredAt; 252 ordered dated five-axis scores. Markers are NOT in themselves proof of provenance.

buildThemeFearGreedR6Shadow returns SHADOW_ONLY or NOT_READY. SHADOW_ONLY means mathematically computed from supplied inputs, **not** verified live data, production readiness or permission to publish.

## Validation levels
- Source SHA verifies source identity only.
- Local fixture PASS is calculation logic evidence only.
- No assertion of live PC data readiness, all 30 themes readiness or production deployment.
- GitHub branch is development only, neither merged main nor production.
