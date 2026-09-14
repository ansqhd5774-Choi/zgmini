# P0-6D live activation

The market-data BLS import now uses `fetchBlsWithFallback`, with the existing
BLS binding and FRED_API_KEY. One BLS batch is evaluated per series. Only the
existing provider-eligible failures request their official FRED secondary;
missing keys, semantic/code/unknown failures do not request secondary.

Validated raw compatibility rows replace only successfully selected secondary
series. Primary rows are preserved. Blocked semantic candidates are excluded.
The existing YoY/payroll semantics, buildSummary, all-seven liveCount gate,
public fields, and UI are unchanged. Other three FRED series remain separate.

`MARKET_DATA_FALLBACK` logs only metric, selected provider, primary status,
fallback attempted/result, observation date and separate request counts.
No authenticated URL, key, body or headers are logged.

Previous P0-6A/B/C OFF notes describe their historical gates. The production
flag is now enabled; explicit candidate-only/OFF simulation remains available
for regression checks. Runtime verification must separately report normal path
and actual failover: no production failure injection or retry is authorized.
