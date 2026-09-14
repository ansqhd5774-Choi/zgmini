# P0-5C — Official FRED API secondary preparation

No production request, deployment or public fallback activation in this stage.

## Transport

`/api/internal/p0-fred-api-shadow-check` uses existing `FRED_API_KEY` binding and the unchanged `inspectRuntime` production detector. Missing key returns `BLOCKED_BY_FRED_API_KEY`, with zero requests. Key existence does not establish API acceptance.

Only four fixed observations requests are possible: CPIAUCNS, PPIFIS, UNRATE, PAYEMS. Endpoint: `https://api.stlouisfed.org/fred/series/observations`. JSON, ascending order, `units=lin`, current month minus 18 months through collection day, limit 100, no pagination or retries. Timeout covers headers and bounded body reading (8 seconds, 256 KiB). Redirects are not followed. URL and upstream error text never enter response or application logs.

Existing `worker/data-health.mjs` also uses FRED_API_KEY but couples observations to a metadata request and an 18-second timeout. It is left unchanged; reusing that request flow would violate the four-request limit. The new transport reuses the existing number parser and complete shadow semantic normalizer, including Payroll adapter, without changing formulas.

Authority remains BLS, transportProvider FRED, transportMode FRED_API_V1. The older route remains FRED graph CSV; its implementation is untouched and never used as a retry.

Official specification: https://fred.stlouisfed.org/docs/api/fred/series_observations.html

## Quality and freshness

- Monthly dates, finite raw values, duplicates, gaps, history and YoY denominator checks fail closed. A dot is missing, not zero; any missing observation blocks this diagnostic instead of silently returning an earlier latest value.
- Observed dates are API observation dates. Realtime dates are separately whitelisted; fetchedAt is collection time.
- Recent four observations are returned, not full history.
- The existing shadow lag gate is retained. It alone does not prove that the newest release is present. `providerUpdatedDataIsCurrent` stays `unknown` until an independent latest-release comparison in the runtime review. Thus semantics success returns `FRED_API_SEMANTICS_PASS_FRESHNESS_UNVERIFIED`, never SECONDARY_READY automatically.
- PPI remains SEMANTIC_AND_VALUE_EQUIVALENT / VINTAGE_SENSITIVE. No new cross-source equality claim.

## Version 88 evidence (not runtime substitute data)

| Graph CSV series | Existing result |
| --- | --- |
| CPIAUCNS | HTTP 520 |
| PPIFIS | HTTP 520 |
| UNRATE | MONTH_GAP; exact gap location unavailable |
| PAYEMS | July 2026 158858; June 158881; May 158861 |

PAYEMS constants are comparison evidence only, never semantic input. An API observation later than July signals GRAPH_CSV_STALE / missingLatestObservation. Changes at shared months are separately valueDifference, possibly revisions. Continuous API UNRATE data flags the prior CSV integrity result without asserting its unrecorded gap location or modifying continuity rules.

## Runtime plan

Deploy only in a separately authorized stage, then call the new route once. Maximum FRED requests 4, BLS 0, graph CSV 0, market-data 0. Summary cache 15 minutes, concurrent coalescing, expiration 2026-09-19T23:59:59Z. Public fallback stays OFF even after a diagnostic pass.
