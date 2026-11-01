# 도움말 구성 지표 수 확인

기준: main `5ec1b076ff1420ceb31d5658dd392de4c9f063fa`, 2026-10-09.

개수는 산식의 구성 점수 항목을 뜻한다. 원천 시계열 수, 화면 대표 항목 수, 서로 다른 데이터의 총수를 뜻하지 않는다. 하나의 원천에서 서로 다른 변환 지표가 산출될 수 있고, 구성 점수 안에 하위 산식이 있을 수 있다. 준비된 실데이터 개수가 아니라 모델의 요구 항목 수다. 산식은 변경하지 않았다.

| 콘텐츠 | 구성 수 | 확인 소스 |
|---|---:|---|
| 미국 시장 | 7 | app/fear-greed/usa/cnn-panel.tsx의 7개 구성요소와 동일 비중 설명 |
| 한국 시장 | 7 | worker/korea-rev7-engine.mjs: REV7_FACTORS |
| 종합 시장 점수 | 12개 영역 | lib/market-score/composite-model-r1.mjs: CM-R1 가중치 목록 |
| 물가 | 16개 지표 → 7개 축 | lib/diagnostic-layer/inflation-r2-stored.mjs: features, axes |
| 고용 | 4 | lib/market-score/employment-r54-candidate.mjs: EMPLOYMENT_R54_WEIGHTS |
| 금리 | 4 | lib/market-score/rate-r3.mjs: RATE_R3_WEIGHTS |
| 채권·신용 | 4 | lib/market-score/credit-r2.mjs: WEIGHTS |
| 경기 | 24, 대체 모델 7 | lib/market-score/growth-r2-contract.mjs, domain-adapter-r1.mjs, lib/diagnostic-layer/model.mjs: recessionDefense |
| 소비 | 95개 지표 → 7개 축 | lib/market-score/consumption-c1-r3.mjs: C1_R3_CORE95, C1_R3_AXIS_MEMBERSHIP |
| 기업실적 | 4 | lib/market-score/earnings-e1-r4.mjs 및 worker/market-score-r1.mjs: epsGrowth, margin, revenueGrowth, earningsGrowthBreadth |
| 유동성 | 6 | lib/market-score/liquidity-active-public-domain-r1.mjs → model.mjs: liquidityCrisisDefense |
| 자금흐름 | 4 | lib/diagnostic-layer/open-resolution-r53-components.mjs: buildFundFlowR54, domain-adapter-r1.mjs |
| 수급·폭 | 4 | lib/market-score/ACTIVE_PUBLIC_DOMAIN_PRODUCERS.md: B1-R5 |
| 달러·환율 | 4 | lib/diagnostic-layer/open-resolution-r53-components.mjs: buildDollarFxR54, domain-adapter-r1.mjs |
| 유가·원자재 | 4 | lib/market-score/public-domain-producers-r2.mjs: K1-R2 |
| 인플레이션 | 4 | lib/diagnostic-layer/model.mjs: inflationStability |
| 경기 침체 | 7 | model.mjs: recessionDefense |
| 유동성 위기 | 6 | model.mjs: liquidityCrisisDefense |
| 신용 위험 | 4 | model.mjs: creditRiskDefense |
| 실적 침체 | 4 | model.mjs: earningsRecessionDefense |
| 자산 버블 | 6 | model.mjs: assetBubbleSafety |
| 부채 위험 | 5 | model.mjs: debtRiskSafety |
| 공급 충격 | 6 | model.mjs: supplyShockSafety |
| 금리 심리 | 4 | lib/market-score/rate-sentiment-r1-research.mjs: weights. 국채 원천 시계열은 3개, 계산 요소는 4개 |
| 이란 종전 진전도 | 5개 영역 | lib/iran-progress/r13.mjs: D/C/M/H/N |

종합 하위 항목은 중복 원천, 중첩 산식, 경기 대체 경로가 있으므로 하나의 고정 총수로 합산하지 않았다. 화면에는 직접 합산되는 12개 영역을 표시한다. 물가 영역의 16개와 인플레이션 진단의 4개는 서로 다른 산식이며 혼용하지 않는다. 러우 전쟁 모델은 개발 중이며, 섹터·테마는 예시이므로 산출 지표 수를 표시하지 않는다.
