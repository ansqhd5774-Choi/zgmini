# PHASE 2B history research

Temporary GET route: `/api/internal/phase2-korea-history-check`.
Implementation and synthetic tests only. No production history has been fetched
or evaluated by this change. It does not calculate an index or assign weights.

## Data acquisition

The server uses Hosted `FSC_API_KEY`. Each operation supplies all its fields from
one shared paginated dataset, starting 2021-01-01 and ending at the current KST
date. There are no field-by-field requests or automatic retries.

| Operation | Fields |
| --- | --- |
| getGrantingOfCreditBalanceInfo | crdTrFingWhl, crdTrLndrWhl, dpsgScrtMogFing, crdTrFingScrs, crdTrFingKosdaq |
| getSecuritiesMarketTotalCapitalInfo | invrDpsgAmt, brkTrdUcolMny, brkTrdUcolMnyVsOppsTrdAmt, ucolMnyVsOppsTrdRlImpt, onbdDrvPrdTrRcAdvAmt, toCstRpchCndBndSlgBal |
| getCMAStatus | actBal, separately for documented 합계 / 개인 and 합계 / 기관 categories |

The two market-specific credit fields are composition checks, not independent
index candidates. The last two capital fields are comparison candidates only.
CMA categories are never added together. An all-investor aggregate is not assumed.
The source guide is the official 금융위원회 금융투자협회종합통계정보 API guide
inspected locally. Only the documented ratio has unit `%`; other units stay null.

## Bounds and temporary access

- Fixed upstream host and operation names; caller-supplied queries are rejected.
- Page size 1,000; maximum 6 pages / 6,000 rows per operation.
- Three operations run independently; at most 18 upstream requests per uncached run.
- 2 MiB maximum response body per page; 12 seconds per request, 90 seconds per operation.
- No redirect following. Partial pagination remains explicitly incomplete.
- Duplicate pages, changed total counts and out-of-range rows are detected.
- Summary-only cache and request cooldown: 15 minutes **per Worker isolate**.
  This is not a global quota guarantee or authentication mechanism.
- Route automatically returns 410 from 2026-10-11 UTC. Remove both new modules,
  the import and route in `worker/index.ts` after research; expiry is not removal.

Raw rows are used only in server memory. Output contains quality, distributions,
correlations and feasibility, never full history, upstream URLs or credentials.
CMA failure does not turn successful credit/capital acquisition into failure.
Operation SUCCESS denotes completed acquisition; series quality flags must still
be reviewed before accepting any candidate.

## Research criteria

- Dates are sorted; equal numeric duplicates collapse. Conflicting dates are
  excluded rather than choosing an arbitrary row. Missing/invalid values counted.
- No weekend/holiday imputation. Gaps and freshness are calendar-day screening.
- FRESH: latest lag 0–7 days; otherwise STALE when a valid latest date exists.
- INSUFFICIENT_HISTORY: span under 3 years; target at least 5 years.
- SPARSE: fewer than 2 observations, median gap over 4 days, or more than 2%
  missing/nonnumeric rows. A gap over 14 days triggers LONG_GAP_REVIEW.
- GOOD requires complete acquisition, 3 years, FRESH, and no sparse/conflict/long-gap flag.
- Percentiles use linear interpolation at `(n-1)*p`; standard deviation is population.
- Changes use 1/5/20/60 observations, not calendar-day interpolation. Nonpositive
  denominators and nonfinite changes remain excluded, without bridging gaps.
- Pearson/Spearman require at least 3 aligned pairs. Spearman uses average ranks
  for ties; constant series yield null correlation. Change pairs require matching
  endpoint **and baseline dates**. Raw correlations can be spurious.
- Rolling feasibility requires 252 valid observations; zero-variance z-score
  windows are unavailable. No actual normalized index scores are produced.
- First/recent 12-month median growth of at least 50% flags RAW_LEVEL_NOT_SUITABLE
  only with at least 2 years and 120 observations in each window. This is a
  screening rule, not statistical proof of structural growth.
- Deposits retain DIRECTION_UNRESOLVED. Correlation never automatically removes
  a candidate or chooses a component count.

## Next stage

After separately authorized push/deployment, use one runtime invocation to inspect
actual completeness, freshness and distribution. Local stub tests do not establish
API history availability, production quota capacity or RUNTIME_VERIFIED status.
