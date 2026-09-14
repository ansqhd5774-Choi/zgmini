# P0-6C consumer compatibility (production OFF)

Base: `a724b7158189b37d2b815d23a447a86e3c88c12e`.

The existing `app/api/market-data/route.ts` accepts a BLS-series-keyed Map of
`{date: "YYYY-MM-01", value: number}` arrays. Its `makeYoyIndicator` selects
calendar year-ago values from raw CPI/PPI indices. `payrollChanges` receives raw
employment levels before `makeDirectIndicator`; unemployment uses the direct
raw percentage. None of these functions or the route are changed.

`consumerCompatibilityAdapter` translates a selected candidate to those exact
rows, without reading selected `currentValue`, `previousValue`, or derived
diagnostic fields. Identity metadata is checked internally and never added to
consumer rows or public JSON. Required current/previous months, both YoY bases,
or the payroll prior month must exist; missing rows are never filled. Zero is
preserved; nonfinite numbers and conflicting duplicates fail closed.

The official FRED adapter retains validated raw history in a WeakMap keyed by
the successful result object. `getApiRawHistory` returns a defensive copy.
Serialized diagnostics and the recent-four preview cannot be used as full raw
history. The diagnostic response schema, validation, requests, and timing stay
unchanged. Failed results have no raw history handle.

The mock-capable collector exposes internal `consumerCandidates` only when the
compatibility check succeeds. Its `appliedBlsResult` is still the original batch.
`consumerInputMap` defaults to the identical original Map; explicit fixture
simulation selects candidate raw rows. No route imports either entry point.
`FALLBACK_PRODUCTION_ENABLED` remains false. Production activation and liveCount
recognition are deferred; no public provenance fields are introduced.

Tests exercise real parsers and existing consumer functions with injected
responses: all four BLS/FRED outputs match, payroll +162/zero/negative changes
remain single transformations, and OFF complete JSON bytes match with a fixed
clock. Fixtures are not production runtime evidence.

API_CONTRACT_HANDOFF_REQUIRED: NONE. The raw input contract is compatible;
production selection remains OFF pending a separately authorized activation.
