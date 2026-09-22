# ZGMINI Composite Model Revision 1 — ACTIVE

Status: **ACTIVE**

Approved by user in chat after R17 strict recovery returned zero approved executable 12-domain + Overall artifacts.

## Fixed domain weights

| Domain | Weight |
|---|---:|
| inflation / 물가 | 8 |
| employment / 고용 | 7 |
| rates / 금리 | 10 |
| credit / 채권·신용 | 10 |
| growth / 경기 | 8 |
| consumption / 소비 | 7 |
| earnings / 실적 | 13 |
| liquidity / 유동성 | 10 |
| fundFlows / 자금흐름 | 8 |
| breadth / 수급·시장폭 | 8 |
| dollarFx / 달러·환율 | 5 |
| commodities / 유가·원자재 | 6 |

Total = 100.

## Overall contract

Overall = Σ(domainScore × domainWeight) / 100

Compute Overall only when all 12 domains are READY with finite scores in [0,100].

If any required domain is PARTIAL or UNAVAILABLE:
- Overall score = null
- Overall status = PARTIAL
- Do not renormalize remaining weights.

coverageWeight is metadata only.

## Preserved

- Existing Stage11 validated domain functions/guards
- Existing 8-boundary diagnostic panel
- R53.19.13 daily CP proxy remains NOT_ACTIVE
- Today is not reintroduced
