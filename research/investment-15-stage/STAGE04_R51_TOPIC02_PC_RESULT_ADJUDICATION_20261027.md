# Stage04 R51 — Topic02 PC observation review and parser follow-up

Date: 2026-10-27. Branch: `codex/investment-15-stage-m2-r25-20261025`.

## R50 independently supplied PC results

The user supplied the final `R50_TOPIC02_COMMUNICATION_RESULT.txt`, JSON and one-record history NDJSON. R50 ended with `FINISHED_RESEARCH_ONLY` and `PARTIAL_RESEARCH_REVIEW_REQUIRED`, **not** a full sector growth-rate result.

| Diagnostic | Observed |
|---|---|
| Warmup | 26,391 ms (excluded from median) |
| Measured rounds | 8,640 / 8,170 / 8,018 ms |
| Median / max deviation | 8,170 ms / 5.8% |
| Result signatures | Stable in three measured rounds |
| BRI HTTP403 excluded | Network requests 0 |
| Each active publisher | Official report seed re-fetched |
| Additional discovered official reports | 0 across active publishers |
| GICS Communication Services CAGR | **NULL**, 0 approved comparable sources |

## Publisher evidence, without invented values

| Publisher | PC R50 state | Publisher-market CAGR | Years | Sector-eligible? |
|---|---|---:|---|---|
| TBRC | `PUBLISHER_PROXY_OBSERVED` | 5.3% | 2026–2030 | No, telecom-only |
| BRI | `SOURCE_BLOCKED_EXCLUDED` | NULL | NULL | No, HTTP403 excluded |
| SkyQuest | `FORECAST_PERIOD_UNVERIFIED` | NULL in PC R50 | NULL in PC R50 | No, telecom-only |
| Precedence | `PUBLISHER_PROXY_OBSERVED` | 6.03% | 2026–2035 | No, telecom-only |

SkyQuest's [official public telecommunication-market page](https://www.skyquestt.com/report/telecommunication-market) separately publishes **6.2%, 2026–2033**. The R50 PC evidence contains the literal 6.2% but stopped with `FORECAST_PERIOD_UNVERIFIED`; this is an overly narrow parser outcome, **not evidence that the report omitted years**. Retain the R50 historical `NULL` as the actual PC verdict; do not retroactively claim this as a PC-validated value or a GICS total.

The R50 Ollama result marked the three telecom-only reports `DIRECT`. The deterministic market-scope check independently classified each as `TELECOM_SUBMARKET`, and thus correctly kept them out of the GICS Communication Services mean. The model's mistaken scope label should be visible in future TXT diagnostics, without throwing away publisher-market observations.

## Non-repeated correction for future executions

The same R50 topic02 tool is revised on this branch with two bounded changes:

1. Normalize HTML named dashes and Unicode dash variants when extracting the explicit `forecast period`. Consult clearly labelled forecast-period text on the same fetched report if the selected candidate excerpt is truncated; reject conflicting labels or unlabeled ambiguous periods.
2. Add `SCOPE_WARNING=MODEL_DIRECT_OVERRIDDEN_BY_DETERMINISTIC_MARKET_SCOPE` when Ollama labels a submarket `DIRECT`. Market eligibility and established R50 GICS `NULL` logic remain unchanged.

This corrective code passed local regression tests; it has **not** been re-executed against the user's PC. No repeated R50 full 4-pass CMD is required merely to confirm the existing missing GICS sector rate. The PC log and history are preserved unmodified.

## Sequential gate

Topic01: `PARTIAL_USER_APPROVED_NULL` — preserved.

Topic02: `PARTIAL_RESEARCH_REVIEW_REQUIRED` — no GICS-wide publisher report validated; the publisher-specific telecom figures are retained as reference-only proxies. Next topic in the original matrix is **03 임의소비재(경기소비재)**, for separate research after proceeding authorization. No unattended task, live site, formula, DB, API, payment, new BRI access, or score changes.
