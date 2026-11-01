# E1-R5 Forward R2 — APPROVED SHADOW METHODOLOGY

Status: **APPROVED_SHADOW_ONLY**  
Production activation: **NO**  
Production baseline: **E1-R4 remains active**

## Purpose

Replace the blocked analyst-consensus-only S12 input with free official forward-looking inputs without changing the E1-R5 top-level future-outlook weight of 10%.

The approved future-outlook block is:

- S12A Management EPS Guidance Revision Magnitude: 4%
- S12B CFO Forward Revenue Outlook Revision: 3%
- S13 Management Guidance Breadth: 3%

S12 remains a 7% top-level component:

`S12 = (4*S12A + 3*S12B) / 7`

Future block remains:

`D = (7*S12 + 3*S13) / 10`

Missing components are **not reweighted**. Required missing input => the affected composite is null.

## S12A — Management EPS Guidance Revision Magnitude

Primary source: SEC EDGAR 8-K Item 2.02 / earnings-release exhibits, including Exhibit 99.1 where applicable.

For a guidance range `[L,U]`:

`M = (L + U) / 2`

For the same issuer, target fiscal period, metric, accounting basis, and unit:

`R_i = 2 * (M_new - M_old) / (|M_new| + |M_old|)`

If both midpoints are zero, the symmetric change is zero.

Cross-sectional raw value:

`X12A = Median_i(R_i)`

Scoring direction: positive. Historical-percentile normalization is applied by the E1 scoring layer after sufficient PIT history is available.

### Null rules

Treat as missing rather than neutral or negative when:

- no prior comparable guidance exists;
- target fiscal period changes;
- metric changes;
- GAAP/adjusted basis changes;
- unit changes;
- guidance is withdrawn;
- a valid low/high midpoint cannot be formed;
- PIT availability cannot be established.

Guidance withdrawal is **not** automatically coded as a downgrade.

## S12B — CFO Forward Revenue Outlook Revision

Primary source: The CFO Survey (Federal Reserve Bank of Richmond / Federal Reserve Bank of Atlanta / Duke University).

Create a simple rolling-forward revenue-growth expectation from current-year and next-year expectations.

Quarter weights:

- Q1: 75% current year + 25% next year
- Q2: 50% current year + 50% next year
- Q3: 25% current year + 75% next year
- Q4: 0% current year + 100% next year

`F_t = w_current * E(CurrentYear) + w_next * E(NextYear)`

Raw revision:

`X12B = F_t - F_(t-1)`

Scoring direction: positive. This is a candidate rolling-horizon approximation and must pass shadow validation before any production activation.

### Revision/PIT policy

The CFO Survey periodically revises historical data. Preserve:

- survey quarter;
- source release timestamp;
- target year;
- published revenue expectation;
- source file hash;
- revision/version identifier;
- local stored timestamp.

Do not overwrite historical PIT observations with later revised values for PIT backtests.

## S13 — Management Guidance Breadth

Keep the approved breadth definition:

`G_t = (N_up - N_down) / (N_up + N_same + N_down)`

No-guidance issuers are missing and are not counted as `same`.

S12A measures **magnitude**; S13 measures **breadth**. They are intentionally separate.

## AxionQuant / analyst EPS revision

Analyst Forward EPS Revision remains an **optional future enhancement**, not a current production requirement.

Provider clarification received in October 2026 establishes the current decision:

- Free-plan commercial use of a **derived indicator** is permitted as long as raw API data is not redistributed.
- Earnings Trend coverage is **not available on the Free plan**; it requires the paid Starter plan.
- `epsTrend.30daysAgo` is a lagged historical EPS-trend value, but it does **not guarantee a separately reconstructed point-in-time consensus snapshot for one specific fiscal target period**.
- There is currently **no supported batch endpoint** for Earnings Trend across multiple tickers.

Therefore AxionQuant is **not a current S12 production/shadow dependency** under the approved free-source and strict target-period PIT requirements. Keep it on HOLD as a possible later enhancement only if pricing, target-period PIT semantics, and incremental-information testing become acceptable.

If AxionQuant or another provider later passes all rights/coverage/PIT gates, add the analyst signal in Shadow first and test incremental information versus S12A/S12B/S13. Do not increase the total E1 weight above 100% and do not automatically add 7 percentage points.

## Required Shadow validation before production

1. SEC guidance extraction and comparable-pair coverage across the S&P 500 universe.
2. GAAP vs adjusted EPS and target-period matching accuracy.
3. S12A vs S13 Spearman correlation and incremental information.
4. S12B overlap with S1/S2/S6 and the Growth domain.
5. Lead relationship to next 1Q/2Q EPS growth, revenue growth, operating-margin direction, and EPS-improvement breadth.
6. PIT-only backtest using information available as of each historical evaluation timestamp.
7. No regression of E1-R4 production behavior until separate production approval.

## Implementation

Pure calculation helpers and the shadow contract live in:

`lib/market-score/earnings-e1-r5-forward-r2.mjs`

Regression tests live in:

`tests/market-score-earnings-e1-r5-forward-r2.test.mjs`
