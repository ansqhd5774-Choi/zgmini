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
- Three FSC operations run independently; at most 18 FSC requests per uncached run.
  The BOK extension adds at most 28 requests, for at most 46 total.
- 2 MiB maximum response body per page; 12 seconds per request, 90 seconds per operation.
- No redirect following. Partial pagination remains explicitly incomplete.
- Duplicate pages, changed total counts and out-of-range rows are detected.
- Summary-only cache and request cooldown: 15 minutes **per Worker isolate**.
  This is not a global quota guarantee or authentication mechanism.
- Route automatically returns 410 from 2026-10-11 UTC. Remove both new modules,
  the BOK research extension, the import and route in `worker/index.ts` after
  research; expiry is not removal.

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

## PHASE 2B-2 BOK extension

The same route now adds a `bok` section using Hosted `BOK_API_KEY`. FSC output
and analysis remain intact; BOK errors are isolated. FSC raw points are shared
in memory for cross-provider correlation, without any extra FSC acquisition.
PHASE 1 code is unchanged: its `requestStage`, `wrapperRows`, `searchableTables`,
`usableItems`, numeric and period parsers are reused. A bounded response adapter
limits BOK bodies to 2 MiB while retaining that transport's timeout/error handling.

Metadata discovery follows StatisticTableList -> StatisticItemList ->
StatisticSearch. No real table/item IDs are hardcoded or claimed as verified.
Discovery is bounded (3 table-list pages, 6 tables with 1 item page each, maximum
28 BOK requests / 180 seconds). Omitted or partial metadata is not exhaustive
evidence of absence. Each history is capped at 4,000 rows, with explicit partial
status. Discovery matches exact maturity/rating and FX quotation/unit requirements.
Unsupported multi-group classifications are skipped rather than guessed.

- USD/KRW: explicit won-per-US-dollar quotation and won unit; daily preferred.
- Spread: AA-minus 3-year corporate minus 3-year government bond rates. Same
  frequency and identical `%` or `연%` units are required, followed by exact date
  intersection. There is no interpolation. Negative spreads remain valid levels;
  their nonpositive change denominators are excluded by the existing framework.
- CCSI: monthly comparison only, distinct from equity investor sentiment.

Monthly dates are anchored to month end, not publication dates or synthetic daily
observations. Monthly freshness screening uses 62 calendar days, median gap 40,
long-gap review 70; 252 monthly observations still means 21 years, so eligibility
can legitimately remain NOT_ENOUGH_HISTORY. Daily FSC criteria are unchanged.

Candidate research decisions are REJECT without two observations, WEAK without
3 years/complete/GOOD quality, otherwise OPTIONAL while rights are unresolved.
A separate provisional technical CORE_CANDIDATE flag requires daily quality and
two FSC comparisons with >=252 aligned 20-observation-change pairs and no absolute
Pearson/Spearman >=.85. This flag is not a final index inclusion decision.

ORG_NAME attribution is retained when present, but does not prove BOK ownership.
External/mixed attribution and unknown source are distinguished. No per-series
commercial redistribution license has been verified locally, so the rights gate
blocks CORE promotion. The official ECOS documentation entry is
https://ecos.bok.or.kr/api/ ; no API sample or authenticated API was called.

Runtime history, exact selected IDs, independence and rights still need separate
verification. Local fixtures establish implementation behavior only.
