# P0-5B: BLS-authoritative, FRED-distributed shadow inputs

This module is not imported by `/api/market-data` and does not select or activate a fallback. BLS registered API remains the primary provider. No formula, public contract, UI, provider implementation, or runtime detector changes.

## Candidate metadata

| Metric | BLS source | FRED transport | Mapping | Raw unit / adjustment |
| --- | --- | --- | --- | --- |
| CPI | CUUR0000SA0 | CPIAUCNS | SEMANTIC_EQUIVALENT | 1982–84=100 / NSA |
| PPI | WPSFD4 | PPIFIS | SEMANTIC_AND_VALUE_EQUIVALENT; VINTAGE_SENSITIVE | Nov 2009=100 / SA |
| Unemployment | LNS14000000 | UNRATE | EXACT_SOURCE_MAPPING | Percent / SA |
| Payroll | CES0000000001 | PAYEMS | EXACT_SOURCE_MAPPING | Thousands of Persons / SA |

All are monthly. PPI's candidate qualification follows the P0-5B specification; this fixture-only change is not new proof of live BLS/FRED value equality. It deliberately does not claim an explicit FRED source-code mapping. PPI uses `revisionSensitive: true`, `vintagePolicy: LATEST_AVAILABLE`, not historical vintage reconstruction.

## Reuse and validation

- Uses existing `fetchFred`, `fredUrl`, bounded CSV parsing and timing instrumentation unchanged. Requests use native fetch with manual redirects, no retry, and at most 8 seconds each.
- Uses existing `payrollChanges` unchanged. Payroll formula inputs are two consecutive monthly differences from three raw levels.
- CPI/PPI use calendar year-ago matches. Fixture outputs are compared against the unchanged `makeYoyIndicator` implementation.
- Requires consecutive monthly observations, at least 14 for YoY, 3 for payroll, 2 for unemployment. Invalid dates, nonfinite values, conflicting duplicates and zero YoY denominators fail. Identical duplicates may deduplicate.
- The existing CSV parser reports conflicting CSV duplicates as `INVALID_RESPONSE`; the normalized-point validator reports `DUPLICATE_CONFLICT`. Neither accepts the conflict.
- Shadow-only conservative freshness limit: latest observation is at most 2 calendar months behind collection month. Future months fail. This is not a new public freshness policy or approval for fallback activation.
- Observed dates come from CSV and stay separate from collection time. No fixtures, web values, or clock dates are substituted into missing economic observations.

## Internal route

`GET /api/internal/p0-fred-bls-shadow-check`

Uses the existing `inspectRuntime` detector. LOCAL / TEST / UNKNOWN execute zero upstream requests. Only PRODUCTION_CONFIRMED may execute the four fixed FRED requests. Method/query restrictions and expiration `2026-09-19T23:59:59Z` are checked before execution or cache access.

15-minute summary cache and concurrent coalescing reuse the existing internal diagnostic pattern. `requestCount` counts new upstream work for the caller; cached/coalesced callers report zero. `probeRequestCount: 4` identifies the original execution. Compact responses contain normalized values, observation dates, provider metadata and timings, never CSV, headers, cookies, stack traces or secrets.

All four successful transports and semantic validations yield `FRED_BLS_SECONDARY_SHADOW_PASS`; otherwise `FRED_BLS_SECONDARY_SHADOW_PARTIAL`. A shadow PASS is not approval to activate public fallback.

## Verification boundary

P0-5B uses fixtures only. Production FRED calls: 0. BLS calls: 0. No Sites deploy.
Live monthly values and production execution remain pending P0-5B-RUNTIME.

Protection compared with parent `73739709d500d99efd41099f0bf9d6e10b2039c2`: 105 existing app/component/public/lib files plus selected protected configuration/runtime files checked byte-for-byte, no differences. Existing 6 full-suite environment/build failures remain separate from new shadow tests.
