# R19 — Same-as-of SEC CUSIP cross-fund linkage audit

Date: 2026-10-19 (KST). Source base: GitHub main bd023156187f9568603256c986c3ec42ff5e9a6a.

## Actual user-executed PC R18 P1 evidence
- `READ_ONLY_EXACT_TICKER_LINKAGE_AUDIT_NOT_PIT_READY`; previous CMD `group-01.json` preflight bug fixed, actual PC store read confirmed.
- SEC N-PORT pilot equity lines: BOTZ 49, SMH 25, SOXX 30, CIBR 42 (146 total).
- Explicit valid equity ticker lines: BOTZ 0, SMH 0, SOXX 0, CIBR **41**.
- CIBR exact ticker vs local stock groups: **17/41** priced stocks; those 17 have >=756 raw daily price rows and as-of-or-later observations; disclosed positions' reported ETF percent sum matched **64.0318** (not a certified total portfolio-coverage measure).
- Original local data unchanged: 715 files, 578,145 stock rows; 0 provider calls, 0 writes, 0/30 validated R3 five-axis themes.
- R17 established CUSIP tags in all 154 NPORT positions; lack of ticker in SMH/SOXX/BOTZ is *not* lack of the underlying stocks.

## R19 standalone ZIP (NOT installed in operating PC source)
- Attachment: `ZGMINI_THEME_R19_SAME_DATE_CUSIP_BRIDGE_2026-10-19.zip`
- Exact ZIP SHA-256: `4ed3e695447d10f4c6f372a0ad030ddcce21ca18bfff0d85f5db6ed21130479a`
- New read-only Node source: `scripts/pc-writer/theme-fear-greed-r19-same-date-cusip-bridge.mjs`
- Inputs restricted to R16 checksum-verified four SEC snapshots and existing 715 Alpaca stock price group files (NO SEC HTTP/API on this run).
- Link an *unlabeled* SMH or SOXX equity CUSIP to CIBR's explicit ticker ONLY when (a) identical CUSIP (b) exact same portfolio-as-of 2026-06-30 (c) ISIN does not conflict when both given (d) the CIBR CUSIP maps to exactly one ticker (e) matched ticker actually appears with valid close and volume locally.
- BOTZ is 2026-02-28 and is excluded from CIBR 2026-06-30 mapping to avoid inventing historical identity. Any matched linkage is a ONE-DATE CANDIDATE, not proof of a marketable historical ticker crosswalk or past ETF holdings.
- Known-at date is the **later** of two SEC filings' conservative public dates. Never make correspondence available before both SEC disclosures became public. Never renormalize or substitute R3 axes.
- Output TXT contains fund-level counts and weights (if available), not CUSIP/ticker/ISIN/names, XML, raw prices or keys.
- Tests: R19 17/17 fixtures, combined R15–R19 **87/87 PASS**, independently extracted ZIP 87/87 PASS. Actual PC R19 runtime NOT RUN yet; this evidence cannot certify a single live 5-axis score.
- Only output file written: `ZGMINI_THEME_R19_RESULT.txt` beside CMD in extracted folder; no existing E: raw files, DB, D1, scheduler, production, deploy or DNS modified.
- Operator CMD once: `ZGMINI_THEME_R19_SAME_DATE_CUSIP_BRIDGE.cmd`, then send `ZGMINI_THEME_R19_RESULT.txt`; STOP on errors.

## Independent rights and source gates
- SEC historical NPORT is *lagged* periodic known-at, not issuer daily holdings history. R3 breadth and demand cannot be retroactively computed from today's constituents with no-lookahead guarantee.
- BlackRock iShares holdings FTP terms explicitly state that users must obtain needed third-party CUSIP/market identifier licences: https://www.ishares.com/us/literature/holdings/fdf-terms-of-use.pdf . Do not publish identifier crosswalks or assume commercial redistribution rights.
- First Trust has current CIBR symbol + CUSIP holdings page, https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=CIBR . Current holdings do not establish last year's daily membership.
- Global X BOTZ lists many overseas exchange tickers; 547 locally priced U.S. stocks are not a proxy for its entire basket: https://www.globalxetfs.com/funds/botz/ .
- Preserve approved 756 reference, rolling 252, unchanged five-axis definitions, sourceVersion/sourceStoredAt, and 2–5 ETF aggregation pending evidence. No publication approvals or license gate passed.

## NEXT
Review actual R19 PC result before any expansion. If few same-date CUSIP matches, prioritize an independently licensed/reproducible security master and historical daily ETF constituent archive. If unavailable free, propose separately versioned score alternative **for explicit user approval**, rather than endlessly repeating diagnostics or silently altering formula.
