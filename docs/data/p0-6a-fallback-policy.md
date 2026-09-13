# P0-6A: fallback eligibility preparation (OFF)

Initial base: `a832c18b8f3c5cf828c3f78c196aebf3fc68eacf`.
PPI confirmation base: `e14416e41fc7a5f588d8f809b28ebd59a1b2b246`.
No production wiring, network requests, provider modifications or public contract changes.
`evaluateFallbackEligibility` is an internal pure decision helper. It neither fetches
nor computes scores, YoY or payroll deltas. It is not imported by a route.

## Mapping evidence and limits

This table reuses repository metadata in `fred-bls-shadow.mjs`, `providers.mjs`,
`semantics.mjs` and `p0-5b-fred-bls-shadow.md`; no new official API requests were made.
YES means the existing project semantic mapping, not a new same-vintage equality claim.

| Metric / BLS → FRED | Economic meaning | Raw unit / kind | Frequency / adjustment | Formula input | Date convention / agency | semanticEquivalent |
| --- | --- | --- | --- | --- | --- | --- |
| CPI CUUR0000SA0 → CPIAUCNS | All urban consumers, all items CPI | Index 1982–84=100 / level | Monthly / NSA | Current and prior calendar YoY | BLS year+month / FRED observation month first day; BLS | YES |
| PPI WPSFD4 → PPIFIS | Final Demand producer prices | Index Nov 2009=100 / level | Monthly / SA | Calendar YoY | Same month convention; BLS | YES |
| Unemployment LNS14000000 → UNRATE | Civilian unemployment rate | Percent / rate | Monthly / SA | Raw current and previous rate | Same month convention; BLS | YES |
| Payroll CES0000000001 → PAYEMS | Total nonfarm employment | Thousands of Persons / level | Monthly / SA | Two monthly changes from three levels, existing adapter | Same month convention; BLS | YES |

P0-6A-PPI-MAPPING-CONFIRMATION supplies official BLS/FRED evidence in the user task:
BLS WPSFD4 is Final demand; FRED PPIFIS is Producer Price Index by Commodity: Final
Demand, sourced from U.S. Bureau of Labor Statistics. Both are monthly, seasonally
adjusted, Index Nov 2009=100. The supplied observations also match:

| Observation month | BLS WPSFD4 | FRED PPIFIS |
| --- | --- | --- |
| 2026-04 | 156.061 | 156.061 |
| 2026-05 | 156.864 | 156.864 |
| 2026-06 | 156.667 | 156.667 |
| 2026-07 | 156.784 | 156.784 |
| 2026-08 | 157.411 | 157.411 |

These supplied metadata and multi-month observations supersede the earlier
VERIFY_REQUIRED decision. They were not fetched again during this task.
semanticEquivalent is YES; revisionSensitive and VINTAGE_SENSITIVE remain intact.
This does not guarantee equality across future revisions or all historical vintages.
PPI eligibility now enforces the same exact YoY-history checks as CPI; no formula
is recalculated here. Existing primary data and shadow implementation are untouched.

## Input contract and triggers

- Call once per series with that series' primary status (not the aggregate batch status).
  Existing BLS key `payrolls` must be mapped to shadow metric `payroll` by future integration.
- Primary success uses already standardized finite values, actual monthly dates and
  semantic PASS/MATCH. Zero is success; a newer/different FRED value never replaces it.
- Allowed existing enums: TIMEOUT, HTTP_ERROR, REQUEST_FAILED, QUOTA_EXCEEDED,
  INVALID_RESPONSE, MISSING_SERIES. Existing auth/API failures use REQUEST_FAILED;
  no invented AUTH_FAILED/API_ERROR aliases are accepted.
- Failure origin must explicitly be PROVIDER. Semantic failures, code bugs and unknown
  origins block. INVALID_RESPONSE/MISSING_SERIES can represent several causes in the
  existing parser; the integration must distinguish genuine provider failure from
  parser bugs or insufficient calculation history before marking the origin.
- Secondary requires official API SUCCESS and PASS/MATCH, exact mapping metadata,
  finite standardized/raw inputs, exact required dates, verified history and trusted
  PROVIDER quality provenance. Fixture/example/synthetic inputs are rejected.
- Quality provenance is internal evidence, not request parameters. This policy does
  not generate it. The current adapters do not yet supply that integration contract.
- Existing shadow lag bound (0–2 months from fetchedAt) is preserved. An explicit
  not-current flag blocks. Unknown latest-release freshness remains unverified in
  selected metadata; the policy does not turn it into verified freshness.
- No interpolation, resampling, latest-provider competition or clock-derived observation.
  Rejection returns `selected: null`; it cannot provide a live result or alter weights.

## Future handoff

Selection contains only whitelisted internal provenance and normalized inputs.
It is not a public `/api/market-data` response extension.
`API_CONTRACT_HANDOFF_REQUIRED` applies if future public provider provenance is wanted:
the current public contract has not been extended here.

Production fallback remains OFF. FRED shadow runtime evidence is reused, not rerun.
LiveCount, buildSummary, providers, formulas, UI and existing tests remain unchanged.
All new tests use synthetic in-memory provider-shaped values and zero network calls.
