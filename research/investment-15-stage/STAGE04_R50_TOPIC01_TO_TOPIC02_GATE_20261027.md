# Stage04 R50 — topic01 partial acceptance and topic02 sequential research

2026-10-27. Only branch `codex/investment-15-stage-m2-r25-20261025`.

## Evidence-led progression decision

* Topic01 information technology R49 PC execution: 1 warmup + 3 measured; measured totals 7,544 / 6,919 / 5,489 ms, median 6,919 ms and max deviation **20.7%**, within the experimental 25% bound. Repeated source **states** were consistent. This is a **diagnostic stability PASS**, not a data-coverage PASS.
* R49 source coverage: 0/3 direct scope-approved, 1 observed independent TBRC publisher-wide IT forecast for 2026–2030 of 8.3%; it covers telecom and is not GICS Information Technology. SkyQuest was only IT services; Precedence had no whole IT match. BRI was excluded from network traffic after HTTP403.
* The user explicitly approved retaining unavailable/non-comparable forecasts as NULL and moving to the next sequential topic. Preserve topic01 as `PARTIAL_USER_APPROVED_NULL` with its original TXT/JSON and observations intact. **Do not change the public 04-stage formula or backfill a 0.**

## Topic02 market scope (must not silently redefine)

* Original topic and order preserved: **02 커뮤니케이션**, one of eleven sectors.
* Intended investment sector: GICS **Communication Services**, which covers **Telecommunication Services** and **Media & Entertainment** (including interactive media). Reference: [S&P Dow Jones Indices official GICS](https://www.spglobal.com/spdji/en/landing/topic/gics/).
* The prior R35 official URL seeds for TBRC/SkyQuest/Precedence point to **telecom/telecommunication only**, not the full GICS Communication Services sector. A report's published rate may be accurate for telecom and still be invalid as the GICS sector aggregate.
* Reference-only public source forecasts at project time: TBRC telecom CAGR 5.3% (2026–2030); SkyQuest telecommunication CAGR 6.2% (2026–2033); Precedence telecommunication CAGR 6.03% (2026–2035). **These constants must never be fed to the live runner as values.** Live PC must fetch the reports, check them, and record its own observations. Different forecast periods must not be silently averaged.
* Additional Precedence source caution: its official telecommunication report headline currently describes **USD 4.21 trillion by 2035**, while the article body describes **USD 4.42 trillion by 2035**. The R50 runner checks comparable same-year headline/body forecasts and flags explicit conflicts as `SOURCE_CONFLICT`. This is report-specific, not a publisher-wide prohibition; it does not manufacture an accepted CAGR.

## R50 research implementation

1. BRI permanently `SOURCE_BLOCKED_EXCLUDED` (0 requests; no retries, proxies, challenge bypass or payment).
2. TBRC / SkyQuest / Precedence independently inspect known official URL seeds and search each publisher official catalog plus **two distinct public search queries × two engines**, bounded to 8 report URLs per provider. Keep live discovered links separate from past seeds.
3. Numeric CAGR only copied from publisher's newly fetched page and subject to bounded source/model checks. Ollama (`gemma3:4b`) returns a constrained `C0`-style candidate ID, not a percentage. For TBRC, reuse R29 numeric forecast/table verification; for explicit same-year headline/body forecast-size conflicts, flag the individual report before selecting a CAGR.
4. The **publisher market forecast** `observed_cagr` and `market_scope` are logged independently of final sector eligibility. Telecom-only data may be `PUBLISHER_PROXY_OBSERVED`, never automatically `GICS_COMMUNICATION_CAGR`. No synthetic 0, no backfill, no automatic mean from mixed sectors/years.
5. 1 warmup + 3 measured passes. Source consistency, missing cases, and wall-clock speed are assessed separately. Fixed prior 25% diagnostic threshold; this is not a promise of future data availability or stability.
6. A `R50_TOPIC02_COMMUNICATION_RESULT_HISTORY.ndjson` file gets **one append-only, timestamped summary record per independent CMD execution**. This makes future change tracking technically possible without new scheduler, server, API, data model or DB. These are only observed snapshots, not interpolated time-series data.
7. On `PARTIAL_RESEARCH_REVIEW_REQUIRED`, report the explicit missing/mismatched sources and ask for the next topic approval. **Do not automatically execute topic03 or all 21 topics.**

## Exclusions and safety

No score changes, no Cloudflare/D1/DB, no GitHub main, no API additions, no scheduler, no deployment, no trading and no paid provider access. Local Windows CMD + existing Node.js and Ollama only. Contents are personal read-only research outputs, not licensed site-publication data.
