# ZGMINI R65 — CAGR 21개 산업·테마 공식 보고서 추가 탐색 및 시장규모 교차검증

- 점검일: 2026-10-27 KST
- 원본: R63(공식 보고서 63칸, 출처 CAGR 58건 검증), R64B(A 7/B 11/C 3) 원장 보존
- 목적: **신규 하위시장 후보 출처 발굴**, 가능하면 동년 기준 시장가치 검증, 시장 정의 다르면 평균 편입 보류
- 상태: `R65_CANDIDATE_RECONCILIATION_COMPLETE`; `FINAL_GICS_THEME_CAGR=UNCOMPUTED`; 모든 `mean_eligible=false`
- 이번 차수에서 직접 네트워크 HTTP GET 수행을 새롭게 입증한 것은 아니다. 출처 시장규모와 문구는 검색 서비스가 열람한 공식 발행사 웹페이지의 실시간 크롤링 결과로 교차확인했으며, R63의 직접 수집 원장과 구분한다.
- 예측치의 차이는 시장조사기관의 정상적 의견 차이일 수 있다. **수치가 다른 것만으로 제외하지 않고**, 비교 모집단·동년 시장규모·매출 범위를 먼저 점검한다.

## 1. R65의 핵심 신규 발견 — 기존 C 3건에 대체 후보 확보

| 기존 C 대상 | 신규 조사 범위 | 새로 확보한 공식 보고서 | 현재 처리 |
|---|---|---|---|
| 1. 정보기술 | IT 서비스(전체 정보기술 섹터 아님) | [TBRC IT services](https://www.thebusinessresearchcompany.com/report/it-services-global-market-report) CAGR **9.3%**(2026–2030), 2025년 3.66376조 달러. 기존 [SkyQuest IT services](https://www.skyquestt.com/report/it-services-market) 9.6%, 2025년 2.03조 달러 | 같은 하위시장 후보 2개 확보. 기준연도 시장규모 차이 1.80배/범위 검증 보류 |
| 10. 필수소비재 | FMCG(완전한 GICS 필수소비재 아님) | [Global Growth Insights FMCG](https://www.globalgrowthinsights.com/market-reports/fast-moving-consumer-goods-fmcg-market-109277) CAGR **5.03%**(2026–2035), 2025년 13.12673조 달러. 기존 [SkyQuest FMCG](https://www.skyquestt.com/report/fmcg-market) 3.8%, 2025년 14.63조 달러 | 같은 명칭/주요 세부상품 후보 2개 확보. 발행기관 품질·중복 출처 검증 보류 |
| 15. 원전·SMR | SMR 전용(원자력 전체/원전 건설 매출 아님) | [TBRC SMR](https://www.thebusinessresearchcompany.com/report/small-modular-reactor-global-market-report) **25.2%**, [SkyQuest SMR](https://www.skyquestt.com/report/small-modular-reactor-market) **8.9%**, [Precedence SMR](https://www.precedenceresearch.com/small-modular-reactor-market) **8.78%** | 같은 시장명 3개 확보했지만 TBRC는 제조사 공장출하 매출로 정의, 동년 시장규모 최대 **12.19배** 차이. 평균 보류 |

**중요:** 위 3건을 바로 A등급이나 GICS 최종 성장률로 승격하지 않는다. 기존 R64B의 C 3건은 *연구 후보가 발견됐다*는 이력만 추가하고 재심사 대기한다. 이전 공개 수치·출처는 삭제하지 않는다.

## 2. 동년(2025년) 시장규모 대조표 — 단위: USD billion

- **TBRC와 SkyQuest의 2025년 수치만** 동년 비율 산출. 업종 전체와 하위시장이 다른 경우는 TBRC 열/비율을 의도적으로 `—` 처리.
- **Precedence 열은 2026년 규모**이므로 옆에 보여주는 참고용이지, 2025년과 바로 같은 해인 것처럼 비교하지 않음.
- 규모 차이가 작아도 분모 정의가 같다는 증명이 아니며, 가깝다는 이유로 자동 평균 승인하지 않는다.

| 번호·주제 | R64B | TBRC 2025 | SkyQuest 2025 | TBRC/SQ 동년 배수 | Precedence 2026 | R65 |
|---|:---:|---:|---:|---:|---:|---|
| 1. 정보기술 | C | 3,663.76 | 2,030 | 1.80× | — | **신규 출처 1** |
| 2. 커뮤니케이션 서비스 | B | 3,048.49 | 2,036.45 | 1.50× | 2,460 | 기존 정의 보류 |
| 3. 임의소비재 | A | 1,644.2 | 1,952.93 | 1.19× | 1,930 | 기존 정의 보류 |
| 4. 산업재 | B | 613.44 | 762.53 | 1.24× | 110.53 | 기존 정의 보류 |
| 5. 금융 | A | — | 2,440 | — | 2,480 | 기존 정의 보류 |
| 6. 유틸리티 | A | — | 415.51 | — | 371.77 | 기존 정의 보류 |
| 7. 헬스케어 | B | 8,947.65 | 9,509.38 | 1.06× | 15,370 | 기존 정의 보류 |
| 8. 소재 | B | 91.27 | 72.61 | 1.26× | 78.25 | 기존 정의 보류 |
| 9. 에너지 | B | 8,337.22 | 8,480 | 1.02× | — | 기존 정의 보류 |
| 10. 필수소비재 | C | — | 14,630 | — | — | **신규 출처 1** |
| 11. 부동산 | B | 4,443.46 | 4,340 | 1.02× | 4,580 | 기존 정의 보류 |
| 12. 로봇·자동화 | B | 77.85 | 54.49 | 1.43× | 124.37 | 기존 정의 보류 |
| 13. 클라우드·SaaS | A | 832.8 | 1,020.02 | 1.22× | 1,106.28 | 기존 정의 보류 |
| 14. 자율주행 | B | 80.49 | 89.83 | 1.12× | 364.08 | 기존 정의 보류 |
| 15. 원전·SMR | C | 0.67 | 8.17 | 12.19× | 8.16 | **신규 출처 3** |
| 16. 방산 | B | — | 181.8 | — | 195.38 | 기존 정의 보류 |
| 17. 핀테크 | A | 6.45 | 8.35 | 1.29× | 1,020 | 기존 정의 보류 |
| 18. 사이버보안 | A | 274.26 | 217.38 | 1.26× | 339.96 | 기존 정의 보류 |
| 19. 바이오·신약 | B | — | 2,496.33 | — | 2,020 | 기존 정의 보류 |
| 20. 데이터센터·전력 | A | 299.63 | 564.02 | 1.88× | 430.18 | 기존 정의 보류 |
| 21. 우주·위성 | B | 25.35 | 20.07 | 1.26× | 391.99 | 기존 정의 보류 |

상세 시장정의·발행사별 원문 URL은 본 문서 아래 섹션 및 JSON에 각각 보존한다.

## 3. 수치 검증과 예외

1. **SMR**: TBRC 시장규모 2025년 **6.7억 달러**, SkyQuest 2025년 **81.7억 달러**(12.19배), TBRC 2026년 **8.4억 달러**, Precedence 2026년 **81.6억 달러**(9.71배). TBRC 시장은 공장출하가치 정의이므로 두 성장률을 평균내기 전 시장가치 분모 확인 필수.
2. **자율주행**: TBRC 2026년 **1,030.4억 달러** vs Precedence **3,640.8억 달러**(3.53배); SkyQuest는 레벨 1·2의 운전자보조 기술도 분할 항목으로 열거. 기술 레벨/완성차 가격/전자부품 매출의 포괄 여부 추가 검토.
3. **핀테크 블록체인**: TBRC 2026년 **95.5억 달러** vs Precedence **1조 200억 달러**(106.81배). Precedence 수치를 고의로 0 처리하지 않고 R64B의 원문 증거와 보류 상태를 유지.
4. **위성**: TBRC 2026년 **265.1억 달러** vs Precedence **3,919.9억 달러**(14.79배). TBRC/SkyQuest는 2025년 같은 시장 규모가 1.26배 차이. Precedence만 다른 가치 모집단인지 확인 전 3기관 평균 금지.
5. **CMI Consumer Staples 제외 예시**: 공식 원문은 2025년 **4,988.5억 달러**가 아닌 **4,988.5 billion = 4.9885조 달러**, 2034년 **8,865 billion = 8.865조 달러**, CAGR 4.1%를 함께 주장. 9년 검산값은 **6.597%**로 **2.497%p** 차이. 해당 보고서는 신규 비교 후보 수치로 사용하지 않으며, 이 논리적 불일치는 보고서 전체를 자동 허위로 단정하는 것과 구분한다.
6. **기존 R64B 경고 유지**: Precedence 첨단소재 6.21/6.27%, 병원서비스 5.84/5.99% 원문 충돌. 병원서비스 기존 `NULL` 보존.
7. **SkyQuest의 'Market snapshot'**: 시장 스냅샷의 `Global Market Size`에는 명시적 기준 연도가 없는 경우가 존재한다(예: SMR USD6.89B와 본문 2025 USD8.17B). `2026–2033` 예측기간을 스냅샷 시장규모의 **2026년 기준일로 추정하지 않는다**. 동년 시장규모는 본문에 연도가 명시된 값만 사용.

## 4. 각 주제별 대조 근거

### 1. 정보기술 — C

New IT-services pair exists, but TBRC 2025 USD3.66376T vs SkyQuest 2025 USD2.03T and service inclusion differ; cannot treat as entire GICS IT sector.

신규 공식 원문 후보:
- [TBRC: IT services](https://www.thebusinessresearchcompany.com/report/it-services-global-market-report) — 인용 CAGR 9.3% (2026-2030); Hardware support, software and BPO, and cloud services; a submarket, not the GICS IT sector

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/it-services-market) · [신규 TBRC](https://www.thebusinessresearchcompany.com/report/it-services-global-market-report).

### 2. 커뮤니케이션 서비스 — B

Telecom publishers cover varying combinations of service, devices, satellites and platforms; not full GICS Communication Services.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/telecom-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/telecommunication-market) · [Precedence](https://www.precedenceresearch.com/telecommunication-market).

### 3. 임의소비재 — A

TBRC and SkyQuest 2025 market sizes differ ~1.19x; Precedence 2026 headline USD1.93T; common passenger-car submarket candidate remains.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/passenger-cars-market) · [Precedence](https://www.precedenceresearch.com/passenger-cars-market).

### 4. 산업재 — B

2025 baselines appear close yet end-use segmentation differs substantially; machine tools is a narrower Precedence report.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/industrial-machinery-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/industrial-machinery-market) · [Precedence](https://www.precedenceresearch.com/machine-tools-market).

### 5. 금융 — A

SkyQuest 2025 USD2.44T and Precedence 2026 USD2.48T are adjacent-year values, not same-year numeric equality. Financial services broad TBRC excluded.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/retail-banking-market) · [Precedence](https://www.precedenceresearch.com/retail-banking-market).

### 6. 유틸리티 — A

SkyQuest 2025 USD415.51B and Precedence 2026 USD371.77B are adjacent-year values; revenue from utility operation versus grid components unresolved.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/utilities-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/electricity-transmission-and-distribution-market) · [Precedence](https://www.precedenceresearch.com/power-transmission-and-distribution-market).

### 7. 헬스케어 — B

TBRC 2025 USD8.94765T and SkyQuest 2025 USD9.50938T differ ~1.06x, but segment coverage differences persist; Precedence hospital-service CAGR 5.84/5.99 conflict.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/healthcare-services-market) · [Precedence](https://www.precedenceresearch.com/hospital-services-market).

### 8. 소재 — B

2025 market sizes within ~1.26x TBRC/SkyQuest, but Precedence page internally says 6.21 and 6.27; hold precise publisher rate until editorial resolution.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/advanced-materials-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/advanced-materials-market) · [Precedence](https://www.precedenceresearch.com/advanced-materials-market).

### 9. 에너지 — B

TBRC/SkyQuest 2025 sizes close (~1.02x), but petrochemicals/refining/transport value definitions still require review.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/oil-and-gas-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/oil-and-gas-market).

### 10. 필수소비재 — C

New global FMCG pair SkyQuest 2025 USD14.63T and Global Growth Insights 2025 USD13.12673T (~1.11x); not full GICS staples. CMI Consumer Staples 4.1% fails arithmetic of 2025/2034 sizes.

신규 공식 원문 후보:
- [Global Growth Insights: FMCG](https://www.globalgrowthinsights.com/market-reports/fast-moving-consumer-goods-fmcg-market-109277) — 인용 CAGR 5.03% (2026-2035); Food & beverage, personal care, healthcare, homecare, through physical and online sales; candidate submarket, not full GICS Consumer Staples

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/staple-food-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/fmcg-market) · [신규 Global Growth Insights](https://www.globalgrowthinsights.com/market-reports/fast-moving-consumer-goods-fmcg-market-109277).

### 11. 부동산 — B

2025 sizes TBRC/SkyQuest close (~1.02x) but selling properties versus service revenue or broker fees could create value-definition mismatch.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/real-estate-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/real-estate-market) · [Precedence](https://www.precedenceresearch.com/real-estate-market).

### 12. 로봇·자동화 — B

TBRC robotics & automation, SkyQuest robotics and Precedence robotics technology have different manufacturing/service scope; rates must not be merged without mapping.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report) · [SkyQuest](https://www.skyquestt.com/report/robotics-market) · [Precedence](https://www.precedenceresearch.com/robotics-technology-market).

### 13. 클라우드·SaaS — A

2025 TBRC USD832.8B vs SkyQuest USD1,020.02B (~1.22x); Precedence 2026 USD1,106.28B; these are cloud computing candidates, not a SaaS-only rate.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/cloud-computing-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/cloud-computing-market) · [Precedence](https://www.precedenceresearch.com/cloud-computing-market).

### 14. 자율주행 — B

TBRC 2026 USD103.04B vs Precedence 2026 USD364.08B (~3.53x), despite 2025 TBRC/SkyQuest close; advanced driver-assistance levels versus higher automation need reconciliation.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/autonomous-vehicle-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/autonomous-vehicles-market) · [Precedence](https://www.precedenceresearch.com/autonomous-vehicle-market).

### 15. 원전·SMR — C

New three SMR-only sources found. TBRC factory-gate 2025 USD0.67B vs SkyQuest 2025 USD8.17B (12.19x); TBRC 2026 USD0.84B vs Precedence 2026 USD8.16B (9.71x). SkyQuest/Precedence adjacent-year headline sizes are close, but year and valuation basis not reconciled.

신규 공식 원문 후보:
- [TBRC: small modular reactor](https://www.thebusinessresearchcompany.com/report/small-modular-reactor-global-market-report) — 인용 CAGR 25.2% (2026-2030); Factory gate sales of reactor modules and related manufacturer products/services
- [SkyQuest: small modular reactor](https://www.skyquestt.com/report/small-modular-reactor-market) — 인용 CAGR 8.9% (2026-2033); Multiple reactor types, location, capacity, deployment, connectivity, applications; market snapshot's yearless 6.89bn is not used as 2026
- [Precedence: small modular reactor](https://www.precedenceresearch.com/small-modular-reactor-market) — 인용 CAGR 8.78% (2026-2035); Reactor type/application; market revenue construction/production basis requires further clarification

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/nuclear-reactor-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/nuclear-reactor-construction-market) · [Precedence](https://www.precedenceresearch.com/nuclear-power-market) · [신규 TBRC](https://www.thebusinessresearchcompany.com/report/small-modular-reactor-global-market-report) · [신규 SkyQuest](https://www.skyquestt.com/report/small-modular-reactor-market) · [신규 Precedence](https://www.precedenceresearch.com/small-modular-reactor-market).

### 16. 방산 — B

TBRC defense entire market excluded from electronics-market comparison; SkyQuest 2025 USD181.8B and Precedence 2026 USD195.38B are adjacent-year values.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/defense-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/defense-electronics-market) · [Precedence](https://www.precedenceresearch.com/defense-electronics-market).

### 17. 핀테크 — A

TBRC/SkyQuest 2025 USD6.45B/USD8.35B (~1.29x) form candidate. Precedence 2026 USD1.02T is 106.81x TBRC 2026, retained as unresolved source quote, not average.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/fintech-blockchain-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/fintech-blockchain-market) · [Precedence](https://www.precedenceresearch.com/fintech-blockchain-market).

### 18. 사이버보안 — A

TBRC/SkyQuest 2025 USD274.26B/USD217.38B (~1.26x); Precedence 2026 USD339.96B; align product/service and managed-services denominators.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/cybersecurity-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/cyber-security-market) · [Precedence](https://www.precedenceresearch.com/cyber-security-market).

### 19. 바이오·신약 — B

TBRC biotechnology SERVICES (2025 USD178.54B) is not total biotechnology; SkyQuest overall 2025 USD2.49633T and Precedence 2026 USD2.02T; do not average service and total rates.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/biotechnology-services-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/biotechnology-market) · [Precedence](https://www.precedenceresearch.com/biotechnology-market).

### 20. 데이터센터·전력 — A

TBRC/SkyQuest 2025 USD299.63B/USD564.02B (~1.88x), Precedence 2026 USD430.18B; data-center facility, construction, colocation and power-sales scopes may differ.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/data-center-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/data-center-market) · [Precedence](https://www.precedenceresearch.com/data-center-market).

### 21. 우주·위성 — B

TBRC/SkyQuest 2025 USD25.35B/USD20.07B (~1.26x), but Precedence 2026 USD391.99B vs TBRC 2026 USD26.51B (14.79x). Block all-publisher averaging pending market universe definition.

원문: [TBRC](https://www.thebusinessresearchcompany.com/report/satellites-global-market-report) · [SkyQuest](https://www.skyquestt.com/report/satellite-market) · [Precedence](https://www.precedenceresearch.com/satellite-market).


## 5. 후속 검증 계약 R66

1. 최종 편입 단위는 명칭이 아니라 **동일한 시장 모집단과 매출/시장가치 정의**이다. 하위시장의 CAGR을 GICS 전체 섹터·복합테마 CAGR로 이름만 바꿔 표기 금지.
2. 차이가 3배 이상인 시장규모는 `SCALE_REVIEW`, 10배 이상 `SCALE_ALERT`; 진위 자동 판단은 금지. 2025 값과 2026 값을 단순히 동년 비율로 환산해 비교 금지.
3. 기관 수치가 서로 다르다는 이유로 탈락시키지 않는다. 같은 범위로 검증된 기관값만 복수 매체 산술평균의 후보가 되며, 추정기관/동일 계열 중복은 독립성 조사.
4. 원문 기간을 기록하고 전망기간이 다를 경우 혼합기간 단순 평균에 경고. 모든 결측 `NULL` 보존.
5. R63 최초 63칸, 58개 확인값을 덮어쓰지 않는다. 시장명 변경은 새로운 별도 후보 레코드에 기록한다.
6. PC Ollama 워밍업+3회 실측은 여전히 별도 단계. 이번 단계에서 모델 실행·모델 생성 수치 삽입 0.
7. GitHub **연구 브랜치 전용**. main 병합, Cloudflare/D1/PC/운영 배포, 공개 산식·GICS 정의 변경 없음.

## 6. 핵심 공식 원문 재확인

- [TBRC IT services](https://www.thebusinessresearchcompany.com/report/it-services-global-market-report)
- [SkyQuest IT services](https://www.skyquestt.com/report/it-services-market)
- [Global Growth Insights FMCG](https://www.globalgrowthinsights.com/market-reports/fast-moving-consumer-goods-fmcg-market-109277)
- [TBRC SMR](https://www.thebusinessresearchcompany.com/report/small-modular-reactor-global-market-report)
- [SkyQuest SMR](https://www.skyquestt.com/report/small-modular-reactor-market)
- [Precedence SMR](https://www.precedenceresearch.com/small-modular-reactor-market)
- [CMI Consumer Staples — 검산 불일치 검토 원문](https://custommarketinsights.com/report/consumer-staples-market/)
