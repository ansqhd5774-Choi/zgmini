# THEME R22/R23: Price-axis research audit and publication rights gate (2026-10-19)

## PC runtime evidence
User-run R21: 39/39 stored prices, 30/39 ETF price-derived three-axis R3 Shadow histories (252 points), 12/30 current theme pairs with 2 eligible ETF histories, 0/30 approved 5-axis theme scores. 756 observation reference, ETF identities across historical dates, actual historical ETF holdings PIT, licence/redistribution rights remain UNVERIFIED. No publish or operational changes. Source R3 SHA1 `1142db953d512f04812712493bac0bd9921aaa4a`.

R22 offline numerical inspection (read ONLY R21 result TXT; no provider/PC execution): largest same-theme *ETF three-axis* differences are BLOK vs ARKF (relative strength 66.96, trend 61.23 points), ITA vs SHLD (trend 32.78), FINX vs ARKF (trend 24.88). These are research comparisons of ETF-specific percentile axes, NOT theme/composite values or operational fail thresholds. ARKF/BOTZ/GNOM reused in two theme pairs each. No factor weight, ETF selection or score formula changed.

## Legal rights — verified primary source but no derivative permission assumed
Alpaca's official support explicitly disallows API data redistribution: https://alpaca.markets/support/redistribute-alpaca-api . It does NOT affirmatively grant public commercial distribution of derived indicators either, so no public score permission may be presumed. Historical prices stored from Alpaca IEX remain research-only until an actual approved derivative use licence or alternative lawful input is evidenced.

Nasdaq Data Link terms: https://data.nasdaq.com/terms and Nasdaq index historical-data licensing notice https://www.nasdaqtrader.com/TraderNews.aspx?id=DN2024-5 . Source availability/free plan != commercial external-data rights.

## Issuer-verified additional candidate ETFs — NOT selected or ingested
- UFO Procure Space, inception 2019-04-11: https://www.procureetfs.com/ufo/ — investigate as historic second fund with ROKT for space/satellite, requires source & price/licence validation.
- XHE SPDR S&P Health Care Equipment, inception 2011-01-26: https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-health-care-equipment-etf-xhe — consider alongside IHI.
- FMET Fidelity Metaverse, issuer fact sheet 2026-03: https://institutional.fidelity.com/app/proxy/content?literatureURL=%2F9905810.PDF — AR/VR candidate but HERO is games, portfolio purity unproven.
- BATT Amplify Lithium & Battery Tech, inception 2018-06-06: https://amplifyetfs.com/batt/ — NOT a pure solid-state battery proxy.
- DTCR Global X Data Center & Digital Infrastructure, inception 2020-10-27: https://www.globalxetfs.com/funds/dtcr/ — NOT specifically AI power infrastructure or liquid cooling.
- SRVR Pacer Data & Infrastructure Real Estate: https://www.sec.gov/Archives/edgar/data/1616668/000089418925016892/pacerdatainfrastructurerea.htm — NOT specifically power/cooling.

Before approving additions, check CIK/series/class epoch continuity; ≥628 correct same-identity ETF price dates; public rights, issuer exposure, and all specified sector R3 five-axis input requirements. The existing 2–5 ETF rule, 252 history and approved 756 observation constraints remain unchanged.


## Additional validated source alternatives
- IEX HIST is a free T+1 direct market-data download with attribution rules: https://www.iex.io/legal/hist-data-terms . But only last 12 months and approximately 10GB daily exchange-wide PCAP, not a viable 628+ trading-day reference source: https://www.iex.io/products/equities/market-data-connectivity . Third-party IEX API has different prohibitions: https://iextrading.com/apiexhibita/ .
- FMP requires external display/redistribution licensing: https://site.financialmodelingprep.com/pricing-plans?planType=commercial .
- Twelve Data personal plans are not for commercial public distribution: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage .
- Business Quant commercial data redistribution licensing excludes market-price data: https://businessquant.com/pricing .
- No validated free, scalable, licence-cleared external historical ETF price series for all ZGMINI themes yet. Do not assume nonexistence beyond researched sources.

No API calls, PC stored data edits, D1, deployment, config, weights, schedule, DNS, or publication from R22/R23. Next step: source rights and candidate ETF quality gates before further Alpaca backfill; if no legally reusable full historical PIT/market data, prepare a versioned alternative formula proposal for explicit approval instead of silently weakening readiness.
