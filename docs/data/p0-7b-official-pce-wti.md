# P0-7B official FRED transport reuse

Base: `30f17b164132fd74c348103a1c79b47395b0df88`.

The existing shadow observations HTTP/JSON implementation is extracted to
`fred-api-transport.mjs`. Both the existing four shadow series and the market
provider call it. There is one HTTP client, a manual redirect policy, the same
8-second cap, 262144-byte body cap, safe error classification and no retries.

An explicit frozen profile allowlist preserves MONTH_START for CPIAUCNS,
PPIFIS, UNRATE and PAYEMS. Their semantic code is unchanged. PCEPILFE adds the
same monthly date policy; DCOILWTICO alone uses valid ISO daily dates. Unknown
series are rejected. Requests use raw `units=lin`, JSON, ascending dates and the
existing 18-month range, with no frequency/aggregation parameter or metadata
request. Monthly limit remains 100; WTI uses 1000 to cover the bounded daily
range in one response, and envelope count/offset validation prevents partial
history acceptance.

PCEPILFE supplies raw Index 2017=100, Monthly/SA/BEA levels to the unchanged
Core PCE YoY consumer. Current/previous calendar months and both year-ago bases
must exist; zero denominators fail. Unrelated dots are excluded. YoY is not
computed by the provider.

DCOILWTICO supplies raw Dollars per Barrel, Daily/NSA/EIA prices to the unchanged
direct consumer. Dots are excluded, zero is retained, invalid numbers/dates and
duplicate conflicts fail. No dates are filled or replaced with fetchedAt.

The route uses the existing FRED_API_KEY binding for these two profiles. They
never use legacy CSV, even on failure. DGS10 delegates to unchanged fetchFred.
The BLS fallback policy, consumer formulas, buildSummary, all-seven gate, public
response fields, UI and secrets are unchanged.

Fixture verification is not production runtime evidence. This step does not
deploy or call a financial API. A later bounded production validation is needed.
