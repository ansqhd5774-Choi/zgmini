# P0-6B — provider candidate integration, production OFF

Base: `a867131d7808354defe20b057f953cdf1a6c9be8`.
No route imports this integration. No new environment variable, route, public
response field or production selector. No deployment or financial request.

## Existing providers, not replacement providers

`collectProviderCandidates` calls the existing `fetchBls` once, retaining the
four-series registered POST, original timeout, REQUEST_SUCCEEDED validation,
seriesID mapping and M13 exclusion. Its transport must be explicitly injected;
there is no implicit global fetch. All tests inject in-memory responses.

The existing BLS parser optionally writes safe `{status, origin}` evidence to a
caller-owned object. Its returned shape/data/status are unchanged. Absent series
and explicit provider rejection are PROVIDER evidence. Invalid observations or
too-short series are SEMANTIC evidence, not grounds for hiding a calculation issue.
TIMEOUT/HTTP_ERROR/QUOTA_EXCEEDED are unambiguous transport/provider failures.
Unhandled exceptions, unknown errors and ambiguous malformed JSON have no provider
evidence and fail closed; REQUEST_FAILED does not automatically justify a retry.

Per-series BLS normalization reuses `normalizeShadowSeries` (and its existing
Payroll adapter) without reproducing formulas. It is stricter than the current
public consumer on gaps/staleness; this only affects candidate inspection. The
unchanged original BLS batch is always returned as `appliedBlsResult` by identity.
`payrolls` (BLS/current consumer) is explicitly mapped to `payroll` (shadow policy).

## OFF gate and selective candidate collection

`FALLBACK_PRODUCTION_ENABLED = false` cannot be overridden by an argument.
Default collection: one BLS request, zero FRED requests, original BLS result.
`inspectSecondary=true` is for injected fixture candidate validation. Only a series
whose policy evaluation reaches SECONDARY_NOT_VALID is requested, exactly once,
through existing `fetchApiShadowSeries`. Successful BLS series never inspect or
request secondary. Zero/one/two missing series result in zero/one/two FRED requests
in that explicit inspection mode. Even then secondary is only a candidate, never
an applied production result.

The official adapter establishes semantic/history quality before SUCCESS; its
existing runtime metadata, date/unit/history gates feed the unchanged eligibility
helper. The integration does not alter CPI/UNRATE required-window logic. The
existing freshness qualification and PPI revision sensitivity remain unchanged.

Internal metadata is whitelisted; no keys, authenticated URLs, headers or raw
response body are included. Original batch data remains internal, not a new public
response object. No score, liveCount or buildSummary is touched.

## Consumer handoff

API_CONTRACT_HANDOFF_REQUIRED: future application must adapt standardized selected
values to the existing public indicator/chart consumer (which currently expects
raw history), without feeding payroll deltas into the level adapter a second time
or computing YoY twice. This task intentionally does not activate that application
or add provenance fields to public JSON. Existing BLS consumers receive unchanged
data while OFF; no false live result is produced by a secondary candidate.
