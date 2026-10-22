# New themes — ETF-fund-size proportional weighting (shadow R1)

Scope: new themes, beginning with 양자컴퓨팅. Existing published 50:50
R144/R158 theme scores and their storage/reader contracts remain unchanged.

## Approved method

- Use the ETF's **own total net assets (USD)** at each observation date, not the
  combined market caps of stocks held by that fund. Equivalent inputs are a
  verified fund NAV per share multiplied by outstanding ETF units.
- `weight[i,t] = netAssetsUSD[i,t] / sum(netAssetsUSD[all qualifying ETFs,t])`.
- `themeScore[t] = sum(weight[i,t] * validatedEtfScore[i,t])`.
- No fixed dollar size threshold, equal-weight default, exponent, artificial
  allocation cap/floor, or 10%-minimum for a small/new fund.
- Exclude funds only through a separately documented thematic eligibility and
  data/rights gate, never by inventing a new absolute ETF-size filter.
- Use each historic date's **observed** net assets and existing ETF price score.
  Do not propagate present-day fund size into older dates; do not create returns
  or scores for sessions before ETF inception.

## Readiness gate — quantum theme

Candidate: Defiance QTUM + WisdomTree WQTM. Both are ETF-only; first is a
quantum/machine-learning mixed strategy, second targeted quantum with
diversified leaders. Their thematic fitness requires final review.

Issuer-reported net assets, **2026-10-21**:

| ETF | USD | ratio to largest | new allocation |
| --- | ---: | ---: | ---: |
| QTUM | 5,364,800,000 | 1.0000 | 94.401317% |
| WQTM | 318,171,540 | 0.0593073 | 5.598683% |

Sources: https://www.defianceetfs.com/qtum/ and
https://www.wisdomtree.com/us/products/megatrends/wqtm .

**Blocked for production scoring:** WQTM fund inception 2025-10-09 cannot
provide 628 *pre-existing* trading-day ETF price observations by 2026-10-23.
The current R158 score normalizes to 252 ranks using 125 price-lookback days,
and a full 252-point 1-year chart requires 628 prior daily prices per ETF.
Also verify point-in-time daily historical ETF net assets, source rights for
commercial derived publication, price provenance, and identical date alignment.

**Explicit WisdomTree rights stop:** Its U.S. [Terms of Use](https://www.wisdomtree.com/us/terms)
require prior written consent for reproducing information on the issuer's site
and a license for use of WisdomTree indexes/data/information. Public derivative
scoring based on that site's WQTM data is **not cleared**. An independently
licensed data source or explicit written permission is needed before production.
The issuer's `Total Market Capitalization` of underlying portfolio companies
is **not** WQTM's ETF fund net assets and must never be used for these weights.

Read-only PC audit: run `scripts/pc-writer/theme-quantum-readiness-r2.cmd` and
submit the adjacent `QUANTUM_R2_READONLY_RESULT.json`. It reads bounded JSON
and SQLite metadata for QTUM/WQTM/SPY price dates plus same-date ETF net-assets
observations. This is **inventory only**: a missing result cannot prove absence
in every PC store, nor can matching dates establish commercial data rights.

## R2 observed PC diagnostic — 2026-10-23 KST

The user executed the R2 inventory. Report check time:
`2026-10-22T16:08:39.517Z`. Its **bounded** scan checked 86 JSON files,
parsed 82, skipped 4 oversized files and inspected zero matching SQLite
tables; traversal limits were reached. This is explicitly not exhaustive.

| ETF | Price dates discovered | Dated ETF fund-net-assets discovered |
| --- | ---: | ---: |
| QTUM | 0 | 0 |
| WQTM | 0 | 0 |
| SPY benchmark | 1,068 (2022-07-12 to 2026-10-21) | Not required |

Judgment: **NOT_READY**. Do not infer missing PC data beyond the scanned
JSON/SQLite paths, or attempt to generate a score by filling missing dates.
Even a complete scan or new commercial data license cannot make WQTM's ETF
price history older than its actual 2025-10-09 inception; the existing
628-price-observation requirement is independently unsatisfied. A production
solution therefore requires an explicit decision to change candidate ETF(s),
the score/one-year history contract, or defer this specific theme. None of
those changes are authorized by this inventory.

`theme-etf-aum-weight-r1.mjs` is a pure computation/shadow validator, performs
zero external requests or writes and does not connect to published readers.
Current issuer figures permit a weight check only; there is no substantiated
quantum theme **score** or one-year chart yet. No production cutover authorized.
