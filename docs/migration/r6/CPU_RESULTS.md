# R6 CPU measurement

Official wrangler tail cpuTime/wallTime; sanitized fields only; no cookies or auth used. Sampling0.999999,350ms pacing; resume missing CPU coverage until31 measured samples/route (max85 extra requests). First observation per run not proven cold. CPU integer milliseconds; no per-request subrequest field. Unobserved CPU excluded, not imputed0.

Worker version b22b191f-85fa-4f96-9297-088627266138 unchanged. CPU/wall unit ms. Nearest-rank quantiles use only captured official CPU events. Missing CPU samples are not0. Parse errors: 0.

| Route | Requests / CPU samples | HTTP | P50 | P90 | P95 | P99 | Max | Wall P50 / P95 | Bytes min-max | >10ms | Result |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| / | 49/31 | 200 | 22 | 35 | 89 | 94 | 94 | 23/115 | 85574-85610 | 31 | FAIL |
| /api/market-score | 71/31 | 503 | 0 | 0 | 0 | 0 | 0 | 0/0 | 56-56 | 0 | PASS |
| /inflation/ | 68/31 | 200 | 9 | 16 | 24 | 24 | 24 | 9/27 | 32809-32827 | 7 | FAIL |
| /recession/ | 71/31 | 200 | 7 | 11 | 16 | 18 | 18 | 8/18 | 25739-25757 | 6 | FAIL |
| /liquidity-crisis/ | 68/31 | 200 | 7 | 14 | 18 | 38 | 38 | 8/40 | 31294-31312 | 9 | FAIL |
| /credit-risk/ | 70/31 | 200 | 8 | 13 | 14 | 16 | 16 | 9/17 | 27335-27353 | 8 | FAIL |
| /earnings-recession/ | 70/31 | 200 | 6 | 15 | 33 | 44 | 44 | 7/35 | 23790-23808 | 4 | FAIL |
| /asset-bubble/ | 69/31 | 200 | 7 | 14 | 15 | 22 | 22 | 7/16 | 25152-25170 | 5 | FAIL |
| /debt-risk/ | 70/31 | 200 | 7 | 10 | 12 | 12 | 12 | 7/14 | 23596-23614 | 3 | FAIL |
| /supply-shock/ | 71/31 | 200 | 7 | 13 | 15 | 16 | 16 | 8/18 | 24506-24524 | 6 | FAIL |
| /api/inflation-detail | 71/31 | 503 | 0 | 0 | 0 | 0 | 0 | 0/1 | 56-56 | 0 | PASS |
| /api/session | 72/31 | 200 | 1 | 2 | 2 | 13 | 13 | 1/2 | 13-13 | 1 | NOT_PROVEN_WARN_CAUSE |
| /flags/us.svg | 68/31 | 200 | 0 | 0 | 2 | 3 | 3 | 8/12 | 765-765 | 0 | PASS |

## Warm partition

- /: n=29, CPU P50/P95/P99=21/35/36; first-observed CPU=[94,89], cold state UNKNOWN.
- /api/market-score: n=30, CPU P50/P95/P99=0/0/0; first-observed CPU=[0], cold state UNKNOWN.
- /inflation/: n=30, CPU P50/P95/P99=9/24/24; first-observed CPU=[14], cold state UNKNOWN.
- /recession/: n=31, CPU P50/P95/P99=7/16/18; first-observed CPU=[], cold state UNKNOWN.
- /liquidity-crisis/: n=30, CPU P50/P95/P99=7/18/38; first-observed CPU=[7], cold state UNKNOWN.
- /credit-risk/: n=31, CPU P50/P95/P99=8/14/16; first-observed CPU=[], cold state UNKNOWN.
- /earnings-recession/: n=31, CPU P50/P95/P99=6/33/44; first-observed CPU=[], cold state UNKNOWN.
- /asset-bubble/: n=30, CPU P50/P95/P99=7/15/22; first-observed CPU=[10], cold state UNKNOWN.
- /debt-risk/: n=31, CPU P50/P95/P99=7/12/12; first-observed CPU=[], cold state UNKNOWN.
- /supply-shock/: n=31, CPU P50/P95/P99=7/15/16; first-observed CPU=[], cold state UNKNOWN.
- /api/inflation-detail: n=30, CPU P50/P95/P99=0/0/0; first-observed CPU=[0], cold state UNKNOWN.
- /api/session: n=30, CPU P50/P95/P99=1/2/13; first-observed CPU=[1], cold state UNKNOWN.
- /flags/us.svg: n=30, CPU P50/P95/P99=0/2/3; first-observed CPU=[0], cold state UNKNOWN.

## Outliers

| Route | CPU ms | timestamp UTC | phase | bytes | SSR path |
|---|---:|---|---|---:|---|
| / | 94 | 2026-10-02T11:52:26.226Z | first-observed-cold-state-unknown | 85574 | YES |
| / | 31 | 2026-10-02T11:52:26.828Z | sequential-warm | 85574 | YES |
| / | 28 | 2026-10-02T11:52:27.318Z | sequential-warm | 85574 | YES |
| / | 17 | 2026-10-02T11:52:27.812Z | sequential-warm | 85574 | YES |
| / | 25 | 2026-10-02T11:52:28.290Z | sequential-warm | 85574 | YES |
| / | 25 | 2026-10-02T11:52:28.766Z | sequential-warm | 85574 | YES |
| / | 36 | 2026-10-02T11:52:29.256Z | sequential-warm | 85574 | YES |
| / | 19 | 2026-10-02T11:52:29.751Z | sequential-warm | 85574 | YES |
| / | 35 | 2026-10-02T11:52:30.226Z | sequential-warm | 85574 | YES |
| / | 18 | 2026-10-02T11:52:30.716Z | sequential-warm | 85574 | YES |
| / | 25 | 2026-10-02T11:52:31.195Z | sequential-warm | 85576 | YES |
| / | 19 | 2026-10-02T11:52:32.159Z | sequential-warm | 85576 | YES |
| / | 23 | 2026-10-02T11:52:33.107Z | sequential-warm | 85576 | YES |
| / | 30 | 2026-10-02T11:52:34.060Z | sequential-warm | 85576 | YES |
| / | 19 | 2026-10-02T11:52:35.015Z | sequential-warm | 85576 | YES |
| / | 13 | 2026-10-02T11:52:37.422Z | sequential-warm | 85576 | YES |
| / | 14 | 2026-10-02T11:52:38.378Z | sequential-warm | 85576 | YES |
| / | 16 | 2026-10-02T11:52:39.343Z | sequential-warm | 85576 | YES |
| / | 13 | 2026-10-02T11:52:40.286Z | sequential-warm | 85576 | YES |
| /inflation/ | 14 | 2026-10-02T11:52:55.282Z | first-observed-cold-state-unknown | 32809 | YES |
| /inflation/ | 24 | 2026-10-02T11:52:59.442Z | sequential-warm | 32809 | YES |
| /inflation/ | 20 | 2026-10-02T11:53:00.391Z | sequential-warm | 32810 | YES |
| /inflation/ | 11 | 2026-10-02T11:53:02.275Z | sequential-warm | 32810 | YES |
| /inflation/ | 13 | 2026-10-02T11:53:05.041Z | sequential-warm | 32810 | YES |
| /recession/ | 11 | 2026-10-02T11:53:12.088Z | sequential-warm | 25739 | YES |
| /recession/ | 16 | 2026-10-02T11:53:17.192Z | sequential-warm | 25740 | YES |
| /recession/ | 14 | 2026-10-02T11:53:20.430Z | sequential-warm | 25740 | YES |
| /liquidity-crisis/ | 14 | 2026-10-02T11:53:26.415Z | sequential-warm | 31294 | YES |
| /liquidity-crisis/ | 18 | 2026-10-02T11:53:29.198Z | sequential-warm | 31295 | YES |
| /liquidity-crisis/ | 38 | 2026-10-02T11:53:31.966Z | sequential-warm | 31295 | YES |
| /liquidity-crisis/ | 12 | 2026-10-02T11:53:36.136Z | sequential-warm | 31295 | YES |
| /credit-risk/ | 13 | 2026-10-02T11:53:40.294Z | sequential-warm | 27335 | YES |
| /credit-risk/ | 11 | 2026-10-02T11:53:43.067Z | sequential-warm | 27336 | YES |
| /credit-risk/ | 12 | 2026-10-02T11:53:46.287Z | sequential-warm | 27336 | YES |
| /earnings-recession/ | 17 | 2026-10-02T11:53:56.997Z | sequential-warm | 23790 | YES |
| /asset-bubble/ | 14 | 2026-10-02T11:54:12.184Z | sequential-warm | 25153 | YES |
| /asset-bubble/ | 14 | 2026-10-02T11:54:14.067Z | sequential-warm | 25153 | YES |
| /debt-risk/ | 12 | 2026-10-02T11:54:31.190Z | sequential-warm | 23597 | YES |
| /supply-shock/ | 15 | 2026-10-02T11:54:38.158Z | sequential-warm | 24506 | YES |
| /supply-shock/ | 12 | 2026-10-02T11:54:41.373Z | sequential-warm | 24507 | YES |
| /supply-shock/ | 13 | 2026-10-02T11:54:45.101Z | sequential-warm | 24507 | YES |
| /supply-shock/ | 12 | 2026-10-02T11:54:48.357Z | sequential-warm | 24507 | YES |
| / | 89 | 2026-10-02T11:57:03.462Z | first-observed-cold-state-unknown | 85608 | YES |
| / | 22 | 2026-10-02T11:57:04.197Z | sequential-warm | 85608 | YES |
| / | 21 | 2026-10-02T11:57:04.640Z | sequential-warm | 85608 | YES |
| / | 21 | 2026-10-02T11:57:05.084Z | sequential-warm | 85608 | YES |
| / | 27 | 2026-10-02T11:57:05.525Z | sequential-warm | 85608 | YES |
| / | 17 | 2026-10-02T11:57:05.984Z | sequential-warm | 85608 | YES |
| / | 30 | 2026-10-02T11:57:06.426Z | sequential-warm | 85608 | YES |
| / | 26 | 2026-10-02T11:57:06.883Z | sequential-warm | 85608 | YES |
| / | 32 | 2026-10-02T11:57:07.342Z | sequential-warm | 85608 | YES |
| / | 18 | 2026-10-02T11:57:07.802Z | sequential-warm | 85608 | YES |
| / | 20 | 2026-10-02T11:57:08.249Z | sequential-warm | 85610 | YES |
| / | 16 | 2026-10-02T11:57:11.371Z | sequential-warm | 85610 | YES |
| /inflation/ | 24 | 2026-10-02T11:57:31.992Z | sequential-warm | 32826 | YES |
| /inflation/ | 16 | 2026-10-02T11:57:44.104Z | sequential-warm | 32827 | YES |
| /recession/ | 11 | 2026-10-02T11:57:55.278Z | sequential-warm | 25757 | YES |
| /recession/ | 11 | 2026-10-02T11:57:56.146Z | sequential-warm | 25757 | YES |
| /recession/ | 18 | 2026-10-02T11:57:57.004Z | sequential-warm | 25757 | YES |
| /liquidity-crisis/ | 14 | 2026-10-02T11:58:02.193Z | sequential-warm | 31311 | YES |
| /liquidity-crisis/ | 13 | 2026-10-02T11:58:04.336Z | sequential-warm | 31311 | YES |
| /liquidity-crisis/ | 11 | 2026-10-02T11:58:10.034Z | sequential-warm | 31312 | YES |
| /liquidity-crisis/ | 11 | 2026-10-02T11:58:11.324Z | sequential-warm | 31312 | YES |
| /liquidity-crisis/ | 12 | 2026-10-02T11:58:15.232Z | sequential-warm | 31312 | YES |
| /credit-risk/ | 12 | 2026-10-02T11:58:19.113Z | sequential-warm | 27352 | YES |
| /credit-risk/ | 11 | 2026-10-02T11:58:23.002Z | sequential-warm | 27353 | YES |
| /credit-risk/ | 16 | 2026-10-02T11:58:26.029Z | sequential-warm | 27353 | YES |
| /credit-risk/ | 14 | 2026-10-02T11:58:29.008Z | sequential-warm | 27353 | YES |
| /credit-risk/ | 14 | 2026-10-02T11:58:34.196Z | sequential-warm | 27353 | YES |
| /earnings-recession/ | 15 | 2026-10-02T11:58:44.097Z | sequential-warm | 23808 | YES |
| /earnings-recession/ | 33 | 2026-10-02T11:58:47.130Z | sequential-warm | 23808 | YES |
| /earnings-recession/ | 44 | 2026-10-02T11:58:50.175Z | sequential-warm | 23808 | YES |
| /asset-bubble/ | 22 | 2026-10-02T11:58:57.024Z | sequential-warm | 25170 | YES |
| /asset-bubble/ | 11 | 2026-10-02T11:59:02.200Z | sequential-warm | 25170 | YES |
| /asset-bubble/ | 15 | 2026-10-02T11:59:07.385Z | sequential-warm | 25170 | YES |
| /debt-risk/ | 12 | 2026-10-02T11:59:12.988Z | sequential-warm | 23614 | YES |
| /debt-risk/ | 11 | 2026-10-02T11:59:21.119Z | sequential-warm | 23614 | YES |
| /supply-shock/ | 13 | 2026-10-02T11:59:33.989Z | sequential-warm | 24524 | YES |
| /supply-shock/ | 16 | 2026-10-02T11:59:36.993Z | sequential-warm | 24524 | YES |
| /api/session | 13 | 2026-10-02T12:00:11.098Z | sequential-warm | 13 | NO |

## Limits

Per-request subrequest count absent from official live-tail payload: UNKNOWN for every row. CF-cache-status not supplied on these responses: UNKNOWN, not MISS. Runtime errors among captured invocations=0; all measured HTTP responses as above, no1102 response observed. CPU0 is platform integer precision, not proof of zero execution. Missing tail events and >=31 captured samples remain disclosed.

Aggregate FREE_PLAN_STATUS: FAIL. P99<=10 required for PASS; repeated exceedances or P95>10 yieldFAIL. WARN requires cold/bootstrap cause proof, which is unavailable here.
