# R53 PC Runtime → R54 Verified-Issuer-Cap Gate (2026-10-30)

Working repository: `ansqhd5774-Choi/zgmini`; branch: `codex/ui-improvements`. No main merge or production deploy.

## Actual R53 PC evidence

Uploaded `MARKET_CALENDAR_R53_RESULT.txt` reports `R53_LOCAL_ISSUER_REVIEW_COMPLETE` as of 2026-10-29:

- 2,640 calendar tickers; 2,639 existing price candidates; 2,372 SEC share candidates paired with a recent price.
- Shares age 0–30: 8, 31–90: 1,323, 91–180: 597, over 180: 444. These add to 2,372. Fresh <=90 days =1,331; older =1,041.
- Multiple-ticker issuer risk: 10. ADR name *hints*: 0 (not proof of no ADR). Latest facts both tagged:47, DEI only:2174, us-gaap only:151.
- All 2,372 still require split and issuer-wide class/ADR validation. Verified issuer market caps = 0, gradeable ticker count = 0, publication rights verified = false.
- PC result reports provider requests=0, SQLite writes=0, D1 writes=0, public star changes=false; private review queue has 2,640 ticker entries and must remain PC-local.

## Why R53 counts must not be published as market caps

SEC XBRL CompanyFacts aggregates disclosures applying to the whole reporting entity but does not independently settle listed share class/ADR mappings, effective timing, and split adjustment for a market-cap calculation. Alpaca stock-bar `adjustment=split` adjusts prices/volume for splits. Alpaca's terms restrict reproducing, distributing or commercially exploiting market data without requisite consent; whether an issuer-level derived *star category* is permitted for ZGMINI's public site requires separate documented verification, not inference from availability of the API.

Official sources:
- https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- https://docs.alpaca.markets/us/reference/stockbars
- https://files.alpaca.markets/disclosures/alpaca_terms_and_conditions.pdf
- https://files.alpaca.markets/disclosures/library/AcctAppMarginAndCustAgmt.pdf

## R54 source-only implementation

- `scripts/pc-writer/market-calendar-r54-marketcap-gate.mjs`
- `scripts/pc-writer/market-calendar-r54-marketcap-gate.test.mjs`

A pure, read-only, fail-closed validator for **independently verified** issuer-wide USD market-cap snapshots. It does **not** calculate market cap by multiplying R53 SEC shares and split-adjusted IEX price, fetch an API, read/write PC data, change stars, or publish.

It requires: externally approved R43 thresholds (disabled by default), validated issuer mapping, USD value, observation timestamps, source version, verified provenance, issuer-wide scope, ADR/classes, corporate actions/splits, approved freshness decision, and explicit public derivative-display rights. Missing, duplicated, invalid or conflicting data remains `UNVERIFIED` and receives no star. The published feed cannot use this module until source quality and contractual gates pass.

Verification completed with the exact source uploaded to the existing branch:
- Node syntax check PASS; 8/8 offline tests PASS.
- Remote blob SHAs: module `fd051972850528f31fa4da9852c3eba909961492`, test `b0e50573f190362b033f0db6bebbbc30333c1862`, matching local Git blob hashes.
- Real market cap provider connected: NO; real cap snapshots validated: 0; PC R54 executed: NO; public stars modified: NO.

## Next essential work

Find/verify an existing permissible source supplying updated **issuer-wide USD market capitalization** or obtain documented rights to the derived star presentation using provider prices. Validate stock-class/split/ADR mapping against official filings/corporate actions using already approved data; new API provider calls, spending or new schedules require separate scope approval. Only then connect the acceptance gate to existing PC result computation and the approved HTML-only publishing route, preserving DB/D1 contracts, refresh TTL and the user's final approved grading policy.

**No further repeated R51 collection or R52/R53 whole-universe audits are required merely to prepare this gate.**
