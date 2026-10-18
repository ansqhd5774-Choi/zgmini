# R16 SEC N-PORT fund-level pilot — 2026-10-19

## Actual PC evidence
User-run R15 repaired result: 4/4 SEC registrants fetched/cached and SHA-256 verified, 3,202 registrant NPORT-P accessions indexed, 4 SEC requests. Fund-level series and historical daily ETF holdings remain unverified, 0/30 live theme scores.

## R16 four exact SEC accession targets
- BOTZ, CIK 0001432353, S000054693, C000171853, accession 0002048251-26-003677, [SEC](https://www.sec.gov/Archives/edgar/data/1432353/000204825126003677/0002048251-26-003677-index.htm).
- SMH, CIK 0001137360, S000034411, C000105869, accession 0001410368-26-086937, [SEC](https://www.sec.gov/Archives/edgar/data/1137360/000141036826086937/0001410368-26-086937-index.htm).
- SOXX, CIK 0001100663, S000004354, C000012084, accession 0002071691-26-019781, [SEC](https://www.sec.gov/Archives/edgar/data/1100663/000207169126019781/0002071691-26-019781-index.html).
- CIBR, CIK 0001364608, S000050385, C000159087, accession 0000940400-26-032759, [SEC](https://www.sec.gov/Archives/edgar/data/1364608/000094040026032759/0000940400-26-032759-index.htm).

## Bounded local execution
- Standalone reviewed R16 package attached to conversation: ZGMINI_THEME_R16_FUND_NPORT_PILOT_2026-10-19.zip. Not automatically deployed to local PC or scheduler.
- Check full R9 price bootstrap, R14 source SHA, R15 all four registrants source SHA; require each exact accession and the R14 CIK+series+class mapping before network.
- At most four original SEC NPORT-P primary XML HTTP GETs, no retries. After fetch, XML header must match exact CIK, series, class, report as-of and R15 stored accession before saving.
- All raw XML snapshots stored and SHA verified in isolated PC theme-fg-r16-sec-fund-nport folder. Never change R9/R14/R15 original raw stores; no D1, DB, cron, deploy, formula, DNS, public score.
- Report metadata only: filing date, as-of date, counts, SHA and a **conservative known-at bound next calendar day after filing**. Sparse SEC NPORT observations are not historical daily known-at ETF holdings.
- Fixture tests 37/37 PASS (R15 18 and R16 19) including independent extraction test. PC R16 runtime PENDING; do not claim Production readiness.

Next: PC CMD once, then validate the actual four XML filings, any report-date conflicts, and the real scope/coverage of investment holdings. Distinguish correct fund CIK+series/class from daily PIT and the commercial data-use policy. Neither R3 formula nor 756 reference nor 252 chart history can be relaxed silently.
