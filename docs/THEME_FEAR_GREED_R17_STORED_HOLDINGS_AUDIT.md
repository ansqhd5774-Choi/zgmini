# ZGMINI Theme R17 — SEC stored holdings XML field audit (2026-10-19)

## Actual PC R16 evidence (user-executed)
- SEC NPORT-P **4/4** XML filings correctly matched fund header CIK + seriesId + classId + report as-of. SHA-256 verified snapshots written 4, SEC calls 4, public writes 0.
- BOTZ: accession 0002048251-26-003677; report 2026-02-28, filed 2026-04-29, invstOrSec 51.
- SMH: accession 0001410368-26-086937; report 2026-06-30, filed 2026-08-26, invstOrSec 26.
- SOXX: accession 0002071691-26-019781; report 2026-06-30, filed 2026-08-25, invstOrSec 33.
- CIBR: accession 0000940400-26-032759; report 2026-06-30, filed 2026-08-21, invstOrSec 44.
- R16 `cusipTagCount=0` matches **issuerCusip** tag specifically, not every official N-PORT CUSIP representation. Zero should not be interpreted as absence of issuer identifiers.

## R17 safe standalone read-only audit
- ZIP: `ZGMINI_THEME_R17_STORED_HOLDINGS_AUDIT_2026-10-19.zip`, SHA256 `06fa2dd2416d938fd405de288d9fa91a12f3f7d1c78c61dee6a773ef2410958d`.
- Contains `scripts/pc-writer/theme-fear-greed-r17-stored-holdings-audit.mjs` (source ONLY in attached standalone ZIP, not merged into PC writer) and 16 new independent tests.
- Reads only `theme-fg-r16-sec-fund-nport/TICKER-ACCESSION.json` under approved E: PC writer folder; validates original SHA+URL, rechecks R16 identity, counts actual `invstOrSec` and field presence.
- Reports anonymized **counts** for holdings with CUSIP/ISIN/ticker/name, country, currency, asset class, numeric value and weight. No individual holding rows or credentials in TXT. Missing fields remain missing.
- Network/provider calls 0; E: storage writes 0; production/D1/DB/scheduler/formula/DNS writes 0. Only `ZGMINI_THEME_R17_RESULT.txt` is written next to CMD in extracted ZIP directory.
- Local Node fixture suite **53/53 PASS** = R15 18 + R16 19 + R17 16; independent extracted ZIP suite **53/53 PASS**. This does NOT constitute PC R17 runtime validation.
- CMD to run once: `ZGMINI_THEME_R17_STORED_HOLDINGS_AUDIT.cmd`, attach `ZGMINI_THEME_R17_RESULT.txt`. STOP on failures.

## R17 limitations and gates
SEC NPORT reports are **lagged snapshots**, not a historical 252-trading-day sequence of as-known daily ETF positions. SEC report filing date is NOT portfolio as-of date. Country alone does not establish price source coverage. Need verified ETF fund identity across strategy epochs, US+foreign constituent CUSIP-to-price/volume mapping, dated known-at holdings, full R3 five-axis rolling reference=756 and 252 chart observations. Commercial publication rights separately reviewed. No score computation/publish authorized by this audit.

Branch based on latest main SHA `008c4fbf3742bc9c7ca3323ef50ffe4e1e9fac3a`; earlier development branches are not merged.