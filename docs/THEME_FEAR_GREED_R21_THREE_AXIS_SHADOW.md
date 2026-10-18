# Theme R21 — original R3 price-derived axes, research Shadow only
Date: 2026-10-19 KST. Zero approved formula/weight changes, zero Production writes.

## Actual PC R20 evidence (user-executed)
- All 39 candidate ETF prices stored, SPY 764 observations through 2026-10-16.
- Date-window availability to attempt **252** aligned research-only R3 trend/relative-strength/volatility scores: **30/39 ETFs**, two-or-more candidates for **12/30 themes**. Not actual three-axis values yet.
- Nine price-history epochs/blockers: POWR, WQTM, METV, COOL, LYTE, ARKX, JEDI, HUMN, HEAL. Most known launch/strategy epoch segments under 628 price bars.
- Actual five-axis scores 0/30, real 756-reference completeness not certified, historical PIT holdings unknown, publication not authorized.

## R21 standalone implementation
- User-run offline-only ZIP: `ZGMINI_THEME_R21_R3_PRICE_AXES_SHADOW_2026-10-19.zip`; SHA256 `462b9184709b8993d56ba36bea3d283ab224ed78d353b9498b07b846164cce77`.
- Main working file: `lib/market-score/theme-fear-greed-r21-three-axes-shadow.mjs`; Git SHA1 blob `f7b8ab5ff710c6a948d2f5608d124e8a7a3e36a8` (standalone ZIP only; **not yet part of repository**).
- Uses **exact approved R3 raw formulas and weighted rolling 252-percentile method** checked against existing R3 source blob `1142db953d512f04812712493bac0bd9921aaa4a`. Trend metrics m125/r60/r20 = .50/.30/.20; relativeStrength rs20/rs60/rs125 = .25/.45/.30; volatility rv20/dsv20/dd63 = .40/.35/.25, invert first two. Percentile includes latest and half of ties.
- Calls ONLY existing stored R9 price groups + R3 stored SPY (same guard as R20). Matches actual R20 date-window availability; mismatch raises ERROR, no partial success. Computes per-ETF 252 research-only histories and latest 3 axis values; **never computes theme ETF weights/composite or missing breadth/demand**.
- Security continuity, 756 reference full proof, PIT holdings, international stocks, commercial redistribution remain false. Full five-axis score = null; no production publication.
- Fixture tests: `49/49 PASS` full existing 38 R9/R10/R11/R12/R20 + 11 R21. ZIP re-extracted and independently run `49/49 PASS`. These are synthetic tests, **not PC runtime validation**.
- Safe CMD `ZGMINI_THEME_R21_R3_THREE_AXES_SHADOW.cmd`: run once only, read-only existing E: files, API calls 0, result TXT written beside CMD only; operator shares `ZGMINI_THEME_R21_RESULT.txt`. No DB/D1/cron/publish/Deploy/DNS.
- Explicit non-goals: R21 three price-axis values are NOT an adopted or approved alternative three-axis score. Full approved five-axis R3 formula unchanged; no implicit renormalization. Do not call a score READY based on partial numeric results.

NEXT: inspect real PC R21 result. Advance independent official historical daily ETF holdings and commercial rights discovery only where it can materially resolve the R3 breadth/demand prerequisites. Otherwise present separately versioned alternative proposal for explicit approval instead of consuming indefinite repeats.

Development context: branch `codex/theme-fg-r20-price-axis-input`, main base `e1dc4a584309b611539296f6f786d4436e29802b`. Only this document written by R21 on GitHub; source/ZIP remain local standalone and are not on Production.
