# P0-7D DGS10 official API

Base: `7d16e4b2515a0f8ccef298761268ae15d83e88d5`.

DGS10 is added to the existing explicit official FRED profile allowlist as
Daily, ISO_CALENDAR_DATE, RAW_RATE_LEVEL, Percent, Not Seasonally Adjusted,
DIRECT_LATEST_VALID. The existing shared request/parser is reused without
modification to HTTP, timeout, raw units, or missing-value rules.

The market provider no longer delegates DGS10 to legacy CSV. Official failure
remains failure; no retry/metadata/CSV fallback is added. Direct P0 FRED requests
remain three. The old P0-7B DGS10 CSV assertion is updated solely for this
authorized migration. PCE/WTI policies, shadow semantics, BLS fallback, route,
public shape, formulas, all-seven summary gate and UI are unchanged.

Fixture checks do not prove freshness. After exact-commit deployment succeeds,
one production market-data request must verify DGS10 against the supplied
2026-09-10 / 4.95 reference (or a valid newer observation) and check all seven
inputs and natural summary generation. No retry or fault injection.
