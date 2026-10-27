# Stage04 R52 — Communication Services two independent PC runs

Date: 2026-10-27. Branch: `codex/investment-15-stage-m2-r25-20261025`.

## Evidence

The user provided two separate sets of R50 Topic02 PC TXT/JSON/HISTORY results. This comparison uses the *measured PC results*, not cached publisher forecasts or imagined new numbers. The first measurement is preserved and the second is treated as a separate observation, not a historical overwrite.

| Metric | First R50 execution | Second R50 execution |
|---|---|---|
| Result at (UTC) | 05:33:50 | 05:43:09 |
| Warmup | 26,391 ms | 28,589 ms |
| Measured rounds | 8,640 / 8,170 / 8,018 ms | 9,640 / 9,152 / 8,882 ms |
| Median time | 8,170 ms | 9,152 ms |
| Maximum relative deviation | 5.8% | 5.3% |
| Stability | Speed and repeated status stable | Speed and repeated status stable |
| BRI network requests | 0 | 0 |
| New official links found beyond prior report seeds | 0 | 0 |
| R50 gate | PARTIAL_RESEARCH_REVIEW_REQUIRED | PARTIAL_RESEARCH_REVIEW_REQUIRED |

The second median is 982 ms slower (about +12.02%). This is a *measured variation*, not evidence of a long-term trend or regression; two timestamps are not sufficient for a trend claim. Repeatability within each run passed the pre-agreed 25% diagnostic threshold.

## Published publisher market figures observed by the PC

| Publisher | First PC | Second PC | Publisher forecast window | Market scope |
|---|---:|---:|---|---|
| TBRC | 5.3% | 5.3% | 2026–2030 | Telecom-only proxy |
| SkyQuest | NULL (`FORECAST_PERIOD_UNVERIFIED`) | **6.2%** (`PUBLISHER_PROXY_OBSERVED`) | 2026–2033 | Telecom-only proxy |
| Precedence | 6.03% | 6.03% | 2026–2035 | Telecom-only proxy |
| BRI | NULL / HTTP403 excluded | NULL / HTTP403 excluded | NULL | Excluded |

SkyQuest's transition from NULL to 6.2% occurred after the explicit report-period parsing fix; this is a **successful extraction correction**, not a publisher forecast revision. None of the three observed rates is an approved GICS Communication Services sector-wide market CAGR. Periods also differ. GICS-wide mean remains **NULL**, 0 eligible sources, not 0% CAGR.

## Quality observations

* All three Ollama selections reported `MODEL_SCOPE=DIRECT`, yet the deterministic boundary remained `TELECOM_SUBMARKET`; the second-run TXT now records `SCOPE_WARNING=MODEL_DIRECT_OVERRIDDEN_BY_DETERMINISTIC_MARKET_SCOPE`. Thus no submarket figure entered the GICS aggregate.
* Re-fetching pre-known official report pages succeeded; official catalog discovery returned no additional report URL. Google's browser-required results and Bing zero links mean *fresh discovery* was not demonstrated, even though publisher page values can be re-observed.
* Each uploaded history NDJSON contained a single line. The comparison is therefore based on the two independently supplied PC files; future cumulative `HISTORY.ndjson` needs CMD executions from the **same persistent extracted directory**, or manual merging of separately supplied snapshots. There is no background scheduler.
* No R50 rerun is warranted solely to verify SkyQuest again. Topic02 retains `PARTIAL_RESEARCH_REVIEW_REQUIRED` and awaits user authorization to proceed to topic03, **임의소비재(경기소비재)**.

No score/DB/formula/API/scheduler/deployment/trading changes, and no excluded-provider access.
