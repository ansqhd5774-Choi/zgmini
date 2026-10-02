# R7 CPU evidence

Version 565d438c-8c40-40d7-9d87-ececab4e35d1; overall PASS.

| Route | n CPU | R6 P99 | R7 P50 | P90 | P95 | P99 | max | status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| / | 31 | 94 | 0 | 1 | 1 | 2 | 2 | PASS |
| /api/market-score | 31 | 0 | 0 | 0 | 0 | 0 | 0 | PASS |
| /inflation/ | 31 | 24 | 0 | 0 | 0 | 1 | 1 | PASS |
| /recession/ | 31 | 18 | 0 | 0 | 1 | 7 | 7 | PASS |
| /liquidity-crisis/ | 31 | 38 | 0 | 0 | 0 | 0 | 0 | PASS |
| /credit-risk/ | 31 | 16 | 0 | 0 | 0 | 0 | 0 | PASS |
| /earnings-recession/ | 31 | 44 | 0 | 0 | 0 | 0 | 0 | PASS |
| /asset-bubble/ | 31 | 22 | 0 | 0 | 1 | 7 | 7 | PASS |
| /debt-risk/ | 31 | 12 | 0 | 0 | 0 | 0 | 0 | PASS |
| /supply-shock/ | 31 | 16 | 0 | 0 | 1 | 1 | 1 | PASS |
| /api/inflation-detail | 31 | 0 | 0 | 0 | 0 | 4 | 4 | PASS |
| /api/session | 31 | 13 | 1 | 2 | 3 | 3 | 3 | PASS |
| /flags/us.svg | 31 | 3 | 0 | 0 | 0 | 3 | 3 | PASS |

CPU and wallTime are independent official trace fields. R6 workload, pacing, routes and sampling retained; extra inflation-detail API is retained for comparability. First-observed samples do not prove cold starts. Integer 0ms is rounded, not zero work. Subrequest counts unavailable. API503 indicates deliberately unbound D1, not data-path performance.

Outliers: 0; parser errors: 0.
